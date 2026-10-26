import { prisma } from './prisma.js';
// Support both pdf-parse v2 (PDFParse class) and v1 function
const pdfModule = require('pdf-parse');
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_FORMATS: Record<string, { ext: string; mimes: string[] }> = {
  pdf: {
    ext: '.pdf',
    mimes: ['application/pdf'],
  },
  docx: {
    ext: '.docx',
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
  },
  md: {
    ext: '.md',
    mimes: ['text/markdown', 'text/x-markdown', 'text/plain'],
  },
  txt: {
    ext: '.txt',
    mimes: ['text/plain'],
  },
  xlsx: {
    ext: '.xlsx',
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  },
  xls: {
    ext: '.xls',
    mimes: ['application/vnd.ms-excel', 'application/msexcel'],
  },
  csv: {
    ext: '.csv',
    mimes: ['text/csv', 'application/csv', 'text/plain'],
  },
};

export interface ExtractedChunk {
  chunkText: string;
  location?: string;
  sourceHeading?: string;
  order: number;
}

export interface ParsingResult {
  fullText: string;
  chunks: ExtractedChunk[];
  metadata: {
    pageCount?: number;
    sheetNames?: string[];
    wordCount?: number;
    characterCount?: number;
    headings?: string[];
    [key: string]: any;
  };
}

/**
 * Validates file format and size
 */
export function validateFile(
  filename: string,
  mimeType: string,
  size: number
): { valid: boolean; format: string; error?: string } {
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      format: '',
      error: `File size (${(size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 20MB`,
    };
  }

  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  let matchedFormat = '';

  for (const [fmt, config] of Object.entries(ALLOWED_FORMATS)) {
    if (config.ext === ext) {
      matchedFormat = fmt;
      break;
    }
  }

  if (!matchedFormat) {
    return {
      valid: false,
      format: '',
      error: `Unsupported format "${ext}". Supported formats: .pdf, .docx, .md, .txt, .xlsx, .xls, .csv`,
    };
  }

  return { valid: true, format: matchedFormat };
}

/**
 * Parse plain text or markdown files
 */
function parseTextOrMarkdown(content: string, format: string): ParsingResult {
  const lines = content.split('\n');
  const headings: string[] = [];
  const chunks: ExtractedChunk[] = [];

  let currentHeading = 'Document Body';
  let currentChunkLines: string[] = [];
  let order = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      // Save accumulated chunk
      if (currentChunkLines.length > 0) {
        const text = currentChunkLines.join('\n').trim();
        if (text) {
          chunks.push({
            chunkText: text,
            location: currentHeading,
            sourceHeading: currentHeading,
            order: order++,
          });
        }
        currentChunkLines = [];
      }
      currentHeading = trimmed.replace(/^#+\s*/, '') || 'Section';
      headings.push(currentHeading);
    }
    currentChunkLines.push(line);

    // If chunk gets too large (~1500 chars), split it
    if (currentChunkLines.join('\n').length > 1500) {
      const text = currentChunkLines.join('\n').trim();
      if (text) {
        chunks.push({
          chunkText: text,
          location: currentHeading,
          sourceHeading: currentHeading,
          order: order++,
        });
      }
      currentChunkLines = [];
    }
  }

  // Push remaining lines
  if (currentChunkLines.length > 0) {
    const text = currentChunkLines.join('\n').trim();
    if (text) {
      chunks.push({
        chunkText: text,
        location: currentHeading,
        sourceHeading: currentHeading,
        order: order++,
      });
    }
  }

  // Fallback chunk if empty
  if (chunks.length === 0 && content.trim()) {
    chunks.push({
      chunkText: content.trim(),
      location: 'Overview',
      sourceHeading: 'Overview',
      order: 0,
    });
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return {
    fullText: content,
    chunks,
    metadata: {
      wordCount,
      characterCount: content.length,
      headings: headings.slice(0, 30),
    },
  };
}

/**
 * Parse CSV file with line numbers
 */
function parseCsv(content: string): ParsingResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      fullText: '',
      chunks: [],
      metadata: { wordCount: 0, characterCount: 0 },
    };
  }

  const header = lines[0];
  const chunks: ExtractedChunk[] = [];
  const rowsPerChunk = 10;
  let order = 0;

  for (let i = 1; i < lines.length; i += rowsPerChunk) {
    const slice = lines.slice(i, i + rowsPerChunk);
    const chunkText = [`Headers: ${header}`, ...slice.map((r, idx) => `Row ${i + idx}: ${r}`)].join('\n');
    chunks.push({
      chunkText,
      location: `Rows ${i}–${Math.min(i + rowsPerChunk - 1, lines.length - 1)}`,
      sourceHeading: 'CSV Table Data',
      order: order++,
    });
  }

  return {
    fullText: content,
    chunks,
    metadata: {
      totalRows: lines.length - 1,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      characterCount: content.length,
    },
  };
}

/**
 * Structured entities extracted from multi-sheet spreadsheets
 */
export interface ExcelStructuredData {
  sprints: Array<{
    sprint: string;
    sprintName: string;
    start: string;
    end: string;
    goal: string;
    deliverables: string;
    exitCriteria: string;
    capacityNote?: string;
    dependencies?: string;
    sourceLocation?: string;
  }>;
  ticketCandidates: Array<{
    ticketId: string;
    sprint: string;
    epic: string;
    title: string;
    description: string;
    acceptanceCriteria: string;
    priority: string;
    ownerRole: string;
    storyPoints: number;
    dependencies: string;
    status: string;
    notes?: string;
    prdTraceability?: string;
    sourceLocation?: string;
  }>;
  risksAndDecisions: Array<{
    type: string;
    item: string;
    impact: string;
    mitigation: string;
    owner: string;
    due: string;
    sourceLocation?: string;
  }>;
  launchChecklist: Array<{
    id: string;
    gate: string;
    passCriteria: string;
    ownerRole: string;
    status: string;
    sourceLocation?: string;
  }>;
  sheetSummaries: Array<{
    sheetName: string;
    totalRows: number;
    dataRows: number;
    headers: string[];
  }>;
}

/**
 * Parse Excel .xlsx / .xls file across every worksheet
 */
function parseExcel(buffer: Buffer): ParsingResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  const chunks: ExtractedChunk[] = [];
  const fullTextParts: string[] = [];
  let order = 0;

  const structuredData: ExcelStructuredData = {
    sprints: [],
    ticketCandidates: [],
    risksAndDecisions: [],
    launchChecklist: [],
    sheetSummaries: [],
  };

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
    if (!rawRows || rawRows.length === 0) continue;

    const nonEmptyRows = rawRows.filter(
      (r) => Array.isArray(r) && r.some((c) => c && String(c).trim().length > 0)
    );
    if (nonEmptyRows.length === 0) continue;

    const lowerSheet = sheetName.toLowerCase();

    // 1. Identify sheet header row index
    let headerIdx = -1;
    if (lowerSheet.includes('roadmap')) {
      headerIdx = rawRows.findIndex(
        (r) =>
          Array.isArray(r) &&
          r.some((c) => String(c).trim() === 'Sprint') &&
          r.some((c) => String(c).toLowerCase().includes('sprint name'))
      );
    } else if (lowerSheet.includes('ticket') || lowerSheet.includes('backlog')) {
      headerIdx = rawRows.findIndex(
        (r) =>
          Array.isArray(r) &&
          r.some((c) => String(c).toLowerCase().includes('ticket id') || String(c).trim() === 'Ticket ID')
      );
    } else if (lowerSheet.includes('risk') || lowerSheet.includes('decision')) {
      headerIdx = rawRows.findIndex(
        (r) =>
          Array.isArray(r) &&
          r.some((c) => String(c).trim() === 'Item' || String(c).trim() === 'Type') &&
          r.some((c) => String(c).toLowerCase().includes('impact'))
      );
    } else if (lowerSheet.includes('launch') || lowerSheet.includes('checklist') || lowerSheet.includes('gate')) {
      headerIdx = rawRows.findIndex(
        (r) =>
          Array.isArray(r) &&
          r.some((c) => String(c).toLowerCase().includes('gate')) &&
          r.some((c) => String(c).toLowerCase().includes('pass criteria'))
      );
    }

    if (headerIdx === -1) {
      for (let i = 0; i < Math.min(6, rawRows.length); i++) {
        const r = rawRows[i];
        if (Array.isArray(r) && r.filter((c) => c && String(c).trim().length > 0).length >= 2) {
          headerIdx = i;
          break;
        }
      }
    }

    const headers = headerIdx >= 0 ? rawRows[headerIdx].map((h) => String(h || '').trim()) : [];
    const validHeaders = headers.filter(Boolean);

    structuredData.sheetSummaries.push({
      sheetName,
      totalRows: rawRows.length,
      dataRows: headerIdx >= 0 ? Math.max(0, rawRows.length - headerIdx - 1) : rawRows.length,
      headers: validHeaders,
    });

    // 2. Extract specific structured entities
    if (lowerSheet.includes('roadmap') && headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[0]) continue;
        const sprintCode = String(r[0]).trim();
        if (!sprintCode || sprintCode.toLowerCase().includes('sprint')) continue;

        structuredData.sprints.push({
          sprint: sprintCode,
          sprintName: String(r[1] || '').trim(),
          start: String(r[2] || '').trim(),
          end: String(r[3] || '').trim(),
          goal: String(r[4] || '').trim(),
          deliverables: String(r[5] || '').trim(),
          exitCriteria: String(r[6] || '').trim(),
          capacityNote: String(r[7] || '').trim(),
          dependencies: String(r[8] || '').trim(),
          sourceLocation: `Sheet "Roadmap", Row ${i + 1}`,
        });
      }
    } else if ((lowerSheet.includes('ticket') || lowerSheet.includes('backlog')) && headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[0]) continue;
        const ticketId = String(r[0]).trim();
        if (!ticketId || ticketId.toLowerCase().includes('ticket id')) continue;

        const storyPoints = parseInt(String(r[8] || '3'), 10) || 3;

        structuredData.ticketCandidates.push({
          ticketId,
          sprint: String(r[1] || '').trim(),
          epic: String(r[2] || '').trim(),
          title: String(r[3] || '').trim(),
          description: String(r[4] || '').trim(),
          acceptanceCriteria: String(r[5] || '').trim(),
          priority: String(r[6] || 'P0').trim(),
          ownerRole: String(r[7] || '').trim(),
          storyPoints,
          dependencies: String(r[9] || 'None').trim(),
          status: String(r[10] || 'Not Started').trim(),
          notes: String(r[11] || '').trim(),
          prdTraceability: String(r[12] || '').trim(),
          sourceLocation: `Sheet "Ticket Backlog", Row ${i + 1}`,
        });
      }
    } else if ((lowerSheet.includes('risk') || lowerSheet.includes('decision')) && headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[1]) continue;
        structuredData.risksAndDecisions.push({
          type: String(r[0] || 'Risk').trim(),
          item: String(r[1] || '').trim(),
          impact: String(r[2] || '').trim(),
          mitigation: String(r[3] || '').trim(),
          owner: String(r[4] || '').trim(),
          due: String(r[5] || '').trim(),
          sourceLocation: `Sheet "Risks & Decisions", Row ${i + 1}`,
        });
      }
    } else if ((lowerSheet.includes('launch') || lowerSheet.includes('checklist')) && headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rawRows.length; i++) {
        const r = rawRows[i];
        if (!r || !r[1]) continue;
        structuredData.launchChecklist.push({
          id: String(r[0] || '').trim(),
          gate: String(r[1] || '').trim(),
          passCriteria: String(r[2] || '').trim(),
          ownerRole: String(r[3] || '').trim(),
          status: String(r[4] || 'Not Started').trim(),
          sourceLocation: `Sheet "Launch Checklist", Row ${i + 1}`,
        });
      }
    }

    // 3. Generate high-fidelity semantic chunks with column headers on every chunk
    if (lowerSheet.includes('ticket') || lowerSheet.includes('backlog')) {
      const tickets = structuredData.ticketCandidates;
      fullTextParts.push(`=== Sheet: ${sheetName} (${tickets.length} Ticket Candidates) ===`);
      const chunkSize = 10;
      for (let k = 0; k < tickets.length; k += chunkSize) {
        const batch = tickets.slice(k, k + chunkSize);
        const chunkLines = [
          `[Sheet: ${sheetName} | Rows ${k + 2}–${k + 1 + batch.length} | Candidates ${batch[0].ticketId} to ${batch[batch.length - 1].ticketId}]`,
          `Table Columns: Ticket ID | Sprint | Epic | Title | Priority | Owner | Points | Scope | Acceptance Criteria | PRD Ref`,
          ...batch.map(
            (t) =>
              `- [${t.ticketId}] (${t.sprint}, ${t.epic}, ${t.priority}, ${t.storyPoints} pts, ${t.ownerRole}): "${t.title}". Scope: ${t.description} | Acceptance: ${t.acceptanceCriteria} | Deps: ${t.dependencies} | PRD: ${t.prdTraceability}`
          ),
        ];
        chunks.push({
          chunkText: chunkLines.join('\n'),
          location: `Sheet "${sheetName}", Rows ${k + 2}–${k + 1 + batch.length} (${batch[0].ticketId}–${batch[batch.length - 1].ticketId})`,
          sourceHeading: `Sheet: ${sheetName}`,
          order: order++,
        });
      }
    } else if (lowerSheet.includes('roadmap')) {
      const sps = structuredData.sprints;
      fullTextParts.push(`=== Sheet: ${sheetName} (${sps.length} Sprints) ===`);
      const sprintLines = sps.map(
        (s) =>
          `Sprint ${s.sprint} [${s.sprintName}] (${s.start} to ${s.end}): Goal: ${s.goal}. Deliverables: ${s.deliverables}. Exit Criteria: ${s.exitCriteria}. Deps: ${s.dependencies}`
      );
      fullTextParts.push(sprintLines.join('\n\n'));
      chunks.push({
        chunkText: `[Sheet: ${sheetName} | Sprints Overview]\n` + sprintLines.join('\n\n'),
        location: `Sheet "${sheetName}", Rows 3–${sps.length + 2}`,
        sourceHeading: `Sheet: ${sheetName}`,
        order: order++,
      });
    } else {
      const csv = XLSX.utils.sheet_to_csv(sheet);
      fullTextParts.push(`=== Sheet: ${sheetName} ===\n${csv}`);
      const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const rowsPerChunk = 15;
      for (let r = 0; r < lines.length; r += rowsPerChunk) {
        const slice = lines.slice(r, r + rowsPerChunk);
        const headerPrefix = validHeaders.length > 0 ? `[Headers: ${validHeaders.join(' | ')}]\n` : '';
        chunks.push({
          chunkText: `[Sheet: ${sheetName} | Rows ${r + 1}–${Math.min(r + rowsPerChunk, lines.length)}]\n${headerPrefix}${slice.join('\n')}`,
          location: `Sheet "${sheetName}", Rows ${r + 1}–${Math.min(r + rowsPerChunk, lines.length)}`,
          sourceHeading: `Sheet: ${sheetName}`,
          order: order++,
        });
      }
    }
  }

  const fullText = fullTextParts.join('\n\n');
  return {
    fullText,
    chunks,
    metadata: {
      sheetNames,
      totalSheets: sheetNames.length,
      sprintsCount: structuredData.sprints.length,
      ticketCandidatesCount: structuredData.ticketCandidates.length,
      risksCount: structuredData.risksAndDecisions.length,
      launchGatesCount: structuredData.launchChecklist.length,
      structuredData: structuredData as any,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      characterCount: fullText.length,
    },
  };
}

/**
 * Parse PDF file with section heading detection and semantic chunking
 */
async function parsePdf(buffer: Buffer): Promise<ParsingResult> {
  const pageChunks: ExtractedChunk[] = [];
  let fullText = '';
  let totalPages = 1;
  const detectedSections: Array<{ title: string; page?: number }> = [];

  try {
    // pdf-parse v2 provides { PDFParse } class; v1 exported a default function
    if (pdfModule.PDFParse || (typeof pdfModule === 'function' && pdfModule.name === 'PDFParse')) {
      const ParserClass = pdfModule.PDFParse || pdfModule;
      const parser = new ParserClass({ data: buffer });
      const textResult = await parser.getText();
      fullText = (textResult.text || '').trim();
      totalPages = textResult.total || (textResult.pages ? textResult.pages.length : 1);

      if (Array.isArray(textResult.pages) && textResult.pages.length > 0) {
        let order = 0;
        textResult.pages.forEach((p: { num?: number; text?: string }, pIdx: number) => {
          const pageNum = p.num || pIdx + 1;
          const pageText = (p.text || '').trim();
          if (!pageText) return;

          // Scan page text for section headers
          const lines = pageText.split('\n');
          let currentPageHeading = `PDF Page ${pageNum}`;
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^[0-9]+(\.[0-9]+)*\s+[A-Z]/)) {
              const headingTitle = trimmed.slice(0, 80);
              if (currentPageHeading === `PDF Page ${pageNum}`) {
                currentPageHeading = headingTitle;
              }
              if (!detectedSections.some((s) => s.title === headingTitle)) {
                detectedSections.push({ title: headingTitle, page: pageNum });
              }
            }
          }

          // Chunk by paragraphs or length within page
          const paragraphs = pageText.split(/\n\s*\n/).filter((pg: string) => pg.trim().length > 0);
          if (paragraphs.length > 1) {
            let currentParagraphGroup: string[] = [];
            let partIndex = 1;
            for (let i = 0; i < paragraphs.length; i++) {
              currentParagraphGroup.push(paragraphs[i].trim());
              const currentText = currentParagraphGroup.join('\n\n');
              if (currentText.length > 1200 || i === paragraphs.length - 1) {
                pageChunks.push({
                  chunkText: `[PDF Page ${pageNum} | ${currentPageHeading}]\n${currentText}`,
                  location: `Page ${pageNum} (Part ${partIndex})`,
                  sourceHeading: currentPageHeading,
                  order: order++,
                });
                partIndex++;
                currentParagraphGroup = [];
              }
            }
          } else {
            pageChunks.push({
              chunkText: `[PDF Page ${pageNum} | ${currentPageHeading}]\n${pageText}`,
              location: `Page ${pageNum}`,
              sourceHeading: currentPageHeading,
              order: order++,
            });
          }
        });
      }
    } else if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      fullText = (data.text || '').trim();
      totalPages = data.numpages || 1;
    } else if (typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(buffer);
      fullText = (data.text || '').trim();
      totalPages = data.numpages || 1;
    } else {
      throw new Error('Unsupported pdf-parse module format');
    }
  } catch (err: any) {
    console.error('Error parsing PDF with pdf-parse:', err);
    throw new Error(`Failed to parse PDF document: ${err.message || String(err)}`);
  }

  // Fallback chunking if page-specific chunks were empty but fullText exists
  if (pageChunks.length === 0 && fullText.trim()) {
    const chunkSize = 1500;
    let order = 0;
    for (let i = 0; i < fullText.length; i += chunkSize) {
      pageChunks.push({
        chunkText: fullText.slice(i, i + chunkSize).trim(),
        location: `Document Segment ${order + 1}`,
        sourceHeading: 'Extracted PDF',
        order: order++,
      });
    }
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return {
    fullText,
    chunks: pageChunks.length > 0 ? pageChunks : [
      {
        chunkText: fullText.slice(0, 2000),
        location: 'Document Content',
        sourceHeading: 'Extracted PDF',
        order: 0,
      },
    ],
    metadata: {
      totalPages,
      pageCount: totalPages,
      sections: detectedSections,
      sectionsCount: detectedSections.length,
      wordCount,
      characterCount: fullText.length,
    },
  };
}

/**
 * Parse DOCX Word Document
 */
async function parseDocx(buffer: Buffer): Promise<ParsingResult> {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value || '';

  // Split into logical sections by double newlines or paragraph blocks
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: ExtractedChunk[] = [];
  let order = 0;
  let currentGroup: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    currentGroup.push(paragraphs[i].trim());
    if (currentGroup.join('\n\n').length > 1200 || i === paragraphs.length - 1) {
      chunks.push({
        chunkText: currentGroup.join('\n\n'),
        location: `Section ${order + 1}`,
        sourceHeading: currentGroup[0].slice(0, 60),
        order: order++,
      });
      currentGroup = [];
    }
  }

  return {
    fullText: rawText,
    chunks,
    metadata: {
      wordCount: rawText.split(/\s+/).filter(Boolean).length,
      characterCount: rawText.length,
    },
  };
}

/**
 * Main parser entrypoint
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  formatOrFilename: string
): Promise<ParsingResult> {
  let format = formatOrFilename.toLowerCase();
  if (format.includes('/')) {
    if (format.includes('pdf')) format = 'pdf';
    else if (format.includes('spreadsheet') || format.includes('excel')) format = 'xlsx';
    else if (format.includes('wordprocessing') || format.includes('docx')) format = 'docx';
    else if (format.includes('csv')) format = 'csv';
    else if (format.includes('text') || format.includes('markdown')) format = 'md';
  } else if (format.includes('.')) {
    format = format.split('.').pop() || '';
  }

  switch (format) {
    case 'md':
    case 'txt':
      return parseTextOrMarkdown(buffer.toString('utf-8'), format);
    case 'csv':
      return parseCsv(buffer.toString('utf-8'));
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer);
    case 'pdf':
      return await parsePdf(buffer);
    case 'docx':
      return await parseDocx(buffer);
    default:
      throw new Error(`Unsupported document format: ${formatOrFilename}`);
  }
}

/**
 * Executes the ingestion and chunking pipeline for a ProjectDocument record
 */
export async function processDocumentRecord(
  documentId: string,
  buffer: Buffer
): Promise<void> {
  const doc = await prisma.projectDocument.findUnique({
    where: { id: documentId },
  });

  if (!doc) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  try {
    // 1. Mark as PROCESSING
    await prisma.projectDocument.update({
      where: { id: documentId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    // 2. Parse Content
    const result = await parseDocumentBuffer(buffer, doc.fileFormat);

    if (!result.fullText.trim()) {
      throw new Error('Document content is empty or unreadable.');
    }

    // 3. Delete any previous chunks for clean retry idempotency
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // 4. Create Chunks in database
    if (result.chunks.length > 0) {
      await prisma.documentChunk.createMany({
        data: result.chunks.map((c) => ({
          documentId,
          projectId: doc.projectId,
          chunkText: c.chunkText,
          location: c.location || null,
          sourceHeading: c.sourceHeading || null,
          order: c.order,
        })),
      });
    }

    // 5. Mark as COMPLETED
    await prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        extractedText: result.fullText,
        metadata: result.metadata,
        errorMessage: null,
      },
    });
  } catch (err: any) {
    console.error(`[Document Processing Error] ${documentId}:`, err);
    await prisma.projectDocument.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: err.message || 'Failed to extract text from document',
      },
    });
    throw err;
  }
}

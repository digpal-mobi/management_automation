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
      error: `Unsupported format "${ext}". Supported formats: .pdf, .docx, .md, .txt, .xlsx, .csv`,
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
 * Parse Excel .xlsx file
 */
function parseExcel(buffer: Buffer): ParsingResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  const chunks: ExtractedChunk[] = [];
  const fullTextParts: string[] = [];
  let order = 0;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csvData = XLSX.utils.sheet_to_csv(sheet);
    if (!csvData.trim()) continue;

    fullTextParts.push(`=== Sheet: ${sheetName} ===\n${csvData}`);

    const lines = csvData.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rowsPerChunk = 15;
    for (let r = 0; r < lines.length; r += rowsPerChunk) {
      const slice = lines.slice(r, r + rowsPerChunk);
      chunks.push({
        chunkText: slice.join('\n'),
        location: `Sheet "${sheetName}", Rows ${r + 1}–${Math.min(r + rowsPerChunk, lines.length)}`,
        sourceHeading: `Sheet: ${sheetName}`,
        order: order++,
      });
    }
  }

  const fullText = fullTextParts.join('\n\n');
  return {
    fullText,
    chunks,
    metadata: {
      sheetNames,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
      characterCount: fullText.length,
    },
  };
}

/**
 * Parse PDF file
 */
async function parsePdf(buffer: Buffer): Promise<ParsingResult> {
  const pageChunks: ExtractedChunk[] = [];
  let fullText = '';
  let totalPages = 1;

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

          // If page text is large, split into chunks within the page
          if (pageText.length > 1500) {
            for (let i = 0; i < pageText.length; i += 1500) {
              pageChunks.push({
                chunkText: pageText.slice(i, i + 1500).trim(),
                location: `Page ${pageNum} (Part ${Math.floor(i / 1500) + 1})`,
                sourceHeading: `PDF Page ${pageNum}`,
                order: order++,
              });
            }
          } else {
            pageChunks.push({
              chunkText: pageText,
              location: `Page ${pageNum}`,
              sourceHeading: `PDF Page ${pageNum}`,
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
  format: string
): Promise<ParsingResult> {
  switch (format) {
    case 'md':
    case 'txt':
      return parseTextOrMarkdown(buffer.toString('utf-8'), format);
    case 'csv':
      return parseCsv(buffer.toString('utf-8'));
    case 'xlsx':
      return parseExcel(buffer);
    case 'pdf':
      return await parsePdf(buffer);
    case 'docx':
      return await parseDocx(buffer);
    default:
      throw new Error(`Unsupported document format: ${format}`);
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

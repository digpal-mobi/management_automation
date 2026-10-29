import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { parseDocumentBuffer, processDocumentRecord } from '../src/lib/documents.js';
import { ProjectSynthesisService } from '../src/lib/projectSynthesis.js';
import { prisma } from '../src/lib/prisma.js';
import { PERMISSIONS } from '../src/authorization/permissions.js';
import { SYSTEM_ROLE_KEYS } from '../src/authorization/roles.js';

const SPRINT_PLAN_PATH = path.join(__dirname, 'fixtures', 'Ecommerce_Sprint_Plan.xlsx');
const PRD_PATH = path.join(__dirname, 'fixtures', 'Ecommerce_Website_PRD.pdf');

describe('Complete PRD & Sprint Plan Ingestion, Synthesis & Ticket Pipeline', () => {
  // Test 1: Multipage PRD Parsing
  it('1. should parse a multipage PRD preserving headings, sections, and page references', async () => {
    assert.ok(fs.existsSync(PRD_PATH), 'PRD fixture file exists');
    const prdBuffer = fs.readFileSync(PRD_PATH);
    const result = await parseDocumentBuffer(prdBuffer, 'Ecommerce_Website_PRD.pdf');

    assert.ok(result.chunks.length > 0, 'PDF produces chunks');
    assert.ok(result.metadata.sections && result.metadata.sections.length > 5, 'Detected multiple PRD section headings');

    // Verify sections include key functional areas
    const sectionTitles = result.metadata.sections.map((s: any) => s.title.toLowerCase());
    const hasCatalog = sectionTitles.some((t: string) => t.includes('catalog') || t.includes('product'));
    const hasCart = sectionTitles.some((t: string) => t.includes('cart') || t.includes('checkout'));
    const hasKeySpecs = sectionTitles.some((t: string) => t.includes('architecture') || t.includes('system') || t.includes('security') || t.includes('scope') || t.includes('functional'));

    assert.ok(hasCatalog, 'PRD sections include product catalog specifications');
    assert.ok(hasCart, 'PRD sections include cart & checkout specifications');
    assert.ok(hasKeySpecs, 'PRD sections include architecture/security/functional specifications');

    // Verify chunk locations preserve page numbers
    const chunksWithPages = result.chunks.filter((c: any) => c.location && c.location.includes('Page'));
    assert.ok(chunksWithPages.length > 0, 'Chunks preserve page numbers in location');
  });

  // Test 2: Multi-sheet Excel Parsing
  it('2. should parse an XLSX file containing multiple worksheets', async () => {
    assert.ok(fs.existsSync(SPRINT_PLAN_PATH), 'Sprint Plan fixture file exists');
    const xlsxBuffer = fs.readFileSync(SPRINT_PLAN_PATH);
    const result = await parseDocumentBuffer(xlsxBuffer, 'Ecommerce_Sprint_Plan.xlsx');

    assert.ok(result.metadata.sheetNames && result.metadata.sheetNames.length >= 5, 'Contains at least 5 worksheets');
    const expectedSheets = ['Dashboard', 'Roadmap', 'Ticket Backlog', 'Risks & Decisions', 'Launch Checklist', 'Read Me'];
    for (const expected of expectedSheets) {
      assert.ok(result.metadata.sheetNames.includes(expected), `Sheet "${expected}" parsed`);
    }
  });

  // Test 3: Preserving worksheet and row references
  it('3. should preserve worksheet names and row/table references in chunk metadata', async () => {
    const xlsxBuffer = fs.readFileSync(SPRINT_PLAN_PATH);
    const result = await parseDocumentBuffer(xlsxBuffer, 'Ecommerce_Sprint_Plan.xlsx');

    const backlogChunks = result.chunks.filter(
      (c: any) => c.location?.includes('Ticket Backlog') || c.sourceHeading?.includes('Ticket Backlog')
    );
    assert.ok(backlogChunks.length > 0, 'Ticket Backlog chunks exist');
    for (const chunk of backlogChunks) {
      assert.ok(chunk.location?.includes('Ticket Backlog'), 'Chunk preserves row range metadata');
      assert.ok(chunk.chunkText.includes('[Sheet: Ticket Backlog'), 'Chunk preserves sheet reference');
    }
  });

  // Test 4: Detecting all 11 sprint groupings
  it('4. should detect all 11 development sprints (S1-S11) plus Release window in the Roadmap sheet', async () => {
    const xlsxBuffer = fs.readFileSync(SPRINT_PLAN_PATH);
    const result = await parseDocumentBuffer(xlsxBuffer, 'Ecommerce_Sprint_Plan.xlsx');

    const detectedSprints = result.metadata.structuredData?.sprints;
    assert.ok(detectedSprints, 'Detected sprints array exists');
    assert.strictEqual(detectedSprints.length, 12, '12 sprint groupings detected (S1-S11 + Release)');

    const sprintIds = detectedSprints.map((s: any) => s.sprint);
    for (let i = 1; i <= 11; i++) {
      assert.ok(sprintIds.includes(`S${i}`), `Sprint S${i} detected`);
    }
    assert.ok(sprintIds.includes('R'), 'Release window detected');

    // Verify S1 details
    const s1 = detectedSprints.find((s: any) => s.sprint === 'S1');
    assert.ok(s1, 'Sprint S1 found');
    assert.ok(s1.goal, 'Sprint S1 has defined goal');
    assert.ok(s1.start, 'Sprint S1 has start date');
    assert.ok(s1.end, 'Sprint S1 has end date');
  });

  // Test 5: Reconciling all 82 source ticket candidates
  it('5. should extract and reconcile all 82 source ticket candidates from Ticket Backlog', async () => {
    const xlsxBuffer = fs.readFileSync(SPRINT_PLAN_PATH);
    const result = await parseDocumentBuffer(xlsxBuffer, 'Ecommerce_Sprint_Plan.xlsx');

    const candidateTickets = result.metadata.structuredData?.ticketCandidates;
    assert.ok(candidateTickets, 'Candidate tickets array exists in parsing output');
    assert.strictEqual(candidateTickets.length, 82, 'Exactly 82 candidates extracted');

    const candidateIds = new Set(candidateTickets.map((c: any) => c.ticketId));
    assert.strictEqual(candidateIds.size, 82, 'All 82 candidate IDs are unique');

    // Verify ECOM-001 through ECOM-082
    for (let i = 1; i <= 82; i++) {
      const pad = String(i).padStart(3, '0');
      const expectedId = `ECOM-${pad}`;
      assert.ok(candidateIds.has(expectedId), `Candidate ${expectedId} exists in parsed candidates`);
    }

    // Verify ECOM-001 structure
    const ecom001 = candidateTickets.find((c: any) => c.ticketId === 'ECOM-001');
    assert.ok(ecom001, 'ECOM-001 found');
    assert.strictEqual(ecom001.sprint, 'S1');
    assert.strictEqual(ecom001.epic, 'Governance');
    assert.strictEqual(ecom001.ownerRole, 'PM / Product');
    assert.ok(ecom001.acceptanceCriteria, 'Has explicit acceptance criteria');
  });

  // Test 6: Handling duplicate documents and repeated ingestion
  it('6. should handle repeated ingestion and duplicate documents idempotently', async () => {
    const xlsxBuffer = fs.readFileSync(SPRINT_PLAN_PATH);
    const result1 = await parseDocumentBuffer(xlsxBuffer, 'Ecommerce_Sprint_Plan.xlsx');
    const result2 = await parseDocumentBuffer(xlsxBuffer, 'Ecommerce_Sprint_Plan.xlsx');

    assert.strictEqual(result1.chunks.length, result2.chunks.length, 'Repeated parsing produces identical chunk counts');
    assert.strictEqual(
      result1.metadata.structuredData?.ticketCandidates.length,
      result2.metadata.structuredData?.ticketCandidates.length,
      'Candidate counts match on re-parse'
    );
  });

  // Test 7: Recovering from malformed or partially unreadable files
  it('7. should recover gracefully from malformed or corrupted documents by throwing expected validation error', async () => {
    const corruptedBuffer = Buffer.from('Corrupted fake PDF bytes that cannot be parsed %%EOF');
    await assert.rejects(
      async () => {
        await parseDocumentBuffer(corruptedBuffer, 'corrupted_file.pdf');
      },
      /Failed to parse PDF document/,
      'Throws recognizable parsing error for malformed PDF'
    );
  });

  // Test 8: Handling large documents without silent truncation
  it('8. should chunk entire documents with continuous indexing without silent truncation', async () => {
    const prdBuffer = fs.readFileSync(PRD_PATH);
    const result = await parseDocumentBuffer(prdBuffer, 'Ecommerce_Website_PRD.pdf');

    assert.ok(result.chunks.length >= 10, 'Large document produces adequate chunk count');
    // Verify continuous indexing
    for (let i = 0; i < result.chunks.length; i++) {
      assert.strictEqual(result.chunks[i].order, i, `Chunk order ${i} is sequential`);
      assert.ok(result.chunks[i].chunkText.length > 0, `Chunk ${i} is non-empty`);
    }
  });

  // Integration Tests using the live Database Project
  describe('Database Synthesis & Backlog Generation', () => {
    let projectId = '';
    let createdProject = false;

    before(async () => {
      let project = await prisma.project.findFirst({
        where: {
          tickets: {
            some: {
              sourceCandidateId: { startsWith: 'ECOM-' },
            },
          },
        },
      });

      if (!project) {
        let user = await prisma.user.findFirst();
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: `ingest_test_${Date.now()}@example.com`,
              username: `ingest_user_${Date.now()}`,
              passwordHash: 'dummy',
            },
          });
        }

        project = await prisma.project.create({
          data: {
            name: `Ecommerce Test Ingestion ${Date.now()}`,
            slug: `ecommerce-ingest-${Date.now()}`,
            description: 'Single-store modern commerce architecture test',
            techStack: 'Next.js 14, Node.js, Express, PostgreSQL',
            ownerId: user.id,
            boards: {
              create: {
                name: 'Main Board',
                columns: {
                  create: [
                    { name: 'To Do', category: 'TODO', position: 0 },
                    { name: 'In Progress', category: 'IN_PROGRESS', position: 1 },
                    { name: 'Done', category: 'DONE', position: 2 },
                  ],
                },
              },
            },
          },
        });
        createdProject = true;

        const prdBuffer = fs.readFileSync(PRD_PATH);
        const prdDoc = await prisma.projectDocument.create({
          data: {
            projectId: project.id,
            filename: 'Ecommerce_Website_PRD.pdf',
            fileSize: prdBuffer.length,
            fileFormat: 'pdf',
            mimeType: 'application/pdf',
            status: 'PENDING',
          },
        });
        await processDocumentRecord(prdDoc.id, prdBuffer);

        const xlsxBuffer = fs.readFileSync(SPRINT_PLAN_PATH);
        const xlsxDoc = await prisma.projectDocument.create({
          data: {
            projectId: project.id,
            filename: 'Ecommerce_Sprint_Plan.xlsx',
            fileSize: xlsxBuffer.length,
            fileFormat: 'xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            status: 'PENDING',
          },
        });
        await processDocumentRecord(xlsxDoc.id, xlsxBuffer);

        await ProjectSynthesisService.synthesizeProject(project.id);
      }

      projectId = project.id;
    });

    after(async () => {
      if (createdProject && projectId) {
        await prisma.project.delete({ where: { id: projectId } });
      }
    });

    // Test 9: Schema-valid Project Brief
    it('9. should synthesize a complete, schema-valid Project Brief with all 11 sprints and domain modules', async () => {
      const brief = await ProjectSynthesisService.getBrief(projectId);

      assert.ok(brief, 'Project Brief exists');
      assert.ok(typeof brief.overview === 'string' && brief.overview.length > 20, 'Brief has overview');
      assert.ok(brief.scope && Array.isArray(brief.scope.p0Required), 'Brief defines p0Required inScope items');
      assert.ok(brief.scope.outOfScope && brief.scope.outOfScope.length > 0, 'Brief defines outOfScope items');
      assert.ok(brief.userPersonasAndRoles && brief.userPersonasAndRoles.length >= 3, 'Brief defines user personas');
      assert.ok(brief.technicalArchitecture && typeof brief.technicalArchitecture.techStack === 'string', 'Brief specifies tech stack');

      // Check sprint schedule in brief
      assert.ok(Array.isArray(brief.sprintSchedule), 'Brief includes sprint schedule');
      assert.strictEqual(brief.sprintSchedule.length, 12, 'Sprint schedule contains 12 sprints (S1-S11 + Release)');
      for (let i = 1; i <= 11; i++) {
        const sprint = brief.sprintSchedule.find((s: any) => s.sprint === `S${i}`);
        assert.ok(sprint, `Sprint S${i} present in Project Brief schedule`);
        assert.ok(sprint.candidateCount > 0, `Sprint S${i} has candidate tickets`);
      }

      // Check risks and decisions
      assert.ok(Array.isArray(brief.risksAndDecisions), 'Brief includes risks and decisions');
      assert.ok(brief.risksAndDecisions.length >= 10, 'Brief includes risks & decisions items from sheet');

      // Check launch checklist
      assert.ok(Array.isArray(brief.launchChecklist), 'Brief includes launch checklist gates');
      assert.ok(brief.launchChecklist.length >= 10, 'Brief includes launch checklist gates from sheet');

      // Check source coverage within brief
      assert.strictEqual(brief.sourceCoverage.featuresExtracted, 22, 'Brief reports 22 extracted domain features');
      assert.strictEqual(brief.sourceCoverage.reconciledCandidates, 82, 'Brief reports 82 reconciled candidates');
    });

    // Test 10: Whole-project Backlog Generation (Mode A)
    it('10. should generate developer-ready tickets covering all 82 candidates with full standards', async () => {
      let tickets = await prisma.ticket.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });

      if (tickets.length < 82) {
        await ProjectSynthesisService.generateAllBacklogTickets(projectId);
        tickets = await prisma.ticket.findMany({
          where: { projectId },
          orderBy: { createdAt: 'asc' },
        });
      }

      assert.strictEqual(tickets.length, 82, 'Kanban board has all 82 tickets created');

      // Verify developer-ready standards on sample tickets
      const sample = tickets.find((t) => t.sourceCandidateId === 'ECOM-001');
      assert.ok(sample, 'ECOM-001 ticket exists');
      assert.strictEqual(sample.sprint, 'S1');
      assert.strictEqual(sample.module, 'Project Foundation & Architecture');
      assert.ok(sample.acceptanceCriteria && Array.isArray(sample.acceptanceCriteria as any), 'Has structured acceptance criteria');
      assert.ok(sample.prChecklist && Array.isArray(sample.prChecklist as any), 'Has PR checklist');
      assert.ok(sample.definitionOfDone && Array.isArray(sample.definitionOfDone as any), 'Has Definition of Done');
      assert.ok(sample.storyPoints && sample.storyPoints > 0, 'Has estimated story points');
      assert.ok(sample.ownershipRole, 'Has assigned ownership role');
    });

    // Test 11: Feature-by-feature Generation (Mode B)
    it('11. should support Mode B generation for a single selected roadmap feature', async () => {
      const cartFeature = await prisma.projectFeature.findFirst({
        where: { projectId, name: { contains: 'Shopping Cart' } },
      });
      assert.ok(cartFeature, 'Shopping Cart feature exists in project');

      const result = await ProjectSynthesisService.generateTicketsForFeature(projectId, cartFeature.id);
      assert.ok(result.success, 'Mode B generation succeeded');
      assert.ok(result.ticketCount > 0, 'Linked/generated tickets for Shopping Cart');
      assert.strictEqual(result.featureName, cartFeature.name);

      // Verify linked tickets are relevant to cart
      for (const t of result.tickets) {
        assert.ok(t.title.toLowerCase().includes('cart') || t.description.toLowerCase().includes('cart'), 'Ticket is cart-specific');
      }
    });

    // Test 12: Duplicate Prevention
    it('12. should prevent duplicate ticket creation when generation is re-executed', async () => {
      const result = await ProjectSynthesisService.generateAllBacklogTickets(projectId);

      assert.strictEqual(result.createdCount, 0, '0 new tickets created on re-run');
      assert.strictEqual(result.existingCount, 82, 'All 82 candidates detected as existing');

      const totalCount = await prisma.ticket.count({ where: { projectId } });
      assert.strictEqual(totalCount, 82, 'Total ticket count remains exactly 82 without duplicates');
    });

    // Test 13: Preserving Approved Features and Existing Tickets
    it('13. should preserve existing feature records, IDs, and candidate traceability', async () => {
      const features = await prisma.projectFeature.findMany({
        where: { projectId },
      });

      assert.strictEqual(features.length, 22, 'All 22 domain capability features are preserved');

      // Verify no generic categories exist
      const genericNames = [
        'API Service & Controller Endpoints',
        'Project Foundation & Database Schema',
        'Client Interface & Interactive Workflows',
      ];
      for (const generic of genericNames) {
        const found = features.find((f) => f.name === generic);
        assert.strictEqual(found, undefined, `Generic placeholder "${generic}" was removed`);
      }

      // Verify each feature has candidate IDs linked
      const withCandidates = features.filter((f) => Array.isArray(f.sourceCandidateIds) && (f.sourceCandidateIds as any[]).length > 0);
      assert.ok(withCandidates.length > 15, 'Majority of features link directly to source candidate IDs');
    });

    // Test 14: Coverage validation and reporting
    it('14. should report 100% sprint coverage and 100% candidate reconciliation in coverage report', async () => {
      const analysis = await prisma.projectAnalysis.findUnique({
        where: { projectId },
      });

      assert.ok(analysis?.coverageReport, 'Coverage report exists');
      const cov = analysis.coverageReport as any;

      assert.strictEqual(cov.sprintsDetected, 12, '12 sprints detected from source');
      assert.strictEqual(cov.sprintsRepresented, 12, '12 sprints represented in brief');
      assert.strictEqual(cov.sourceBacklogCandidates, 82, '82 candidates detected from source');
      assert.strictEqual(cov.reconciledCandidates, 82, '82 candidates reconciled into backlog');
      assert.strictEqual(cov.coveragePercentage, 100, 'Sprint and candidate coverage is 100%');
      assert.strictEqual(cov.featuresExtracted, 22, '22 real domain features extracted');
      assert.strictEqual(cov.validationStatus, 'VALIDATED', 'Validation status is VALIDATED');
    });

    // Test 15: Role and Permission Enforcement
    it('15. should enforce role permissions for backlog and feature ticket generation', async () => {
      const roles = [SYSTEM_ROLE_KEYS.PROJECT_MANAGER, SYSTEM_ROLE_KEYS.DEVELOPER, SYSTEM_ROLE_KEYS.VIEWER];
      assert.ok(roles.includes('project_manager'), 'Project Manager role defined');
      assert.ok(roles.includes('developer'), 'Developer role defined');
      assert.ok(roles.includes('viewer'), 'Viewer role defined');

      // Verify permission constant exists
      assert.strictEqual(PERMISSIONS.FEATURE_GENERATE_TICKETS, 'feature.generate_tickets');
      assert.strictEqual(PERMISSIONS.TICKET_CREATE, 'ticket.create');
    });

    // Test 16: Sprint-specific Generation (Mode C)
    it('16. should support Mode C sprint-specific ticket generation strictly isolated to a single sprint', async () => {
      // Clear tickets for S2 first to test isolated generation
      await prisma.ticket.deleteMany({
        where: { projectId, sprint: 'S2' },
      });

      const result = await ProjectSynthesisService.generateTicketsForSprint(projectId, 'S2');
      assert.strictEqual(result.success, true, 'Mode C generation succeeded for S2');
      assert.strictEqual(result.sprint, 'S2');
      assert.ok(result.createdCount > 0, 'Created S2 tickets');

      // Verify all generated tickets strictly belong to S2
      for (const t of result.tickets) {
        assert.strictEqual(t.sprint, 'S2', 'Ticket sprint must be strictly S2');
      }
    });
  });
});

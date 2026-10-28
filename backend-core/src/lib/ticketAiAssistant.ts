import { prisma } from './prisma.js';
import { TicketPriority } from '@prisma/client';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';

// Common acknowledgments that should NOT trigger a noisy reply
const ACKNOWLEDGMENT_PATTERNS = [
  /^\s*(thanks|thank\s+you|thx|ty)\s*[.!]*\s*$/i,
  /^\s*(got\s+it|understood|noted|noted\s+with\s+thanks)\s*[.!]*\s*$/i,
  /^\s*(looks\s+good|lgtm|looks\s+great|sounds\s+good)\s*[.!]*\s*$/i,
  /^\s*(okay|ok|k|kk|cool|nice|done|will\s+do|acknowledged|perfect)\s*[.!]*\s*$/i,
  /^\s*(thanks|thank\s+you)[,\s]+(all|team|folks|everyone|bro|mate)?\s*[.!]*\s*$/i,
  /^\s*(ok|okay)[,\s]+(thanks|thank\s+you|got\s+it)\s*[.!]*\s*$/i,
];

/**
 * Checks whether a comment is purely an acknowledgment without substantive inquiries.
 */
export function isAcknowledgmentComment(text: string): boolean {
  const clean = text.trim();
  if (!clean) return true;

  // Contains question mark -> substantive question, not an acknowledgment
  if (clean.includes('?')) return false;

  for (const pattern of ACKNOWLEDGMENT_PATTERNS) {
    if (pattern.test(clean)) return true;
  }

  const words = clean.toLowerCase().split(/\s+/);
  const ackWords = new Set([
    'thanks',
    'thank',
    'you',
    'got',
    'it',
    'noted',
    'ok',
    'okay',
    'lgtm',
    'cool',
    'done',
    'perfect',
    'good',
    'great',
    'sure',
    'will',
    'do',
    'acknowledged',
  ]);

  if (words.length <= 3 && words.every((w) => ackWords.has(w.replace(/[.,!?:;]/g, '')))) {
    return true;
  }

  return false;
}

interface GenerateResponseParams {
  projectId: string;
  ticket: any;
  project: any;
  relatedTickets: any[];
  discussionHistory: Array<{ role: 'user' | 'assistant'; author: string; content: string }>;
  userComment: string;
  documentChunks: Array<{ filename: string; text: string; location?: string }>;
}

interface GenerateResponseResult {
  response: string;
  provider: string;
  citations: Array<{ section?: string; snippet?: string; distance?: number }>;
}

/**
 * Version-controlled system prompt with strict delimiter security and human Staff Lead persona
 */
function buildSystemPrompt(): string {
  return `You are an expert Staff Software Engineer and Senior Technical Lead discussing a ticket directly with your engineering teammates.
Your goal is to answer questions, resolve technical doubts, clarify architectural boundaries, and give actionable implementation advice.

TONE & COMMUNICATION PRINCIPLES (CRITICAL: DO NOT SOUND LIKE A GENERIC AI GENERATOR):
1. NATURAL HUMAN CONVERSATION:
   - Write naturally, professionally, and collegially—the exact way an experienced tech lead or staff engineer answers in Slack or Jira comments.
   - Start immediately with the direct answer or solution. Avoid pleasantries, throat-clearing, or restating the question.
   - FORBIDDEN FORMULAS:
     * NEVER use labels/headings like "Short answer", "TL;DR", "Direct Answer", "Summary", or "Overview".
     * NEVER build artificial two-column breakdown tables to analyze ticket elements (e.g. do NOT generate tables like "Ticket element | What it refers to" or "Tool | Why it fits").
     * NEVER output generic robotic closures like "Let me know if you need more help!", "Hope this helps!", "Feel free to reach out!", or "Happy coding!".
     * NEVER generate patronizing checklists like "Next steps for you: 1. Confirm tool with lead...".
   - Use clean, well-spaced paragraphs and clear bullet points when listing requirements, considerations, or steps.

2. ACCURACY & CONTEXT GROUNDING:
   - Ground your answer strictly in the active ticket description, acceptance criteria, project tech stack, and retrieved project documentation.
   - Distinguish confirmed requirements from your technical recommendations.
   - NEVER invent APIs, schema models, database tables, or business rules not supported by project context.
   - If requirements are ambiguous or missing (e.g. status codes, edge cases), pinpoint the exact question to resolve without making arbitrary assumptions.

3. STRUCTURE & PROPORTIONALITY:
   - Answer the question directly in the opening 1-2 sentences.
   - Follow with the technical rationale, architectural boundaries, or implementation guidance cleanly.
   - When code is useful, provide concise, idiomatic, typed code snippets with language tags (typescript, prisma, sql, etc.).
   - Proportionality: straightforward questions get 2-3 crisp, natural paragraphs; complex technical questions get clear architectural sections and edge-case guidance.`;
}

/**
 * Formats prompt context with XML-style security boundaries
 */
function buildUserPrompt(params: GenerateResponseParams): string {
  const { ticket, project, relatedTickets, discussionHistory, userComment, documentChunks } = params;

  const acList = Array.isArray(ticket.acceptanceCriteria)
    ? ticket.acceptanceCriteria.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c))).join('\n- ')
    : 'None specified';

  const prList = Array.isArray(ticket.prChecklist)
    ? ticket.prChecklist.map((c: any) => (typeof c === 'string' ? c : c.text || JSON.stringify(c))).join('\n- ')
    : 'None specified';

  const historyStr = discussionHistory
    .map((h) => `[${h.role === 'assistant' ? 'Tech Lead' : h.author}]: ${h.content}`)
    .join('\n');

  const relatedStr = relatedTickets.length > 0
    ? relatedTickets.map((r) => `- ${r.title} (${r.type || 'Task'} | Status: ${r.status} | Priority: ${r.priority})`).join('\n')
    : 'None';

  const docsStr = documentChunks.length > 0
    ? documentChunks.map((d, i) => `[Doc ${i + 1}: ${d.filename} | ${d.location || 'General'}]\n${d.text}`).join('\n\n')
    : 'No additional document excerpts available.';

  return `<project_context>
Project Name: ${project.name}
Description: ${project.description || 'N/A'}
Tech Stack: ${project.techStack || 'TypeScript, Next.js, PostgreSQL, Node.js'}
Goals: ${project.goals || 'N/A'}
Technical Constraints: ${project.technicalConstraints || 'N/A'}
Business Requirements: ${project.businessRequirements || 'N/A'}
Known Dependencies: ${project.knownDependencies || 'N/A'}
</project_context>

<active_ticket>
Title: ${ticket.title}
Status: ${ticket.status} | Priority: ${ticket.priority} | Type: ${ticket.type} | Story Points: ${ticket.storyPoints ?? 'N/A'}
Description: ${ticket.description || 'No description provided.'}
Technical Notes: ${ticket.technicalNotes || 'N/A'}
Acceptance Criteria:
- ${acList}
PR Verification Checklist:
- ${prList}
Parent Feature: ${ticket.feature ? `${ticket.feature.name} (${ticket.feature.module})` : 'N/A'}
Related Tickets:
${relatedStr}
</active_ticket>

<approved_knowledge_base>
${docsStr}
</approved_knowledge_base>

<discussion_history>
${historyStr || 'No previous messages in discussion.'}
</discussion_history>

<user_comment>
${userComment}
</user_comment>

Respond to the teammate's question naturally and directly as an experienced Staff Engineer/Tech Lead, following all tone, formatting, and grounding instructions.`;
}

/**
 * Heuristic rule-based fallback when external LLMs are unavailable
 */
function generateIntelligentFallbackResponse(params: GenerateResponseParams): GenerateResponseResult {
  const { ticket, project, userComment } = params;
  const lowerMsg = userComment.toLowerCase();
  const techStack = project.techStack || 'TypeScript, Next.js, Node.js, PostgreSQL';

  // 1. Missing requirements / validation / error status clarification
  if (
    lowerMsg.includes('error response') ||
    lowerMsg.includes('400 or 422') ||
    lowerMsg.includes('validation failure') ||
    lowerMsg.includes('missing requirement') ||
    lowerMsg.includes('status code') ||
    lowerMsg.includes('return 400') ||
    lowerMsg.includes('return 422')
  ) {
    return {
      response: `The ticket doesn't explicitly specify the expected error response format for validation failures.\n\nTo keep implementation consistent across endpoints, we should confirm:\n- Whether schema validation errors should return an HTTP **400 Bad Request** or **422 Unprocessable Entity**.\n- The standard error body format (e.g. \`{ success: false, error: string, issues?: any[] }\`).\n\nCould the Tech Lead or PM confirm the preferred contract before we finalize the controller?`,
      provider: 'TaskPulse AI',
      citations: [],
    };
  }

  // 2. Acceptance criteria question
  if (
    lowerMsg.includes('acceptance criteria') ||
    lowerMsg.includes('complete') ||
    lowerMsg.includes('definition of done') ||
    lowerMsg.includes('when is this done') ||
    lowerMsg.includes('how do we know')
  ) {
    let response = `Here are the verified Acceptance Criteria and Definition of Done for **${ticket.title}**:\n\n`;
    const acList = Array.isArray(ticket.acceptanceCriteria) ? ticket.acceptanceCriteria : [];
    if (acList.length > 0) {
      acList.forEach((ac: any, idx: number) => {
        const text = typeof ac === 'string' ? ac : ac.text || JSON.stringify(ac);
        response += `- [ ] **AC ${idx + 1}**: ${text}\n`;
      });
    } else {
      response += `- [ ] Verify core feature functionality meets specifications with automated tests.\n`;
      response += `- [ ] Code compiles without TypeScript errors and follows project lint rules.\n`;
    }

    const prList = Array.isArray(ticket.prChecklist) ? ticket.prChecklist : [];
    if (prList.length > 0) {
      response += `\n**PR Verification Checklist:**\n`;
      prList.forEach((pr: any) => {
        const text = typeof pr === 'string' ? pr : pr.text || JSON.stringify(pr);
        response += `- [ ] ${text}\n`;
      });
    }
    return { response, provider: 'TaskPulse AI', citations: [] };
  }

  // 3. 401 Unauthorized / Authentication questions
  if (lowerMsg.includes('401') || lowerMsg.includes('unauthorized') || (lowerMsg.includes('token') && lowerMsg.includes('invalid'))) {
    return {
      response: `A **401 Unauthorized** response in this workflow usually comes down to three things:\n\n1. **Missing or Malformed Header**: Ensure the request contains \`Authorization: Bearer <access_token>\`.\n2. **Expired Access Token**: Access tokens expire after short intervals. Call \`POST /api/auth/refresh\` with credentials included to obtain a new token.\n3. **Secret Mismatch**: Verify the JWT secret keys match between environment variables and token verification middleware.\n\n\`\`\`typescript\n// Example client request with credentials\nconst res = await fetch(url, {\n  headers: { 'Authorization': \`Bearer \${token}\` },\n  credentials: 'include',\n});\n\`\`\``,
      provider: 'TaskPulse AI',
      citations: [],
    };
  }

  // 4. Architecture questions (Frontend vs Backend)
  if (
    lowerMsg.includes('frontend or backend') ||
    lowerMsg.includes('where should this logic') ||
    lowerMsg.includes('architecture') ||
    lowerMsg.includes('which layer') ||
    lowerMsg.includes('wireframe')
  ) {
    if (lowerMsg.includes('wireframe') || ticket.title.toLowerCase().includes('wireframe')) {
      return {
        response: `This ticket is **100% frontend UI/UX work**.\n\nYou're designing the visual layouts, user flows, and interaction states for the client screens (browse, product detail, cart, checkout, auth, order history, and admin). It does not involve backend services, database schemas, or API contracts—though the resulting wireframes will help the backend team know which endpoints are needed.\n\nFor this ticket, focus on:\n- **Responsive layouts**: Both desktop (≥ 1024px) and mobile (< 768px) views.\n- **State variations**: Skeleton/loading states, zero-data/empty states, and error validation banners.\n\nFigma is recommended for the mockups. Once the screens are ready, you can drop the link directly in this ticket.`,
        provider: 'TaskPulse AI',
        citations: [],
      };
    }
    return {
      response: `Based on the project's architectural guidelines (**${techStack}**):\n\n- **Backend / Server Route**: Business validation, database operations, authorization checks, and secure secrets handling must live on the server.\n- **Frontend (Next.js Client Components)**: Optimistic UI state updates, form validation schemas, and interactive component state belong on the client.\n\nKeeping business logic and authorization strictly on the server preserves database integrity and prevents security bypasses.`,
      provider: 'TaskPulse AI',
      citations: [],
    };
  }

  // 5. Testing questions
  if (lowerMsg.includes('test') || lowerMsg.includes('edge case') || lowerMsg.includes('unit test')) {
    return {
      response: `Here are the key edge cases to cover for this ticket:\n\n1. **Input Boundaries**: Empty strings, invalid characters, and maximum length limits.\n2. **Authorization Scopes**: Unauthorized users or non-project members must receive 403 Forbidden.\n3. **Idempotency & Concurrency**: Duplicate submissions or concurrent requests must not duplicate records.\n4. **Failure Resiliency**: Graceful degradation when external services or database queries fail.`,
      provider: 'TaskPulse AI',
      citations: [],
    };
  }

  // 6. General Implementation Guidance
  let response = `Based on the project tech stack (**${techStack}**) and ticket requirements, here is the recommended approach:\n\n`;
  if (lowerMsg.includes('endpoint') || lowerMsg.includes('api') || lowerMsg.includes('route')) {
    response += `#### Recommended API Route Pattern\n\`\`\`typescript\nimport { NextRequest, NextResponse } from 'next/server';\n\nexport async function POST(req: NextRequest) {\n  try {\n    const body = await req.json();\n    // 1. Validate payload with schema\n    // 2. Perform business logic\n    return NextResponse.json({ success: true, data: result });\n  } catch (err: any) {\n    return NextResponse.json({ success: false, error: err.message }, { status: 400 });\n  }\n}\n\`\`\`\n`;
  } else if (lowerMsg.includes('schema') || lowerMsg.includes('database') || lowerMsg.includes('table') || lowerMsg.includes('model')) {
    response += `#### Recommended Schema Pattern\n\`\`\`prisma\nmodel Entity {\n  id        String   @id @default(uuid())\n  title     String\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n  projectId String   @map("project_id")\n  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)\n\n  @@index([projectId])\n  @@map("entities")\n}\n\`\`\`\n`;
  } else {
    response += `1. **Review Acceptance Criteria**: Verify all checklist items on this ticket before submitting.\n`;
    response += `2. **Follow Layered Architecture**: Keep route handlers lightweight and encapsulate domain operations.\n`;
    response += `3. **Sanitize & Validate Inputs**: Validate all incoming parameters with strict schema validation.\n`;
    response += `4. **Automated Verification**: Add automated tests to fulfill the PR verification checklist.\n`;
  }

  return { response, provider: 'TaskPulse AI', citations: [] };
}

/**
 * Attempts calling the Python AI microservice (/ai/ticket-discussion)
 */
async function callAiMicroservice(params: GenerateResponseParams): Promise<GenerateResponseResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(`${AI_SERVICE_URL}/ai/ticket-discussion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: params.projectId,
        ticket: params.ticket,
        project: {
          name: params.project.name,
          description: params.project.description,
          techStack: params.project.techStack,
        },
        comment: params.userComment,
        history: params.discussionHistory.map((h) => ({
          senderType: h.role === 'assistant' ? 'ai' : 'user',
          content: h.content,
        })),
        relatedTickets: params.relatedTickets,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.response) {
        return {
          response: data.response,
          provider: data.provider || 'ai-service',
          citations: data.citations || [],
        };
      }
    }
  } catch (err: any) {
    console.warn(`[AI Assistant] Python AI microservice call failed (${err.message}), falling back to direct LLM.`);
  }
  return null;
}

/**
 * Calls Groq API directly with primary or fallback model
 */
async function callGroqDirect(
  systemPrompt: string,
  userPrompt: string,
  modelToUse: string = GROQ_MODEL
): Promise<GenerateResponseResult | null> {
  if (!GROQ_API_KEY) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.ok) {
      const json = (await res.json()) as any;
      const content = json.choices?.[0]?.message?.content;
      if (content) {
        return {
          response: content.trim(),
          provider: 'TaskPulse AI',
          citations: [],
        };
      }
    } else {
      console.warn(`[AI Assistant] Direct Groq call (${modelToUse}) failed with status ${res.status}.`);
    }
  } catch (err: any) {
    console.warn(`[AI Assistant] Direct Groq call (${modelToUse}) failed (${err.message}).`);
  }
  return null;
}

/**
 * Executes response generation with bounded retries across all providers
 */
async function generateAiDiscussionResponse(params: GenerateResponseParams): Promise<GenerateResponseResult> {
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Backoff delay before retry
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }

      // Tier 1: Try AI microservice
      const microserviceResult = await callAiMicroservice(params);
      if (microserviceResult && microserviceResult.response) {
        return microserviceResult;
      }

      // Tier 2: Try direct Groq (Primary Model)
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(params);
      const groqResult = await callGroqDirect(systemPrompt, userPrompt, GROQ_MODEL);
      if (groqResult && groqResult.response) {
        return groqResult;
      }

      // Tier 3: Try direct Groq (Fallback Model)
      if (GROQ_FALLBACK_MODEL && GROQ_FALLBACK_MODEL !== GROQ_MODEL) {
        const fallbackGroqResult = await callGroqDirect(systemPrompt, userPrompt, GROQ_FALLBACK_MODEL);
        if (fallbackGroqResult && fallbackGroqResult.response) {
          return fallbackGroqResult;
        }
      }

      // Tier 4: Intelligent heuristic rule engine (guaranteed deterministic fallback)
      return generateIntelligentFallbackResponse(params);
    } catch (err: any) {
      lastError = err;
      console.error(`[AI Assistant] Attempt ${attempt + 1} failed:`, err);
    }
  }

  // If all attempts failed with exceptions, generate safe intelligent fallback
  if (lastError) {
    return generateIntelligentFallbackResponse(params);
  }

  throw new Error('Failed to generate AI response after retries');
}

/**
 * Orchestrates the full automatic AI ticket discussion workflow:
 * 1. Checks comment validity and recursion prevention.
 * 2. Idempotency check: prevents duplicate AI responses for the same comment.
 * 3. Filters acknowledgments.
 * 4. Creates/updates pending placeholder comment in DB.
 * 5. Loads context (ticket, feature, related tickets, project knowledge).
 * 6. Generates response with timeouts and bounded retries.
 * 7. Persists final AI comment and notifies real-time listeners.
 */
export async function processAiTicketDiscussion(
  optionsOrCommentId:
    | string
    | {
        projectId: string;
        ticketId: string;
        originalCommentId: string;
        forceRetry?: boolean;
      }
): Promise<void> {
  let projectId: string;
  let ticketId: string;
  let originalCommentId: string;
  let forceRetry = false;

  if (typeof optionsOrCommentId === 'string') {
    originalCommentId = optionsOrCommentId;
    const comment = await prisma.comment.findUnique({
      where: { id: originalCommentId },
      include: { ticket: { select: { id: true, projectId: true } } },
    });
    if (!comment || !comment.ticket) return;
    projectId = comment.ticket.projectId;
    ticketId = comment.ticket.id;
  } else {
    projectId = optionsOrCommentId.projectId;
    ticketId = optionsOrCommentId.ticketId;
    originalCommentId = optionsOrCommentId.originalCommentId;
    forceRetry = optionsOrCommentId.forceRetry || false;
  }
  const startTime = Date.now();

  // 1. Load original human comment
  const originalComment = await prisma.comment.findUnique({
    where: { id: originalCommentId },
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  if (!originalComment) {
    console.warn(`[AI Assistant] Original comment ${originalCommentId} not found.`);
    return;
  }

  // 2. Loop prevention: Never respond to an AI-authored comment!
  if (originalComment.isAi) {
    console.info(`[AI Assistant] Comment ${originalCommentId} is AI-authored; skipping to prevent recursive loops.`);
    return;
  }

  // 3. Idempotency Check: Check if an AI response already exists for this comment
  const existingAiComment = await prisma.comment.findFirst({
    where: {
      ticketId,
      parentCommentId: originalCommentId,
      isAi: true,
    },
  });

  if (existingAiComment) {
    // If not a force retry and already completed, processing, or skipped, avoid duplicate!
    if (!forceRetry) {
      if (
        existingAiComment.aiProcessingStatus === 'COMPLETED' ||
        existingAiComment.aiProcessingStatus === 'PROCESSING' ||
        existingAiComment.aiProcessingStatus === 'SKIPPED'
      ) {
        console.info(
          `[AI Assistant] Idempotency: AI comment already in status '${existingAiComment.aiProcessingStatus}' for comment ${originalCommentId}. Skipping.`
        );
        return;
      }
    }
  }

  // 4. Acknowledgment Check: Filter simple 'Thanks', 'Got it', etc.
  if (isAcknowledgmentComment(originalComment.content)) {
    console.info(`[AI Assistant] Comment '${originalComment.content}' classified as acknowledgment; marked as skipped.`);
    if (existingAiComment) {
      await prisma.comment.update({
        where: { id: existingAiComment.id },
        data: {
          aiProcessingStatus: 'SKIPPED',
          content: '',
        },
      });
    }
    return;
  }

  // 5. Create or reset pending placeholder in database
  let aiCommentId = existingAiComment?.id;
  if (!aiCommentId) {
    const placeholder = await prisma.comment.create({
      data: {
        ticketId,
        isAi: true,
        authorName: 'TaskPulse Tech Lead',
        parentCommentId: originalCommentId,
        content: '',
        aiProcessingStatus: 'PROCESSING',
        aiMetadata: {
          startedAt: new Date().toISOString(),
        },
      },
    });
    aiCommentId = placeholder.id;
  } else {
    await prisma.comment.update({
      where: { id: aiCommentId },
      data: {
        aiProcessingStatus: 'PROCESSING',
        content: '',
        aiMetadata: {
          startedAt: new Date().toISOString(),
          retried: true,
        },
      },
    });
  }

  try {
    // 6. Gather Ticket & Project Context
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        feature: true,
        assignee: { select: { id: true, username: true } },
        reporter: { select: { id: true, username: true } },
      },
    });

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { analysis: true },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Related tickets within the same feature or project
    const relatedTickets = await prisma.ticket.findMany({
      where: {
        projectId,
        id: { not: ticketId },
        ...(ticket.featureId ? { featureId: ticket.featureId } : {}),
      },
      select: { id: true, title: true, status: true, priority: true, type: true },
      take: 5,
    });

    // Discussion history (exclude the pending placeholder and skipped comments)
    const historyRecords = await prisma.comment.findMany({
      where: {
        ticketId,
        id: { not: aiCommentId },
        aiProcessingStatus: { not: 'SKIPPED' },
      },
      include: {
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 15,
    });

    const discussionHistory = historyRecords.map((c) => ({
      role: c.isAi ? ('assistant' as const) : ('user' as const),
      author: c.isAi ? 'Tech Lead' : c.user?.username || 'Team Member',
      content: c.content,
    }));

    // Approved project document chunks for grounding
    const rawChunks = await prisma.documentChunk.findMany({
      where: { projectId },
      include: {
        document: { select: { filename: true } },
      },
      take: 8,
      orderBy: { order: 'asc' },
    });

    const documentChunks = rawChunks.map((ch) => ({
      filename: ch.document?.filename || 'Specifications',
      text: ch.chunkText,
      location: ch.location || ch.sourceHeading || undefined,
    }));

    // 7. Generate Response
    const result = await generateAiDiscussionResponse({
      projectId,
      ticket,
      project,
      relatedTickets,
      discussionHistory,
      userComment: originalComment.content,
      documentChunks,
    });

    const responseTimeMs = Date.now() - startTime;

    // 8. Persist completed AI response
    await prisma.comment.update({
      where: { id: aiCommentId },
      data: {
        content: result.response,
        aiProcessingStatus: 'COMPLETED',
        aiMetadata: {
          provider: result.provider,
          citations: result.citations,
          responseTimeMs,
          completedAt: new Date().toISOString(),
        },
      },
    });

    console.info(
      `[AI Assistant] Successfully generated AI response for ticket ${ticketId} (took ${responseTimeMs}ms, provider: ${result.provider})`
    );
  } catch (error: any) {
    console.error(`[AI Assistant] Failed to process AI response for comment ${originalCommentId}:`, error);

    // 9. Persist FAILED status with retryable metadata
    if (aiCommentId) {
      await prisma.comment.update({
        where: { id: aiCommentId },
        data: {
          content: 'I encountered an issue preparing the response. Please click Retry below to try again.',
          aiProcessingStatus: 'FAILED',
          aiMetadata: {
            error: error.message || 'Unknown error during AI response generation',
            retryable: true,
            failedAt: new Date().toISOString(),
          },
        },
      });
    }
  }
}

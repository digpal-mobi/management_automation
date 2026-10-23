import { prisma } from './prisma.js';
import { Project, ProjectFeature, TicketPriority } from '@prisma/client';

interface ProjectContextInput {
  project: Project;
  documentsText: Array<{ filename: string; text: string; location?: string }>;
  existingFeatures?: ProjectFeature[];
}

export interface AnalysisOutput {
  overview: string;
  functionalRequirements: Array<{
    title: string;
    description: string;
    module: string;
    priority: string;
    source?: string;
  }>;
  nonFunctionalRequirements: Array<{
    category: string;
    description: string;
    source?: string;
  }>;
  businessRules: Array<{
    rule: string;
    details?: string;
    source?: string;
  }>;
  technicalRequirements: Array<{
    area: string;
    details: string;
    source?: string;
  }>;
  features: Array<{
    name: string;
    description: string;
    module: string;
    businessValue?: string;
    suggestedPriority: TicketPriority;
    dependencies?: string[];
    relatedRequirements?: string[];
    constraints?: string;
    sourceReferences?: Array<{ docTitle: string; location?: string; excerpt?: string }>;
  }>;
  milestones: Array<{
    name: string;
    targetDate?: string;
    sequenceOrder?: number;
    isConfirmed?: boolean;
    details?: string;
  }>;
  openQuestions: Array<{
    question: string;
    category?: string;
    impact?: string;
    resolution?: string;
  }>;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';

/**
 * Calls LLM (Groq Cloud models) to analyze project context
 */
async function callLlmJson(systemPrompt: string, userPrompt: string): Promise<any> {
  if (!GROQ_API_KEY) return null;

  // 1. Try Primary Groq Model
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as any;
      const content = json.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } else {
      console.warn(`[LLM] Groq (${GROQ_MODEL}) returned status ${res.status}`);
    }
  } catch (err) {
    console.warn(`[LLM] Groq (${GROQ_MODEL}) request failed:`, err);
  }

  // 2. Try Fallback Groq Model
  if (GROQ_FALLBACK_MODEL && GROQ_FALLBACK_MODEL !== GROQ_MODEL) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_FALLBACK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as any;
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          return JSON.parse(content);
        }
      }
    } catch (err) {
      console.warn(`[LLM] Groq fallback (${GROQ_FALLBACK_MODEL}) request failed:`, err);
    }
  }

  return null;
}

/**
 * Rule-based fallback extractor when LLM keys are absent or offline
 */
function extractRuleBasedAnalysis(input: ProjectContextInput): AnalysisOutput {
  const { project, documentsText } = input;
  const combinedText = [
    project.name,
    project.description || '',
    project.goals ? `Goals: ${project.goals}` : '',
    project.targetUsers ? `Target Users: ${project.targetUsers}` : '',
    project.techStack ? `Tech Stack: ${project.techStack}` : '',
    project.businessRequirements ? `Business Requirements: ${project.businessRequirements}` : '',
    project.technicalConstraints ? `Technical Constraints: ${project.technicalConstraints}` : '',
    project.knownDependencies ? `Dependencies: ${project.knownDependencies}` : '',
    ...documentsText.map((d) => `Document ${d.filename} (${d.location || 'Overview'}):\n${d.text}`),
  ].join('\n\n');

  // Extract candidate features from headings and bullet points
  const candidateFeatures: AnalysisOutput['features'] = [];
  const lines = combinedText.split('\n');
  const openQuestions: AnalysisOutput['openQuestions'] = [];

  // Identify modules and candidate features
  let currentModule = 'Core Architecture';
  const primaryDoc = documentsText[0]?.filename || 'Project Specifications';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#') || line.match(/^[0-9]+\.\s+[A-Z]/)) {
      const title = line.replace(/^[#0-9.\s]+/, '').trim();
      if (title.length > 3 && title.length < 80 && !title.toLowerCase().includes('overview')) {
        currentModule = title;
      }
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.match(/^[0-9]+\)\s+/)) {
      const item = line.replace(/^[-*0-9.)\s]+/, '').trim();
      if (item.length > 10 && item.length < 120) {
        const name = item.split(/[:–—]/)[0].trim();
        const desc = item.split(/[:–—]/)[1]?.trim() || item;
        if (name && !candidateFeatures.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
          candidateFeatures.push({
            name,
            description: desc,
            module: currentModule,
            suggestedPriority: candidateFeatures.length < 3 ? TicketPriority.HIGH : TicketPriority.MEDIUM,
            dependencies: candidateFeatures.length > 0 ? [candidateFeatures[0].name] : [],
            relatedRequirements: [`Req: ${name}`],
            sourceReferences: [{ docTitle: primaryDoc, location: currentModule }],
          });
        }
      }
    }
  }

  // Ensure at least core features exist if document had little structured text
  if (candidateFeatures.length === 0) {
    candidateFeatures.push(
      {
        name: 'Project Foundation & Database Schema',
        description: `Set up data models and core infrastructure for ${project.name}`,
        module: 'Core Architecture',
        suggestedPriority: TicketPriority.CRITICAL,
        dependencies: [],
        relatedRequirements: ['Schema & Migrations'],
        sourceReferences: [{ docTitle: 'Project Setup', location: 'System Config' }],
      },
      {
        name: 'API Service & Controller Endpoints',
        description: `Implement RESTful endpoints and business rules specified for ${project.name}`,
        module: 'Backend Services',
        suggestedPriority: TicketPriority.HIGH,
        dependencies: ['Project Foundation & Database Schema'],
        relatedRequirements: ['API Endpoints'],
        sourceReferences: [{ docTitle: 'Project Setup', location: 'Endpoints' }],
      },
      {
        name: 'Client Interface & Interactive Workflows',
        description: `Develop intuitive user dashboard and workflows for ${project.targetUsers || 'end users'}`,
        module: 'Frontend Application',
        suggestedPriority: TicketPriority.MEDIUM,
        dependencies: ['API Service & Controller Endpoints'],
        relatedRequirements: ['UI/UX Workflows'],
        sourceReferences: [{ docTitle: 'Project Setup', location: 'User Flows' }],
      }
    );
  }

  // Identify open questions if information is missing
  if (!project.targetUsers) {
    openQuestions.push({
      question: 'Who are the primary user personas and permissions required for this application?',
      category: 'Target Audience',
      impact: 'Determines authentication roles and UI dashboard granularity',
    });
  }
  if (!project.techStack) {
    openQuestions.push({
      question: 'What is the approved production technology stack and third-party hosting environment?',
      category: 'Technical Architecture',
      impact: 'Affects deployment pipeline and framework choices',
    });
  }
  if (!project.targetReleaseDate) {
    openQuestions.push({
      question: 'What is the targeted milestone or release schedule for MVP delivery?',
      category: 'Milestones & Release',
      impact: 'Guides sprint prioritization and feature scoping',
    });
  }

  return {
    overview:
      project.description ||
      `Project ${project.name} is designed to deliver reliable software solutions with structured modules and iterative delivery.`,
    functionalRequirements: candidateFeatures.slice(0, 10).map((f) => ({
      title: f.name,
      description: f.description,
      module: f.module,
      priority: f.suggestedPriority,
      source: f.sourceReferences?.[0]?.docTitle || 'Requirements Spec',
    })),
    nonFunctionalRequirements: [
      {
        category: 'Performance',
        description: 'Sub-200ms API response latency and optimized database queries',
        source: 'Engineering Standards',
      },
      {
        category: 'Security',
        description: 'Role-based access control and encrypted token session management',
        source: 'Engineering Standards',
      },
      {
        category: 'Reliability',
        description: 'Zero data loss with ACID database transactions and automated backups',
        source: 'Engineering Standards',
      },
    ],
    businessRules: [
      {
        rule: 'Incremental Feature Approval',
        details: 'Features must be approved by the PM before tickets enter active sprints',
        source: 'Delivery Workflow',
      },
    ],
    technicalRequirements: [
      {
        area: 'Stack & Environment',
        details: project.techStack || 'Next.js, TypeScript, PostgreSQL with pgvector, Node.js',
        source: 'Tech Constraints',
      },
    ],
    features: candidateFeatures.slice(0, 15),
    milestones: project.targetReleaseDate
      ? [
          {
            name: 'Target Release Milestone',
            targetDate: project.targetReleaseDate,
            isConfirmed: true,
            details: 'Planned release date specified in project profile',
          },
        ]
      : [
          {
            name: 'Milestone 1: Core Foundation & MVP',
            sequenceOrder: 1,
            isConfirmed: false,
            details: 'Suggested initial delivery phase for core architectural modules',
          },
          {
            name: 'Milestone 2: Feature Expansion & Integrations',
            sequenceOrder: 2,
            isConfirmed: false,
            details: 'Suggested second phase incorporating extended workflows',
          },
        ],
    openQuestions,
  };
}

/**
 * Orchestrates full project analysis using LLM or rule-based parser
 */
export async function analyzeProjectContext(projectId: string): Promise<AnalysisOutput> {
  // 1. Load project details
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) throw new Error('Project not found');

  // 2. Load successfully processed documents & chunks
  const documents = await prisma.projectDocument.findMany({
    where: { projectId, status: 'COMPLETED' },
    include: {
      chunks: {
        orderBy: { order: 'asc' },
        take: 40,
      },
    },
  });

  const documentsText: Array<{ filename: string; text: string; location?: string }> = [];
  for (const doc of documents) {
    if (doc.chunks && doc.chunks.length > 0) {
      for (const ch of doc.chunks) {
        documentsText.push({
          filename: doc.filename,
          text: ch.chunkText,
          location: ch.location || ch.sourceHeading || undefined,
        });
      }
    } else if (doc.extractedText) {
      documentsText.push({
        filename: doc.filename,
        text: doc.extractedText.slice(0, 8000),
        location: 'Overview',
      });
    }
  }

  // 3. Prepare Prompt
  const contextSummary = `
PROJECT NAME: ${project.name}
DESCRIPTION: ${project.description || 'N/A'}
GOALS: ${project.goals || 'N/A'}
TARGET USERS: ${project.targetUsers || 'N/A'}
TECH STACK: ${project.techStack || 'N/A'}
BUSINESS REQUIREMENTS: ${project.businessRequirements || 'N/A'}
TECHNICAL CONSTRAINTS: ${project.technicalConstraints || 'N/A'}
KNOWN DEPENDENCIES: ${project.knownDependencies || 'N/A'}
TARGET RELEASE DATE: ${project.targetReleaseDate || 'N/A'}
ADDITIONAL NOTES: ${project.additionalNotes || 'N/A'}

PROCESSED DOCUMENTS (${documents.length}):
${documentsText.map((d, i) => `[Source ${i + 1}: ${d.filename} | ${d.location || 'General'}]\n${d.text}`).join('\n\n---\n\n')}
`;

  const systemPrompt = `You are a Senior Technical Project Manager and Systems Architect.
Analyze the provided project information and uploaded document excerpts.
You must return valid JSON matching the following schema without markdown formatting:
{
  "overview": "Comprehensive summary of project purpose, target audience, and intended outcomes",
  "functionalRequirements": [
    { "title": "string", "description": "string", "module": "string", "priority": "High" | "Medium" | "Low", "source": "string" }
  ],
  "nonFunctionalRequirements": [
    { "category": "Performance" | "Security" | "Reliability" | "Scalability" | "Accessibility", "description": "string", "source": "string" }
  ],
  "businessRules": [
    { "rule": "string", "details": "string", "source": "string" }
  ],
  "technicalRequirements": [
    { "area": "string", "details": "string", "source": "string" }
  ],
  "features": [
    {
      "name": "string (Clear feature name)",
      "description": "string (Detailed scope of the feature)",
      "module": "string (Module/Subsystem grouping)",
      "businessValue": "string",
      "suggestedPriority": "Critical" | "High" | "Medium" | "Low",
      "dependencies": ["string (names of other prerequisite features)"],
      "relatedRequirements": ["string"],
      "constraints": "string",
      "sourceReferences": [{ "docTitle": "string", "location": "string" }]
    }
  ],
  "milestones": [
    { "name": "string", "targetDate": "string", "sequenceOrder": 1, "isConfirmed": boolean, "details": "string" }
  ],
  "openQuestions": [
    { "question": "string", "category": "string", "impact": "string" }
  ]
}

CRITICAL RULES:
1. Do NOT invent false deadlines or unconfirmed commitments. Distinguish suggestions from confirmed dates.
2. Group proposed features into logical modules.
3. Identify genuine ambiguities and open questions that need the PM's resolution.
4. Provide source traceability references wherever documents are cited.
`;

  const userPrompt = `Analyze this project and extract all requirements, modules, features, milestones, and open questions:\n\n${contextSummary}`;

  // Call LLM
  const llmResult = await callLlmJson(systemPrompt, userPrompt);
  if (llmResult && Array.isArray(llmResult.features) && llmResult.features.length > 0) {
    return {
      overview: llmResult.overview || project.description || '',
      functionalRequirements: llmResult.functionalRequirements || [],
      nonFunctionalRequirements: llmResult.nonFunctionalRequirements || [],
      businessRules: llmResult.businessRules || [],
      technicalRequirements: llmResult.technicalRequirements || [],
      features: llmResult.features.map((f: any) => ({
        name: f.name || 'Feature',
        description: f.description || '',
        module: f.module || 'Core',
        businessValue: f.businessValue || '',
        suggestedPriority: (['Low', 'Medium', 'High', 'Critical'].includes(f.suggestedPriority)
          ? f.suggestedPriority
          : 'Medium') as TicketPriority,
        dependencies: Array.isArray(f.dependencies) ? f.dependencies : [],
        relatedRequirements: Array.isArray(f.relatedRequirements) ? f.relatedRequirements : [],
        constraints: f.constraints || '',
        sourceReferences: Array.isArray(f.sourceReferences) ? f.sourceReferences : [],
      })),
      milestones: Array.isArray(llmResult.milestones) ? llmResult.milestones : [],
      openQuestions: Array.isArray(llmResult.openQuestions) ? llmResult.openQuestions : [],
    };
  }

  // Fallback to rule-based analysis
  return extractRuleBasedAnalysis({
    project: project as any,
    documentsText,
  });
}

/**
 * Incremental ticket generation for a single selected roadmap feature
 */
export async function generateTicketsForSelectedFeature(
  featureId: string
): Promise<Array<{
  title: string;
  description: string;
  acceptanceCriteria: Array<{ id: string; text: string; completed: boolean }>;
  technicalNotes: string;
  priority: TicketPriority;
  type: 'Feature' | 'Task' | 'Bug' | 'Improvement';
  storyPoints: number;
  prChecklist: Array<{ id: string; text: string; completed: boolean }>;
}>> {
  const feature = await prisma.projectFeature.findUnique({
    where: { id: featureId },
    include: { project: true },
  });

  if (!feature) throw new Error('Feature not found');

  const systemPrompt = `You are a Principal Software Engineer.
Given a specific roadmap feature, break it down into 2 to 4 developer-ready implementation tickets.
Return JSON with the key "tickets":
{
  "tickets": [
    {
      "title": "Clear action-oriented title",
      "description": "What needs to be built and why",
      "type": "Feature" | "Task" | "Improvement" | "Bug",
      "priority": "High" | "Medium" | "Low" | "Critical",
      "storyPoints": 1 | 2 | 3 | 5 | 8,
      "acceptanceCriteria": ["Criteria 1", "Criteria 2", "Criteria 3"],
      "technicalNotes": "Implementation suggestions, database considerations, APIs",
      "prChecklist": ["Unit tests added", "Integration verified", "Documentation updated"]
    }
  ]
}`;

  const userPrompt = `FEATURE NAME: ${feature.name}
MODULE: ${feature.module}
DESCRIPTION: ${feature.description}
BUSINESS VALUE: ${feature.businessValue || 'N/A'}
CONSTRAINTS: ${feature.constraints || 'N/A'}
PROJECT TECH STACK: ${feature.project.techStack || 'TypeScript, PostgreSQL, Node.js'}
`;

  const normalizeTicketPriority = (val?: string | null): TicketPriority => {
    if (!val) return TicketPriority.MEDIUM;
    const u = String(val).toUpperCase();
    if (u === 'LOW') return TicketPriority.LOW;
    if (u === 'HIGH') return TicketPriority.HIGH;
    if (u === 'CRITICAL') return TicketPriority.CRITICAL;
    return TicketPriority.MEDIUM;
  };

  const defaultPriority = normalizeTicketPriority(feature.suggestedPriority);

  const llmResult = await callLlmJson(systemPrompt, userPrompt);
  if (llmResult && Array.isArray(llmResult.tickets) && llmResult.tickets.length > 0) {
    return llmResult.tickets.map((t: any, idx: number) => ({
      title: t.title || `${feature.name} - Task ${idx + 1}`,
      description: t.description || feature.description,
      acceptanceCriteria: (Array.isArray(t.acceptanceCriteria) ? t.acceptanceCriteria : ['Verify functionality']).map(
        (c: string, cIdx: number) => ({ id: `ac-${cIdx + 1}`, text: c, completed: false })
      ),
      technicalNotes: t.technicalNotes || '',
      priority: (['Low', 'Medium', 'High', 'Critical'].includes(t.priority)
        ? t.priority
        : defaultPriority) as TicketPriority,
      type: (['Feature', 'Task', 'Bug', 'Improvement'].includes(t.type) ? t.type : 'Feature') as any,
      storyPoints: typeof t.storyPoints === 'number' ? t.storyPoints : 3,
      prChecklist: (Array.isArray(t.prChecklist) ? t.prChecklist : ['Unit tests pass', 'Code review approved']).map(
        (p: string, pIdx: number) => ({ id: `pr-${pIdx + 1}`, text: p, completed: false })
      ),
    }));
  }

  // Rule-based fallback if LLM is unavailable
  return [
    {
      title: `Implement Backend & Database for ${feature.name}`,
      description: `Create data models, schema migrations, and REST endpoints supporting ${feature.name}.`,
      acceptanceCriteria: [
        { id: 'ac-1', text: 'Schema migrations applied cleanly', completed: false },
        { id: 'ac-2', text: 'CRUD endpoints tested with input validation', completed: false },
        { id: 'ac-3', text: 'Authorization checks enforced', completed: false },
      ],
      technicalNotes: `Follow project stack: ${feature.project.techStack || 'PostgreSQL & Node.js'}. Ensure idempotency and error handling.`,
      priority: defaultPriority,
      type: 'Feature',
      storyPoints: 3,
      prChecklist: [
        { id: 'pr-1', text: 'API route tested with integration tests', completed: false },
        { id: 'pr-2', text: 'No breaking database migrations', completed: false },
      ],
    },
    {
      title: `Implement UI & Integration for ${feature.name}`,
      description: `Build user interface components, form validation, and integrate with backend endpoints for ${feature.name}.`,
      acceptanceCriteria: [
        { id: 'ac-1', text: 'Interactive UI matches design tokens and monochrome theme', completed: false },
        { id: 'ac-2', text: 'Client error states and loading skeletons implemented', completed: false },
        { id: 'ac-3', text: 'End-to-end user workflow validated', completed: false },
      ],
      technicalNotes: 'Use existing Radix UI primitives and React Hook Form validation.',
      priority: defaultPriority,
      type: 'Feature',
      storyPoints: 3,
      prChecklist: [
        { id: 'pr-1', text: 'Responsive on mobile and desktop', completed: false },
        { id: 'pr-2', text: 'Accessible keyboard navigation verified', completed: false },
      ],
    },
  ];
}

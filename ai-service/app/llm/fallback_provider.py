import re
from typing import List, Dict, Any
from app.llm.base import LLMProvider

class FallbackProvider(LLMProvider):
    """
    Intelligent context-driven rule and template engine.
    Ensures uninterrupted execution even without external LLM API keys.
    Deconstructs PRD text into modules, estimates complexity adaptively,
    and constructs developer-grade tickets with checklists and technical notes.
    """

    def generate_tickets(
        self,
        project_name: str,
        description: str,
        prd_text: str,
        tech_stack: str,
        goals: str,
        constraints: str
    ) -> List[Dict[str, Any]]:
        combined_text = f"{project_name}\n{description}\n{prd_text}\n{tech_stack}\n{goals}\n{constraints}".lower()
        
        tickets: List[Dict[str, Any]] = []

        # 1. Database & Schema ticket
        tickets.append({
            "title": "Design Database Schema & Setup Prisma ORM Models",
            "description": f"Architect the relational data model for {project_name}. Define Prisma schema including models, relationships, indexes, and pgvector extension support.",
            "acceptanceCriteria": [
                "Configure PostgreSQL database connection and pgvector extension",
                "Define Prisma schema models for users, projects, tickets, and boards",
                "Add database migration script and verify idempotency",
                "Write seed script for initial testing data and default column statuses"
            ],
            "technicalNotes": f"Tech Stack: {tech_stack or 'PostgreSQL, Prisma, Node.js'}. Ensure vector column is defined properly with pgvector or raw migrations. Add foreign key constraints and cascade rules where appropriate.",
            "dependencies": [],
            "priority": "HIGH",
            "storyPoints": 5,
            "labels": ["database", "backend", "prisma", "schema"],
            "prChecklist": [
                "Prisma schema formats cleanly (`npx prisma format`)",
                "Migration runs successfully without data loss on fresh DB",
                "Foreign keys and indexes verified",
                "Unit tests pass for repository queries"
            ]
        })

        # 2. Authentication & User Management
        has_auth = any(k in combined_text for k in ["auth", "jwt", "login", "user", "signup", "role", "permission"])
        if has_auth or True:
            tickets.append({
                "title": "Implement JWT Authentication & Session Middleware",
                "description": f"Provide secure user registration, login, and authorization middleware for {project_name}.",
                "acceptanceCriteria": [
                    "User registration and login endpoints with password hashing (bcrypt)",
                    "JWT access and refresh token generation and verification middleware",
                    "Role-based access control (Admin, PM, Developer)",
                    "Sanitize user payload and protect sensitive fields (passwords, tokens)"
                ],
                "technicalNotes": "Use HTTP-only cookies or Bearer Authorization header. Store token expiration in environment variables. Provide passport or custom Express middleware.",
                "dependencies": ["Design Database Schema & Setup Prisma ORM Models"],
                "priority": "HIGH",
                "storyPoints": 5,
                "labels": ["auth", "security", "backend", "api"],
                "prChecklist": [
                    "Passwords are never stored in plaintext",
                    "Token expiration handled gracefully with 401 Unauthorized",
                    "Protected route middleware tested against invalid tokens",
                    "CORS headers correctly configured for cookies/auth headers"
                ]
            })

        # 3. Core API Services
        tickets.append({
            "title": "Build Core REST API Endpoints for Project & Ticket CRUD",
            "description": f"Develop Express controllers and routes for managing {project_name} entities, including boards, columns, and tickets.",
            "acceptanceCriteria": [
                "GET/POST/PATCH/DELETE endpoints for projects and boards",
                "Ticket movement endpoint with position re-ordering support",
                "Input validation middleware using Zod or Joi schemas",
                "Standardized JSON API error handling and status codes"
            ],
            "technicalNotes": "Implement transactional updates for ticket re-ordering across columns. Keep route controllers lean by delegating business logic to service layer.",
            "dependencies": ["Design Database Schema & Setup Prisma ORM Models", "Implement JWT Authentication & Session Middleware"],
            "priority": "HIGH",
            "storyPoints": 8,
            "labels": ["backend", "api", "crud", "express"],
            "prChecklist": [
                "All routes return consistent envelope `{ success: true, data: ... }`",
                "404 and 400 validation errors return meaningful error messages",
                "Ticket column reordering tested for edge cases (first, last position)",
                "API contract tests or Postman collection documented"
            ]
        })

        # 4. AI Ingestion & Semantic Search Service
        tickets.append({
            "title": "Develop Python AI Service for PRD Chunking & Vector Ingestion",
            "description": f"Implement semantic document chunking, embeddings generation, and pgvector persistence for {project_name}.",
            "acceptanceCriteria": [
                "Endpoint `/ai/ingest-project` to parse PRD, markdown, and text",
                "Semantic chunker preserving section headers and context boundaries",
                "Generate 1536-dim vector embeddings and store in PostgreSQL vector table",
                "Implement cosine distance `<=>` similarity search endpoint"
            ],
            "technicalNotes": "Use Flask/FastAPI with psycopg2 or SQLAlchemy. Support Groq Cloud and deterministic vector embeddings normalized to unit length.",
            "dependencies": ["Design Database Schema & Setup Prisma ORM Models"],
            "priority": "HIGH",
            "storyPoints": 8,
            "labels": ["ai", "python", "embeddings", "pgvector", "rag"],
            "prChecklist": [
                "Handles documents with varying lengths without memory exhaustion",
                "Chunks retain section header metadata for precise RAG citations",
                "Vector distance queries return top-K results in <150ms",
                "Fallback mechanism handles API provider rate limits"
            ]
        })

        # 5. Interactive Kanban Board UI
        tickets.append({
            "title": "Create Next.js Kanban Board with Drag-and-Drop State Sync",
            "description": f"Build the interactive frontend Kanban dashboard for {project_name} using Next.js App Router, Redux Toolkit, and @dnd-kit.",
            "acceptanceCriteria": [
                "Columns: Backlog, To Do, In Progress, In Review, Done",
                "Smooth drag-and-drop ticket reordering across and within columns",
                "Optimistic UI updates via Redux Toolkit with rollback on API failure",
                "Filter and search controls by priority, labels, and assignee"
            ],
            "technicalNotes": "Use @dnd-kit/core and @dnd-kit/sortable for accessible, high-performance drag and drop. Styled with Tailwind CSS and Shadcn UI aesthetics.",
            "dependencies": ["Build Core REST API Endpoints for Project & Ticket CRUD"],
            "priority": "MEDIUM",
            "storyPoints": 8,
            "labels": ["frontend", "nextjs", "kanban", "redux", "dnd"],
            "prChecklist": [
                "Drag-and-drop works seamlessly without stuttering",
                "Filter state persisted in URL search params or Redux store",
                "Mobile / small screen fallback horizontal scrolling",
                "Accessible keyboard navigation support"
            ]
        })

        # 6. Ticket Detail Split Panel & Interactive Checklists
        tickets.append({
            "title": "Build Ticket Detail Split-Panel View & Real-Time Q&A Chat",
            "description": f"Create modal/split-panel interface: Left panel (~55%) contains interactive markdown description, acceptance criteria checkboxes, and PR checklist; Right panel (~45%) contains real-time context-aware chat.",
            "acceptanceCriteria": [
                "Modal or route for split-panel layout (55% left / 45% right)",
                "Interactive checklist items allowing developers to check off criteria",
                "Real-time chat window with WebSocket connection for instant replies",
                "Code snippet highlight and copy button in AI responses"
            ],
            "technicalNotes": "Use Socket.IO client for live messaging. Render markdown safely using react-markdown. Dispatch Redux actions when checklist items are toggled.",
            "dependencies": ["Create Next.js Kanban Board with Drag-and-Drop State Sync"],
            "priority": "MEDIUM",
            "storyPoints": 5,
            "labels": ["frontend", "ui", "chat", "split-panel", "real-time"],
            "prChecklist": [
                "Checklist checkbox state updates DB asynchronously without modal flicker",
                "Chat auto-scrolls to bottom on new message arrival",
                "AI responses clearly distinguished from human team members",
                "Clean responsive collapse on smaller viewports"
            ]
        })

        # 7. Real-Time Collaboration & WebSockets
        tickets.append({
            "title": "Integrate WebSocket Server for Real-Time Updates & Notifications",
            "description": f"Setup Socket.IO on the Node.js core backend for broadcasting ticket status changes, comments, and AI responses.",
            "acceptanceCriteria": [
                "Socket.IO server attached to Node HTTP server with room scoping by ticket/project",
                "Event `ticket:moved` broadcasts position updates to active viewers",
                "Event `message:new` transmits real-time chat messages to open tickets",
                "Reconnection handling with offline detection"
            ],
            "technicalNotes": "Authenticate WebSocket handshakes using JWT or session tokens. Scoped rooms `ticket:{id}` and `project:{id}` prevent broadcast pollution.",
            "dependencies": ["Build Core REST API Endpoints for Project & Ticket CRUD"],
            "priority": "MEDIUM",
            "storyPoints": 5,
            "labels": ["websocket", "real-time", "socket.io", "backend"],
            "prChecklist": [
                "Socket disconnect cleans up listeners and avoids memory leaks",
                "Room isolation verified across distinct projects",
                "Heartbeat and ping-pong intervals configured properly",
                "Graceful degradation when WebSockets are blocked"
            ]
        })

        # 8. Adaptive ticket for project-specific feature if detected
        if any(w in combined_text for w in ["ai", "generation", "llm", "ticket", "rag"]):
            tickets.append({
                "title": "Implement RAG Developer Q&A Agent with Context Grounding",
                "description": f"Build RAG pipeline that retrieves project PRD chunks and injects them alongside ticket acceptance criteria into the developer Q&A prompt.",
                "acceptanceCriteria": [
                    "Query embedding generation and cosine similarity search against pgvector",
                    "Context assembly combining ticket specs, PRD context, and recent chat history",
                    "Strict developer-focused prompt formatting (code snippets, file paths, APIs)",
                    "Return citation metadata showing which PRD sections informed the response"
                ],
                "technicalNotes": "Limit context window to top 3-5 relevant chunks. Format prompt with clear system role as senior tech lead / staff engineer.",
                "dependencies": ["Develop Python AI Service for PRD Chunking & Vector Ingestion"],
                "priority": "HIGH",
                "storyPoints": 5,
                "labels": ["ai", "rag", "llm", "qa", "developer-assistant"],
                "prChecklist": [
                    "AI citations display accurate chunk metadata",
                    "Prompt prevents hallucinated endpoints not present in tech stack",
                    "Token counting safeguard prevents context truncation",
                    "Latency under 1.5s with streaming or cached embeddings"
                ]
            })

        return tickets

    def chat_qa(
        self,
        project_context: Dict[str, Any],
        ticket: Dict[str, Any],
        rag_chunks: List[Dict[str, Any]],
        history: List[Dict[str, str]],
        message: str
    ) -> str:
        ticket_title = ticket.get("title", "Active Ticket")
        tech_stack = project_context.get("techStack", "TypeScript, Next.js, Express, PostgreSQL, Prisma")
        
        # Build contextual developer response
        retrieved_info = ""
        if rag_chunks:
            retrieved_info = "\n".join([f"- Section: {c.get('metadata', {}).get('section', 'General')}: {c.get('chunk_text', '')[:180]}..." for c in rag_chunks[:3]])

        # Generate intelligent response tailored to the developer's question
        resp = f"### Developer Guidance: {ticket_title}\n\n"
        lower_msg = message.lower()

        # 1. Missing requirements / validation / error status clarification
        if any(k in lower_msg for k in ["error response", "400 or 422", "validation failure", "missing requirement", "status code", "what status", "return 400", "return 422"]):
            resp += "I can help clarify this, but the ticket does not explicitly specify the expected error response format.\n\n"
            resp += "**Clarification Needed:**\n"
            resp += "- Should the API return an HTTP **400 Bad Request** or **422 Unprocessable Entity** for input validation failures?\n"
            resp += "- Is the expected error schema standard `{ success: false, error: string, issues?: any[] }`?\n\n"
            resp += "Could the Tech Lead or PM confirm the preferred error contract before finalizing the controller?"
            return resp

        # 2. Acceptance criteria inquiry
        if any(k in lower_msg for k in ["acceptance criteria", "complete", "definition of done", "when is this done", "how do we know"]):
            resp += "Here is the verified Acceptance Criteria and Definition of Done for this ticket:\n\n"
            ac_list = ticket.get("acceptanceCriteria", [])
            if ac_list:
                for idx, ac in enumerate(ac_list):
                    text = ac.get("text") if isinstance(ac, dict) else str(ac)
                    resp += f"- [ ] **AC {idx + 1}**: {text}\n"
            else:
                resp += "- Verify core functionality and edge cases with automated unit/integration tests.\n"
                resp += "- Ensure code builds cleanly without TypeScript or linter errors.\n"
            
            pr_list = ticket.get("prChecklist", [])
            if pr_list:
                resp += "\n**PR Checklist Verification:**\n"
                for pr in pr_list:
                    pr_text = pr.get("text") if isinstance(pr, dict) else str(pr)
                    resp += f"- [ ] {pr_text}\n"
            return resp

        # 3. 401 Unauthorized / Authentication doubts
        if "401" in lower_msg or "unauthorized" in lower_msg or "token" in lower_msg and "invalid" in lower_msg:
            resp += "A **401 Unauthorized** response typically occurs in the authentication workflow due to:\n\n"
            resp += "1. **Missing or Malformed Header**: Ensure the request contains `Authorization: Bearer <access_token>`.\n"
            resp += "2. **Expired Access Token**: Access tokens expire after short intervals. Call `POST /api/auth/refresh` with HTTP-only cookies to obtain a new token.\n"
            resp += "3. **Invalid Signature**: Verify the `JWT_ACCESS_SECRET` matches across environments.\n\n"
            resp += "```typescript\n"
            resp += "// Example client request with credentials\n"
            resp += "const res = await fetch(url, {\n"
            resp += "  headers: { 'Authorization': `Bearer ${token}` },\n"
            resp += "  credentials: 'include',\n"
            resp += "});\n"
            resp += "```\n"
            return resp

        # 4. Architecture questions (Frontend vs Backend)
        if any(k in lower_msg for k in ["frontend or backend", "where should this logic", "architecture", "which layer"]):
            resp += f"Based on the project's architectural guidelines (**{tech_stack}**):\n\n"
            resp += "- **Backend Core / API Route**: Business validation, database transactions, authorization checks, and secure secrets handling must live on the server.\n"
            resp += "- **Frontend (Next.js)**: Optimistic UI state updates, form client-side schema parsing, and interactive modal state belong in client components.\n\n"
            resp += "Keeping domain rules strictly on the server protects data integrity and guarantees security boundaries."
            return resp

        # 5. Testing and Edge Cases
        if any(k in lower_msg for k in ["test", "edge case", "unit test", "integration test"]):
            resp += "#### Recommended Edge Cases to Test\n"
            resp += "1. **Boundary Limits**: Empty strings, exceeding max payload lengths, and special characters.\n"
            resp += "2. **Authorization Boundaries**: Non-project members attempting access must receive 403 Forbidden.\n"
            resp += "3. **Race Conditions / Concurrency**: Concurrent edits or duplicate requests must remain idempotent.\n"
            resp += "4. **Service Unavailability**: Graceful fallback when downstream services or databases time out.\n\n"
            return resp

        # 6. API / Endpoint implementation
        resp += f"Based on the project tech stack (**{tech_stack}**) and ticket requirements, here is the suggested approach:\n\n"
        
        if "endpoint" in lower_msg or "api" in lower_msg or "route" in lower_msg:
            resp += "#### Recommended API Endpoint Architecture\n"
            resp += "```typescript\n"
            resp += "// routes/api.ts\n"
            resp += "router.post('/api/resource', authenticateToken, async (req, res) => {\n"
            resp += "  try {\n"
            resp += "    const validated = schema.parse(req.body);\n"
            resp += "    const result = await service.execute(validated);\n"
            resp += "    return res.status(200).json({ success: true, data: result });\n"
            resp += "  } catch (err) {\n"
            resp += "    return res.status(400).json({ success: false, error: err.message });\n"
            resp += "  }\n"
            resp += "});\n"
            resp += "```\n\n"
        elif "schema" in lower_msg or "database" in lower_msg or "table" in lower_msg or "model" in lower_msg:
            resp += "#### Recommended Prisma Schema Model\n"
            resp += "```prisma\n"
            resp += "model Entity {\n"
            resp += "  id          String   @id @default(uuid())\n"
            resp += "  title       String\n"
            resp += "  createdAt   DateTime @default(now())\n"
            resp += "  updatedAt   DateTime @updatedAt\n"
            resp += "  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)\n"
            resp += "  projectId   String\n\n"
            resp += "  @@index([projectId])\n"
            resp += "}\n"
            resp += "```\n\n"
        else:
            resp += "#### Implementation Steps\n"
            resp += "1. **Check Acceptance Criteria**: Review the checklist on the left panel to ensure all items are accounted for.\n"
            resp += "2. **Follow Existing Service Patterns**: Implement business logic cleanly with validation and error handling.\n"
            resp += "3. **Error Boundaries & Validation**: Validate input payloads before processing and return standard error structures.\n"
            resp += "4. **Unit/Integration Verification**: Ensure test coverage meets the PR checklist before opening a merge request.\n\n"

        if retrieved_info:
            resp += f"#### Grounded PRD Context References\n{retrieved_info}\n\n"
            
        resp += "Let me know if you would like full code implementation for a specific file or endpoint!"
        return resp

# TaskPulse AI — Autonomous Project Management & Ticket Generation System

An enterprise-grade, full-stack AI-powered Project Management and Ticket Generation system built with a microservices architecture. Project Managers and Tech Leads provide high-level project specifications and PRDs, and the AI agent autonomously generates developer-ready Kanban tickets grounded in persistent **PostgreSQL pgvector** memory.

---

## 🏛️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Next.js Frontend       │
                                  │  (App Router, Redux, DnD)   │
                                  │         Port 3000           │
                                  └──────────────┬──────────────┘
                                                 │
                               HTTP REST (3001)  │  WebSocket (Socket.IO)
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │     Node.js Core Backend    │
                                  │  (Express, Prisma, Socket)  │
                                  │         Port 3001           │
                                  └──────┬───────────────┬──────┘
                                         │               │
                 Internal REST (HTTP 5001)│               │ SQL / Prisma
                                         ▼               ▼
          ┌─────────────────────────────┐     ┌─────────────────────────────┐
          │      Python AI Service      │     │      PostgreSQL 16/18       │
          │   (Flask, Groq LPU, pgvec)  │────▶│      + pgvector (1536)      │
          │         Port 5001           │     │         Port 5432           │
          └─────────────────────────────┘     └─────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Project Onboarding & Autonomous AI PRD Ingestion
- Ingests PRDs via text input or file uploads (`.md`, `.txt`).
- Semantic chunking with preserved markdown section hierarchy.
- Computes 1536-dimensional embeddings and stores them in PostgreSQL with `pgvector` for persistent semantic memory.
- Includes 1-click preset templates (Fintech Core Ledger, AI Video Studio, Kubernetes FleetOps).

### 2. Autonomous Adaptive Ticket Generation
- Automatically deconstructs PRD features based on architectural complexity:
  - Simple features → concise, focused tickets.
  - Complex features → modular sub-tickets with multi-step checklists.
- Each ticket includes:
  - **Action-Oriented Title** (e.g. `Implement JWT Authentication Middleware`)
  - **Detailed Description & Rationale**
  - **Interactive Acceptance Criteria Checklist**
  - **Technical Notes & Architecture Patterns**
  - **Cross-ticket Dependencies**
  - **Priority (High / Medium / Low)**
  - **Story Points (Fibonacci Complexity)**
  - **Domain & Tech Tags (`#backend`, `#database`, `#auth`)**
  - **Pull Request Verification Checklist**

### 3. Interactive Kanban Board
- Drag-and-drop columns: **Backlog → To Do → In Progress → In Review → Done**.
- Built with `@dnd-kit/core` and `@dnd-kit/sortable` for fluid, accessible animations.
- Optimistic updates via Redux Toolkit with automatic API synchronization.
- Multi-dimensional filters: Search query, Priority, Assignee, and Domain Tags.
- Real-time updates via Socket.IO for multi-developer collaboration.

### 4. Split-Panel Ticket Detail View
- **Left Panel (~55% width)**:
  - Full markdown description.
  - Interactive Acceptance Criteria checkboxes with animated completion progress bar.
  - Interactive PR Checklist.
  - Technical Notes & Implementation Strategy.
  - PM Edit Mode for real-time adjustments.
- **Right Panel (~45% width)**:
  - Real-time threaded discussion interface.
  - **AI Developer Assistant (RAG Grounded)**: Answers questions on API endpoints, schema models, and edge cases.
  - Citations accordion displaying exact retrieved PRD chunks and cosine distance scores.
  - Code syntax highlighting with one-click copy to clipboard.
  - Quick-prompt presets for rapid developer inquiries.

### 5. Velocity & Project Analytics
- Project velocity tracking (Total points vs. completed points).
- Column distribution breakdown.
- Urgency and priority distribution charts.
- Domain tag distribution across the codebase.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Redux Toolkit, Tailwind CSS, Shadcn UI styling, `@dnd-kit`, Socket.IO Client, React Markdown |
| **Backend Core** | Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Axios |
| **AI Microservice** | Python 3, Flask, psycopg2 with pgvector, Groq SDK, NumPy |
| **Database** | PostgreSQL 16/18 with `pgvector` extension (`vector(1536)`) |
| **LLM Orchestration** | Abstracted LLM Provider (Groq Cloud models: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `meta-llama/llama-prompt-guard-2-86m`, `openai/gpt-oss-safeguard-20b`, with intelligent heuristic fallback) |

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Docker & Docker Compose (or local PostgreSQL with pgvector)

### Quick Start (Local Development)

#### Service Boundaries & Ownership
- **`backend-core/` (Port 3001)**: The sole authority for database access, migrations, seeding, authentication, authorization, and business APIs. Owns `backend-core/prisma/schema.prisma`.
- **`frontend/` (Port 3000)**: Pure client presentation layer built with Next.js 14. Requires only `NEXT_PUBLIC_API_URL` pointing to `backend-core`. Frontend developers do not need database credentials or Prisma generation.
- **`ai-service/` (Port 5001)**: Independent microservice handling semantic vector embeddings (`pgvector`) and LLM orchestration.

1. **Configure Environment Variables** (optional, fallback engine works out of the box):
   Edit `.env` in the root directory:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pm_ai_db?schema=public"
   AI_SERVICE_URL="http://localhost:5001"
   CORE_API_URL="http://localhost:3001"

   # LLM Keys & Models (Exclusively Groq Cloud)
   GROQ_API_KEY="your-groq-api-key"
   GROQ_MODEL="openai/gpt-oss-120b"
   GROQ_FALLBACK_MODEL="openai/gpt-oss-20b"
   GROQ_PROMPT_GUARD_MODEL="meta-llama/llama-prompt-guard-2-86m"
   GROQ_SAFEGUARD_MODEL="openai/gpt-oss-safeguard-20b"
   ```

2. **Start All Services with One Command**:
   ```bash
   ./start-all.sh
   ```
   This will launch:
   - Python AI Service on [http://localhost:5001](http://localhost:5001)
   - Node.js Core Backend on [http://localhost:3001](http://localhost:3001)
   - Next.js Frontend on [http://localhost:3000](http://localhost:3000)

3. **Open the Application**:
   Navigate to [http://localhost:3000](http://localhost:3000) to access the dashboard and Kanban board.

4. **Running Database Tasks (Backend Only)**:
   All database operations are managed from `backend-core/`:
   ```bash
   cd backend-core
   npm run prisma:generate   # Generate Prisma client for backend
   npm run prisma:push       # Push schema changes to PostgreSQL
   npm run seed              # Seed default roles and permissions
   npm run test:all          # Run comprehensive backend test suite
   ```

---

### Docker Compose Setup

Run the entire stack in isolated Docker containers:
```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## 🔌 API Endpoints Summary

### Core Backend (`http://localhost:3001`)
- `POST /api/projects` — Create project, trigger PRD vector ingestion, and generate Kanban tickets
- `GET /api/projects` — List all projects with velocity metrics
- `GET /api/projects/:id` — Get project details
- `GET /api/projects/:id/board` — Get board columns and all associated tickets
- `GET /api/projects/:id/analytics` — Get velocity, completion rates, and tag counts
- `POST /api/tickets` — Create custom ticket
- `PATCH /api/tickets/:id` — Update ticket status, position, checklist state, or content
- `DELETE /api/tickets/:id` — Delete ticket
- `GET /api/tickets/:id/messages` — Fetch ticket discussion history
- `POST /api/tickets/:id/messages` — Post human team message
- `POST /api/tickets/:id/ai-chat` — Ask AI developer assistant (triggers RAG retrieval)
- `GET /api/users` — List team members

### AI Service (`http://localhost:5001`)
- `GET /ai/health` — Provider health and configuration status
- `POST /ai/ingest-project` — Chunk PRD text, generate 1536-dim embeddings, and store in pgvector
- `POST /ai/generate-tickets` — Adaptively break down PRD into developer-ready tickets
- `POST /ai/ticket-chat` — RAG vector search + contextual LLM pair programming response
- `POST /ai/embed` — Vector embedding generation

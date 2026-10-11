import json
import re
from typing import List, Dict, Any
from groq import Groq
from app.config import Config
from app.llm.base import LLMProvider

class GroqProvider(LLMProvider):
    def __init__(self):
        if not Config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not configured")
        self.client = Groq(api_key=Config.GROQ_API_KEY)
        self.model = Config.GROQ_MODEL

    def generate_tickets(
        self,
        project_name: str,
        description: str,
        prd_text: str,
        tech_stack: str,
        goals: str,
        constraints: str
    ) -> List[Dict[str, Any]]:
        system_prompt = """You are an expert Staff Software Engineer and Technical Project Manager.
Analyze the user's project details, PRD, and technical constraints. Autonomously generate a comprehensive, developer-ready set of Kanban tickets.

Ticket Granularity Rule:
- Adapt granularity based on feature complexity. Simple features get concise tickets. Complex features are broken down into multiple sub-tickets.
- Cover all layers: Architecture/DB, Auth/Security, Backend Services, Frontend UI/Kanban, Real-time/Integrations, Testing/Deployment.

You MUST respond strictly with a valid JSON array of ticket objects. Do NOT wrap in markdown explanation.
Each ticket object MUST have these exact fields:
- "title": string (Clear, action-oriented, e.g., "Implement JWT Authentication Middleware")
- "description": string (Detailed explanation of what needs to be built and why)
- "acceptanceCriteria": array of strings (Checklist of what 'done' looks like)
- "technicalNotes": string (Suggested approach, relevant files, APIs, patterns, edge cases)
- "dependencies": array of strings (Titles of tickets this depends on)
- "priority": string (Strictly one of: "HIGH", "MEDIUM", "LOW")
- "storyPoints": integer (Fibonacci estimate: 1, 2, 3, 5, 8, 13)
- "labels": array of strings (e.g., ["backend", "auth", "database", "api"])
- "prChecklist": array of strings (What developer must verify before submitting PR)
"""

        user_content = f"""PROJECT NAME: {project_name}
DESCRIPTION: {description}
TECH STACK: {tech_stack}
GOALS: {goals}
CONSTRAINTS: {constraints}

PRD / FEATURE SPECIFICATION:
{prd_text}
"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.2,
            response_format={"type": "json_object"} if "llama-3" in self.model.lower() else None
        )

        content = response.choices[0].message.content or ""
        
        # Parse JSON
        try:
            parsed = json.loads(content)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict):
                for k in ["tickets", "items", "data", "result"]:
                    if k in parsed and isinstance(parsed[k], list):
                        return parsed[k]
                return [parsed]
        except Exception:
            match = re.search(r'\[.*\]', content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise ValueError("Failed to parse tickets JSON from Groq response")

    def chat_qa(
        self,
        project_context: Dict[str, Any],
        ticket: Dict[str, Any],
        rag_chunks: List[Dict[str, Any]],
        history: List[Dict[str, str]],
        message: str
    ) -> str:
        system_prompt = """You are a Staff Software Engineer acting as a dedicated AI Pair Programmer and Technical Advisor for the developer working on this ticket.
You have full context of the ticket requirements, acceptance criteria, technical stack, and retrieved PRD chunks.

Guidelines:
- Provide concrete, developer-friendly answers.
- Include specific code snippets, file path suggestions, schema definitions, and API contracts where relevant.
- Ground your answer in the project's actual tech stack and PRD guidelines.
- Point out any edge cases, security implications, or testing tips.
- Format beautifully with markdown code blocks and lists.
"""

        rag_context = "\n\n".join([
            f"--- PRD Context Chunk ({c.get('metadata', {}).get('section', 'General')}) ---\n{c.get('chunk_text', '')}"
            for c in rag_chunks
        ])

        ticket_context = f"""TICKET TITLE: {ticket.get('title')}
DESCRIPTION: {ticket.get('description')}
ACCEPTANCE CRITERIA: {json.dumps(ticket.get('acceptanceCriteria', []))}
TECHNICAL NOTES: {ticket.get('technicalNotes', '')}
PRIORITY: {ticket.get('priority')} | STORY POINTS: {ticket.get('storyPoints')}
LABELS: {json.dumps(ticket.get('labels', []))}
PROJECT TECH STACK: {project_context.get('techStack', 'Not specified')}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"GROUNDING KNOWLEDGE BASE:\n{rag_context}\n\nACTIVE TICKET CONTEXT:\n{ticket_context}"}
        ]

        for h in history[-6:]:
            role = "assistant" if h.get("senderType") == "ai" else "user"
            messages.append({"role": role, "content": h.get("content", "")})

        messages.append({"role": "user", "content": message})

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.3
        )
        return resp.choices[0].message.content or "No response generated"

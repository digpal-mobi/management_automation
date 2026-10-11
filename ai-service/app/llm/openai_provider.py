import json
import re
from typing import List, Dict, Any
from openai import OpenAI
from app.config import Config
from app.llm.base import LLMProvider

class OpenAIProvider(LLMProvider):
    def __init__(self):
        if not Config.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.model = Config.OPENAI_MODEL

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

Respond strictly with a JSON object containing a `tickets` array where each ticket has:
- title: string
- description: string
- acceptanceCriteria: array of strings
- technicalNotes: string
- dependencies: array of strings
- priority: 'HIGH' | 'MEDIUM' | 'LOW'
- storyPoints: integer (1, 2, 3, 5, 8, 13)
- labels: array of strings
- prChecklist: array of strings
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
            response_format={"type": "json_object"},
            temperature=0.2
        )

        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        if "tickets" in parsed and isinstance(parsed["tickets"], list):
            return parsed["tickets"]
        if isinstance(parsed, list):
            return parsed
        return [parsed]

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

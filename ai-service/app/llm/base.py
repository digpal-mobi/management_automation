from abc import ABC, abstractmethod
from typing import List, Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    def generate_tickets(
        self,
        project_name: str,
        description: str,
        prd_text: str,
        tech_stack: str,
        goals: str,
        constraints: str
    ) -> List[Dict[str, Any]]:
        """
        Generates developer-ready tickets from project context.
        Each ticket must have:
        - title: str
        - description: str
        - acceptanceCriteria: list[str]
        - technicalNotes: str
        - dependencies: list[str]
        - priority: 'HIGH' | 'MEDIUM' | 'LOW'
        - storyPoints: int (1, 2, 3, 5, 8, 13)
        - labels: list[str]
        - prChecklist: list[str]
        """
        pass

    @abstractmethod
    def chat_qa(
        self,
        project_context: Dict[str, Any],
        ticket: Dict[str, Any],
        rag_chunks: List[Dict[str, Any]],
        history: List[Dict[str, str]],
        message: str
    ) -> str:
        """
        Context-aware Q&A response for developer working on the ticket.
        """
        pass

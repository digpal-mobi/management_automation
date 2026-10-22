import logging
import re
from typing import List, Dict, Any, Optional
from app.embeddings.embedder import get_embedding
from app.db import search_project_chunks
from app.llm import orchestrator

logger = logging.getLogger(__name__)

# Common acknowledgments that should NOT trigger a noisy reply
ACKNOWLEDGMENT_PATTERNS = [
    r"^\s*(thanks|thank\s+you|thx|ty)\s*[\.!]*\s*$",
    r"^\s*(got\s+it|understood|noted|noted\s+with\s+thanks)\s*[\.!]*\s*$",
    r"^\s*(looks\s+good|lgtm|looks\s+great|sounds\s+good)\s*[\.!]*\s*$",
    r"^\s*(okay|ok|k|kk|cool|nice|done|will\s+do|acknowledged|perfect)\s*[\.!]*\s*$",
    r"^\s*(thanks|thank\s+you)[,\s]+(all|team|folks|everyone|bro|mate)?\s*[\.!]*\s*$",
    r"^\s*(ok|okay)[,\s]+(thanks|thank\s+you|got\s+it)\s*[\.!]*\s*$",
]

def is_acknowledgment_comment(text: str) -> bool:
    """
    Determines if a comment is purely an acknowledgment (e.g. 'Thanks!', 'Got it')
    without any question, doubt, bug report, or request for clarification.
    """
    clean_text = text.strip().lower()
    if not clean_text:
        return True

    # If it contains a question mark, it's not a pure acknowledgment
    if "?" in clean_text:
        return False

    # Check against known acknowledgment regexes
    for pattern in ACKNOWLEDGMENT_PATTERNS:
        if re.match(pattern, clean_text, re.IGNORECASE):
            return True

    # Short phrases check (<= 3 words of mere affirmation)
    words = clean_text.split()
    ack_words = {"thanks", "thank", "you", "got", "it", "noted", "ok", "okay", "lgtm", "cool", "done", "perfect", "good", "great", "sure", "will", "do", "acknowledged"}
    if len(words) <= 3 and all(w.strip(".,!?:;") in ack_words for w in words):
        return True

    return False

def analyze_and_respond_to_ticket_comment(
    project_id: str,
    project_context: Dict[str, Any],
    ticket: Dict[str, Any],
    history: List[Dict[str, Any]],
    comment_text: str,
    related_tickets: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Analyzes a human comment on a ticket and generates a context-grounded AI response.
    Returns:
    {
        "should_respond": bool,
        "reason": str,
        "response": str,
        "provider": str,
        "citations": list
    }
    """
    # 1. Filter pure acknowledgments
    if is_acknowledgment_comment(comment_text):
        logger.info(f"Comment '{comment_text[:40]}' classified as acknowledgment; skipping AI response.")
        return {
            "should_respond": False,
            "reason": "acknowledgment",
            "response": "",
            "provider": "filter",
            "citations": []
        }

    # 2. Retrieve grounded PRD / knowledge chunks using embeddings if available
    rag_chunks = []
    try:
        query_vector = get_embedding(comment_text)
        rag_chunks = search_project_chunks(project_id, query_vector, limit=5)
    except Exception as e:
        logger.warning(f"RAG vector search skipped or failed: {e}")

    # 3. Format citations for UI transparency
    citations = []
    for chunk in rag_chunks:
        meta = chunk.get("metadata", {})
        citations.append({
            "section": meta.get("section", "Knowledge Base"),
            "snippet": chunk.get("chunk_text", "")[:200] + "...",
            "distance": round(float(chunk.get("distance", 0.0)), 4)
        })

    # 4. Enhance ticket context with related tickets if available
    enriched_ticket = dict(ticket)
    if related_tickets:
        enriched_ticket["relatedTickets"] = [
            {"title": rt.get("title"), "status": rt.get("status"), "priority": rt.get("priority")}
            for rt in related_tickets[:5]
        ]

    # 5. Call LLM orchestrator
    try:
        answer, provider = orchestrator.chat_qa(
            project_context=project_context,
            ticket=enriched_ticket,
            rag_chunks=rag_chunks,
            history=history,
            message=comment_text
        )

        return {
            "should_respond": True,
            "reason": "substantive_inquiry",
            "response": answer,
            "provider": provider,
            "citations": citations
        }
    except Exception as e:
        logger.error(f"Error in analyze_and_respond_to_ticket_comment: {e}")
        raise e

from typing import List, Dict, Any
from app.embeddings.embedder import get_embedding
from app.db import search_project_chunks
from app.llm import orchestrator

def answer_ticket_question(
    project_id: str,
    project_context: Dict[str, Any],
    ticket: Dict[str, Any],
    history: List[Dict[str, str]],
    message: str
) -> Dict[str, Any]:
    # 1. Embed developer query
    query_vector = get_embedding(message)
    
    # 2. Retrieve top-5 relevant chunks from pgvector
    rag_chunks = []
    try:
        rag_chunks = search_project_chunks(project_id, query_vector, limit=5)
    except Exception as e:
        print(f"[Warning] RAG vector search failed: {e}")

    # 3. Ask LLM Orchestrator
    answer, provider = orchestrator.chat_qa(
        project_context=project_context,
        ticket=ticket,
        rag_chunks=rag_chunks,
        history=history,
        message=message
    )

    # Format referenced chunks for UI transparency
    citations = []
    for chunk in rag_chunks:
        meta = chunk.get("metadata", {})
        citations.append({
            "section": meta.get("section", "General"),
            "snippet": chunk.get("chunk_text", "")[:200] + "...",
            "distance": round(float(chunk.get("distance", 0.0)), 4)
        })

    return {
        "success": True,
        "response": answer,
        "provider": provider,
        "citations": citations
    }

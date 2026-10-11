import re
from typing import List, Dict, Any
from app.embeddings.embedder import get_embedding
from app.db import clear_project_embeddings, insert_project_chunks

def chunk_markdown_prd(prd_text: str, project_name: str, tech_stack: str) -> List[Dict[str, Any]]:
    """
    Intelligently chunks PRD documents by section headers (##, ###)
    or logical paragraphs, preserving section hierarchy and context.
    """
    chunks = []
    
    # Header-based splitting
    header_pattern = re.compile(r'^(#{1,4}\s+.+)$', re.MULTILINE)
    parts = header_pattern.split(prd_text)
    
    current_section = "Overview"
    
    if len(parts) <= 1:
        # Fallback to paragraph splitting if no markdown headers
        paragraphs = [p.strip() for p in prd_text.split("\n\n") if len(p.strip()) > 30]
        if not paragraphs:
            paragraphs = [prd_text.strip() or "Empty project description"]
            
        for i, para in enumerate(paragraphs):
            chunks.append({
                "chunk_text": f"Project: {project_name} | Tech Stack: {tech_stack}\n{para}",
                "metadata": {
                    "section": f"Section {i+1}",
                    "chunk_index": i
                }
            })
        return chunks

    i = 0
    while i < len(parts):
        part = parts[i].strip()
        if not part:
            i += 1
            continue
            
        if header_pattern.match(part):
            current_section = part.replace("#", "").strip()
            # The next part contains the body
            if i + 1 < len(parts):
                body = parts[i + 1].strip()
                if body:
                    chunk_content = f"Project: {project_name} | Section: {current_section}\n{body}"
                    chunks.append({
                        "chunk_text": chunk_content,
                        "metadata": {
                            "section": current_section,
                            "chunk_index": len(chunks)
                        }
                    })
                i += 2
                continue
        else:
            chunks.append({
                "chunk_text": f"Project: {project_name} | Context: {part}",
                "metadata": {
                    "section": current_section,
                    "chunk_index": len(chunks)
                }
            })
        i += 1
        
    return chunks

def ingest_project_context(
    project_id: str,
    project_name: str,
    description: str,
    prd_text: str,
    tech_stack: str,
    goals: str = "",
    constraints: str = ""
) -> Dict[str, Any]:
    full_doc = f"""# {project_name}
## Overview & Goals
{description}
Goals: {goals}
Constraints: {constraints}
Tech Stack: {tech_stack}

## Specifications & PRD
{prd_text}
"""

    raw_chunks = chunk_markdown_prd(full_doc, project_name, tech_stack)
    
    prepared_chunks = []
    for chunk in raw_chunks:
        emb = get_embedding(chunk["chunk_text"])
        prepared_chunks.append({
            "chunk_text": chunk["chunk_text"],
            "embedding": emb,
            "metadata": chunk["metadata"]
        })
        
    # Atomically replace chunks in database
    clear_project_embeddings(project_id)
    insert_project_chunks(project_id, prepared_chunks)
    
    return {
        "success": True,
        "projectId": project_id,
        "chunksCount": len(prepared_chunks),
        "message": f"Successfully ingested {len(prepared_chunks)} semantic chunks into pgvector"
    }

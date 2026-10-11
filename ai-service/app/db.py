import json
import psycopg2
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from app.config import Config

def get_db_connection():
    conn = psycopg2.connect(Config.DATABASE_URL)
    register_vector(conn)
    return conn

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS project_embeddings (
                id SERIAL PRIMARY KEY,
                project_id VARCHAR(64) NOT NULL,
                chunk_text TEXT NOT NULL,
                embedding vector(1536) NOT NULL,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_project_embeddings_project_id 
            ON project_embeddings(project_id);
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS ticket_embeddings (
                id SERIAL PRIMARY KEY,
                ticket_id VARCHAR(64) NOT NULL,
                embedding vector(1536) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

def clear_project_embeddings(project_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM project_embeddings WHERE project_id = %s;", (project_id,))
        conn.commit()
    finally:
        cur.close()
        conn.close()

def insert_project_chunks(project_id: str, chunks_with_embeddings: list):
    """
    chunks_with_embeddings: list of dicts:
    [
        {"chunk_text": "...", "embedding": [0.1, ...], "metadata": {...}},
        ...
    ]
    """
    if not chunks_with_embeddings:
        return
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        for item in chunks_with_embeddings:
            # Format embedding array as vector string "[0.1, 0.2, ...]"
            emb_str = "[" + ",".join(str(x) for x in item["embedding"]) + "]"
            cur.execute("""
                INSERT INTO project_embeddings (project_id, chunk_text, embedding, metadata)
                VALUES (%s, %s, %s::vector, %s);
            """, (
                project_id,
                item["chunk_text"],
                emb_str,
                json.dumps(item.get("metadata", {}))
            ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

def search_project_chunks(project_id: str, query_embedding: list, limit: int = 5):
    """
    Cosine distance search using pgvector `<=>`
    Returns list of dicts with chunk_text, metadata, and distance.
    """
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        emb_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        cur.execute("""
            SELECT id, project_id, chunk_text, metadata, (embedding <=> %s::vector) AS distance
            FROM project_embeddings
            WHERE project_id = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
        """, (emb_str, project_id, emb_str, limit))
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        cur.close()
        conn.close()

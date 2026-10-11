import os
from dotenv import load_dotenv

load_dotenv()

raw_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/pm_ai_db")
# Strip Prisma specific query parameters like ?schema=public
clean_db_url = raw_db_url.split("?")[0] if "?" in raw_db_url else raw_db_url

class Config:
    PORT = int(os.getenv("AI_SERVICE_PORT", "5001"))
    DATABASE_URL = clean_db_url
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    
    # Preferred primary provider: groq, fallback: openai
    PRIMARY_PROVIDER = os.getenv("PRIMARY_PROVIDER", "groq")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
    OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    
    VECTOR_DIMENSION = 1536

import os
from dotenv import load_dotenv

load_dotenv()

raw_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/pm_ai_db")
# Strip Prisma specific query parameters like ?schema=public
clean_db_url = raw_db_url.split("?")[0] if "?" in raw_db_url else raw_db_url

class Config:
    PORT = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "5001")))
    DATABASE_URL = clean_db_url
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    
    # LLM Provider configuration: Exclusively Groq Cloud
    PRIMARY_PROVIDER = "groq"
    
    # Groq Cloud Models
    # Primary generative & reasoning model
    GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    # Secondary / fast fallback Groq generative model
    GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-20b")
    # Guardrail and safety models on Groq Cloud
    GROQ_PROMPT_GUARD_MODEL = os.getenv("GROQ_PROMPT_GUARD_MODEL", "meta-llama/llama-prompt-guard-2-86m")
    GROQ_SAFEGUARD_MODEL = os.getenv("GROQ_SAFEGUARD_MODEL", "openai/gpt-oss-safeguard-20b")
    
    VECTOR_DIMENSION = 1536

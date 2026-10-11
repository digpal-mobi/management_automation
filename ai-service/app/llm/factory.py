import logging
from app.config import Config
from app.llm.base import LLMProvider
from app.llm.groq_provider import GroqProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.fallback_provider import FallbackProvider

logger = logging.getLogger(__name__)

class LLMOrchestrator:
    def __init__(self):
        self.fallback = FallbackProvider()

    def get_provider(self) -> tuple[LLMProvider, str]:
        # Groq primary
        if Config.GROQ_API_KEY:
            try:
                return GroqProvider(), "groq"
            except Exception as e:
                logger.warning(f"Failed to initialize GroqProvider: {e}")
                
        # OpenAI fallback
        if Config.OPENAI_API_KEY:
            try:
                return OpenAIProvider(), "openai"
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAIProvider: {e}")
                
        # Heuristic fallback
        return self.fallback, "fallback"

    def generate_tickets(self, **kwargs):
        provider, name = self.get_provider()
        try:
            logger.info(f"Generating tickets using LLM provider: {name}")
            return provider.generate_tickets(**kwargs), name
        except Exception as e:
            logger.error(f"Error in {name} ticket generation: {e}. Falling back.")
            if name != "fallback":
                return self.fallback.generate_tickets(**kwargs), "fallback (after error)"
            raise e

    def chat_qa(self, **kwargs):
        provider, name = self.get_provider()
        try:
            logger.info(f"Chat QA using LLM provider: {name}")
            return provider.chat_qa(**kwargs), name
        except Exception as e:
            logger.error(f"Error in {name} chat QA: {e}. Falling back.")
            if name != "fallback":
                return self.fallback.chat_qa(**kwargs), "fallback (after error)"
            raise e

orchestrator = LLMOrchestrator()

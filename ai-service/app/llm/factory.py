import logging
from app.config import Config
from app.llm.base import LLMProvider
from app.llm.groq_provider import GroqProvider
from app.llm.fallback_provider import FallbackProvider

logger = logging.getLogger(__name__)

class LLMOrchestrator:
    def __init__(self):
        self.fallback = FallbackProvider()

    def get_provider(self, fallback_model: bool = False) -> tuple[LLMProvider, str]:
        # Exclusively Groq Cloud
        if Config.GROQ_API_KEY:
            target_model = Config.GROQ_FALLBACK_MODEL if fallback_model else Config.GROQ_MODEL
            try:
                provider_tag = "TaskPulse AI"
                return GroqProvider(model=target_model), provider_tag
            except Exception as e:
                logger.warning(f"Failed to initialize GroqProvider ({target_model}): {e}")
                
        # Heuristic fallback
        return self.fallback, "fallback"

    def generate_tickets(self, **kwargs):
        if Config.GROQ_API_KEY:
            # 1. Try Primary Groq Model
            try:
                provider, name = self.get_provider(fallback_model=False)
                logger.info(f"Generating tickets using LLM provider: {name}")
                return provider.generate_tickets(**kwargs), name
            except Exception as e:
                logger.warning(f"Primary Groq model error: {e}. Attempting secondary Groq model.")
                
            # 2. Try Fallback Groq Model if configured differently
            if Config.GROQ_FALLBACK_MODEL and Config.GROQ_FALLBACK_MODEL != Config.GROQ_MODEL:
                try:
                    provider, name = self.get_provider(fallback_model=True)
                    logger.info(f"Generating tickets using fallback Groq model: {name}")
                    return provider.generate_tickets(**kwargs), name
                except Exception as e:
                    logger.warning(f"Fallback Groq model error: {e}. Falling back to rule engine.")

        # 3. Intelligent Heuristic Fallback
        logger.info("Using intelligent heuristic fallback for ticket generation.")
        return self.fallback.generate_tickets(**kwargs), "fallback"

    def chat_qa(self, **kwargs):
        if Config.GROQ_API_KEY:
            # 1. Try Primary Groq Model
            try:
                provider, name = self.get_provider(fallback_model=False)
                logger.info(f"Chat QA using LLM provider: {name}")
                return provider.chat_qa(**kwargs), name
            except Exception as e:
                logger.warning(f"Primary Groq chat QA error: {e}. Attempting secondary Groq model.")
                
            # 2. Try Fallback Groq Model
            if Config.GROQ_FALLBACK_MODEL and Config.GROQ_FALLBACK_MODEL != Config.GROQ_MODEL:
                try:
                    provider, name = self.get_provider(fallback_model=True)
                    logger.info(f"Chat QA using fallback Groq model: {name}")
                    return provider.chat_qa(**kwargs), name
                except Exception as e:
                    logger.warning(f"Fallback Groq chat QA error: {e}. Falling back to rule engine.")

        # 3. Intelligent Heuristic Fallback
        logger.info("Using intelligent heuristic fallback for Chat QA.")
        return self.fallback.chat_qa(**kwargs), "fallback"

orchestrator = LLMOrchestrator()

import logging
from flask import Blueprint, request, jsonify
from app.config import Config
from app.db import init_db
from app.embeddings.embedder import get_embedding
from app.services.ingestion import ingest_project_context
from app.services.ticket_generator import generate_project_tickets
from app.services.rag_chat import answer_ticket_question

logger = logging.getLogger(__name__)
ai_bp = Blueprint("ai", __name__)

@ai_bp.route("/health", methods=["GET"])
def health_check():
    providers = []
    if Config.GROQ_API_KEY:
        providers.append("groq")
    if Config.OPENAI_API_KEY:
        providers.append("openai")
    providers.append("fallback")

    return jsonify({
        "status": "healthy",
        "service": "ai-service",
        "active_primary": Config.PRIMARY_PROVIDER,
        "available_providers": providers,
        "groq_configured": bool(Config.GROQ_API_KEY),
        "openai_configured": bool(Config.OPENAI_API_KEY)
    }), 200

@ai_bp.route("/ingest-project", methods=["POST"])
def ingest_project():
    data = request.get_json() or {}
    project_id = data.get("projectId")
    if not project_id:
        return jsonify({"error": "projectId is required"}), 400

    try:
        result = ingest_project_context(
            project_id=project_id,
            project_name=data.get("projectName", "Untitled Project"),
            description=data.get("description", ""),
            prd_text=data.get("prdText", ""),
            tech_stack=data.get("techStack", ""),
            goals=data.get("goals", ""),
            constraints=data.get("constraints", "")
        )
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Error in /ai/ingest-project")
        return jsonify({"error": str(e)}), 500

@ai_bp.route("/generate-tickets", methods=["POST"])
def generate_tickets():
    data = request.get_json() or {}
    project_name = data.get("projectName", "Project")
    
    try:
        result = generate_project_tickets(
            project_name=project_name,
            description=data.get("description", ""),
            prd_text=data.get("prdText", ""),
            tech_stack=data.get("techStack", ""),
            goals=data.get("goals", ""),
            constraints=data.get("constraints", "")
        )
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Error in /ai/generate-tickets")
        return jsonify({"error": str(e)}), 500

from app.services.ticket_discussion import analyze_and_respond_to_ticket_comment

@ai_bp.route("/ticket-discussion", methods=["POST"])
def ticket_discussion():
    data = request.get_json() or {}
    project_id = data.get("projectId")
    ticket = data.get("ticket", {})
    comment_text = data.get("comment", "") or data.get("message", "")
    history = data.get("history", [])
    project_context = data.get("project", {})
    related_tickets = data.get("relatedTickets", [])

    if not project_id or not comment_text:
        return jsonify({"error": "projectId and comment are required"}), 400

    try:
        result = analyze_and_respond_to_ticket_comment(
            project_id=project_id,
            project_context=project_context,
            ticket=ticket,
            history=history,
            comment_text=comment_text,
            related_tickets=related_tickets
        )
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Error in /ai/ticket-discussion")
        return jsonify({"error": str(e)}), 500

@ai_bp.route("/ticket-chat", methods=["POST"])
def ticket_chat():
    data = request.get_json() or {}
    project_id = data.get("projectId")
    ticket = data.get("ticket", {})
    message = data.get("message", "")
    history = data.get("history", [])
    project_context = data.get("project", {})

    if not project_id or not message:
        return jsonify({"error": "projectId and message are required"}), 400

    try:
        result = answer_ticket_question(
            project_id=project_id,
            project_context=project_context,
            ticket=ticket,
            history=history,
            message=message
        )
        return jsonify(result), 200
    except Exception as e:
        logger.exception("Error in /ai/ticket-chat")
        return jsonify({"error": str(e)}), 500

@ai_bp.route("/embed", methods=["POST"])
def embed_text():
    data = request.get_json() or {}
    text = data.get("text", "")
    try:
        emb = get_embedding(text)
        return jsonify({"embedding": emb, "dimension": len(emb)}), 200
    except Exception as e:
        logger.exception("Error in /ai/embed")
        return jsonify({"error": str(e)}), 500

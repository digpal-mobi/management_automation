import logging
from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.db import init_db
from app.routes import ai_bp

def create_app():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    app = Flask(__name__)
    CORS(app)

    # Initialize DB tables (creates vector extension and tables if not existing)
    try:
        init_db()
        logging.info("Initialized PostgreSQL pgvector database tables successfully")
    except Exception as e:
        logging.warning(f"Could not initialize DB on startup (will retry on requests): {e}")

    app.register_blueprint(ai_bp, url_prefix="/ai")

    return app

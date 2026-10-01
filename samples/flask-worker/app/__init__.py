from flask import Flask
from app.config import Config
from app.routes.api import api_bp
from app.routes.webhooks import webhooks_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(webhooks_bp, url_prefix='/webhooks')

    return app

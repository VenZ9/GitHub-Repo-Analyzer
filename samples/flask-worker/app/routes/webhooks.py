from flask import Blueprint, request, jsonify
from app.services.notification import NotificationService

webhooks_bp = Blueprint('webhooks', __name__)

@webhooks_bp.route('/github', methods=['POST'])
def github_event():
    event_type = request.headers.get('X-GitHub-Event', 'ping')
    payload = request.get_json()
    NotificationService.send_alert(f"GitHub Event received: {event_type}")
    return jsonify({"status": "received", "event": event_type}), 200

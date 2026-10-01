from flask import Blueprint, jsonify, request
from app.tasks.worker import process_heavy_computation
from app.models.job import JobModel

api_bp = Blueprint('api', __name__)

@api_bp.route('/jobs', methods=['POST'])
def submit_job():
    payload = request.get_json() or {}
    job_id = JobModel.create_job(payload)
    task = process_heavy_computation.delay(job_id, payload)
    return jsonify({"job_id": job_id, "task_id": task.id}), 202

@api_bp.route('/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    job = JobModel.find_by_id(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)

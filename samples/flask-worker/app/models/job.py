import time

class JobModel:
    _jobs = {}

    @classmethod
    def create_job(cls, payload):
        job_id = f"job_{int(time.time() * 1000)}"
        cls._jobs[job_id] = {
            "id": job_id,
            "status": "queued",
            "payload": payload
        }
        return job_id

    @classmethod
    def find_by_id(cls, job_id):
        return cls._jobs.get(job_id)

    @classmethod
    def update_status(cls, job_id, status):
        if job_id in cls._jobs:
            cls._jobs[job_id]["status"] = status

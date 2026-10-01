import time
from app.models.job import JobModel
from app.services.notification import NotificationService

class MockCeleryTask:
    def delay(self, *args, **kwargs):
        class Result:
            id = "celery_task_123"
        return Result()

process_heavy_computation = MockCeleryTask()

def execute_job(job_id, data):
    JobModel.update_status(job_id, 'processing')
    time.sleep(0.5)
    JobModel.update_status(job_id, 'completed')
    NotificationService.send_alert(f"Job {job_id} successfully processed")

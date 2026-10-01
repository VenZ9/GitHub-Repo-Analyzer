"""
Sample repository generator for Project DNA.
This script documents the structure of the four curated real codebases
bundled under samples/. It is provided for reference and regeneration.
"""

import os

SAMPLES = {
    'express-api': 'Production TypeScript Express API with JWT auth, user models, validation & logging',
    'fastapi-service': 'Async Python FastAPI microservice with vector embeddings, semantic search & Pydantic models',
    'react-redux': 'Frontend SPA showcasing unidirectional state flow, RTK query, slices & typed hooks',
    'flask-worker': 'Distributed task processing service with Webhook ingress, Job persistence & notification alerts'
}

def list_samples():
    base = os.path.dirname(os.path.abspath(__file__))
    for sample_id, description in SAMPLES.items():
        sample_dir = os.path.join(base, sample_id)
        file_count = sum(len(files) for _, _, files in os.walk(sample_dir))
        print(f"{sample_id}: {file_count} files - {description}")

if __name__ == '__main__':
    list_samples()

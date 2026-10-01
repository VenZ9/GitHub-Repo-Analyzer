import numpy as np
from app.core.config import settings

class EmbeddingService:
    def __init__(self):
        self.dim = settings.EMBEDDING_DIM

    def generate_embeddings(self, text: str) -> list:
        # Deterministic vector simulation for text
        np.random.seed(hash(text) % (2**32))
        vector = np.random.randn(self.dim).astype(float)
        norm = np.linalg.norm(vector)
        return (vector / norm).tolist()

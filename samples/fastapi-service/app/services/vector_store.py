import math
from typing import List, Dict, Any
from app.services.embedding_service import EmbeddingService
from app.models.document import DocumentResponse

class VectorStoreService:
    _storage: List[Dict[str, Any]] = []

    def __init__(self):
        self.embedder = EmbeddingService()

    def add_document(self, title: str, content: str) -> DocumentResponse:
        vec = self.embedder.generate_embeddings(content)
        doc_id = f"doc_{len(self._storage) + 1}"
        record = {
            "id": doc_id,
            "title": title,
            "content": content,
            "vector": vec
        }
        self._storage.append(record)
        return DocumentResponse(id=doc_id, title=title, content=content)

    def similarity_search(self, query_vec: list, top_k: int = 5):
        scored = []
        for r in self._storage:
            score = sum(a * b for a, b in zip(query_vec, r["vector"]))
            scored.append({"id": r["id"], "title": r["title"], "content": r["content"], "score": round(score, 4)})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    def get_all_documents(self):
        return [DocumentResponse(id=r["id"], title=r["title"], content=r["content"]) for r in self._storage]

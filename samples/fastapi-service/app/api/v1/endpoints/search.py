from fastapi import APIRouter, Query
from app.services.vector_store import VectorStoreService
from app.services.embedding_service import EmbeddingService

router = APIRouter()

@router.get("/")
def semantic_search(q: str = Query(..., description="Natural language search query")):
    embedder = EmbeddingService()
    store = VectorStoreService()
    query_vector = embedder.generate_embeddings(q)
    results = store.similarity_search(query_vector, top_k=5)
    return {"query": q, "results": results}

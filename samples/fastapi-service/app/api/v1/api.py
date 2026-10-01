from fastapi import APIRouter
from app.api.v1.endpoints import documents, search, health

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(search.router, prefix="/search", tags=["Semantic Search"])

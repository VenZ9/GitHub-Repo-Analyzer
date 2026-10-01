from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.document import DocumentCreate, DocumentResponse
from app.services.vector_store import VectorStoreService

router = APIRouter()

@router.post("/", response_model=DocumentResponse)
def index_document(doc: DocumentCreate):
    store = VectorStoreService()
    indexed = store.add_document(doc.title, doc.content)
    return indexed

@router.get("/", response_model=List[DocumentResponse])
def list_documents():
    store = VectorStoreService()
    return store.get_all_documents()

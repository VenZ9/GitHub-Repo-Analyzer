from pydantic import BaseModel
from typing import Optional

class DocumentCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"

class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str

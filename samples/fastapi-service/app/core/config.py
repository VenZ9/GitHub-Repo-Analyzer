from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FastAPI Vector Search Engine"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "fastapi-super-secret-key"
    EMBEDDING_DIM: int = 384
    INDEX_NAME: str = "knowledge-base"

settings = Settings()

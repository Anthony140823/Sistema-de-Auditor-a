from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ACCESS_TOKEN_NO_EXPIRE: bool = True
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:5174"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Application
    APP_NAME: str = "SAP SoD Audit System"
    
    # AI Integration
    GEMINI_API_KEY: str | None = None
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert comma-separated origins to list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
settings = Settings()

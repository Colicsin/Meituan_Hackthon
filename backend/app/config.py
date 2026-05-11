from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    deepseek_api_key: str = ""
    amap_api_key: str = ""
    use_llm_mock: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()

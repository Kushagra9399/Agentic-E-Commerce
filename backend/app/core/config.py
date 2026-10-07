from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str
    RAZORPAY_WEBHOOK_SECRET: str

    DATABASE_URL: str
    
    DEMO_PAYMENT_FAILURE: bool = False

    GROQ_API_KEY: str

    SERPAPI_KEY: str

    class Config:
        env_file=".env"
        extra="ignore"
        case_sensitive=False


settings = Settings()
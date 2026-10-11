from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.db.database import engine, Base
from app.db import models  # Import models module to register models
from app.api.routes.products import router as product_router
from app.api.routes.search import router as search_router
from app.api.routes.cart import router as cart_router
from app.api.routes.orders import router as order_router
from app.api.routes.audit import router as audit_router
from app.api.routes.upsell import router as upsell_router
from app.api.routes.payments import router as payment_router
from app.api.routes.chat import router as chat_router
from app.api.routes.cross_sell import router as recommendation_router


def ensure_product_asin_column():
    """Add the ASIN column to existing databases created before SerpAPI support."""
    inspector = inspect(engine)
    if "products" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("products")}
    with engine.begin() as connection:
        if "asin" not in columns:
            connection.execute(
                text("ALTER TABLE products ADD COLUMN asin VARCHAR(20)")
            )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_products_asin "
                "ON products (asin)"
            )
        )


Base.metadata.create_all(bind=engine)
ensure_product_asin_column()

app = FastAPI(
    title="AI Commerce Agent",
    version="0.1.0"
)

origins = [ 
    "http://localhost:3000", 
    "http://localhost:5173", 
    "http://127.0.0.1:3000", 
    "http://127.0.0.1:5173", 
] 

app.add_middleware( 
    CORSMiddleware, 
    allow_origins=origins, 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
)

app.include_router(product_router)
app.include_router(search_router)
app.include_router(cart_router)
app.include_router(order_router)
app.include_router(audit_router)
app.include_router(upsell_router)
app.include_router(payment_router)
app.include_router(chat_router)
app.include_router(recommendation_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-commerce-agent"
    }
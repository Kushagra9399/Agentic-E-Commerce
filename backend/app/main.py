from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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


# Backward-compatible schema patch for databases created before external
# marketplace product IDs were added to the Product model. create_all() creates
# missing tables but does not add columns to existing tables.
with engine.begin() as connection:
    connection.exec_driver_sql(
        "ALTER TABLE IF EXISTS products "
        "ADD COLUMN IF NOT EXISTS external_id VARCHAR(100)"
    )
    connection.exec_driver_sql(
        "ALTER TABLE IF EXISTS products "
        "ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'local'"
    )

Base.metadata.create_all(bind=engine)

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
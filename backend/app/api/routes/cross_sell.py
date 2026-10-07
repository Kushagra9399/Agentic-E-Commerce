from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.recommendation_service import RecommendationService


router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"]
)

recommendation_ser = RecommendationService()

@router.get("/{product_id}")
def get_recommendations(
    product_id: str,
    db: Session = Depends(get_db)
):

    recommendations = recommendation_ser.get_cross_sell_products(
        db=db,
        product_id=product_id,
        limit=3
    )

    return {
        "product_id": product_id,
        "recommendation_type": "cross_sell",
        "count": len(recommendations),
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "brand": product.brand,
                "category": product.category,
                "sale_price": float(product.sale_price),
                "market_price": float(product.market_price),
                "discount": float(product.discount_percent),
                "stock": product.stock,
                "overview": product.overview,
            }
            for product in recommendations
        ]
    }
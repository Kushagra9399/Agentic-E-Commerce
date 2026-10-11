from fastapi import APIRouter, HTTPException

from app.services.serpapi_service import SerpAPIService


router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"]
)

serpapi = SerpAPIService()


@router.get("/{asin}")
def get_recommendations(asin: str):

    result = serpapi.get_product_details(asin=asin)

    if not result.get("found"):
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    add_ons = result.get("add_ons", [])

    return {
        "asin": asin,
        "recommendation_type": "frequently_bought_together",
        "count": len(add_ons),
        "products": [
            {
                "asin": item.get("asin"),
                "title": item.get("title"),
                "brand": item.get("brand"),
                "price": item.get("price"),
                "discount_percent": item.get("discount_percent", 0),
                "rating": item.get("rating"),
                "image": item.get("image") or item.get("thumbnail"),
                "link": item.get("link") or item.get("link_clean"),
                "source": item.get("source", "serpapi_amazon"),
                "in_stock": item.get("in_stock", True)
            }
            for item in add_ons
        ]
    }
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.serpapi_service import SerpAPIService


router = APIRouter(
    prefix="/api/search",
    tags=["Search"]
)


search_service = SerpAPIService()


class SearchRequest(BaseModel):
    query: str
    max_price: float | None = None
    min_price: float | None = None
    brand: str | None = None
    limit: int = 5


@router.post("/")
def search_products(request: SearchRequest):

    result = search_service.search_products(
        query=request.query,
        max_price=request.max_price,
        min_price=request.min_price,
        brand=request.brand,
        limit=request.limit
    )

    products = []
    for p in result.get("products", []):
        products.append({
            "asin": p.get("asin"),
            "title": p.get("title"),
            "brand": p.get("brand"),
            "price": f"₹{p.get('price')}",
            "original_price": f"₹{p.get('original_price')}" if p.get("original_price") else None,
            "discount": f"{p.get('discount_percent')}%",
            "rating": p.get("rating"),
            "reviews": p.get("review_count"),
            "in_stock": p.get("in_stock")
        })

    return {
        "query": request.query,
        "count": len(products),
        "products": products,
        "from_cache": result.get("from_cache", False)
    }
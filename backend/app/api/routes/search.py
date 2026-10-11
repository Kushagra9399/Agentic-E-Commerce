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
            "id": p.get("asin"),
            "title": p.get("title"),
            "name": p.get("title"),
            "brand": p.get("brand"),
            "price": p.get("price"),
            "original_price": p.get("original_price"),
            "discount_percent": p.get("discount_percent", 0),
            "rating": p.get("rating"),
            "reviews": p.get("review_count"),
            "image": p.get("image"),
            "thumbnail": p.get("image"),
            "link": p.get("link"),
            "source": p.get("source", "serpapi_amazon"),
            "in_stock": p.get("in_stock", True)
        })

    return {
        "query": request.query,
        "count": len(products),
        "products": products,
        "from_cache": result.get("from_cache", False),
        "error": result.get("error")
    }
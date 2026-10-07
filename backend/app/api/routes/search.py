from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.product_search import ProductSearchService


router = APIRouter(
    prefix="/api/search",
    tags=["Search"]
)


search_service = ProductSearchService()


class SearchRequest(BaseModel):
    query: str
    max_price: float | None = None
    brand: str | None = None
    limit: int = 5


@router.post("/")
def search_products(
    request: SearchRequest,
    db: Session = Depends(get_db)
):

    products = search_service.search(
        db=db,
        query=request.query,
        max_price=request.max_price,
        brand=request.brand,
        limit=request.limit
    )

    return {
        "query": request.query,
        "count": len(products),
        "products": products
    }
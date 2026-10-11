from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Product


router = APIRouter(
    prefix="/api/products",
    tags=["Products"]
)


@router.get("/")
def get_products(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    products = (
        db.query(Product)
        .filter(Product.is_active == True)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "count": len(products),
        "offset": offset,
        "limit": limit,
        "products": products
    }


@router.get("/filter")
def filter_products(
    category: str | None = None,
    brand: str | None = None,
    max_price: float | None = None,
    min_price: float | None = None,
    min_discount: float | None = None,
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    query = (
        db.query(Product)
        .filter(Product.is_active == True)
    )

    if category:
        query = query.filter(
            Product.category.ilike(f"%{category}%")
        )

    if brand:
        query = query.filter(
            Product.brand.ilike(f"%{brand}%")
        )

    if max_price is not None:
        query = query.filter(
            Product.sale_price <= max_price
        )

    if min_price is not None:
        query = query.filter(
            Product.sale_price >= min_price
        )

    if min_discount is not None:
        query = query.filter(
            Product.discount_percent >= min_discount
        )

    products = query.limit(limit).all()

    return {
        "count": len(products),
        "products": products
    }


@router.get("/{product_id}")
def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        product = (
            db.query(Product)
            .filter(
                Product.external_id == product_id,
                Product.source_type == "amazon",
            )
            .first()
        )

    if not product:
        # Search/recommendation cards use ASINs. Fetch and cache details so
        # the same product can be opened in the existing detail UI.
        try:
            from app.services.serpapi_service import SerpAPIService
            from app.services.product_cache_service import create_or_get_product_from_external_id

            details = SerpAPIService().get_product_details(asin=product_id)
            if details.get("found"):
                product = create_or_get_product_from_external_id(
                    db=db,
                    external_id=product_id,
                    source_type="amazon",
                    product_data=details.get("product") or {},
                )
        except Exception:
            product = None

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


@router.get("/search")
def search(
    query: str,
    max_price: float | None = None,
    min_price: float | None = None,
    brand: str | None = None,
    min_discount: float | None = None,
    top_k: int = 5
):
    return search_products(
        query=query,
        max_price=max_price,
        min_price=min_price,
        brand=brand,
        # min_discount=min_discount,
        top_k=top_k
    )
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Cart, CartItem, Product
from app.services.cart_service import (
    create_cart,
    add_product_to_cart,
    get_cart_details,
    approve_cart
)


router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"]
)


class AddCartItemRequest(BaseModel):
    product_id: str
    quantity: int = Field(
        default=1,
        ge=1,
        le=20
    )


@router.post("/")
def create_new_cart(
    db: Session = Depends(get_db)
):

    cart = create_cart(db)

    return {
        "cart_id": cart.id,
        "status": cart.status
    }


@router.post("/{cart_id}/items")
def add_item(
    cart_id: str,
    request: AddCartItemRequest,
    db: Session = Depends(get_db)
):

    try:
        # Frontend recommendation/search cards use the Amazon ASIN as their ID.
        # Resolve local product IDs first, then ASINs, and cache missing Amazon
        # products before passing the internal Product.id to cart service.
        product = db.query(Product).filter(
            Product.id == request.product_id
        ).first()

        if not product:
            product = db.query(Product).filter(
                Product.asin == request.product_id
            ).first()

        if not product:
            from app.services.serpapi_service import SerpAPIService
            from app.services.product_cache_service import create_or_get_product_from_asin

            details = SerpAPIService().get_product_details(asin=request.product_id)
            if not details.get("found"):
                raise ValueError(details.get("error") or "Product not found in SerpAPI.")

            product = create_or_get_product_from_asin(
                db=db,
                asin=request.product_id,
                product_data=details.get("product") or {},
            )

        item = add_product_to_cart(
            db=db,
            cart_id=cart_id,
            product_id=product.id,
            quantity=request.quantity
        )

        return {
            "cart_item_id": item.id,
            "cart_id": item.cart_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": item.unit_price
        }

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    

@router.get("/{cart_id}")
def get_cart(
    cart_id: str,
    db: Session = Depends(get_db)
):

    try:

        return get_cart_details(
            db=db,
            cart_id=cart_id
        )

    except ValueError as e:

        raise HTTPException(
            status_code=404,
            detail=str(e)
        )


@router.post("/{cart_id}/approve")
def approve_purchase(
    cart_id: str,
    db: Session = Depends(get_db)
):

    try:

        return approve_cart(
            db=db,
            cart_id=cart_id
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Product
from app.services.upsell_service import UpsellService


router = APIRouter(
    prefix="/api/upsell",
    tags=["Upsell"]
)

service = UpsellService()


@router.get("/{product_id}")
def get_upsell(
    product_id: str,
    db: Session = Depends(get_db)
):

    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    upgrade = service.find_upgrade(
        db,
        product
    )

    if not upgrade:
        return {
            "available": False,
            "message": "No suitable upgrade found."
        }

    difference = (
        float(upgrade.sale_price)
        - float(product.sale_price)
    )

    return {
        "available": True,

        "current_product": {
            "id": product.id,
            "name": product.name,
            "price": float(product.sale_price)
        },

        "upgrade": {
            "id": upgrade.id,
            "name": upgrade.name,
            "price": float(upgrade.sale_price)
        },

        "additional_cost": round(
            difference,
            2
        )
    }
from sqlalchemy.orm import Session

from app.db.models import Product


def validate_order_stock(
    db: Session,
    order
):

    for item in order.items:

        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .first()
        )

        if not product:
            return False, (
                f"Product {item.product_name} no longer exists."
            )

        if product.stock < item.quantity:
            return False, (
                f"{item.product_name} is no longer "
                f"available in the requested quantity."
            )

    return True, None
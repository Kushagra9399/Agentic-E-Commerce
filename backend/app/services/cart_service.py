import uuid

from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import Cart, CartItem, Product


MERCHANT_ID = "CROMA_DEMO"


def create_cart(db: Session):

    cart = Cart(
        id=str(uuid.uuid4()),
        merchant_id=MERCHANT_ID,
        status="active"
    )

    db.add(cart)
    db.commit()
    db.refresh(cart)

    return cart


def add_product_to_cart(
    db: Session,
    cart_id: str,
    product_id: str,
    quantity: int = 1
):
    if quantity < 1:
        raise ValueError(
            "Quantity must be at least 1"
        )

    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id)
        .first()
    )

    if not cart:
        raise ValueError("Cart not found")

    if cart.status != "active":
        raise ValueError("Cart is not active")

    # product_id must always be the internal products.id.
    # Provider IDs are resolved before calling this service.
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise ValueError("Product not found")

    if not product.is_active:
        raise ValueError("Product is unavailable")

    existing_item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product.id  # Use the actual product ID (UUID)
        )
        .first()
    )

    existing_quantity = (
        existing_item.quantity
        if existing_item
        else 0
    )

    new_quantity = existing_quantity + quantity

    if product.stock < new_quantity:
        raise ValueError(
            f"Only {product.stock} items available"
        )
    
    cart.buyer_approved = False 
    cart.approved_total = None 
    cart.approved_at = None

    if existing_item:

        existing_item.quantity = new_quantity

        db.commit()
        db.refresh(existing_item)

        return existing_item

    item = CartItem(
        id=str(uuid.uuid4()),
        cart_id=cart_id,
        product_id=product.id,
        quantity=quantity,
        unit_price=product.sale_price
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def get_cart_details(
    db: Session,
    cart_id: str
):
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id)
        .first()
    )

    if not cart:
        raise ValueError("Cart not found")

    items = (
        db.query(CartItem, Product)
        .join(
            Product,
            CartItem.product_id == Product.id
        )
        .filter(
            CartItem.cart_id == cart_id
        )
        .all()
    )

    response_items = []

    subtotal = 0.0
    market_total = 0.0

    for item, product in items:

        unit_price = float(
            item.unit_price
        )

        market_price = float(
            product.market_price
        )

        item_total = (
            unit_price * item.quantity
        )

        market_item_total = (
            market_price * item.quantity
        )

        subtotal += item_total
        market_total += market_item_total

        response_items.append({
            "cart_item_id": item.id,
            "product_id": product.id,
            "name": product.name,
            "brand": product.brand,
            "quantity": item.quantity,
            "unit_price": unit_price,
            "market_price": market_price,
            "discount_percent": float(
                product.discount_percent
            ),
            "item_total": round(
                item_total,
                2
            ),
            "stock": product.stock
        })

    savings = market_total - subtotal

    return {
        "cart_id": cart.id,
        "merchant_id": cart.merchant_id,
        "status": cart.status,
        "items": response_items,
        "subtotal": round(subtotal, 2),
        "market_total": round(
            market_total,
            2
        ),
        "savings": round(
            savings,
            2
        ),
        "total": round(
            subtotal,
            2
        )
    }


def approve_cart(
    db: Session,
    cart_id: str
):
    cart = (
        db.query(Cart)
        .filter(Cart.id == cart_id)
        .first()
    )

    if not cart:
        raise ValueError(
            "Cart not found"
        )

    if cart.status != "active":
        raise ValueError(
            "Cart is not active"
        )

    details = get_cart_details(
        db=db,
        cart_id=cart_id
    )

    if not details["items"]:
        raise ValueError(
            "Cannot approve an empty cart"
        )

    # Revalidate stock
    for item in details["items"]:

        if item["stock"] < item["quantity"]:
            raise ValueError(
                f"Insufficient stock for "
                f"{item['name']}"
            )

    total = details["total"]

    cart.buyer_approved = True
    cart.approved_total = total
    cart.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(cart)

    return {
        "cart_id": cart.id,
        "buyer_approved": True,
        "approved_total": total,
        "approved_at": cart.approved_at,
        "message": (
            "Purchase approved. "
            "Payment may now be initiated."
        )
    }


def get_all_carts(db: Session):
    carts = (
        db.query(Cart)
        .order_by(Cart.created_at.desc())
        .all()
    )

    result = []

    for cart in carts:

        items = (
            db.query(CartItem)
            .filter(CartItem.cart_id == cart.id)
            .all()
        )

        cart_items = []

        subtotal = 0.0

        for item in items:

            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .first()
            )

            item_total = (
                float(item.unit_price) * item.quantity
            )

            subtotal += item_total

            cart_items.append({
                "product_id": item.product_id,
                "product_name": (
                    product.name
                    if product
                    else "Unknown Product"
                ),
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "total_price": round(item_total, 2)
            })

        result.append({
            "cart_id": cart.id,
            "merchant_id": cart.merchant_id,
            "status": cart.status,
            "buyer_approved": cart.buyer_approved,
            "approved_total": (
                float(cart.approved_total)
                if cart.approved_total is not None
                else None
            ),
            "approved_at": cart.approved_at,
            "created_at": cart.created_at,
            "updated_at": cart.updated_at,
            "subtotal": round(subtotal, 2),
            "items": cart_items
        })

    return result
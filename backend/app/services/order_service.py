import uuid

from sqlalchemy.orm import Session

from app.db.models import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    Product
)

from app.core.config import settings

from app.services.audit_service import log_event
from app.services.payment_service import PaymentService


payment_service = PaymentService()


def create_order(
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

    if cart.status != "active":
        raise ValueError("Cart is not active")

    # CRITICAL GATE
    if not cart.buyer_approved:
        raise ValueError(
            "Buyer approval is required before creating an order"
        )

    items = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart_id)
        .all()
    )

    if not items:
        raise ValueError("Cart is empty")

    # Revalidate products and stock
    subtotal = 0

    for item in items:

        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .first()
        )

        if not product:
            raise ValueError(
                f"Product not found: {item.product_id}"
            )

        if product.stock < item.quantity:
            raise ValueError(
                f"Insufficient stock for {product.name}"
            )

        subtotal += (
            float(item.unit_price)
            * item.quantity
        )

    subtotal = round(subtotal, 2)

    # IMPORTANT:
    # Amount must not change after buyer approval.
    if round(float(cart.approved_total), 2) != subtotal:
        raise ValueError(
            "Cart total changed after buyer approval. "
            "New approval is required."
        )

    # Create internal order
    order = Order(
        id=str(uuid.uuid4()),
        cart_id=cart.id,
        merchant_id=cart.merchant_id,
        status="pending_payment",
        subtotal=subtotal,
        discount=0,
        total=subtotal,
        currency="INR",
        payment_status="created"
    )

    db.add(order)

    # Add order items
    for item in items:

        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .first()
        )

        order_item = OrderItem(
            id=str(uuid.uuid4()),
            order_id=order.id,
            product_id=item.product_id,
            product_name=product.name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=round(
                float(item.unit_price)
                * item.quantity,
                2
            )
        )

        db.add(order_item)

    db.flush()

    # Create Razorpay order
    razorpay_order = (
        payment_service.create_payment_order(
            order_id=order.id,
            amount=float(order.total),
            currency=order.currency
        )
    )

    order.razorpay_order_id = razorpay_order["id"]

    cart.status = "converted"

    db.commit()
    db.refresh(order)

    # Audit
    log_event(
        db=db,
        action="ORDER_CREATED",
        actor="AI_AGENT",
        order_id=order.id,
        details={
            "internal_order_id": order.id,
            "razorpay_order_id": order.razorpay_order_id,
            "total": float(order.total),
            "currency": order.currency,
            "cart_id": cart.id
        }
    )

    return {
        "success": True,

        "order": {
            "id": order.id,
            "status": order.status,
            "total": float(order.total),
            "currency": order.currency
        },

        "payment": {
            "provider": "razorpay",
            "razorpay_order_id": order.razorpay_order_id,
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "amount": int(
                round(float(order.total) * 100)
            ),
            "currency": order.currency
        }
    }


def get_orders(
    db: Session,
    status: str | None = None,
    limit: int = 10
):

    query = (
        db.query(Order)
        .order_by(Order.created_at.desc())
    )

    if status:
        query = query.filter(
            Order.status == status
        )

    orders = query.limit(limit).all()

    result = []

    for order in orders:

        items = (
            db.query(OrderItem)
            .filter(
                OrderItem.order_id == order.id
            )
            .all()
        )

        order_items = []

        for item in items:

            order_items.append({
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "total_price": float(item.total_price)
            })

        result.append({
            "order_id": order.id,
            "cart_id": order.cart_id,
            "merchant_id": order.merchant_id,
            "status": order.status,
            "subtotal": float(order.subtotal),
            "discount": float(order.discount),
            "total": float(order.total),
            "currency": order.currency,
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "items": order_items
        })

    return result


def get_order(
    db: Session,
    order_id: str
):

    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        return None

    items = (
        db.query(OrderItem)
        .filter(
            OrderItem.order_id == order.id
        )
        .all()
    )

    order_items = []

    for item in items:

        order_items.append({
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price)
        })

    return {
        "order_id": order.id,
        "cart_id": order.cart_id,
        "merchant_id": order.merchant_id,
        "status": order.status,
        "subtotal": float(order.subtotal),
        "discount": float(order.discount),
        "total": float(order.total),
        "currency": order.currency,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": order_items
    }
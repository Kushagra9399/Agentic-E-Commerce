from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import Order, OrderItem, Product
from app.services.payment_service import PaymentService
from app.services.audit_service import log_event


payment_service = PaymentService()


def process_verified_payment(
    db: Session,
    razorpay_order_id: str | None = None,
    razorpay_payment_id: str | None = None,
    razorpay_signature: str | None = None,
    order_id: str | None = None,
    verify_signature: bool = True,
    actor: str = "SYSTEM",
):
    """
    Idempotent processor for a successful Razorpay payment.

    - Verifies signature if requested.
    - Validates and reserves stock.
    - Updates order payment fields atomically.
    - Safe to call multiple times for the same payment.
    """

    # Locate order either by internal id or by razorpay order id
    if order_id:
        order = db.query(Order).filter(Order.id == order_id).first()
    else:
        order = db.query(Order).filter(Order.razorpay_order_id == razorpay_order_id).first()

    if not order:
        raise ValueError("Order not found")

    # If order already marked paid, treat as idempotent
    if order.payment_status == "paid":
        return {
            "success": True,
            "already_paid": True,
            "order_id": order.id,
            "payment_id": order.payment_id,
            "payment_status": order.payment_status,
        }

    # Ensure provided razorpay_order matches the order (if given)
    if razorpay_order_id and order.razorpay_order_id and (order.razorpay_order_id != razorpay_order_id):
        raise ValueError("Razorpay order ID does not match internal order")

    # Verify signature if requested (front-end flow)
    if verify_signature:
        try:
            payment_service.verify_payment(
                razorpay_order_id=razorpay_order_id or order.razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=razorpay_signature,
            )
        except Exception as e:
            log_event(
                db=db,
                action="PAYMENT_VERIFICATION_FAILED",
                actor="SYSTEM",
                order_id=order.id,
                details={
                    "razorpay_order_id": razorpay_order_id or order.razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "error": str(e),
                },
            )
            raise ValueError("Invalid payment signature")

    # Validate and decrement stock atomically
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()

    if not items:
        raise ValueError("Order has no items")

    try:
        for item in items:
            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .with_for_update()
                .first()
            )

            if not product:
                raise ValueError(f"Product not found: {item.product_name}")

            if product.stock < item.quantity:
                # mark payment/order as failed due to stock
                order.payment_status = "failed"
                order.status = "payment_failed"
                order.payment_error = f"Insufficient stock for {item.product_name}"
                db.commit()

                log_event(
                    db=db,
                    action="PAYMENT_FAILED",
                    actor=actor,
                    order_id=order.id,
                    details={
                        "reason": "INSUFFICIENT_STOCK",
                        "product": item.product_name,
                        "available": product.stock,
                        "requested": item.quantity,
                    },
                )

                raise ValueError(f"Insufficient stock for {item.product_name}")

            product.stock -= item.quantity
            if product.stock == 0:
                product.is_active = False

        # All stock checks passed; update order payment fields
        order.payment_id = razorpay_payment_id
        order.payment_status = "paid"
        # Only set signature/timestamp if model supports it (avoid breaking DBs without migration)
        if hasattr(order, "payment_signature"):
            order.payment_signature = razorpay_signature
        if hasattr(order, "payment_verified_at"):
            order.payment_verified_at = func.now()
        order.status = "paid"

        db.commit()
        db.refresh(order)

        log_event(
            db=db,
            action="PAYMENT_VERIFIED",
            actor=actor,
            order_id=order.id,
            details={
                "razorpay_order_id": order.razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "amount": float(order.total),
                "currency": order.currency,
            },
        )

        return {
            "success": True,
            "already_paid": False,
            "order_id": order.id,
            "payment_id": order.payment_id,
            "payment_status": order.payment_status,
        }

    except Exception:
        db.rollback()
        raise


def verify_payment(
    db: Session,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
):
    # Backwards-compatible wrapper used by routes
    return process_verified_payment(
        db=db,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_signature=razorpay_signature,
        verify_signature=True,
        actor="SYSTEM",
    )
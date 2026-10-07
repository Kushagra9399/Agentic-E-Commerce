from fastapi import APIRouter, Depends, HTTPException, Request
import json
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Order, OrderItem, Product
from app.services.payment_service import PaymentService
from app.services.audit_service import log_event
from pydantic import BaseModel
from app.core.config import settings

from app.services.payment_verification_service import (
    verify_payment,
    process_verified_payment,
)

payment_service = PaymentService()


class PaymentVerificationRequest(BaseModel):

    razorpay_payment_id: str

    razorpay_signature: str


router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"]
)


class PaymentVerifyRequest(BaseModel):

    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/verify")
def verify_payment_endpoint(
    request: PaymentVerifyRequest,
    db: Session = Depends(get_db)
):

    try:

        result = process_verified_payment(
            db=db,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
            verify_signature=True,
            actor="SYSTEM",
        )

        return {
            "success": True,
            "verified": True,
            "already_paid": result.get("already_paid", False),
            "order_id": result.get("order_id"),
            "payment_id": result.get("payment_id"),
            "razorpay_payment_id": result.get("payment_id"),
            "status": "paid",
            "payment_status": "paid",
            "message": (
                "Payment verified and captured successfully."
            ),
        }

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):

    body = await request.body()

    signature = request.headers.get(
        "X-Razorpay-Signature"
    )

    if not signature:

        raise HTTPException(
            status_code=400,
            detail="Missing Razorpay signature"
        )

    valid = payment_service.verify_webhook_signature(
        payload=body,
        signature=signature
    )

    if not valid:

        raise HTTPException(
            status_code=400,
            detail="Invalid webhook signature"
        )

    payload = json.loads(body)

    event = payload.get("event")

    # --------------------------------
    # PAYMENT CAPTURED
    # --------------------------------

    if event == "payment.captured":

        payment_entity = (
            payload
            .get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )

        razorpay_payment_id = payment_entity.get("id")
        razorpay_order_id = payment_entity.get("order_id")

        try:
            # Webhook already verified signature above; process payment without
            # re-checking the Razorpay signature.
            res = process_verified_payment(
                db=db,
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                razorpay_signature=None,
                verify_signature=False,
                actor="RAZORPAY",
            )

            # Log a capture event (idempotent inside process_verified_payment)
            log_event(
                db=db,
                action="PAYMENT_CAPTURED",
                actor="RAZORPAY",
                order_id=res.get("order_id") if isinstance(res, dict) else None,
                details={
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_order_id": razorpay_order_id,
                },
            )
        except Exception as e:
            # If processing failed, log and continue; webhook should not crash
            log_event(
                db=db,
                action="PAYMENT_CAPTURE_PROCESSING_ERROR",
                actor="RAZORPAY",
                order_id=None,
                details={"error": str(e)},
            )

    # --------------------------------
    # PAYMENT FAILED
    # --------------------------------

    elif event == "payment.failed":

        payment_entity = (
            payload
            .get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )

        razorpay_payment_id = payment_entity.get("id")
        razorpay_order_id = payment_entity.get("order_id")

        # Mark order payment as failed but keep the order for retry.
        order = (
            db.query(Order)
            .filter(Order.razorpay_order_id == razorpay_order_id)
            .first()
        )

        if order:
            order.payment_id = razorpay_payment_id
            order.payment_status = "failed"
            order.status = "payment_failed"

            db.commit()

            log_event(
                db=db,
                action="PAYMENT_FAILED",
                actor="RAZORPAY",
                order_id=order.id,
                details={
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_order_id": razorpay_order_id,
                    "error": payment_entity.get("error_description"),
                },
            )

    return {
        "received": True
    }


@router.post("/{order_id}/create")
def create_payment(
    order_id: str,
    db: Session = Depends(get_db)
):

    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    if order.status == "pending_payment":
        return {
            "order_id": order.id,
            "status": order.status,
            "razorpay_order_id": order.razorpay_order_id,
            "amount": float(order.total),
            "currency": order.currency,
            "message": "Payment is already in progress."
        }

    if order.status == "paid":
        return {
            "order_id": order.id,
            "status": "paid",
            "message": "Order has already been paid."
        }

    # Critical safety check
    if order.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=(
                "Payment cannot be initiated. "
                "Buyer approval is required."
            )
        )

    try:

        if settings.demo_payment_failure:

            order.status = "payment_failed"

            order.payment_error = (
                "Simulated payment failure for demo"
            )

            db.commit()

            log_event(
                db=db,
                action="PAYMENT_FAILED",
                actor="PAYMENT_GATEWAY",
                order_id=order.id,
                details={
                    "reason": "DEMO_FAILURE"
                }
            )

            return {
                "order_id": order.id,
                "status": "payment_failed",
                "message": (
                    "Payment could not be completed."
                )
            }

        items = (
            db.query(OrderItem)
            .filter(OrderItem.order_id == order.id)
            .all()
        )

        for item in items:

            product = (
                db.query(Product)
                .filter(Product.id == item.product_id)
                .first()
            )

            if not product:
                raise HTTPException(
                    status_code=400,
                    detail=f"{item.product_name} is unavailable."
                )

            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": "Product stock changed.",
                        "product": item.product_name,
                        "available": product.stock,
                        "requested": item.quantity
                    }
                )

        razorpay_order = (
            payment_service.create_payment_order(
                order_id=order.id,
                amount=float(order.total),
                currency=order.currency,
            )
        )

        order.razorpay_order_id = (
            razorpay_order["id"]
        )

        order.status = "pending_payment"

        db.commit()

        log_event(
            db=db,
            action="PAYMENT_INITIATED",
            actor="AI_AGENT",
            order_id=order.id,
            details={
                "razorpay_order_id":
                    razorpay_order["id"],
                "amount":
                    float(order.total),
                "currency":
                    order.currency
            }
        )

        return {
            "order_id": order.id,
            "status": order.status,
            "razorpay_order_id":
                razorpay_order["id"],
            "amount":
                float(order.total),
            "currency":
                order.currency,
            "razorpay_key_id":
                payment_service.client.auth[0]
        }

    except Exception as e:

        order.status = "payment_failed"
        order.payment_error = str(e)

        db.commit()

        log_event(
            db=db,
            action="PAYMENT_INITIATION_FAILED",
            actor="SYSTEM",
            order_id=order.id,
            details={
                "error": str(e)
            }
        )

        raise HTTPException(
            status_code=502,
            detail="Payment service unavailable"
        )
    

@router.post("/{order_id}/verify")
def verify_payment(
    order_id: str,
    request: PaymentVerificationRequest,
    db: Session = Depends(get_db)
):
    try:
        res = process_verified_payment(
            db=db,
            order_id=order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
            verify_signature=True,
            actor="SYSTEM",
        )

        return {
            "success": True,
            "status": res.get("payment_status", "paid"),
            "order_id": res.get("order_id"),
            "payment_id": res.get("payment_id"),
            "message": "Payment verified successfully.",
        }

    except ValueError as e:
        # If verification failed, ensure order is in payment_failed state but do not delete
        order = db.query(Order).filter(Order.id == order_id).first()
        if order:
            order.status = "payment_failed"
            order.payment_status = "failed"
            order.payment_error = str(e)
            db.commit()

            log_event(
                db=db,
                action="PAYMENT_FAILED",
                actor="RAZORPAY",
                order_id=order.id,
                details={"error": str(e)},
            )

        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/retry")
def retry_payment(
    order_id: str,
    db: Session = Depends(get_db)
):

    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    if order.status != "payment_failed":
        raise HTTPException(
            status_code=400,
            detail=(
                "Payment retry is only available "
                "after a failed payment."
            )
        )

    # Return the order to an approved state.
    # Buyer approval is still valid because
    # the order total has not changed.
    order.status = "approved"
    order.payment_error = None

    db.commit()

    log_event(
        db=db,
        action="PAYMENT_RETRY_REQUESTED",
        actor="BUYER",
        order_id=order.id,
        details={
            "amount": float(order.total)
        }
    )

    return {
        "order_id": order.id,
        "status": order.status,
        "message": (
            "Payment can be retried. "
            "No new order was created."
        )
    }


@router.post("/{order_id}/cancel")
def cancel_payment(
    order_id: str,
    db: Session = Depends(get_db)
):

    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    if order.status not in [
        "payment_failed",
        "approved"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Order cannot be cancelled."
        )

    order.status = "cancelled"

    db.commit()

    log_event(
        db=db,
        action="ORDER_CANCELLED",
        actor="BUYER",
        order_id=order.id,
        details={}
    )

    return {
        "order_id": order.id,
        "status": "cancelled",
        "message": "Order cancelled successfully."
    }



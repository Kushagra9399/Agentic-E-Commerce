from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Order, OrderItem
from app.services.order_service import create_order

from pydantic import BaseModel
from datetime import datetime


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"]
)


class ApprovalRequest(BaseModel):
    approved_total: float


@router.post("/")
def create_new_order(
    cart_id: str,
    db: Session = Depends(get_db)
):

    try:

        order = create_order(
            db=db,
            cart_id=cart_id
        )

        return {
            "order_id": order.id,
            "status": order.status,
            "subtotal": order.subtotal,
            "discount": order.discount,
            "total": order.total,
            "currency": order.currency,
            "message": (
                "Order created. "
                "Buyer approval is required "
                "before payment."
            )
        }

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.get("/{order_id}") 
def get_order( 
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
        
    items = (
        db.query(OrderItem) 
        .filter(OrderItem.order_id == order.id) 
        .all() 
    ) 
    
    return { 
        "order_id": order.id, 
        "cart_id": order.cart_id, 
        "merchant_id": order.merchant_id, 
        "status": order.status, 
        "subtotal": float(order.subtotal), 
        "discount": float(order.discount), 
        "total": float(order.total), 
        "currency": order.currency, 
        "payment_id": order.payment_id, 
        "payment_error": order.payment_error, 
        "items": [ 
            { 
                "product_id": item.product_id, 
                "product_name": item.product_name, 
                "quantity": item.quantity, 
                "unit_price": float(item.unit_price), 
                "total_price": float(item.total_price) 
            } 
            for item in items 
        ] 
    }

@router.post("/{order_id}/approve")
def approve_order(
    order_id: str,
    request: ApprovalRequest,
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

    if order.status != "pending_approval":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be approved from status: {order.status}"
        )

    expected_total = round(float(order.total), 2)
    approved_total = round(request.approved_total, 2)

    if expected_total != approved_total:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Approved amount does not match order total",
                "expected_total": expected_total,
                "approved_total": approved_total
            }
        )

    order.status = "approved"
    order.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "status": order.status,
        "approved_total": float(order.total),
        "approved_at": order.approved_at,
        "message": "Buyer approval recorded. Payment may now be initiated."
    }
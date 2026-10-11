from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Integer,
    Boolean,
    DateTime,
    func,
    ForeignKey,
    UniqueConstraint
)

from .database import Base

from pgvector.sqlalchemy import Vector


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(
        String(50),
        primary_key=True
    )

    name = Column(
        String(255),
        nullable=False
    )

    currency = Column(
        String(10),
        nullable=False,
        default="INR"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class Product(Base):
    __tablename__ = "products"

    __table_args__ = (
        UniqueConstraint("source_type", "external_id", name="uq_products_source_external_id"),
    )

    id = Column(
        String(36),
        primary_key=True
    )

    merchant_id = Column(
        String(50),
        nullable=False
    )

    # Provider-specific ID (ASIN for Amazon today); internal relations use Product.id.
    external_id = Column(String(100), nullable=True)

    link = Column(
        Text,
        nullable=False
    )

    name = Column(
        String(500),
        nullable=False
    )

    brand = Column(
        String(100),
        nullable=False
    )

    category = Column(
        String(255),
        nullable=False
    )

    overview = Column(
        Text,
        nullable=True
    )

    images = Column(
        Text,
        nullable=True
    )

    specification = Column(
        Text,
        nullable=False
    )

    search_text = Column(
        Text,
        nullable=False
    )

    market_price = Column(
        Numeric(12, 2),
        nullable=False
    )

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False
    )

    sale_price = Column(
        Numeric(12, 2),
        nullable=False
    )

    stock = Column(
        Integer,
        nullable=False,
        default=0
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    # Namespace for external_id, e.g. "amazon" or another marketplace.
    source_type = Column(String(30), nullable=False, default="local")

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now()
    )


class Cart(Base):
    __tablename__ = "carts"

    id = Column(
        String(36),
        primary_key=True
    )

    merchant_id = Column(
        String(50),
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="active"
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now()
    )

    buyer_approved = Column(
        Boolean,
        default=False,
        nullable=False
    )

    approved_total = Column(
        Numeric(12, 2),
        nullable=True
    )

    approved_at = Column(
        DateTime,
        nullable=True
    )


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(
        String(36),
        primary_key=True
    )

    cart_id = Column(
        String(36),
        ForeignKey("carts.id"),
        nullable=False
    )

    product_id = Column(
        String(36),
        ForeignKey("products.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=1
    )

    unit_price = Column(
        Numeric(12, 2),
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(
        String(36),
        primary_key=True
    )

    cart_id = Column(
        String(36),
        nullable=False
    )

    merchant_id = Column(
        String(50),
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="pending_approval"
    )

    subtotal = Column(
        Numeric(12, 2),
        nullable=False
    )

    discount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0
    )

    total = Column(
        Numeric(12, 2),
        nullable=False
    )

    currency = Column(
        String(10),
        nullable=False,
        default="INR"
    )

    approved_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now()
    )

    razorpay_order_id = Column(
        String(100),
        nullable=True
    )

    payment_id = Column(
        String(100),
        nullable=True
    )

    payment_error = Column(
        Text,
        nullable=True
    )

    payment_status = Column(
        String,
        default="created",
        nullable=False
    )

    payment_signature = Column(
        Text,
        nullable=True
    )

    payment_verified_at = Column(
        DateTime,
        nullable=True
    )



class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(
        String(36),
        primary_key=True
    )

    order_id = Column(
        String(36),
        ForeignKey("orders.id"),
        nullable=False
    )

    product_id = Column(
        String(36),
        ForeignKey("products.id"),
        nullable=False
    )

    product_name = Column(
        String(500),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    unit_price = Column(
        Numeric(12, 2),
        nullable=False
    )

    total_price = Column(
        Numeric(12, 2),
        nullable=False
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(
        String(36),
        primary_key=True
    )

    order_id = Column(
        String(36),
        nullable=True
    )

    action = Column(
        String(100),
        nullable=False
    )

    actor = Column(
        String(50),
        nullable=False
    )

    details = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

"""
Cache products returned by external product providers.

Product.id is the stable internal identifier used by carts and orders.
Provider-specific identifiers are stored in external_id and namespaced by
source_type (for example, "amazon" for ASINs).
"""

from typing import Any, Dict, Optional
import uuid

from sqlalchemy.orm import Session

from app.db.models import Product


def _format_specs(specs: Dict[str, Any]) -> str:
    if not specs:
        return ""

    lines = []
    for key, value in list(specs.items())[:5]:
        if isinstance(value, list):
            value = ", ".join(str(item) for item in value)
        lines.append(f"{key}: {value}")

    return "\n".join(lines)[:200]


def create_or_get_product_from_external_id(
    db: Session,
    external_id: str,
    source_type: str = "amazon",
    product_data: Optional[Dict[str, Any]] = None,
) -> Product:
    """Resolve a provider ID to a stable internal Product record."""
    if not external_id or not external_id.strip():
        raise ValueError("External product ID is required")

    external_id = external_id.strip()
    source_type = source_type.strip().lower()

    product = (
        db.query(Product)
        .filter(
            Product.external_id == external_id,
            Product.source_type == source_type,
        )
        .first()
    )
    if product:
        return product

    if not product_data:
        raise ValueError(
            f"Product {external_id} from source {source_type} was not found"
        )

    price = product_data.get("price")
    original_price = product_data.get("original_price")
    title = product_data.get("title") or product_data.get("name") or "Unknown Product"
    brand = product_data.get("brand") or "Unknown"
    images = product_data.get("images") or []
    specifications = product_data.get("specifications") or {}

    product = Product(
        id=str(uuid.uuid4()),
        merchant_id="CROMA_DEMO",
        external_id=external_id,
        source_type=source_type,
        link=product_data.get("link") or "",
        name=title,
        brand=brand,
        category=product_data.get("category") or "General",
        overview=product_data.get("description") or "",
        images=str(images),
        specification=_format_specs(specifications),
        search_text=f"{title} {brand}",
        market_price=original_price if original_price is not None else (price or 0),
        discount_percent=product_data.get("discount_percent") or 0,
        sale_price=price or 0,
        stock=product_data.get("stock", 10),
        is_active=product_data.get("in_stock", True),
    )

    db.add(product)
    db.flush()
    return product

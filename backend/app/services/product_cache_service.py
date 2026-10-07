"""
Service for managing product data from SerpAPI.

Handles caching and temporary storage of products fetched from SerpAPI
so they can be added to cart without requiring local database entries.
Automatically creates/retrieves products by ASIN.
"""

from typing import Dict, Any, Optional
from app.db.models import Product
from sqlalchemy.orm import Session
import uuid


def _format_specs(specs: Dict[str, Any]) -> str:
    """Format specifications dict to string."""
    if not specs:
        return ""
    
    lines = []
    for key, value in list(specs.items())[:5]:  # Limit to 5 specs
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value)
        lines.append(f"{key}: {value}")
    
    return "\n".join(lines)[:200]  # Limit to 200 chars


def create_or_get_product_from_asin(
    db: Session,
    asin: str,
    product_data: Optional[Dict[str, Any]] = None
) -> Product:
    """
    Create or retrieve a product by ASIN.
    
    If product doesn't exist in DB, create it from SerpAPI data.
    This allows SerpAPI products to be used in cart/order operations.
    
    Args:
        db: Database session
        asin: Amazon ASIN
        product_data: Product data from SerpAPI (if creating new)
    
    Returns:
        Product model instance
    
    Raises:
        ValueError: If product not found and no data provided
    """
    # Try to find existing product by ASIN
    product = db.query(Product).filter(
        Product.asin == asin
    ).first()
    
    if product:
        return product
    
    if not product_data:
        raise ValueError(f"Product with ASIN {asin} not found and no data provided")
    
    # Create new product from SerpAPI data
    product = Product(
        id=str(uuid.uuid4()),
        merchant_id="CROMA_DEMO",  # Configure via env if needed
        asin=asin,
        link=product_data.get("link", ""),
        name=product_data.get("title", "Unknown Product"),
        brand=product_data.get("brand", "Unknown"),
        category="Electronics",  # SerpAPI doesn't provide category
        overview=product_data.get("description", ""),
        images=str(product_data.get("images", [])),
        specification=_format_specs(product_data.get("specifications", {})),
        search_text=f"{product_data.get('title', '')} {product_data.get('brand', '')}",
        market_price=product_data.get("original_price", product_data.get("price", 0)),
        discount_percent=product_data.get("discount_percent", 0),
        sale_price=product_data.get("price", 0),
        stock=product_data.get("stock", 10),
        is_active=product_data.get("in_stock", True),
        source_type="serpapi"
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product


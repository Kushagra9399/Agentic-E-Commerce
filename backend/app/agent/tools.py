"""
AI Agent Tools for Commerce Operations.

Clean, focused tools using SerpAPI for product discovery with built-in recommendations.
Removed dead code (old recommendation_service and upsell_service).
"""

from app.db.session import db_session
from app.services.serpapi_service import SerpAPIService
from app.services.order_service import (
    create_order as create_order_service,
    get_orders as get_orders_service,
    get_order as get_order_service
)
from app.services.audit_service import log_event
from app.services.cart_service import (
    create_cart as create_cart_service,
    add_product_to_cart,
    get_cart_details,
    approve_cart,
)
from app.agent.session import get_session_metadata


serpapi = SerpAPIService()


# ============================================================================
# PRODUCT SEARCH & DISCOVERY TOOLS
# ============================================================================

def search_products(
    query: str,
    max_price: float | None = None,
    min_price: float | None = None,
    brand: str | None = None,
    limit: int = 5
) -> dict:
    """
    Search for products on Amazon.
    
    Uses SerpAPI for real-time product discovery with live prices & availability.
    Results are cached for 24 hours.
    
    Args:
        query: What you're looking for (e.g., "laptop under 100000")
        max_price: Budget limit in rupees
        min_price: Minimum price filter
        brand: Brand filter
        limit: Number of results to show (default: 5)
    
    Returns:
        List of products with: title, brand, price, discount, rating, ASIN
    """
    result = serpapi.search_products(
        query=query,
        max_price=max_price,
        min_price=min_price,
        brand=brand,
        limit=limit
    )
    
    products = []
    for p in result.get("products", []):
        products.append({
            "asin": p.get("asin"),
            "id": p.get("asin"),
            "title": p.get("title"),
            "name": p.get("title"),
            "brand": p.get("brand"),
            "price": p.get("price"),
            "original_price": p.get("original_price"),
            "discount_percent": p.get("discount_percent", 0),
            "rating": p.get("rating"),
            "review_count": p.get("review_count"),
            "in_stock": p.get("in_stock", True),
            "image": p.get("image"),
            "thumbnail": p.get("image"),
            "link": p.get("link"),
            "source": p.get("source", "serpapi_amazon"),
        })

    return {
        "query": query,
        "found": len(products),
        "products": products,
        "from_cache": result.get("from_cache", False),
        "error": result.get("error")
    }


def get_product_info(asin: str) -> dict:
    """
    Get detailed information about a specific product.
    
    Returns full product details including specifications, reviews, images,
    and built-in Amazon recommendations (add-ons and frequently-bought-together).
    
    Args:
        asin: Amazon Standard Identification Number (from search results)
    
    Returns:
        Product details with: title, price, rating, description, specs,
        add_ons (frequently bought together), recommendations (customers also viewed)
    """
    result = serpapi.get_product_details(asin=asin)
    
    if not result.get("found"):
        return {
            "found": False,
            "error": result.get("error", "Product not found")
        }
    
    product = result.get("product", {})
    
    return {
        "found": True,
        "asin": asin,
        "title": product.get("title"),
        "brand": product.get("brand"),
        "price": product.get("price"),
        "original_price": product.get("original_price"),
        "discount_percent": product.get("discount_percent", 0),
        "rating": product.get("rating"),
        "reviews": product.get("review_count"),
        "image": product.get("image"),
        "link": product.get("link"),
        "description": product.get("description"),
        "specifications": product.get("specifications"),
        "images": product.get("images"),
        "merchant": product.get("merchant"),
        "availability": product.get("availability"),
        
        # Built-in Amazon recommendations
        "add_ons": result.get("add_ons", []),  # Frequently bought together
        "recommendations": result.get("recommendations", []),  # Customers also viewed
        
        "from_cache": result.get("from_cache", False)
    }


# ============================================================================
# CART MANAGEMENT TOOLS
# ============================================================================

def create_cart() -> dict:
    """
    Create a new shopping cart.
    
    Returns:
        Cart details with cart_id to use for adding products
    """
    with db_session() as db:
        cart = create_cart_service(db)
        return {
            "cart_id": cart.id,
            "status": "active",
            "total": 0,
            "items": 0,
            "message": "Cart created successfully."
        }


def add_to_cart(
    cart_id: str,
    asin: str,
    quantity: int = 1
) -> dict:
    """
    Add a product to cart by ASIN.
    
    Automatically fetches product details from Amazon and caches locally.
    
    Args:
        cart_id: Cart ID (from create_cart())
        asin: Product ASIN (from search results)
        quantity: How many to add (default: 1)
    
    Returns:
        Updated cart details with new item
    """
    try:
        with db_session() as db:
            
            # Try to find product in local DB first
            from app.db.models import Product
            product = (
                db.query(Product)
                .filter(Product.asin == asin)
                .first()
            )
            
            # If not found locally, fetch from SerpAPI and cache
            if not product:
                product_detail = serpapi.get_product_details(asin=asin)
                
                if not product_detail.get("found"):
                    return {
                        "success": False,
                        "error": f"Product {asin} not found"
                    }
                
                # Cache in DB
                from app.services.product_cache_service import create_or_get_product_from_asin
                product = create_or_get_product_from_asin(
                    db=db,
                    asin=asin,
                    product_data=product_detail.get("product")
                )
            
            # Add to cart
            item = add_product_to_cart(
                db=db,
                cart_id=cart_id,
                product_id=product.id,
                quantity=quantity
            )
            
            # Get updated cart
            cart_details = get_cart_details(db=db, cart_id=cart_id)
            
            return {
                "success": True,
                "message": f"Added {quantity}x {product.name} to cart",
                "cart": cart_details
            }
    
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Error: {str(e)}"}


def view_cart(cart_id: str) -> dict:
    """
    View current cart contents and total.
    
    Args:
        cart_id: Cart ID
    
    Returns:
        Cart items, quantities, prices, and total
    """
    try:
        with db_session() as db:
            return get_cart_details(db=db, cart_id=cart_id)
    except ValueError as e:
        return {"found": False, "error": str(e)}


def review_cart_and_budget(
    cart_id: str,
    session_id: str | None = None
) -> dict:
    """
    Review cart details and validate against user's budget.
    
    Call this BEFORE checkout to show summary and get explicit approval.
    
    Args:
        cart_id: Cart ID
        session_id: Session ID (to check stated budget)
    
    Returns:
        Cart summary with budget validation
    """
    try:
        with db_session() as db:
            cart_details = get_cart_details(db=db, cart_id=cart_id)
            total = cart_details.get("total", 0)
            
            budget_check = {
                "specified": False,
                "limit": None,
                "within": True,
                "warning": None
            }
            
            if session_id:
                metadata = get_session_metadata(session_id)
                budget = metadata.get("budget")
                
                if budget is not None:
                    budget_check["specified"] = True
                    budget_check["limit"] = budget
                    budget_check["within"] = total <= budget
                    
                    if not budget_check["within"]:
                        budget_check["warning"] = (
                            f"⚠️  Cart total ₹{total} exceeds your budget ₹{budget}"
                        )
                    
                    log_event(
                        db=db,
                        action="BUDGET_CHECK",
                        actor="AI_AGENT",
                        details={
                            "cart_id": cart_id,
                            "cart_total": total,
                            "budget": budget,
                            "within_budget": budget_check["within"]
                        }
                    )
            
            log_event(
                db=db,
                action="APPROVAL_REQUESTED",
                actor="AI_AGENT",
                details={
                    "cart_id": cart_id,
                    "total": total,
                    "item_count": len(cart_details.get("items", []))
                }
            )
            
            return {
                "success": True,
                "cart_id": cart_id,
                "items": len(cart_details.get("items", [])),
                "total": f"₹{total}",
                "budget": budget_check,
                "message": "Ready for checkout. Confirm to proceed?"
            }
    
    except ValueError as e:
        return {"success": False, "error": str(e)}


def approve_cart_tool(cart_id: str) -> dict:
    """
    Approve cart for payment.
    
    Call this ONLY after user has explicitly confirmed.
    
    Args:
        cart_id: Cart ID
    
    Returns:
        Approval confirmation
    """
    try:
        with db_session() as db:
            result = approve_cart(db=db, cart_id=cart_id)
            return {"success": True, **result}
    except ValueError as e:
        return {"success": False, "error": str(e)}


# ============================================================================
# ORDER & PAYMENT TOOLS
# ============================================================================

def create_order(cart_id: str) -> dict:
    """
    Create order from approved cart.
    
    Call this AFTER cart has been approved.
    
    Args:
        cart_id: Cart ID
    
    Returns:
        Order details with payment link
    """
    with db_session() as db:
        try:
            result = create_order_service(db=db, cart_id=cart_id)
            return result
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": str(e)}


def get_order_status(order_id: str) -> dict:
    """
    Check order status and payment details.
    
    Args:
        order_id: Order ID
    
    Returns:
        Order details including payment status
    """
    with db_session() as db:
        order = get_order_service(db=db, order_id=order_id)
        
        if not order:
            return {"found": False, "error": "Order not found"}
        
        return {"found": True, "order": order}


def list_orders(status: str | None = None, limit: int = 10) -> dict:
    """
    List recent orders.
    
    Args:
        status: Filter by status (e.g., "completed", "pending")
        limit: Number of orders to show
    
    Returns:
        List of orders
    """
    with db_session() as db:
        orders = get_orders_service(db=db, status=status, limit=limit)
        return {
            "count": len(orders),
            "orders": orders
        }

# AI Commerce Agent - Tool Reference Guide

## Product Discovery

### search_products(query, max_price=None, min_price=None, brand=None, limit=5)
Search for products on Amazon with filters.

**Example**:
```python
search_products(
    query="MacBook Pro M3",
    max_price=200000,
    brand="Apple",
    limit=5
)
```

**Response**:
```json
{
  "query": "MacBook Pro M3",
  "found": 5,
  "from_cache": false,
  "products": [
    {
      "asin": "B0D4NPXZ3Z",
      "title": "Apple MacBook Pro 14-inch (2024)",
      "brand": "Apple",
      "price": "₹169,999",
      "original_price": "₹189,999",
      "discount": "10%",
      "rating": 4.8,
      "reviews": 2341,
      "in_stock": true
    }
  ]
}
```

---

### get_product_info(asin)
Get complete product details including specs, images, and built-in Amazon recommendations.

**Example**:
```python
get_product_info("B0D4NPXZ3Z")
```

**Response**:
```json
{
  "found": true,
  "asin": "B0D4NPXZ3Z",
  "title": "Apple MacBook Pro 14-inch (2024)",
  "brand": "Apple",
  "price": "₹169,999",
  "original_price": "₹189,999",
  "discount": "10%",
  "rating": 4.8,
  "reviews": 2341,
  "description": "The fastest laptop in the world...",
  "specifications": {
    "processor": "Apple M3 Pro",
    "ram": "8GB",
    "storage": "512GB SSD",
    "screen": "14.2-inch Liquid Retina XDR"
  },
  "merchant": "Amazon.in",
  "availability": "In Stock",
  "link": "https://amazon.in/...",
  
  "add_ons": [
    {
      "asin": "B0CLV...",
      "title": "Apple USB-C Charger 67W",
      "price": "₹3,999"
    }
  ],
  "recommendations": [
    {
      "asin": "B0D4X...",
      "title": "MacBook Pro 16-inch M3 Pro",
      "price": "₹249,999",
      "rating": 4.9
    }
  ],
  "from_cache": false
}
```

---

### get_product_schema(asin)
Get available fields/keys in product data. Useful for LLM to understand what information exists.

**Example**:
```python
get_product_schema("B0D4NPXZ3Z")
```

**Response**:
```json
{
  "asin": "B0D4NPXZ3Z",
  "available_keys": {
    "title": "str",
    "price": "float",
    "rating": "float",
    "specifications": {
      "processor": "str",
      "ram": "str",
      "storage": "str",
      "screen": "str"
    },
    "images": ["list"],
    "reviews": ["list"]
  },
  "total_fields": 24
}
```

---

### get_product_field(asin, field_path)
Retrieve a specific field using dot notation (e.g., "specifications.processor").

**Examples**:
```python
# Simple field
get_product_field("B0D4NPXZ3Z", "title")
# Response: {"field": "title", "value": "Apple MacBook Pro 14-inch"}

# Nested field
get_product_field("B0D4NPXZ3Z", "specifications.processor")
# Response: {"field": "specifications.processor", "value": "Apple M3 Pro"}

# List field (first item)
get_product_field("B0D4NPXZ3Z", "images.0")
# Response: {"field": "images.0", "value": "https://...jpg"}
```

---

## Cart Management

### create_cart()
Create a new shopping cart.

**Response**:
```json
{
  "cart_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "total": 0,
  "items": 0,
  "message": "Cart created successfully."
}
```

---

### add_to_cart(cart_id, asin, quantity=1)
Add a product to cart by ASIN. Automatically fetches from SerpAPI if not in local DB.

**Example**:
```python
add_to_cart(
    cart_id="550e8400-e29b-41d4-a716-446655440000",
    asin="B0D4NPXZ3Z",
    quantity=1
)
```

**Response**:
```json
{
  "success": true,
  "message": "Added 1x Apple MacBook Pro 14-inch to cart",
  "cart": {
    "cart_id": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "product_name": "Apple MacBook Pro 14-inch",
        "quantity": 1,
        "price": 169999,
        "total": 169999
      }
    ],
    "total": 169999,
    "item_count": 1
  }
}
```

---

### view_cart(cart_id)
View current cart contents.

**Response**: Same as `add_to_cart()` cart object

---

### review_cart_and_budget(cart_id, session_id=None)
Review cart and validate against user's budget before checkout.

**Example**:
```python
review_cart_and_budget(
    cart_id="550e8400-e29b-41d4-a716-446655440000",
    session_id="user-session-123"
)
```

**Response**:
```json
{
  "success": true,
  "cart_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": 1,
  "total": "₹169,999",
  "budget": {
    "specified": true,
    "limit": 200000,
    "within": true,
    "warning": null
  },
  "message": "Ready for checkout. Confirm to proceed?"
}
```

---

### approve_cart(cart_id)
Approve cart for payment (only call after explicit user confirmation).

**Response**:
```json
{
  "success": true,
  "cart_id": "550e8400-e29b-41d4-a716-446655440000",
  "approved_total": 169999,
  "approved_at": "2025-10-07T19:49:00Z"
}
```

---

## Order & Payment

### create_order(cart_id)
Create order from approved cart.

**Response**:
```json
{
  "success": true,
  "order_id": "ORD-550e8400",
  "amount": 169999,
  "currency": "INR",
  "payment_link": "https://razorpay.com/...",
  "message": "Order created. Proceed to payment."
}
```

---

### get_order_status(order_id)
Check order and payment status.

**Response**:
```json
{
  "found": true,
  "order": {
    "order_id": "ORD-550e8400",
    "status": "pending_payment",
    "items": [...],
    "total": 169999,
    "created_at": "2025-10-07T19:49:00Z",
    "payment_status": "awaiting_payment"
  }
}
```

---

### list_orders(status=None, limit=10)
List recent orders.

**Response**:
```json
{
  "count": 3,
  "orders": [
    {
      "order_id": "ORD-550e8400",
      "status": "completed",
      "total": 169999,
      "created_at": "2025-10-05T10:30:00Z"
    }
  ]
}
```

---

## Conversation Flow Example

```
User: "I need a good budget laptop under ₹50,000"

Agent:
1. search_products("budget laptop", max_price=50000, limit=5)
   → Returns 5 laptops under ₹50k

User: "Show details of the second one"

Agent:
2. get_product_info("B08NPXZ3Z")
   → Returns full details + add-ons (case, charger) + recommendations

User: "What's the warranty?"

Agent:
3. get_product_schema("B08NPXZ3Z")
   → Shows available fields
4. get_product_field("B08NPXZ3Z", "specifications.warranty")
   → Returns warranty info

User: "Add it to my cart"

Agent:
5. create_cart()
   → Creates new cart
6. add_to_cart(cart_id, "B08NPXZ3Z", quantity=1)
   → Adds laptop to cart

User: "I have a ₹60k budget. Can I afford the add-ons too?"

Agent:
7. review_cart_and_budget(cart_id, session_id)
   → Shows cart total vs budget
   → "Budget: ₹60k, Cart: ₹48,500, Safe!"

User: "Yes, add the charger too"

Agent:
8. add_to_cart(cart_id, "B0CLV...", quantity=1)
   → Adds charger
   → New total: ₹51,500

User: "Perfect, checkout"

Agent:
9. approve_cart(cart_id)
   → Asks for explicit confirmation
   → "Total ₹51,500. Confirm purchase?"

User: "Yes, go ahead"

Agent:
10. create_order(cart_id)
    → Creates order
    → Provides payment link

User clicks payment link → Razorpay payment → Order complete ✅
```

---

## Caching Behavior

All SerpAPI requests are automatically cached for 24 hours:

```python
# First call - hits API
result1 = search_products(query="laptop", max_price=100000)
# result1["from_cache"] = False

# Second call - same params - instant!
result2 = search_products(query="laptop", max_price=100000)
# result2["from_cache"] = True
# Same exact response, 0ms instead of 500ms

# Different params - hits API
result3 = search_products(query="laptop", max_price=80000)
# result3["from_cache"] = False  (different max_price)
```

---

## Error Handling

All tools return `success: false` or `found: false` on errors:

```json
{
  "success": false,
  "error": "Product with ASIN B0XXXXX not found"
}
```

Common errors:
- `"Product not found"` - Invalid ASIN or product unavailable
- `"Cart not found"` - Invalid cart ID
- `"Budget exceeded"` - Cart total > user budget (warning only, not blocking)

---

## Tips for LLM Optimization

1. **Use caching**: Ask for same products multiple times - second time is instant
2. **Inspect schema first**: Call `get_product_schema()` before requesting fields
3. **Request specific fields**: Use `get_product_field()` instead of full `get_product_info()`
4. **Batch add-ons**: SerpAPI includes recommendations in main response - don't query separately
5. **Cache built-in recommendations**: Don't query DB for upsells/cross-sells - use response data

---

## API Quota

Free tier: 100 API calls/month
- Each search = 1 call
- Each product details = 1 call
- With caching: ~20-30 free searches per month
- Recommended: Upgrade to paid tier for production ($99/month = unlimited)

---

Last Updated: Oct 7, 2025

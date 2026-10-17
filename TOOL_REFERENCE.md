# Agent Tool Reference

This page describes the current agent tool implementation in backend/app/agent/tools.py.

## Product discovery

### search_products(query, max_price=None, min_price=None, brand=None, limit=5)

Searches Amazon India through SerpAPI and returns normalized product records. Common fields include asin/id, title/name, brand, price, original_price, discount_percent, rating, review_count, in_stock, image/thumbnail, link, source, from_cache, and error. Results and available filtering depend on the provider response and service implementation.

Example:

```python
search_products(query="wireless headphones", max_price=5000, brand="Sony", limit=5)
```

### get_product_info(asin)

Fetches product details by ASIN. The response may include title, brand, price, rating, review count, images, description, specifications, merchant, availability, and cache status. Provider-supplied related items are returned as add_ons and recommendations when present; these fields are not guaranteed for every product.

## Cart and checkout

These operations currently use SQLAlchemy-backed services and PostgreSQL. They are not JSON-file-backed in the current implementation.

- create_cart(): creates a persisted cart and returns its ID and initial summary.
- add_to_cart(cart_id, asin, quantity=1): checks for a cached Amazon product in the database; if absent, fetches details through SerpAPI and stores/gets a product record before adding it.
- view_cart(cart_id): returns persisted cart items and totals.
- review_cart_and_budget(cart_id, session_id=None): summarizes the cart, checks any budget stored in session metadata, and records audit events.
- approve_cart_tool(cart_id): records approval and must only be used after explicit user confirmation.
- Order tools are wired to database-backed order services; payment operations use the configured backend payment services.

## Cache behavior

SerpAPI search and product-detail responses use a 24-hour response cache. This is separate from the database used by product records, carts, orders, and audit events. The current implementation does not yet use one JSON file per search query or ASIN in a json/ directory.

## Request path

```text
User -> FastAPI -> Groq tool-calling agent -> product tool -> SerpAPI service -> cache/provider -> agent response -> frontend
```

Cart and checkout requests instead call the commerce tools and database-backed services. Payment success must not be inferred from a frontend callback alone; use backend verification.

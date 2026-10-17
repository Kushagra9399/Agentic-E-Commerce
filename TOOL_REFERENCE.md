# Agent Tool Reference

The agent uses focused tools to translate shopping requests into product discovery and commerce actions.

## Product discovery

### `search_products(query, max_price=None, min_price=None, brand=None, limit=5)`

Search Amazon India through SerpAPI and return normalized product records.

Common fields include:

- `asin` / `id`: product identifier
- `title` / `name`: display name
- `brand`
- `price`, `original_price`, `discount_percent`
- `rating`, `review_count`
- `in_stock`
- `image` / `thumbnail`
- `link`, `source`
- `from_cache`: whether a cached response was used

Example:

```python
search_products(
    query="wireless headphones",
    max_price=5000,
    brand="Sony",
    limit=5,
)
```

### `get_product_info(asin)`

Retrieve details for a selected Amazon product. Available fields can include title, brand, pricing, rating, reviews, images, description, specifications, merchant, and availability. The response can also include related items as `add_ons` and `recommendations` when returned by the provider.

## Cart and checkout

The commerce tools work with backend services and persistent storage.

- `create_cart()`: create a cart and return its identifier and initial summary.
- `add_to_cart(cart_id, asin, quantity=1)`: add a product identified by ASIN; product details can be fetched and cached by the backend as needed.
- `view_cart(cart_id)`: retrieve cart contents and totals.
- `review_cart_and_budget(cart_id, session_id=None)`: summarize the cart and compare it with budget information available in session metadata.
- `approve_cart_tool(cart_id)`: record approval after the user explicitly confirms.
- Order and payment operations are handled by backend commerce services, with audit events supporting traceability.

## Caching

SerpAPI search and product-detail responses use a 24-hour response cache. Reusing recent responses can reduce repeated provider requests and improve responsiveness.

## Request flow

```text
User message
  -> FastAPI
  -> Groq tool-calling agent
  -> product or commerce tool
  -> SerpAPI service / commerce service
  -> structured result
  -> agent response
  -> frontend
```

## Design principles

- **User-directed actions:** the agent helps users explore and manage a cart, with explicit confirmation before checkout approval.
- **Clear tool boundaries:** product discovery and commerce operations are handled by focused backend tools.
- **Efficient retrieval:** normalized product records and response caching support the shopping experience.
- **Reliable payment flow:** payment outcomes are verified by backend services.

## Future scope

- Add product comparison and explainable recommendation tools.
- Expand automated tests for tool selection and structured tool responses.
- Add tracing for latency, cache performance, and per-request model/provider cost.
- Explore query-keyed JSON snapshots for development, debugging, and reproducible demos.

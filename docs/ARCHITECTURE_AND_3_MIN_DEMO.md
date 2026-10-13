# Architecture and 3-Minute Demo — Agentic Commerce

This document describes the currently implemented request path with special attention to the SerpAPI integration.

## Architecture / data flow

~~~mermaid
flowchart TD
    U[User: natural-language shopping request] --> FE[React + TypeScript frontend]
    FE -->|POST /api/chat: message, session_id, cart_id| API[FastAPI chat endpoint]
    API --> AG[Agent orchestration: backend/app/agent/agent.py]
    AG <-->|Prompt, tool schemas, tool results, final response| LLM[Groq API: openai/gpt-oss-20b]
    AG -->|Tool call: search_products| ST[Product search tool]
    AG -->|Tool call: get_product| DT[Product details tool]
    AG -->|Tool call: cart / checkout / orders| CT[Commerce tools and services]

    ST --> SS[SerpAPIService.search_products]
    SS -->|engine=amazon, amazon_domain=amazon.in| SERP[SerpAPI]
    DT --> DS[SerpAPIService.get_product_details]
    DS -->|engine=amazon_product, ASIN, amazon_domain=amazon.in| SERP
    SS <--> CACHE[24-hour SerpAPI response cache]
    DS <--> CACHE
    SERP -->|Product list / product detail JSON| SS
    SS -->|Normalize, filter and limit products| ST
    DS -->|Details, specs, images, add-ons / related products| DT
    ST --> AG
    DT --> AG

    CT <--> DB[(PostgreSQL / SQLAlchemy commerce data)]
    CT --> AG
    AG -->|Final natural-language response + structured data| API
    API --> FE
    FE --> UI[Chat messages, product cards, cart state]

    classDef serp fill:#fff0dc,stroke:#d97706,color:#7c2d12,stroke-width:2px;
    class SERP,SS,DS,CACHE serp;
~~~

### What the SerpAPI integration does

1. **Product discovery:** when the agent chooses the search_products tool, the backend calls SerpAPI's Amazon search engine (engine=amazon) against amazon.in. It passes the query and supported filters, then normalizes fields such as ASIN, title, price, rating, image, and product link.
2. **Product details:** when a user asks about a specific result, the agent can call get_product. The backend uses the result's ASIN with SerpAPI's product-details engine (engine=amazon_product) to retrieve richer data such as description, specifications, images, and available related-product/add-on data.
3. **Caching:** search and product-detail responses use a 24-hour cache to reduce repeat external requests. A cache hit can serve the stored response instead of making another SerpAPI request.
4. **Agent control:** SerpAPI is not called directly from the browser. The frontend sends the user's message to FastAPI; the Groq-powered agent selects a declared backend tool; that tool calls the SerpAPI service; the result is returned to the agent and then to the frontend.

**Important distinction:** Groq is the LLM/tool-calling layer; SerpAPI is the external product-search/product-data provider; FastAPI and the backend tools execute application logic. The LLM does not itself scrape Amazon pages.

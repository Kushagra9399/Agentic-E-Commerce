# Agentic E-Commerce

A conversational shopping agent using a React + TypeScript frontend, FastAPI, Groq tool calling, and SerpAPI's Amazon India results.

## Current implementation

- Natural-language product discovery through the chat interface.
- Groq agent configured for openai/gpt-oss-20b tool calling.
- SerpAPI Amazon India search and product details by ASIN.
- 24-hour cache for SerpAPI responses.
- Normalized product fields such as ASIN, title, price, rating, image, and product link.
- Related products and add-ons when provided by the product-data response.
- Database-backed carts, budget review, explicit approval, orders, payment services, and audit events.

**Important:** the current code still uses SQLAlchemy/PostgreSQL for commerce persistence. The planned JSON-file-per-search/ASIN cache and complete database removal are not implemented in this code snapshot. SerpAPI's response cache is separate from the commerce database.

## Architecture

```text
React + TypeScript -> FastAPI -> Groq tool-calling agent
                                  | product tools -> SerpAPI service -> 24-hour cache / SerpAPI
                                  | cart/order/payment tools -> SQLAlchemy services -> PostgreSQL
```

## Project structure

```text
backend/app/agent/      Agent orchestration, prompts, tools, session helpers
backend/app/api/        API routes
backend/app/core/       Configuration
backend/app/db/         Database session and models
backend/app/services/   SerpAPI/cache, cart, order, payment, audit, inventory
frontend/               React + TypeScript + Vite
 docs/                  Architecture and demo notes
TOOL_REFERENCE.md       Agent tool reference
```

## Setup

Requirements: Python dependencies from backend/requirements.txt, Node.js/npm, PostgreSQL for cart/order operations, Groq API key, SerpAPI key, and Razorpay credentials if testing payment flows.

```bash
git clone https://github.com/Kushagra9399/Agentic-E-Commerce.git
cd Agentic-E-Commerce
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create backend/.env with the variable names consumed by backend/app/core/config.py and the payment services. Common variables include GROQ_API_KEY, SERPAPI_KEY, DATABASE_URL, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET. Never commit secrets. Initialize PostgreSQL and apply the database setup/migrations required by the current backend.

Start the API from backend:

```bash
uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Use the URL printed by Vite. FastAPI's interactive docs are typically at http://localhost:8000/docs.

## Shopping workflow

1. The user submits a natural-language request.
2. The agent selects product search or product details tools.
3. The backend calls SerpAPI and reuses cached responses where available.
4. The user can add a selected ASIN to a database-backed cart.
5. The cart can be reviewed against session budget metadata and requires explicit approval before checkout.
6. Order and payment operations run through backend services. Payment results must be verified server-side.

## Current limitations

- The JSON directory cache described in previous planning is not implemented in the current backend code.
- Removing PostgreSQL requires replacing cart, order, inventory, payment, and audit persistence, not just changing product caching.
- SerpAPI output depends on provider availability and quota; prices and availability may change.
- Use Razorpay test credentials for development.

See TOOL_REFERENCE.md and docs/ARCHITECTURE_AND_3_MIN_DEMO.md for more detail.

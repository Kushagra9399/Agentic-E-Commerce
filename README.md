# Agentic E-Commerce

**Shop smarter through conversation.** Agentic E-Commerce combines an AI tool-calling agent with live Amazon India product discovery to help users find products, explore details, manage a cart, review budgets, and proceed through a controlled checkout workflow.

## Highlights

- **Conversational shopping:** describe what you need in natural language.
- **AI tool orchestration:** Groq-powered agent chooses the appropriate product or commerce operation.
- **Live product discovery:** search Amazon India through SerpAPI.
- **Useful product details:** view product identifiers, pricing, ratings, images, links, and available specifications.
- **Related product discovery:** surface add-ons and recommendations when available from product data.
- **Efficient repeat searches:** a 24-hour cache for SerpAPI responses helps reuse recent results.
- **Cart and budget workflow:** add items, view totals, review budget context, and request explicit approval before checkout.
- **Commerce foundation:** backend services support cart, order, payment, and audit workflows.
- **Modern full-stack design:** React + TypeScript frontend with a FastAPI backend.

## Architecture

```text
React + TypeScript
       |
       v
FastAPI API
       |
       v
Groq tool-calling agent
       |                              |
       v                              v
Product tools                    Commerce services
       |                              |
       v                              v
SerpAPI service                 SQLAlchemy / PostgreSQL
       |
       v
24-hour response cache
       |
       v
Amazon India product data
```

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend API | Python, FastAPI |
| Agent / LLM | Groq tool calling, `openai/gpt-oss-20b` |
| Product data | SerpAPI, Amazon India |
| Response caching | 24-hour SerpAPI response cache |
| Commerce persistence | SQLAlchemy, PostgreSQL |
| Payments | Razorpay integration |
| API exploration | FastAPI interactive docs |

## Project structure

```text
backend/
  app/
    agent/       Agent orchestration, prompts, tools, session helpers
    api/         HTTP API routes
    core/        Configuration
    db/          Database session and models
    services/    Product search/cache, cart, order, payment, audit
frontend/        React + TypeScript + Vite application
docs/            Architecture and demo guide
README.md        Project overview and setup
TOOL_REFERENCE.md Agent tool reference
```

## Getting started

### Requirements

- Python and pip
- Node.js and npm
- PostgreSQL for commerce workflows
- Groq API key
- SerpAPI key
- Razorpay credentials if testing payment functionality

### 1. Clone and install backend dependencies

```bash
git clone https://github.com/Kushagra9399/Agentic-E-Commerce.git
cd Agentic-E-Commerce
cd backend
python -m venv .venv
source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

### 2. Configure environment

Create `backend/.env` and set the environment variables expected by `backend/app/core/config.py` and the payment services. Typical integrations include:

```env
GROQ_API_KEY=your_groq_api_key
SERPAPI_KEY=your_serpapi_key
DATABASE_URL=postgresql://user:password@localhost:5432/agentic_commerce
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

Initialize PostgreSQL and run the database setup or migrations used by the project. Keep credentials private and out of version control.

### 3. Run the backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The API is typically available at `http://localhost:8000`, with interactive documentation at `http://localhost:8000/docs`.

### 4. Run the frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite and ensure the frontend API configuration points to the running backend.

## Typical shopping journey

1. Describe a product need in the chat.
2. The agent selects the product-search tool and returns relevant Amazon India results.
3. Explore a selected product by ASIN for more details and related items.
4. Add products to a cart and review the item list and total.
5. Review budget context and confirm approval before proceeding.
6. Use the backend order and payment workflow to continue checkout.

## Future scope

Potential enhancements that build naturally on the current foundation:

- **Personalized recommendations:** rank products using preferences, previous interactions, and transparent user controls.
- **Smarter comparison:** compare shortlisted products across price, ratings, specifications, and budget fit.
- **Flexible cache storage:** introduce query-keyed JSON snapshots for convenient local inspection and reproducible demos.
- **Modular persistence:** evaluate lightweight storage options for local/demo mode while retaining reliable transactional storage for checkout.
- **Agent observability:** add structured traces for tool selection, latency, cache hits, and cost.
- **Evaluation suite:** create repeatable tests for search relevance, tool selection, budget adherence, and checkout confirmation.
- **Resilient integrations:** improve retry handling, provider error messages, and graceful recovery.
- **Deployment readiness:** add containerized setup, health checks, and CI validation.

## Documentation

- [Agent Tool Reference](TOOL_REFERENCE.md)
- [Architecture and 3-Minute Demo](docs/ARCHITECTURE_AND_3_MIN_DEMO.md)

Product information, prices, and availability are supplied by external services and may change over time. Use test credentials when developing payment flows.

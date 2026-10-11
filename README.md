# 🤖 Agentic Commerce — AI That Searches, Recommends & Transacts

> **An AI-powered commerce agent that understands natural-language shopping requests, discovers relevant products, intelligently upsells and cross-sells, manages carts and orders, and securely guides users through payment.**

---

## 🚀 Overview

Traditional e-commerce requires users to manually search for products, compare alternatives, discover complementary products, manage their cart, and complete checkout.

**Agentic Commerce** brings these steps together through an AI agent.

Instead of navigating through multiple pages, users can simply tell the agent what they need. The agent can:

* 🔎 Understand natural-language product requirements
* 🧠 Perform semantic product search using vector embeddings
* 🎯 Apply constraints such as price, brand, specifications, and stock
* ⬆️ Recommend relevant upgrades
* ➕ Recommend complementary products
* 🛒 Create and manage shopping carts
* 📦 Create orders
* 💳 Initiate Razorpay payments
* 🔐 Verify payments securely on the backend
* 📋 Maintain an audit trail for important commerce actions

The goal is not simply to build a shopping chatbot, but an **AI agent capable of completing a controlled commerce journey while keeping the buyer in control.**

---

## 🎯 Project Objectives

The project focuses on building an intelligent and explainable agentic commerce system that helps merchants increase revenue while improving the customer shopping experience.

### What does it solve?

Traditional product search is often keyword-dependent and does not understand the intent behind complex shopping queries.

For example:

> "I need a Sony 55 inch 4K TV under ₹60,000."

The agent can understand the requirements, retrieve semantically relevant products, apply price and product constraints, and present suitable options.

After a product is selected, the system can also identify:

* **Upsell opportunities** — better or more premium alternatives
* **Cross-sell opportunities** — complementary products that can improve the overall purchase

Each recommendation includes a concise reason explaining **why the customer should consider it**.

The system also introduces controls around AI-driven commerce actions through buyer approval, payment verification, and audit logging.

---

## ✨ Key Features

### 🔎 Semantic Product Search

Uses vector embeddings and PostgreSQL `pgvector` to understand product queries beyond simple keyword matching.

Example:

```text
"Find me a Sony 55 inch 4K TV under ₹60,000"
```

The search system combines:

* Semantic similarity
* Product metadata
* Brand
* Price
* Specifications
* Stock availability

---

### ⬆️ Intelligent Upselling

After adding a product, the system can identify a better or more premium alternative.

The agent explains:

* Why the alternative is better
* Which specifications/features provide the improvement
* The additional cost

Recommendations are optional and never automatically added to the cart.

---

### ➕ Intelligent Cross-Selling

The system identifies complementary products related to the selected item.

For example:

```text
TV
 ↓
Soundbar
```

The agent explains the practical reason why the complementary product is useful instead of simply presenting unrelated recommendations.

---

### 🛒 Agentic Cart Management

The AI agent can:

* Create carts
* Add products
* Retrieve cart contents
* Track quantities
* Calculate totals
* Retrieve cart information when required

The LLM does not need to memorize cart IDs; it can use backend tools to retrieve the relevant cart.

---

### 📦 Order Creation

Once the customer is satisfied with the cart, the agent can create an order.

The system maintains the relationship:

```text
Cart
 ↓
Order
 ↓
Payment
```

The original cart is preserved for transaction history and auditability.

---

### 💳 Razorpay Payment Integration

The application integrates Razorpay Test Mode for the payment flow.

The flow is:

```text
AI Agent
   ↓
Create Order
   ↓
Payment Information
   ↓
Razorpay Checkout
   ↓
Payment
   ↓
Backend Signature Verification
   ↓
Order Marked Paid
   ↓
Inventory Updated
```

Payment is not considered successful based solely on the frontend response.

The backend verifies the payment before completing the transaction.

---

### 🔐 Explainable & Controlled Transactions

Because an AI agent can perform commerce-related actions, the system introduces safeguards around important operations.

Important events are recorded through an audit trail, including:

* Order creation
* Buyer approval
* Payment verification
* Transaction-related actions

The agent provides recommendations but **never assumes that a user accepted a recommendation**.

---

## 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │      User           │
                         │ Natural Language    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   React Frontend   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    FastAPI API      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     AI Agent        │
                         │   Groq / LLM        │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
      ┌───────────────┐    ┌────────────────┐    ┌────────────────┐
      │ Product Search│    │ Recommendations│    │ Cart / Orders  │
      │    Tools      │    │  Upsell/Cross  │    │     Tools      │
      └───────┬───────┘    └───────┬────────┘    └───────┬────────┘
              │                    │                     │
              └────────────────────┼─────────────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │ PostgreSQL +        │
                         │ pgvector            │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Product Embeddings │
                         └─────────────────────┘

                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Razorpay Test Mode │
                         └─────────────────────┘
```

---

## 🧠 Agent Tool Architecture

The LLM interacts with the commerce backend through specialized tools.

### Product Tools

```text
search_products()
get_product()
```

### Recommendation Tools

```text
recommend_upgrade()
recommend_addons()
```

### Cart Tools

```text
create_cart()
add_to_cart()
get_cart()
```

### Order Tools

```text
create_order()
get_order()
get_orders()
get_all_carts()
```

The LLM decides which tool is required based on the user's request, while the actual business logic is executed by backend services.

---

## 🔎 Product Search Pipeline

The product search pipeline combines semantic retrieval with structured filtering.

```text
Product Dataset
      │
      ▼
Data Cleaning & Enrichment
      │
      ▼
Search Text Construction
      │
      ▼
Vector Embeddings
      │
      ▼
PostgreSQL + pgvector
      │
      ▼
User Query
      │
      ▼
Semantic Similarity Search
      │
      ▼
Metadata / Specification Filters
      │
      ▼
Relevant Products
```

This allows the system to handle natural-language queries while still respecting important constraints such as price and stock.

---

## 📊 Dataset

The initial product catalog is based on the **Croma Electronic Products Dataset** available on Kaggle.

**Dataset:**
https://www.kaggle.com/datasets/hetulmehta/croma-electronic-products-dataset

The raw dataset was adapted for the agentic commerce workflow.

The data pipeline added and/or normalized fields required by the application, including:

```text
product_id
merchant_id
name
brand
category
overview
images
specification
search_text
market_price
discount_percent
sale_price
stock
is_active
```

The dataset was also processed to handle missing information, duplicate product names, and inconsistent product metadata.

### Dataset Location

Place the downloaded dataset inside:

```text
backend/
└── scripts/
    └── data/
        └── <dataset-file>
```

> The dataset is sourced from Kaggle. Please refer to the original dataset page for its licensing and usage terms.

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* CSS / Bootstrap

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic

### AI / ML

* LLM-based tool-calling agent
* Groq API
* Vector embeddings
* Semantic search

### Database

* PostgreSQL
* pgvector

### Payments

* Razorpay Test Mode

### Infrastructure / Tools

* Git
* REST APIs
* Docker *(if enabled in deployment)*

---

## 📁 Project Structure

```text
agentic-commerce/
│
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── tools.py
│   │   │   └── ...
│   │   │
│   │   ├── api/
│   │   │   └── routes/
│   │   │
│   │   ├── db/
│   │   │   └── models.py
│   │   │
│   │   ├── services/
│   │   │   ├── recommendation_service.py
│   │   │   ├── payment_verification_service.py
│   │   │   └── ...
│   │   │
│   │   └── main.py
│   │
│   └── scripts/
│       └── data/
│           └── <dataset>
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── config/
│   │
│   └── ...
│
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have:

* Python 3.10+
* Node.js 18+
* PostgreSQL
* PostgreSQL `pgvector` extension
* Groq API key
* Razorpay Test Mode credentials

---

## 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_NAME>
```

---

## 2. Backend Setup

```bash
cd backend

python -m venv venv
source venv/bin/activate
```

For Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Environment Variables

Create a `.env` file inside the backend directory.

```env
DATABASE_URL=postgresql://username:password@localhost:5432/agentic_commerce

GROQ_API_KEY=your_groq_api_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Do not commit `.env` files or API keys to GitHub.

---

## 4. Setup PostgreSQL

Create the database:

```sql
CREATE DATABASE agentic_commerce;
```

Enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run the project's database setup/migrations according to the scripts included in the backend.

---

## 5. Add the Dataset

Download the Croma Electronic Products Dataset from Kaggle:

https://www.kaggle.com/datasets/hetulmehta/croma-electronic-products-dataset

Place the dataset inside:

```text
backend/scripts/data/
```

Then run the provided data-processing / embedding scripts.

---

## 6. Start the Backend

From the `backend` directory:

```bash
uvicorn app.main:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

## 7. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at the URL shown by Vite.

---

## 🧪 Example Agent Interaction

### Product Search

**User:**

```text
I need a Sony 55 inch 4K TV under ₹60,000.
```

**Agent:**

```text
Here are the most relevant products matching your requirements...
```

---

### Add to Cart

**User:**

```text
Add the first one to my cart.
```

The agent adds the product and automatically evaluates relevant:

```text
⬆️ Upgrade opportunities
➕ Cross-sell opportunities
```

---

### Recommendation

The agent might respond with:

```text
Sony 55-inch 4K TV — ₹52,999

Added to your cart.

You may also consider:

Sony Soundbar — ₹8,999
A useful complement to the TV that can improve the overall audio experience.
```

The user must explicitly choose whether to add the recommendation.

---

### Checkout

**User:**

```text
Place the order.
```

The agent creates the order and the frontend presents the Razorpay payment flow.

---

## 🔐 Payment & Transaction Safety

The payment system follows a backend-verified flow:

```text
Create Order
     ↓
Create Razorpay Payment Order
     ↓
Razorpay Checkout
     ↓
Payment
     ↓
Payment Signature
     ↓
Backend Verification
     ↓
Mark Order Paid
     ↓
Update Inventory
```

The frontend response alone is **not treated as proof of successful payment**.

This prevents the application from marking orders as paid before the backend verifies the transaction.

---

## 📋 Auditability

Important commerce events are recorded through an audit system.

Example events include:

```text
ORDER_CREATED
BUYER_APPROVED
PAYMENT_VERIFIED
```

This provides traceability for AI-driven commerce actions and makes it possible to understand what happened during a transaction.

---

## 🧩 Challenges & Technical Learnings

During development, we faced several practical challenges:

### 1. Dataset Quality

The initial dataset contained missing values, duplicate product names, and inconsistent product information.

**Solution:** We cleaned and enriched the dataset and created additional fields required for search, pricing, inventory, and merchant workflows.

### 2. Semantic Search

Keyword search was insufficient for natural-language shopping queries.

**Solution:** We introduced vector embeddings and pgvector-based semantic retrieval combined with structured filtering.

### 3. Recommendation Quality

Initially, recommendations depended too much on the LLM deciding when to call recommendation tools.

**Solution:** Recommendation logic was moved into backend services so that relevant upsell and cross-sell opportunities are automatically evaluated after a product is added.

### 4. LLM Context / Token Limits

Large product results and long conversation histories could consume significant LLM context.

**Solution:** We limited retrieved products, returned only relevant product fields, and controlled the amount of conversation history passed to the model.

### 5. Agent → Frontend Payment Flow

Initially, the LLM could create an order but the frontend did not know that a payment action was required.

**Solution:** The agent returns structured order and payment information after order creation, allowing the frontend to trigger the Razorpay payment interface.

### 6. Payment Verification

A frontend success response cannot be trusted as proof of payment.

**Solution:** Payment verification happens on the backend before updating order status and inventory.

---

## 🎥 Demo Flow

The complete application demonstrates:

```text
Natural Language Query
        ↓
Semantic Product Search
        ↓
Product Selection
        ↓
Add to Cart
        ↓
Upsell + Cross-sell
        ↓
Cart Review
        ↓
Order Creation
        ↓
Razorpay Checkout
        ↓
Backend Payment Verification
        ↓
Successful Order
```

---

## 💡 Why Agentic Commerce?

The project goes beyond a traditional recommendation engine or shopping chatbot.

A traditional system:

```text
Search → Product → Cart → Checkout
```

Our agentic system:

```text
Understand Intent
       ↓
Search
       ↓
Reason About Products
       ↓
Recommend
       ↓
Manage Cart
       ↓
Create Order
       ↓
Initiate Payment
       ↓
Verify Transaction
```

The objective is to move from **AI that talks about products** to **AI that can safely act within a commerce workflow**.

---

## 🔮 Future Improvements

Potential future improvements include:

* Personalized recommendations based on customer history
* Multi-merchant product discovery
* Real-time inventory synchronization
* More advanced product comparison
* Conversational order tracking
* Personalized promotions
* Dynamic pricing and campaign optimization
* Multi-agent commerce workflows
* Improved long-term conversation memory
* Production-grade authentication and authorization

---

## 🏆 Hackathon Focus

This project was built around the concept of:

> **AI Growth & Agentic Commerce**

The core idea is to make merchants **transactable by AI buyers** while ensuring that AI-driven commerce actions remain explainable, bounded, and auditable.

---

## 📄 Dataset Attribution

Product data is based on:

**Croma Electronic Products Dataset**

Kaggle:
https://www.kaggle.com/datasets/hetulmehta/croma-electronic-products-dataset

Please refer to the original Kaggle dataset page for the dataset's license and attribution requirements.

---

## 👨‍💻 Built With

**FastAPI · React · PostgreSQL · pgvector · Python · Groq · Razorpay · Vector Embeddings · LLM Tool Calling**

---

## ⭐ If you find this project interesting

Feel free to explore the repository, try the agent locally, and experiment with different commerce workflows.

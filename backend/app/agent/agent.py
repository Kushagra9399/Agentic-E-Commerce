import json
import time
import random
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime

from groq import Groq
import sys

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import (
    search_products,
    get_product_info,
    create_cart,
    add_to_cart,
    view_cart,
    review_cart_and_budget,
    approve_cart_tool,
    create_order,
    list_orders,
    get_order_status,
)

from app.core.config import settings
from app.agent.session import get_session


# ============================================================
# CONFIG
# ============================================================

MAX_TOOL_ROUNDS = 5
MAX_HISTORY_MESSAGES = 14
MAX_TOOL_RESULT_CHARS = 8000
MAX_PROMPT_TOKENS = 4000
MAX_GROQ_RETRIES = 5
BACKOFF_BASE_SECONDS = 1
BACKOFF_MAX_SECONDS = 30

MODEL = "openai/gpt-oss-20b"
# Use a separate tool-calling model if GPT-OSS emits an invalid tool name.
FALLBACK_TOOL_MODEL = "llama-3.3-70b-versatile"


# ============================================================
# GROQ CLIENT
# ============================================================

client = Groq(
    api_key=settings.GROQ_API_KEY
)


# ============================================================
# SERIALIZATION
# ============================================================

def json_serializer(obj):
    """
    Convert common Python/database types into JSON-safe values.
    """

    if isinstance(obj, (datetime, date)):
        return obj.isoformat()

    if isinstance(obj, Decimal):
        return float(obj)

    if isinstance(obj, UUID):
        return str(obj)

    raise TypeError(
        f"Object of type {type(obj).__name__} "
        "is not JSON serializable"
    )


def safe_json_dumps(data):
    """
    Serialize data safely for the LLM.
    """

    return json.dumps(
        data,
        ensure_ascii=False,
        default=json_serializer,
    )


# ============================================================
# COMPACT PRODUCT SERIALIZATION
# ============================================================

def compact_product(product):
    """
    Return only information the LLM normally needs when
    selecting/recommending products.

    This is intentionally much smaller than returning the
    complete database object. Optimized for token limits.
    Handles both database format and SerpAPI format.
    """

    if not isinstance(product, dict):
        return product

    # Handle SerpAPI format (asin, title, price) and database format (id, name, sale_price)
    product_id = (
        product.get("asin")  # SerpAPI format
        or product.get("id")
        or product.get("product_id")
        or ""
    )
    
    title = (
        product.get("title")  # SerpAPI format
        or product.get("name")  # Database format
        or ""
    )
    
    price = (
        product.get("price")  # SerpAPI format
        or product.get("sale_price")  # Database format
        or product.get("market_price")  # Database fallback
        or None
    )
    
    discount = product.get("discount_percent")
    rating = product.get("rating")
    
    return {
        "id": str(product_id),
        "asin": product.get("asin") or str(product_id),
        "name": title,
        "title": title,
        "brand": product.get("brand", "Unknown"),
        "price": price,
        "sale_price": price,
        "original_price": product.get("original_price"),
        "market_price": product.get("original_price") or product.get("market_price"),
        "discount": discount if discount is not None else product.get("discount"),
        "discount_percent": discount if discount is not None else product.get("discount_percent"),
        "rating": rating,
        "reviews": product.get("reviews") or product.get("review_count"),
        "review_count": product.get("review_count") or product.get("reviews"),
        "image": product.get("image") or product.get("thumbnail"),
        "link": product.get("link"),
        "stock": product.get("stock", 1 if product.get("in_stock", True) else 0),
        "source": product.get("source", "serpapi_amazon"),
        "reason": product.get("reason"),
    }


def compact_product_details(product):
    """
    Return more information when the user explicitly asks
    about a particular product. Keep specs concise for tokens.
    Handles both database and SerpAPI formats.
    """

    if not isinstance(product, dict):
        return product

    result = compact_product(product)

    # Handle both formats: database "specification" (string) and SerpAPI "specifications" (dict)
    spec = product.get("specifications") or product.get("specification")
    
    if spec:
        if isinstance(spec, dict):
            # Convert dict to readable string
            spec = ", ".join([f"{k}: {v}" for k, v in spec.items()])
        if isinstance(spec, str) and len(spec) > 200:
            spec = spec[:200] + "..."

    result.update({
        "specifications": spec,
        "description": product.get("description"),
        "stock": product.get("stock"),
        "link": product.get("link"),
        "image": product.get("image") or product.get("thumbnail"),
        "images": product.get("images"),
        "in_stock": product.get("in_stock"),
    })

    for key in ("add_ons", "recommendations"):
        items = product.get(key) or []
        result[key] = [
            compact_product(item)
            for item in items[:3]
            if isinstance(item, dict)
        ]

    return result


def compact_product_list(result):
    """
    Compact search/recommendation results.
    """

    if isinstance(result, list):
        return {
            "products": [
                compact_product(item)
                if isinstance(item, dict)
                else item
                for item in result
            ]
        }

    if not isinstance(result, dict):
        return result

    # Common result formats
    products = (
        result.get("products")
        or result.get("results")
        or result.get("items")
    )

    if isinstance(products, list):

        compacted = [
            compact_product(item)
            if isinstance(item, dict)
            else item
            for item in products
        ]

        compact_result = {
            "products": compacted,
            "count": result.get("count", result.get("found", len(compacted))),
        }
        for key in ("query", "error", "from_cache", "has_more", "related_searches"):
            if key in result:
                compact_result[key] = result[key]
        return compact_result

    return result


# ============================================================
# COMPACT CART SERIALIZATION
# ============================================================

def compact_cart(cart):
    """
    Keep only cart information relevant to the LLM.
    """

    if not isinstance(cart, dict):
        return cart

    if cart.get("success") is False:
        return cart

    # Handle both direct cart responses and nested cart details.
    nested_cart = cart.get("cart")
    cart_obj = nested_cart if isinstance(nested_cart, dict) else cart

    result = {
        "cart_id": cart_obj.get("id") or cart_obj.get("cart_id"),
        "status": cart_obj.get("status"),
        "total": cart_obj.get("total", cart_obj.get("subtotal")),
        "currency": cart_obj.get("currency", "INR"),
    }

    if cart.get("success") is not None:
        result["success"] = cart["success"]
    if cart.get("message"):
        result["message"] = cart["message"]
    if cart.get("error"):
        result["error"] = cart["error"]

    items = cart_obj.get("items")

    if isinstance(items, list):

        result["items"] = []

        for item in items:

            if not isinstance(item, dict):
                continue

            product = item.get("product")

            compact_item = {
                "product_id": (
                    item.get("product_id")
                    or (
                        product.get("id")
                        if isinstance(product, dict)
                        else None
                    )
                ),
                "name": (
                    item.get("name")
                    or (
                        product.get("name")
                        if isinstance(product, dict)
                        else None
                    )
                ),
                "quantity": item.get("quantity", 1),
                "unit_price": (
                    item.get("unit_price")
                    or item.get("price")
                    or (
                        product.get("sale_price")
                        if isinstance(product, dict)
                        else None
                    )
                ),
            }

            result["items"].append(compact_item)

    return result


# ============================================================
# COMPACT ORDER SERIALIZATION
# ============================================================

def compact_order(order):
    """
    Keep order information needed by the conversational agent.
    """

    if not isinstance(order, dict):
        return order

    return {
        "id": order.get("id") or order.get("order_id"),
        "status": order.get("status"),
        "payment_status": order.get("payment_status"),
        "amount": order.get("amount") or order.get("total"),
        "currency": order.get("currency", "INR"),
        "created_at": order.get("created_at"),
        "items": order.get("items"),
    }


# ============================================================
# LIMIT TOOL OUTPUT
# ============================================================

def limit_tool_result(result):
    """
    Final safety net for token limits.

    Even if one of the underlying tools accidentally returns
    a large object, don't send an unlimited amount of data
    into the LLM context.
    """

    serialized = safe_json_dumps(result)

    if len(serialized) <= MAX_TOOL_RESULT_CHARS:
        return result

    # Truncate aggressively for token limits
    return {
        "success": False,
        "error": "Tool result truncated (too large).",
        "truncated": True,
        "count": result.get("count", 0),
        "summary": serialized[:MAX_TOOL_RESULT_CHARS],
    }


# ============================================================
# PRODUCT TOOLS
# ============================================================

SEARCH_PRODUCTS_TOOL = {
    "type": "function",
    "function": {
        "name": "search_products",
        "description": "Search Amazon products by query and optional filters.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "max_price": {"type": "number"},
                "min_price": {"type": "number"},
                "brand": {"type": "string"},
                "limit": {"type": "integer", "default": 5}
            },
            "required": ["query"]
        }
    }
}

GET_PRODUCT_TOOL = {
    "type": "function",
    "function": {
        "name": "get_product",
        "description": "Fetch one product's SerpAPI details plus cached add-ons and recommendations.",
        "parameters": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"}
            },
            "required": ["product_id"]
        }
    }
}


def search_products_tool(query, max_price=None, min_price=None, brand=None, limit=5):
    result = search_products(
        query=query,
        max_price=max_price,
        min_price=min_price,
        brand=brand,
        limit=max(1, min(int(limit), 10)),
    )
    return compact_product_list(result)


def get_product_tool(product_id):
    result = get_product_info(asin=product_id)
    if not result.get("found"):
        return {"found": False, "error": result.get("error", "Product not found")}
    return compact_product_details(result)


# ============================================================
# TOOL 3: CART
# ============================================================

CART_TOOL = {
    "type": "function",
    "function": {
        "name": "cart",
        "description": (
            "Manage shopping carts. "
            "Use action='create' to create a cart. "
            "Use 'add' only when the buyer explicitly asks "
            "to add a product. "
            "Use 'view' to inspect a cart. "
            "Use 'list' to see the buyer's carts."
        ),
        "parameters": {
            "type": "object",
            "properties": {

                "action": {
                    "type": "string",
                    "enum": [
                        "create",
                        "add",
                        "view",
                        "list"
                    ]
                },

                "cart_id": {
                    "type": "string"
                },

                "product_id": {
                    "type": "string"
                },

                "quantity": {
                    "type": "integer",
                    "default": 1
                }
            },

            "required": [
                "action"
            ]
        }
    }
}


def cart(
    action,
    cart_id=None,
    product_id=None,
    quantity=1,
):
    """
    Unified cart operation.
    """

    if action == "create":

        result = create_cart()

        return compact_cart(result)

    if action == "add":

        if not cart_id:
            return {
                "success": False,
                "error": "cart_id is required."
            }

        if not product_id:
            return {
                "success": False,
                "error": "product_id is required."
            }

        result = add_to_cart(
            cart_id=cart_id,
            asin=product_id,
            quantity=quantity,
        )

        if isinstance(result, dict) and result.get("success") is False:
            return result

        return compact_cart(result)

    if action == "view":

        if not cart_id:
            return {
                "success": False,
                "error": "cart_id is required."
            }

        result = view_cart(
            cart_id=cart_id
        )

        return compact_cart(result)

    if action == "list":

        result = {"carts": []}

        # Keep cart history small
        if isinstance(result, list):

            return {
                "carts": [
                    compact_cart(item)
                    for item in result[:10]
                ]
            }

        if isinstance(result, dict):

            carts = (
                result.get("carts")
                or result.get("items")
                or result.get("results")
            )

            if isinstance(carts, list):

                return {
                    "carts": [
                        compact_cart(item)
                        for item in carts[:10]
                    ]
                }

        return result

    return {
        "success": False,
        "error": "Invalid cart action."
    }


# ============================================================
# TOOL 4: CHECKOUT
# ============================================================

CHECKOUT_TOOL = {
    "type": "function",
    "function": {
        "name": "checkout",
        "description": (
            "Handle purchase checkout. "
            "Use action='get_approval_summary' to get cart summary and check budget before approval. "
            "Use action='approve' ONLY when the buyer has "
            "explicitly confirmed the final cart total. "
            "Use action='create_payment' only after the cart "
            "has been approved. "
            "Never infer approval from an address, payment method, "
            "or a request to checkout."
        ),
        "parameters": {
            "type": "object",
            "properties": {

                "action": {
                    "type": "string",
                    "enum": [
                        "get_approval_summary",
                        "approve",
                        "create_payment"
                    ]
                },

                "cart_id": {
                    "type": "string"
                },

                "session_id": {
                    "type": "string"
                }
            },

            "required": [
                "action",
                "cart_id"
            ]
        }
    }
}


def checkout(
    action,
    cart_id,
    session_id=None,
):
    """
    Unified checkout operation.

    The backend remains responsible for enforcing the
    purchase state machine.
    """

    if not cart_id:
        return {
            "success": False,
            "error": "cart_id is required."
        }

    # --------------------------------------------------------
    # APPROVAL SUMMARY (WITH BUDGET CHECK)
    # --------------------------------------------------------

    if action == "get_approval_summary":

        result = review_cart_and_budget(
            cart_id=cart_id,
            session_id=session_id
        )

        return result

    # --------------------------------------------------------
    # APPROVAL
    # --------------------------------------------------------

    if action == "approve":

        result = approve_cart_tool(
            cart_id=cart_id
        )

        if isinstance(result, dict):

            return {
                "success": result.get("success", True),
                "cart_id": cart_id,
                "status": result.get(
                    "status",
                    "approved"
                ),
                "message": result.get(
                    "message",
                    "Cart approved for purchase."
                ),
            }

        return result

    # --------------------------------------------------------
    # PAYMENT ORDER
    # --------------------------------------------------------

    if action == "create_payment":

        result = create_order(
            cart_id=cart_id
        )

        return result

    return {
        "success": False,
        "error": "Invalid checkout action."
    }


# ============================================================
# TOOL 5: ORDERS
# ============================================================

ORDERS_TOOL = {
    "type": "function",
    "function": {
        "name": "orders",
        "description": (
            "Retrieve buyer order information. "
            "Use action='list' for order history or "
            "action='details' for a specific order."
        ),
        "parameters": {
            "type": "object",
            "properties": {

                "action": {
                    "type": "string",
                    "enum": [
                        "list",
                        "details"
                    ]
                },

                "order_id": {
                    "type": "string"
                },

                "status": {
                    "type": "string"
                },

                "limit": {
                    "type": "integer",
                    "default": 10
                }
            },

            "required": [
                "action"
            ]
        }
    }
}


def orders(
    action,
    order_id=None,
    status=None,
    limit=10,
):
    """
    Unified order operation.
    """

    if action == "details":

        if not order_id:
            return {
                "success": False,
                "error": "order_id is required."
            }

        result = get_order_status(
            order_id=order_id
        )

        return compact_order(result)

    if action == "list":

        result = list_orders(
            status=status,
            limit=min(limit, 10),
        )

        if isinstance(result, list):

            return {
                "orders": [
                    compact_order(order)
                    for order in result
                ]
            }

        if isinstance(result, dict):

            order_list = (
                result.get("orders")
                or result.get("items")
                or result.get("results")
            )

            if isinstance(order_list, list):

                return {
                    "orders": [
                        compact_order(order)
                        for order in order_list[:10]
                    ]
                }

        return result

    return {
        "success": False,
        "error": "Invalid orders action."
    }


# ============================================================
# FINAL TOOL LIST
# ============================================================

tools = [
    SEARCH_PRODUCTS_TOOL,
    GET_PRODUCT_TOOL,
    CART_TOOL,
    CHECKOUT_TOOL,
    ORDERS_TOOL,
]


# ============================================================
# TOOL DISPATCH
# ============================================================

TOOL_FUNCTIONS = {
    "search_products": search_products_tool,
    "get_product": get_product_tool,
    "cart": cart,
    "checkout": checkout,
    "orders": orders,
}


def execute_tool(tool_name, arguments):
    """
    Centralized tool dispatcher.
    """

    function = TOOL_FUNCTIONS.get(tool_name)

    if not function:

        return {
            "success": False,
            "error": f"Unknown tool: {tool_name}"
        }

    try:

        result = function(
            **arguments
        )

        return limit_tool_result(
            result
        )

    except Exception as e:

        print(
            f"Tool '{tool_name}' failed:",
            repr(e)
        )

        return {
            "success": False,
            "error": (
                f"Tool execution failed: {str(e)}"
            )
        }


# ============================================================
# LLM CALL
# ============================================================

def validate_tools():
    """
    Validate tool definitions to ensure they don't have
    encoding issues or special characters.
    """
    for tool in tools:
        if tool.get("type") == "function":
            func = tool.get("function", {})
            name = func.get("name", "")
            # Ensure tool name is alphanumeric + underscore only
            if not name or not name.replace("_", "").isalnum():
                print(
                    f"WARNING: Tool name '{name}' has invalid characters. "
                    "This may cause Groq API errors."
                )


def estimate_prompt_tokens(messages):
    """
    Estimate prompt tokens conservatively without adding a tokenizer dependency.
    Includes message payloads and tool schemas; the estimate is approximate.
    """
    payload = safe_json_dumps(messages) + safe_json_dumps(tools)
    return (len(payload) + 3) // 4


def trim_prompt_to_token_limit(messages, max_tokens=MAX_PROMPT_TOKENS):
    """
    Keep the system instructions and remove the oldest conversation content
    first until the prompt estimate fits the configured budget.
    """
    if not messages:
        return messages

    system_message = next(
        (message for message in messages if message.get("role") == "system"),
        None,
    )
    conversation = [
        message for message in messages
        if message.get("role") != "system"
    ]

    while conversation and estimate_prompt_tokens(
        ([system_message] if system_message else []) + conversation
    ) > max_tokens:
        # Remove a complete oldest turn, including any tool-call/result messages,
        # rather than leaving orphaned tool messages in the API conversation.
        next_user_index = next(
            (index for index, message in enumerate(conversation)
             if index > 0 and message.get("role") == "user"),
            None,
        )
        if next_user_index is not None:
            del conversation[:next_user_index]
        else:
            # Keep the current user request; if it alone is too large, fail clearly.
            break

    trimmed = ([system_message] if system_message else []) + conversation
    estimated_tokens = estimate_prompt_tokens(trimmed)
    print(
        f"[Groq] Estimated prompt size: {estimated_tokens} tokens "
        f"(limit: {max_tokens})"
    )

    if estimated_tokens > max_tokens:
        raise ValueError(
            f"The system prompt, conversation, and tool schemas exceed the "
            f"{max_tokens}-token prompt budget. Shorten the system prompt or tool "
            "schemas, or reduce the current user message."
        )

    messages[:] = trimmed
    return messages


def is_rate_limit_error(error):
    """
    Retry only actual HTTP rate-limit responses.

    Groq may return HTTP 413 with an error code such as
    'rate_limit_exceeded' when the request exceeds the TPM budget.
    Retrying the same oversized request cannot fix that condition.
    """
    return getattr(error, "status_code", None) == 429


def is_tool_call_validation_error(error):
    """
    Detect Groq rejecting a malformed model-generated tool name, such as
    'cart<|channel|>commentary'. The rejected call never reaches our dispatcher,
    so retrying the same model cannot normalize it after the fact.
    """
    message = str(error).lower()
    return (
        getattr(error, "status_code", None) == 400
        and (
            "tool call validation failed" in message
            or "tool_use_failed" in message
            or "which was not in request.tools" in message
        )
    )


def retry_after_seconds(error):
    response = getattr(error, "response", None)
    headers = getattr(response, "headers", None)
    if headers:
        value = headers.get("retry-after") or headers.get("x-ratelimit-reset-requests")
        if value:
            try:
                return max(0.0, float(value))
            except (TypeError, ValueError):
                pass
    return None


def call_llm(messages):
    """Call Groq with prompt trimming and bounded exponential-backoff retries."""
    validate_tools()
    trim_prompt_to_token_limit(messages)

    for attempt in range(MAX_GROQ_RETRIES + 1):
        try:
            # Recheck immediately before every request in case history changed.
            trim_prompt_to_token_limit(messages)
            return client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=400,
            )
        except Exception as error:
            if is_tool_call_validation_error(error):
                # Some model generations can incorrectly append channel tokens
                # to a function name. Groq rejects that response before it reaches
                # our code, so retry the same conversation with a tool-use fallback.
                print(
                    f"Groq rejected a malformed tool call from {MODEL}; "
                    f"retrying once with {FALLBACK_TOOL_MODEL}.",
                    file=sys.stderr,
                )
                try:
                    trim_prompt_to_token_limit(messages)
                    return client.chat.completions.create(
                        model=FALLBACK_TOOL_MODEL,
                        messages=messages,
                        tools=tools,
                        tool_choice="auto",
                        max_tokens=400,
                    )
                except Exception as fallback_error:
                    print(
                        f"Fallback model {FALLBACK_TOOL_MODEL} failed: "
                        f"{fallback_error}",
                        file=sys.stderr,
                    )
                    raise

            if not is_rate_limit_error(error) or attempt >= MAX_GROQ_RETRIES:
                if is_rate_limit_error(error):
                    print(
                        f"Groq rate limit persisted after {MAX_GROQ_RETRIES} retries.",
                        file=sys.stderr,
                    )
                    raise
                error_msg = str(error)
                print(f"Groq API error: {error_msg}", file=sys.stderr)
                raise

            exponential_delay = min(
                BACKOFF_MAX_SECONDS,
                BACKOFF_BASE_SECONDS * (2 ** attempt),
            )
            wait_time = retry_after_seconds(error)
            if wait_time is None:
                wait_time = exponential_delay + random.uniform(0, 0.5)
            else:
                wait_time = min(BACKOFF_MAX_SECONDS, wait_time)

            print(
                f"Groq rate limit hit (attempt {attempt + 1}/"
                f"{MAX_GROQ_RETRIES + 1}). Retrying in {wait_time:.1f}s...",
                file=sys.stderr,
            )
            time.sleep(wait_time)


# ============================================================
# NORMALIZE ASSISTANT MESSAGE
# ============================================================

def normalize_assistant_message(message):
    """
    Convert Groq SDK message object into a plain dictionary.

    This keeps session history serializable and predictable.
    """

    result = {
        "role": "assistant",
        "content": message.content or "",
    }

    if message.tool_calls:

        result["tool_calls"] = []

        for tool_call in message.tool_calls:

            result["tool_calls"].append({
                "id": tool_call.id,
                "type": "function",
                "function": {
                    "name": tool_call.function.name,
                    "arguments": tool_call.function.arguments,
                }
            })

    return result


# ============================================================
# HISTORY MANAGEMENT
# ============================================================

def trim_history(history):
    """
    Prevent unbounded conversation growth.
    """

    if len(history) <= MAX_HISTORY_MESSAGES:
        return history

    retained = history[-(MAX_HISTORY_MESSAGES - 1):]

    while retained and retained[0].get("role") == "tool":
        retained.pop(0)

    history[:] = [history[0], *retained]
    return history


# ============================================================
# CREATE PAYMENT RESPONSE
# ============================================================

def build_payment_response(result):
    """
    Convert create_order result into a frontend-friendly
    payment payload.
    """

    if not isinstance(result, dict):
        return None

    if not result.get("success"):
        return None

    order_obj = result.get("order") or {}
    payment_obj = result.get("payment") or {}

    payment_obj = dict(payment_obj)

    payment_obj["order_id"] = (
        payment_obj.get("order_id")
        or order_obj.get("id")
    )

    return {
        "message": (
            f"Created order {order_obj.get('id')} "
            "for payment. Click the Pay button to continue."
        ),
        "order": order_obj,
        "payment": payment_obj,
    }


# ============================================================
# MAIN CHAT FUNCTION
# ============================================================

def chat(
    session_id: str,
    user_message: str,
):
    """
    Main conversational agent.

    Flow:

        User
          ↓
        LLM
          ↓
        One of 5 tools
          ↓
        Compact result
          ↓
        LLM
          ↓
        Final response
    """

    try:

        history = get_session(
            session_id
        )

        # --------------------------------------------------------
        # INITIALIZE SYSTEM MESSAGE
        # --------------------------------------------------------

        if not history:

            history.append({
                "role": "system",
                "content": SYSTEM_PROMPT,
            })

        # --------------------------------------------------------
        # USER MESSAGE
        # --------------------------------------------------------

        history.append({
            "role": "user",
            "content": user_message,
        })

        # --------------------------------------------------------
        # LIMIT HISTORY
        # --------------------------------------------------------

        history = trim_history(
            history
        )

        # --------------------------------------------------------
        # AGENT LOOP
        # --------------------------------------------------------

        for round_number in range(
            MAX_TOOL_ROUNDS
        ):

            response = call_llm(
                messages=history
            )

            message = (
                response
                .choices[0]
                .message
            )

            # ----------------------------------------------------
            # FINAL ANSWER
            # ----------------------------------------------------

            if not message.tool_calls:

                assistant_content = (
                    message.content or ""
                )

                history.append({
                    "role": "assistant",
                    "content": assistant_content,
                })

                return assistant_content

            # ----------------------------------------------------
            # STORE ASSISTANT TOOL CALL
            # ----------------------------------------------------

            normalized_message = (
                normalize_assistant_message(
                    message
                )
            )

            history.append(
                normalized_message
            )

            print(
                f"Tool round {round_number + 1}: "
                f"{len(message.tool_calls)} tool call(s)"
            )

            # ----------------------------------------------------
            # EXECUTE TOOLS
            # ----------------------------------------------------

            for tool_call in message.tool_calls:

                tool_name = (
                    tool_call
                    .function
                    .name
                )

                try:

                    arguments = json.loads(
                        tool_call
                        .function
                        .arguments
                        or "{}"
                    )

                except json.JSONDecodeError:

                    result = {
                        "success": False,
                        "error": (
                            "Invalid JSON arguments "
                            "generated for the tool."
                        )
                    }

                    history.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": safe_json_dumps(
                            result
                        ),
                    })

                    continue

                print(
                    f"Executing tool: {tool_name}",
                    arguments
                )

                # ------------------------------------------------
                # EXECUTE (with session context for checkout)
                # ------------------------------------------------

                if tool_name == "checkout":
                    arguments["session_id"] = session_id

                result = execute_tool(
                    tool_name,
                    arguments
                )

                print(f"Tool {tool_name} result: {result}")

                # ------------------------------------------------
                # PAYMENT ORDER
                # ------------------------------------------------

                if tool_name == "checkout":

                    action = arguments.get(
                        "action"
                    )

                    if action == "create_payment":

                        payment_response = (
                            build_payment_response(
                                result
                            )
                        )

                        if payment_response:

                            history.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": safe_json_dumps(
                                    result
                                ),
                            })

                            history.append({
                                "role": "assistant",
                                "content": safe_json_dumps(
                                    payment_response
                                ),
                            })

                            return payment_response

                # ------------------------------------------------
                # STORE TOOL RESULT
                # ------------------------------------------------

                history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": safe_json_dumps(
                        result
                    ),
                })

        # --------------------------------------------------------
        # TOOL LIMIT
        # --------------------------------------------------------

        fallback_message = (
            "I wasn't able to complete the request "
            "within the allowed number of steps. "
            "Please try simplifying your request."
        )

        history.append({
            "role": "assistant",
            "content": fallback_message,
        })

        return fallback_message

    except RuntimeError as e:
        # Groq API errors or other runtime errors
        error_msg = str(e)
        print(f"Runtime error in chat: {error_msg}", file=sys.stderr)
        # Return error as JSON string for frontend parsing
        return json.dumps({
            "error": "Service Error",
            "message": error_msg,
            "type": "groq_api_error"
        })

    except Exception as e:
        # Catch all unexpected errors
        error_msg = str(e)
        print(f"Unexpected error in chat: {error_msg}", file=sys.stderr)
        return json.dumps({
            "error": "Unexpected Error",
            "message": "An unexpected error occurred. Please try again.",
            "type": "unknown_error"
        })

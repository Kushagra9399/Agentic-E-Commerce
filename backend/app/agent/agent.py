import json
import time
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
# Reduced for 8k tokens/min Groq limit
MAX_HISTORY_MESSAGES = 14
MAX_TOOL_RESULT_CHARS = 8000

MODEL = "openai/gpt-oss-20b"


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
        "name": title,
        "brand": product.get("brand", "Unknown"),
        "price": price,
        "discount": discount,
        "rating": rating,
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
        "stock": product.get("stock"),
        "link": product.get("link"),
        "in_stock": product.get("in_stock"),
    })

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

        return {
            "products": compacted
        }

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

    # Handle both cart objects and nested 'cart' key
    cart_obj = cart.get("cart") if "cart" in cart else cart

    result = {
        "cart_id": cart_obj.get("id") or cart_obj.get("cart_id"),
        "status": cart_obj.get("status"),
        "total": cart_obj.get("total"),
        "currency": cart_obj.get("currency", "INR"),
    }

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
# TOOL 1: CATALOG
# ============================================================

CATALOG_TOOL = {
    "type": "function",
    "function": {
        "name": "catalog",
        "description": (
            "Product discovery tool. "
            "Use action='search' when the buyer wants to find "
            "or compare products. "
            "Use action='details' when the buyer refers to a "
            "specific product and wants more information."
        ),
        "parameters": {
            "type": "object",
            "properties": {

                "action": {
                    "type": "string",
                    "enum": [
                        "search",
                        "details"
                    ]
                },

                "query": {
                    "type": "string",
                    "description": (
                        "Semantic description of the product "
                        "the buyer wants."
                    )
                },

                "product_id": {
                    "type": "string",
                    "description": (
                        "Product ID for action='details'."
                    )
                },

                "max_price": {
                    "type": "number",
                    "description": (
                        "Maximum acceptable price in INR."
                    )
                },

                "min_price": {
                    "type": "number",
                    "description": (
                        "Minimum acceptable price in INR."
                    )
                },

                "brand": {
                    "type": "string"
                },

                "min_discount": {
                    "type": "number"
                },

                "top_k": {
                    "type": "integer",
                    "default": 5
                }
            },

            "required": [
                "action"
            ]
        }
    }
}


def catalog(
    action,
    query=None,
    product_id=None,
    max_price=None,
    min_price=None,
    brand=None,
    min_discount=None,
    top_k=5,
):
    """
    Unified catalog operation.
    """

    if action == "search":

        result = search_products(
            query=query,
            max_price=max_price,
            min_price=min_price,
            brand=brand,
            # min_discount=min_discount,
            # top_k=top_k,
        )

        return compact_product_list(result)

    if action == "details":

        if not product_id:
            return {
                "success": False,
                "error": "product_id is required."
            }

        result = get_product_info(
            asin=product_id
        )

        if not result["found"]:
            return {
                "error": "Product not found"
            }

        result = result["product"]

        return compact_product_details(result)

    return {
        "success": False,
        "error": "Invalid catalog action."
    }


# ============================================================
# TOOL 2: PRODUCT RECOMMENDATIONS
# ============================================================

PRODUCT_RECOMMENDATIONS_TOOL = {
    "type": "function",
    "function": {
        "name": "product_recommendations",
        "description": (
            "Recommend products related to a selected product. "
            "Use action='addons' for complementary products. "
            "Use action='upgrade' when the buyer wants a better, "
            "larger, more powerful, or premium alternative. "
            "Recommendations are optional and never imply buyer approval."
        ),
        "parameters": {
            "type": "object",
            "properties": {

                "action": {
                    "type": "string",
                    "enum": [
                        "addons",
                        "upgrade"
                    ]
                },

                "product_id": {
                    "type": "string"
                },

                "budget_remaining": {
                    "type": "number",
                    "description": (
                        "Remaining buyer budget in INR."
                    )
                },

                "limit": {
                    "type": "integer",
                    "default": 3
                }
            },

            "required": [
                "action",
                "product_id"
            ]
        }
    }
}


def product_recommendations(
    action,
    product_id,
    budget_remaining=None,
    limit=3,
):
    """
    Unified recommendation operation.
    """

    return {
        "success": False,
        "error": "Product recommendations are built-in to product details."
    }


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
            product_id=product_id,
            quantity=quantity,
        )

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
    CATALOG_TOOL,
    PRODUCT_RECOMMENDATIONS_TOOL,
    CART_TOOL,
    CHECKOUT_TOOL,
    ORDERS_TOOL,
]


# ============================================================
# TOOL DISPATCH
# ============================================================

TOOL_FUNCTIONS = {
    "catalog": catalog,
    "product_recommendations": product_recommendations,
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


def call_llm(messages):
    """
    Call Groq with retry handling and error management.

    Exponential backoff is preferable to a fixed 5-second
    retry because rate limits can persist for different
    durations.
    """

    for attempt in range(3):

        try:
            # Validate tools before sending
            validate_tools()

            return client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                max_tokens=800,
            )

        except Exception as rate_limit_e:
            # Catch rate limit errors specifically
            if "rate" in str(rate_limit_e).lower():
                if attempt == 2:
                    raise

                wait_time = 2 ** attempt

                print(
                    "Groq rate limit hit. "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)
            else:
                raise

        except Exception as e:
            # Catch all other Groq errors
            error_msg = str(e)
            print(
                f"Groq API error (attempt {attempt + 1}/3): {error_msg}",
                file=sys.stderr
            )
            if attempt == 2:
                # Last attempt failed, raise with context
                raise RuntimeError(
                    f"Groq API failed after 3 attempts: {error_msg}"
                ) from e
            time.sleep(2 ** attempt)


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

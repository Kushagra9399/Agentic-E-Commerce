import requests
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.services.serpapi_cache import SerpAPICache


class SerpAPIService:
    """
    Service for integrating with SerpAPI Amazon search endpoints.
    
    Features:
    - Product search: https://serpapi.com/search?engine=amazon
    - Product details (ASIN): https://serpapi.com/search?engine=amazon_product
    - Automatic request caching (24-hour TTL)
    - Recommendation extraction from SerpAPI
    """
    
    BASE_URL = "https://serpapi.com/search"
    DEFAULT_AMAZON_DOMAIN = "amazon.in"
    
    def __init__(self):
        self.api_key = settings.SERPAPI_KEY
        if not self.api_key:
            raise ValueError("SERPAPI_KEY not configured in .env")

    def search_products(
        self,
        query: str,
        max_price: Optional[float] = None,
        min_price: Optional[float] = None,
        brand: Optional[str] = None,
        limit: int = 5,
        amazon_domain: str = DEFAULT_AMAZON_DOMAIN,
    ) -> Dict[str, Any]:

        cache_key_params = {
            "k": query,
            "max_price": max_price,
            "min_price": min_price,
            "brand": brand,
            "limit": limit,
            "amazon_domain": amazon_domain,
        }

        # Validate input before making the request.
        if not self.api_key or not self.api_key.strip():
            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": "SerpAPI API key is missing.",
                "from_cache": False,
                "has_more": False,
            }

        if limit < 1:
            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": "limit must be at least 1.",
                "from_cache": False,
                "has_more": False,
            }

        if (
            min_price is not None
            and max_price is not None
            and min_price > max_price
        ):
            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": "min_price cannot exceed max_price.",
                "from_cache": False,
                "has_more": False,
            }

        # Temporarily disable this block if you suspect stale cached results.
        cached = SerpAPICache.get("amazon", **cache_key_params)
        if cached:
            cached["from_cache"] = True
            return cached

        params = {
            "engine": "amazon",
            "k": query,
            "api_key": self.api_key,
            "amazon_domain": amazon_domain,
        }

        try:
            response = requests.get(
                self.BASE_URL,
                params=params,
                timeout=20,
            )

            response.raise_for_status()
            data = response.json()

            print("Data: ")
            print(data)

            # SerpAPI may return an API-level error in a JSON response.
            if data.get("error"):
                return {
                    "query": query,
                    "count": 0,
                    "products": [],
                    "error": f"SerpAPI error: {data['error']}",
                    "from_cache": False,
                    "has_more": False,
                }

            # The standard Amazon engine uses organic_results.
            raw_products = data.get("organic_results") or []

            # Keep compatibility with a nonstandard/custom response.
            if not raw_products:
                raw_products = data.get("results") or []

            filtered_products = []

            for product in raw_products:
                title = product.get("title") or ""
                product_brand = (
                    product.get("brand")
                    or product.get("specs", {}).get("brand")
                    or ""
                )

                # Apply brand filtering locally.
                if brand:
                    brand_text = f"{product_brand} {title}".casefold()
                    if brand.casefold() not in brand_text:
                        continue

                # Apply price filtering in the marketplace's currency.
                price = product.get("extracted_price")

                if price is None:
                    # Do not assume a missing price passes the budget filter.
                    if min_price is not None or max_price is not None:
                        continue
                else:
                    try:
                        price = float(price)
                    except (ValueError, TypeError):
                        continue

                    if min_price is not None and price < min_price:
                        continue

                    if max_price is not None and price > max_price:
                        continue

                filtered_products.append(product)

            # Format only after filtering so out-of-budget items are excluded.
            products = self._format_search_results(
                filtered_products,
                limit,
            )

            related_searches = [
                item.get("query", "")
                for item in (data.get("related_searches") or [])[:3]
                if item.get("query")
            ]

            result = {
                "query": query,
                "filters": {
                    "max_price": max_price,
                    "min_price": min_price,
                    "brand": brand,
                },
                "count": len(products),
                "products": products,
                "related_searches": related_searches,
                "has_more": (
                    len(filtered_products) > limit
                    or data.get("serpapi_pagination", {}).get("next")
                    is not None
                ),
                "from_cache": False,
                "error": None,
            }

            SerpAPICache.set("amazon", result, **cache_key_params)
            return result

        except requests.exceptions.HTTPError as exc:
            # Preserve the response body because it may contain the API error.
            body = ""
            if exc.response is not None:
                body = exc.response.text[:1000]

            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": (
                    f"HTTP error: {exc}; response: {body}"
                ),
                "from_cache": False,
                "has_more": False,
            }

        except requests.exceptions.RequestException as exc:
            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": f"Network error: {exc}",
                "from_cache": False,
                "has_more": False,
            }

        except ValueError as exc:
            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": f"Invalid JSON response: {exc}",
                "from_cache": False,
                "has_more": False,
            }

        except Exception as exc:
            return {
                "query": query,
                "count": 0,
                "products": [],
                "error": f"Unexpected error: {exc}",
                "from_cache": False,
                "has_more": False,
            }
    
    def get_product_details(
        self,
        asin: str,
        amazon_domain: str = DEFAULT_AMAZON_DOMAIN
    ) -> Dict[str, Any]:
        """
        Get detailed product information using ASIN.
        
        Checks cache first, then makes API call if needed.
        
        Args:
            asin: Product ASIN
            amazon_domain: Amazon domain
        
        Returns:
            Dict with complete product details and recommendations
        """
        # Check cache first
        cache_key_params = {"asin": asin, "amazon_domain": amazon_domain}
        cached = SerpAPICache.get("amazon_product", **cache_key_params)
        if cached:
            cached["from_cache"] = True
            return cached
        
        params = {
            "engine": "amazon_product",
            "asin": asin,
            "api_key": self.api_key,
            "amazon_domain": amazon_domain,
        }
        
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            product = self._format_product_details(data)
            
            # Extract recommended products and add-ons if available
            add_ons = self._extract_addons(data)
            recommendations = self._extract_recommendations(data)
            
            result = {
                "found": True,
                "product": product,
                "add_ons": add_ons,
                "recommendations": recommendations,
                "from_cache": False,
                "error": None
            }
            
            # Cache the result
            SerpAPICache.set("amazon_product", result, **cache_key_params)
            
            return result
            
        except requests.exceptions.RequestException as e:
            return {
                "found": False,
                "product": None,
                "add_ons": [],
                "recommendations": [],
                "error": f"API Error: {str(e)}",
                "from_cache": False
            }
    
    def get_product_keys(self, asin: str) -> Dict[str, Any]:
        """
        Get all available keys/fields in a product's JSON structure.
        
        Useful for LLM to know what information can be queried.
        
        Args:
            asin: Product ASIN
        
        Returns:
            Dict with nested key structure
        """
        product_data = self.get_product_details(asin)
        
        if not product_data.get("found"):
            return {"error": "Product not found"}
        
        product = product_data.get("product", {})
        keys = self._extract_nested_keys(product)
        
        return {
            "asin": asin,
            "available_keys": keys,
            "total_fields": self._count_keys(keys)
        }
    
    def get_product_field(
        self,
        asin: str,
        field_path: str
    ) -> Dict[str, Any]:
        """
        Retrieve a specific field from product data using dot notation.
        
        Example:
        - field_path="product.title" → returns product title
        - field_path="rating" → returns rating
        - field_path="buybox_winner.price" → returns price
        
        Args:
            asin: Product ASIN
            field_path: Dot-notation path to field (e.g., "product.title")
        
        Returns:
            Dict with requested field value
        """
        product_data = self.get_product_details(asin)
        
        if not product_data.get("found"):
            return {"error": "Product not found"}
        
        # Navigate through the nested structure
        value = product_data.get("product", {})
        
        for key in field_path.split("."):
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return {"error": f"Cannot access {key} in non-dict"}
        
        return {
            "asin": asin,
            "field": field_path,
            "value": value
        }
    
    def _format_search_results(
        self,
        results: List[Dict],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Format SerpAPI search results into standardized format."""
        formatted = []
        
        for result in results[:limit]:
            try:
                price = self._parse_price(result.get("price", "0"))
                original_price = self._parse_price(
                    result.get("price_strikethrough", result.get("price", "0"))
                )
                discount_percent = 0
                if original_price > 0:
                    discount_percent = round((1 - price / original_price) * 100)
                
                product = {
                    "asin": result.get("asin", ""),
                    "title": result.get("title", ""),
                    "brand": result.get("brand", "Unknown"),
                    "price": price,
                    "original_price": original_price,
                    "discount_percent": discount_percent,
                    "rating": result.get("rating", 0),
                    "review_count": result.get("review_count", 0),
                    "link": result.get("link", ""),
                    "image": result.get("image", ""),
                    "in_stock": result.get("in_stock", True),
                }
                
                if product["asin"]:
                    formatted.append(product)
            except Exception as e:
                print(f"Error formatting product: {e}")
                continue
        
        return formatted
    
    def _format_product_details(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format detailed product information."""
        product = data.get("product", {})
        buybox = data.get("buybox_winner", {})
        
        price = self._parse_price(buybox.get("price", "0"))
        original_price = self._parse_price(
            buybox.get("price_strikethrough", buybox.get("price", "0"))
        )
        discount_percent = 0
        if original_price > 0:
            discount_percent = round((1 - price / original_price) * 100)
        
        # Format specifications concisely
        specs = {}
        for spec in data.get("specifications", []):
            if isinstance(spec, dict):
                specs.update(spec)
        
        return {
            "asin": data.get("asin", ""),
            "title": product.get("title", ""),
            "brand": product.get("brand", "Unknown"),
            "price": price,
            "original_price": original_price,
            "discount_percent": discount_percent,
            "rating": data.get("rating", 0),
            "review_count": data.get("review_count", 0),
            "description": product.get("description", ""),
            "image": product.get("main_image", ""),
            "images": data.get("images", [])[:3],  # Limit to 3 images
            "specifications": specs,
            "link": data.get("link", ""),
            "availability": buybox.get("availability", {}).get("raw", ""),
            "merchant": buybox.get("merchant", "Unknown"),
        }
    
    def _extract_addons(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract add-on products from product details.
        SerpAPI may provide sponsored or bundled products.
        """
        addons = []
        
        # Check for frequently bought together
        if "frequently_bought_together" in data:
            for item in data.get("frequently_bought_together", [])[:3]:
                addon = {
                    "asin": item.get("asin", ""),
                    "title": item.get("title", ""),
                    "price": self._parse_price(item.get("price", "0")),
                    "image": item.get("image", ""),
                }
                if addon["asin"]:
                    addons.append(addon)
        
        return addons
    
    def _extract_recommendations(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract recommended/similar products from product details.
        """
        recommendations = []
        
        # Check for customers who viewed this also viewed
        if "customers_who_viewed" in data:
            for item in data.get("customers_who_viewed", [])[:3]:
                rec = {
                    "asin": item.get("asin", ""),
                    "title": item.get("title", ""),
                    "price": self._parse_price(item.get("price", "0")),
                    "image": item.get("image", ""),
                    "rating": item.get("rating", 0),
                }
                if rec["asin"]:
                    recommendations.append(rec)
        
        return recommendations
    
    def _extract_nested_keys(self, obj: Any, prefix: str = "") -> Dict[str, Any]:
        """
        Recursively extract nested keys from object for LLM awareness.
        
        Example output:
        {
            "product": {"title": str, "brand": str},
            "rating": float,
            "price": float
        }
        """
        if isinstance(obj, dict):
            keys = {}
            for key, value in obj.items():
                if isinstance(value, (dict, list)):
                    keys[key] = self._extract_nested_keys(value, f"{prefix}.{key}")
                else:
                    keys[key] = type(value).__name__
            return keys
        elif isinstance(obj, list):
            if obj:
                return [self._extract_nested_keys(obj[0], prefix)]
            return []
        else:
            return type(obj).__name__
    
    def _count_keys(self, keys_dict: Dict) -> int:
        """Count total number of keys in nested structure."""
        count = 0
        for value in keys_dict.values():
            if isinstance(value, dict):
                count += 1 + self._count_keys(value)
            elif isinstance(value, list):
                count += 1
            else:
                count += 1
        return count
    
    def _parse_price(self, price_str: str) -> float:
        """Parse price string and return float value in rupees."""
        if not price_str or isinstance(price_str, (int, float)):
            return float(price_str) if price_str else 0.0
        
        price_str = str(price_str).replace("₹", "").replace("Rs.", "").replace(",", "").strip()
        
        try:
            return float(price_str)
        except ValueError:
            return 0.0


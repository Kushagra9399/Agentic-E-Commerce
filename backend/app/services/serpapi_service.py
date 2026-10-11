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
            # Invalidate entries created before the normalized parser fix.
            "format_version": 2,
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

            # print("Data: ")
            # print(data)

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
                    price = product.get("price")
                if price is None:
                    # Do not assume a missing price passes the budget filter.
                    if min_price is not None or max_price is not None:
                        continue
                else:
                    price = self._parse_price(price)
                    if price <= 0:
                        if min_price is not None or max_price is not None:
                            continue
                        price = None

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
        cache_key_params = {
            "asin": asin,
            "amazon_domain": amazon_domain,
            # Avoid serving product-detail payloads cached before normalization.
            "format_version": 2,
        }
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
            
            # Prefer recommendations embedded in the product response. If Amazon
            # does not return them, retrieve candidates through the same SerpAPI
            # Amazon search service so all displayed product data has one source.
            add_ons = self._extract_addons(data)
            recommendations = self._extract_recommendations(data)
            current = product.get("asin") or asin

            if not add_ons and product.get("title"):
                addon_result = self.search_products(
                    query=f"{product['title']} compatible accessories",
                    limit=5,
                    amazon_domain=amazon_domain,
                )
                add_ons = [
                    item for item in addon_result.get("products", [])
                    if item.get("asin") != current
                ][:3]

            if not recommendations and product.get("title"):
                rec_result = self.search_products(
                    query=f"{product['title']} similar alternatives",
                    limit=5,
                    amazon_domain=amazon_domain,
                )
                recommendations = [
                    item for item in rec_result.get("products", [])
                    if item.get("asin") != current
                ][:3]

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
                # SerpAPI Amazon organic results commonly expose numeric price
                # as extracted_price, while price may be a formatted string.
                raw_price = result.get("extracted_price")
                if raw_price is None:
                    raw_price = result.get("price")
                price = self._parse_price(raw_price)

                raw_original_price = (
                    result.get("extracted_old_price")
                    or result.get("price_strikethrough")
                    or result.get("old_price")
                )
                original_price = self._parse_price(raw_original_price)

                discount_percent = 0
                if original_price > price > 0:
                    discount_percent = round((1 - price / original_price) * 100)
                elif result.get("discount"):
                    try:
                        discount_percent = int(
                            str(result.get("discount")).replace("%", "").strip()
                        )
                    except (TypeError, ValueError):
                        discount_percent = 0

                title = result.get("title") or ""
                brand = result.get("brand") or result.get("manufacturer")
                if not brand and title:
                    brand = title.split()[0].strip(",-") or "Unknown"

                product = {
                    "asin": result.get("asin") or result.get("product_id") or "",
                    "title": title,
                    "brand": brand or "Unknown",
                    "price": price if price > 0 else None,
                    "original_price": original_price if original_price > 0 else None,
                    "discount_percent": discount_percent,
                    "rating": result.get("rating"),
                    "review_count": (
                        result.get("reviews")
                        or result.get("review_count")
                        or result.get("reviews_count")
                    ),
                    "link": result.get("link") or result.get("link_clean") or "",
                    "image": result.get("thumbnail") or result.get("image") or "",
                    "in_stock": result.get("in_stock", True),
                    "source": "serpapi_amazon",
                }

                # Keep useful results even if Amazon omits the ASIN field.
                if product["title"] and product["price"] is not None:
                    formatted.append(product)
            except Exception as e:
                print(f"Error formatting product: {e}")
                continue
        
        return formatted
    
    def _format_product_details(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format detailed product information from SerpAPI response."""
        # SerpAPI amazon_product engine returns data in 'product_results'
        product = data.get("product_results", {})
        
        # Extract price from purchase_options or product_results
        price = 0
        original_price = 0
        
        # Try to get price from purchase_options (Amazon's standard format)
        purchase_options = data.get("purchase_options") or {}
        if isinstance(purchase_options, dict):
            amazon_option = purchase_options.get("Amazon")
            if isinstance(amazon_option, dict):
                price = self._parse_price(
                    amazon_option.get("extracted_primary_price")
                    or amazon_option.get("primary_price")
                    or amazon_option.get("extracted_price")
                    or amazon_option.get("price")
                )
        elif isinstance(purchase_options, list):
            for option in purchase_options:
                if not isinstance(option, dict):
                    continue
                candidate_price = (
                    option.get("extracted_primary_price")
                    or option.get("primary_price")
                    or option.get("extracted_price")
                    or option.get("price")
                )
                price = self._parse_price(candidate_price)
                if price > 0:
                    break
        
        # Fallback to extracted_price from product_results
        if price == 0:
            raw_price = product.get("extracted_price")
            if raw_price is None:
                raw_price = product.get("price")
            price = self._parse_price(raw_price)
        
        # Get original price
        raw_original_price = (
            product.get("extracted_old_price")
            or product.get("old_price")
            or product.get("price_strikethrough")
        )
        original_price = self._parse_price(raw_original_price)
        
        # Calculate discount
        discount_percent = 0
        if original_price > 0 and price > 0:
            discount_percent = round((1 - price / original_price) * 100)
        elif product.get("discount"):
            # Try to parse discount percentage if available
            try:
                discount_percent = int(product.get("discount", "0").replace("%", ""))
            except (ValueError, TypeError):
                discount_percent = 0
        
        # Format specifications from item_specifications
        specs = {}
        for spec_group in data.get("item_specifications", []):
            if isinstance(spec_group, dict):
                for spec_item in spec_group.get("specifications", []):
                    if isinstance(spec_item, dict):
                        name = spec_item.get("name", "")
                        value = spec_item.get("value", "")
                        if name and value:
                            specs[name] = value
        
        # Get images
        images = []
        if product.get("thumbnails"):
            thumbnails = product["thumbnails"]
            for img in thumbnails[:3]:
                if isinstance(img, dict):
                    img_url = img.get("src", "")
                elif isinstance(img, str):
                    img_url = img
                else:
                    continue
                if img_url:
                    images.append(img_url)
        elif product.get("thumbnail"):
            images = [product.get("thumbnail")]
        
        return {
            "asin": product.get("asin", ""),
            "title": product.get("title", ""),
            "brand": product.get("brand") or (product.get("specs") or {}).get("brand", "Unknown"),
            "price": price,
            "original_price": original_price,
            "discount_percent": discount_percent,
            "rating": product.get("rating", 0),
            "review_count": product.get("reviews", 0),
            "description": self._extract_description(data),
            "image": product.get("thumbnail", ""),
            "images": images,
            "specifications": specs,
            "link": product.get("link_clean") or product.get("link", ""),
            "availability": product.get("stock", {}).get("status", "") if isinstance(product.get("stock"), dict) else product.get("stock", ""),
            "merchant": "Amazon",  # Default to Amazon for amazon_product endpoint
        }
    
    def _extract_description(self, data: Dict[str, Any]) -> str:
        """Extract product description from SerpAPI response."""
        product_desc = data.get("product_description", {})
        
        # product_description can be a dict with "text" or a list
        if isinstance(product_desc, dict):
            return product_desc.get("text", "")
        elif isinstance(product_desc, list) and product_desc:
            # If it's a list, get the first item's text
            if isinstance(product_desc[0], dict):
                return product_desc[0].get("text", "")
            return ""
        
        return ""
    
    def _extract_addons(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract add-on products from product details.
        SerpAPI provides 'bought_together' for frequently bought together.
        """
        addons = []
        
        # SerpAPI's Amazon product response has used different field names
        # for frequently-bought-together items over time.
        candidates = (
            data.get("bought_together")
            or data.get("frequently_bought_together")
            or data.get("frequently_bought_together_products")
            or []
        )
        if isinstance(candidates, dict):
            candidates = candidates.get("products") or candidates.get("items") or []

        for item in candidates:
            if not isinstance(item, dict):
                continue
            asin = item.get("asin") or item.get("product_id") or ""
            title = item.get("title") or item.get("name") or ""
            if not title:
                continue
            addons.append({
                "asin": asin,
                "title": title,
                "brand": item.get("brand") or (title.split()[0] if title else "Unknown"),
                "price": self._parse_price(item.get("extracted_price", item.get("price"))),
                "rating": item.get("rating"),
                "image": item.get("thumbnail") or item.get("image") or "",
                "link": item.get("link") or "",
                "source": "serpapi_amazon",
            })
            if len(addons) >= 3:
                break

        return addons
    
    def _extract_recommendations(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract recommended/similar products from product details.
        SerpAPI provides 'related_products' for customer who viewed this also viewed.
        """
        recommendations = []
        
        related_products = (
            data.get("related_products")
            or data.get("also_bought")
            or data.get("similar_products")
            or data.get("customers_also_viewed")
            or []
        )
        if not related_products:
            sections = data.get("related_product_sections") or []
            related_products = [
                item
                for section in sections
                if isinstance(section, dict)
                for item in (section.get("items") or [])
            ]
        if isinstance(related_products, dict):
            related_products = related_products.get("products") or related_products.get("items") or []

        for item in related_products:
            if not isinstance(item, dict):
                continue
            title = item.get("title") or item.get("name") or ""
            if not title:
                continue
            recommendations.append({
                "asin": item.get("asin") or item.get("product_id") or "",
                "title": title,
                "brand": item.get("brand") or (title.split()[0] if title else "Unknown"),
                "price": self._parse_price(item.get("extracted_price", item.get("price"))),
                "image": item.get("thumbnail") or item.get("image") or "",
                "rating": item.get("rating"),
                "link": item.get("link") or "",
                "source": "serpapi_amazon",
            })
            if len(recommendations) >= 3:
                break

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


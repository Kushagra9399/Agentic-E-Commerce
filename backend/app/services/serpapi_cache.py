"""
Request cache service for SerpAPI calls.

Stores all SerpAPI requests/responses in database to:
- Avoid duplicate API calls
- Reduce API quota usage
- Improve performance on repeated searches
"""

import json
import hashlib
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional


class SerpAPICache:
    """
    Cache storage for SerpAPI requests.
    Uses a simple in-memory dict; can be migrated to DB table if needed.
    """
    
    # Fast in-memory cache plus persistent JSON files, with a 24-hour TTL.
    _cache: Dict[str, Dict[str, Any]] = {}
    _ttl_hours = 24
    _cache_dir = Path(__file__).resolve().parents[2] / "data" / "serpapi"

    @staticmethod
    def _file_path(engine: str, params: Dict[str, Any]) -> Path:
        if engine == "amazon" and params.get("k"):
            identity = str(params["k"])
            folder = SerpAPICache._cache_dir / "searches"
        else:
            identity = str(params.get("asin") or engine)
            folder = SerpAPICache._cache_dir / "products"
        slug = re.sub(r"[^a-z0-9]+", "-", identity.casefold()).strip("-")[:60] or "cache"
        suffix = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()[:8]
        return folder / f"{slug}-{suffix}.json"
    
    @staticmethod
    def get_cache_key(engine: str, **params) -> str:
        """
        Generate a unique cache key for the request.
        
        Args:
            engine: SerpAPI engine (amazon, amazon_product)
            **params: Query parameters (q, asin, max_price, etc.)
        
        Returns:
            Hash string for cache key
        """
        # Build deterministic cache key from engine and params
        cache_input = f"{engine}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(cache_input.encode()).hexdigest()
    
    @staticmethod
    def get(engine: str, **params) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached response if available and not expired.
        
        Args:
            engine: SerpAPI engine
            **params: Query parameters
        
        Returns:
            Cached response dict or None if expired/not found
        """
        cache_key = SerpAPICache.get_cache_key(engine, **params)
        entry = SerpAPICache._cache.get(cache_key)
        path = SerpAPICache._file_path(engine, params)

        if entry is None and path.exists():
            try:
                entry = json.loads(path.read_text(encoding="utf-8"))
                SerpAPICache._cache[cache_key] = entry
            except (OSError, json.JSONDecodeError):
                return None

        if not entry:
            return None

        timestamp = entry.get("timestamp")
        if timestamp:
            try:
                elapsed = datetime.now() - datetime.fromisoformat(timestamp)
                if elapsed > timedelta(hours=SerpAPICache._ttl_hours):
                    SerpAPICache._cache.pop(cache_key, None)
                    path.unlink(missing_ok=True)
                    return None
            except (ValueError, TypeError):
                SerpAPICache._cache.pop(cache_key, None)
                return None

        return entry.get("data")
    
    @staticmethod
    def set(engine: str, data: Dict[str, Any], **params) -> None:
        """
        Store response in cache.
        
        Args:
            engine: SerpAPI engine
            data: Response data to cache
            **params: Query parameters
        """
        cache_key = SerpAPICache.get_cache_key(engine, **params)
        entry = {
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "engine": engine,
            "params": params,
        }
        SerpAPICache._cache[cache_key] = entry
        path = SerpAPICache._file_path(engine, params)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError as exc:
            print(f"[SerpAPICache] Could not persist cache file: {exc}")
    
    @staticmethod
    def find_cached_products(exclude_asin: str = "", limit: int = 30) -> list[Dict[str, Any]]:
        """Collect products from unexpired search JSON files without API calls."""
        products = {}
        folder = SerpAPICache._cache_dir / "searches"
        if not folder.exists():
            return []

        cutoff = datetime.now() - timedelta(hours=SerpAPICache._ttl_hours)
        for path in folder.glob("*.json"):
            try:
                entry = json.loads(path.read_text(encoding="utf-8"))
                timestamp = datetime.fromisoformat(entry.get("timestamp", ""))
                if timestamp < cutoff:
                    continue
                data = entry.get("data") or {}
                for product in data.get("products", []):
                    if not isinstance(product, dict):
                        continue
                    asin = product.get("asin") or product.get("product_id") or ""
                    if not asin or asin == exclude_asin:
                        continue
                    products[asin] = product
            except (OSError, ValueError, TypeError, json.JSONDecodeError):
                continue

        return list(products.values())[:max(1, limit)]

    @staticmethod
    def clear() -> None:
        """Clear all cache entries."""
        SerpAPICache._cache.clear()
    
    @staticmethod
    def size() -> int:
        """Get cache size."""
        return len(SerpAPICache._cache)

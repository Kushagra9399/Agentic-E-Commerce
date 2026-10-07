"""
Request cache service for SerpAPI calls.

Stores all SerpAPI requests/responses in database to:
- Avoid duplicate API calls
- Reduce API quota usage
- Improve performance on repeated searches
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, Text, DateTime, func


class SerpAPICache:
    """
    Cache storage for SerpAPI requests.
    Uses a simple in-memory dict; can be migrated to DB table if needed.
    """
    
    # In-memory cache with 24-hour TTL
    _cache: Dict[str, Dict[str, Any]] = {}
    _ttl_hours = 24
    
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
        
        if cache_key in SerpAPICache._cache:
            entry = SerpAPICache._cache[cache_key]
            
            # Check if expired
            timestamp = entry.get("timestamp")
            if timestamp:
                elapsed = datetime.now() - datetime.fromisoformat(timestamp)
                if elapsed > timedelta(hours=SerpAPICache._ttl_hours):
                    del SerpAPICache._cache[cache_key]
                    return None
            
            return entry.get("data")
        
        return None
    
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
        
        SerpAPICache._cache[cache_key] = {
            "data": data,
            "timestamp": datetime.now().isoformat(),
            "engine": engine,
            "params": params
        }
    
    @staticmethod
    def clear() -> None:
        """Clear all cache entries."""
        SerpAPICache._cache.clear()
    
    @staticmethod
    def size() -> int:
        """Get cache size."""
        return len(SerpAPICache._cache)

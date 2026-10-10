#!/usr/bin/env python3
"""Debug script to test SerpAPI response structure."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.services.serpapi_service import SerpAPIService
import json

def test_search():
    """Test search_products."""
    print("=" * 80)
    print("Testing Search Results")
    print("=" * 80)
    
    serpapi = SerpAPIService()
    result = serpapi.search_products(query="laptop", limit=2)
    
    print(f"\nFound {result['count']} products")
    if result.get('products'):
        print(f"\nFirst product:")
        p = result['products'][0]
        print(f"  Title: {p.get('title')}")
        print(f"  Brand: {p.get('brand')}")
        print(f"  Price: {p.get('price')}")
        print(f"  Rating: {p.get('rating')}")
        print(f"  ASIN: {p.get('asin')}")
    
    return result

def test_product_details():
    """Test get_product_details."""
    print("\n" + "=" * 80)
    print("Testing Product Details")
    print("=" * 80)
    
    serpapi = SerpAPIService()
    
    # Search first to get an ASIN
    search_result = serpapi.search_products(query="laptop", limit=1)
    
    if search_result.get('products') and search_result['products'][0].get('asin'):
        asin = search_result['products'][0]['asin']
        print(f"\nFetching details for ASIN: {asin}")
        
        result = serpapi.get_product_details(asin=asin)
        
        if result.get('found'):
            product = result['product']
            print(f"\nProduct Details:")
            print(f"  Title: {product.get('title')}")
            print(f"  Brand: {product.get('brand')}")
            print(f"  Price: ₹{product.get('price')}")
            print(f"  Original Price: ₹{product.get('original_price')}")
            print(f"  Discount: {product.get('discount_percent')}%")
            print(f"  Rating: {product.get('rating')}")
            print(f"  Reviews: {product.get('review_count')}")
            print(f"  Specifications: {len(product.get('specifications', {}))} specs")
            print(f"  Add-ons: {len(result.get('add_ons', []))} items")
            print(f"  Recommendations: {len(result.get('recommendations', []))} items")
        else:
            print(f"Error: {result.get('error')}")
    else:
        print("No ASIN found in search results")

if __name__ == "__main__":
    try:
        test_search()
        test_product_details()
        print("\n✅ All tests completed successfully!")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()



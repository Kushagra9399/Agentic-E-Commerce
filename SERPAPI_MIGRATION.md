# SerpAPI Migration Guide

## Overview
Your AI Commerce Agent has been migrated from using local FAISS product search and CSV-based data to real-time Amazon product data via **SerpAPI**.

## What Changed

### Before (Local Data)
```
User Query → FAISS Index Search → Local CSV Metadata → Agent
             (embeddings-based)    (fixed products)
```

### After (SerpAPI)
```
User Query → SerpAPI Amazon Engine → Real-time Amazon Products → Agent
             (live data)            (prices, discounts updated)
```

## Files Changed/Created

### New Files Created
1. **`backend/app/services/serpapi_service.py`**
   - Main SerpAPI integration
   - `search_products()` - Search by query
   - `get_product_details()` - Fetch by ASIN
   - Price parsing and formatting

2. **`backend/app/services/product_cache_service.py`**
   - Caches SerpAPI products in local DB
   - Enables cart operations with API products

### Files Modified
1. **`backend/app/core/config.py`**
   - Added `SERPAPI_KEY` configuration

2. **`backend/app/db/models.py`**
   - Added `asin` column to Product model
   - Added `source_type` field ("local" or "serpapi")

3. **`backend/app/services/cart_service.py`**
   - Updated `add_product_to_cart()` to handle ASIN lookups

4. **`backend/app/agent/tools.py`**
   - Replaced `ProductSearchService` with `SerpAPIService`
   - Updated `search_products()` to use SerpAPI
   - Updated `get_product()` to fetch by ASIN
   - Enhanced `add_to_cart()` to auto-cache SerpAPI products

## Setup Instructions

### Step 1: Get SerpAPI Key
1. Visit https://serpapi.com
2. Sign up for free account (includes 100 free searches/month)
3. Copy your API key from dashboard

### Step 2: Update Environment Variables
Update your `backend/.env` file:

```bash
SERPAPI_KEY=your_serpapi_key_here
```

Or use the example:
```bash
cp backend/.env.example backend/.env
# Edit .env and add your SERPAPI_KEY
```

### Step 3: Run Database Migration
The following columns need to be added to the `products` table:

```sql
-- Add ASIN column (unique, indexed)
ALTER TABLE products ADD COLUMN asin VARCHAR(20) UNIQUE;
CREATE INDEX idx_products_asin ON products(asin);

-- Add source_type column
ALTER TABLE products ADD COLUMN source_type VARCHAR(20) DEFAULT 'local';

```

**If using Alembic** (Django/SQLAlchemy migrations):
```bash
cd backend
alembic revision --autogenerate -m "Add ASIN and source_type to Product"
alembic upgrade head
```

**If using Docker/Raw SQL**:
Connect to your database and run the SQL above.

### Step 4: Test the Integration

#### Test Product Search
```python
from app.services.serpapi_service import SerpAPIService

service = SerpAPIService()
results = service.search_products(
    query="laptop",
    max_price=100000,
    limit=5
)
print(results)
```

#### Test Product Details
```python
results = service.get_product_details(asin="B08N5LHSFS")
print(results)
```

#### Test Full Flow in Chat
1. Start your backend server
2. Open frontend chat
3. Say: "Show me laptops under ₹100,000"
4. Agent should:
   - Call `search_products()` via SerpAPI
   - Display real Amazon products
   - Allow you to select one
   - Fetch full details via `get_product_details()`

### Step 5: Add to Cart
When you select a product:
1. Tool calls `add_to_cart(asin=product_id)`
2. System fetches full product from SerpAPI if not cached
3. Caches product in local DB (for future use)
4. Adds to cart as normal
5. Cart operations proceed as before

## Key Architecture Decisions

### Why Cache SerpAPI Products?
- **Consistency**: Cart/order operations need persistent product records
- **Performance**: Avoid repeated API calls for same product
- **Offline**: Can work even if API is temporarily down
- **Audit Trail**: Product prices/specs at order time are preserved

### ASIN as Primary Reference
- **Standard ID**: ASIN is universal Amazon identifier
- **Interoperability**: Works across all Amazon domains
- **Scalability**: Handles unlimited products without sync issues

### Backward Compatibility
- Local DB products still work
- `source_type` field differentiates origins
- `add_product_to_cart()` checks both ID and ASIN

## Expected Behavior Changes

### Search Results
**Before**: 5 fixed products matching query embedding
**After**: Real Amazon products matching query, with live prices

### Product Details
**Before**: Pre-loaded specifications from CSV
**After**: Full Amazon product page data (reviews, images, ratings)

### Prices
**Before**: Static, rarely updated
**After**: Live from Amazon, always current

### Stock
**Before**: Fixed quantity in CSV
**After**: Based on Amazon availability (defaults to 10 for test)

## Troubleshooting

### Error: "SERPAPI_KEY not configured"
- Ensure `.env` has `SERPAPI_KEY` value
- Restart backend after updating .env
- Check key is valid at https://serpapi.com/dashboard

### Error: "API Error: 401"
- API key is invalid or expired
- Check quota (free tier: 100/month)
- Verify key is for SerpAPI, not another service

### Products Not Showing in Cart
- Check database migration ran successfully
- Verify `asin` and `source_type` columns exist
- Check backend logs for product caching errors

### Performance Issues
- First search may be slow (API call)
- Subsequent carts with same products will be faster
- Consider adding Redis caching layer for frequently searched items

## Advanced Configuration

### Change Amazon Domain
Default is `amazon.in`. To use different domain:

Update `backend/app/services/serpapi_service.py`:
```python
DEFAULT_AMAZON_DOMAIN = "amazon.com"  # or amazon.co.uk, etc.
```

### Customize Merchant ID
Currently hardcoded as `"CROMA_DEMO"` in cart operations.

Update `backend/app/services/product_cache_service.py`:
```python
merchant_id="CROMA_DEMO"  # Change this
```

### Add Rate Limiting
SerpAPI free tier: 100 searches/month

Consider adding caching:
```python
# In serpapi_service.py
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_search_products(query, max_price, ...):
    return self.search_products(...)
```

## Next Steps (Recommended)

1. ✅ **Immediate**: Update .env and run DB migration
2. ✅ **Test**: Run product search in chat
3. 🔄 **Enhance**: Update recommendation tools (upsell/cross-sell) for SerpAPI products
4. 🔄 **Optimize**: Add caching layer for API calls
5. 🔄 **Monitor**: Track API quota usage and costs
6. 🔄 **Scale**: Consider switching to paid tier for higher limits

## Rolling Back

If you need to revert to local data:

1. Keep old FAISS files and CSV data
2. Uncomment old imports in `backend/app/agent/tools.py`
3. Restore original `search_products()` and `get_product()` functions
4. No database changes needed (new columns won't hurt)

## Support

For SerpAPI issues:
- Docs: https://serpapi.com/docs
- Playground: https://serpapi.com/playground?engine=amazon
- Support: https://serpapi.com/support

For AI Commerce Agent issues:
- Check backend logs: `docker logs backend`
- Enable debug logging in config.py
- Check audit trail for transaction details

---

**Migration completed on**: Sep 7, 2025
**Status**: Ready for testing

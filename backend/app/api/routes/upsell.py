from fastapi import APIRouter, HTTPException

from app.services.serpapi_service import SerpAPIService


router = APIRouter(
    prefix="/api/upsell",
    tags=["Upsell"]
)

serpapi = SerpAPIService()


@router.get("/{asin}")
def get_upsell(asin: str):

    result = serpapi.get_product_details(asin=asin)

    if not result.get("found"):
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = result.get("product", {})
    recommendations = result.get("recommendations", [])

    if not recommendations:
        return {
            "available": False,
            "message": "No suitable upgrades found."
        }

    # Return best recommendation as upgrade
    upgrade = recommendations[0]

    return {
        "available": True,

        "current_product": {
            "id": asin,
            "asin": asin,
            "name": product.get("title"),
            "title": product.get("title"),
            "price": product.get("price"),
            "brand": product.get("brand"),
            "image": product.get("image"),
            "link": product.get("link")
        },

        "upgrade": {
            "id": upgrade.get("asin") or upgrade.get("product_id") or "",
            "asin": upgrade.get("asin") or upgrade.get("product_id") or "",
            "name": upgrade.get("title") or upgrade.get("name") or "",
            "title": upgrade.get("title") or upgrade.get("name") or "",
            "price": upgrade.get("price") or upgrade.get("extracted_price"),
            "brand": upgrade.get("brand"),
            "image": upgrade.get("image") or upgrade.get("thumbnail"),
            "link": upgrade.get("link") or upgrade.get("link_clean"),
            "reason": "Premium alternative with better features"
        }
    }
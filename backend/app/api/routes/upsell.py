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
            "asin": asin,
            "title": product.get("title"),
            "price": product.get("price"),
            "brand": product.get("brand"),
            "image": product.get("image"),
            "link": product.get("link")
        },

        "upgrade": {
            "asin": upgrade.get("asin"),
            "title": upgrade.get("title"),
            "price": upgrade.get("price") or upgrade.get("extracted_price"),
            "brand": upgrade.get("brand"),
            "image": upgrade.get("image") or upgrade.get("thumbnail"),
            "link": upgrade.get("link") or upgrade.get("link_clean"),
            "reason": "Premium alternative with better features"
        }
    }
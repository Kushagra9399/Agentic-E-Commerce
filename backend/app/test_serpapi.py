import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://serpapi.com/search"
API_KEY = os.getenv("SERPAPI_KEY")

tests = [
    {
        "name": "Test q parameter",
        "params": {
            "engine": "amazon",
            "k": "4K Smart TV",
            "amazon_domain": "amazon.in",
            "api_key": API_KEY,
        },
    },
    {
        "name": "Test q with max_price",
        "params": {
            "engine": "amazon",
            "q": "4K Smart TV",
            "amazon_domain": "amazon.in",
            "max_price": 6000000,
            "api_key": API_KEY,
        },
    },
]

for test in tests:
    response = requests.get(
        BASE_URL,
        params=test["params"],
        timeout=30,
    )

    print(f"\n{test['name']}: HTTP {response.status_code}")

    try:
        print("Error:", response.json().get("error"))
    except ValueError:
        print(response.text[:300])
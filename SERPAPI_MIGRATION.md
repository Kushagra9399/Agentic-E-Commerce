# Product Search Integration

This project uses SerpAPI to retrieve Amazon India product search results and product details.

## Current integration

- Product search is handled by the SerpAPI Amazon engine targeting `amazon.in`.
- Product detail lookup uses an ASIN.
- Search and product-detail responses use a 24-hour cache.
- The product tools normalize provider data into fields suitable for the conversational shopping experience.

For the current setup and workflow, see:

- [Project README](README.md)
- [Agent Tool Reference](TOOL_REFERENCE.md)
- [Architecture and Demo](docs/ARCHITECTURE_AND_3_MIN_DEMO.md)

## Future enhancements

Potential improvements include richer product comparisons, cache metrics, resilient retries, and query-keyed local snapshots for development and demo reproducibility.

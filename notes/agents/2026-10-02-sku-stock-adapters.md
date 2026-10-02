# Shared SKU stock adapters

The strict duplication report matched the two existing-stock entry wrappers.
Both dispatched through the same SKU asset boundary but selected different
asset evaluators. `skuExistingStock.js` now constructs both adapters with one
factory. Original module paths re-export the same public names, retaining blog
content and consumer compatibility.

Focused regression: `test/toys/2026-08-23`, 16 tests passed across two suites;
the shared adapter has 100% statements, branches, functions and lines coverage
(`.tmp/sku-stock-tests.log`, `.tmp/sku-stock-coverage`). Strict duplication fell
from 138 to 137 (`.tmp/sku-stock-duplication.log`) at unchanged minTokens 14.
No ignore rules or exemptions were added. Continue using the fresh JSON report
for the next pair rather than relying on older line numbers.

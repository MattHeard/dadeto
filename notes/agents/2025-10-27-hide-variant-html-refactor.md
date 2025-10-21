# Hide variant HTML refactor

- Ensured the new `createRemoveVariantHtml` factory handled both payload shapes (`{ variantId }` and `{ variantData, pageRef }`). I mapped the adapter contract so the Firestore wrapper could supply the correct pieces without leaking snapshot details.
- Mocking the adapters for tests initially surfaced gaps when variant data was missing. I resolved it by letting the loader optionally return the variant payload so the factory can still compute the path.

# Variants Query Helper

- **Challenge:** Needed to address feedback requesting the Firestore variants query builder be reusable without duplicating the base collection group logic.
- **Resolution:** Extracted a dedicated `createVariantsQuery` helper that receives the Firestore instance and returns the base query used by `createRunVariantQuery`.

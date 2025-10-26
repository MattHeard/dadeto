# Assign moderation job copy adjustments

- **Challenge:** The assign moderation Cloud Function now needs a function-local bridge module while still sourcing shared helpers.
- **Resolution:** Added a scoped `common-gcf.js` re-export within the function directory and updated the copy script to propagate both the bridge and the shared helper into the infra package.

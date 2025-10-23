## Assign Moderation CORS options extraction

- **Challenge:** Needed to extract the inline CORS options literal without disrupting existing origin construction helpers that already accept dependency injections.
- **Resolution:** Added a small factory that accepts the allowed origins and environment variable readers as parameters, preserving the existing dependency injection pattern while keeping the callsite concise.

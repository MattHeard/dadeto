# Agent Retrospective - Fetch Doc Extraction

- **Challenge:** Needed to reuse the Firestore document retrieval logic while keeping handler dependencies injectable.
- **Resolution:** Extracted a dedicated `fetchApiKeyCreditDocument` helper and wired it through the existing handler to maintain behavior.

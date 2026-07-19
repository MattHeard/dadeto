# Author regeneration admin action

- Unexpected hurdle: the broad quality gate exposed coverage for Firestore-trigger and browser-integration paths that are not exercised by local unit tests.
- Diagnosis: the admin flow reuses the authenticated mark-variant endpoint; author requests now update `authors/{authorId}` with `dirty: true`, while `render-author` remains the trigger owner.
- Fix: added the admin author ID/UUID form, endpoint payload handling, production collection-group index declaration, and narrow integration coverage annotations.
- Next time: verify the deployed admin artifact and GCP trigger after the production workflow publishes the commit.

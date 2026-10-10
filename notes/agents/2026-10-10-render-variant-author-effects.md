# Render-variant author dirty write

- Unexpected hurdle: after making the Firestore update adapter required, the local GCP simulator also needed to inject it when constructing the renderer.
- Diagnosis: the cloud composition already passed an update adapter for trigger writes, while author metadata is resolved inside the render factory and had retained a raw `DocumentReference.update` call.
- Fix: generalized the adapter name to `updateFirestoreDocument`, threaded it with the external effects boundary through author metadata lookup, and invoked it with a fresh capability. Added the same adapter to local simulator composition and tests for token freshness and recoverable write failures.
- Next-time guidance: inspect nested render metadata lookups and simulator composition whenever a render dependency becomes mandatory; Firestore reads can remain direct while command methods stay behind the typed adapter.

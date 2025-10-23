# Move createFirestore helper into cloud index

- **Challenge:** Relocating `createFirestore` from the core layer initially broke Jest imports because the cloud entry module still loaded Firestore eagerly, so the SDK had to be present even when tests only exercised the helper.
- **Resolution:** Switched the handler to lazily `import('@google-cloud/firestore')` on first use so the helper can be imported during tests without the SDK, and removed the extra copy step from the infra sync script.

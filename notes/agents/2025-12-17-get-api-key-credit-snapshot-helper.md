# get-api-key-credit-v2 snapshot helper

While extracting the Firestore call I double-checked existing exports to avoid circular imports and kept the helper synchronous so it simply returns the DocumentSnapshot promise. Confirmed the existing fetchCredit flow still resolves the snapshot and preserves the String(uuid) coercion.

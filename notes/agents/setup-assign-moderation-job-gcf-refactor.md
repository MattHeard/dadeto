# Assign moderation job GCF refactor

Had to rework the route setup helper so it consumes the Cloud Functions utilities as a bundled object. The tricky part was ensuring the factory signature of `createHandleAssignModerationJob` stayed intact—only passing the `createRunVariantQuery` factory rather than invoking it—so the downstream fetcher could still bind the database correctly. Updated the Jest suite to construct the new dependency shape, which confirmed the refactor without touching generated artifacts.

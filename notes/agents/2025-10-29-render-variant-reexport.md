# Render variant helper re-export follow-up

- Created a Cloud-layer re-export so downstream consumers don't need to reach into core paths.
- Relocated the invalidatePaths test suite under the new tests/ tree and adjusted imports to keep Jest happy.

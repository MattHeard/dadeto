# Assign Moderation Job Export Update

## Challenge
The firebase initialization helper was exported even though no modules consume it. Removing the export risked breaking the module's internal reset logic and testing helpers if references were missed.

## Resolution
Verified that only the local testing bundle references the helper, then converted the export to an internal constant while ensuring the `testing` namespace still re-exports it for tests.

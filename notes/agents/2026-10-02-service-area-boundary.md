# Service-area input boundary

Circle configuration and possession coordinates are raw HTTP/configuration
inputs. Their coercion, range interpretation and fail-closed result construction
now live together in service-area/index.js, a dedicated input boundary. The old
module preserves all public exports; cloud directory copying includes the new
boundary automatically. No gate path exemptions were added.

The rental suite passes58 tests with100% boundary coverage on all metrics
(`/tmp/dadeto-service-area-tests.log`). Repository lint, types, dependency checks
and cloud packaging pass in corresponding `/tmp/dadeto-service-area-*` logs.
Core-parse still exits1 but only reports search-core.js, not service-area
(`/tmp/dadeto-service-area-parse.log`). Finish the temporal/product boundary
repair next; dadeto-aaou remains open pending all aggregate gates.

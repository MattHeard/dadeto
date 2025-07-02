#!/usr/bin/env bash
#
# Fetch the first page (max 500 rows) of *unresolved* SonarCloud issues for the
# dadeto project and save them as a trimmed JSON array in `reports/sonar/sonar_issues.json`.
#
# Prerequisites
# ─────────────
# • The environment variable SONAR_TOKEN must be set to a SonarCloud personal
#   access token (PAT) that has at least the “api” scope.  Do **not** hard‑code
#   the token; export it or inject it as a GitHub Actions secret.
#
# Usage
# ─────
#   SONAR_TOKEN=xxxxxxxx ./get-sonar-issues.sh
#
# Notes
# ─────
# • The component key is project‑specific and hard‑coded here as
#   “MattHeard_dadeto”.  Change it if you fork this repository.
# • Requires `jq` to be available on the PATH.
#

set -euo pipefail

# Ensure output directory exists
mkdir -p reports/sonar

# Verify that the token is present
if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "Error: SONAR_TOKEN environment variable is not set." >&2
  exit 1
fi

# Call SonarCloud API
curl -s -u "${SONAR_TOKEN}:" \
  "https://sonarcloud.io/api/issues/search?componentKeys=MattHeard_dadeto&resolved=false&s=SEVERITY&asc=false&p=1&ps=500" \
| jq '[ .issues[] |
        { key,
          rule,
          severity,
          type,
          status,
          component,
          line,
          message,
          tags,
          creationDate } ]' \
> reports/sonar/sonar_issues.json

echo "✅ Wrote $(jq length reports/sonar/sonar_issues.json) issues to reports/sonar/sonar_issues.json"
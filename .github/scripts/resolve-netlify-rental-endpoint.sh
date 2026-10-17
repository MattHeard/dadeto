#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf '::error::%s\n' "$1" >&2
  exit 1
}

for required_var in GITHUB_REPOSITORY GITHUB_ENV RUNNER_TEMP; do
  [[ -n "${!required_var:-}" ]] || fail "Missing required workflow environment value: ${required_var}."
done

selected_run_id="${GCP_PROD_RUN_ID:-}"
if [[ -z "$selected_run_id" ]]; then
  runs_json="$(gh run list \
    --repo "$GITHUB_REPOSITORY" \
    --workflow gcp-prod.yml \
    --branch main \
    --status success \
    --limit 1 \
    --json databaseId)" || fail 'Could not list successful gcp-prod runs on main.'
  selected_run_id="$(node -e 'const runs = JSON.parse(require("node:fs").readFileSync(0, "utf8")); process.stdout.write(String(runs[0]?.databaseId ?? ""));' <<< "$runs_json")"
  [[ -n "$selected_run_id" ]] ||
    fail 'No successful gcp-prod run on main is available; deploy after gcp-prod succeeds.'
fi

[[ "$selected_run_id" =~ ^[0-9]+$ ]] ||
  fail 'The selected gcp-prod run ID must contain only digits.'

run_json="$(gh run view "$selected_run_id" \
  --repo "$GITHUB_REPOSITORY" \
  --json databaseId,workflowName,headBranch,status,conclusion)" ||
  fail "Could not inspect gcp-prod run ${selected_run_id} in ${GITHUB_REPOSITORY}."

if ! node -e '
  const run = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
  const selectedRunId = Number(process.argv[1]);
  const valid = Number.isSafeInteger(selectedRunId) &&
    run.databaseId === selectedRunId &&
    run.workflowName === "gcp-prod" &&
    run.headBranch === "main" &&
    run.status === "completed" &&
    run.conclusion === "success";
  process.exitCode = valid ? 0 : 1;
' "$selected_run_id" <<< "$run_json"; then
  fail "Run ${selected_run_id} must be a completed successful gcp-prod run on main in ${GITHUB_REPOSITORY}."
fi

artifact_dir="$(mktemp -d "$RUNNER_TEMP/object-minute-rental-search-url.XXXXXX")" ||
  fail 'Could not create a temporary directory for the gcp-prod endpoint artifact.'
trap 'rm -rf "$artifact_dir"' EXIT

if ! gh run download "$selected_run_id" \
  --repo "$GITHUB_REPOSITORY" \
  --name object-minute-rental-search-url \
  --dir "$artifact_dir"; then
  fail "Could not download object-minute-rental-search-url from gcp-prod run ${selected_run_id}."
fi

endpoint_file="$artifact_dir/endpoint.txt"
[[ -s "$endpoint_file" ]] ||
  fail "gcp-prod run ${selected_run_id} has no non-empty endpoint.txt artifact."

endpoint="$(cat "$endpoint_file")"
[[ "$endpoint" =~ ^https://[^[:space:]]+$ ]] ||
  fail "gcp-prod run ${selected_run_id} endpoint.txt must contain one non-empty HTTPS URL."

{
  printf 'DADETO_BUILD_TARGET=production\n'
  printf 'OBJECT_MINUTE_RENTAL_SEARCH_URL=%s\n' "$endpoint"
} >> "$GITHUB_ENV"

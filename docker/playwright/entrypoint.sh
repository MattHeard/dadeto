#!/usr/bin/env bash
set -euo pipefail

export FORCE_COLOR=1
export DEBUG="pw:api,pw:browser*"

# optional debug channels for very verbose wire logs
# export DEBUG="$DEBUG,pw:channel,pw:websocket"

# serialize execution for easier-to-read logs
ARGS="--reporter=html,github,list --workers=1"

# keep traces for failures and upload later
# browsers already in the base image

PLAYWRIGHT_BIN="./node_modules/.bin/playwright"

if [ ! -x "${PLAYWRIGHT_BIN}" ]; then
  echo "Playwright binary not found at ${PLAYWRIGHT_BIN}" >&2
  exit 1
fi

"${PLAYWRIGHT_BIN}" --version || true
node -e "console.log('node', process.version)"
"${PLAYWRIGHT_BIN}" test --list --reporter=list || exit 2

# run tests without aborting the script
set +e
"${PLAYWRIGHT_BIN}" test $ARGS --trace=retain-on-failure | tee /tmp/playwright.log
PW_STATUS=${PIPESTATUS[0]}   # exit code of playwright, not tee
set -e

REPORT_BUCKET="${REPORT_BUCKET:-}"
REPORT_PREFIX="${REPORT_PREFIX:-}"

if [ -z "${REPORT_BUCKET}" ]; then
  echo "REPORT_BUCKET env var must be set" >&2
  PW_STATUS=${PW_STATUS:-1}
fi

DEST="gs://${REPORT_BUCKET}"
[ -n "${REPORT_PREFIX}" ] && DEST="${DEST}/${REPORT_PREFIX}"

upload_with_tool() {
  local tool="$1" src="$2"
  [ ! -e "$src" ] && { echo "Path $src not found; skipping"; return; }
  echo "Uploading $src with $tool to ${DEST}/"
  if [ "$tool" = "gsutil" ]; then
    [ -d "$src" ] && gsutil -m cp -r "$src" "${DEST}/" || gsutil -m cp "$src" "${DEST}/"
  else
    [ -d "$src" ] && gcloud storage cp -r "$src" "${DEST}/" || gcloud storage cp "$src" "${DEST}/"
  fi
}

if command -v gsutil >/dev/null 2>&1; then
  upload_with_tool gsutil /tmp/playwright.log
  upload_with_tool gsutil playwright-report
  upload_with_tool gsutil test-results
elif command -v gcloud >/dev/null 2>&1; then
  upload_with_tool gcloud /tmp/playwright.log
  upload_with_tool gcloud playwright-report
  upload_with_tool gcloud test-results
else
  echo "Neither gsutil nor gcloud is available for uploads" >&2
fi

exit "${PW_STATUS:-1}"

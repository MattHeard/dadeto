#!/usr/bin/env bash
set -euo pipefail

export FORCE_COLOR=1
export DEBUG="pw:api,pw:browser*"

# optional debug channels for very verbose wire logs
# export DEBUG="$DEBUG,pw:channel,pw:websocket"

# serialize execution for easier-to-read logs
ARGS="--reporter=github,list --workers=1"

# keep traces for failures and upload later
npx playwright install --with-deps
npx playwright test $ARGS --trace=retain-on-failure | tee /tmp/playwright.log

REPORT_BUCKET="${REPORT_BUCKET:-}"
REPORT_PREFIX="${REPORT_PREFIX:-}"

if [ -z "${REPORT_BUCKET}" ]; then
  echo "REPORT_BUCKET env var must be set" >&2
  exit 1
fi

DEST="gs://${REPORT_BUCKET}"
if [ -n "${REPORT_PREFIX}" ]; then
  DEST="${DEST}/${REPORT_PREFIX}"
fi

upload_with_tool() {
  local tool="$1"
  local src="$2"

  if [ ! -e "$src" ]; then
    echo "Path $src not found; skipping"
    return
  fi

  echo "Uploading $src with $tool to ${DEST}/"
  if [ "$tool" = "gsutil" ]; then
    if [ -d "$src" ]; then
      gsutil -m cp -r "$src" "${DEST}/"
    else
      gsutil -m cp "$src" "${DEST}/"
    fi
  else
    if [ -d "$src" ]; then
      gcloud storage cp -r "$src" "${DEST}/"
    else
      gcloud storage cp "$src" "${DEST}/"
    fi
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
  exit 1
fi

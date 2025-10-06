#!/usr/bin/env bash
set -euo pipefail

npx playwright install --with-deps
npx playwright test --reporter=line,junit,html

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

  if [ -d "$src" ]; then
    echo "Uploading $src with $tool to ${DEST}/"
    if [ "$tool" = "gsutil" ]; then
      gsutil -m cp -r "$src" "${DEST}/"
    else
      gcloud storage cp -r "$src" "${DEST}/"
    fi
  else
    echo "Directory $src not found; skipping"
  fi
}

if command -v gsutil >/dev/null 2>&1; then
  upload_with_tool gsutil playwright-report
  upload_with_tool gsutil test-results
elif command -v gcloud >/dev/null 2>&1; then
  upload_with_tool gcloud playwright-report
  upload_with_tool gcloud test-results
else
  echo "Neither gsutil nor gcloud is available for uploads" >&2
  exit 1
fi

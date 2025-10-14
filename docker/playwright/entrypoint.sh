#!/usr/bin/env bash
set -euo pipefail

# ---------- logging helpers ----------
log() { printf '%s %s\n' "$(date -Iseconds)" "$*"; }
stage() { log "==> $*"; }
warn() { log "WARN $*"; }
err() { log "ERR  $*"; }

# xtrace with timestamps when TRACE_XTRACE=1
export PS4='+ $(date -Iseconds) '
[ "${TRACE_XTRACE:-0}" = "1" ] && set -x

# traps: show why we exited
on_exit() { log "EXIT code=${PW_STATUS:-$?}"; }
on_err()  { err "set -e triggered (line $1)"; }
trap 'on_exit' EXIT
trap 'on_err $LINENO' ERR
trap 'warn "SIGTERM received"' TERM
trap 'warn "SIGINT received"' INT

export FORCE_COLOR=1
export DEBUG="${DEBUG:-pw:api,pw:browser*}"
export PW_TEST_HTML_REPORT_OPEN="${PW_TEST_HTML_REPORT_OPEN:-never}"

# optional debug channels for very verbose wire logs
# export DEBUG="$DEBUG,pw:channel,pw:websocket"

# serialize execution for easier-to-read logs
ARGS="--reporter=html,github,list --workers=1"

# keep traces for failures and upload later
# browsers already in the base image

PLAYWRIGHT_BIN="./node_modules/.bin/playwright"
UPLOAD_TIMEOUT="${UPLOAD_TIMEOUT:-120}"   # seconds per upload call

if [ ! -x "${PLAYWRIGHT_BIN}" ]; then
  err "Playwright binary not found at ${PLAYWRIGHT_BIN}"
  exit 1
fi

stage "env snapshot"
log "BASE_URL=${BASE_URL:-<unset>}"
log "REPORT_BUCKET=${REPORT_BUCKET:-<unset>}"
log "REPORT_PREFIX=${REPORT_PREFIX:-<unset>}"
command -v gcloud >/dev/null 2>&1 && gcloud --version || warn "gcloud not installed"
command -v gcloud >/dev/null 2>&1 && gcloud config get-value account || true

stage "preflight playwright"
"${PLAYWRIGHT_BIN}" --version || true
node -e "console.log('node', process.version)"
"${PLAYWRIGHT_BIN}" test --list --reporter=list || exit 2

# run tests without aborting the script
set +e
stage "run tests"
"${PLAYWRIGHT_BIN}" test $ARGS --trace=retain-on-failure | tee /tmp/playwright.log
PW_STATUS=${PIPESTATUS[0]}   # exit code of playwright, not tee
set -e
log "tests finished with status=${PW_STATUS}"

stage "post-test artifacts"
for d in /tmp/playwright.log playwright-report test-results; do
  if [ -e "$d" ]; then
    log "artifact present: $d"
    [ -d "$d" ] && du -sh "$d" || ls -l "$d" || true
  else
    warn "artifact missing: $d"
  fi
done

REPORT_BUCKET="${REPORT_BUCKET:-}"
REPORT_PREFIX="${REPORT_PREFIX:-}"

if [ -z "${REPORT_BUCKET}" ]; then
  err "REPORT_BUCKET env var must be set"
  PW_STATUS=${PW_STATUS:-1}
fi

DEST="gs://${REPORT_BUCKET}"
[ -n "${REPORT_PREFIX}" ] && DEST="${DEST}/${REPORT_PREFIX}"

upload_with_tool() {
  local tool="$1" src="$2"
  if [ ! -e "$src" ]; then
    warn "skip upload: $src not found"
    return
  fi
  local start end rc
  start=$(date +%s)
  log "upload start tool=${tool} src=${src} dest=${DEST}/ timeout=${UPLOAD_TIMEOUT}s"
  if [ "$tool" = "gsutil" ]; then
    if [ -d "$src" ]; then timeout "$UPLOAD_TIMEOUT" gsutil -m cp -r "$src" "${DEST}/"; rc=$?; else timeout "$UPLOAD_TIMEOUT" gsutil -m cp "$src" "${DEST}/"; rc=$?; fi
  else
    if [ -d "$src" ]; then timeout "$UPLOAD_TIMEOUT" gcloud storage cp -r "$src" "${DEST}/"; rc=$?; else timeout "$UPLOAD_TIMEOUT" gcloud storage cp "$src" "${DEST}/"; rc=$?; fi
  fi
  end=$(date +%s)
  log "upload end tool=${tool} src=${src} rc=${rc} duration=$((end-start))s"
  if [ "${rc}" -ne 0 ]; then
    err "upload failed tool=${tool} src=${src} rc=${rc}"
  fi
  return 0
}

if command -v gsutil >/dev/null 2>&1; then
  stage "upload via gsutil"
  timeout "$UPLOAD_TIMEOUT" gcloud storage ls "gs://${REPORT_BUCKET}/" >/dev/null 2>&1 || warn "bucket ls failed; uploads may retry and timeout"
  upload_with_tool gsutil /tmp/playwright.log || true
  upload_with_tool gsutil playwright-report || true
  upload_with_tool gsutil test-results || true
elif command -v gcloud >/dev/null 2>&1; then
  stage "upload via gcloud"
  timeout "$UPLOAD_TIMEOUT" gcloud storage ls "gs://${REPORT_BUCKET}/" >/dev/null 2>&1 || warn "bucket ls failed; uploads may retry and timeout"
  upload_with_tool gcloud /tmp/playwright.log || true
  upload_with_tool gcloud playwright-report || true
  upload_with_tool gcloud test-results || true
else
  err "Neither gsutil nor gcloud is available for uploads"
fi

log "exiting with PW_STATUS=${PW_STATUS:-1}"
exit "${PW_STATUS:-1}"

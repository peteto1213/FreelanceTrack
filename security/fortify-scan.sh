#!/usr/bin/env bash
# Fortify SAST gate. Exits non-zero when the scanner is missing or the scan fails.
set -euo pipefail

if [[ -z "${FORTIFY_CLIENT_TOKEN:-}" || -z "${FORTIFY_URL:-}" ]]; then
  echo "Fortify credentials are not set. Refusing to pass the security gate."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v sourceanalyzer >/dev/null 2>&1; then
  sourceanalyzer -b freelancetrack -clean
  sourceanalyzer -b freelancetrack server/src client/src
  sourceanalyzer -b freelancetrack -scan -f freelancetrack.fpr
  echo "Fortify FPR written to freelancetrack.fpr. Upload it to ${FORTIFY_URL} with the client token."
  exit 0
fi

if command -v scancentral >/dev/null 2>&1; then
  scancentral package -o freelancetrack.zip
  echo "ScanCentral package written to freelancetrack.zip. Submit it to ${FORTIFY_URL}."
  exit 0
fi

echo "Fortify CLI (sourceanalyzer or scancentral) is not installed on this runner."
exit 1

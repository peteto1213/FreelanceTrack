#!/usr/bin/env bash
# Sonatype Nexus IQ policy evaluation against both lockfiles.
set -euo pipefail

if [[ -z "${NEXUS_IQ_URL:-}" || -z "${NEXUS_IQ_AUTH:-}" ]]; then
  echo "Nexus IQ credentials are not set. Refusing to pass the security gate."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APP_ID="${NEXUS_IQ_APP:-freelancetrack}"
CLI="${NEXUS_IQ_CLI:-nexus-iq-cli.jar}"

if [[ ! -f "$CLI" ]]; then
  echo "Nexus IQ CLI jar not found at ${CLI}."
  echo "Download nexus-iq-cli.jar from the IQ server and set NEXUS_IQ_CLI if it lives elsewhere."
  exit 1
fi

java -jar "$CLI" \
  -i "$APP_ID" \
  -s "$NEXUS_IQ_URL" \
  -a "$NEXUS_IQ_AUTH" \
  -t build \
  -r iq-server-report.json \
  server/package-lock.json \
  client/package-lock.json

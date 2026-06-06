#!/usr/bin/env bash
# Hermes Gateway 验收脚本（P0-06）
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"
HERMES_URL="${HERMES_API_URL:-http://127.0.0.1:8642}"

echo "==> 1. App health"
curl -sf "${APP_URL}/api/health" | head -c 500
echo ""

echo "==> 2. Hermes health via app"
curl -sf "${APP_URL}/api/hermes/health"
echo ""

echo "==> 3. Hermes Gateway direct (optional)"
if curl -sf "${HERMES_URL}/health" >/dev/null 2>&1; then
  echo "Gateway OK: ${HERMES_URL}/health"
  curl -sf "${HERMES_URL}/health"
  echo ""
else
  echo "Gateway not reachable at ${HERMES_URL} (expected if CLI/gateway not running)"
fi

if command -v hermes >/dev/null 2>&1; then
  echo "==> 4. hermes doctor"
  hermes doctor || true
else
  echo "==> 4. hermes CLI not installed (skip doctor)"
fi

echo "Done. Set HERMES_API_URL and HERMES_EXECUTOR=nous_hermes to route tasks via Gateway."

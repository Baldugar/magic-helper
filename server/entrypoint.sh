#!/usr/bin/env sh
set -e

# 1) If ARANGO_ADDR is defined, patch the JSON
if [ -n "$ARANGO_ADDR" ]; then
  sed -i 's/"addr":[[:space:]]*".*"/"addr":"'"$ARANGO_ADDR"'"/' settings.development.json
fi

# 2) Wait for ArangoDB to come up (timeout 60s so we do not block forever)
exec ./wait-for-it.sh -t 60 "${ARANGO_ADDR:-localhost}:8529" -- \
     ./magic-helper -settings settings.development.json

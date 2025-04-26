#!/usr/bin/env sh
set -e

# 1) If ARANGO_ADDR is defined, patch the JSON
if [ -n "$ARANGO_ADDR" ]; then
  sed -i 's/"addr":[[:space:]]*".*"/"addr":"'"$ARANGO_ADDR"'"/' settings.development.json
fi

# 2) Wait for ArangoDB to come up
exec ./wait-for-it.sh "${ARANGO_ADDR:-localhost}:8529" -- \
     ./magic-helper -settings settings.development.json

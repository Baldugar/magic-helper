#!/usr/bin/env sh
set -e
go fmt
go build
./magic-helper -settings settings.development.json

#!/usr/bin/env sh
set -e
go fmt ./...
go build -o magic-helper ./cmd/main.go
./magic-helper -settings settings.development.json

# server/Dockerfile
# Published ports are in docker-compose (and optional .env). Server listens on 8080 inside the container only.
# 1) Builder
FROM golang:1.23-alpine AS builder
WORKDIR /app

# 1.1) Copiamos sólo go.mod/go.sum e instalamos deps
COPY go.mod go.sum ./
RUN go mod download

# 1.2) Copiamos el resto del código (incluye main.go, run.sh, settings...)
COPY . .

# 1.3) Formateamos y compilamos el binario (release, sin debug para arranque mas rapido)
RUN go fmt ./... \
 && CGO_ENABLED=0 go build -ldflags="-s -w" -trimpath -o magic-helper main.go

# 2) Runtime
FROM alpine:latest
RUN apk add --no-cache ca-certificates bash

WORKDIR /app

# Copiamos binario, settings y wait-for-it
COPY --from=builder /app/magic-helper .
COPY --from=builder /app/settings.development.json .
COPY --from=builder /app/wait-for-it.sh .
COPY entrypoint.sh .

# Make sure our scripts are executable
RUN sed -i 's/\r$//' wait-for-it.sh entrypoint.sh \
 && chmod +x wait-for-it.sh entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]



# server/Dockerfile
# 1) Builder
FROM golang:1.23-alpine AS builder
WORKDIR /app

# 1.1) Copiamos sólo go.mod/go.sum e instalamos deps
COPY go.mod go.sum ./
RUN go mod download

# 1.2) Copiamos el resto del código (incluye main.go, run.sh, settings...)
COPY . .

# 1.3) Formateamos y compilamos el binario desde main.go
RUN go fmt ./... \
 && go build -o magic-helper main.go

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
RUN chmod +x wait-for-it.sh entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]



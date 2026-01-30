# client/Dockerfile
# Published ports are in docker-compose (and optional .env). Client listens on 80 inside the container only.

# 1) Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copiamos dependencias y metemos la variable de build
COPY package*.json ./
RUN npm ci

COPY . .

# GraphQL URL at build time. Default: local server (8080). docker-compose overrides with "/graphql" (same-origin via proxy).
ARG VITE_API_URL="http://localhost:8080/graphql"
# Exportamos la variable para que Vite la reconozca (prefijo VITE_)
ENV VITE_API_URL=$VITE_API_URL

# Ejecuta el build de Vite, que usará import.meta.env.VITE_API_URL
RUN npm run build

# 2) Runtime stage
FROM nginx:stable-alpine
RUN apk add --no-cache wget
# Reemplaza el conf por defecto
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

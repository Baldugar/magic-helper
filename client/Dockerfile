# client/Dockerfile

# 1) Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copiamos dependencias y metemos la variable de build
COPY package*.json ./
RUN npm ci

COPY . .

# Argumento de build para la URL de tu GraphQL
ARG VITE_API_URL="http://localhost:8080/graphql"
# Exportamos la variable para que Vite la reconozca (prefijo VITE_)
ENV VITE_API_URL=$VITE_API_URL

# Ejecuta el build de Vite, que usará import.meta.env.VITE_API_URL
RUN npm run build

# 2) Runtime stage
FROM nginx:stable-alpine
# Reemplaza el conf por defecto
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

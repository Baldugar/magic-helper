# Deployment Guide

This guide covers deploying Magic Helper to production environments.

## Docker Compose Deployment

The recommended deployment method uses Docker Compose.

### Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  arangodb:
    image: arangodb:latest
    environment:
      ARANGO_ROOT_PASSWORD: ${ARANGO_PASSWORD}
    volumes:
      - arango-data:/var/lib/arangodb3
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8529/_api/version"]
      interval: 30s
      timeout: 10s
      retries: 5

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - ARANGO_HOST=arangodb
      - ARANGO_PORT=8529
      - ARANGO_PASSWORD=${ARANGO_PASSWORD}
    depends_on:
      arangodb:
        condition: service_healthy
    restart: unless-stopped

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
      args:
        VITE_API_URL: /graphql
    depends_on:
      - server
    restart: unless-stopped

  proxy:
    image: nginx:stable-alpine
    ports:
      - "${PORT:-80}:80"
      - "${SSL_PORT:-443}:443"
    volumes:
      - ./nginx/proxy.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - client
      - server
    restart: unless-stopped

volumes:
  arango-data:
```

### Environment Variables

Create `.env` for production:

```env
# Database
ARANGO_PASSWORD=your-secure-password-here

# Ports
PORT=80
SSL_PORT=443

# Optional
LOG_LEVEL=info
```

### Deploy

```bash
# Pull latest code
git pull origin main

# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Nginx Configuration

### Basic Configuration

`nginx/proxy.conf`:

```nginx
upstream client {
    server client:80;
}

upstream server {
    server server:8080;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS (if using SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://client;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /graphql {
        proxy_pass http://server/graphql;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Configuration

For HTTPS, update `nginx/proxy.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # ... rest of config
}
```

## Server Settings

Create `server/settings.production.json`:

```json
{
  "allowCrossOrigin": false,
  "logging": {
    "logLevel": "info"
  },
  "httpListen": "8080",
  "graphQLPlayground": false,
  "arangoDB": {
    "addr": "arangodb",
    "port": "8529",
    "name": "MagicHelper",
    "user": "root",
    "password": "${ARANGO_PASSWORD}"
  }
}
```

## Database Management

### Backup

Create a backup script `scripts/backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/magic-helper"

mkdir -p $BACKUP_DIR

docker exec magic-helper-arangodb arangodump \
    --server.database MagicHelper \
    --output-directory /tmp/backup

docker cp magic-helper-arangodb:/tmp/backup $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR/$DATE"
```

### Restore

```bash
#!/bin/bash
BACKUP_PATH=$1

if [ -z "$BACKUP_PATH" ]; then
    echo "Usage: ./restore.sh /path/to/backup"
    exit 1
fi

docker cp $BACKUP_PATH magic-helper-arangodb:/tmp/restore

docker exec magic-helper-arangodb arangorestore \
    --server.database MagicHelper \
    --input-directory /tmp/restore \
    --overwrite true

echo "Restore completed from: $BACKUP_PATH"
```

### Scheduled Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh >> /var/log/magic-helper-backup.log 2>&1
```

## Monitoring

### Health Checks

The docker-compose file includes health checks. Monitor with:

```bash
docker-compose ps
```

### Logs

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server

# Last 100 lines
docker-compose logs --tail=100 server
```

### Resource Usage

```bash
docker stats
```

## Updating

### Standard Update

```bash
# Pull latest
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs for errors
docker-compose logs -f
```

### Zero-Downtime Update

For zero downtime, use rolling updates:

```bash
# Build new images
docker-compose -f docker-compose.prod.yml build

# Update services one by one
docker-compose -f docker-compose.prod.yml up -d --no-deps client
docker-compose -f docker-compose.prod.yml up -d --no-deps server
```

## Security Considerations

### 1. Change Default Passwords

Never use default passwords in production:

```env
ARANGO_PASSWORD=generate-a-strong-password-here
```

### 2. Disable GraphQL Playground

In production settings:

```json
{
  "graphQLPlayground": false
}
```

### 3. Use HTTPS

Always use HTTPS in production with valid certificates.

### 4. Firewall Rules

Only expose necessary ports:

```bash
# Allow only HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block direct database access
ufw deny 8529/tcp
ufw deny 8530/tcp
```

### 5. Rate Limiting

Add to nginx:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /graphql {
    limit_req zone=api burst=20 nodelay;
    # ... rest of config
}
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs server

# Check container status
docker ps -a

# Inspect container
docker inspect magic-helper-server
```

### Database Connection Issues

1. Verify ArangoDB is healthy
2. Check network connectivity between containers
3. Verify credentials

```bash
# Test connection
docker exec magic-helper-server curl http://arangodb:8529/_api/version
```

### Out of Memory

Increase container memory limits in docker-compose:

```yaml
services:
  server:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Disk Space

Check disk usage:

```bash
docker system df
docker system prune -a  # Clean up unused images
```

## Cloud Deployment

### AWS (ECS/Fargate)

1. Push images to ECR
2. Create ECS task definition
3. Configure Application Load Balancer
4. Set up RDS or use containerized ArangoDB

### Google Cloud (Cloud Run)

1. Push images to Artifact Registry
2. Deploy to Cloud Run
3. Configure Cloud SQL or Firestore

### DigitalOcean (App Platform)

1. Connect GitHub repository
2. Configure services in app spec
3. Add managed database

## Performance Tuning

### ArangoDB

```json
// arangod.conf
{
  "server": {
    "threads": 4
  },
  "cache": {
    "size": 1073741824
  }
}
```

### Nginx

```nginx
worker_processes auto;
worker_connections 1024;

gzip on;
gzip_types text/plain application/json application/javascript text/css;

proxy_cache_path /tmp/nginx levels=1:2 keys_zone=api_cache:10m;
```

### Go Server

Compile with optimizations:

```bash
CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server
```

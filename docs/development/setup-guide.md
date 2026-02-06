# Development Setup Guide

This guide walks you through setting up your development environment for Magic Helper.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Frontend build |
| Go | 1.23+ | Backend server |
| Docker | Latest | Database & orchestration |
| Git | Latest | Version control |

### Recommended Tools

- **VS Code** - IDE with great TypeScript/Go support
- **Docker Desktop** - Easy Docker management
- **Postman** or **Insomnia** - API testing

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/magic-helper.git
cd magic-helper
```

### 2. Start with Docker (Recommended)

The easiest way to run everything:

```bash
docker-compose up -d
```

This starts:
- ArangoDB on port 8530
- Go server on port 8080 (internal)
- React client (built)
- Nginx proxy on port 3001

Access the app at: http://localhost:3001

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
```

## Development Mode

For active development with hot reload:

### Terminal 1: Database

```bash
docker-compose up -d arangodb
```

### Terminal 2: Backend

```bash
cd server
go run main.go -settings settings.development.json
```

### Terminal 3: Frontend

```bash
cd client
npm install
npm run dev
```

Access:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080/graphql
- ArangoDB UI: http://localhost:8530

## Project Structure

```
magic-helper/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # State management
│   │   ├── graphql/        # GraphQL operations
│   │   ├── pages/          # Route pages
│   │   └── utils/          # Utilities
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Go backend
│   ├── graph/              # GraphQL resolvers
│   ├── daemons/            # Background services
│   ├── main.go
│   └── go.mod
├── graphql/                # GraphQL schema (SDL)
├── docs/                   # Documentation
├── nginx/                  # Proxy config
├── docker-compose.yml
└── package.json            # Docs scripts
```

## Frontend Development

### Install Dependencies

```bash
cd client
npm install
```

### Start Dev Server

```bash
npm run dev
```

Opens at http://localhost:5173 with hot module replacement.

### Generate GraphQL Types

After schema changes:

```bash
npm run generate
```

This reads `../graphql/**/*.graphqls` and generates TypeScript types.

### Linting

```bash
npm run lint
```

Runs ESLint with strict TypeScript checking.

### Type Checking

```bash
npm run type-check
```

TypeScript compiler check without emit.

### Build for Production

```bash
npm run build
```

Outputs to `dist/` folder.

## Backend Development

### Install Dependencies

```bash
cd server
go mod download
```

### Run Server

```bash
go run main.go -settings settings.development.json
```

### Generate GraphQL Code

After schema changes:

```bash
go generate ./...
```

This runs gqlgen to regenerate resolver interfaces.

### Build Binary

```bash
go build -o magic-helper-server
```

## Database Setup

### Start ArangoDB

```bash
docker-compose up -d arangodb
```

### Access ArangoDB UI

Open http://localhost:8530

- Username: `root`
- Password: `arangodb` (from docker-compose.yml)
- Database: `MagicHelper`

### Initial Data

The server creates collections automatically on first run. Card data is fetched from Scryfall by the background daemons.

### Manual Data Import

To trigger a manual import:

```graphql
mutation {
  reimportMTGData {
    status
    message
  }
}
```

## GraphQL Development

### Schema Location

Schema files are in `graphql/`:

```
graphql/
├── query.graphqls          # Query type
├── mutation.graphqls       # Mutation type
├── type.base.graphqls      # Base types
└── MTG/
    ├── Card/type.graphqls
    ├── Deck/type.graphqls
    └── ...
```

### Testing Queries

Use the GraphQL Playground at http://localhost:8080/graphql (when `graphQLPlayground: true` in settings).

Example query:

```graphql
query {
  getMTGCards {
    id
    name
    manaCost
    versions {
      set
      rarity
    }
  }
}
```

### Adding a New Field

1. Update schema in `graphql/`
2. Regenerate Go code: `cd server && go generate ./...`
3. Regenerate TS types: `cd client && npm run generate`
4. Implement resolver in `server/graph/mtg/`
5. Use in frontend

## Environment Configuration

### Backend Settings

Create `server/settings.development.json`:

```json
{
  "allowCrossOrigin": true,
  "logging": {
    "logLevel": "debug"
  },
  "httpListen": "8080",
  "graphQLPlayground": true,
  "arangoDB": {
    "addr": "localhost",
    "port": "8529",
    "name": "MagicHelper",
    "user": "root",
    "password": "arangodb"
  }
}
```

### Frontend Environment

Create `client/.env.local`:

```env
VITE_API_URL=http://localhost:8080/graphql
```

For Docker:
```env
VITE_API_URL=/graphql
```

## Common Tasks

### Add a New Component

1. Create file in `client/src/components/`
2. Export from index if applicable
3. Import where needed
4. Add to routing if it's a page

### Add a New GraphQL Query

1. Add to schema (`graphql/`)
2. Regenerate code (both Go and TS)
3. Implement resolver
4. Create query file in `client/src/graphql/MTGA/queries/`
5. Add to `functions.ts`

### Add a New Database Collection

1. Add model to `server/graph/model/dbTypes.go`
2. Add collection creation in `server/arango/`
3. Create resolver functions
4. Update GraphQL schema

### Modify Filter System

1. Update `MTGFilterType` in `client/src/context/MTGA/Filter/MTGFilterContext.ts`
2. Update conversion in `MTGFilterProvider.tsx`
3. Update GraphQL input in `graphql/MTG/Filter/input.graphqls`
4. Update backend filter in `server/util/mtgCardSearch/`

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8080
# Or on Windows
netstat -ano | findstr :8080

# Kill process or change port in settings
```

### ArangoDB Connection Failed

1. Check Docker is running: `docker ps`
2. Verify port mapping: should be 8530:8529
3. Check credentials in settings
4. Wait for ArangoDB to fully start (can take 30+ seconds)

### GraphQL Types Out of Sync

```bash
# Regenerate both
cd server && go generate ./...
cd ../client && npm run generate
```

### Frontend Can't Connect to Backend

1. Check CORS settings in backend
2. Verify `VITE_API_URL` environment variable
3. Check backend is running
4. Look for errors in browser console

### Hot Reload Not Working

1. Check Vite is running (not built version)
2. Clear browser cache
3. Restart dev server
4. Check for syntax errors

## Code Style

### TypeScript

- Strict mode enabled
- ESLint with no-warnings
- 4-space indentation
- Single quotes
- No unused variables

### Go

- Standard gofmt formatting
- Meaningful variable names
- Comments in English (per AGENTS.MD)
- Error handling at every level

### GraphQL

- PascalCase for types
- camelCase for fields
- Descriptive names
- Input types for mutations

## Next Steps

- [Architecture Overview](/technical/architecture-overview) - Understand the system
- [Frontend Architecture](/technical/frontend-architecture) - React patterns
- [Backend Architecture](/technical/backend-architecture) - Go patterns
- [Deployment](/development/deployment) - Production setup

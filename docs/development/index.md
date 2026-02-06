# Development Guide

This section covers everything you need to set up your development environment and contribute to Magic Helper.

## Quick Start

1. Clone the repository
2. Install dependencies
3. Start the Docker stack
4. Access the application

See [Setup Guide](/development/setup-guide) for detailed instructions.

## Documentation

- [Setup Guide](/development/setup-guide) - Complete development environment setup
- [Deployment](/development/deployment) - Production deployment with Docker

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
│   └── package.json
├── server/                 # Go backend
│   ├── graph/              # GraphQL resolvers
│   ├── daemons/            # Background services
│   └── main.go
├── graphql/                # GraphQL schema files
├── docs/                   # This documentation
├── nginx/                  # Proxy configuration
└── docker-compose.yml
```

## Development Workflow

### Making Changes

1. Create a feature branch
2. Make your changes
3. Run linting: `cd client && npm run lint`
4. Test manually
5. Submit a pull request

### Code Style

- TypeScript with strict mode
- ESLint with no-warnings policy
- 4-space indentation
- Single quotes for strings
- See `AGENTS.MD` for complete guidelines

## Useful Commands

```bash
# Frontend
cd client
npm run dev          # Start dev server
npm run lint         # Run linting
npm run generate     # Generate GraphQL types

# Documentation
npm run docs:dev     # Start docs server
npm run docs:build   # Build docs

# Docker
docker-compose up -d        # Start all services
docker-compose logs -f      # View logs
./rebuild-docker.sh         # Rebuild containers
```

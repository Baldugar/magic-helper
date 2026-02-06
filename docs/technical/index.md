# Technical Documentation

This section provides in-depth technical documentation for developers and contributors.

## Architecture

- [Architecture Overview](/technical/architecture-overview) - High-level system design and technology choices
- [Frontend Architecture](/technical/frontend-architecture) - React, Context providers, and ReactFlow integration
- [Backend Architecture](/technical/backend-architecture) - Go server, GraphQL, and data flow
- [Database Schema](/technical/database-schema) - ArangoDB collections and relationships

## Core Systems

- [Filter System](/technical/filter-system) - Ternary boolean filter implementation
- [Tag Chain System](/technical/tag-chain-system) - Hierarchical tag management

## Quick Reference

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18.2 with TypeScript |
| Build Tool | Vite with SWC |
| Visual Canvas | ReactFlow (XYFlow) 12.3 |
| UI Components | Material-UI 5.14 |
| State Management | React Context API |
| Backend Language | Go 1.23 |
| API Layer | GraphQL with gqlgen |
| Database | ArangoDB |
| Card Data | Scryfall API |

### Key Design Decisions

1. **Graph Database**: ArangoDB provides flexible document + edge model for card relationships
2. **In-Memory Search Index**: Cards cached in memory for fast filtering (100k+ cards)
3. **Ternary Boolean Filters**: Three-state filters (include/exclude/neutral) for precise searches
4. **Visual Deck Building**: ReactFlow enables spatial card arrangement like a physical table

## Roadmap and Missing Features

### High Priority

| Feature | Status | Location |
|---------|--------|----------|
| Unit Tests | Not Started | No test files exist |
| Subtype Filtering | Stubbed | `MTGFilterProvider.tsx:178` |
| Deck Update Optimization | TODO | `decks_mutations.go:158` |

### Medium Priority

| Feature | Status | Location |
|---------|--------|----------|
| Multi-language Support | Hardcoded EN | `MTGCardsFetch.go:303` |
| Accessibility Audit | Not Started | - |
| Context Menu Integration | Partial | `CatalogueCard.tsx` |
| ChainBuilder Enhancements | In Progress | `ChainBuilderDialog.tsx` |

### Lower Priority

| Feature | Status |
|---------|--------|
| Storybook Integration | Not Started |
| Card Ignore Polish | TODO in code |
| Profile Features | Planned |

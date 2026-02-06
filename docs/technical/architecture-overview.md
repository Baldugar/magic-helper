# Architecture Overview

Magic Helper is a full-stack web application for visual deck building. This document provides a high-level overview of the system architecture.

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI framework |
| TypeScript | 5.0 | Type safety |
| Vite | 4.4 | Build tool with HMR |
| ReactFlow (XYFlow) | 12.3 | Visual canvas for deck building |
| Material-UI | 5.14 | UI component library |
| React Router | 6.27 | Client-side routing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.23 | Server language |
| gqlgen | 0.17 | GraphQL code generation |
| ArangoDB | Latest | Multi-model database |
| zerolog | 1.33 | Structured logging |
| Gorilla Mux | 1.8 | HTTP routing |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Container Runtime | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Card Data Source | Scryfall API |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React Application                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │  Dashboard  │  │ DeckCreator │  │   FilterBar     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  │                          │                                │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │              Context Providers                     │   │   │
│  │  │  MTGDecks → MTGFilter → MTGCards → DeckCreator   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ GraphQL (HTTP)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Nginx Proxy                               │
│                    (localhost:3001)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────┐                   ┌──────────────────┐
│   React Client   │                   │    Go Server     │
│   (Static Files) │                   │   (/graphql)     │
└──────────────────┘                   └──────────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
                    │  Resolvers  │   │   Daemons   │   │ Card Index  │
                    │  (GraphQL)  │   │  (Scryfall) │   │ (In-Memory) │
                    └─────────────┘   └─────────────┘   └─────────────┘
                              │                 │
                              └────────┬────────┘
                                       ▼
                            ┌─────────────────────┐
                            │      ArangoDB       │
                            │  (Document + Graph) │
                            └─────────────────────┘
```

## Key Design Decisions

### 1. Graph Database (ArangoDB)

**Why**: MTG deck building involves complex relationships:
- Cards belong to multiple decks
- Tags assigned to cards and decks
- Cards have multiple versions (printings)
- Zones contain cards with parent-child relationships

**Benefit**: ArangoDB's multi-model approach (documents + edges) naturally represents these relationships without complex joins.

### 2. In-Memory Card Search Index

**Why**: The full MTG card database contains 100,000+ cards. Filtering must be instantaneous.

**How**: All cards are loaded into a Go in-memory index on server startup. Filtering uses predicate functions against this index, avoiding database queries for searches.

**Trade-off**: Higher memory usage (~500MB) but sub-millisecond filter times.

### 3. Ternary Boolean Filters

**Why**: Simple include/exclude filters are insufficient for card searches. Users need:
- Include green cards AND exclude red cards
- No preference on blue cards (neutral)

**Implementation**: Each filter criterion has three states: `POSITIVE`, `NEGATIVE`, `UNSET`.

### 4. ReactFlow Visual Canvas

**Why**: The core value proposition is "deck building like on a physical table."

**How**: ReactFlow provides:
- Draggable nodes (cards and zones)
- Parent-child relationships (cards in zones)
- Pan/zoom navigation
- Mini-map for overview

### 5. Context-Based State Management

**Why**: Complex, interconnected state (filters affect cards, cards affect deck, deck affects UI).

**How**: Six nested React Context providers, each with a single responsibility:
1. Decks list
2. Filter state
3. Card results
4. UI state
5. Deck logic
6. ReactFlow integration

## Request Flow

### Card Search Request

1. User updates filter in `FilterBar`
2. `MTGFilterProvider` converts UI filter to GraphQL input
3. `MTGCardsProvider` sends `getMTGCardsFiltered` query
4. Go resolver receives request
5. In-memory card index applies filter predicates
6. Heap-based pagination selects top K results
7. Results returned through GraphQL
8. `MTGCardsProvider` updates state
9. UI re-renders with new cards

### Deck Save Request

1. User triggers save in `DeckCreator`
2. `MTGDeckCreatorLogicProvider` collects deck state
3. Sends `updateMTGDeck` mutation
4. Go resolver processes mutation
5. ArangoDB updates deck document and card edges
6. Success response triggers UI update
7. `MTGDecksProvider` propagates changes to dashboard

## Directory Structure

```
magic-helper/
├── client/                     # Frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   └── deckBuilder/    # Deck building UI
│   │   ├── context/            # State management
│   │   │   └── MTGA/           # MTG-specific contexts
│   │   ├── graphql/            # GraphQL operations
│   │   ├── pages/              # Route components
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utilities
│   └── package.json
├── server/                     # Backend application
│   ├── graph/                  # GraphQL layer
│   │   ├── mtg/                # Domain resolvers
│   │   └── model/              # Data models
│   ├── daemons/                # Background services
│   ├── arango/                 # Database utilities
│   ├── util/                   # Server utilities
│   └── main.go                 # Entry point
├── graphql/                    # GraphQL schema (SDL)
│   ├── MTG/                    # MTG-specific types
│   ├── query.graphqls          # Query definitions
│   └── mutation.graphqls       # Mutation definitions
├── docs/                       # Documentation (this site)
├── nginx/                      # Proxy configuration
└── docker-compose.yml          # Container orchestration
```

## Performance Considerations

### Frontend
- **Virtualization**: Large card lists use `react-window` for efficient rendering
- **Memoization**: Heavy computations wrapped in `useMemo`/`useCallback`
- **Lazy Loading**: Card images load on demand

### Backend
- **In-Memory Index**: Eliminates database queries for card filtering
- **Heap Pagination**: O(n log k) complexity for top-k results
- **AQL Index Hints**: Database queries use explicit index hints
- **Request Cancellation**: Stale requests cancelled on frontend

### Database
- **Edge Collections**: Graph traversals instead of joins
- **Index Strategy**: Indexes on frequently queried fields
- **Batch Operations**: Bulk inserts during Scryfall imports

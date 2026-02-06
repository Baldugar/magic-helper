# Backend Architecture

The Magic Helper backend is a Go application serving a GraphQL API. This document covers the server architecture, data flow, and key components.

## Directory Structure

```
server/
├── main.go                     # Application entry point
├── graph/
│   ├── resolver.go             # Root resolver
│   ├── query.resolvers.go      # Query operation routing
│   ├── mutation.resolvers.go   # Mutation operation routing
│   ├── mtg/                    # MTG domain resolvers
│   │   ├── cards_queries.go    # Card queries
│   │   ├── decks_queries.go    # Deck queries
│   │   ├── decks_mutations.go  # Deck mutations
│   │   ├── tags_queries.go     # Tag queries
│   │   ├── tags_mutations.go   # Tag mutations
│   │   ├── filter_presets_queries.go
│   │   └── filter_presets_mutations.go
│   ├── model/
│   │   ├── dbTypes.go          # Database model types
│   │   └── models_gen.go       # Generated GraphQL types
│   └── gentypes/               # gqlgen generated code
├── daemons/
│   ├── MTGSetsFetch.go         # Set synchronization daemon
│   ├── MTGCardsFetch.go        # Card synchronization daemon
│   ├── importManager.go        # Import state management
│   └── utils.go                # Daemon utilities
├── arango/
│   ├── connection.go           # Database connection
│   └── query.go                # Query builder
├── settings/
│   └── settings.go             # Configuration management
└── util/
    └── mtgCardSearch/
        ├── searchFunctions.go  # In-memory filtering
        └── utils.go            # Search utilities
```

## Server Initialization

**Location**: `main.go`

The server starts up in this order:

```go
func main() {
    // 1. Parse command-line flags
    flag.StringVar(&settingsFile, "settings", "", "Path to settings file")
    flag.Parse()

    // 2. Load configuration
    settings.LoadSettings(settingsFile)

    // 3. Configure logging
    zerolog.SetGlobalLevel(settings.GetLogLevel())

    // 4. Initialize ArangoDB connection (with retries)
    arango.InitializeDatabase()

    // 5. Warm up in-memory card index
    mtgCardSearch.BuildCardIndex()

    // 6. Start background daemons
    go daemons.StartSetsFetcher()
    go daemons.StartCardsFetcher()

    // 7. Setup HTTP server
    router := mux.NewRouter()
    router.Handle("/graphql", graphqlHandler())

    // 8. Start listening
    http.ListenAndServe(":8080", router)
}
```

## Configuration

**Location**: `settings/settings.go`

Configuration is loaded from a JSON file:

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

## GraphQL API

### Schema Organization

**Location**: `graphql/`

```
graphql/
├── query.graphqls              # Root query type
├── mutation.graphqls           # Root mutation type
├── type.base.graphqls          # Base types and directives
└── MTG/
    ├── Card/
    │   └── type.graphqls       # MTG_Card, MTG_CardVersion
    ├── Deck/
    │   └── type.graphqls       # MTG_Deck, MTG_DeckCard
    ├── Tag/
    │   ├── type.graphqls       # MTG_Tag, MTG_TagAssignment
    │   └── input.graphqls      # Tag mutation inputs
    ├── Filter/
    │   └── input.graphqls      # MTGCardFilter input
    └── Import/
        └── type.graphqls       # Import status types
```

### Query Operations

| Query | Description | Resolver |
|-------|-------------|----------|
| `getMTGCards` | All cards (no filtering) | `cards_queries.go` |
| `getMTGCardsFiltered` | Cards with filtering/pagination | `cards_queries.go` |
| `getMTGFilters` | Available filter options | `cards_queries.go` |
| `getMTGDecks` | Dashboard deck list | `decks_queries.go` |
| `getMTGDeck(deckID)` | Single deck details | `decks_queries.go` |
| `getMTGTags` | All tags | `tags_queries.go` |
| `getMTGTagChains` | All tag chains | `tags_queries.go` |
| `getMTGFilterPresets(deckID)` | Saved filter presets | `filter_presets_queries.go` |

### Mutation Operations

| Mutation | Description | Resolver |
|----------|-------------|----------|
| `createMTGDeck` | Create new deck | `decks_mutations.go` |
| `updateMTGDeck` | Update deck | `decks_mutations.go` |
| `deleteMTGDeck` | Delete deck | `decks_mutations.go` |
| `createMTGTag` | Create tag | `tags_mutations.go` |
| `assignTagToCard` | Assign tag to card | `tags_mutations.go` |
| `reimportMTGData` | Trigger data reimport | `importManager.go` |

## Resolver Architecture

### Pattern

Resolvers are thin routing layers that delegate to domain functions:

```go
// query.resolvers.go
func (r *queryResolver) GetMTGCardsFiltered(
    ctx context.Context,
    filter *model.MTGCardFilter,
    sort []*model.MTGSortInput,
    page *int,
) (*model.MTGCardPaginatedResponse, error) {
    return mtg.GetMTGCardsFiltered(ctx, filter, sort, page)
}
```

Domain logic lives in `graph/mtg/`:

```go
// mtg/cards_queries.go
func GetMTGCardsFiltered(
    ctx context.Context,
    filter *model.MTGCardFilter,
    sort []*model.MTGSortInput,
    page *int,
) (*model.MTGCardPaginatedResponse, error) {
    // 1. Build filter predicates
    predicates := buildFilterPredicates(filter)

    // 2. Query in-memory index
    results := mtgCardSearch.FilterCardsWithPagination(predicates, sort, page)

    // 3. Return paginated response
    return &model.MTGCardPaginatedResponse{
        Cards:      results.Cards,
        TotalCount: results.Total,
    }, nil
}
```

## In-Memory Card Index

**Location**: `util/mtgCardSearch/`

The card index provides fast filtering without database queries.

### Index Structure

```go
type CardIndex struct {
    Cards      []MTG_Card           // All cards
    ByID       map[string]*MTG_Card // ID lookup
    TagsIndex  map[string][]string  // Tag -> Card IDs
}
```

### Building the Index

```go
func BuildCardIndex() {
    // 1. Fetch all cards from ArangoDB
    cards := fetchAllCardsFromDB()

    // 2. Fetch all tag assignments
    tags := fetchTagAssignments()

    // 3. Build index structures
    index.Cards = cards
    index.ByID = buildIDMap(cards)
    index.TagsIndex = buildTagIndex(tags)
}
```

### Filtering Algorithm

```go
func FilterCardsWithPagination(
    filter *model.MTGCardFilter,
    sort []*model.MTGSortInput,
    page *int,
) *PaginatedResult {
    // 1. Build predicate function
    passes := func(card *MTG_Card) bool {
        return passesNameFilter(card, filter.SearchString) &&
               passesColorFilter(card, filter.Colors) &&
               passesTypeFilter(card, filter.CardTypes) &&
               // ... more predicates
    }

    // 2. Build comparison function for sorting
    less := buildComparator(sort)

    // 3. Use heap for efficient top-K selection
    heap := NewCardHeap(pageSize, less)
    for _, card := range index.Cards {
        if passes(card) {
            heap.Push(card)
        }
    }

    // 4. Extract results
    return heap.GetPage(page)
}
```

### Heap-Based Pagination

For efficient top-K selection without sorting all results:

```go
type CardHeap struct {
    cards    []*MTG_Card
    capacity int
    less     func(a, b *MTG_Card) bool
}

func (h *CardHeap) Push(card *MTG_Card) {
    if len(h.cards) < h.capacity {
        heap.Push(h, card)
    } else if h.less(card, h.cards[0]) {
        heap.Pop(h)
        heap.Push(h, card)
    }
}
```

## Background Daemons

### Set Fetcher

**Location**: `daemons/MTGSetsFetch.go`

Synchronizes set data from Scryfall:

```go
func StartSetsFetcher() {
    for {
        if shouldDownloadStart() {
            sets := fetchFromScryfall("https://api.scryfall.com/sets")
            upsertSets(sets)
        }
        time.Sleep(24 * time.Hour)
    }
}
```

### Card Fetcher

**Location**: `daemons/MTGCardsFetch.go`

Synchronizes card data from Scryfall bulk API:

```go
func StartCardsFetcher() {
    for {
        if shouldDownloadStart() {
            // 1. Download bulk data file
            bulkURL := getBulkDataURL()
            cards := downloadAndParse(bulkURL)

            // 2. Upsert to database
            upsertCards(cards)

            // 3. Rebuild in-memory index
            mtgCardSearch.BuildCardIndex()

            updateLastTimeFetched()
        }
        time.Sleep(24 * time.Hour)
    }
}
```

### Import Manager

**Location**: `daemons/importManager.go`

Tracks import progress for the UI:

```go
type ImportStatus struct {
    Phase       ImportPhase  // IDLE, FETCHING, PROCESSING, etc.
    Progress    int          // 0-100
    StartedAt   time.Time
    CompletedAt time.Time
    Error       string
}

func GetImportStatus() *ImportStatus { ... }
func TriggerReimport() error { ... }
```

## Database Access

### ArangoDB Connection

**Location**: `arango/connection.go`

```go
func InitializeDatabase() {
    // Connect with retry logic
    conn, _ := http.NewConnection(http.ConnectionConfig{
        Endpoints: []string{fmt.Sprintf("http://%s:%s", addr, port)},
    })

    client, _ := driver.NewClient(driver.ClientConfig{
        Connection:     conn,
        Authentication: driver.BasicAuthentication(user, password),
    })

    db, _ = client.Database(ctx, dbName)
}
```

### Query Builder

**Location**: `arango/query.go`

```go
type Query struct {
    query    string
    bindVars map[string]interface{}
}

func NewQuery(aql string) *Query {
    return &Query{query: aql, bindVars: make(map[string]interface{})}
}

func (q *Query) AddBindVar(name string, value interface{}) *Query {
    q.bindVars[name] = value
    return q
}

func (q *Query) Execute(ctx context.Context) (driver.Cursor, error) {
    return db.Query(ctx, q.query, q.bindVars)
}
```

### Example Query

```go
func GetMTGDeck(ctx context.Context, deckID string) (*model.MTG_Deck, error) {
    query := arango.NewQuery(`
        LET deck = DOCUMENT(mtg_decks, @deckID)
        LET cards = (
            FOR card, edge IN 1..1 OUTBOUND deck mtg_deck_to_card
            RETURN {
                card: card,
                count: edge.count,
                position: edge.position
            }
        )
        RETURN MERGE(deck, { cards: cards })
    `).AddBindVar("deckID", deckID)

    cursor, _ := query.Execute(ctx)
    var deck model.MTG_Deck
    cursor.ReadDocument(ctx, &deck)
    return &deck, nil
}
```

## Error Handling

Errors are logged with zerolog and returned through GraphQL:

```go
func CreateMTGDeck(ctx context.Context, input model.CreateMTGDeckInput) (*model.Response, error) {
    if input.Name == "" {
        log.Warn().Msg("Attempted to create deck with empty name")
        return &model.Response{
            Status:  "error",
            Message: "Deck name cannot be empty",
        }, nil
    }

    // ... create deck

    return &model.Response{Status: "ok"}, nil
}
```

## Logging

Uses zerolog for structured logging:

```go
import "github.com/rs/zerolog/log"

// Info level
log.Info().
    Str("deckID", deckID).
    Int("cardCount", len(cards)).
    Msg("Deck updated")

// Error level
log.Error().
    Err(err).
    Str("operation", "createDeck").
    Msg("Failed to create deck")

// Debug level (request timing)
log.Debug().
    Dur("duration", time.Since(start)).
    Msg("Request completed")
```

## HTTP Middleware

### CORS

```go
c := cors.New(cors.Options{
    AllowedOrigins:   []string{"*"},
    AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
    AllowedHeaders:   []string{"Content-Type", "Authorization"},
    AllowCredentials: true,
})
handler = c.Handler(handler)
```

### Request Logging

```go
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Debug().
            Str("method", r.Method).
            Str("path", r.URL.Path).
            Dur("duration", time.Since(start)).
            Msg("Request")
    })
}
```

## Code Generation

GraphQL types are generated with gqlgen:

```bash
cd server
go generate ./...
```

This reads `gqlgen.yml` and generates:
- `graph/model/models_gen.go` - GraphQL types as Go structs
- `graph/gentypes/` - Resolver interfaces and execution code

## Performance Considerations

1. **Connection Pooling**: ArangoDB driver handles connection pooling
2. **Index Hints**: AQL queries use `OPTIONS { indexHint: "..." }`
3. **Batch Operations**: Bulk inserts during imports
4. **Memory Management**: Periodic GC during large imports
5. **Request Timeouts**: 120s read/write timeout on HTTP server

# Frontend Architecture

The Magic Helper frontend is a React 18 application built with TypeScript and Vite. This document covers the architecture, state management, and key components.

## Directory Structure

```
client/src/
├── App.tsx                         # Root component with routing
├── main.tsx                        # Entry point
├── theme.ts                        # Material-UI theme
├── components/
│   └── deckBuilder/
│       ├── CardTile/               # Card display components
│       │   ├── CatalogueCard.tsx   # Card in catalogue view
│       │   └── VersionCard.tsx     # Card version selector
│       ├── FilterBar/              # Filter controls
│       │   ├── FilterBar.tsx       # Main filter component
│       │   ├── controls/           # Individual filter controls
│       │   └── TagDialogs/         # Tag management dialogs
│       ├── FlowCanvas/             # ReactFlow canvas
│       │   ├── FlowCanvas.tsx      # Main canvas component
│       │   └── Nodes/              # Custom node types
│       ├── Drawer.tsx              # Deck contents panel
│       ├── TagChip.tsx             # Tag display component
│       └── ImportExportDialog/     # Deck import/export
├── context/
│   └── MTGA/
│       ├── Cards/                  # Card listing context
│       ├── Decks/                  # Deck management context
│       ├── Filter/                 # Filter state context
│       ├── DeckCreator/
│       │   ├── Logic/              # Deck mutation logic
│       │   └── UI/                 # UI state
│       └── DeckCreatorFlow/        # ReactFlow integration
├── graphql/
│   └── MTGA/
│       ├── queries/                # GraphQL query definitions
│       ├── mutations/              # GraphQL mutation definitions
│       ├── fragments.ts            # Shared fragments
│       ├── functions.ts            # Typed operation wrappers
│       └── types.ts                # Generated TypeScript types
├── pages/
│   ├── Dashboard/                  # Deck list page
│   └── DeckCreator/                # Deck editor page
├── types/                          # Shared TypeScript types
└── utils/
    ├── functions/                  # Utility functions
    └── hooks/                      # Custom React hooks
```

## Context Provider Hierarchy

The application uses nested React Context providers for state management. The hierarchy is critical - child providers depend on parent providers.

```
App
└── ThemeProvider (Material-UI)
    └── BrowserRouter
        └── Routes
            └── MTGDecksProvider ─────────────────────┐
                └── Outlet                             │
                    └── MTGAFilterProvider ───────────│─┐
                        └── MTGCardsProvider ─────────│─│─┐
                            └── MTGDeckCreatorUIProvider │ │
                                └── MTGDeckCreatorLogicProvider
                                    └── ReactFlowProvider
                                        └── MTGDeckCreatorFlowProvider
```

### 1. MTGDecksProvider

**Location**: `context/MTGA/Decks/MTGDecksProvider.tsx`

**Purpose**: Manages the deck list displayed on the Dashboard.

**State**:
```typescript
{
  decks: MTG_DeckDashboard[]  // List of deck summaries
  loading: boolean            // Loading state
}
```

**Actions**:
- `createDeck(name)` - Create a new deck
- `deleteDeck(deckID)` - Delete a deck
- `propagateChangesToDashboardDeck(deck)` - Update deck in list after edit
- `reload()` - Refresh deck list

### 2. MTGAFilterProvider

**Location**: `context/MTGA/Filter/MTGFilterProvider.tsx`

**Purpose**: Manages filter state and converts it to GraphQL input format.

**State**:
```typescript
{
  filter: MTGFilterType       // UI filter state
  sort: SortLevel[]           // Sorting configuration
  zoom: number                // Card display zoom level
  availableTags: MTG_Tag[]    // All available tags
  existingChains: TagChain[]  // All tag chains
}
```

**Key Features**:
- Ternary boolean filters (POSITIVE/NEGATIVE/UNSET)
- Multi-level sorting with enable/disable per level
- Filter preset save/load
- Automatic conversion to GraphQL `MTGCardFilter` input

**Computed**:
- `convertedFilters` - Transforms UI filter to GraphQL input (via `useMemo`)

### 3. MTGCardsProvider

**Location**: `context/MTGA/Cards/MTGCardsProvider.tsx`

**Purpose**: Fetches and manages the filtered card list.

**State**:
```typescript
{
  cards: MTG_Card[]           // Current page of cards
  totalCount: number          // Total matching cards
  loading: boolean            // Loading state
}
```

**Actions**:
- `goToPage(page)` - Navigate to a page
- `refetch()` - Re-fetch with current filters

**Features**:
- Request cancellation for stale requests
- Automatic refetch on filter change

### 4. MTGDeckCreatorUIProvider

**Location**: `context/MTGA/DeckCreator/UI/MTGDeckCreatorUIProvider.tsx`

**Purpose**: UI-only state for the deck creator (no persistence).

**State**:
```typescript
{
  viewMode: 'CATALOGUE' | 'BOARD' | 'CATALOGUE_BOARD'
  openDrawer: boolean
  openImportDialog: boolean
  openExportDialog: boolean
  openedCardDialog: MTG_Card | null
  catalogueContextMenuOpen: boolean
  stickyCardsGrid: boolean
}
```

### 5. MTGDeckCreatorLogicProvider

**Location**: `context/MTGA/DeckCreator/Logic/MTGDeckCreatorLogicProvider.tsx`

**Purpose**: Deck state and mutation logic.

**State**:
```typescript
{
  deck: MTG_Deck              // Current deck being edited
  isDirty: boolean            // Has unsaved changes
}
```

**Actions**:
- `onAddCard(card, deckCardType)` - Add card to deck
- `removeCard(cardID)` - Remove card entirely
- `addOne(cardID)` - Increment card count
- `removeOne(cardID)` - Decrement card count
- `setCardVersion(cardID, versionID)` - Change preferred printing
- `saveDeck()` - Persist to backend

### 6. MTGDeckCreatorFlowProvider

**Location**: `context/MTGA/DeckCreatorFlow/MTGDeckCreatorFlowProvider.tsx`

**Purpose**: ReactFlow integration and node management.

**State**:
```typescript
{
  nodes: Node[]                    // ReactFlow nodes
  edges: Edge[]                    // ReactFlow edges (unused currently)
  draggingZoneIDs: string[]        // Zones being dragged
  temporarilyUnlockedZoneIDs: string[]  // Zones unlocked for editing
  readOnly: boolean                // View-only mode
}
```

**Key Functions**:
- `handleNodeDragStart(event, node)` - Track drag start
- `handleNodeDragStop(event, node)` - Reparent node to deepest overlapping zone
- `handleNodesChange(changes)` - Apply position/selection changes
- `onAddZone(name)` - Create new zone node
- `expandZoneToFitChildren(zoneID)` - Auto-resize zone

## Key Components

### FlowCanvas

**Location**: `components/deckBuilder/FlowCanvas/FlowCanvas.tsx`

The visual deck building canvas powered by ReactFlow.

**Features**:
- Custom node types: `CardNode`, `ZoneNode`
- Drag-and-drop card placement
- Zone nesting with auto-expansion
- Mini-map for navigation
- Pan/zoom controls

**Node Types**:
```typescript
const nodeTypes = {
  cardNode: CardNode,    // Individual cards
  zoneNode: ZoneNode,    // Card containers
}
```

### CardNode

**Location**: `components/deckBuilder/FlowCanvas/Nodes/CardNode.tsx`

Renders a card on the canvas.

**Features**:
- Card image display (100x140px default)
- Tag chips overlay
- Context menu (delete, tag, add to deck)
- Dynamic tag loading on context menu open

### FilterBar

**Location**: `components/deckBuilder/FilterBar/FilterBar.tsx`

The filter control panel above the card catalogue.

**Sub-components**:
- `ManaSelector` - Color filter (W/U/B/R/G/C)
- `CMCSelector` - Mana value filter (0-9+)
- `RaritySelector` - Rarity filter
- `SetSelector` - Set/expansion filter
- `TypeSelector` - Card type filter
- `LegalitySelector` - Format legality filter
- `TagSelector` - Custom tag filter
- `ChainSelector` - Tag chain filter
- `SortBuilder` - Multi-level sorting
- `SavedFiltersPopover` - Filter presets

### CatalogueCard

**Location**: `components/deckBuilder/CardTile/CatalogueCard.tsx`

Card display in the catalogue view.

**Features**:
- Click to add to deck
- Hover for preview (via CardDialog)
- Right-click context menu
- Version selection dropdown
- Tag assignment UI

## GraphQL Integration

### Pattern

All GraphQL operations are wrapped in typed functions:

```typescript
// graphql/MTGA/functions.ts
export const MTGFunctions = {
  queries: {
    getMTGCardsQuery: () => fetchData<GetMtgCardsFilteredQuery>({...}),
    getMTGDeckQuery: (deckID) => fetchData<GetMtgDeckQuery>({...}),
  },
  mutations: {
    updateMTGDeckMutation: (input) => fetchData<UpdateMtgDeckMutation>({...}),
  }
}
```

### Type Generation

Types are auto-generated from the GraphQL schema:

```bash
cd client && npm run generate
```

This reads the schema from `../graphql/**/*.graphqls` and generates TypeScript types to `src/graphql/types.ts`.

## Ternary Boolean System

**Location**: `types/ternaryBoolean.ts`, `context/MTGA/Filter/MTGFilterContext.ts`

Filters use three states instead of simple boolean:

```typescript
type TernaryBoolean = 'POSITIVE' | 'NEGATIVE' | 'UNSET'

// Example filter state
{
  colors: {
    W: 'POSITIVE',   // Include white cards
    U: 'UNSET',      // No preference on blue
    B: 'NEGATIVE',   // Exclude black cards
    R: 'UNSET',
    G: 'POSITIVE',   // Include green cards
    C: 'UNSET'
  }
}
```

**Conversion to GraphQL**:
```typescript
// Becomes
{
  colors: {
    positive: ['W', 'G'],
    negative: ['B']
  }
}
```

## Routing

**Location**: `App.tsx`

```typescript
<Routes>
  <Route path="/" element={<Navigate to="/dashboard" />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/deck/:deckID" element={<DeckCreatorWrapper />} />
</Routes>
```

## Custom Hooks

### useContextMenu

**Location**: `utils/hooks/ContextMenu/useContextMenu.ts`

Manages context menu state and positioning.

```typescript
const { open, anchorPosition, handleContextMenu, handleClose } = useContextMenu()
```

### useMTGFilter, useMTGCards, etc.

Context consumer hooks that provide typed access to context values:

```typescript
const { filter, setFilter, convertedFilters } = useMTGFilter()
const { cards, totalCount, loading } = useMTGCards()
```

## Error Handling

- `react-error-boundary` wraps critical components
- GraphQL errors surfaced through query responses
- Console logging for development debugging

## Performance Optimizations

1. **Virtualization**: `react-window` for large card lists
2. **Memoization**: Heavy filter conversions in `useMemo`
3. **Callback Stability**: Event handlers in `useCallback`
4. **Request Cancellation**: AbortController for stale requests
5. **Lazy Image Loading**: Card images load on viewport entry

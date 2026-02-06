# Filter System

Magic Helper uses a sophisticated filtering system with ternary boolean logic. This document explains the filter architecture, data flow, and implementation details.

## Overview

Unlike simple on/off filters, Magic Helper uses **ternary filters** with three states:

| State | Meaning | Visual |
|-------|---------|--------|
| **POSITIVE** | Include items matching this | Green |
| **NEGATIVE** | Exclude items matching this | Red |
| **UNSET** | No preference | Gray |

This allows queries like:
- "Show me green cards that are NOT red" (Green=POSITIVE, Red=NEGATIVE)
- "Show me anything except blue" (Blue=NEGATIVE, others=UNSET)

## Filter Categories

### Basic Filters

| Filter | Type | Description |
|--------|------|-------------|
| `searchString` | string | Text search in name/text |
| `colors` | ternary map | W, U, B, R, G, C |
| `multiColor` | ternary | Mono vs multi-colored |
| `manaCosts` | ternary map | CMC values 0-9, 10+ |
| `rarities` | ternary map | common, uncommon, rare, mythic |

### Type Filters

| Filter | Type | Description |
|--------|------|-------------|
| `cardTypes` | ternary map | Creature, Instant, etc. |
| `subtypes` | ternary map | Goblin, Elf, etc. (TODO) |
| `layouts` | ternary map | normal, transform, split, etc. |

### Collection Filters

| Filter | Type | Description |
|--------|------|-------------|
| `sets` | ternary map | Set codes |
| `legalities` | ternary map | Format + status |
| `games` | ternary map | paper, mtgo, arena |

### Tag Filters

| Filter | Type | Description |
|--------|------|-------------|
| `tags` | ternary map | Custom tag IDs |
| `chains` | chain filter[] | Tag chain paths |

### Context Filters

| Filter | Type | Description |
|--------|------|-------------|
| `hideIgnored` | boolean | Hide ignored cards |
| `hideUnreleased` | boolean | Hide unreleased cards |
| `deckID` | string | Current deck context |
| `commander` | card | Filter by commander identity |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   FilterBar                    MTGFilterProvider                 │
│   ┌─────────────────┐         ┌─────────────────────────────┐   │
│   │ ManaSelector    │────────▶│ filter: MTGFilterType        │   │
│   │ TypeSelector    │         │                              │   │
│   │ RaritySelector  │         │ convertedFilters: useMemo    │   │
│   │ ...             │         │   └── transforms to          │   │
│   └─────────────────┘         │       MTGCardFilter          │   │
│                               └─────────────────────────────┘   │
│                                            │                     │
│                                            ▼                     │
│                               ┌─────────────────────────────┐   │
│                               │   MTGCardsProvider           │   │
│                               │   getMTGCardsFiltered(       │   │
│                               │     convertedFilters,        │   │
│                               │     sort,                    │   │
│                               │     page                     │   │
│                               │   )                          │   │
│                               └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                            │
                                            │ GraphQL
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Go)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Resolver                     In-Memory Index                   │
│   ┌─────────────────┐         ┌─────────────────────────────┐   │
│   │ GetMTGCards-    │────────▶│ FilterCardsWithPagination    │   │
│   │ Filtered        │         │   ├── buildPredicates()      │   │
│   │                 │         │   ├── iterate cards          │   │
│   │                 │         │   ├── apply predicates       │   │
│   │                 │◀────────│   └── heap-based pagination  │   │
│   └─────────────────┘         └─────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### MTGFilterType (UI State)

**Location**: `client/src/context/MTGA/Filter/MTGFilterContext.ts`

```typescript
type TernaryBoolean = 'POSITIVE' | 'NEGATIVE' | 'UNSET'

interface MTGFilterType {
  searchString: string
  colors: Record<'W' | 'U' | 'B' | 'R' | 'G' | 'C', TernaryBoolean>
  multiColor: TernaryBoolean
  manaCosts: Record<string, TernaryBoolean>  // '0', '1', ..., '9', 'infinite'
  rarities: Record<string, TernaryBoolean>
  cardTypes: Record<string, TernaryBoolean>
  layouts: Record<string, TernaryBoolean>
  sets: Record<string, TernaryBoolean>
  legalities: Record<string, TernaryBoolean>  // 'standard_legal', etc.
  games: Record<string, TernaryBoolean>
  tags: Record<string, TernaryBoolean>
  chains: ChainFilter[]
  hideIgnored: boolean
  hideUnreleased: boolean
  deckID: string | null
  commander: MTG_Card | null
}
```

### Filter Conversion

**Location**: `client/src/context/MTGA/Filter/MTGFilterProvider.tsx`

The `convertedFilters` useMemo transforms UI state to GraphQL input:

```typescript
const convertedFilters = useMemo(() => {
  const result: MTGCardFilter = {}

  // Convert ternary colors
  const positiveColors = Object.entries(filter.colors)
    .filter(([_, v]) => v === 'POSITIVE')
    .map(([k]) => k)
  const negativeColors = Object.entries(filter.colors)
    .filter(([_, v]) => v === 'NEGATIVE')
    .map(([k]) => k)

  if (positiveColors.length || negativeColors.length) {
    result.colors = {
      positive: positiveColors,
      negative: negativeColors
    }
  }

  // ... similar for other filters

  return result
}, [filter])
```

### GraphQL Input Type

```graphql
input MTGCardFilter {
  searchString: String
  colors: TernaryFilter
  multiColor: TernaryBoolean
  manaCosts: TernaryFilter
  rarities: TernaryFilter
  cardTypes: TernaryFilter
  layouts: TernaryFilter
  sets: TernaryFilter
  legalities: TernaryFilter
  games: TernaryFilter
  tags: TernaryFilter
  chains: [ChainFilterInput!]
  hideIgnored: Boolean
  hideUnreleased: Boolean
  deckID: String
  commanderID: String
}

input TernaryFilter {
  positive: [String!]
  negative: [String!]
}
```

## Backend Implementation

### Filter Predicate Building

**Location**: `server/util/mtgCardSearch/searchFunctions.go`

```go
func passesFilter(card *MTG_Card, filter *MTGCardFilter) bool {
    // Text search
    if filter.SearchString != "" {
        if !strings.Contains(
            strings.ToLower(card.Name),
            strings.ToLower(filter.SearchString),
        ) {
            return false
        }
    }

    // Color filter
    if filter.Colors != nil {
        if !passesTernaryFilter(card.Colors, filter.Colors) {
            return false
        }
    }

    // ... more predicates

    return true
}
```

### Ternary Filter Logic

```go
func passesTernaryFilter(cardValues []string, filter *TernaryFilter) bool {
    cardSet := toSet(cardValues)

    // All positive values must be present
    for _, pos := range filter.Positive {
        if !cardSet[pos] {
            return false
        }
    }

    // No negative values can be present
    for _, neg := range filter.Negative {
        if cardSet[neg] {
            return false
        }
    }

    return true
}
```

### Commander Color Identity

Special handling for commander format:

```go
func passesCommanderFilter(card *MTG_Card, commander *MTG_Card) bool {
    if commander == nil {
        return true
    }

    commanderIdentity := toSet(commander.ColorIdentity)

    for _, color := range card.ColorIdentity {
        if !commanderIdentity[color] {
            return false  // Card has color outside commander's identity
        }
    }

    return true
}
```

## Sorting System

### Sort Configuration

```typescript
interface SortLevel {
  field: 'COLOR' | 'CMC' | 'NAME' | 'RARITY' | 'SET' | 'RELEASED_AT'
  direction: 'ASC' | 'DESC'
  enabled: boolean
}
```

### Multi-Level Sorting

Frontend allows multiple sort levels, applied in order:

```typescript
// Example: Sort by color (asc), then by CMC (desc), then by name (asc)
const sort = [
  { field: 'COLOR', direction: 'ASC', enabled: true },
  { field: 'CMC', direction: 'DESC', enabled: true },
  { field: 'NAME', direction: 'ASC', enabled: true }
]
```

### Backend Sort Implementation

```go
func buildComparator(sortLevels []*MTGSortInput) func(a, b *MTG_Card) bool {
    return func(a, b *MTG_Card) bool {
        for _, level := range sortLevels {
            if !level.Enabled {
                continue
            }

            cmp := compareByField(a, b, level.Field)
            if cmp == 0 {
                continue  // Tie, move to next level
            }

            if level.Direction == "DESC" {
                return cmp > 0
            }
            return cmp < 0
        }

        // Final tie-breaker: card ID
        return a.ID < b.ID
    }
}
```

## Tag Chain Filtering

### Chain Structure

A tag chain represents a hierarchical path:
```
Strategy > Aggro > Creature-based
```

Stored as:
```json
{
  "terminalTag": "creature-based",
  "chain": ["strategy", "aggro"]
}
```

### Chain Filter Input

```graphql
input ChainFilterInput {
  terminalTagID: String!
  chainTagIDs: [String!]!
  value: TernaryBoolean!
}
```

### Chain Matching

```go
func passesChainFilter(card *MTG_Card, chainFilters []*ChainFilterInput) bool {
    for _, cf := range chainFilters {
        hasChain := cardHasChain(card, cf.TerminalTagID, cf.ChainTagIDs)

        switch cf.Value {
        case "POSITIVE":
            if !hasChain {
                return false
            }
        case "NEGATIVE":
            if hasChain {
                return false
            }
        // UNSET: no effect
        }
    }
    return true
}
```

## Performance Optimizations

### 1. Early Exit

Predicates evaluated in order of selectivity. Most restrictive filters first:

```go
func passesFilter(card *MTG_Card, filter *MTGCardFilter) bool {
    // Check cheapest predicates first
    if !passesSearchString(card, filter) { return false }
    if !passesColors(card, filter) { return false }
    if !passesCMC(card, filter) { return false }

    // More expensive predicates last
    if !passesLegalities(card, filter) { return false }
    if !passesTags(card, filter) { return false }

    return true
}
```

### 2. Heap-Based Pagination

Instead of sorting all results, use a min-heap:

```go
// Only keep top K results
heap := NewMinHeap(pageSize * (page + 1), comparator)
for _, card := range allCards {
    if passesFilter(card, filter) {
        heap.Push(card)
    }
}
// Extract requested page
results := heap.GetPage(page)
```

### 3. Index Caching

Tag assignments cached in memory alongside cards:

```go
type CardIndex struct {
    Cards     []*MTG_Card
    CardTags  map[string][]TagAssignment  // cardID -> assignments
}
```

## UI Components

### Filter Controls

| Component | Filter | Location |
|-----------|--------|----------|
| `ManaSelector` | colors | `FilterBar/controls/ManaSelector.tsx` |
| `CMCSelector` | manaCosts | `FilterBar/controls/CMCSelector.tsx` |
| `RaritySelector` | rarities | `FilterBar/controls/RaritySelector.tsx` |
| `TypeSelector` | cardTypes | `FilterBar/controls/TypeSelector.tsx` |
| `SetSelector` | sets | `FilterBar/controls/SetSelector.tsx` |
| `LegalitySelector` | legalities | `FilterBar/controls/LegalitySelector.tsx` |
| `TagSelector` | tags | `FilterBar/controls/TagSelector.tsx` |
| `ChainSelector` | chains | `FilterBar/controls/ChainSelector.tsx` |
| `SortBuilder` | sort | `FilterBar/controls/SortBuilder.tsx` |

### Ternary Toggle Pattern

Each filter control follows this pattern:

```tsx
function TernaryToggle({ value, onChange }) {
  const cycle = () => {
    const next = {
      'UNSET': 'POSITIVE',
      'POSITIVE': 'NEGATIVE',
      'NEGATIVE': 'UNSET'
    }
    onChange(next[value])
  }

  return (
    <IconButton onClick={cycle}>
      {value === 'POSITIVE' && <CheckIcon color="success" />}
      {value === 'NEGATIVE' && <CloseIcon color="error" />}
      {value === 'UNSET' && <RemoveIcon color="disabled" />}
    </IconButton>
  )
}
```

## Filter Presets

Users can save filter configurations:

```typescript
interface FilterPreset {
  id: string
  name: string
  savedAt: string
  filterState: MTGFilterType
  sortState: SortLevel[]
  page: number
}
```

### Save Preset

```graphql
mutation CreateMTGFilterPreset($input: CreateMTGFilterPresetInput!) {
  createMTGFilterPreset(input: $input) {
    status
    message
    presetID
  }
}
```

### Load Preset

```typescript
const loadPreset = (preset: FilterPreset) => {
  setFilter(preset.filterState)
  setSort(preset.sortState)
  goToPage(preset.page)
}
```

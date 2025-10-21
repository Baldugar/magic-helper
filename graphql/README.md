# Magic Helper GraphQL API Documentation

## Overview

The Magic Helper GraphQL API provides a comprehensive interface for managing Magic: The Gathering (MTG) cards, decks, and related data. This API supports deck building, card collection management, filtering, tagging, and rating systems.

## Table of Contents

-   [Schema Structure](#schema-structure)
-   [Queries](#queries)
-   [Mutations](#mutations)
-   [Core Types](#core-types)
-   [Enums](#enums)
-   [Input Types](#input-types)
-   [Examples](#examples)

## Schema Structure

The GraphQL schema is organized into several modules:

```
graphql/
├── query.graphqls          # Root query definitions
├── mutation.graphqls       # Root mutation definitions
├── type.base.graphqls      # Base types and scalars
├── MTG/                    # Magic: The Gathering specific types
│   ├── Card/              # Card types and enums
│   ├── CardPackage/       # Card package types
│   ├── Deck/              # Deck types and inputs
│   ├── Filter/            # Filtering system
│   └── Tag/               # MTG-specific tag types
├── Flow/                   # Flow/positioning system
├── Rating/                 # Rating system
├── Tag/                    # Generic tag system
└── User/                   # User management
```

## Queries

### Card Queries

#### `getMTGCards`

Retrieves all MTG cards.

```graphql
query {
    getMTGCards {
        ID
        name
        manaCost
        typeLine
        oracleText
        # ... other fields
    }
}
```

#### `getMTGCardsFiltered`

Advanced card search with filtering, pagination, and sorting.

```graphql
query GetFilteredCards(
    $filter: MTG_Filter_SearchInput!
    $pagination: MTG_Filter_PaginationInput!
    $sort: [MTG_Filter_SortInput!]!
) {
    getMTGCardsFiltered(filter: $filter, pagination: $pagination, sort: $sort) {
        pagedCards {
            ID
            name
            manaCost
            CMC
        }
        totalCount
    }
}
```

#### `getMTGFilters`

Retrieves available filter options for card searches.

```graphql
query {
    getMTGFilters {
        types {
            cardType
            subtypes
        }
        expansions {
            set
            setName
            releasedAt
        }
        legality {
            formats
            legalityValues
        }
        layouts
    }
}
```

### Deck Queries

#### `getMTGDecks`

Retrieves all user decks (dashboard view).

```graphql
query {
    getMTGDecks {
        ID
        name
        cardFrontImage
        cards {
            card {
                ID
                versions {
                    imageUris {
                        normal
                    }
                }
            }
        }
    }
}
```

#### `getMTGDeck`

Retrieves a specific deck by ID with full details.

```graphql
query GetDeck($deckID: ID!) {
    getMTGDeck(deckID: $deckID) {
        ID
        name
        cardFrontImage
        cards {
            card {
                ID
                name
                manaCost
            }
            count
            position {
                x
                y
            }
            deckCardType
        }
        zones {
            ID
            name
            position {
                x
                y
            }
            width
            height
        }
    }
}
```

### Card Package Queries

#### `getMTGCardPackages`

Retrieves card packages (optionally filtered by ID).

```graphql
query GetCardPackages($cardPackageID: ID) {
    getMTGCardPackages(cardPackageID: $cardPackageID) {
        ID
        name
        cards {
            card {
                ID
                name
            }
            count
        }
    }
}
```

### Tag Queries

#### `tags`, `cardTags`, `deckTags`

Retrieve different types of tags.

```graphql
query {
    tags {
        ID
        name
        description
        myRating {
            value
        }
    }
    cardTags {
        ID
        name
        description
    }
    deckTags {
        ID
        name
        description
    }
}
```

## Mutations

### Deck Mutations

#### `createMTGDeck`

Creates a new deck.

```graphql
mutation CreateDeck($input: MTG_CreateDeckInput!) {
    createMTGDeck(input: $input) {
        ID
        name
    }
}
```

#### `updateMTGDeck`

Updates an existing deck.

```graphql
mutation UpdateDeck($input: MTG_UpdateDeckInput!) {
    updateMTGDeck(input: $input) {
        status
        message
    }
}
```

#### `deleteMTGDeck`

Deletes a deck.

```graphql
mutation DeleteDeck($input: MTG_DeleteDeckInput!) {
    deleteMTGDeck(input: $input) {
        status
        message
    }
}
```

#### `saveMTGDeckAsCopy`

Saves a deck as a copy with modifications.

```graphql
mutation SaveDeckAsCopy($input: MTG_UpdateDeckInput!) {
    saveMTGDeckAsCopy(input: $input) {
        ID
        name
    }
}
```

### Card Package Mutations

#### `createMTGCardPackage`

Creates a new card package.

```graphql
mutation CreateCardPackage($input: MTG_CreateCardPackageInput!) {
    createMTGCardPackage(input: $input) {
        ID
        name
    }
}
```

#### `addMTGCardToCardPackage` / `removeMTGCardFromCardPackage`

Manage cards within card packages.

```graphql
mutation AddCardToPackage($input: MTG_AddCardToCardPackageInput!) {
    addMTGCardToCardPackage(input: $input) {
        status
        message
    }
}
```

### Tag Mutations

#### `createTag`, `updateTag`, `deleteTag`

Tag management operations.

```graphql
mutation CreateTag($input: CreateTagInput!) {
    createTag(input: $input) {
        status
        message
    }
}
```

#### `assignTag`, `unassignTag`

Assign/unassign tags to entities.

```graphql
mutation AssignTag($input: AssignTagInput!) {
    assignTag(input: $input) {
        status
        message
    }
}
```

### Rating Mutations

#### `rate`

Rate cards, decks, or other entities.

```graphql
mutation Rate($input: RateInput!) {
    rate(input: $input) {
        status
        message
    }
}
```

## Core Types

### MTG_Card

Represents a Magic: The Gathering card with all its properties.

```graphql
type MTG_Card {
    ID: ID!
    layout: MTG_Layout!
    CMC: Float! # Converted Mana Cost
    colorIdentity: [MTG_Color!]!
    colors: [MTG_Color!]
    keywords: [String!]!
    manaCost: String
    name: String!
    oracleText: String
    power: String
    toughness: String
    typeLine: String!
    versions: [MTG_CardVersion!]! # Different printings/versions
    myRating: UserRating
    cardTags: [CardTag!]!
    deckTags: [DeckTag!]!
}
```

### MTG_CardVersion

Represents a specific printing/version of a card.

```graphql
type MTG_CardVersion {
    ID: ID!
    isDefault: Boolean!
    isAlchemy: Boolean!
    artist: String
    lang: String!
    cardFaces: [MTG_CardFace!] # For double-faced cards
    legalities: Map! # Format legality status
    games: [MTG_Game!]! # paper, mtgo, arena
    imageUris: MTG_Image
    rarity: MTG_Rarity!
    setName: String!
    set: String!
    # ... other version-specific fields
}
```

### MTG_Deck

Represents a complete deck with cards and layout.

```graphql
type MTG_Deck {
    ID: ID!
    name: String!
    cardFrontImage: String # Cover card image
    cards: [MTG_DeckCard!]! # Cards in the deck
    zones: [FlowZone!]! # Layout zones for positioning
    ignoredCards: [String!]! # Cards to ignore in analysis
}
```

### MTG_DeckCard

Represents a card within a deck context.

```graphql
type MTG_DeckCard {
    card: MTG_Card!
    selectedVersionID: String # Which version to display
    count: Int! # Number of copies
    position: Position! # Position in deck builder
    deckCardType: MTG_DeckCardType!
    phantoms: [Phantom!]! # Visual placeholder cards
}
```

### FlowZone

Represents layout zones for deck building interface.

```graphql
type FlowZone {
    ID: ID!
    name: String!
    position: Position!
    width: Float!
    height: Float!
    childrenIDs: [ID!]!
    zoneChildren: [FlowZone!]! # Nested zones
}
```

## Enums

### MTG_Color

```graphql
enum MTG_Color {
    C # Colorless
    W # White
    U # Blue
    B # Black
    R # Red
    G # Green
}
```

### MTG_Rarity

```graphql
enum MTG_Rarity {
    common
    uncommon
    rare
    mythic
}
```

### MTG_Layout

Card layout types including:

-   `normal` - Standard card layout
-   `split` - Split cards
-   `transform` - Double-faced transforming cards
-   `modal_dfc` - Modal double-faced cards
-   `adventure` - Adventure cards
-   `saga` - Saga cards
-   And many more...

### MTG_Game

```graphql
enum MTG_Game {
    paper # Physical cards
    mtgo # Magic: The Gathering Online
    arena # MTG Arena
}
```

## Input Types

### MTG_UpdateDeckInput

```graphql
input MTG_UpdateDeckInput {
    deckID: ID!
    name: String!
    cardFrontImage: MTG_DeckCardFrontImageInput
    cards: [MTG_DeckCardInput!]!
    zones: [FlowZoneInput!]!
    ignoredCards: [String!]!
}
```

### MTG_DeckCardInput

```graphql
input MTG_DeckCardInput {
    ID: ID!
    card: ID!
    selectedVersionID: String
    count: Int!
    position: PositionInput!
    deckCardType: MTG_DeckCardType!
    phantoms: [PhantomInput!]!
}
```

## Examples

### Complete Deck Query

```graphql
query GetCompleteDeck($deckID: ID!) {
    getMTGDeck(deckID: $deckID) {
        ID
        name
        cardFrontImage
        cards {
            card {
                ID
                name
                manaCost
                CMC
                typeLine
                versions {
                    ID
                    isDefault
                    imageUris {
                        normal
                        large
                    }
                    rarity
                    setName
                }
            }
            selectedVersionID
            count
            position {
                x
                y
            }
            deckCardType
        }
        zones {
            ID
            name
            position {
                x
                y
            }
            width
            height
            zoneChildren {
                ID
                name
            }
        }
        ignoredCards
    }
}
```

### Advanced Card Search

```graphql
query SearchCards {
    getMTGCardsFiltered(
        filter: { name: "Lightning", colors: [R], CMC: { min: 1, max: 3 }, rarity: [uncommon, rare] }
        pagination: { limit: 20, offset: 0 }
        sort: [{ field: "name", direction: "ASC" }, { field: "CMC", direction: "ASC" }]
    ) {
        pagedCards {
            ID
            name
            manaCost
            CMC
            typeLine
            oracleText
            versions {
                imageUris {
                    normal
                }
                rarity
                setName
            }
        }
        totalCount
    }
}
```

## Error Handling

All mutations return a `Response` type with status and message:

```graphql
type Response {
    status: Boolean!
    message: String
}
```

Check the `status` field to determine if the operation was successful.

## Notes

-   Many rating-related fields are commented out (likely planned features)
-   The system supports multiple card versions for different printings
-   Flow zones enable complex deck building layouts
-   Card packages appear to be collections separate from decks
-   The tagging system supports both cards and decks
-   Position-based layout system for visual deck building

## Schema Generation

This schema appears to be used with gqlgen for Go backend generation. The `@goTag` directive is used for Go struct field tags.

# Database Schema

Magic Helper uses ArangoDB, a multi-model database supporting both document and graph operations. This document describes the collections, their fields, and relationships.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Document Collections                      │
├─────────────────────────────────────────────────────────────────┤
│  mtg_cards          mtg_decks         mtg_tags                  │
│  mtg_sets           mtg_filter_presets application_config       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Edge Collections
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  mtg_deck_to_card         mtg_tag_to_card                       │
│  mtg_deck_to_filter_preset mtg_deck_front_image                 │
│  mtg_deck_ignore_card                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Document Collections

### mtg_cards

Stores all Magic: The Gathering cards.

| Field | Type | Description |
|-------|------|-------------|
| `_key` | string | Scryfall ID (unique identifier) |
| `name` | string | Card name |
| `manaCost` | string | Mana cost (e.g., "{2}{U}{U}") |
| `cmc` | float | Converted mana cost |
| `typeLine` | string | Full type line |
| `oracleText` | string | Rules text |
| `colors` | string[] | Colors in card's cost (W, U, B, R, G) |
| `colorIdentity` | string[] | Commander color identity |
| `keywords` | string[] | Keyword abilities |
| `layout` | string | Card layout (normal, transform, split, etc.) |
| `power` | string | Power (creatures only) |
| `toughness` | string | Toughness (creatures only) |
| `loyalty` | string | Loyalty (planeswalkers only) |
| `versions` | MTG_CardVersion[] | All printings of this card |

**MTG_CardVersion Structure**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Version-specific ID |
| `set` | string | Set code (lowercase) |
| `setName` | string | Full set name |
| `collectorNumber` | string | Collector number |
| `rarity` | string | common, uncommon, rare, mythic |
| `imageUris` | object | Image URLs by size |
| `legalities` | object | Format legality map |
| `games` | string[] | [paper, mtgo, arena] |
| `isDefault` | boolean | Default version flag |
| `isAlchemy` | boolean | Alchemy rebalance flag |

### mtg_sets

Stores set/expansion information.

| Field | Type | Description |
|-------|------|-------------|
| `_key` | string | Set code (lowercase) |
| `name` | string | Full set name |
| `code` | string | Set code |
| `releasedAt` | string | Release date (ISO 8601) |
| `setType` | string | expansion, core, masters, etc. |
| `cardCount` | int | Number of cards in set |
| `iconSvgUri` | string | Set symbol SVG URL |

### mtg_decks

Stores user deck documents.

| Field | Type | Description |
|-------|------|-------------|
| `_key` | string | Auto-generated deck ID |
| `name` | string | Deck name |
| `type` | string | Deck type (standard, commander, etc.) |
| `zones` | FlowZone[] | Visual zones on canvas |
| `cardFrontImage` | string | Cover card image URL |

**FlowZone Structure**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Zone unique ID |
| `name` | string | Zone display name |
| `position` | {x, y} | Position on canvas |
| `width` | float | Zone width |
| `height` | float | Zone height |
| `cardChildren` | string[] | Card node IDs in zone |
| `zoneChildren` | string[] | Nested zone IDs |
| `locked` | boolean | Prevents editing |
| `autoSort` | boolean | Auto-arrange cards |

### mtg_tags

Stores custom tag definitions.

| Field | Type | Description |
|-------|------|-------------|
| `_key` | string | Auto-generated tag ID |
| `name` | string | Tag name (unique) |
| `meta` | boolean | Is meta-tag (for chains) |
| `color` | string | Display color (hex) |

### mtg_filter_presets

Stores saved filter configurations.

| Field | Type | Description |
|-------|------|-------------|
| `_key` | string | Auto-generated preset ID |
| `name` | string | Preset name |
| `savedAt` | string | Save timestamp (ISO 8601) |
| `filterState` | object | Serialized filter state |
| `sortState` | object[] | Serialized sort configuration |
| `page` | int | Page number |

### application_config

Stores application-wide configuration.

| Field | Type | Description |
|-------|------|-------------|
| `_key` | string | Config key |
| `lastTimeFetched` | string | Last Scryfall sync timestamp |

## Edge Collections

### mtg_deck_to_card

Connects decks to their cards with metadata.

| Field | Type | Description |
|-------|------|-------------|
| `_from` | string | mtg_decks/{deckID} |
| `_to` | string | mtg_cards/{cardID} |
| `count` | int | Number of copies |
| `position` | {x, y} | Position on canvas |
| `deckCardType` | string | NORMAL, COMMANDER, SIDEBOARD |
| `selectedVersionID` | string | Preferred printing ID |
| `phantoms` | {x, y}[] | Additional visual positions |

**deckCardType Values**:
- `NORMAL` - Main deck card
- `COMMANDER` - Commander/companion
- `SIDEBOARD` - Sideboard card

### mtg_tag_to_card

Connects tags to cards with chain information.

| Field | Type | Description |
|-------|------|-------------|
| `_from` | string | mtg_tags/{tagID} |
| `_to` | string | mtg_cards/{cardID} |
| `chain` | string[] | Parent tag IDs (for chains) |

**Chain Example**:
```json
{
  "_from": "mtg_tags/aggro",
  "_to": "mtg_cards/goblin-guide",
  "chain": ["mtg_tags/strategy"]
}
```
This represents: Strategy > Aggro applied to Goblin Guide

### mtg_deck_to_filter_preset

Links filter presets to their deck.

| Field | Type | Description |
|-------|------|-------------|
| `_from` | string | mtg_decks/{deckID} |
| `_to` | string | mtg_filter_presets/{presetID} |

### mtg_deck_front_image

Stores the chosen cover image for a deck.

| Field | Type | Description |
|-------|------|-------------|
| `_from` | string | mtg_decks/{deckID} |
| `_to` | string | mtg_cards/{cardID} |

### mtg_deck_ignore_card

Tracks cards ignored within a specific deck.

| Field | Type | Description |
|-------|------|-------------|
| `_from` | string | mtg_decks/{deckID} |
| `_to` | string | mtg_cards/{cardID} |

## Common Query Patterns

### Get Deck with Cards

```aql
LET deck = DOCUMENT(mtg_decks, @deckID)
LET cards = (
    FOR card, edge IN 1..1 OUTBOUND deck mtg_deck_to_card
    RETURN {
        card: card,
        count: edge.count,
        position: edge.position,
        deckCardType: edge.deckCardType,
        selectedVersionID: edge.selectedVersionID,
        phantoms: edge.phantoms
    }
)
RETURN MERGE(deck, { cards: cards })
```

### Get Card with Tag Assignments

```aql
LET card = DOCUMENT(mtg_cards, @cardID)
LET tagAssignments = (
    FOR tag, edge IN 1..1 INBOUND card mtg_tag_to_card
    LET chainTags = (
        FOR chainTagID IN (edge.chain || [])
        LET chainTag = DOCUMENT(mtg_tags, chainTagID)
        RETURN { id: chainTag._key, name: chainTag.name }
    )
    RETURN {
        tag: { id: tag._key, name: tag.name },
        chain: chainTags
    }
)
RETURN MERGE(card, { tagAssignments: tagAssignments })
```

### Get Dashboard Decks

```aql
FOR deck IN mtg_decks
    LET cards = (
        FOR card, edge IN 1..1 OUTBOUND deck mtg_deck_to_card
        SORT edge.count DESC
        LIMIT 5
        RETURN card
    )
    LET frontImage = FIRST(
        FOR card IN 1..1 OUTBOUND deck mtg_deck_front_image
        RETURN card.versions[0].imageUris.artCrop
    )
    RETURN {
        id: deck._key,
        name: deck.name,
        cardCount: LENGTH(cards),
        previewCards: cards,
        frontImage: frontImage
    }
```

### Get All Tag Chains

```aql
FOR edge IN mtg_tag_to_card
    FILTER LENGTH(edge.chain) > 0
    LET terminalTag = DOCUMENT(edge._from)
    LET chainTags = (
        FOR tagID IN edge.chain
        LET tag = DOCUMENT(mtg_tags, tagID)
        RETURN { id: tag._key, name: tag.name }
    )
    RETURN DISTINCT {
        terminalTag: { id: terminalTag._key, name: terminalTag.name },
        chain: chainTags
    }
```

## Indexes

### mtg_cards

```aql
-- Primary index on _key (automatic)
-- Hash index on name for exact lookups
ENSURE INDEX { type: "hash", fields: ["name"], unique: false }

-- Fulltext index for search
ENSURE INDEX { type: "fulltext", fields: ["name"], minLength: 3 }
```

### mtg_decks

```aql
-- Primary index on _key (automatic)
```

### Edge Collections

```aql
-- Automatic indexes on _from and _to for graph traversals
```

## Data Integrity

### Constraints

- `mtg_tags.name` must be unique
- `mtg_deck_to_card` edge requires valid deck and card documents
- `chain` array in `mtg_tag_to_card` must reference existing tags

### Cascade Deletes

When deleting:
- **Deck**: Delete all `mtg_deck_to_card`, `mtg_deck_to_filter_preset`, `mtg_deck_front_image`, and `mtg_deck_ignore_card` edges
- **Tag**: Delete all `mtg_tag_to_card` edges
- **Card**: Handled by Scryfall sync (cards rarely deleted)

## Backup and Restore

### Backup

```bash
arangodump \
    --server.endpoint tcp://localhost:8529 \
    --server.database MagicHelper \
    --output-directory /backup/magic-helper
```

### Restore

```bash
arangorestore \
    --server.endpoint tcp://localhost:8529 \
    --server.database MagicHelper \
    --input-directory /backup/magic-helper
```

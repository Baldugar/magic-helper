# Deck Builder Tutorial

This tutorial covers the visual deck building canvas in detail. Learn how to create zones, organize cards, and build decks efficiently.

## The Canvas

The canvas is your deck building workspace - a virtual table where you arrange cards and zones.

### Navigation

| Action | How |
|--------|-----|
| **Pan** | Click and drag on empty canvas area |
| **Zoom** | Mouse wheel, or use the zoom controls |
| **Reset View** | Click the "fit view" button in toolbar |

### Mini-Map

The mini-map in the bottom-right shows your entire workspace:
- Blue rectangles = Zones
- Green dots = Cards
- Click on mini-map to jump to that location

## Working with Cards

### Adding Cards

From the catalogue (left panel):
1. Search for a card
2. **Single-click** to add one copy
3. **Multiple clicks** for multiple copies

Cards appear at the default position on the canvas.

### Moving Cards

1. Click a card to select it (blue border appears)
2. Drag to new position
3. Release to drop

### Card Information

Hover over a card to see:
- Full card image
- Oracle text
- All printings

Click "View Details" for the full card dialog.

### Card Context Menu

Right-click a card for options:

| Option | Description |
|--------|-------------|
| **Delete** | Remove from deck |
| **Set Version** | Choose preferred printing |
| **Assign Tag** | Add a custom tag |
| **Add to Deck** | Copy to another deck |

### Changing Card Count

In the right-side drawer:
1. Find the card in the list
2. Use +/- buttons to adjust count
3. Or type a number directly

## Working with Zones

Zones are containers that group cards together - like piles on a physical table.

### Creating Zones

1. Click **"Add Zone"** in the toolbar
2. Enter a descriptive name
3. Click Create

**Good zone names:**
- By type: "Creatures", "Instants", "Lands"
- By purpose: "Removal", "Card Draw", "Win Conditions"
- By curve: "1-drops", "2-drops", "3-drops"
- By board state: "Early Game", "Mid Game", "Late Game"

### Zone Properties

Click a zone header to select it. In the properties panel:

| Property | Description |
|----------|-------------|
| **Name** | Zone display name |
| **Locked** | Prevents accidental changes |
| **Auto-sort** | Automatically arranges cards |

### Moving Zones

1. Click the zone header (top bar)
2. Drag to new position
3. Release to drop

### Resizing Zones

1. Hover over zone edge (cursor changes)
2. Drag to resize
3. Release when satisfied

**Tip**: Zones auto-expand when you add cards that don't fit.

### Nesting Zones

Create hierarchies by dragging zones into other zones:

```
Main Deck (zone)
├── Creatures (zone)
│   ├── 1-drops (zone)
│   └── 2-drops (zone)
├── Spells (zone)
└── Lands (zone)
```

To nest:
1. Drag a zone over another zone
2. Drop when the parent zone highlights
3. Child zone becomes part of parent

### Deleting Zones

1. Right-click the zone header
2. Select "Delete Zone"
3. Cards inside are moved to the canvas (not deleted)

## Organizing Your Deck

### Drag Cards to Zones

1. Click and drag a card
2. Move it over a zone
3. Release - card snaps into zone

The card becomes a child of that zone.

### Remove Card from Zone

1. Drag the card out of the zone
2. Drop on empty canvas
3. Card is now independent

### Auto-Sort

Enable auto-sort on a zone:
1. Select the zone
2. Toggle "Auto-sort" in properties
3. Cards arrange automatically by name/CMC

### Visual Copies (Phantoms)

See a card in multiple places without adding copies:

1. Right-click a card
2. Select "Create Visual Copy"
3. Position the copy in another zone

**Note**: This is a visual aid only - your deck still has one copy.

## View Modes

### Catalogue View

Shows only the card catalogue:
- Full-width card grid
- Best for browsing cards
- Good for initial card selection

### Board View

Shows only the canvas:
- Maximum workspace
- Best for organization
- Good for final arrangement

### Split View (Default)

Shows both catalogue and canvas:
- Best balance
- Drag directly from catalogue to canvas
- Recommended for most users

## The Drawer

The right-side drawer shows deck contents:

### Deck Info
- Deck name
- Total cards
- Card type breakdown

### Card List
- All cards in deck
- Count per card
- Quick +/- buttons

### Commander Section
- Shows commander (if set)
- Color identity displayed

### Sideboard
- Sideboard cards
- Separate from main deck

## Deck Types

### Standard/Modern Decks
- 60 cards minimum
- Up to 4 copies of non-basic
- 15-card sideboard

### Commander Decks
- Exactly 100 cards
- 1 copy of each (except basics)
- Set a commander card

To set a commander:
1. Right-click a legendary creature
2. Select "Set as Commander"
3. Color identity filter auto-applies

## Best Practices

### 1. Start with Categories

Before adding cards, create zones for:
- Lands
- Creatures (or creature categories)
- Non-creature spells

### 2. Use Meaningful Zone Names

Bad: "Zone 1", "Zone 2"
Good: "Removal", "Card Advantage", "Threats"

### 3. Visual Grouping

Arrange zones to reflect relationships:
- Group aggressive cards together
- Keep lands separate
- Position win conditions prominently

### 4. Save Frequently

Auto-save is enabled, but manual saves are safer.

### 5. Use Tags for Cross-Zone Concepts

Tags like "Synergy with Commander" or "Combo Piece" work across zones.

## Example Deck Layout

```
┌─────────────────────────────────────────────────────────────┐
│                     Commander Zone                           │
│                     [Commander Card]                         │
├─────────────────────────────────────────────────────────────┤
│   Creatures           │   Spells            │   Lands       │
│   ┌─────────────┐    │   ┌─────────────┐   │   ┌─────────┐ │
│   │ 1-2 drops   │    │   │ Removal     │   │   │ Basics  │ │
│   └─────────────┘    │   └─────────────┘   │   └─────────┘ │
│   ┌─────────────┐    │   ┌─────────────┐   │   ┌─────────┐ │
│   │ 3-4 drops   │    │   │ Card Draw   │   │   │ Utility │ │
│   └─────────────┘    │   └─────────────┘   │   └─────────┘ │
│   ┌─────────────┐    │   ┌─────────────┐   │               │
│   │ Big Threats │    │   │ Ramp        │   │               │
│   └─────────────┘    │   └─────────────┘   │               │
├─────────────────────────────────────────────────────────────┤
│                        Sideboard                             │
│   [sideboard cards...]                                       │
└─────────────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` or `Backspace` | Delete selected card |
| `Ctrl+S` | Save deck |
| `Ctrl+Z` | Undo (if available) |
| `Escape` | Deselect all |
| `+` / `-` | Zoom in/out |

## Next Steps

- [Filtering & Search](/user-guide/filtering-and-search) - Find cards faster
- [Tags & Packages](/user-guide/tags-and-packages) - Organize with metadata

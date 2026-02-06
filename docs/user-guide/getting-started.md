# Getting Started

Welcome to Magic Helper! This guide will help you get started with visual deck building.

## What is Magic Helper?

Magic Helper is a web application that recreates the experience of building Magic: The Gathering decks on a physical table. Instead of list-based deck builders, Magic Helper gives you a visual canvas where you can:

- Create zones (card piles) for different categories
- Drag and position cards exactly where you want them
- See your entire deck at a glance
- Filter through thousands of cards instantly

## System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Screen**: Works best on desktop/laptop, but supports tablets
- **Internet**: Required for loading card data and images

## Your First Deck

### Step 1: Access the Dashboard

When you open Magic Helper, you'll see the **Dashboard** with your deck collection.

<!-- TODO: Add screenshot when available -->

### Step 2: Create a New Deck

1. Click the **"Create Deck"** button
2. Enter a name for your deck
3. Click **"Create"**

Your new deck appears in the list. Click on it to open the Deck Creator.

### Step 3: The Deck Creator Interface

The Deck Creator has three main areas:

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar                                                     │
├────────────────┬────────────────────────────────────────────┤
│                │                                             │
│  Card          │            Visual Canvas                    │
│  Catalogue     │                                             │
│                │                                             │
│  ┌──────────┐  │    ┌──────────┐    ┌──────────┐            │
│  │ Filters  │  │    │  Zone 1  │    │  Zone 2  │            │
│  └──────────┘  │    │  [cards] │    │  [cards] │            │
│                │    └──────────┘    └──────────┘            │
│  ┌──────────┐  │                                             │
│  │  Cards   │  │                                             │
│  │  Grid    │  │                                             │
│  └──────────┘  │                                             │
│                │                                             │
└────────────────┴────────────────────────────────────────────┘
```

- **Toolbar**: Save, add zones, view options
- **Card Catalogue**: Search and filter all MTG cards
- **Visual Canvas**: Your deck building workspace

### Step 4: Search for Cards

Use the **Filter Bar** above the card catalogue:

1. **Text Search**: Type a card name
2. **Colors**: Click color symbols to filter (green = include, red = exclude)
3. **Types**: Filter by creature, instant, etc.
4. **More Filters**: Rarity, set, format legality

### Step 5: Add Cards to Your Deck

**Click** on a card in the catalogue to add it to your deck. The card appears on the canvas.

**Tip**: Click multiple times to add multiple copies.

### Step 6: Create Zones

Zones help organize your cards:

1. Click **"Add Zone"** in the toolbar
2. Enter a name (e.g., "Creatures", "Removal", "Lands")
3. The zone appears on the canvas

### Step 7: Organize Cards

- **Drag cards** into zones
- **Drag zones** to rearrange your workspace
- **Resize zones** by dragging their edges

### Step 8: Save Your Deck

Click **"Save"** in the toolbar, or wait for auto-save.

## Interface Overview

### View Modes

Switch between views using the menu in the top-right:

| Mode | Description |
|------|-------------|
| **Catalogue** | Full catalogue, no canvas |
| **Board** | Full canvas, no catalogue |
| **Split** | Both catalogue and canvas (default) |

### Card Actions

**Left-click** on a card:
- In catalogue: Add to deck
- On canvas: Select for moving

**Right-click** on a card:
- Open context menu
- Options: Delete, assign tag, add to other deck

### Zoom and Pan

On the canvas:
- **Mouse wheel**: Zoom in/out
- **Click and drag** (on empty space): Pan the view
- **Mini-map**: Click to jump to location

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Delete` | Remove selected card |
| `Ctrl+S` | Save deck |
| `Escape` | Deselect |

## Next Steps

Now that you know the basics:

- [Deck Builder Tutorial](/user-guide/deck-builder-tutorial) - Deep dive into the canvas
- [Filtering & Search](/user-guide/filtering-and-search) - Master the filter system
- [Tags & Packages](/user-guide/tags-and-packages) - Organize with tags

## Tips for New Users

1. **Start with zones**: Create zones for your main categories before adding cards
2. **Use filters liberally**: The filter system is powerful - explore it!
3. **Save often**: Auto-save is enabled, but manual saves ensure nothing is lost
4. **Try different layouts**: There's no "right" way to organize - find what works for you
5. **Use the mini-map**: For large decks, the mini-map helps navigate

## Troubleshooting

### Cards not loading?
- Check your internet connection
- Refresh the page
- Clear browser cache

### Canvas feels slow?
- Close other browser tabs
- Use Firefox or Chrome for best performance
- Reduce zoom level if you have many cards

### Lost your changes?
- Check if auto-save is working (indicator in toolbar)
- Look for browser console errors (F12)

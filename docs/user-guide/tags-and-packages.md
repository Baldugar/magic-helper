# Tags & Card Packages

Customize your card organization with tags and build reusable card packages.

## Tags Overview

Tags are custom labels you create and assign to cards. Use them to:

- Categorize cards by strategy
- Mark cards for specific decks
- Track card performance
- Create personal organization systems

### Tag Types

| Type | Purpose |
|------|---------|
| **Regular Tags** | Direct labels for cards |
| **Meta Tags** | Category headers for chains |

## Creating Tags

### Quick Create

1. Right-click any card
2. Select "Create new tag..."
3. Enter tag name
4. Click Create

### From Manage Tags Dialog

1. Open Filter Bar
2. Click "Manage Tags"
3. Click "Create Tag"
4. Enter details:
   - Name (required, unique)
   - Meta tag checkbox
   - Color (optional)

### Tag Naming Tips

**Good tag names:**
- "Removal" - Clear purpose
- "Aggro Staple" - Strategy indicator
- "Needs Testing" - Status marker
- "Budget Option" - Category

**Avoid:**
- "Tag 1" - Meaningless
- "Good card" - Too vague
- Very long names - Hard to read

## Assigning Tags

### To a Single Card

1. Right-click the card
2. Hover over "Assign Tag"
3. Select a tag from the list

### With Tag Chains

For hierarchical organization:

1. Right-click the card
2. Select "Assign Tag with Chain..."
3. Build the chain path
4. Select the final tag

**Example chain:**
`Strategy > Control > Counterspell`

### Bulk Assignment

Currently, tags must be assigned one card at a time. Bulk assignment is planned for a future update.

## Tag Chains

### What Are Chains?

Chains organize tags hierarchically:

```
Strategy (meta tag)
├── Aggro
│   ├── Creature-based
│   └── Burn
├── Control
│   ├── Counterspells
│   └── Removal
└── Combo
    ├── Infinite
    └── Synergy
```

### Creating a Chain

When assigning a tag:

1. Open the Chain Builder dialog
2. Select category tags (meta tags) in order
3. Select the final (terminal) tag
4. Save the assignment

**Visual representation:**
```
[Strategy] > [Control] > [Removal]
    ↑            ↑           ↑
  meta tag   meta tag   regular tag
```

### Why Use Chains?

1. **Organization**: Group related tags logically
2. **Flexible filtering**: Filter at any level
3. **Clarity**: See the full context of a tag

### Chain Filtering

Filter by chains in the Filter Bar:

- Filter by `Strategy` - Shows all cards with any Strategy chain
- Filter by `Strategy > Control` - Shows control cards only
- Filter by `Strategy > Control > Removal` - Shows removal specifically

## Managing Tags

### Edit a Tag

1. Open "Manage Tags" dialog
2. Find the tag in the list
3. Click the edit icon
4. Modify name or meta status
5. Save changes

### Delete a Tag

1. Open "Manage Tags" dialog
2. Find the tag
3. Click the delete icon
4. Confirm deletion

**Warning:** Deleting a tag removes it from all cards.

### View Tag Usage

In the Manage Tags dialog, see:
- How many cards have each tag
- Which decks use each tag

## Tag Colors

Assign colors to tags for visual distinction:

1. Edit the tag
2. Select a color
3. Save

Colors appear:
- In the tag chip on cards
- In filter bar selections
- In the manage tags list

## Filtering by Tags

### In the Filter Bar

1. Open the Tag filter section
2. Click tags to toggle:
   - Green = Include (show tagged cards)
   - Red = Exclude (hide tagged cards)
   - Gray = Neutral

### Combining Tag Filters

**Show removal OR card draw:**
- "Removal" = Include
- "Card Draw" = Include
- (Shows cards with either tag)

**Show removal but NOT expensive:**
- "Removal" = Include
- "Expensive" = Exclude

## Card Packages

Packages are pre-built card collections for quick import.

### What Are Packages?

A package is a saved group of cards, like:
- "Mono-Red Aggro Core"
- "Mana Rocks Under $5"
- "Izzet Spellslinger Staples"
- "Green Creature Toolbox"

### Creating a Package

1. Build a deck with the cards you want
2. Open the Packages dialog
3. Click "Create Package from Deck"
4. Name your package
5. Save

### Importing a Package

1. Open a deck
2. Open the Packages dialog
3. Browse available packages
4. Click "Import" on desired package
5. Cards are added to your deck

### Package Contents

Packages store:
- Card references (not copies)
- Card counts
- Optional notes

### Managing Packages

- **View**: See all cards in a package
- **Edit**: Add/remove cards
- **Delete**: Remove the package

## Use Cases

### Strategy Tags

Tag cards by strategic role:
- "Win Condition"
- "Card Advantage"
- "Removal"
- "Ramp"
- "Protection"

### Performance Tags

Track how cards perform:
- "Overperformer"
- "Underperformer"
- "Needs Testing"
- "Cut Candidate"

### Meta Tags

Track cards in the metagame:
- "Sideboard Tech"
- "Meta Answer"
- "Flex Slot"

### Budget Tags

Organize by price:
- "Budget"
- "Mid-Range"
- "Premium"
- "Proxy Candidate"

### Deck-Specific Tags

Mark cards for specific decks:
- "For Aggro Deck"
- "For Control Deck"
- "Commander Staple"

## Best Practices

### 1. Start Simple

Begin with a few essential tags:
- 3-5 strategy tags
- 1-2 status tags

Add more as needed.

### 2. Use Consistent Naming

Pick a style and stick to it:
- All lowercase: `removal`, `ramp`
- Title Case: `Removal`, `Ramp`
- Descriptive: `Creature Removal`, `Mana Ramp`

### 3. Use Meta Tags for Categories

Create meta tags for top-level categories:
- Strategy (meta)
- Card Type (meta)
- Status (meta)

Then create regular tags under them.

### 4. Review Regularly

Periodically review your tags:
- Remove unused tags
- Consolidate similar tags
- Update chains as needed

### 5. Package Common Combinations

If you often add the same cards together, create a package:
- Sol Ring + Arcane Signet + Command Tower
- Lightning Bolt + Chain Lightning + Rift Bolt

## Troubleshooting

### Tag not appearing?

- Refresh the tag list
- Check if tag was deleted
- Verify tag assignment saved

### Chain not working?

- Ensure meta tags are set correctly
- Check chain order
- Verify all tags in chain exist

### Package import fails?

- Check internet connection
- Verify package still exists
- Try importing fewer cards

## Next Steps

- [Filtering & Search](/user-guide/filtering-and-search) - Use tags in filters
- [Deck Builder Tutorial](/user-guide/deck-builder-tutorial) - Organize tagged cards

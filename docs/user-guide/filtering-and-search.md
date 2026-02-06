# Filtering & Search

Magic Helper's filter system lets you find exactly the cards you need from the entire MTG database. This guide covers all filtering features.

## The Filter Bar

The filter bar sits above the card catalogue. It contains:

- Text search box
- Color selectors
- Type filters
- Additional filter dropdowns
- Sort controls

## Text Search

Type in the search box to find cards by name or rules text.

**Examples:**
- `lightning` - Cards with "lightning" in the name
- `destroy target` - Cards with this rules text
- `goblin` - All goblin cards

**Tips:**
- Search is case-insensitive
- Partial matches work
- Searches both name and oracle text

## Ternary Filters

Most filters in Magic Helper use **three states** instead of simple on/off:

| State | Visual | Meaning |
|-------|--------|---------|
| **Include** | Green / Check | Show cards matching this |
| **Exclude** | Red / X | Hide cards matching this |
| **Neutral** | Gray / Dash | No filter applied |

**Click a filter to cycle through states:**
Neutral → Include → Exclude → Neutral

### Why Three States?

Simple filters only let you include things. Ternary filters let you:

**Include + Neutral:**
"Show green cards" (Green = Include, others = Neutral)

**Include + Exclude:**
"Show green cards that aren't red"
(Green = Include, Red = Exclude, others = Neutral)

**Exclude only:**
"Show anything except blue"
(Blue = Exclude, others = Neutral)

## Color Filter

Filter cards by their mana colors.

### Color Symbols

| Symbol | Color |
|--------|-------|
| W | White |
| U | Blue |
| B | Black |
| R | Red |
| G | Green |
| C | Colorless |

### Multi-Color Options

| Option | Description |
|--------|-------------|
| **Multi** | Cards with 2+ colors |
| **Mono** | Cards with exactly 1 color |
| **Colorless** | Cards with no color |

### Examples

**Mono-green creatures:**
- G = Include
- Other colors = Exclude

**Simic (blue-green) cards:**
- U = Include
- G = Include
- Others = Neutral (allows UG, U, G, and colorless)

**Non-red cards:**
- R = Exclude
- Others = Neutral

## Mana Value (CMC) Filter

Filter by converted mana cost / mana value.

| Value | Meaning |
|-------|---------|
| 0-9 | Exact mana value |
| 10+ | Mana value 10 or higher |

**Example: Low curve deck**
- 1, 2, 3 = Include
- 4+ = Exclude

## Card Type Filter

Filter by card types.

### Main Types

- Creature
- Instant
- Sorcery
- Enchantment
- Artifact
- Planeswalker
- Land

### Using Type Filters

**Only creatures:**
- Creature = Include
- Others = Neutral

**Creatures and instants:**
- Creature = Include
- Instant = Include
- Others = Neutral

**Non-creature spells:**
- Creature = Exclude
- Land = Exclude
- Others = Neutral

## Rarity Filter

Filter by card rarity.

| Rarity | Description |
|--------|-------------|
| Common | Most frequent |
| Uncommon | Less frequent |
| Rare | Rare cards |
| Mythic | Rarest cards |

**Budget deck (no mythics):**
- Common, Uncommon, Rare = Include
- Mythic = Exclude

## Set Filter

Filter by expansion/set.

1. Click the set filter dropdown
2. Search for a set name
3. Click to toggle include/exclude

**Recent sets only:**
Include recent sets, exclude older ones.

**Specific set focus:**
Include only the set you're building from.

## Format Legality Filter

Filter by format legality.

### Formats

- Standard
- Pioneer
- Modern
- Legacy
- Vintage
- Commander
- Pauper
- Historic
- Alchemy

### Legality Status

| Status | Meaning |
|--------|---------|
| Legal | Allowed in format |
| Banned | Not allowed |
| Restricted | 1 copy allowed (Vintage) |
| Not Legal | Never legal in format |

**Standard-legal cards:**
- Standard + Legal = Include

**Commander staples:**
- Commander + Legal = Include

## Game Platform Filter

Filter by where the card is available.

| Platform | Description |
|----------|-------------|
| Paper | Physical cards |
| MTGO | Magic Online |
| Arena | MTG Arena |

**Arena-only brewing:**
- Arena = Include
- Paper/MTGO = Neutral

## Tag Filter

Filter by your custom tags.

### Using Tags

1. Assign tags to cards (see [Tags guide](/user-guide/tags-and-packages))
2. Open the tag filter
3. Toggle tags to include/exclude

**Example:**
- "Removal" tag = Include
- Shows all cards you've tagged as removal

## Chain Filter

Filter by tag chains (hierarchical tags).

If you've created chains like `Strategy > Aggro > Creature-based`:

1. Open chain filter
2. Select the chain to filter by
3. Toggle include/exclude

## Sorting

Click the sort builder to arrange results.

### Sort Fields

| Field | Description |
|-------|-------------|
| Color | WUBRG order |
| CMC | Mana value |
| Name | Alphabetical |
| Rarity | Common to Mythic |
| Set | By release date |

### Multi-Level Sorting

Add multiple sort levels:
1. Primary: Color (ascending)
2. Secondary: CMC (ascending)
3. Tertiary: Name (ascending)

Enable/disable levels without removing them.

## Filter Presets

Save filter configurations for reuse.

### Saving a Preset

1. Set up your filters
2. Click "Save Preset"
3. Enter a name
4. Click Save

### Loading a Preset

1. Click the presets dropdown
2. Select a preset
3. Filters are applied instantly

### Managing Presets

- **Update**: Save again with the same name
- **Delete**: Click the trash icon

### Preset Ideas

| Preset Name | Filters |
|-------------|---------|
| "Standard Legal" | Standard = Legal |
| "Budget Rares" | Rare = Include, Mythic = Exclude |
| "Removal Suite" | "Removal" tag = Include |
| "My Commander Identity" | Colors matching commander |

## Commander Color Identity

When building a Commander deck:

1. Set a card as commander
2. Color identity filter auto-applies
3. Only legal cards show

**How it works:**
- Commander's color identity is calculated
- Cards outside identity are hidden
- Includes colorless cards

## Advanced Filtering Tips

### Combining Filters

Filters are AND logic - all must match:
- Color = Green AND Type = Creature AND CMC = 2
- Shows green 2-mana creatures

### Exclusion for Refinement

Start broad, then exclude:
1. Type = Creature (many results)
2. R = Exclude (fewer results)
3. CMC 5+ = Exclude (even fewer)

### Reset Filters

Click "Clear Filters" to reset all filters to neutral.

### Filter Performance

Filters are applied instantly thanks to in-memory indexing. Even with 100,000+ cards, results appear immediately.

## Troubleshooting

### No results?

- Check for conflicting filters
- Look for accidental excludes (red marks)
- Try clearing filters and starting fresh

### Too many results?

- Add more include filters
- Use exclude to remove unwanted categories
- Sort by relevance (CMC, then name)

### Can't find a card?

- Check spelling in text search
- Try partial name match
- Check set filter (might be excluded)
- Check legality filter

## Next Steps

- [Tags & Packages](/user-guide/tags-and-packages) - Create custom organization
- [Deck Builder Tutorial](/user-guide/deck-builder-tutorial) - Use filtered cards in decks

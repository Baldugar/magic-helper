# Tag Chain System

The tag chain system allows hierarchical organization of tags. This document explains the data model, storage, and usage.

## Overview

Tags can be organized into chains representing hierarchies:

```
Strategy > Aggro > Creature-based
Category > Removal > Instant-speed
Theme > Tribal > Goblins
```

This enables:
- **Granular categorization**: Apply specific tags while maintaining hierarchy
- **Flexible filtering**: Filter by any level of the chain
- **Organization**: Group related tags logically

## Data Model

### MTG_Tag

```typescript
interface MTG_Tag {
  id: string       // Unique identifier
  name: string     // Display name (unique)
  meta: boolean    // Is this a meta/category tag?
  color?: string   // Optional display color (hex)
}
```

**Meta Tags**: Tags with `meta: true` are intended as category headers, not for direct assignment. They typically appear as chain prefixes.

### MTG_TagAssignment

```typescript
interface MTG_TagAssignment {
  tag: MTG_Tag              // The terminal (leaf) tag
  chain: MTG_Tag[]          // Parent tags in order
  chainDisplay: string      // Human-readable chain (e.g., "Strategy > Aggro")
}
```

### Example

```
Tag: "Creature-based" (meta: false)
Chain: ["Strategy", "Aggro"]

Full path: Strategy > Aggro > Creature-based
```

## Database Storage

### mtg_tags Collection

```json
{
  "_key": "creature-based",
  "name": "Creature-based",
  "meta": false,
  "color": "#4CAF50"
}
```

```json
{
  "_key": "strategy",
  "name": "Strategy",
  "meta": true
}
```

### mtg_tag_to_card Edges

The chain is stored directly on the edge:

```json
{
  "_from": "mtg_tags/creature-based",
  "_to": "mtg_cards/goblin-guide",
  "chain": ["strategy", "aggro"]
}
```

**Why on the edge?**
- Same tag can be applied with different chains to different cards
- Chain is specific to the assignment, not the tag itself
- Allows flexible categorization

## Querying

### Get Tag Assignments for a Card

```aql
FOR tag, edge IN 1..1 INBOUND @cardDoc mtg_tag_to_card
    LET chainTags = (
        FOR chainTagID IN (edge.chain || [])
            LET chainTag = DOCUMENT(CONCAT("mtg_tags/", chainTagID))
            RETURN {
                id: chainTag._key,
                name: chainTag.name,
                meta: chainTag.meta
            }
    )
    LET chainDisplay = (
        LENGTH(chainTags) > 0
            ? CONCAT_SEPARATOR(" > ", APPEND(chainTags[*].name, [tag.name]))
            : tag.name
    )
    RETURN {
        tag: {
            id: tag._key,
            name: tag.name,
            meta: tag.meta
        },
        chain: chainTags,
        chainDisplay: chainDisplay
    }
```

### Get All Unique Chains

```aql
FOR edge IN mtg_tag_to_card
    FILTER LENGTH(edge.chain || []) > 0

    LET terminalTag = DOCUMENT(edge._from)
    LET chainTags = (
        FOR tagID IN edge.chain
            LET tag = DOCUMENT(CONCAT("mtg_tags/", tagID))
            RETURN { id: tag._key, name: tag.name }
    )

    COLLECT
        terminal = { id: terminalTag._key, name: terminalTag.name },
        chain = chainTags

    RETURN {
        terminalTag: terminal,
        chain: chain,
        chainDisplay: CONCAT_SEPARATOR(
            " > ",
            APPEND(chain[*].name, [terminal.name])
        )
    }
```

### Filter Cards by Chain

```aql
FOR card IN mtg_cards
    LET hasChain = LENGTH(
        FOR tag, edge IN 1..1 INBOUND card mtg_tag_to_card
            FILTER tag._key == @terminalTagID
            FILTER edge.chain == @chainTagIDs
            RETURN 1
    ) > 0

    FILTER hasChain == true
    RETURN card
```

## Backend Implementation

### Assign Tag with Chain

**Location**: `server/graph/mtg/tags_mutations.go`

```go
func AssignTagToCard(
    ctx context.Context,
    tagID string,
    cardID string,
    chainTagIDs []string,
) (*model.Response, error) {
    // Validate tag exists
    tag, err := getTag(tagID)
    if err != nil {
        return errorResponse("Tag not found")
    }

    // Validate chain tags exist
    for _, chainTagID := range chainTagIDs {
        if _, err := getTag(chainTagID); err != nil {
            return errorResponse("Chain tag not found: " + chainTagID)
        }
    }

    // Check for existing assignment
    existing := findExistingAssignment(tagID, cardID)
    if existing != nil {
        // Update chain on existing edge
        return updateAssignmentChain(existing, chainTagIDs)
    }

    // Create new edge
    edge := MTGTagToCardEdge{
        From:  "mtg_tags/" + tagID,
        To:    "mtg_cards/" + cardID,
        Chain: chainTagIDs,
    }

    _, err = db.CreateDocument(ctx, "mtg_tag_to_card", edge)
    if err != nil {
        return errorResponse("Failed to assign tag")
    }

    // Rebuild card index to include new assignment
    mtgCardSearch.RebuildCardTagIndex()

    return okResponse()
}
```

### Get Tag Assignments

**Location**: `server/graph/mtg/tags_queries.go`

```go
func GetTagAssignmentsForCard(ctx context.Context, cardID string) ([]*model.MTGTagAssignment, error) {
    query := arango.NewQuery(`
        FOR tag, edge IN 1..1 INBOUND @cardDoc mtg_tag_to_card
            LET chainTags = (
                FOR chainTagID IN (edge.chain || [])
                    LET chainTag = DOCUMENT(CONCAT("mtg_tags/", chainTagID))
                    RETURN { id: chainTag._key, name: chainTag.name, meta: chainTag.meta }
            )
            RETURN {
                tag: { id: tag._key, name: tag.name, meta: tag.meta },
                chain: chainTags
            }
    `).AddBindVar("cardDoc", "mtg_cards/"+cardID)

    cursor, _ := query.Execute(ctx)
    var assignments []*model.MTGTagAssignment
    for cursor.HasMore() {
        var a model.MTGTagAssignment
        cursor.ReadDocument(ctx, &a)
        a.ChainDisplay = buildChainDisplay(a.Chain, a.Tag)
        assignments = append(assignments, &a)
    }

    return assignments, nil
}
```

## Frontend Implementation

### Tag Selector

**Location**: `client/src/components/deckBuilder/FilterBar/controls/TagSelector.tsx`

Displays available tags with ternary filter controls:

```tsx
function TagSelector() {
  const { filter, setFilter, availableTags } = useMTGFilter()

  const handleTagToggle = (tagID: string) => {
    const current = filter.tags[tagID] || 'UNSET'
    const next = cycleTernary(current)

    setFilter({
      ...filter,
      tags: { ...filter.tags, [tagID]: next }
    })
  }

  return (
    <Box>
      {availableTags.map(tag => (
        <TernaryChip
          key={tag.id}
          label={tag.name}
          value={filter.tags[tag.id] || 'UNSET'}
          onClick={() => handleTagToggle(tag.id)}
        />
      ))}
    </Box>
  )
}
```

### Chain Selector

**Location**: `client/src/components/deckBuilder/FilterBar/controls/ChainSelector.tsx`

Displays existing chains for filtering:

```tsx
function ChainSelector() {
  const { filter, setFilter, existingChains } = useMTGFilter()

  const handleChainToggle = (chain: TagChain) => {
    const key = chainToKey(chain)
    const current = findChainFilter(filter.chains, chain)?.value || 'UNSET'
    const next = cycleTernary(current)

    if (next === 'UNSET') {
      // Remove from filter
      setFilter({
        ...filter,
        chains: filter.chains.filter(c => chainToKey(c) !== key)
      })
    } else {
      // Add or update
      setFilter({
        ...filter,
        chains: upsertChainFilter(filter.chains, { ...chain, value: next })
      })
    }
  }

  return (
    <Box>
      {existingChains.map(chain => (
        <TernaryChip
          key={chainToKey(chain)}
          label={chain.chainDisplay}
          value={findChainFilter(filter.chains, chain)?.value || 'UNSET'}
          onClick={() => handleChainToggle(chain)}
        />
      ))}
    </Box>
  )
}
```

### Chain Builder Dialog

**Location**: `client/src/components/deckBuilder/FilterBar/TagDialogs/ChainBuilderDialog.tsx`

UI for building new chains when assigning tags:

```tsx
function ChainBuilderDialog({ open, onClose, onSave, cardID }) {
  const [selectedTag, setSelectedTag] = useState<MTG_Tag | null>(null)
  const [chainPath, setChainPath] = useState<MTG_Tag[]>([])

  const handleAddToChain = (tag: MTG_Tag) => {
    setChainPath([...chainPath, tag])
  }

  const handleSave = async () => {
    if (!selectedTag) return

    await MTGFunctions.mutations.assignTagToCard({
      tagID: selectedTag.id,
      cardID: cardID,
      chainTagIDs: chainPath.map(t => t.id)
    })

    onSave()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Build Tag Chain</DialogTitle>
      <DialogContent>
        {/* Chain path display */}
        <Box>
          {chainPath.map((tag, i) => (
            <Chip key={i} label={tag.name} onDelete={() => removeFromChain(i)} />
          ))}
          {selectedTag && <Chip label={selectedTag.name} color="primary" />}
        </Box>

        {/* Tag selection */}
        <Typography>Select chain parents (meta tags):</Typography>
        <TagList
          tags={metaTags}
          onSelect={handleAddToChain}
        />

        <Typography>Select terminal tag:</Typography>
        <TagList
          tags={regularTags}
          onSelect={setSelectedTag}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!selectedTag}>
          Assign Tag
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

### Manage Tags Dialog

**Location**: `client/src/components/deckBuilder/FilterBar/TagDialogs/ManageTagsDialog.tsx`

CRUD operations for tags:

```tsx
function ManageTagsDialog({ open, onClose }) {
  const { availableTags, refetchTags } = useMTGFilter()
  const [editingTag, setEditingTag] = useState<MTG_Tag | null>(null)

  const handleCreateTag = async (name: string, meta: boolean) => {
    await MTGFunctions.mutations.createMTGTag({ name, meta })
    refetchTags()
  }

  const handleUpdateTag = async (tagID: string, name: string, meta: boolean) => {
    await MTGFunctions.mutations.updateMTGTag({ tagID, name, meta })
    refetchTags()
  }

  const handleDeleteTag = async (tagID: string) => {
    await MTGFunctions.mutations.deleteMTGTag({ tagID })
    refetchTags()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle>Manage Tags</DialogTitle>
      <DialogContent>
        <List>
          {availableTags.map(tag => (
            <ListItem key={tag.id}>
              <ListItemText
                primary={tag.name}
                secondary={tag.meta ? "Meta tag (category)" : "Regular tag"}
              />
              <IconButton onClick={() => setEditingTag(tag)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDeleteTag(tag.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>

        <CreateTagForm onSubmit={handleCreateTag} />
      </DialogContent>
    </Dialog>
  )
}
```

## GraphQL Schema

### Types

```graphql
type MTG_Tag {
  id: ID!
  name: String!
  meta: Boolean!
  color: String
}

type MTG_TagAssignment {
  tag: MTG_Tag!
  chain: [MTG_Tag!]!
  chainDisplay: String!
}

type MTG_TagChain {
  terminalTag: MTG_Tag!
  chain: [MTG_Tag!]!
  chainDisplay: String!
}
```

### Queries

```graphql
type Query {
  getMTGTags: [MTG_Tag!]!
  getMTGTag(tagID: ID!): MTG_Tag
  getMTGTagChains: [MTG_TagChain!]!
}
```

### Mutations

```graphql
type Mutation {
  createMTGTag(input: CreateMTGTagInput!): Response!
  updateMTGTag(input: UpdateMTGTagInput!): Response!
  deleteMTGTag(tagID: ID!): Response!
  assignTagToCard(input: AssignTagInput!): Response!
  unassignTagFromCard(tagID: ID!, cardID: ID!): Response!
}

input CreateMTGTagInput {
  name: String!
  meta: Boolean!
  color: String
}

input AssignTagInput {
  tagID: ID!
  cardID: ID!
  chainTagIDs: [ID!]
}
```

## Best Practices

### Creating Tags

1. **Use meta tags for categories**: Create "Strategy", "Theme", "Purpose" as meta tags
2. **Use regular tags for specifics**: Create "Aggro", "Control", "Ramp" as regular tags
3. **Keep names unique**: Tag names must be unique across the system

### Building Chains

1. **Hierarchy first**: Add category tags to the chain before selecting the terminal tag
2. **Consistent depth**: Try to maintain similar chain depths (2-3 levels)
3. **Meaningful paths**: Chains should read naturally (Strategy > Aggro > Creature-based)

### Filtering

1. **Filter by terminal tag**: Most specific filtering
2. **Filter by chain**: Match exact hierarchy path
3. **Combine with other filters**: Chains work with color, type, and other filters

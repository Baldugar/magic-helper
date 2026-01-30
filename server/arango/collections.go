package arango

import arangoDriver "github.com/arangodb/go-driver"

// ArangoDocument represents the name of a document collection.
type ArangoDocument string

const (
	// Application collections
	APPLICATION_CONFIG_COLLECTION ArangoDocument = "application_config"
	// MTG Original data from Scryfall
	MTG_ORIGINAL_SETS_COLLECTION  ArangoDocument = "mtg_original_sets"
	MTG_ORIGINAL_CARDS_COLLECTION ArangoDocument = "mtg_original_cards"
	// MTG collections
	MTG_SETS_COLLECTION  ArangoDocument = "mtg_sets"
	MTG_CARDS_COLLECTION ArangoDocument = "mtg_cards"
	// MTG user collections
	MTG_DECKS_COLLECTION          ArangoDocument = "mtg_decks"
	MTG_FILTER_PRESETS_COLLECTION ArangoDocument = "mtg_filter_presets"
	MTG_TAGS_COLLECTION           ArangoDocument = "mtg_tags"
	MTG_CARD_PACKAGES_COLLECTION  ArangoDocument = "mtg_card_packages"
)

func (d ArangoDocument) String() string {
	return string(d)
}

// DOCUMENT_COLLECTIONS_ARRAY lists all document collections that must exist.
var DOCUMENT_COLLECTIONS_ARRAY = []ArangoDocument{
	// Application collections
	APPLICATION_CONFIG_COLLECTION,
	// MTG Original data from Scryfall
	MTG_ORIGINAL_SETS_COLLECTION,
	MTG_ORIGINAL_CARDS_COLLECTION,
	// MTG collections
	MTG_SETS_COLLECTION,
	MTG_CARDS_COLLECTION,
	// MTG user collections
	MTG_DECKS_COLLECTION,
	MTG_FILTER_PRESETS_COLLECTION,
	MTG_TAGS_COLLECTION,
	MTG_CARD_PACKAGES_COLLECTION,
}

// ArangoEdge represents the name of an edge collection.
type ArangoEdge string

const (
	// Set
	MTG_SET_IS_ORIGINAL_SET_EDGE ArangoEdge = "mtg_set_is_original_set"
	// Deck
	MTG_CARD_DECK_EDGE                ArangoEdge = "mtg_card_deck"
	MTG_DECK_FRONT_IMAGE_EDGE         ArangoEdge = "mtg_deck_front_image"
	MTG_IGNORED_CARDS_EDGE_COLLECTION ArangoEdge = "mtg_deck_ignore_card"
	// Filter Preset
	MTG_FILTER_PRESET_FOR_DECK_EDGE ArangoEdge = "mtg_filter_preset_for_deck"
	// Tag
	MTG_TAG_TO_DECK_EDGE         ArangoEdge = "mtg_tag_to_deck"
	MTG_TAG_TO_CARD_EDGE         ArangoEdge = "mtg_tag_to_card"
	MTG_TAG_TO_CARD_PACKAGE_EDGE ArangoEdge = "mtg_tag_to_card_package"
	// Card Package
	MTG_CARD_IN_CARD_PACKAGE_EDGE ArangoEdge = "mtg_card_in_card_package"
)

func (e ArangoEdge) String() string {
	return string(e)
}

// EDGE_COLLECTIONS_ARRAY lists all edge collections that must exist.
var EDGE_COLLECTIONS_ARRAY = []ArangoEdge{
	// Set
	MTG_SET_IS_ORIGINAL_SET_EDGE,
	// Deck
	MTG_CARD_DECK_EDGE,
	MTG_DECK_FRONT_IMAGE_EDGE,
	MTG_IGNORED_CARDS_EDGE_COLLECTION,
	// Filter Preset
	MTG_FILTER_PRESET_FOR_DECK_EDGE,
	// Tag
	MTG_TAG_TO_DECK_EDGE,
	MTG_TAG_TO_CARD_EDGE,
	MTG_TAG_TO_CARD_PACKAGE_EDGE,
	// Card Package
	MTG_CARD_IN_CARD_PACKAGE_EDGE,
}

type ArangoIndexEnum string

const (
	MTG_CARDS_BUILDUP_INDEX ArangoIndexEnum = "mtg_cards_buildup"
)

func (i ArangoIndexEnum) String() string {
	return string(i)
}

// ArangoIndexStruct describes a persistent index definition for a collection.
type ArangoIndexStruct struct {
	CollectionName string
	IsEdge         bool
	Fields         []string
	Options        *arangoDriver.EnsurePersistentIndexOptions
}

type ArangoIndexMap map[ArangoIndexEnum]ArangoIndexStruct

// INDEX_ARRAY holds the set of indexes that must be ensured at startup.
var INDEX_ARRAY ArangoIndexMap = map[ArangoIndexEnum]ArangoIndexStruct{
	MTG_CARDS_BUILDUP_INDEX: {
		CollectionName: MTG_CARDS_COLLECTION.String(),
		IsEdge:         false,
		Fields:         []string{"manaCost", "layout"},
		Options: &arangoDriver.EnsurePersistentIndexOptions{
			Unique: false,
			Sparse: false,
			Name:   MTG_CARDS_BUILDUP_INDEX.String(),
		},
	},
}

type ArangoGraphEnum string

const (
	MTG_DECK_GRAPH         ArangoGraphEnum = "mtg_deck_graph"
	MTG_CARD_GRAPH         ArangoGraphEnum = "mtg_card_graph"
	MTG_TAG_GRAPH          ArangoGraphEnum = "mtg_tag_graph"
	MTG_CARD_PACKAGE_GRAPH ArangoGraphEnum = "mtg_card_package_graph"
)

func (g ArangoGraphEnum) String() string {
	return string(g)
}

type ArangoGraphMap map[ArangoGraphEnum]arangoDriver.CreateGraphOptions

var GRAPH_ARRAY ArangoGraphMap = map[ArangoGraphEnum]arangoDriver.CreateGraphOptions{
	MTG_DECK_GRAPH: {
		EdgeDefinitions: []arangoDriver.EdgeDefinition{
			{
				Collection: MTG_CARD_DECK_EDGE.String(),
				From:       []string{MTG_CARDS_COLLECTION.String()},
				To:         []string{MTG_DECKS_COLLECTION.String()},
			},
			{
				Collection: MTG_IGNORED_CARDS_EDGE_COLLECTION.String(),
				From:       []string{MTG_DECKS_COLLECTION.String()},
				To:         []string{MTG_CARDS_COLLECTION.String()},
			},
			{
				Collection: MTG_DECK_FRONT_IMAGE_EDGE.String(),
				From:       []string{MTG_DECKS_COLLECTION.String()},
				To:         []string{MTG_CARDS_COLLECTION.String()},
			},
			{
				Collection: MTG_FILTER_PRESET_FOR_DECK_EDGE.String(),
				From:       []string{MTG_FILTER_PRESETS_COLLECTION.String()},
				To:         []string{MTG_DECKS_COLLECTION.String()},
			},
			{
				Collection: MTG_TAG_TO_DECK_EDGE.String(),
				From:       []string{MTG_TAGS_COLLECTION.String()},
				To:         []string{MTG_DECKS_COLLECTION.String()},
			},
		},
	},
	MTG_CARD_GRAPH: {
		EdgeDefinitions: []arangoDriver.EdgeDefinition{
			{
				Collection: MTG_CARD_DECK_EDGE.String(),
				From:       []string{MTG_CARDS_COLLECTION.String()},
				To:         []string{MTG_DECKS_COLLECTION.String()},
			},
			{
				Collection: MTG_IGNORED_CARDS_EDGE_COLLECTION.String(),
				From:       []string{MTG_DECKS_COLLECTION.String()},
				To:         []string{MTG_CARDS_COLLECTION.String()},
			},
			{
				Collection: MTG_DECK_FRONT_IMAGE_EDGE.String(),
				From:       []string{MTG_DECKS_COLLECTION.String()},
				To:         []string{MTG_CARDS_COLLECTION.String()},
			},
			{
				Collection: MTG_CARD_IN_CARD_PACKAGE_EDGE.String(),
				From:       []string{MTG_CARDS_COLLECTION.String()},
				To:         []string{MTG_CARD_PACKAGES_COLLECTION.String()},
			},
			{
				Collection: MTG_TAG_TO_CARD_EDGE.String(),
				From:       []string{MTG_TAGS_COLLECTION.String()},
				To:         []string{MTG_CARDS_COLLECTION.String()},
			},
		},
	},
	MTG_TAG_GRAPH: {
		EdgeDefinitions: []arangoDriver.EdgeDefinition{
			{
				Collection: MTG_TAG_TO_DECK_EDGE.String(),
				From:       []string{MTG_TAGS_COLLECTION.String()},
				To:         []string{MTG_DECKS_COLLECTION.String()},
			},
			{
				Collection: MTG_TAG_TO_CARD_EDGE.String(),
				From:       []string{MTG_TAGS_COLLECTION.String()},
				To:         []string{MTG_CARDS_COLLECTION.String()},
			},
			{
				Collection: MTG_TAG_TO_CARD_PACKAGE_EDGE.String(),
				From:       []string{MTG_TAGS_COLLECTION.String()},
				To:         []string{MTG_CARD_PACKAGES_COLLECTION.String()},
			},
		},
	},
	MTG_CARD_PACKAGE_GRAPH: {
		EdgeDefinitions: []arangoDriver.EdgeDefinition{
			{
				Collection: MTG_CARD_IN_CARD_PACKAGE_EDGE.String(),
				From:       []string{MTG_CARDS_COLLECTION.String()},
				To:         []string{MTG_CARD_PACKAGES_COLLECTION.String()},
			},
			{
				Collection: MTG_TAG_TO_CARD_PACKAGE_EDGE.String(),
				From:       []string{MTG_TAGS_COLLECTION.String()},
				To:         []string{MTG_CARD_PACKAGES_COLLECTION.String()},
			},
		},
	},
}

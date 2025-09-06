package arango

import arangoDriver "github.com/arangodb/go-driver"

// ArangoDocument represents the name of a document collection.
type ArangoDocument string

const (
	// Application collections
	APPLICATION_CONFIG_COLLECTION ArangoDocument = "ApplicationConfig"
	// MTG Set collections
	MTG_ORIGINAL_SETS_COLLECTION ArangoDocument = "MTG_Original_Sets"
	MTG_SETS_COLLECTION          ArangoDocument = "MTG_Sets"
	// MTG collections
	MTG_CARDS_COLLECTION          ArangoDocument = "MTG_Cards"
	MTG_ORIGINAL_CARDS_COLLECTION ArangoDocument = "MTG_Original_Cards"
	MTG_DECKS_COLLECTION          ArangoDocument = "MTG_Decks"
	MTG_CARD_PACKAGES_COLLECTION  ArangoDocument = "MTG_Card_Packages"
	MTG_TAGS_COLLECTION           ArangoDocument = "MTG_Tags"
	// User collections
	USERS_COLLECTION ArangoDocument = "Users"
)

func (d ArangoDocument) String() string {
	return string(d)
}

// ArangoEdge represents the name of an edge collection.
type ArangoEdge string

const (
	// MTG edge collections
	MTG_CARD_DECK_EDGE                ArangoEdge = "MTG_Card_Deck"
	MTG_DECK_FRONT_CARD_IMAGE_EDGE    ArangoEdge = "MTG_Deck_Front_Card_Image"
	MTG_CARD_CARD_PACKAGE_EDGE        ArangoEdge = "MTG_Card_Card_Package"
	MTG_TAG_EDGE_COLLECTION           ArangoEdge = "MTG_Tag_CardDeck"
	MTG_USER_RATING_EDGE_COLLECTION   ArangoEdge = "MTG_User_Rating"
	MTG_IGNORED_CARDS_EDGE_COLLECTION ArangoEdge = "MTG_Deck_Ignore_Card"
)

func (e ArangoEdge) String() string {
	return string(e)
}

type ArangoIndexEnum string

const (
	MTG_CARDS_BUILDUP_INDEX ArangoIndexEnum = "MTG_Cards_Buildup"
)

func (i ArangoIndexEnum) String() string {
	return string(i)
}

// DOCUMENT_COLLECTIONS lists all document collections that must exist.
var DOCUMENT_COLLECTIONS = []ArangoDocument{
	// Application collections
	APPLICATION_CONFIG_COLLECTION,
	// MTG collections
	MTG_SETS_COLLECTION,
	MTG_ORIGINAL_SETS_COLLECTION,
	MTG_CARDS_COLLECTION,
	MTG_ORIGINAL_CARDS_COLLECTION,
	MTG_DECKS_COLLECTION,
	MTG_CARD_PACKAGES_COLLECTION,
	MTG_TAGS_COLLECTION,
	USERS_COLLECTION,
}

// EDGE_COLLECTIONS lists all edge collections that must exist.
var EDGE_COLLECTIONS = []ArangoEdge{
	// MTG edge collections
	MTG_CARD_DECK_EDGE,
	MTG_DECK_FRONT_CARD_IMAGE_EDGE,
	MTG_CARD_CARD_PACKAGE_EDGE,
	MTG_TAG_EDGE_COLLECTION,
	MTG_USER_RATING_EDGE_COLLECTION,
	MTG_IGNORED_CARDS_EDGE_COLLECTION,
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

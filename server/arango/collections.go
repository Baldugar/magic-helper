package arango

// Document collections
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

// Edge collections
type ArangoEdge string

const (
	// MTG edge collections
	MTG_CARD_DECK_EDGE              ArangoEdge = "MTG_Card_Deck"
	MTG_DECK_FRONT_CARD_IMAGE_EDGE  ArangoEdge = "MTG_Deck_Front_Card_Image"
	MTG_CARD_CARD_PACKAGE_EDGE      ArangoEdge = "MTG_Card_Card_Package"
	MTG_TAG_EDGE_COLLECTION         ArangoEdge = "MTG_Tag_CardDeck"
	MTG_USER_RATING_EDGE_COLLECTION ArangoEdge = "MTG_User_Rating"
)

func (e ArangoEdge) String() string {
	return string(e)
}

// Arrays of collections, views, and indexes
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

var EDGE_COLLECTIONS = []ArangoEdge{
	// MTG edge collections
	MTG_CARD_DECK_EDGE,
	MTG_DECK_FRONT_CARD_IMAGE_EDGE,
	MTG_CARD_CARD_PACKAGE_EDGE,
	MTG_TAG_EDGE_COLLECTION,
	MTG_USER_RATING_EDGE_COLLECTION,
}

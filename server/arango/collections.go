package arango

// Document collections
type ArangoDocument string

const (
	APPLICATION_CONFIG_COLLECTION  ArangoDocument = "ApplicationConfig"
	MTGA_CARDS_COLLECTION          ArangoDocument = "MTGA_Cards"
	MTGA_ORIGINAL_CARDS_COLLECTION ArangoDocument = "MTGA_Original_Cards"
	MTGA_DECKS_COLLECTION          ArangoDocument = "MTGA_Decks"
	MTGA_ORIGINAL_SETS_COLLECTION  ArangoDocument = "MTGA_Original_Sets"
	MTGA_SETS_COLLECTION           ArangoDocument = "MTGA_Sets"
)

func (d ArangoDocument) String() string {
	return string(d)
}

// Edge collections
type ArangoEdge string

const (
	MTGA_CARD_DECK_EDGE             ArangoEdge = "MTGA_Card_Deck"
	MTGA_DECK_FRONT_CARD_IMAGE_EDGE ArangoEdge = "MTGA_Deck_Front_Card_Image"
)

func (e ArangoEdge) String() string {
	return string(e)
}

// Arrays of collections, views, and indexes
var DOCUMENT_COLLECTIONS = []ArangoDocument{
	APPLICATION_CONFIG_COLLECTION,
	MTGA_CARDS_COLLECTION,
	MTGA_ORIGINAL_CARDS_COLLECTION,
	MTGA_DECKS_COLLECTION,
	MTGA_SETS_COLLECTION,
	MTGA_ORIGINAL_SETS_COLLECTION,
}

var EDGE_COLLECTIONS = []ArangoEdge{
	MTGA_CARD_DECK_EDGE,
	MTGA_DECK_FRONT_CARD_IMAGE_EDGE,
}

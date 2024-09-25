package arango

// Document collections
type ArangoDocument string

const (
	APPLICATION_CONFIG_COLLECTION  ArangoDocument = "ApplicationConfig"
	MTGA_CARDS_COLLECTION          ArangoDocument = "MTGA_Cards"
	MTGA_ORIGINAL_CARDS_COLLECTION ArangoDocument = "MTGA_Original_Cards"
)

// Arrays of collections, views, and indexes
var DOCUMENT_COLLECTIONS = []ArangoDocument{
	APPLICATION_CONFIG_COLLECTION,
	MTGA_CARDS_COLLECTION,
	MTGA_ORIGINAL_CARDS_COLLECTION,
}

package arango

import (
	arangoDriver "github.com/arangodb/go-driver"
)

// Document collections
type ArangoDocument string

const (
	USERS_COLLECTION ArangoDocument = "Users"
	CARDS_COLLECTION ArangoDocument = "Cards"
	DECKS_COLLECTION ArangoDocument = "Decks"
	TAGS_COLLECTION  ArangoDocument = "Tags"
)

// Edge collections
type ArangoEdge string

const (
	USER_DECK_EDGE_COLLECTION ArangoEdge = "UserToDeck"
	USER_CARD_EDGE_COLLECTION ArangoEdge = "UserToCard"
	CARD_DECK_EDGE_COLLECTION ArangoEdge = "CardToDeck"
	USER_TAG_EDGE_COLLECTION  ArangoEdge = "UserToTag"
	TAG_DECK_EDGE_COLLECTION  ArangoEdge = "TagToDeck"
	TAG_CARD_EDGE_COLLECTION  ArangoEdge = "TagToCard"
	TAG_ORIGINAL_TAG_EDGE     ArangoEdge = "TagToOriginalTag"
)

// Views
type ArangoView string

type ViewComposition struct {
	View          ArangoView
	DocumentLinks map[ArangoDocument]arangoDriver.ArangoSearchElementProperties
}

const (
	USERS_VIEW ArangoView = "UsersView"
	CARDS_VIEW ArangoView = "CardsView"
	DECKS_VIEW ArangoView = "DecksView"
	TAGS_VIEW  ArangoView = "TagsView"
)

// Indexes
type ArangoIndex string

const (
	USER_USERNAME_INDEX ArangoIndex = "UserUsernameIndex"
	CARD_NAME_SET_INDEX ArangoIndex = "CardNameSetIndex"
)

type IndexComposition struct {
	Collection ArangoDocument
	IsEdge     bool
	Fields     []string
	Unique     bool
	Name       ArangoIndex
}

type IndexMap map[ArangoIndex]IndexComposition

// Arrays of collections, views, and indexes
var DOCUMENT_COLLECTIONS = []ArangoDocument{
	USERS_COLLECTION,
	CARDS_COLLECTION,
	DECKS_COLLECTION,
	TAGS_COLLECTION,
}
var EDGE_COLLECTIONS = []ArangoEdge{
	USER_DECK_EDGE_COLLECTION,
	USER_CARD_EDGE_COLLECTION,
	CARD_DECK_EDGE_COLLECTION,
	USER_TAG_EDGE_COLLECTION,
	TAG_DECK_EDGE_COLLECTION,
	TAG_CARD_EDGE_COLLECTION,
	TAG_ORIGINAL_TAG_EDGE,
}
var falseBool = false
var ANALYZERS = []arangoDriver.ArangoSearchAnalyzerDefinition{
	{
		Name: "text_en_no_stem",
		Type: arangoDriver.ArangoSearchAnalyzerTypeText,
		Properties: arangoDriver.ArangoSearchAnalyzerProperties{
			Locale:    "en.utf-8",
			Accent:    &falseBool,
			Case:      "lower",
			Stemming:  &falseBool,
			Stopwords: []string{},
		},
		Features: []arangoDriver.ArangoSearchAnalyzerFeature{
			"frequency",
			"norm",
			"position",
		},
	},
}
var VIEWS = []ViewComposition{
	{
		View: CARDS_VIEW,
		DocumentLinks: map[ArangoDocument]arangoDriver.ArangoSearchElementProperties{
			CARDS_COLLECTION: {
				Analyzers: []string{"identity", "text_en_no_stem"},
				// TODO: Add more attributes for card search
				Fields: arangoDriver.ArangoSearchFields{
					"name": {},
					"set": {
						Analyzers: []string{"identity"},
					},
				},
			},
		},
	},
	{
		View: DECKS_VIEW,
		DocumentLinks: map[ArangoDocument]arangoDriver.ArangoSearchElementProperties{
			DECKS_COLLECTION: {
				Analyzers: []string{"identity", "text_en_no_stem"},
				Fields: arangoDriver.ArangoSearchFields{
					"name":        {},
					"colors":      {},
					"tags":        {},
					"description": {},
				},
			},
		},
	},
	{
		View: TAGS_VIEW,
		DocumentLinks: map[ArangoDocument]arangoDriver.ArangoSearchElementProperties{
			TAGS_COLLECTION: {
				Analyzers: []string{"identity", "text_en_no_stem"},
				Fields:    arangoDriver.ArangoSearchFields{},
			},
		},
	},
	{
		View: USERS_VIEW,
		DocumentLinks: map[ArangoDocument]arangoDriver.ArangoSearchElementProperties{
			USERS_COLLECTION: {
				Analyzers: []string{"identity", "text_en_no_stem"},
				Fields: arangoDriver.ArangoSearchFields{
					"username": {},
				},
			},
		},
	},
}
var INDEXES = IndexMap{
	CARD_NAME_SET_INDEX: {
		Collection: CARDS_COLLECTION,
		IsEdge:     false,
		Fields:     []string{"name", "set"},
		Unique:     true,
		Name:       CARD_NAME_SET_INDEX,
	},
	USER_USERNAME_INDEX: {
		Collection: USERS_COLLECTION,
		IsEdge:     false,
		Fields:     []string{"username"},
		Unique:     true,
		Name:       USER_USERNAME_INDEX,
	},
}

package arango

import (
	arangoDriver "github.com/arangodb/go-driver"
)

// Document collections
type ArangoDocument string

const (
	USERS_COLLECTION ArangoDocument = "users"
	CARDS_COLLECTION ArangoDocument = "cards"
	DECKS_COLLECTION ArangoDocument = "decks"
	TAGS_COLLECTION  ArangoDocument = "tags"
)

// Edge collections
type ArangoEdge string

const (
	USER_DECK_EDGE_COLLECTION ArangoEdge = "user_deck"
	USER_CARD_EDGE_COLLECTION ArangoEdge = "user_card"
	DECK_CARD_EDGE_COLLECTION ArangoEdge = "deck_card"
	USER_TAG_EDGE_COLLECTION  ArangoEdge = "user_tag"
	TAG_DECK_EDGE_COLLECTION  ArangoEdge = "tag_deck"
	TAG_CARD_EDGE_COLLECTION  ArangoEdge = "tag_card"
)

// Views
type ArangoView string

type ViewComposition struct {
	View          ArangoView
	DocumentLinks map[ArangoDocument]arangoDriver.ArangoSearchElementProperties
}

const (
	USERS_VIEW ArangoView = "usersView"
	CARDS_VIEW ArangoView = "cardsView"
	DECKS_VIEW ArangoView = "decksView"
	TAGS_VIEW  ArangoView = "tagsView"
)

// Indexes
type ArangoIndex string

const (
	USER_EMAIL_INDEX    ArangoIndex = "user_email_index"
	CARD_NAME_SET_INDEX ArangoIndex = "card_name_set_index"
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
	DECK_CARD_EDGE_COLLECTION,
	USER_TAG_EDGE_COLLECTION,
	TAG_DECK_EDGE_COLLECTION,
	TAG_CARD_EDGE_COLLECTION,
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
	USER_EMAIL_INDEX: {
		Collection: USERS_COLLECTION,
		IsEdge:     false,
		Fields:     []string{"email"},
		Unique:     true,
		Name:       USER_EMAIL_INDEX,
	},
	CARD_NAME_SET_INDEX: {
		Collection: CARDS_COLLECTION,
		IsEdge:     false,
		Fields:     []string{"name", "set"},
		Unique:     true,
		Name:       CARD_NAME_SET_INDEX,
	},
}

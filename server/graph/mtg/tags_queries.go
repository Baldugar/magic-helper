package mtg

import (
	"context"
	"magic-helper/arango"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

// GetMTGTags returns all tags from the mtg_tags collection.
func GetMTGTags(ctx context.Context) ([]*model.MtgTag, error) {
	log.Info().Msg("GetMTGTags: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR tag IN mtg_tags
		SORT tag.name ASC
		RETURN { _key: tag._key, name: tag.name, meta: tag.meta || false }
	`)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTags: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	var out []*model.MtgTag
	for cursor.HasMore() {
		var tag model.MtgTag
		_, err := cursor.ReadDocument(ctx, &tag)
		if err != nil {
			log.Error().Err(err).Msg("GetMTGTags: Error reading document")
			return nil, err
		}
		out = append(out, &tag)
	}

	log.Info().Msg("GetMTGTags: Finished")
	return out, nil
}

// GetMTGTag returns a single tag by ID, or nil if not found.
func GetMTGTag(ctx context.Context, tagID string) (*model.MtgTag, error) {
	log.Info().Str("tagID", tagID).Msg("GetMTGTag: Started")

	aq := arango.NewQuery( /* aql */ `
		FOR tag IN mtg_tags
		FILTER tag._key == @tagID
		LIMIT 1
		RETURN { _key: tag._key, name: tag.name, meta: tag.meta || false }
	`)

	aq.AddBindVar("tagID", tagID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTag: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	if !cursor.HasMore() {
		log.Info().Msg("GetMTGTag: Tag not found")
		return nil, nil
	}

	var tag model.MtgTag
	_, err = cursor.ReadDocument(ctx, &tag)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTag: Error reading document")
		return nil, err
	}

	log.Info().Msg("GetMTGTag: Finished")
	return &tag, nil
}

// GetTagAssignmentsForCard returns the full tag assignments with chain data for a card (for index sync).
func GetTagAssignmentsForCard(ctx context.Context, cardID string) ([]*model.MtgTagAssignment, error) {
	aq := arango.NewQuery( /* aql */ `
		FOR tag, edge IN 1..1 INBOUND CONCAT("mtg_cards", "/", @cardID) mtg_tag_to_card
		LET chainTags = (
			FOR chainTagID IN (edge.chain || [])
				LET chainTag = DOCUMENT("mtg_tags", chainTagID)
				RETURN { _key: chainTag._key, name: chainTag.name, meta: chainTag.meta || false }
		)
		LET allTagNames = APPEND(
			(FOR ct IN chainTags RETURN ct.name),
			[tag.name]
		)
		SORT tag.name ASC
		RETURN {
			tag: { _key: tag._key, name: tag.name, meta: tag.meta || false },
			chain: chainTags,
			chainDisplay: CONCAT_SEPARATOR(" → ", allTagNames)
		}
	`)

	aq.AddBindVar("cardID", cardID)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	var out []*model.MtgTagAssignment
	for cursor.HasMore() {
		var assignment model.MtgTagAssignment
		_, err := cursor.ReadDocument(ctx, &assignment)
		if err != nil {
			return nil, err
		}
		a := assignment
		out = append(out, &a)
	}
	return out, nil
}

// GetMTGTagChains returns all unique tag chains that exist on cards.
func GetMTGTagChains(ctx context.Context) ([]*model.MtgTagAssignment, error) {
	log.Info().Msg("GetMTGTagChains: Started")

	// Get all unique combinations of (terminal tag ID, chain IDs) from edges
	// Then resolve to full tag objects
	// Only return chains that have at least one meta tag in the chain
	aq := arango.NewQuery( /* aql */ `
		LET uniqueChains = (
			FOR edge IN mtg_tag_to_card
				FILTER LENGTH(edge.chain || []) > 0
				LET terminalTagID = PARSE_IDENTIFIER(edge._from).key
				LET chainKey = CONCAT(terminalTagID, ":", CONCAT_SEPARATOR(",", edge.chain || []))
				COLLECT key = chainKey, tid = terminalTagID, ch = edge.chain
				RETURN { terminalTagID: tid, chain: ch || [] }
		)
		FOR item IN uniqueChains
			LET terminalTag = DOCUMENT("mtg_tags", item.terminalTagID)
			LET chainTags = (
				FOR chainTagID IN item.chain
					LET chainTag = DOCUMENT("mtg_tags", chainTagID)
					RETURN { _key: chainTag._key, name: chainTag.name, meta: chainTag.meta || false }
			)
			LET allTagNames = APPEND(
				(FOR ct IN chainTags RETURN ct.name),
				[terminalTag.name]
			)
			FILTER terminalTag != null
			SORT allTagNames
			RETURN {
				tag: { _key: terminalTag._key, name: terminalTag.name, meta: terminalTag.meta || false },
				chain: chainTags,
				chainDisplay: CONCAT_SEPARATOR(" → ", allTagNames)
			}
	`)

	cursor, err := arango.DB.Query(ctx, aq.Query, aq.BindVars)
	if err != nil {
		log.Error().Err(err).Msg("GetMTGTagChains: Error querying database")
		return nil, err
	}
	defer cursor.Close()

	var out []*model.MtgTagAssignment
	for cursor.HasMore() {
		var assignment model.MtgTagAssignment
		_, err := cursor.ReadDocument(ctx, &assignment)
		if err != nil {
			log.Error().Err(err).Msg("GetMTGTagChains: Error reading document")
			return nil, err
		}
		a := assignment
		out = append(out, &a)
	}

	log.Info().Int("count", len(out)).Msg("GetMTGTagChains: Finished")
	return out, nil
}

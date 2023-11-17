package tags

import (
	"context"
	"magic-helper/graph/model"
	"magic-helper/util"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

func CreateTagMutation(ctx context.Context, input model.TagInput) (*model.Tag, error) {
	log.Info().Msgf("CreateTagMutation: Started")
	id := util.UUID4()
	now := util.CreateTimestamp()
	
}
package admin

import (
	"context"
	"fmt"

	"magic-helper/daemons"
	"magic-helper/graph/model"

	"github.com/rs/zerolog/log"
)

func RetryImport(ctx context.Context, input model.AdminImportActionInput) (*model.Response, error) {
	return triggerImport(ctx, input, false)
}

func BackfillImport(ctx context.Context, input model.AdminImportActionInput) (*model.Response, error) {
	return triggerImport(ctx, input, true)
}

func triggerImport(ctx context.Context, input model.AdminImportActionInput, forceOverride bool) (*model.Response, error) {
	actualForce := forceOverride
	if input.Force != nil {
		actualForce = actualForce || *input.Force
	}

	var run func(context.Context, bool)
	switch input.Job {
	case model.AdminJobMtgCards:
		run = daemons.RunMTGCardsImport
	case model.AdminJobMtgSets:
		run = daemons.RunMTGSetsImport
	default:
		return nil, fmt.Errorf("unsupported job %s", input.Job)
	}

	go run(ctx, actualForce)

	log.Info().Str("job", input.Job.String()).Bool("force", actualForce).Msg("manual import requested")
	message := fmt.Sprintf("Triggered %s import", input.Job.String())
	return &model.Response{Status: true, Message: &message}, nil
}

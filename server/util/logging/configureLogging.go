package logging

import (
	"magic-helper/settings"
	"os"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/pkgerrors"
)

// Configure initializes zerolog with sane defaults and applies level from settings.
func Configure(settings settings.Settings) {
	zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack
	zerolog.TimestampFieldName = "t"
	zerolog.LevelFieldName = "l"
	zerolog.MessageFieldName = "msg"
	zerolog.ErrorFieldName = "err"
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zerolog.DurationFieldUnit = time.Duration(zerolog.DurationFieldUnit.Milliseconds())
	zerolog.DurationFieldInteger = true
	switch settings.Logging.LogLevel {
	case "Debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "Info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "Warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "Error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	case "Fatal":
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	case "Panic":
		zerolog.SetGlobalLevel(zerolog.PanicLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
	log.Logger = log.With().Caller().Timestamp().Logger().Output(zerolog.ConsoleWriter{Out: os.Stderr})
	log.Info().Msg("Logging initialized")
}

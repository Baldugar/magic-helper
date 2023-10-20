package logging

import (
	"magic-helper/settings"
	"os"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/pkgerrors"
)

func Configure(settings settings.Settings) {
	zerolog.ErrorStackMarshaler = pkgerrors.MarshalStack
	zerolog.TimestampFieldName = "t"
	zerolog.LevelFieldName = "l"
	zerolog.MessageFieldName = "m"
	zerolog.ErrorFieldName = "e"
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zerolog.DurationFieldUnit = time.Duration(zerolog.DurationFieldUnit.Milliseconds())
	zerolog.DurationFieldInteger = true
	if settings.Logging.LogLevel == "Debug" {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	} else if settings.Logging.LogLevel == "Info" {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else if settings.Logging.LogLevel == "Warn" {
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	} else if settings.Logging.LogLevel == "Error" {
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	} else if settings.Logging.LogLevel == "Fatal" {
		zerolog.SetGlobalLevel(zerolog.FatalLevel)
	} else if settings.Logging.LogLevel == "Panic" {
		zerolog.SetGlobalLevel(zerolog.PanicLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
	log.Logger = log.With().Caller().Timestamp().Logger().Output(zerolog.ConsoleWriter{Out: os.Stderr})
	log.Info().Msg("Logging initialized")
}

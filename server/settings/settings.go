package settings

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"strings"

	"github.com/rs/zerolog/log"
)

type ArangoDBConfig struct {
	Addr     string
	Port     string
	Name     string
	User     string
	Password string
}

type LogConfig struct {
	LogLevel    string
	LogFile     string
	LogFilePath string
}

// Settings is the main struct that contains the configuration of the application
type Settings struct {
	AllowCrossOrigin  bool
	Logging           LogConfig
	Domain            string
	GraphQLPlayground bool
	HTTPListen        string
	ArangoDB          ArangoDBConfig
}

var Current Settings

// Loads the settings
func Load(settingsFile string) {
	loadSettingsFromFile(settingsFile)
}

func loadSettingsFromFile(settingsFile string) {
	// read the settings file
	jsonData, err := ioutil.ReadFile(settingsFile)
	if os.IsNotExist(err) {
		log.Fatal().Err(err).Msg("error could not find settings file")
	} else if err != nil {
		log.Fatal().Err(err).Msg("error reading settings file")
	}

	// parse the json data into a struct
	var newSettings Settings
	err = json.Unmarshal(jsonData, &newSettings)
	if err != nil {
		log.Fatal().Err(err).Msg("error parsing settings into struct")
	}

	// validate if fields are missing
	if isEmpty(newSettings.Domain) {
		log.Fatal().Err(err).Msg("error: Domain is missing in the settings file")
	}
	if isEmpty(newSettings.HTTPListen) {
		log.Fatal().Err(err).Msg("error: HTTPListen is missing in the settings file")
	}

	if isEmpty(newSettings.ArangoDB.Addr) {
		newSettings.ArangoDB.Addr = "localhost"
	}
	if isEmpty(newSettings.ArangoDB.Port) {
		newSettings.ArangoDB.Port = "8529"
	}
	if isEmpty(newSettings.ArangoDB.Name) {
		newSettings.ArangoDB.Name = "magic-helper"
	}
	if isEmpty(newSettings.ArangoDB.Password) {
		newSettings.ArangoDB.Password = "arangodb"
	}
	if isEmpty(newSettings.ArangoDB.User) {
		newSettings.ArangoDB.User = "root"
	}
	if isEmpty(newSettings.Logging.LogFilePath) {
		newSettings.Logging.LogFilePath = "./logs/"
	}
	if isEmpty(newSettings.Logging.LogLevel) {
		newSettings.Logging.LogLevel = "Info"
	}

	Current = newSettings
}

func isEmpty(text string) bool {
	return len(strings.Trim(text, " ")) == 0
}

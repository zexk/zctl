package config

import (
	"os"
	"strings"

	"github.com/rs/zerolog"
)

type Config struct {
	CoreURL  string
	WsURL    string
	Hostname string
	LogLevel zerolog.Level
}

func Load() Config {
	coreURL := os.Getenv("CORE_URL")
	if coreURL == "" {
		coreURL = "http://localhost:3000"
	}

	wsURL := os.Getenv("WS_URL")
	if wsURL == "" {
		wsURL = strings.NewReplacer("https://", "wss://", "http://", "ws://").Replace(coreURL) + "/ws"
	}

	hostname := os.Getenv("HOSTNAME")
	if hostname == "" {
		hostname, _ = os.Hostname()
	}

	logLevel := zerolog.InfoLevel
	if v := os.Getenv("LOG_LEVEL"); v != "" {
		if l, err := zerolog.ParseLevel(v); err == nil {
			logLevel = l
		}
	}

	return Config{
		CoreURL:  coreURL,
		WsURL:    wsURL,
		Hostname: hostname,
		LogLevel: logLevel,
	}
}

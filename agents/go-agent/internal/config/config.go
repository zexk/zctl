package config

import (
	"os"
	"strings"
)

type Config struct {
	CoreURL  string
	WsURL    string
	Hostname string
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

	return Config{
		CoreURL:  coreURL,
		WsURL:    wsURL,
		Hostname: hostname,
	}
}

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
		wsURL = strings.Replace(coreURL, "http://", "ws://", 1) + "/ws"
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

package config

import (
	"os"
)

type Config struct {
	CoreURL  string
	Hostname string
}

func Load() Config {
	coreURL := os.Getenv("CORE_URL")
	if coreURL == "" {
		coreURL = "http://localhost:3000"
	}

	hostname := os.Getenv("HOSTNAME")
	if hostname == "" {
		hostname, _ = os.Hostname()
	}

	return Config{
		CoreURL:  coreURL,
		Hostname: hostname,
	}
}

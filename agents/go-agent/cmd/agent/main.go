package main

import (
	"context"
	"log"
	"time"

	"github.com/bouraoui/zctl/agent/internal/api"
	"github.com/bouraoui/zctl/agent/internal/config"
	"github.com/bouraoui/zctl/agent/internal/machine"
)

func main() {
	cfg := config.Load()
	client := api.New(cfg.CoreURL)
	info := machine.Collect(cfg.Hostname)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Register(ctx, api.RegisterRequest{
		Hostname: info.Hostname,
		OS:       info.OS,
		Arch:     info.Arch,
	}); err != nil {
		log.Fatalf("registration failed: %v", err)
	}

	log.Printf("registered as %s (%s/%s)", info.Hostname, info.OS, info.Arch)
}

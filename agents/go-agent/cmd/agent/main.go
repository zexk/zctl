package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"

	"github.com/zexk/zctl/agent/internal/agent"
	"github.com/zexk/zctl/agent/internal/api"
	"github.com/zexk/zctl/agent/internal/config"
	"github.com/zexk/zctl/agent/internal/machine"
)

func main() {
	log := zerolog.New(os.Stderr).With().Timestamp().Logger()

	cfg := config.Load()
	client := api.New(cfg.CoreURL)
	info := machine.Collect(cfg.Hostname)

	var token string
	for {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		resp, err := client.Register(ctx, api.RegisterRequest{
			Hostname: info.Hostname,
			OS:       info.OS,
			Arch:     info.Arch,
		})
		cancel()
		if err == nil {
			token = resp.Token
			break
		}
		log.Error().Err(err).Msg("registration failed, retrying in 3s")
		time.Sleep(3 * time.Second)
	}

	log.Info().
		Str("hostname", info.Hostname).
		Str("os", info.OS).
		Str("arch", info.Arch).
		Msg("registered")

	ag := agent.New(cfg.WsURL, info.Hostname, token, log)
	go ag.Run()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Info().Msg("shutting down")
}

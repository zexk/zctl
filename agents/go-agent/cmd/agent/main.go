package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/zexk/zctl/agent/internal/agent"
	"github.com/zexk/zctl/agent/internal/api"
	"github.com/zexk/zctl/agent/internal/config"
	"github.com/zexk/zctl/agent/internal/machine"
)

func main() {
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
		log.Printf("registration failed: %v (retry in 3s)", err)
		time.Sleep(3 * time.Second)
	}

	log.Printf("registered as %s (%s/%s)", info.Hostname, info.OS, info.Arch)

	ag := agent.New(cfg.WsURL, info.Hostname, token)
	go ag.Run()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Println("shutting down")
}

package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/bouraoui/zctl/agent/internal/client"
	"github.com/bouraoui/zctl/agent/internal/heartbeat"
)

func main() {
	serverURL := os.Getenv("CORE_URL")
	if serverURL == "" {
		serverURL = "ws://localhost:3000/ws"
	}

	c, err := client.New(serverURL)
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer c.Close()

	hr := heartbeat.NewReporter(30)
	go hr.Start(c)

	log.Println("agent connected, waiting for commands")

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
}

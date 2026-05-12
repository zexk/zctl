package heartbeat

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"

	"github.com/bouraoui/zctl/agent/internal/client"
)

type Reporter struct {
	interval time.Duration
}

func NewReporter(intervalSec int) *Reporter {
	return &Reporter{interval: time.Duration(intervalSec) * time.Second}
}

func (r *Reporter) Start(c *client.Client) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for range ticker.C {
		msg := map[string]any{
			"type":      "heartbeat",
			"machineId": "dev-agent",
			"timestamp": time.Now().UnixMilli(),
			"payload":   map[string]any{},
		}
		data, _ := json.Marshal(msg)
		if err := c.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("heartbeat error: %v", err)
			return
		}
		log.Println("heartbeat sent")
	}
}

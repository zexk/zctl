package agent

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

type Agent struct {
	wsURL     string
	machineID string
}

func New(wsURL, machineID string) *Agent {
	return &Agent{wsURL: wsURL, machineID: machineID}
}

func (a *Agent) Run() {
	for {
		c, _, err := websocket.DefaultDialer.Dial(a.wsURL+"?machineId="+a.machineID, nil)
		if err != nil {
			log.Printf("ws connect failed: %v (retry in 3s)", err)
			time.Sleep(3 * time.Second)
			continue
		}

		hello := map[string]string{"type": "hello", "machineId": a.machineID}
		data, _ := json.Marshal(hello)
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("hello send failed: %v (reconnecting...)", err)
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		log.Printf("connected to core as %s", a.machineID)

		for {
			if _, _, err := c.ReadMessage(); err != nil {
				log.Printf("disconnected: %v (reconnecting...)", err)
				break
			}
		}
		c.Close()
		time.Sleep(1 * time.Second)
	}
}

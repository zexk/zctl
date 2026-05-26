package agent

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"

	"github.com/zexk/zctl/agent/internal/exec"
)

type Agent struct {
	wsURL     string
	machineID string
	token     string
}

func New(wsURL, machineID, token string) *Agent {
	return &Agent{wsURL: wsURL, machineID: machineID, token: token}
}

func (a *Agent) Run() {
	for {
		c, _, err := websocket.DefaultDialer.Dial(a.wsURL+"?machineId="+a.machineID, nil)
		if err != nil {
			log.Printf("ws connect failed: %v (retry in 3s)", err)
			time.Sleep(3 * time.Second)
			continue
		}

		auth := map[string]string{"type": "auth", "token": a.token}
		data, _ := json.Marshal(auth)
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("auth send failed: %v (reconnecting...)", err)
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		_, resp, err := c.ReadMessage()
		if err != nil {
			log.Printf("auth response failed: %v (reconnecting...)", err)
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		var ack map[string]any
		if err := json.Unmarshal(resp, &ack); err != nil || ack["type"] != "auth_ok" {
			reason, _ := ack["reason"].(string)
			log.Printf("auth rejected: %s (retry in 10s)", reason)
			c.Close()
			time.Sleep(10 * time.Second)
			continue
		}

		log.Printf("authenticated as %s", a.machineID)

		hello := map[string]string{"type": "hello", "machineId": a.machineID}
		data, _ = json.Marshal(hello)
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("hello send failed: %v (reconnecting...)", err)
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		log.Printf("connected to core as %s", a.machineID)

		done := make(chan struct{})
		go func() {
			ticker := time.NewTicker(15 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					msg := map[string]string{"type": "heartbeat", "machineId": a.machineID}
					data, _ := json.Marshal(msg)
					if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
						return
					}
				case <-done:
					return
				}
			}
		}()

		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				log.Printf("disconnected: %v (reconnecting...)", err)
				break
			}

			var msg map[string]any
			if err := json.Unmarshal(message, &msg); err != nil {
				continue
			}

			if msg["type"] == "exec" {
				requestID, _ := msg["requestId"].(string)
				command, _ := msg["command"].(string)

				result := exec.Run(command)

				response := map[string]any{
					"type":      "exec_result",
					"requestId": requestID,
					"stdout":    result.Stdout,
					"stderr":    result.Stderr,
					"exitCode":  result.ExitCode,
				}
				data, _ := json.Marshal(response)
				c.WriteMessage(websocket.TextMessage, data)

				log.Printf("exec result: request=%s exit=%d", requestID, result.ExitCode)
			}
		}
		close(done)
		c.Close()
		time.Sleep(1 * time.Second)
	}
}

package agent

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"

	"github.com/zexk/zctl/agent/internal/exec"
)

const maxExecTimeout = 10 * time.Minute

type Agent struct {
	wsURL     string
	machineID string
	token     string
	log       zerolog.Logger
}

func New(wsURL, machineID, token string, log zerolog.Logger) *Agent {
	return &Agent{
		wsURL:     wsURL,
		machineID: machineID,
		token:     token,
		log:       log.With().Str("machine_id", machineID).Logger(),
	}
}

func (a *Agent) Run() {
	for {
		c, _, err := websocket.DefaultDialer.Dial(a.wsURL+"?machineId="+a.machineID, nil)
		if err != nil {
			a.log.Error().Err(err).Msg("ws connect failed, retrying in 3s")
			time.Sleep(3 * time.Second)
			continue
		}

		auth := map[string]string{"type": "auth", "token": a.token}
		data, _ := json.Marshal(auth)
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			a.log.Error().Err(err).Msg("auth send failed, reconnecting")
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		_, resp, err := c.ReadMessage()
		if err != nil {
			a.log.Error().Err(err).Msg("auth response failed, reconnecting")
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		var ack map[string]any
		if err := json.Unmarshal(resp, &ack); err != nil || ack["type"] != "auth_ok" {
			reason, _ := ack["reason"].(string)
			a.log.Warn().Str("reason", reason).Msg("auth rejected, retrying in 10s")
			c.Close()
			time.Sleep(10 * time.Second)
			continue
		}

		a.log.Info().Msg("authenticated")

		hello := map[string]string{"type": "hello", "machineId": a.machineID}
		data, _ = json.Marshal(hello)
		if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
			a.log.Error().Err(err).Msg("hello send failed, reconnecting")
			c.Close()
			time.Sleep(3 * time.Second)
			continue
		}

		a.log.Info().Msg("connected to core")

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
					a.log.Debug().Msg("heartbeat sent")
				case <-done:
					return
				}
			}
		}()

		for {
			_, message, err := c.ReadMessage()
			if err != nil {
				a.log.Warn().Err(err).Msg("disconnected, reconnecting")
				break
			}

			var msg map[string]any
			if err := json.Unmarshal(message, &msg); err != nil {
				continue
			}

			if msg["type"] == "exec" {
				requestID, _ := msg["requestId"].(string)
				command, _ := msg["command"].(string)

				a.log.Debug().Str("request_id", requestID).Str("command", command).Msg("exec start")
				start := time.Now()
				ctx, cancel := context.WithTimeout(context.Background(), maxExecTimeout)
				result := exec.Run(ctx, command)
				cancel()

				response := map[string]any{
					"type":      "exec_result",
					"requestId": requestID,
					"stdout":    result.Stdout,
					"stderr":    result.Stderr,
					"exitCode":  result.ExitCode,
				}
				data, _ := json.Marshal(response)
				c.WriteMessage(websocket.TextMessage, data)

				a.log.Info().
					Str("request_id", requestID).
					Str("command", command).
					Int("exit_code", result.ExitCode).
					Dur("duration_ms", time.Since(start)).
					Msg("exec done")
			}
		}
		close(done)
		c.Close()
		time.Sleep(1 * time.Second)
	}
}

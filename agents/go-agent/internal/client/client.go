package client

import (
	"log"
	"net/url"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn *websocket.Conn
}

func New(serverURL string) (*Client, error) {
	u, err := url.Parse(serverURL)
	if err != nil {
		return nil, err
	}

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return nil, err
	}

	log.Printf("connected to %s", serverURL)
	return &Client{Conn: conn}, nil
}

func (c *Client) Close() error {
	return c.Conn.Close()
}

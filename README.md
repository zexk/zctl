# zctl

Lightweight self-hosted remote machine orchestration. Single backend, Go agents, JSON message protocol over persistent WebSocket connection.

![demo](./assets/demo.gif)

## Quick start

```bash
git clone https://github.com/zexk/zctl
cd zctl
docker compose up --build -d
```

```bash
# Register an agent (public endpoint, returns a JWT token)
curl -s -X POST http://localhost:3000/machines/register \
  -H "Content-Type: application/json" \
  -d '{"hostname":"my-agent","os":"linux","arch":"x86_64"}'
```

```json
{ "id": "uuid", "hostname": "my-agent", "token": "eyJ..." }
```

```bash
# Generate an operator token (replace the secret with your JWT_SECRET)
OP_TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({sub:'admin',role:'operator'},'dev-secret-change-in-production',{expiresIn:'90d'}))")

# List machines
curl -H "Authorization: Bearer $OP_TOKEN" http://localhost:3000/machines
```

```json
[{ "hostname": "docker-agent", "status": "online" }]
```

```bash
# Execute a command on a machine
curl -X POST http://localhost:3000/machines/docker-agent/exec \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OP_TOKEN" \
  -d '{"command":"uptime"}'
```

```json
{ "stdout": "up 1 hour", "stderr": "", "exitCode": 0 }
```

## Capabilities

- Persistent machine registration and WebSocket connectivity
- JWT-based authentication with operator/agent role separation
- Remote command execution (`sh -c`) with execution persistence
- Heartbeat-based online/offline state tracking
- Per-machine execution history

## Architecture

```
CLI --> Core API/WS Server <-- Agents (Go)
                      |
                  PostgreSQL
```

| Component | Stack | Role |
|---|---|---|
| Core | TypeScript, Fastify, Drizzle, PostgreSQL | HTTP API, WebSocket gateway, connection registry, JWT auth |
| Agent | Go, gorilla/websocket | Persistent WS connection, command execution, heartbeats |
| CLI | TypeScript, Commander.js (planned) | Operator-facing CLI |

## Development

```bash
nix develop              # enter devshell (Nix flake)
pnpm install             # install JS dependencies
docker compose up -d     # start PostgreSQL
pnpm --filter @zctl/core db:migrate
pnpm --filter @zctl/core dev
```

Verification:

```bash
pnpm typecheck
cd agents/go-agent && go build ./...
```

## Repository structure

```text
apps/
└── core/              Backend API and WebSocket server

agents/
└── go-agent/          Go agent binary

packages/
├── protocol/          Shared protocol definitions
├── config/            Shared configuration utilities
└── shared/            Shared TypeScript utilities
```

## Status

Core and agent are functional. JWT-based authentication is wired in. CLI and streaming execution are planned.

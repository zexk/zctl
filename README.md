# zctl

Lightweight self-hosted remote machine orchestration. Single backend, Go agents, JSON message protocol over persistent WebSocket connection.

![demo](./assets/demo.gif)

## Quick start

```bash
git clone https://github.com/zexk/zctl
cd zctl
docker compose up --build -d
```

The stack registers a `docker-agent` automatically. Build the CLI and connect:

```bash
pnpm --filter @zctl/cli build

# Generate an operator token
OP_TOKEN=$(node --input-type=commonjs <<'EOF'
const { createHmac } = require('node:crypto');
const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production-1';
const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const n = Math.floor(Date.now()/1000);
const p = Buffer.from(JSON.stringify({sub:'admin',role:'operator',iat:n,exp:n+86400})).toString('base64url');
const s = createHmac('sha256',secret).update(h+'.'+p).digest('base64url');
process.stdout.write(h+'.'+p+'.'+s);
EOF
)

zctl login --url http://localhost:3000 --token $OP_TOKEN
```

```bash
zctl machines
# HOSTNAME                 STATUS    OS         ARCH       LAST SEEN
# ──────────────────────────────────────────────────────────────────────
# docker-agent             online    linux      aarch64    3s ago

zctl exec docker-agent uptime
# 10:42:01 up 2 min, 0 users, load average: 0.00, 0.00, 0.00

zctl logs docker-agent
# COMMAND                          STATUS     EXIT   CREATED
# ────────────────────────────────────────────────────────────────────────
# uptime                           completed  0      5/26/2025, 10:42:01 AM
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
| CLI | TypeScript, Commander.js | Operator-facing CLI |

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
├── core/              Backend API and WebSocket server
└── cli/               Operator-facing CLI

agents/
└── go-agent/          Go agent binary

packages/
├── protocol/          Shared protocol definitions
├── config/            Shared configuration utilities
└── shared/            Shared TypeScript utilities
```

## Status

Core, agent, and CLI are functional. JWT-based authentication is wired in. Streaming execution is planned.

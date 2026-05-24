# DESIGN.md

## Overview

zctl is a lightweight self-hosted remote machine orchestration platform. It provides persistent connectivity to remote machines, remote command execution, heartbeat monitoring, and execution history — without the complexity of Kubernetes or Ansible.

The system intentionally favors simplicity over scale: a single backend, JSON-over-WebSocket protocol, in-memory connection state, and synchronous command execution.

---

## Architecture

```txt
CLI (planned) → Core API/WebSocket Server ← Agents (Go)
                      ↕
                PostgreSQL
```

### Components

| Component | Language | Role |
|---|---|---|
| **Core** | TypeScript / Node.js | HTTP API, WebSocket gateway, connection registry, execution orchestration |
| **Agent** | Go | Persistent WebSocket connection, command execution (`sh -c`), heartbeat reporting |
| **CLI** | TypeScript (planned) | Operator-facing CLI |

Agents connect to the core via WebSocket and register via HTTP. The core exposes a REST API for machine management and command execution. All realtime communication flows over a single WebSocket connection per agent.

---

## Component Breakdown

### Core (`apps/core`)

**Stack:** Fastify, Drizzle ORM, PostgreSQL, `@fastify/websocket`, Zod, Pino

**Module structure:**

```
src/
├── config/env.ts           — validated env loading (dotenv + Zod)
├── db/
│   ├── client.ts           — Drizzle + postgres connection
│   └── schema/
│       ├── machines.ts     — machines table
│       └── executions.ts   — command_executions table
├── modules/
│   ├── agents/
│   │   ├── gateway.ts      — WebSocket message router
│   │   ├── registry.ts     — in-memory Map<hostname, WebSocket>
│   │   └── types.ts
│   ├── machines/
│   │   ├── repository.ts   — DB access for machines
│   │   ├── service.ts      — business logic + status computation
│   │   └── routes.ts       — GET /machines, POST /machines/register
│   ├── exec/
│   │   ├── service.ts      — orchestrates command execution
│   │   ├── pending.ts      — async pending request tracker
│   │   ├── routes.ts       — POST /machines/:id/exec
│   │   └── types.ts
│   └── executions/
│       ├── repository.ts   — DB access for command_executions
│       ├── service.ts      — execution lifecycle
│       └── routes.ts       — GET /machines/:id/executions
├── routes/health.ts
├── ws/handler.ts
├── app.ts                  — Fastify factory (no listening)
├── server.ts               — startup, DB verify, shutdown hooks
└── index.ts                — entry: import { startServer }; await startServer()
```

Key design decisions:

- **app.ts** is a pure factory. It creates and configures Fastify but never calls `listen()`. This makes testing and lifecycle management clean.
- **server.ts** owns startup ordering: validate env → connect DB → build app → register shutdown hooks → listen. It also holds `pendingExecs.rejectAll()` and `agentRegistry.closeAll()` during shutdown.
- **`@fastify/websocket`** provides the WebSocket plugin. Routes using WebSocket are registered inside `app.register()` scopes.

### Agent (`agents/go-agent`)

**Stack:** Go 1.26, gorilla/websocket, standard library

```
cmd/agent/main.go           — entry: register HTTP → connect WS → block on signal
internal/
├── agent/agent.go          — WS connect loop, read loop, heartbeat ticker
├── api/client.go           — HTTP client for /machines/register
├── config/config.go        — env loading (CORE_URL, HOSTNAME)
├── exec/exec.go            — exec.Command("sh", "-c", ...) runner
└── machine/info.go         — collects hostname, GOOS, GOARCH
```

The agent is a standard-library-only binary (except gorilla/websocket). It has no external configuration file — all config comes from environment variables. The agent runs until signaled, reconnecting automatically if the WebSocket drops.

### Protocol

All WebSocket messages are JSON. The protocol uses a `type` discriminator.

```typescript
// Agent → Core immediately after WS connect (required before any other message)
{ "type": "auth", "token": "<agent-jwt>" }

// Core → Agent on successful authentication
{ "type": "auth_ok" }

// Core → Agent on failed authentication (socket is then closed with code 4001)
{ "type": "auth_error", "reason": "invalid token" }

// Agent → Core after auth_ok
{ "type": "hello", "machineId": "hostname" }

// Agent → Core every 15s
{ "type": "heartbeat", "machineId": "hostname" }

// Core → Agent for command execution
{ "type": "exec", "requestId": "uuid", "command": "uptime" }

// Agent → Core with execution result
{ "type": "exec_result", "requestId": "uuid", "stdout": "...", "stderr": "...", "exitCode": 0 }
```

Connection is established at `ws://core:3000/ws?machineId=hostname`. The agent must authenticate within a short window after connecting by sending an `auth` message carrying the JWT obtained during HTTP registration. Operator tokens are rejected for WebSocket connections. After `auth_ok`, the agent sends `hello` to join the in-memory registry.

---

## Machine Lifecycle

```
HTTP register ──→ DB insert/update (machines table), returns agent JWT
       │
       ▼
WS connect  ──→ ?machineId= query param
       │
       ▼
auth msg    ──→ sends {"type":"auth","token":"<jwt>"}
       │
       ▼
auth_ok     ──→ server validates JWT (role=agent, hostname=param)
       │
       ▼
hello msg   ──→ in-memory registry adds Map<hostname, socket>
       │
       ▼
heartbeat   ──→ updates machines.last_seen every 15s
       │
       ▼
disconnect  ──→ registry removes entry
       │
       ▼
offline     ──→ status derived: last_seen > 30s → offline
```

**Status is derived, not stored.** The `GET /machines` endpoint computes `status` per-request by checking if `lastSeen` is within 30 seconds. This avoids stale state bugs and keeps the persistence model simple.

---

## Command Execution Flow

```
POST /machines/:hostname/exec
  │  { "command": "uptime" }
  ▼
exec/service.ts
  │  resolve hostname → UUID via machines repository
  │  check agent is connected (in-memory registry)
  │  create command_executions row (status: pending)
  │  generate requestId
  │  send { type:"exec", requestId, command } via WebSocket
  │  register pending promise: pendingExecs.add(requestId, timeout=10s)
  ▼
pending.ts (in-memory Map)
  │  Map<string, { resolve, reject, timer }>
  │  timer will reject after 10s if no response
  ▼
Agent receives message
  │  parse → msg.type === "exec"
  │  exec.Command("sh", "-c", command)
  │  collect stdout, stderr, exit code
  │  send { type:"exec_result", requestId, stdout, stderr, exitCode }
  ▼
Core gateway.ts receives exec_result
  │  pendingExecs.resolve(requestId, result)
  │  clears timer, deletes Map entry, resolves promise
  ▼
exec/service.ts
  │  executions service updates row (status: completed)
  │  returns result to HTTP caller
  ▼
HTTP 200 { stdout, stderr, exitCode }
```

### Error paths

| Scenario | Behavior |
|---|---|
| Machine not registered | 404 machine not found |
| Machine not connected | 502 machine not connected |
| Agent crashes mid-exec | 10s timeout → row marked `timeout` |
| Core restarts mid-exec | `pendingExecs.rejectAll()` in shutdown hook |

This is the most architecturally interesting piece: the **pending request tracker** (`modules/exec/pending.ts`) implements async distributed coordination with zero external dependencies — just a `Map<string, { resolve, reject, timer }>`.

---

## Persistence Model

### Machines

```sql
CREATE TABLE machines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname   TEXT NOT NULL UNIQUE,
  os         TEXT,
  arch       TEXT,
  last_seen  TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Command Executions

```sql
CREATE TABLE command_executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id   UUID NOT NULL REFERENCES machines(id),
  command      TEXT NOT NULL,
  stdout       TEXT,
  stderr       TEXT,
  exit_code    INTEGER,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP
);
```

Status values: `pending` → `completed` | `timeout`

---

## Design Constraints

Explicit scope boundaries:

- **Not Kubernetes.** No pod management, no scheduling, no container orchestration. This is a tool for managing bare-metal or VPS machines.
- **Not Ansible.** No idempotency, no playbooks, no DSL. Commands are single-shot `sh -c` executions.
- **Single-core.** One core process. Horizontal scaling is not a goal.
- **In-memory registry.** Connected agents live in a `Map<string, WebSocket>`, not a database. Restarting core loses all connection state (agents reconnect automatically).
- **JSON protocol.** Binary serialization is explicitly deferred until there's evidence it's needed.
- **JWT authentication.** Agents authenticate with a signed JWT obtained at HTTP registration. Operator access requires a separate Bearer token with the `operator` role. Both are verified by the core on every request.
- **No streaming.** Command output is collected and returned as a single block. Interactive terminal sessions and real-time log streaming are future work.
- **Minimal dependencies.** The Go agent depends only on `gorilla/websocket`. The core uses Fastify + Drizzle + Zod + Pino, which is lean for a Node.js backend.

---

## Development Environment

### Quick Start

```bash
nix develop              # enter devshell (flake)
pnpm install             # install JS dependencies
docker compose up -d     # start PostgreSQL
pnpm db:migrate          # apply schema
pnpm --filter @zctl/core dev  # start core on :3000
```

### Toolchain

| Tool | Version | Notes |
|---|---|---|
| Go | 1.26 | agent |
| Node.js | 25 | core + CLI |
| pnpm | 10 | package manager |
| PostgreSQL | 17 | database |
| golangci-lint | 2.x | Go linting |
| prettier | 3.x | code formatting |
| eslint | 10.x | JS linting |
| gcc | 15.x | CGo support for Go agent |

### Verification

```bash
pnpm typecheck                              # all TypeScript
cd agents/go-agent && go build ./...        # Go agent
nix flake check                             # full flake validation
```

---

## Future Work

In rough priority order:

- **CLI** — build the Commander.js CLI with `machines`, `exec`, `logs` commands
- **Streaming execution** — real-time stdout/stderr delivery via WebSocket
- **TLS** — terminate HTTPS/WSS at the core or via reverse proxy
- **RBAC** — multi-user access control
- **Agent deployment** — package agent binaries, install scripts, systemd units
- **Structured logging** — move beyond `log.Printf` in the Go agent

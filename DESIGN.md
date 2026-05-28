# DESIGN.md

## Overview

zctl runs commands on remote machines over a persistent WebSocket. The scope is intentionally narrow: one backend, Go agents, no orchestration layer. It's closer to a thin SSH replacement for scripted use cases than to Ansible or Kubernetes.

---

## Architecture

```txt
CLI -> Core API/WebSocket Server <- Agents (Go)
                 |
             PostgreSQL
```

### Components

| Component | Language             | Role                                                                      |
| --------- | -------------------- | ------------------------------------------------------------------------- |
| **Core**  | TypeScript / Node.js | HTTP API, WebSocket gateway, connection registry, execution orchestration |
| **Agent** | Go                   | Outbound WS connection, command execution (`sh -c`), heartbeat reporting  |
| **CLI**   | TypeScript           | Operator CLI (`login`, `machines`, `exec`, `logs`)                        |

Agents connect to the core via WebSocket and register via HTTP. All realtime communication flows over a single WebSocket connection per agent.

---

## Component Breakdown

### Core (`apps/core`)

**Stack:** Fastify, Drizzle ORM, PostgreSQL, `@fastify/websocket`, Zod, Pino

**Module structure:**

```
src/
├── config/env.ts           # env loading (dotenv + Zod)
├── db/
│   ├── client.ts           # Drizzle + postgres connection
│   └── schema/
│       ├── machines.ts     # machines table
│       └── executions.ts   # command_executions table
├── modules/
│   ├── agents/
│   │   ├── gateway.ts      # WebSocket message router
│   │   ├── registry.ts     # in-memory Map<hostname, WebSocket>
│   │   └── types.ts
│   ├── machines/
│   │   ├── repository.ts   # DB access for machines
│   │   ├── service.ts      # business logic + status computation
│   │   └── routes.ts       # GET /machines, POST /machines/register
│   ├── exec/
│   │   ├── service.ts      # command dispatch
│   │   ├── pending.ts      # async request tracker
│   │   ├── routes.ts       # POST /machines/:id/exec
│   │   └── types.ts
│   └── executions/
│       ├── repository.ts   # DB access for command_executions
│       ├── service.ts      # execution lifecycle
│       └── routes.ts       # GET /machines/:id/executions
├── routes/health.ts
├── ws/handler.ts
├── app.ts                  # Fastify factory (no listen() call)
├── server.ts               # startup ordering, shutdown hooks
└── index.ts
```

Notes:

- `app.ts` is a pure factory - no `listen()`. Keeps test setup and shutdown hooks independent of the server lifecycle.
- `server.ts` owns startup: validate env -> connect DB -> build app -> register shutdown hooks -> listen. Calls `pendingExecs.rejectAll()` and `agentRegistry.closeAll()` on shutdown.
- `routes/health.ts` returns 200 when the DB is reachable, 503 otherwise — used by the Docker healthcheck and `depends_on: service_healthy`.
- WebSocket routes are registered inside `app.register()` scopes via `@fastify/websocket`.

### Agent (`agents/go-agent`)

**Stack:** Go 1.26, gorilla/websocket, standard library

```
cmd/agent/main.go           # entry: register HTTP -> connect WS -> block on signal
internal/
├── agent/agent.go          # WS connect loop, read loop, heartbeat ticker
├── api/client.go           # HTTP client for /machines/register
├── config/config.go        # env loading (CORE_URL, HOSTNAME)
├── exec/exec.go            # exec.Command("sh", "-c", ...) runner
└── machine/info.go         # collects hostname, GOOS, GOARCH
```

One external dependency (gorilla/websocket). Config comes entirely from env vars. Reconnects automatically on drop.

### Protocol

All WebSocket messages are JSON with a `type` discriminator.

```typescript
// Agent -> Core on connect (required before anything else)
{ "type": "auth", "token": "<agent-jwt>" }

// Core -> Agent: success
{ "type": "auth_ok" }

// Core -> Agent: failure (socket closed with 4001 after this)
{ "type": "auth_error", "reason": "invalid token" }

// Agent -> Core after auth_ok
{ "type": "hello", "machineId": "hostname" }

// Agent -> Core every 15s
{ "type": "heartbeat", "machineId": "hostname" }

// Core -> Agent: run a command
{ "type": "exec", "requestId": "uuid", "command": "uptime" }

// Agent -> Core: result
{ "type": "exec_result", "requestId": "uuid", "stdout": "...", "stderr": "...", "exitCode": 0 }
```

Connection endpoint: `ws://core:3000/ws?machineId=hostname`. The agent must authenticate immediately after connecting. Operator tokens are rejected at the WS layer.

---

## Machine Lifecycle

```
HTTP register -> DB insert/update (machines table), returns agent JWT
      |
      v
WS connect  -> ?machineId= query param
      |
      v
auth msg    -> sends {"type":"auth","token":"<jwt>"}
      |
      v
auth_ok     -> server validates JWT (role=agent, hostname=param)
      |
      v
hello msg   -> in-memory registry adds Map<hostname, socket>
      |
      v
heartbeat   -> updates machines.last_seen every 15s
      |
      v
disconnect  -> registry removes entry
      |
      v
offline     -> status derived: last_seen > 30s -> offline
```

**Status is derived, not stored.** `GET /machines` checks if `lastSeen` is within 30s at query time - no background jobs, no stale writes.

---

## Command Execution Flow

```
POST /machines/:hostname/exec
  |  { "command": "uptime" }
  v
exec/service.ts
  |  resolve hostname -> UUID via machines repository
  |  check agent is in registry (connected)
  |  create command_executions row (status: pending)
  |  generate requestId
  |  send { type:"exec", requestId, command } over WebSocket
  |  register pending promise: pendingExecs.add(requestId, timeout=10s)
  v
pending.ts (in-memory Map)
  |  Map<string, { resolve, reject, timer }>
  |  timer rejects after 10s if no response
  v
Agent receives message
  |  exec.Command("sh", "-c", command)
  |  collect stdout, stderr, exit code
  |  send { type:"exec_result", requestId, stdout, stderr, exitCode }
  v
Core gateway.ts receives exec_result
  |  pendingExecs.resolve(requestId, result)
  |  clears timer, resolves promise
  v
exec/service.ts
  |  update execution row (status: completed)
  |  return result
  v
HTTP 200 { stdout, stderr, exitCode }
```

`pending.ts` is the interesting bit: it bridges an HTTP request to an async WebSocket response using a plain `Map<string, { resolve, reject, timer }>`. No external coordination, no message queue.

### Error paths

| Scenario               | Behavior                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| Machine not registered | 404                                                                |
| Machine not connected  | 502                                                                |
| Agent disconnects mid-exec | immediate rejection via `rejectForMachine()`, row marked `timeout` |
| No response within 10s | timer rejects promise, row marked `timeout`                        |
| Core restarts mid-exec | `pendingExecs.rejectAll()` in shutdown hook                        |

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

Status values: `pending` -> `completed` | `timeout`

---

## Scope

- **Not Kubernetes.** No scheduling, no container management. Bare-metal and VPS only.
- **Not Ansible.** No playbooks, no idempotency. Commands are fire-and-forget `sh -c` calls.
- **Single-core.** One process. Horizontal scaling isn't a goal.
- **In-memory registry.** Connected agents live in a `Map<string, WebSocket>`. Core restart loses connection state (agents reconnect).
- **JSON protocol.** Binary serialization isn't needed yet.
- **Synchronous execution.** Output is collected and returned as a block. Streaming is future work.
- **JWT auth.** Agents authenticate with a signed JWT from registration. Operator access uses a separate token with `role: operator`.

---

## Development

```bash
nix develop              # enter devshell (flake)
pnpm install
docker compose up -d
pnpm db:migrate
pnpm --filter @zctl/core dev
```

### Toolchain

| Tool          | Version | Notes           |
| ------------- | ------- | --------------- |
| Go            | 1.26    | agent           |
| Node.js       | 25      | core + CLI      |
| pnpm          | 9       | package manager |
| PostgreSQL    | 17      | database        |
| golangci-lint | 2.x     | Go linting      |
| prettier      | 3.x     | formatting      |
| eslint        | 10.x    | JS linting      |

### Verification

```bash
pnpm typecheck
pnpm test
cd agents/go-agent && go build ./...
```

---

## Packaging

The flake exposes three outputs consumed by NixOS:

| Output                         | Description                              |
| ------------------------------ | ---------------------------------------- |
| `packages.<system>.zctl-agent` | Go binary via `buildGoModule`            |
| `packages.<system>.zctl-core`  | TypeScript server, esbuild-bundled (ESM) |
| `packages.<system>.zctl-cli`   | Operator CLI, esbuild-bundled (CJS)      |
| `nixosModules.zctl`            | Single NixOS module covering all three   |
| `overlays.default`             | Injects the three packages into `pkgs`   |

### Build strategy for TypeScript components

The workspace uses pnpm 9. Dependencies are fetched offline via `fetchPnpmDeps` + `pnpmConfigHook`. The workspace packages (`@zctl/config`, `@zctl/shared`, `@zctl/protocol`) are compiled first with tsc so their `dist/` is present before bundling.

esbuild then bundles each entrypoint into a single file with no `node_modules` at runtime. The CLI targets CJS because `commander` (v14) uses dynamic `require()` for Node builtins, which breaks under esbuild's ESM output. The core targets ESM because it uses top-level `await`, which CJS cannot represent.

### Migrations

`apps/core/src/migrate.ts` runs migrations programmatically via `drizzle-orm/postgres-js/migrator` — no `drizzle-kit` at runtime. It is bundled into `zctl-core-migrate` and wired as `ExecStartPre` in the systemd unit so migrations run on every deployment before the server starts.

The migrations folder path is injected at package build time via `makeWrapper --set MIGRATIONS_FOLDER` pointing into the Nix store.

### NixOS module

One module covers the full stack:

- `services.zctl.core` — systemd unit for the control plane; `ExecStartPre` runs migrations; secrets via `environmentFile`
- `services.zctl.agents.<name>` — attrset; each entry becomes a `zctl-agent-<name>` unit; supports multiple control-plane registrations from one host
- `programs.zctl` — adds the CLI to `environment.systemPackages`

#### Database provisioning

`database.createLocally = true` (default) wires up PostgreSQL automatically:

1. Enables `services.postgresql` and creates the database and role via `ensureDatabases` / `ensureUsers`.
2. Sets `DATABASE_URL` to a Unix socket URL (`postgres://<user>@/<db>?host=/run/postgresql`). The service user and PostgreSQL role share the same name, so peer authentication applies — no password is stored or needed.
3. Adds `requires = ["postgresql.service"]` to enforce startup ordering.

Set `database.createLocally = false` and provide `database.url` to use an external database. An assertion fails at evaluation time if the URL is missing.

---

## Future Work

- **Streaming execution** - real-time stdout/stderr over WebSocket
- **TLS** - HTTPS/WSS termination at core or via reverse proxy
- **RBAC** - multi-user access control
- **Structured logging** - replace `log.Printf` in the Go agent

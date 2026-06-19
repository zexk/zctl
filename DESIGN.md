# zctl design

zctl runs commands on remote machines over a persistent WebSocket. One backend, Go agents, no orchestration layer. Closer to a thin SSH replacement for scripted use cases than to Ansible or Kubernetes.

## Architecture

```txt
CLI -> Core API/WebSocket Server <- Agents (Go)
                 |
             PostgreSQL
```

| Component | Language             | Role                                                                      |
| --------- | -------------------- | ------------------------------------------------------------------------- |
| **Core**  | TypeScript / Node.js | HTTP API, WebSocket gateway, connection registry, execution orchestration |
| **Agent** | Go                   | Outbound WS connection, command execution (`sh -c`), heartbeat reporting  |
| **CLI**   | TypeScript           | Operator CLI (`login`, `machines`, `exec`, `logs`)                        |

## Core (`apps/core`)

**Stack:** Fastify, Drizzle ORM, PostgreSQL, `@fastify/websocket`, Zod, Pino

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
├── routes/health.ts        # 200 when DB reachable, 503 otherwise
├── routes/dashboard.ts     # static operator dashboard shell
├── ws/handler.ts
├── app.ts                  # Fastify factory (no listen())
├── server.ts               # startup ordering, shutdown hooks
└── index.ts
```

`app.ts` is a pure factory. `server.ts` owns startup: validate env -> connect DB -> build app -> listen. On shutdown it calls `pendingExecs.rejectAll()` and `agentRegistry.closeAll()`. WebSocket routes are registered inside `app.register()` scopes.

## Agent (`agents/go-agent`)

**Stack:** Go 1.26, gorilla/websocket, zerolog

```
cmd/agent/main.go           # entry: register HTTP -> connect WS -> block on signal
internal/
├── agent/agent.go          # WS connect loop, read loop, heartbeat ticker
├── api/client.go           # HTTP client for /machines/register
├── config/config.go        # env loading (CORE_URL, HOSTNAME, LOG_LEVEL)
├── exec/exec.go            # exec.Command("sh", "-c", ...) runner
└── machine/info.go         # collects hostname, GOOS, GOARCH
```

Config from env vars. Reconnects automatically on drop. `LOG_LEVEL` controls zerolog verbosity (trace/debug/info/warn/error, default info); debug enables per-heartbeat and exec-start events.

## Protocol

All WebSocket messages are JSON with a `type` discriminator.

```typescript
{ "type": "auth", "token": "<agent-jwt>" }       // Agent -> Core, first message
{ "type": "auth_ok" }                             // Core -> Agent
{ "type": "auth_error", "reason": "..." }         // Core -> Agent (then socket closed 4001)
{ "type": "hello", "machineId": "hostname" }      // Agent -> Core after auth_ok
{ "type": "heartbeat", "machineId": "hostname" }  // Agent -> Core every 15s
{ "type": "exec", "requestId": "uuid", "command": "uptime" }                          // Core -> Agent
{ "type": "exec_result", "requestId": "uuid", "stdout": "...", "stderr": "...", "exitCode": 0 } // Agent -> Core
```

Endpoint: `ws://core:3000/ws?machineId=hostname`. Operator tokens are rejected at the WS layer.

## HTTP Surfaces

| Route                                | Auth     | Purpose                                      |
| ------------------------------------ | -------- | -------------------------------------------- |
| `GET /health`                        | Public   | Database-backed health check                 |
| `GET /dashboard`                     | Public   | Static browser dashboard shell               |
| `GET /machines`                      | Operator | List registered machines and computed status |
| `POST /machines/register`            | Public   | Register or refresh an agent                 |
| `POST /machines/:hostname/exec`      | Operator | Run a command on a connected machine         |
| `GET /machines/:hostname/executions` | Operator | List command execution history               |

The dashboard is intentionally thin: it stores the operator token in browser `localStorage`, calls the same protected JSON endpoints as the CLI, and does not introduce separate server-side session state. Its theme defaults to `prefers-color-scheme` on first load and persists manual light/dark selection in `localStorage`.

## Machine Lifecycle

```
HTTP register -> DB upsert, returns agent JWT
WS connect   -> auth msg -> auth_ok -> hello -> registry.set(hostname, socket)
heartbeat    -> updates machines.last_seen every 15s
disconnect   -> registry.delete(hostname)
```

Status is derived at query time: `lastSeen > 30s` -> offline. No background jobs, no stale writes.

## Command Execution Flow

```
POST /machines/:hostname/exec { "command": "uptime" }
  -> resolve hostname to UUID
  -> check agent in registry
  -> insert command_executions row (status: pending)
  -> send { type:"exec", requestId, command } over WebSocket
  -> pendingExecs.add(requestId, timeout=10s)   // Map<string, { resolve, reject, timer }>

Agent: sh -c <command> -> { type:"exec_result", requestId, stdout, stderr, exitCode }

Core: pendingExecs.resolve(requestId, result)
   -> update row (status: completed)
   -> HTTP 200 { stdout, stderr, exitCode }
```

### Error paths

| Scenario                   | Behavior                                                           |
| -------------------------- | ------------------------------------------------------------------ |
| Machine not registered     | 404                                                                |
| Machine not connected      | 502                                                                |
| Agent disconnects mid-exec | immediate rejection via `rejectForMachine()`, row marked `timeout` |
| No response within 10s     | timer rejects promise, row marked `timeout`                        |
| Core restarts mid-exec     | `pendingExecs.rejectAll()` in shutdown hook                        |

## Persistence

```sql
CREATE TABLE machines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname   TEXT NOT NULL UNIQUE,
  os         TEXT,
  arch       TEXT,
  last_seen  TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE command_executions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id   UUID NOT NULL REFERENCES machines(id),
  command      TEXT NOT NULL,
  stdout       TEXT,
  stderr       TEXT,
  exit_code    INTEGER,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | timeout
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP
);
```

## Scope

- No scheduling, no container management. Bare-metal and VPS only.
- No playbooks, no idempotency. Commands are fire-and-forget `sh -c` calls.
- Single process. Horizontal scaling is not a goal.
- In-memory agent registry. Core restart loses connection state (agents reconnect).
- Synchronous execution. Output is collected as a block; streaming is future work.
- JWT auth. Agents use a signed JWT from registration; operators use a separate `role: operator` token.

## Development

```bash
nix develop
pnpm install
docker compose up -d
pnpm db:migrate
pnpm --filter @zctl/core dev
```

```bash
pnpm typecheck && pnpm test
cd agents/go-agent && go build ./...
```

| Tool          | Version | Notes           |
| ------------- | ------- | --------------- |
| Go            | 1.26    | agent           |
| Node.js       | 25      | core + CLI      |
| pnpm          | 9       | package manager |
| PostgreSQL    | 17      | database        |
| golangci-lint | 2.x     | Go linting      |
| prettier      | 3.x     | formatting      |
| eslint        | 10.x    | JS linting      |

## Packaging

| Output                         | Description                              |
| ------------------------------ | ---------------------------------------- |
| `packages.<system>.zctl-agent` | Go binary via `buildGoModule`            |
| `packages.<system>.zctl-core`  | TypeScript server, esbuild-bundled (ESM) |
| `packages.<system>.zctl-cli`   | Operator CLI, esbuild-bundled (CJS)      |
| `nixosModules.zctl`            | Single NixOS module covering all three   |
| `overlays.default`             | Injects the three packages into `pkgs`   |

Dependencies are fetched offline via `fetchPnpmDeps` + `pnpmConfigHook`. Workspace packages (`@zctl/config`, `@zctl/shared`, `@zctl/protocol`) are compiled with tsc before bundling so their `dist/` is present. The CLI targets CJS (commander v14 uses dynamic `require()`); core targets ESM (top-level `await`).

Migrations run via `drizzle-orm/postgres-js/migrator` at startup, bundled as `zctl-core-migrate` and wired as `ExecStartPre`. The migrations folder is injected via `makeWrapper --set MIGRATIONS_FOLDER`.

### NixOS module

- `services.zctl.core` -- systemd unit; `ExecStartPre` runs migrations; secrets via `environmentFile`
- `services.zctl.agents.<name>` -- each key becomes a `zctl-agent-<name>` unit
- `programs.zctl` -- adds CLI to `environment.systemPackages`

`database.createLocally = true` (default): provisions PostgreSQL locally, sets `DATABASE_URL` to a Unix socket URL, uses peer auth. Set to `false` and provide `database.url` for an external database.

## Future Work

- Streaming execution (real-time stdout/stderr over WebSocket)
- RBAC (multi-user access control)

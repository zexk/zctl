# zctl

Run commands on remote machines over WebSocket. Agents connect out to a central backend; the CLI dispatches from the other end. No inbound firewall rules, no key distribution.

![demo](./assets/demo.gif)

## Quick start

```bash
git clone https://github.com/zexk/zctl
cd zctl
docker compose up --build -d
```

A `docker-agent` registers automatically once the stack is up. Build the CLI:

```bash
pnpm --filter @zctl/cli build
OP_TOKEN=$(node scripts/gen-token.js)
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

## Features

- Machine registration with persistent WebSocket connectivity
- JWT auth: separate operator and agent roles
- Remote command execution via `sh -c`, output stored per execution
- Online/offline status derived from heartbeat timestamps
- Execution history per machine

## Architecture

```
CLI --> Core API/WS Server <-- Agents (Go)
                |
            PostgreSQL
```

| Component | Stack                                    | Role                                                  |
| --------- | ---------------------------------------- | ----------------------------------------------------- |
| Core      | TypeScript, Fastify, Drizzle, PostgreSQL | HTTP API, WebSocket gateway, JWT auth                 |
| Agent     | Go, gorilla/websocket                    | Outbound WS connection, command execution, heartbeats |
| CLI       | TypeScript, Commander.js                 | Operator CLI                                          |

## NixOS installation

Add the flake input and import the module:

```nix
inputs.zctl.url = "github:zexk/zctl";
```

```nix
imports = [ inputs.zctl.nixosModules.zctl ];
```

**Control plane** (one host, needs PostgreSQL):

```nix
services.zctl.core = {
  enable = true;
  environmentFile = "/run/secrets/zctl-env"; # must contain JWT_SECRET=<32+ chars>
  database.url = "postgres://zctl:password@localhost:5432/zctl";
  openFirewall = true;
};
```

**Agents** (any managed host):

```nix
services.zctl.agents.default = {
  enable = true;
  coreUrl = "https://zctl.example.com";
};
```

Multiple agents per host (e.g. reaching different control planes) are supported via additional attrset keys — each becomes a separate systemd unit (`zctl-agent-<name>`).

**CLI** (operator machines):

```nix
programs.zctl.enable = true;
```

Then authenticate:

```bash
zctl login --url https://zctl.example.com --token <operator-jwt>
```

The flake also exposes `packages.<system>.{zctl-agent,zctl-core,zctl-cli}` and `overlays.default` for use outside NixOS.

## Development

```bash
nix develop              # enter devshell (Nix flake)
pnpm install             # install JS dependencies
docker compose up -d     # start PostgreSQL
pnpm --filter @zctl/core db:migrate
pnpm --filter @zctl/core dev
```

```bash
pnpm typecheck && pnpm test
cd agents/go-agent && go build ./...
```

## Repository structure

```text
apps/
├── core/              backend API and WebSocket server
└── cli/               operator CLI

agents/
└── go-agent/          Go agent

packages/
├── protocol/          shared message types
├── config/            env schema
└── shared/            utilities
```

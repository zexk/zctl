# AGENTS.md

## Architecture

See [DESIGN.md](./DESIGN.md) for the full stack guide.

```
CLI → Core (WebSocket API) ← Agents
```

| Directory | Component | Stack |
|---|---|---|
| `apps/core` | Backend API + WebSocket server | Node/TS, Fastify, Drizzle, PostgreSQL, `ws`, Zod, Pino |
| `apps/cli` | User-facing CLI | Node/TS, Commander.js |
| `agents/go-agent` | Per-machine agent | Go, WebSocket |
| `packages/protocol` | Shared message types | TypeScript |
| `packages/config` | Shared config | TypeScript |
| `packages/shared` | Shared utilities | TypeScript |

## Onboarding

```bash
nix develop              # enter devshell (flake)
pnpm install             # install JS dependencies
docker compose up -d     # start postgres + core
```

## Verifying

```bash
# TypeScript
pnpm typecheck && pnpm test && pnpm format

# Go agent
cd agents/go-agent && go build ./... && go vet ./...
```

CI runs both on every push (`.github/workflows/ci.yml`).

## Toolchain

Nix flake provides the devshell at `nix develop`.

| Tool | Version | Notes |
|---|---|---|
| Go | 1.26 (nixpkgs) | agent |
| Node.js | 25 | core + CLI |
| pnpm | 10 | Node package manager |
| PostgreSQL | 17 (client) | psql, pg_dump, etc. |
| golangci-lint | 2.x | Go linting |
| gofumpt | 0.x | stricter gofmt |
| prettier | 3.x | code formatting |
| eslint | 10.x | JS linting |
| gcc | 15.x | CGo support for Go agent |
| gopls | | Go language server |
| nil | | Nix language server |
| typescript-language-server | | TS/JS language server |
| yaml-language-server | | YAML language server |
| vscode-langservers-extracted | | HTML/CSS/JSON/ESLint LSPs |
| jq, dnsutils, httpie, htop, iperf | | debugging / networking |

## Development standards

- **TypeScript**: strict mode, no `any`, no implicit returns
- **Formatting**: Prettier
- **Linting**: ESLint
- **Commits**: conventional commits (`feat(core): ...`, `fix(cli): ...`)

## Entrypoints

| Package | Entry | Dev command |
|---|---|---|
| `@zctl/core` | `apps/core/src/index.ts` | `pnpm --filter @zctl/core dev` |
| `@zctl/cli` | `apps/cli/src/index.ts` | `pnpm --filter @zctl/cli dev` |
| `go-agent` | `agents/go-agent/main.go` | `cd agents/go-agent && go run .` |


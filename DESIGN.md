# AGENTS.md

## Project Overview

zctl is a lightweight self-hosted remote machine orchestration platform.

The system consists of:
- a central backend service (`core`)
- lightweight machine agents (`agent`)
- a CLI interface (`cli`)

Primary goals:
- persistent machine connectivity
- remote command execution
- realtime communication
- observability/heartbeat reporting
- maintainable architecture
- strong developer experience

The project is intentionally scoped as a small infrastructure tool, not a Kubernetes/Ansible replacement.

---

# Architecture

```txt
CLI → Core API/WebSocket Server ← Agents
```

Agents maintain persistent websocket connections to the core service.

The core service:
- authenticates agents
- routes commands
- stores execution results
- exposes APIs
- manages machine state

The CLI communicates exclusively with the core service.

---

# Repository Structure

```txt
zctl/
├── apps/
│   ├── core
│   └── cli
├── agents/
│   └── go-agent
├── packages/
│   ├── protocol
│   ├── config
│   └── shared
├── flake.nix
├── docker-compose.yml
└── AGENTS.md
```

Monorepo rationale:
- shared protocol types
- unified tooling
- simpler development workflow
- cleaner dependency management

---

# Development Environment

## Nix / flake.nix

The project uses a `flake.nix` as:
- the primary development environment
- a reproducible build environment
- dependency orchestration for local development

The flake should provide:
- Node.js
- pnpm
- Go toolchain
- PostgreSQL client tools
- linting/formatting tooling
- optional debugging/networking utilities

Goals:
- reproducible onboarding
- minimal host setup
- consistent tooling across environments

Docker is used for service orchestration where appropriate, but the flake remains the primary developer entrypoint.

Example workflow:

```bash
nix develop
pnpm install
docker compose up -d
```

---

# Core Backend (`apps/core`)

## Language
TypeScript

## Runtime
Node.js

## Framework
Fastify

Rationale:
- performant
- good typing support
- cleaner architecture than Express
- plugin ecosystem suitable for infrastructure tooling

## ORM
Drizzle ORM

Rationale:
- SQL-first
- lightweight
- excellent TypeScript support
- avoids heavy abstraction

## Database
PostgreSQL

Rationale:
- industry standard
- reliable relational modeling
- good operational tooling

## Realtime Transport
WebSocket (`ws`)

Rationale:
- persistent bidirectional communication
- low protocol overhead
- sufficient for MVP requirements

## Validation
Zod

Used for:
- env validation
- API schemas
- protocol validation

## Logging
Pino

Requirements:
- structured JSON logging
- request correlation
- production-friendly output

---

# Agent (`agents/go-agent`)

## Language
Go

Rationale:
- static binaries
- strong standard library
- excellent networking support
- simple concurrency model
- fast iteration compared to C

## Responsibilities
- establish websocket connection
- authenticate with core
- execute commands
- stream results/events
- send heartbeat + machine metrics

## Non-Goals
- container orchestration
- privilege escalation
- SSH replacement
- sandboxing

---

# CLI (`apps/cli`)

## Language
TypeScript

## Runtime
Node.js

## Framework
Commander.js

Responsibilities:
- operator interaction
- command submission
- machine inspection
- log viewing

Example commands:

```bash
zctl machines
zctl exec machine-1 "uptime"
zctl logs machine-1
```

---

# Protocol

## Serialization
JSON

Rationale:
- debuggable
- easy iteration
- sufficient for MVP

Binary serialization may be explored later if needed.

## Message Structure

```json
{
  "type": "heartbeat",
  "machineId": "abc123",
  "payload": {}
}
```

Protocol messages must:
- be versionable
- remain explicit
- avoid hidden magic behavior

---

# MVP Scope

## Included
- agent registration
- authenticated websocket connections
- heartbeat reporting
- remote command execution
- command result persistence
- machine listing
- CLI interaction

## Excluded
- RBAC
- multi-user organizations
- scheduling
- orchestration DSLs
- plugins
- cluster management
- distributed execution
- container support

---

# Development Standards

## Formatting
Prettier

## Linting
ESLint

## Type Safety
Strict TypeScript mode enabled.

Avoid:
- `any`
- implicit returns
- hidden runtime coercions

## Git
Conventional commits preferred.

Example:

```txt
feat(core): add websocket heartbeat handling
```

---

# Documentation Requirements

Every major component should contain:
- setup instructions
- architecture notes
- protocol documentation
- examples where relevant

Priority:
- clarity
- maintainability
- reproducibility

---

# Deployment

## Local Development

Docker Compose services:
- postgres
- core

## Future Considerations
- containerized deployment
- reverse proxy support
- TLS termination
- systemd service support

---

# Design Principles

## Prefer
- simple solutions
- explicit architecture
- debuggability
- operational clarity
- reproducibility

## Avoid
- premature abstraction
- unnecessary microservices
- overengineering
- framework-heavy magic
- speculative scalability work

---

# Success Criteria

The MVP is successful when:
1. an agent can connect to the core service
2. commands can be remotely executed
3. results are persisted and viewable
4. another developer can run the project locally from documentation alone

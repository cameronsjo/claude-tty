---
name: claude-tty
description: "Get started with claude-tty -- what it is, how to set it up, and how to use it"
---


Guide the user through getting started with **claude-tty**.

## About

Phone-based server diagnostics terminal. Runs Claude Code behind [ttyd](https://github.com/tsl0922/ttyd) in a locked-down container with read-only Docker access and host metrics. Secured with Traefik + Authelia MFA. Designed for quick server triage from a phone browser.

## Prerequisites

Check that the user has the following installed/configured:

- Docker (with compose plugin)
- Traefik reverse proxy (already running, handling HTTPS)
- Authelia (already configured for two-factor auth)
- Anthropic account (for Claude Code OAuth on first run)
- Tailscale or LAN access to the host (not exposed to the public internet)

## Setup

Walk the user through initial setup:

1. The image is published at:
   ```
   ghcr.io/cameronsjo/claude-tty:latest
   ```

2. Deploy with Docker Compose. The container needs:
   - Read-only `/proc` and `/sys` mounts from the host for metrics
   - Read-only compose file mounts for inspecting stack configs
   - A Docker socket proxy sidecar (POST=0 for read-only API access)
   - A persistent volume for Claude's OAuth token at `/home/claude/.claude`
   - Traefik labels for HTTPS routing and Authelia middleware

3. Key environment variables set in the Dockerfile:
   - `DOCKER_HOST=tcp://docker-sanitizer:2375` (points to the sanitizing proxy, not the real socket)
   - `TERM=xterm-256color`

4. Start it:
   ```bash
   docker compose up -d
   ```

## First Use

Guide the user through their first interaction:

1. Open `https://claude-tty.sjo.lol` (or your configured hostname) in a phone browser.
2. Authenticate through Authelia (password + TOTP).
3. You land in a tmux session. Type `claude` to start Claude Code.
4. On first launch, Claude prints an OAuth URL. Tap it to authenticate with Anthropic. The token persists in the volume.
5. Ask Claude to check something: "What containers are running?" or "Show me CPU load."

## Key Files

Point the user to the most important files for understanding the project:

- `Dockerfile` -- Container build: ttyd, Docker CLI, Claude Code, non-root user, OCI labels
- `entrypoint.sh` -- Launches ttyd with tmux (max 2 clients, origin checking)
- `docker-proxy.mjs` -- Node.js sanitizing proxy that strips secrets from Docker API responses and blocks mutations
- `tmux.conf` -- tmux configuration for the terminal session
- `CLAUDE.md` -- Server context and available commands for Claude's diagnostics mode

## Common Tasks

- **Check running containers:** Ask Claude "what's running?" or run `docker ps` directly
- **View container logs:** `docker logs <container> --tail 50`
- **Check system load:** `cat /host/proc/loadavg`
- **Check memory:** `cat /host/proc/meminfo`
- **Rebuild the image:** `docker compose build --no-cache`

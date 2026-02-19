# claude-tty

Phone-based server diagnostics terminal. Claude Code running behind [ttyd](https://github.com/nicm/ttyd), secured with Traefik + Authelia MFA.

## What This Does

Opens a web terminal on your phone that drops you into a tmux session with Claude Code. Claude has read-only access to Docker (via socket proxy) and host metrics (via `/proc` and `/sys` mounts). It can inspect containers, read logs, check system load — but can't modify anything.

## Architecture

```
Phone Browser → HTTPS → Traefik → Authelia (two_factor) → ttyd → tmux → claude
```

## Security Layers

| Layer | Control |
|-------|---------|
| Network | LAN or Tailscale only |
| Auth | Authelia two_factor (password + TOTP) |
| WebSocket | ttyd `--check-origin` |
| Session | Max 2 clients, tmux idle lock at 15min |
| Docker | Socket proxy POST=0 (read-only) |
| Filesystem | Read-only mounts for /proc, /sys, compose |
| Container | cap_drop ALL, no-new-privileges, non-root |
| Credentials | OAuth tokens in persistent volume |

## What Claude Can Do

- `docker ps`, `docker logs`, `docker inspect`, `docker stats`
- Read host CPU/memory/load via `/host/proc`
- Read compose files via `/host/compose`

## What Claude Cannot Do

- `docker exec`, `docker restart`, `docker stop`, `docker rm`
- Modify any host files
- Escalate privileges

## Quick Start

```bash
docker compose up -d
```

Then open `https://claude-tty.sjo.lol`, authenticate with Authelia, and type `claude`.

## First Run

Claude Code uses OAuth for authentication. On first launch:

1. Type `claude` in the terminal
2. Claude prints an OAuth URL
3. Tap the URL to authenticate with Anthropic
4. Token is saved to the persistent volume

## Image

```
ghcr.io/cameronsjo/claude-tty:latest
```

## License

[MIT](LICENSE)

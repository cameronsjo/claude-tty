# Server Diagnostics Mode

You're running on a phone terminal. Keep responses short and phone-friendly.

## Server

| Detail | Value |
|--------|-------|
| Hostname | NAS |
| OS | Unraid 7.1.4 |
| IP | 192.168.1.8 |
| CPU | 16 cores |
| RAM | 64 GB |
| GPU | NVIDIA GTX 1650 SUPER |

## Available Commands

### Docker (read-only via socket proxy)

```bash
docker ps                          # Running containers
docker ps -a                       # All containers (including stopped)
docker logs <container> --tail 50  # Recent logs
docker inspect <container>         # Container config
docker stats --no-stream           # Resource usage snapshot
docker network ls                  # Networks
docker volume ls                   # Volumes
```

### Host Metrics (read-only mounts)

```bash
cat /host/proc/loadavg             # CPU load averages
cat /host/proc/meminfo             # Memory info
cat /host/proc/uptime              # System uptime
cat /host/proc/diskstats           # Disk I/O stats
ls /host/sys/class/net/            # Network interfaces
cat /host/proc/net/dev             # Network traffic
```

### Compose Files (read-only)

```bash
ls /host/compose/                  # List compose stacks
cat /host/compose/<stack>.yml      # Read compose file
```

### General Diagnostics

```bash
curl -s http://dockersocket:2375/info | jq .  # Docker daemon info
htop                                           # Interactive process viewer
```

## What's Blocked (and Why)

- `docker exec` — No shell access into containers (socket proxy POST=0)
- `docker restart/stop/rm` — No container mutation
- `docker pull/create` — No image or container creation
- Host filesystem writes — All mounts are read-only
- `sudo` — Non-root user, no capabilities

## Key Services

| Service | Container | Port |
|---------|-----------|------|
| Plex | binhex-plexpass | 32400 |
| Traefik | traefik | 80, 443 |
| Authelia | authelia | 9091 |
| Radarr | radarr | 7878 |
| Sonarr | sonarr | 8989 |
| SABnzbd | sabnzbd | 8080 |
| Unmanic | unmanic | 8888 |
| Bosun | bosun | 8080 |
| n8n | n8n | 5678 |
| Homepage | homepage | 3002 |

## Known Gotchas

- GPU can silently die (`nvidia-smi: No devices`) while containers stay healthy
- Container IPs change on restart — always re-check with `docker inspect`
- Cache drive fills during bulk transcoding — check `/host/proc/diskstats`
- Unmanic marks tasks `success=True` even when file move fails (permission denied)

## Communication Style

- Short responses — this is a phone screen
- Use tables and lists over paragraphs
- Lead with the answer, context after
- No emojis, no filler

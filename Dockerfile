FROM node:22-bookworm-slim

ARG TTYD_VERSION=1.7.7

# Diagnostic and terminal tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux \
    curl \
    wget \
    jq \
    htop \
    procps \
    net-tools \
    iproute2 \
    dnsutils \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install ttyd from GitHub releases
RUN curl -fsSL -o /usr/local/bin/ttyd \
    "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64" \
    && chmod +x /usr/local/bin/ttyd

# Install Docker CLI only (no daemon)
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user
RUN groupadd -g 1000 claude \
    && useradd -u 1000 -g claude -m -s /bin/bash claude

# Working directory with diagnostics context
RUN mkdir -p /diagnostics && chown claude:claude /diagnostics
COPY --chown=claude:claude CLAUDE.md /diagnostics/
COPY --chown=claude:claude tmux.conf /home/claude/.tmux.conf
COPY --chown=claude:claude entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER claude
WORKDIR /diagnostics

ENV DOCKER_HOST=tcp://dockersocket:2375
ENV TERM=xterm-256color

EXPOSE 7681

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget -q --spider http://localhost:7681/ || exit 1

LABEL org.opencontainers.image.source="https://github.com/cameronsjo/claude-tty"
LABEL org.opencontainers.image.description="Phone-based server diagnostics terminal — Claude Code behind ttyd"
LABEL org.opencontainers.image.licenses="MIT"

ENTRYPOINT ["entrypoint.sh"]

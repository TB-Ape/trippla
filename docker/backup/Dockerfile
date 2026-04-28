FROM postgres:16-alpine

RUN apk add --no-cache curl && \
    ARCH=$(uname -m) && \
    case "$ARCH" in aarch64) ARCH="arm64";; x86_64) ARCH="amd64";; esac && \
    curl -fsSL "https://github.com/aptible/supercronic/releases/download/v0.2.33/supercronic-linux-${ARCH}" \
      -o /usr/local/bin/supercronic && \
    chmod +x /usr/local/bin/supercronic

# Path is relative to build context (repo root), not this Dockerfile's location
COPY scripts/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

RUN echo "0 3 * * * /usr/local/bin/backup.sh" > /etc/crontab

CMD ["/usr/local/bin/supercronic", "/etc/crontab"]

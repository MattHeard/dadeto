# syntax=docker/dockerfile:1.5
FROM mcr.microsoft.com/playwright:v1.56.0-noble

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends curl gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -sSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /etc/apt/keyrings/cloud.google.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" \
       > /etc/apt/sources.list.d/google-cloud-sdk.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-cloud-cli \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci
COPY test/e2e ./test/e2e
COPY docker/playwright/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

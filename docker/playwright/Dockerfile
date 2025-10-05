FROM mcr.microsoft.com/playwright:v1.47.0-jammy
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
RUN npm install @google-cloud/storage --no-audit --no-fund
COPY e2e ./e2e
COPY docker/playwright/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]

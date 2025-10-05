FROM mcr.microsoft.com/playwright:v1.47.0-jammy
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY e2e ./e2e
# default command runs tests
CMD ["npx","playwright","test","--reporter=list"]

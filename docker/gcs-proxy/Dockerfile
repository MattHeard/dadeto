FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY index.js .
EXPOSE 8080
CMD ["node", "index.js"]

# deps
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY auth/package.json auth/package.json
RUN npm install --omit=dev --omit=optional --workspace=./auth --include-workspace-root=false

# runtime
FROM gcr.io/distroless/nodejs20:nonroot
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 3000
COPY --from=deps /app/node_modules ./node_modules
COPY shared ./shared
COPY auth   ./auth
WORKDIR /app/auth
CMD ["src/server.js"]
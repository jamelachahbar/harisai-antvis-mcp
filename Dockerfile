FROM node:22-alpine AS base
WORKDIR /app

# Install native dependencies for node-canvas (used by @antv/gpt-vis-ssr)
# These are required both for building (npm install compiles native modules) and runtime
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    build-base \
    g++ \
    make \
    python3

# Create non-root user (applied in final stage only)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 && \
    chown -R appuser:nodejs /app

# === Download production environment dependencies ===
FROM base AS deps
COPY package*.json ./
RUN npm install --only=prod --no-audit --no-fund --no-optional && \
    npm cache clean --force

FROM base AS builder
COPY package*.json ./
RUN npm install --no-audit --no-fund --no-optional

RUN mkdir -p public

COPY . .
RUN npm run build

# === Build final image ===
FROM base AS final

USER appuser

LABEL org.opencontainers.image.title="harisai-antvis-mcp"
LABEL org.opencontainers.image.description="Haris AI MCP server for chart generation using AntV"
LABEL org.opencontainers.image.source="https://github.com/jamelachahbar/harisai-antvis-mcp"

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

COPY --from=builder /app/public ./public

# Set container-friendly defaults via environment variables
ENV MCP_TRANSPORT=sse
ENV HOST=0.0.0.0
ENV PORT=1122

# If use docker-compose to execute this Dockerfile, this EXPOSE is a good choice.
EXPOSE 1122

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http'); const port=parseInt(process.env.PORT||'1122',10); const transport=process.env.MCP_TRANSPORT||'sse'; const endpoint=process.env.MCP_ENDPOINT||(transport==='sse'?'/sse':'/mcp'); const req=http.get({hostname:'127.0.0.1',port,path:endpoint},(r)=>process.exit(r.statusCode===200?0:1)); req.on('error',()=>process.exit(1));"

CMD ["node", "build/index.js"]

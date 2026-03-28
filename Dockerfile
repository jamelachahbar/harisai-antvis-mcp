FROM node:22-slim AS base
WORKDIR /app

# Install native dependencies for node-canvas (used by @antv/gpt-vis-ssr)
# Using Debian instead of Alpine to avoid GCC 15.2 compilation issues with canvas
# These are required both for building (npm install compiles native modules) and runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libcairo2-dev \
        libpango1.0-dev \
        libjpeg-dev \
        libgif-dev \
        librsvg2-dev \
        libpixman-1-dev \
        python3 \
        pkg-config && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/* && \
    which python3 && python3 --version && \
    which python && python --version

# Set Python environment variable for node-gyp
ENV PYTHON=/usr/bin/python3

# Create non-root user (applied in final stage only)
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs appuser && \
    chown -R appuser:nodejs /app

# === Download production environment dependencies ===
FROM base AS deps
COPY package*.json ./
# Increase Node memory limit and npm fetch timeouts for flaky networks
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --only=prod --no-audit --no-fund --no-optional --ignore-scripts && \
    npm rebuild canvas && \
    npm cache clean --force

FROM base AS builder
COPY package*.json ./
# Increase Node memory limit and npm fetch timeouts
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm config set fetch-timeout 300000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-audit --no-fund --no-optional --ignore-scripts

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

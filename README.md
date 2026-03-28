# harisai-antvis-mcp

MCP server for chart generation using [AntV](https://github.com/antvis/), forked from [antvis/mcp-server-chart](https://github.com/antvis/mcp-server-chart) and hardened for Haris AI / Finelle.

> Based on [antvis/mcp-server-chart](https://github.com/antvis/mcp-server-chart) (MIT License)

## Quick Start

### Docker (Recommended)

```bash
docker run -d -p 1122:1122 ghcr.io/jamelachahbar/harisai-antvis-mcp:latest
```

The server will be available at `http://localhost:1122/sse`

### npx

```bash
npx -y harisai-antvis-mcp --transport sse --port 1122
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "harisai-antvis-mcp": {
      "command": "npx",
      "args": ["-y", "harisai-antvis-mcp"]
    }
  }
}
```

## Available Tools (24)

| Tool | Description |
|------|-------------|
| `generate_area_chart` | Area chart for trends under continuous variables |
| `generate_bar_chart` | Bar chart for horizontal category comparisons |
| `generate_boxplot_chart` | Boxplot for data distribution analysis |
| `generate_column_chart` | Column chart for vertical category comparisons |
| `generate_dual_axes_chart` | Dual axes for two variables with different ranges |
| `generate_fishbone_diagram` | Ishikawa diagram for root cause analysis |
| `generate_flow_diagram` | Flowchart for process steps and sequences |
| `generate_funnel_chart` | Funnel chart for stage-based data loss |
| `generate_histogram_chart` | Histogram for data distribution by intervals |
| `generate_line_chart` | Line chart for trends over time |
| `generate_liquid_chart` | Liquid chart for percentage visualization |
| `generate_mind_map` | Mind map for hierarchical information |
| `generate_network_graph` | Network graph for node relationships |
| `generate_organization_chart` | Org chart for organizational structure |
| `generate_pie_chart` | Pie chart for proportional data |
| `generate_radar_chart` | Radar chart for multi-dimensional analysis |
| `generate_sankey_chart` | Sankey chart for data flow visualization |
| `generate_scatter_chart` | Scatter plot for variable relationships |
| `generate_spreadsheet` | Spreadsheet / pivot table for tabular data |
| `generate_treemap_chart` | Treemap for hierarchical data rectangles |
| `generate_venn_chart` | Venn diagram for set relationships |
| `generate_violin_chart` | Violin plot for data distribution detail |
| `generate_waterfall_chart` | Waterfall chart for cumulative value changes |
| `generate_word_cloud_chart` | Word cloud for text frequency visualization |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VIS_REQUEST_SERVER` | **(Optional)** External chart rendering service URL. When not set, charts are rendered locally using `@antv/gpt-vis-ssr` | — |
| `CHART_BASE_URL` | Base URL for serving local chart images. Defaults to `http://localhost:${PORT}` | — |
| `DISABLED_TOOLS` | Comma-separated list of tool names to disable | — |
| `MCP_TRANSPORT` | Transport protocol: "stdio", "sse", or "streamable" | `stdio` |
| `HOST` | Host for SSE or streamable transport | `localhost` |
| `PORT` | Port for SSE or streamable transport | `1122` |
| `MCP_ENDPOINT` | Endpoint path (SSE: "/sse", streamable: "/mcp") | — |

## Chart Rendering Modes

### Local Rendering (Default)

When `VIS_REQUEST_SERVER` is **not set**, charts are rendered server-side using `@antv/gpt-vis-ssr`:

- **No external dependencies** — Charts render completely offline
- **PNG output** — High-quality images via Cairo/Pango
- **In-memory caching** — Charts stored for 30 minutes with LRU eviction
- **HTTP serving** — Charts available at `/charts/<uuid>.png`
- **Backward compatible** — Tool responses still return image URLs

**How it works:**
1. MCP tool call → Render chart with `gpt-vis-ssr` → PNG buffer
2. Store buffer in chart store → Generate UUID
3. Return URL: `http://<host>:<port>/charts/<uuid>.png`
4. Agent embeds `![Chart](url)` in response

### Remote Rendering (Fallback)

When `VIS_REQUEST_SERVER` **is set**, the original external rendering flow is used:

- Charts sent to external rendering service
- Returns remote HTTPS URLs (e.g., `https://mdn.alipayobjects.com/...`)
- Useful for environments where native dependencies can't be installed

## CLI Options

```
Options:
  --transport, -t  Transport protocol: "stdio", "sse", or "streamable" (default: "stdio")
  --host, -h       Host for SSE or streamable transport (default: localhost)
  --port, -p       Port for SSE or streamable transport (default: 1122)
  --endpoint, -e   Endpoint path (SSE: "/sse", streamable: "/mcp")
  --help, -H       Show help
```

## Docker Compose

```yaml
services:
  harisai-antvis-mcp:
    image: ghcr.io/jamelachahbar/harisai-antvis-mcp:latest
    ports:
      - "1122:1122"
    environment:
      - VIS_REQUEST_SERVER=https://your-render-service.com/api/chart
```

## Changes from Upstream

- Removed 3 China-only geographic map tools (`generate_district_map`, `generate_path_map`, `generate_pin_map`) that required AMap
- Removed Alipay/Alibaba service references and `SERVICE_ID` tracking
- Added Docker image publishing to GitHub Container Registry
- Added OCI labels, health check, and SBOM generation
- Security audit: 0 critical/high vulnerabilities

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT — see [LICENSE](LICENSE)

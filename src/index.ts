#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  runHTTPStreamableServer,
  runSSEServer,
  runStdioServer,
} from "./server";
import { logger } from "./utils/logger";

// Parse command line arguments
const { values } = parseArgs({
  options: {
    transport: {
      type: "string",
      short: "t",
      default: process.env.MCP_TRANSPORT || "stdio",
    },
    host: {
      type: "string",
      short: "h",
      default: process.env.HOST || "localhost",
    },
    port: {
      type: "string",
      short: "p",
      default: process.env.PORT || "1122",
    },
    endpoint: {
      type: "string",
      short: "e",
      default: process.env.MCP_ENDPOINT || "", // We'll handle defaults per transport type
    },
    help: {
      type: "boolean",
      short: "H",
    },
  },
});

// Display help information if requested
if (values.help) {
  console.log(`
MCP Server Chart CLI

Options:
  --transport, -t  Specify the transport protocol: "stdio", "sse", or "streamable"
                   (default: "stdio" or $MCP_TRANSPORT)
  --host, -h       Specify the host for SSE or streamable transport
                   (default: "localhost" or $HOST)
  --port, -p       Specify the port for SSE or streamable transport
                   (default: 1122 or $PORT)
  --endpoint, -e   Specify the endpoint for the transport:
                   - For SSE: default is "/sse"
                   - For streamable: default is "/mcp"
                   (or $MCP_ENDPOINT)
  --help, -H       Show this help message
  `);
  process.exit(0);
}

// Validate port value early so failures are easy to diagnose
function parsePort(raw: string): number {
  const port = Number.parseInt(raw, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error(
      `Error: Invalid port "${raw}". Port must be a number between 1 and 65535.`,
    );
    process.exit(1);
  }
  return port;
}

// Run in the specified transport mode
const transport = values.transport.toLowerCase();

if (transport === "sse") {
  logger.setIsStdio(false);
  const port = parsePort(values.port as string);
  // Use provided endpoint or default to "/sse" for SSE
  const endpoint = values.endpoint || "/sse";
  const host = values.host || "localhost";
  runSSEServer(host, port, endpoint).catch(console.error);
} else if (transport === "streamable") {
  logger.setIsStdio(false);
  const port = parsePort(values.port as string);
  // Use provided endpoint or default to "/mcp" for streamable
  const endpoint = values.endpoint || "/mcp";
  const host = values.host || "localhost";
  runHTTPStreamableServer(host, port, endpoint).catch(console.error);
} else {
  logger.setIsStdio(true);
  runStdioServer().catch(console.error);
}

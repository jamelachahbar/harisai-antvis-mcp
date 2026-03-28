import { spawn } from "node:child_process";
import type http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMockChartServer, stopMockServer } from "./helpers/mockServer";

const MOCK_SERVER_PORT = 3456;
const MOCK_VIS_SERVER = `http://localhost:${MOCK_SERVER_PORT}`;

let mockServer: http.Server;

// Set up mock chart server for all tests
beforeAll(async () => {
  mockServer = await createMockChartServer(MOCK_SERVER_PORT);
  process.env.VIS_REQUEST_SERVER = MOCK_VIS_SERVER;
});

afterAll(async () => {
  await stopMockServer(mockServer);
});

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function spawnAsync(command: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, VIS_REQUEST_SERVER: MOCK_VIS_SERVER },
    });

    let output = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
      // Wait for the server to actually start
      if (
        output.includes("MCP Server started") ||
        output.includes("SSE Server") ||
        output.includes("Streamable HTTP")
      ) {
        // Give it a bit more time to fully initialize
        setTimeout(() => resolve(child), 500);
      }
    });

    child.stderr.on("data", (data) => {
      output += data.toString();
      // Also check stderr for server start messages
      if (
        output.includes("MCP Server started") ||
        output.includes("SSE Server") ||
        output.includes("Streamable HTTP")
      ) {
        setTimeout(() => resolve(child), 500);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error(`Server did not start in time. Output: ${output}`));
    }, 10000);
  });
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function killAsync(child: any): Promise<void> {
  return new Promise((resolve, reject) => {
    child.on("exit", () => {
      // Add a small delay to ensure the port is fully released
      setTimeout(resolve, 100);
    });
    child.kill();
  });
}

describe("MCP Server", () => {
  it("stdio", async () => {
    const transport = new StdioClientTransport({
      command: "ts-node",
      args: ["./src/index.ts"],
      env: { ...process.env, VIS_REQUEST_SERVER: MOCK_VIS_SERVER },
    });
    const client = new Client({
      name: "stdio-client",
      version: "1.0.0",
    });
    await client.connect(transport);
    const listTools = await client.listTools();

    expect(listTools.tools.length).toBe(24);

    const spec = {
      type: "line",
      data: [
        { time: "2020", value: 100 },
        { time: "2021", value: 120 },
        { time: "2022", value: 145 },
        { time: "2023", value: 150 },
        { time: "2024", value: 167 },
        { time: "2025", value: 163 },
      ],
    };

    const res = await client.callTool({
      name: "generate_line_chart",
      arguments: spec,
    });

    expect(res._meta).toEqual({
      description:
        "The content returned by MCP is the remote image URL of the visualization chart, which can be rendered using Markdown or HTML image tags. The _meta.spec content corresponds to the chart's configuration and spec, which can be rendered using AntV GPT-Vis chart components.",
      spec: spec,
    });

    // @ts-expect-error ignore
    expect(res.content[0].text.substring(0, 8)).toBe("https://");
  });

  it("sse", async () => {
    const child = await spawnAsync("ts-node", ["./src/index.ts", "-t", "sse"]);

    const url = "http://localhost:1122/sse";
    const transport = new SSEClientTransport(new URL(url), {});

    const client = new Client(
      { name: "sse-client", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport);
    const listTools = await client.listTools();

    expect(listTools.tools.length).toBe(24);

    const spec = {
      type: "line",
      data: [
        { time: "2020", value: 100 },
        { time: "2021", value: 120 },
        { time: "2022", value: 145 },
        { time: "2023", value: 150 },
        { time: "2024", value: 167 },
        { time: "2025", value: 163 },
      ],
    };

    const res = await client.callTool({
      name: "generate_line_chart",
      arguments: spec,
    });

    expect(res._meta).toEqual({
      description:
        "The content returned by MCP is the remote image URL of the visualization chart, which can be rendered using Markdown or HTML image tags. The _meta.spec content corresponds to the chart's configuration and spec, which can be rendered using AntV GPT-Vis chart components.",
      spec: spec,
    });

    // @ts-expect-error ignore
    expect(res.content[0].text.substring(0, 8)).toBe("https://");

    await killAsync(child);
  });

  it("streamable", async () => {
    const child = await spawnAsync("ts-node", [
      "./src/index.ts",
      "-t",
      "streamable",
    ]);

    const url = "http://localhost:1122/mcp";
    const transport = new StreamableHTTPClientTransport(new URL(url));
    const client = new Client({
      name: "streamable-http-client",
      version: "1.0.0",
    });
    await client.connect(transport);
    const listTools = await client.listTools();

    expect(listTools.tools.length).toBe(24);

    const spec = {
      type: "line",
      data: [
        { time: "2020", value: 100 },
        { time: "2021", value: 120 },
        { time: "2022", value: 145 },
        { time: "2023", value: 150 },
        { time: "2024", value: 167 },
        { time: "2025", value: 163 },
      ],
    };

    const res = await client.callTool({
      name: "generate_line_chart",
      arguments: spec,
    });

    expect(res._meta).toEqual({
      description:
        "The content returned by MCP is the remote image URL of the visualization chart, which can be rendered using Markdown or HTML image tags. The _meta.spec content corresponds to the chart's configuration and spec, which can be rendered using AntV GPT-Vis chart components.",
      spec: spec,
    });

    // @ts-expect-error ignore
    expect(res.content[0].text.substring(0, 8)).toBe("https://");

    await killAsync(child);
  });

  it("sse with multiple clients", async () => {
    const child = await spawnAsync("ts-node", ["./src/index.ts", "-t", "sse"]);

    const url = "http://localhost:1122/sse";

    const transport1 = new SSEClientTransport(new URL(url), {});
    const client1 = new Client(
      { name: "sse-client-1", version: "1.0.0" },
      { capabilities: {} },
    );

    const transport2 = new SSEClientTransport(new URL(url), {});
    const client2 = new Client(
      { name: "sse-client-2", version: "1.0.0" },
      { capabilities: {} },
    );

    await Promise.all([
      client1.connect(transport1),
      client2.connect(transport2),
    ]);

    expect((await client1.listTools()).tools.length).toBe(
      (await client2.listTools()).tools.length,
    );

    await killAsync(child);
  });

  it("streamable with multiple clients", async () => {
    const child = await spawnAsync("ts-node", [
      "./src/index.ts",
      "-t",
      "streamable",
    ]);

    const url = "http://localhost:1122/mcp";

    const transport1 = new StreamableHTTPClientTransport(new URL(url), {});
    const client1 = new Client(
      { name: "streamable-client-1", version: "1.0.0" },
      { capabilities: {} },
    );

    const transport2 = new StreamableHTTPClientTransport(new URL(url), {});
    const client2 = new Client(
      { name: "streamable-client-2", version: "1.0.0" },
      { capabilities: {} },
    );

    await Promise.all([
      client1.connect(transport1),
      client2.connect(transport2),
    ]);

    expect((await client1.listTools()).tools.length).toBe(
      (await client2.listTools()).tools.length,
    );

    await killAsync(child);
  });
});

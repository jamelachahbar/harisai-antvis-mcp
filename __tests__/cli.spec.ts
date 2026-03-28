import { spawn } from "node:child_process";
import { beforeEach, describe, expect, it } from "vitest";

describe("CLI Environment Variables", () => {
  beforeEach(() => {
    // Remove env vars before each test to ensure a clean state and prevent
    // leaking into spawned child processes via { ...process.env }.
    // We deliberately use `delete` (not `= undefined`) because process.env
    // coerces undefined to the string "undefined", which would still be
    // inherited by child processes.
    // biome-ignore lint/performance/noDelete: process.env must be deleted, not set to "undefined"
    delete process.env.MCP_TRANSPORT;
    // biome-ignore lint/performance/noDelete: process.env must be deleted, not set to "undefined"
    delete process.env.HOST;
    // biome-ignore lint/performance/noDelete: process.env must be deleted, not set to "undefined"
    delete process.env.PORT;
    // biome-ignore lint/performance/noDelete: process.env must be deleted, not set to "undefined"
    delete process.env.MCP_ENDPOINT;
  });

  it("should include environment variable names in help output", async () => {
    const child = spawn("ts-node", ["./src/index.ts", "--help"]);
    let output = "";

    await new Promise<void>((resolve) => {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });
      child.on("exit", () => resolve());
    });

    // Help text should reference env var names so users know how to configure
    expect(output).toContain("MCP_TRANSPORT");
    expect(output).toContain("$HOST");
    expect(output).toContain("$PORT");
    expect(output).toContain("MCP_ENDPOINT");
  });

  it("should exit 0 for --help regardless of env vars or other flags", async () => {
    let exitCode: number | null = null;

    const child = spawn(
      "ts-node",
      ["./src/index.ts", "--help", "-t", "streamable", "-p", "9999"],
      {
        env: {
          ...process.env,
          MCP_TRANSPORT: "sse",
          HOST: "0.0.0.0",
          PORT: "3000",
        },
      },
    );

    await new Promise<void>((resolve) => {
      child.on("exit", (code) => {
        exitCode = code;
        resolve();
      });
    });

    // CLI --help flag overrides everything and exits cleanly
    expect(exitCode).toBe(0);
  });

  it("should exit with error and message for non-numeric -p flag", async () => {
    let exitCode: number | null = null;
    let errorOutput = "";

    const child = spawn(
      "ts-node",
      ["./src/index.ts", "-t", "sse", "-p", "invalid"],
      { env: { ...process.env } },
    );

    await new Promise<void>((resolve) => {
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      child.on("exit", (code) => {
        exitCode = code;
        resolve();
      });
    });

    expect(exitCode).toBe(1);
    expect(errorOutput).toContain("Invalid port");
  });

  it("should exit with error and message when PORT env var is non-numeric", async () => {
    let exitCode: number | null = null;
    let errorOutput = "";

    const child = spawn("ts-node", ["./src/index.ts", "-t", "sse"], {
      env: { ...process.env, PORT: "not-a-port" },
    });

    await new Promise<void>((resolve) => {
      child.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      child.on("exit", (code) => {
        exitCode = code;
        resolve();
      });
    });

    expect(exitCode).toBe(1);
    expect(errorOutput).toContain("Invalid port");
  });
});

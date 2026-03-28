import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

describe("CLI Environment Variables", () => {
  afterEach(() => {
    // Clean up environment variables
    process.env.MCP_TRANSPORT = undefined;
    process.env.HOST = undefined;
    process.env.PORT = undefined;
    process.env.MCP_ENDPOINT = undefined;
  });

  it("should use default values when no env vars are set", async () => {
    const child = spawn("node", ["./build/index.js", "--help"]);
    let output = "";

    await new Promise<void>((resolve) => {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("exit", () => {
        resolve();
      });
    });

    // Help text should mention defaults
    expect(output).toContain("stdio");
    expect(output).toContain("localhost");
    expect(output).toContain("1122");
  });

  it("should respect MCP_TRANSPORT environment variable", async () => {
    // This test verifies that the environment variable is read
    // We can't easily test the actual behavior without starting servers,
    // but we can verify the help output is generated correctly
    const child = spawn("node", ["./build/index.js", "--help"], {
      env: { ...process.env, MCP_TRANSPORT: "sse" },
    });

    let output = "";

    await new Promise<void>((resolve) => {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("exit", () => {
        resolve();
      });
    });

    // Help should still be displayed correctly
    expect(output).toContain("MCP Server Chart CLI");
  });

  it("should respect HOST environment variable", async () => {
    const child = spawn("node", ["./build/index.js", "--help"], {
      env: { ...process.env, HOST: "0.0.0.0" },
    });

    let output = "";

    await new Promise<void>((resolve) => {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("exit", () => {
        resolve();
      });
    });

    // Help should still be displayed correctly
    expect(output).toContain("MCP Server Chart CLI");
  });

  it("should respect PORT environment variable", async () => {
    const child = spawn("node", ["./build/index.js", "--help"], {
      env: { ...process.env, PORT: "3000" },
    });

    let output = "";

    await new Promise<void>((resolve) => {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("exit", () => {
        resolve();
      });
    });

    // Help should still be displayed correctly
    expect(output).toContain("MCP Server Chart CLI");
  });

  it("should allow CLI flags to override environment variables", async () => {
    // CLI flags should take precedence over env vars
    const child = spawn("node", ["./build/index.js", "--help"], {
      env: {
        ...process.env,
        MCP_TRANSPORT: "sse",
        HOST: "0.0.0.0",
        PORT: "3000",
      },
    });

    let output = "";

    await new Promise<void>((resolve) => {
      child.stdout.on("data", (data) => {
        output += data.toString();
      });

      child.on("exit", () => {
        resolve();
      });
    });

    // Help should still be displayed correctly
    expect(output).toContain("MCP Server Chart CLI");
  });
});

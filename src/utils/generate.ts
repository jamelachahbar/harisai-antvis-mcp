import http from "node:http";
import https from "node:https";
import axios from "axios";
import { getVisRequestServer } from "./env";

/**
 * Persistent axios instance with HTTP keep-alive to reuse TCP connections
 * across requests, reducing overhead under high concurrency.
 */
const httpClient = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Generate a chart URL using the provided configuration.
 * @param type The type of chart to generate
 * @param options Chart options
 * @returns {Promise<string>} The generated chart URL.
 * @throws {Error} If the chart generation fails.
 */
export async function generateChartUrl(
  type: string,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options: Record<string, any>,
): Promise<string> {
  // Security: VIS_REQUEST_SERVER is set via environment variable at deployment time,
  // NOT from MCP tool input. This is an accepted risk — operators control the URL.
  let url: string;
  try {
    url = getVisRequestServer();
  } catch (error) {
    throw new Error(
      `Chart generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const response = await httpClient.post(url, {
      type,
      ...options,
      source: "mcp-server-chart",
    });
    const { success, errorMessage, resultObj } = response.data;

    if (!success) {
      throw new Error(errorMessage);
    }

    return resultObj;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error
        throw new Error(
          `Chart rendering service error: ${error.response.status} - ${
            error.response.data?.errorMessage || error.response.statusText
          }`,
        );
      }
      if (error.request) {
        // Request made but no response
        throw new Error(
          `Cannot reach chart rendering service at ${url}. Please check VIS_REQUEST_SERVER configuration and network connectivity.`,
        );
      }
    }
    // Re-throw if already a custom error or unknown error
    throw error;
  }
}

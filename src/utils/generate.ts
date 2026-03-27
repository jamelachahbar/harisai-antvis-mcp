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
  const url = getVisRequestServer();

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
}

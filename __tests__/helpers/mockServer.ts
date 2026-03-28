import http from "node:http";

/**
 * Creates a simple mock HTTP server for testing chart generation
 * Returns a chart URL for successful requests
 */
export function createMockChartServer(port = 3456): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              errorMessage: null,
              resultObj: "https://example.com/chart/mock-chart-id.png",
            }),
          );
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

/**
 * Stops the mock server
 */
export function stopMockServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

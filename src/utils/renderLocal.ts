import { logger } from "./logger";

// Lazy-load @antv/gpt-vis-ssr to avoid CSS import issues during module initialization
let renderModule: typeof import("@antv/gpt-vis-ssr") | null = null;

async function getRenderModule() {
  if (!renderModule) {
    renderModule = await import("@antv/gpt-vis-ssr");
  }
  return renderModule;
}

/**
 * Renders a chart to a PNG buffer using @antv/gpt-vis-ssr
 * @param type - Chart type (e.g., "line", "bar", "pie")
 * @param options - Chart options (data, axis config, etc.)
 * @returns PNG image buffer
 * @throws Error if rendering fails or times out
 */
export async function renderChartToBuffer(
  type: string,
  options: Record<string, unknown>,
): Promise<Buffer> {
  const startTime = Date.now();
  const timeout = 10000; // 10 seconds

  try {
    logger.info(`Rendering ${type} chart locally...`);

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Chart rendering timed out after ${timeout}ms`));
      }, timeout);
    });

    // Render the chart
    const renderPromise = (async () => {
      const { render } = await getRenderModule();
      // biome-ignore lint/suspicious/noExplicitAny: gpt-vis-ssr accepts various chart type configurations
      const vis = await render({ type, ...options } as any);
      try {
        const buffer = vis.toBuffer();
        logger.info(
          `Chart rendered successfully in ${Date.now() - startTime}ms (buffer size: ${buffer.length} bytes)`,
        );
        return buffer;
      } finally {
        // Always destroy the vis instance to free resources
        vis.destroy();
      }
    })();

    // Race between rendering and timeout
    const buffer = await Promise.race([renderPromise, timeoutPromise]);

    return buffer;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to render chart locally: ${errorMessage}`);
    throw new Error(`Chart rendering failed: ${errorMessage}`);
  }
}

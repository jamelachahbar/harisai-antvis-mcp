import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as Charts from "../charts";
import { chartStore } from "../services/chartStore";
import { getVisRequestServer } from "./env";
import { generateChartUrl } from "./generate";
import { logger } from "./logger";
import { renderChartToBuffer } from "./renderLocal";
import { ValidateError } from "./validator";

// Chart type mapping
const CHART_TYPE_MAP = {
  generate_area_chart: "area",
  generate_bar_chart: "bar",
  generate_boxplot_chart: "boxplot",
  generate_column_chart: "column",
  generate_dual_axes_chart: "dual-axes",
  generate_fishbone_diagram: "fishbone-diagram",
  generate_flow_diagram: "flow-diagram",
  generate_funnel_chart: "funnel",
  generate_histogram_chart: "histogram",
  generate_line_chart: "line",
  generate_liquid_chart: "liquid",
  generate_mind_map: "mind-map",
  generate_network_graph: "network-graph",
  generate_organization_chart: "organization-chart",
  generate_pie_chart: "pie",
  generate_radar_chart: "radar",
  generate_sankey_chart: "sankey",
  generate_scatter_chart: "scatter",
  generate_treemap_chart: "treemap",
  generate_venn_chart: "venn",
  generate_violin_chart: "violin",
  generate_waterfall_chart: "waterfall",
  generate_word_cloud_chart: "word-cloud",
  generate_spreadsheet: "spreadsheet",
} as const;

// Pre-compile Zod schemas at module load time to avoid recompiling on every request.
// biome-ignore lint/suspicious/noExplicitAny: schema types vary per chart
const COMPILED_SCHEMA_CACHE = new Map<string, z.ZodObject<any>>();
for (const chartType of Object.values(CHART_TYPE_MAP)) {
  const schema = Charts[chartType as keyof typeof Charts]?.schema;
  if (schema) {
    COMPILED_SCHEMA_CACHE.set(chartType, z.object(schema));
  }
}

/**
 * Call a tool to generate a chart based on the provided name and arguments.
 * @param tool The name of the tool to call, e.g., "generate_area_chart".
 * @param args The arguments for the tool, which should match the expected schema for the chart type.
 * @returns
 */
export async function callTool(tool: string, args: object = {}) {
  logger.info(`Calling tool: ${tool}`);
  const chartType = CHART_TYPE_MAP[tool as keyof typeof CHART_TYPE_MAP];

  if (!chartType) {
    logger.error(`Unknown tool: ${tool}`);
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${tool}.`);
  }

  try {
    // Validate input using Zod before sending to API.
    // Use pre-compiled schema from cache to avoid recompiling on every call.
    const compiledSchema = COMPILED_SCHEMA_CACHE.get(chartType);

    if (compiledSchema) {
      // Use safeParse instead of parse and try-catch.
      const result = compiledSchema.safeParse(args);
      if (!result.success) {
        logger.error(`Invalid parameters: ${result.error.message}`);
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${result.error.message}`,
        );
      }
    }

    // Dual-mode rendering: Local (default) or Remote (if VIS_REQUEST_SERVER is set)
    const visServer = getVisRequestServer();
    let chartUrl: string;

    if (visServer) {
      // Remote mode (backward-compatible)
      logger.info(`Using remote rendering via ${visServer}`);
      chartUrl = await generateChartUrl(chartType, args);
    } else {
      // Local mode — render, store, serve
      logger.info("Using local rendering");
      const buffer = await renderChartToBuffer(
        chartType,
        args as Record<string, unknown>,
      );
      const chartId = chartStore.store(buffer);

      // Use CHART_BASE_URL env var or construct from host/port
      const baseUrl =
        process.env.CHART_BASE_URL ||
        `http://localhost:${process.env.PORT || "1122"}`;
      chartUrl = `${baseUrl}/charts/${chartId}.png`;
    }

    logger.info(`Generated chart URL: ${chartUrl}`);

    return {
      content: [
        {
          type: "text",
          text: chartUrl,
        },
      ],
      _meta: {
        description:
          "The content is a chart image URL that can be rendered using ![Chart](url) in markdown. The _meta.spec content corresponds to the chart's configuration and spec, which can be rendered using AntV GPT-Vis chart components.",
        spec: { type: chartType, ...args },
      },
    };
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  } catch (error: any) {
    logger.error(
      `Failed to generate chart: ${error.message || "Unknown error"}.`,
    );
    if (error instanceof McpError) throw error;
    if (error instanceof ValidateError)
      throw new McpError(ErrorCode.InvalidParams, error.message);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to generate chart: ${error?.message || "Unknown error."}`,
    );
  }
}

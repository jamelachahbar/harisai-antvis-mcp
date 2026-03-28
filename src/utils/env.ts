import process from "node:process";

/**
 * Get the VIS_REQUEST_SERVER from environment variables.
 * @throws {Error} If VIS_REQUEST_SERVER is not set or is empty
 */
export function getVisRequestServer(): string {
  const url = process.env.VIS_REQUEST_SERVER;

  if (!url || url.trim() === "") {
    throw new Error(
      "VIS_REQUEST_SERVER environment variable is not set. " +
        "Chart generation requires a valid chart rendering service URL. " +
        "Please configure VIS_REQUEST_SERVER in your Azure Container Apps environment variables.",
    );
  }

  return url.trim();
}

/**
 * Get the list of disabled tools from environment variables.
 */
export function getDisabledTools(): string[] {
  const disabledTools = process.env.DISABLED_TOOLS;
  if (!disabledTools || disabledTools === "undefined") {
    return [];
  }
  return disabledTools.split(",");
}

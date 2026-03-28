/**
 * Patch Node.js require() to ignore CSS/LESS/SCSS imports
 * This is needed for @antv/gpt-vis-ssr which has dependencies that try to require() CSS files
 */
import Module from "node:module";

// Store the original require function
const originalRequire = Module.prototype.require;

// Patch the require function to ignore style imports
// biome-ignore lint/suspicious/noExplicitAny: Module.prototype.require signature is complex
Module.prototype.require = function (id: string, ...args: any[]) {
  // If it's a CSS/LESS/SCSS file, return an empty object
  if (
    id.endsWith(".css") ||
    id.endsWith(".less") ||
    id.endsWith(".scss") ||
    id.endsWith(".sass")
  ) {
    return {};
  }

  // Otherwise, use the original require
  // biome-ignore lint/suspicious/noExplicitAny: need to pass through original arguments
  return originalRequire.apply(this, [id, ...args] as any);
};

export function setupModuleLoader() {
  // The patch is applied during module import
  // This function exists for explicit initialization if needed
}

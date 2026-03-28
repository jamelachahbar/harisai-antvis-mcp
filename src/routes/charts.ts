import { Router } from "express";
import { chartStore } from "../services/chartStore";
import { logger } from "../utils/logger";

export const chartsRouter = Router();

/**
 * Serves chart images by UUID
 * GET /charts/:id.png
 */
chartsRouter.get("/charts/:id.png", (req, res) => {
  const { id } = req.params;

  logger.info(`Chart image requested: ${id}`);

  const buffer = chartStore.get(id);

  if (!buffer) {
    logger.warn(`Chart not found or expired: ${id}`);
    return res.status(404).send("Chart not found or expired");
  }

  // Set appropriate headers
  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "public, max-age=1800"); // 30 minutes
  res.set("Content-Length", buffer.length.toString());

  logger.info(`Serving chart ${id} (${buffer.length} bytes)`);

  res.send(buffer);
});

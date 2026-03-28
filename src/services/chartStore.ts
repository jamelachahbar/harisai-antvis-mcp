import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger";

interface ChartEntry {
  buffer: Buffer;
  createdAt: number;
}

/**
 * In-memory chart store with TTL-based eviction and LRU policy
 */
export class ChartStore {
  private charts = new Map<string, ChartEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttlMinutes = 30, maxEntries = 500) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxEntries = maxEntries;

    // Periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.evictExpired();
      },
      5 * 60 * 1000,
    );

    logger.info(
      `ChartStore initialized (TTL: ${ttlMinutes} min, max entries: ${maxEntries})`,
    );
  }

  /**
   * Stores a chart buffer and returns a UUID
   * @param buffer - PNG image buffer
   * @returns UUID string
   */
  store(buffer: Buffer): string {
    this.evictExpired();

    // LRU: remove oldest if at capacity
    if (this.charts.size >= this.maxEntries) {
      const oldest = this.charts.keys().next().value;
      if (oldest) {
        logger.info(
          `Chart store at capacity (${this.maxEntries}), evicting oldest: ${oldest}`,
        );
        this.charts.delete(oldest);
      }
    }

    const id = randomUUID();
    this.charts.set(id, { buffer, createdAt: Date.now() });

    logger.info(
      `Chart stored with ID ${id} (size: ${buffer.length} bytes, total charts: ${this.charts.size})`,
    );

    return id;
  }

  /**
   * Retrieves a chart buffer by UUID
   * @param id - UUID string
   * @returns Buffer if found and not expired, undefined otherwise
   */
  get(id: string): Buffer | undefined {
    const entry = this.charts.get(id);
    if (!entry) {
      logger.info(`Chart not found: ${id}`);
      return undefined;
    }

    const age = Date.now() - entry.createdAt;
    if (age > this.ttlMs) {
      logger.info(`Chart expired (age: ${Math.round(age / 1000)}s): ${id}`);
      this.charts.delete(id);
      return undefined;
    }

    logger.info(`Chart retrieved: ${id} (age: ${Math.round(age / 1000)}s)`);
    return entry.buffer;
  }

  /**
   * Evicts expired charts
   */
  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [id, entry] of this.charts) {
      if (now - entry.createdAt > this.ttlMs) {
        this.charts.delete(id);
        evicted++;
      }
    }

    if (evicted > 0) {
      logger.info(
        `Evicted ${evicted} expired charts (remaining: ${this.charts.size})`,
      );
    }
  }

  /**
   * Returns the current number of stored charts
   */
  size(): number {
    return this.charts.size;
  }

  /**
   * Clears all charts and stops cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.charts.clear();
    logger.info("ChartStore destroyed");
  }
}

// Singleton instance
export const chartStore = new ChartStore();

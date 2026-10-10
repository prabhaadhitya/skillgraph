/**
 * SkillGraph Bounded Cache Utility
 *
 * Implements a high-performance in-memory cache with:
 * 1. Bounded size limit (maxSize) with LRU (least recently used) eviction to prevent unbounded growth.
 * 2. Time-to-live (ttlMs) expiration per entry to prevent stale entries.
 * 3. Lazy expiration on read/check and active pruning on write or periodic sweep.
 * 4. Correctness guarantee: cache is purely an accelerator; all services fall back to database source of truth.
 */

export class BoundedCache {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.maxSize=1000] - Maximum number of entries before LRU eviction.
   * @param {number} [options.ttlMs=30000] - Default TTL in milliseconds.
   * @param {number} [options.cleanupIntervalMs=60000] - Periodic cleanup interval (0 disables timer).
   * @param {string} [options.name='cache'] - Name of the cache for diagnostics.
   */
  constructor({
    maxSize = 1000,
    ttlMs = 30000,
    cleanupIntervalMs = 60000,
    name = 'cache',
  } = {}) {
    if (typeof maxSize !== 'number' || maxSize <= 0) {
      throw new TypeError('maxSize must be a positive integer');
    }
    if (typeof ttlMs !== 'number' || ttlMs <= 0) {
      throw new TypeError('ttlMs must be a positive number');
    }

    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.name = name;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;

    if (cleanupIntervalMs > 0 && typeof setInterval === 'function') {
      this.cleanupTimer = setInterval(() => {
        this.pruneExpired();
      }, cleanupIntervalMs);

      if (typeof this.cleanupTimer.unref === 'function') {
        this.cleanupTimer.unref();
      }
    } else {
      this.cleanupTimer = null;
    }
  }

  /**
   * Current number of entries stored in the cache.
   * @returns {number}
   */
  get size() {
    return this.map.size;
  }

  /**
   * Retrieves a cached value if present and unexpired.
   * Promotes the entry to most-recently-used in LRU ordering.
   *
   * @param {string} key
   * @returns {any|undefined}
   */
  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      this.misses++;
      return undefined;
    }

    // Refresh LRU order (delete & re-set moves to end of Map iteration)
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Checks if an unexpired key exists in the cache.
   *
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Stores a value in the cache with bounded eviction.
   *
   * @param {string} key
   * @param {any} value
   * @param {number} [customTtlMs]
   * @returns {this}
   */
  set(key, value, customTtlMs) {
    const ttl = typeof customTtlMs === 'number' && customTtlMs > 0 ? customTtlMs : this.ttlMs;
    const expiresAt = Date.now() + ttl;

    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // First attempt to free space by pruning expired entries
      this.pruneExpired();

      // If still at capacity, evict least recently used (first item in Map order)
      while (this.map.size >= this.maxSize) {
        const oldestKey = this.map.keys().next().value;
        if (oldestKey === undefined) break;
        this.map.delete(oldestKey);
      }
    }

    this.map.set(key, { value, expiresAt });
    return this;
  }

  /**
   * Deletes an entry by key.
   *
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this.map.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  clear() {
    this.map.clear();
  }

  /**
   * Removes all expired entries from memory.
   *
   * @returns {number} Count of removed entries
   */
  pruneExpired() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.map.entries()) {
      if (entry.expiresAt <= now) {
        this.map.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Returns diagnostic statistics for this cache instance.
   *
   * @returns {{ name: string, size: number, maxSize: number, ttlMs: number, hits: number, misses: number }}
   */
  stats() {
    return {
      name: this.name,
      size: this.map.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * Stops background cleanup timer.
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export function createBoundedCache(options) {
  return new BoundedCache(options);
}

export default BoundedCache;

// A small in-memory cache where every entry expires after a fixed time (TTL).
import { config } from '../config.js';

export class TtlCache {
  #entries = new Map(); // key -> { value, expiresAt }
  #ttlMs;
  #hits = 0;
  #misses = 0;

  constructor(ttlSeconds) {
    this.#ttlMs = ttlSeconds * 1000;
    this.ttlSeconds = ttlSeconds;
  }

  // Returns the stored value, or undefined when there is none or it has expired.
  // Every call counts as exactly one hit or one miss.
  get(key) {
    const entry = this.#entries.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      this.#hits += 1;
      return entry.value;
    }
    if (entry) this.#entries.delete(key); // expired
    this.#misses += 1;
    return undefined;
  }

  set(key, value) {
    this.#entries.set(key, { value, expiresAt: Date.now() + this.#ttlMs });
  }

  stats() {
    const now = Date.now();
    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= now) this.#entries.delete(key);
    }
    return {
      entries: this.#entries.size,
      hits: this.#hits,
      misses: this.#misses,
      ttlSeconds: this.ttlSeconds,
    };
  }
}

export const weatherCache = new TtlCache(config.cacheTtlSeconds);

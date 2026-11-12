export interface RateLimit {
  limit: number
  windowMs: number
}

/** Sliding-window rate limiter, keyed by an arbitrary string. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>()

  /** Records a hit and returns true when the key is still within its limit. */
  check(key: string, { limit, windowMs }: RateLimit, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs)
    if (recent.length >= limit) {
      this.hits.set(key, recent)
      return false
    }
    recent.push(now)
    this.hits.set(key, recent)
    return true
  }
}

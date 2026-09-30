import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { serverEnv } from '@/lib/env.server';

export interface AiRateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterMs?: number;
}

export interface AiRateLimiter {
  consume(key: string): Promise<AiRateLimitResult>;
}

const WINDOW_MS = 60_000;
/** Calls allowed per workspace per rolling minute across every AI kind. */
const LIMIT_PER_WINDOW = 20;

/**
 * Sliding-window limiter backed by Upstash Redis (docs/02-mimari.md § 2:
 * "Hız sınırı: Upstash Redis"). Used whenever UPSTASH_REDIS_REST_URL/TOKEN
 * are configured.
 */
export class UpstashAiRateLimiter implements AiRateLimiter {
  private readonly limiter: Ratelimit;

  constructor(url: string, token: string) {
    this.limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(LIMIT_PER_WINDOW, '1 m'),
      prefix: 'testcim:ai',
    });
  }

  async consume(key: string): Promise<AiRateLimitResult> {
    const result = await this.limiter.limit(key);

    if (result.success) {
      return { allowed: true };
    }

    return { allowed: false, retryAfterMs: Math.max(0, result.reset - Date.now()) };
  }
}

/**
 * In-process fallback for local dev/tests where Upstash isn't configured.
 * Per-instance only (doesn't coordinate across serverless invocations) —
 * fine for a single dev server, not a substitute for Upstash in production.
 * See docs/adr/0006-yapay-zeka-altyapisi.md.
 */
export class InMemoryAiRateLimiter implements AiRateLimiter {
  private readonly hits = new Map<string, number[]>();

  consume(key: string): Promise<AiRateLimitResult> {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const recent = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

    if (recent.length >= LIMIT_PER_WINDOW) {
      const oldestInWindow = recent[0]!;
      this.hits.set(key, recent);

      return Promise.resolve({
        allowed: false,
        retryAfterMs: Math.max(0, oldestInWindow + WINDOW_MS - now),
      });
    }

    recent.push(now);
    this.hits.set(key, recent);

    return Promise.resolve({ allowed: true });
  }
}

let cached: AiRateLimiter | undefined;

export function getAiRateLimiter(): AiRateLimiter {
  if (!cached) {
    cached =
      serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN
        ? new UpstashAiRateLimiter(
            serverEnv.UPSTASH_REDIS_REST_URL,
            serverEnv.UPSTASH_REDIS_REST_TOKEN,
          )
        : new InMemoryAiRateLimiter();
  }

  return cached;
}

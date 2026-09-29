/**
 * Caps how many async tasks run at once (docs/02 §5.1: "en fazla 3-4
 * eşzamanlı" uploads). Extra tasks queue in submission order and start as
 * running ones finish.
 */
export function createConcurrencyLimiter(maxConcurrent: number) {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new RangeError('maxConcurrent must be a positive integer.');
  }

  let active = 0;
  const queue: (() => void)[] = [];

  function runNext(): void {
    if (active >= maxConcurrent) {
      return;
    }
    const run = queue.shift();
    if (!run) {
      return;
    }
    active += 1;
    run();
  }

  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            runNext();
          });
      });
      runNext();
    });
  };
}

/** Exponential backoff with a ceiling, for retrying a failed queue entry. */
export function backoffDelayMs(attempt: number, baseMs = 1000, maxMs = 30_000): number {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
}

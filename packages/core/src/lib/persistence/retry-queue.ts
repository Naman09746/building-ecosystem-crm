// ============================================================================
// FAILED-WRITE RETRY QUEUE (client)
//
// When an optimistic CRM mutation fails to reach Supabase, the write is
// enqueued here and retried when connectivity returns (online event), the tab
// regains focus, or on a periodic timer. This closes the gap between
// "toast warning" and "silent data loss".
//
// LIMITATION (documented): the queue is in-memory. A page refresh before a
// successful flush still loses those writes — a durable outbox table is the
// follow-up if field data shows meaningful loss rates.
// ============================================================================

type RetryTask = () => Promise<boolean>;

interface QueueEntry {
  id: string;
  label: string;
  task: RetryTask;
  attempts: number;
  queuedAt: number;
}

const MAX_ATTEMPTS = 5;
const MAX_QUEUE_SIZE = 100;

const queue: QueueEntry[] = [];
let flushing = false;
let started = false;
let listenersAttached = false;

function enqueue(label: string, task: RetryTask): void {
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn("[RETRY_QUEUE] full — dropping oldest pending write");
    queue.shift();
  }
  queue.push({
    id: `rq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    task,
    attempts: 0,
    queuedAt: Date.now(),
  });
}

async function flush(): Promise<number> {
  if (flushing || queue.length === 0) return 0;
  flushing = true;

  let delivered = 0;
  // Iterate over a snapshot; failed items are re-enqueued at the back.
  const snapshot = [...queue];
  queue.length = 0;

  for (const entry of snapshot) {
    try {
      const ok = await entry.task();
      if (ok) {
        delivered++;
      } else {
        requeue(entry);
      }
    } catch {
      requeue(entry);
    }
  }

  flushing = false;
  return delivered;
}

function requeue(entry: QueueEntry): void {
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    // Give up loudly — this is real potential data loss for the user.
    reportGiveUp(entry);
    return;
  }
  queue.push(entry);
}

const givenUpCallbacks: Array<(label: string, attempts: number) => void> = [];

function reportGiveUp(entry: QueueEntry): void {
  console.error(
    `[RETRY_QUEUE] giving up after ${entry.attempts} attempts: ${entry.label}`
  );
  for (const cb of givenUpCallbacks) {
    try {
      cb(entry.label, entry.attempts);
    } catch {}
  }
}

/**
 * Register a callback invoked when a queued write exhausts its retries.
 * Returns an unsubscribe function.
 */
export function onWriteAbandoned(cb: (label: string, attempts: number) => void): () => void {
  givenUpCallbacks.push(cb);
  return () => {
    const idx = givenUpCallbacks.indexOf(cb);
    if (idx !== -1) givenUpCallbacks.splice(idx, 1);
  };
}

/**
 * Enqueue a failed write for retry. Safe to call from anywhere; idempotent
 * listener setup happens once per page session.
 */
export function scheduleRetry(label: string, task: RetryTask): void {
  enqueue(label, task);
  startWorkers();
}

/** Current number of pending retries (for UI badges). */
export function pendingRetryCount(): number {
  return queue.length;
}

/** Manual flush trigger (e.g., pull-to-refresh or a "Sync now" button). */
export function flushRetries(): Promise<number> {
  return flush();
}

function startWorkers(): void {
  if (started) return;
  started = true;

  if (typeof window === "undefined") return;

  if (!listenersAttached) {
    listenersAttached = true;
    window.addEventListener("online", () => {
      void flush();
    });
    window.addEventListener("focus", () => {
      void flush();
    });
  }

  // Periodic sweep every 30s while anything is pending.
  setInterval(() => {
    if (queue.length > 0) void flush();
  }, 30_000);
}

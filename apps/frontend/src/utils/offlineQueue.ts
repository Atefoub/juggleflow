export type PendingProgressUpdate = {
  trickId: number;
  status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  masteryScore?: number;
  queuedAt: string; // ISO
};

function key(userId: number | string): string {
  return `pending_progress_updates:${userId}`;
}

export function enqueueProgressUpdate(
  userId: number | string,
  update: Omit<PendingProgressUpdate, 'queuedAt'>
): void {
  try {
    const k = key(userId);
    const raw = localStorage.getItem(k);
    const list: PendingProgressUpdate[] = raw ? JSON.parse(raw) : [];
    list.push({ ...update, queuedAt: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(list.slice(-50))); // borne simple
  } catch {
    // ignore
  }
}

export function getPendingProgressUpdatesCount(userId: number | string): number {
  try {
    const raw = localStorage.getItem(key(userId));
    const list: PendingProgressUpdate[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

export async function flushProgressUpdates(
  userId: number | string,
  apply: (u: PendingProgressUpdate) => Promise<void>
): Promise<{ applied: number; failed: number }> {
  let list: PendingProgressUpdate[] = [];
  try {
    const raw = localStorage.getItem(key(userId));
    list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return { applied: 0, failed: 0 };
  } catch {
    return { applied: 0, failed: 0 };
  }

  let applied = 0;
  let failed = 0;

  // On applique en FIFO. Si une requête échoue, on stoppe et garde le reste.
  const remaining: PendingProgressUpdate[] = [];
  for (const u of list) {
    try {
      await apply(u);
      applied += 1;
    } catch {
      failed += 1;
      remaining.push(u, ...list.slice(list.indexOf(u) + 1));
      break;
    }
  }

  try {
    if (remaining.length === 0) localStorage.removeItem(key(userId));
    else localStorage.setItem(key(userId), JSON.stringify(remaining));
  } catch {
    // ignore
  }

  return { applied, failed };
}


export type PendingProgressUpdate = {
  trickId: number;
  status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  masteryScore?: number;
  queuedAt: string; // ISO
};

function key(userId: number | string): string {
  return `pending_progress_updates:${userId}`;
}

function readList(userId: number | string): PendingProgressUpdate[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const list: PendingProgressUpdate[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeList(userId: number | string, list: PendingProgressUpdate[]): void {
  try {
    if (list.length === 0) {
      localStorage.removeItem(key(userId));
      return;
    }
    localStorage.setItem(key(userId), JSON.stringify(list.slice(-50))); // borne simple
  } catch {
    // ignore
  }
}

export function enqueueProgressUpdate(
  userId: number | string,
  update: Omit<PendingProgressUpdate, 'queuedAt'>
): void {
  const list = readList(userId);
  const next: PendingProgressUpdate = { ...update, queuedAt: new Date().toISOString() };

  // Compaction: une seule entrée par trickId (dernière action gagne).
  const idx = list.findIndex((x) => x.trickId === update.trickId);
  if (idx >= 0) list.splice(idx, 1);

  list.push(next);
  writeList(userId, list);
}

export function getPendingProgressUpdatesCount(userId: number | string): number {
  return readList(userId).length;
}

export function getPendingProgressUpdates(userId: number | string): PendingProgressUpdate[] {
  // Tri stable par date de queue (au cas où).
  const list = readList(userId);
  return [...list].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

export async function flushProgressUpdates(
  userId: number | string,
  apply: (u: PendingProgressUpdate) => Promise<void>
): Promise<{ applied: number; failed: number }> {
  const list = getPendingProgressUpdates(userId);
  if (list.length === 0) return { applied: 0, failed: 0 };

  let applied = 0;
  let failed = 0;

  // On applique en FIFO. Si une requête échoue, on stoppe et garde le reste.
  const remaining: PendingProgressUpdate[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const u = list[i];
    try {
      await apply(u);
      applied += 1;
    } catch {
      failed += 1;
      remaining.push(...list.slice(i));
      break;
    }
  }

  writeList(userId, remaining);

  return { applied, failed };
}


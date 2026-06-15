export type PendingProgressUpdate = {
  trickId: number;
  status: 'MASTERED' | 'IN_PROGRESS' | 'NOT_STARTED';
  masteryScore?: number;
  queuedAt: string; // ISO
};

/** Canal BroadcastChannel pour notifier les autres onglets d'une mise en file. */
export const PROGRESS_QUEUE_CHANNEL = 'juggleflow-progress-queue';

const MAX_PENDING_UPDATES = 50;

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
    localStorage.setItem(key(userId), JSON.stringify(list.slice(-MAX_PENDING_UPDATES)));
  } catch {
    // ignore
  }
}

function entryKey(u: PendingProgressUpdate): string {
  return `${u.trickId}|${u.queuedAt}`;
}

function notifyQueueChanged(userId: number | string): void {
  try {
    new BroadcastChannel(PROGRESS_QUEUE_CHANNEL).postMessage({ userId });
  } catch {
    // BroadcastChannel indisponible
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
  notifyQueueChanged(userId);
}

export function getPendingProgressUpdatesCount(userId: number | string): number {
  return readList(userId).length;
}

export function getPendingProgressUpdates(userId: number | string): PendingProgressUpdate[] {
  // Tri stable par date de queue (au cas où).
  const list = readList(userId);
  return [...list].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
}

/** Fusionne la progression locale en attente pour l'affichage hors-ligne. */
export function mergePendingIntoProgress<T extends { trickId: number; status: string }>(
  userId: number | string,
  items: T[],
): T[] {
  const map = new Map(items.map((p) => [p.trickId, p]));
  for (const u of getPendingProgressUpdates(userId)) {
    const existing = map.get(u.trickId);
    map.set(u.trickId, {
      ...(existing ?? {
        trickId: u.trickId,
        trickName: '',
        masteryScore: null,
        updatedAt: null,
      }),
      trickId: u.trickId,
      status: u.status,
      updatedAt: u.queuedAt,
      ...(u.masteryScore !== undefined ? { masteryScore: u.masteryScore } : {}),
    } as T);
  }
  return [...map.values()];
}

async function doFlushProgressUpdates(
  userId: number | string,
  apply: (u: PendingProgressUpdate) => Promise<void>
): Promise<{ applied: number; failed: number }> {
  const list = getPendingProgressUpdates(userId);
  if (list.length === 0) return { applied: 0, failed: 0 };

  let applied = 0;
  let failed = 0;
  const appliedKeys = new Set<string>();

  // On applique en FIFO. Si une requête échoue, on stoppe et garde le reste.
  for (let i = 0; i < list.length; i += 1) {
    const u = list[i];
    try {
      await apply(u);
      applied += 1;
      appliedKeys.add(entryKey(u));
    } catch {
      failed += 1;
      break;
    }
  }

  if (applied === 0) {
    return { applied, failed };
  }

  // Relire la file courante : ne retirer que les entrées réellement appliquées.
  const stillPending = getPendingProgressUpdates(userId).filter(
    (u) => !appliedKeys.has(entryKey(u)),
  );
  writeList(userId, stillPending);
  notifyQueueChanged(userId);

  return { applied, failed };
}

export async function flushProgressUpdates(
  userId: number | string,
  apply: (u: PendingProgressUpdate) => Promise<void>
): Promise<{ applied: number; failed: number }> {
  const lockName = `juggleflow-flush-${userId}`;

  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(lockName, () => doFlushProgressUpdates(userId, apply));
  }

  return doFlushProgressUpdates(userId, apply);
}

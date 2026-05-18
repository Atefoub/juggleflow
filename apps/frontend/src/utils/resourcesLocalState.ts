const MODULE_KEY = 'resources_brain_module_started';
const CHAPTERS_KEY = 'resources_brain_chapters';

function key(userId: number | string): string {
  return `${MODULE_KEY}:${userId}`;
}

function chaptersKey(userId: number | string): string {
  return `${CHAPTERS_KEY}:${userId}`;
}

export function getBrainModuleStarted(userId: number | string): boolean {
  try {
    const chapters = getBrainChaptersCompleted(userId);
    if (chapters.length > 0) return true;
    return localStorage.getItem(key(userId)) === '1';
  } catch {
    return false;
  }
}

export function setBrainModuleStarted(userId: number | string, started: boolean): void {
  try {
    if (started) localStorage.setItem(key(userId), '1');
    else {
      localStorage.removeItem(key(userId));
      localStorage.removeItem(chaptersKey(userId));
    }
  } catch {
    // ignore
  }
}

export function getBrainChaptersCompleted(userId: number | string): number[] {
  try {
    const raw = localStorage.getItem(chaptersKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 3)
      : [];
  } catch {
    return [];
  }
}

export function setBrainChaptersCompleted(userId: number | string, chapters: number[]): void {
  try {
    localStorage.setItem(chaptersKey(userId), JSON.stringify(chapters));
    if (chapters.length > 0) localStorage.setItem(key(userId), '1');
  } catch {
    // ignore
  }
}

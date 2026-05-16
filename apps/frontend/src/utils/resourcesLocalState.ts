const MODULE_KEY = 'resources_brain_module_started';

function key(userId: number | string): string {
  return `${MODULE_KEY}:${userId}`;
}

export function getBrainModuleStarted(userId: number | string): boolean {
  try {
    return localStorage.getItem(key(userId)) === '1';
  } catch {
    return false;
  }
}

export function setBrainModuleStarted(userId: number | string, started: boolean): void {
  try {
    if (started) localStorage.setItem(key(userId), '1');
    else localStorage.removeItem(key(userId));
  } catch {
    // ignore
  }
}

export const PROGRESS_UPDATED_EVENT = 'juggleflow:progress-updated';

export function dispatchProgressUpdated(detail?: { trickId?: number }): void {
  window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail }));
}

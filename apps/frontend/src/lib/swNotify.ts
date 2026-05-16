export function notifyServiceWorkerProgressSynced(): void {
  if (!('serviceWorker' in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage({ type: 'BROADCAST_SYNC_PROGRESS_DONE' });
    return;
  }
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage({ type: 'BROADCAST_SYNC_PROGRESS_DONE' }))
    .catch(() => undefined);
}

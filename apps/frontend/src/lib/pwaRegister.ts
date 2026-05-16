import { registerSW } from 'virtual:pwa-register';

export const PWA_UPDATE_EVENT = 'juggleflow:pwa-update';
export const PWA_OFFLINE_READY_EVENT = 'juggleflow:pwa-offline-ready';

let applyPwaUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function registerPwa(): void {
  applyPwaUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent(PWA_OFFLINE_READY_EVENT));
    },
  });
}

export function reloadPwa(): void {
  void applyPwaUpdate?.(true);
}

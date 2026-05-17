/** Stub Vitest pour `virtual:pwa-register` (vite-plugin-pwa). */
export function registerSW(_options?: unknown) {
  return async (_reloadPage?: boolean): Promise<void> => {
    void _options;
    void _reloadPage;
    await Promise.resolve();
  };
}

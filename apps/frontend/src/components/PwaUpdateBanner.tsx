import { useEffect, useState } from 'react';
import { PWA_UPDATE_EVENT, reloadPwa } from '../lib/pwaRegister';

export default function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener(PWA_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-[#1A1028] border-b border-brand/40 shadow-lg max-w-107.5 mx-auto"
    >
      <p className="text-xs text-brand-end">Une nouvelle version de JuggleFlow est disponible.</p>
      <button
        type="button"
        onClick={reloadPwa}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-linear-to-br from-brand to-brand-end"
      >
        Mettre à jour
      </button>
    </div>
  );
}

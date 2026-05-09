import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner({
  message = 'Hors connexion — certaines données peuvent être limitées si elles n’ont pas été consultées auparavant.',
  className = '',
}: {
  message?: string;
  className?: string;
}) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className={['p-3 rounded-xl bg-[#1A1208] border border-cta/30', className].join(' ')}>
      <p className="text-xs text-cta">{message}</p>
    </div>
  );
}


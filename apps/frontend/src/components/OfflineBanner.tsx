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
    <div className={['rounded-xl border border-brand/35 bg-[#1A1028] p-3', className].join(' ')}>
      <p className="text-xs text-brand-end">{message}</p>
    </div>
  );
}


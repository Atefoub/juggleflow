import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppIcon from '../../components/icons/AppIcon';
import BottomNav from '../../components/BottomNav';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';
import ProgressBar from '../../components/ProgressBar';
import { getTrickDetail } from '../../api/catalogueOffline';
import { LEVEL_LABELS, type TrickResponse } from '../../api/catalogueApi';
import { studentApi } from '../../api/studentApi';
import { useAuth } from '../../context/AuthContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { enqueueProgressUpdate } from '../../utils/offlineQueue';
import { dispatchProgressUpdated } from '../../lib/progressEvents';
import OfflineBanner from '../../components/OfflineBanner';
import AnimationPreview from '../../components/catalogue/AnimationPreview';

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'MASTERED';

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function StudentSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  const trickId = useMemo(() => (id ? Number(id) : NaN), [id]);

  const [trick, setTrick]             = useState<TrickResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [isRunning, setIsRunning]     = useState(true);
  const [elapsed, setElapsed]         = useState(0);
  const [saving, setSaving]           = useState(false);
  const [status, setStatus]           = useState<ProgressStatus>('IN_PROGRESS');
  const [offlineHint, setOfflineHint] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(trickId)) {
      setError('Identifiant de figure invalide.');
      setLoading(false);
      return;
    }

    Promise.all([
      getTrickDetail(isOnline, trickId),
      isOnline
        ? studentApi.updateProgress(trickId, { status: 'IN_PROGRESS' }).catch(() => { /* empty */ })
        : Promise.resolve(),
    ])
      .then(([t]) => {
        setTrick(t);

        if (!isOnline && user?.id) {
          // En offline, on met en file d'attente la mise à jour "en cours" pour sync plus tard.
          enqueueProgressUpdate(user.id, { trickId, status: 'IN_PROGRESS' });
        }

        dispatchProgressUpdated({ trickId });
      })
      .catch(() => setError('Impossible de démarrer la session.'))
      .finally(() => setLoading(false));
  }, [trickId, isOnline, user?.id]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  async function markMastered() {
    if (!trick) return;
    if (!user?.id) return;
    setSaving(true);
    try {
      if (!isOnline) {
        enqueueProgressUpdate(user.id, { trickId: trick.id, status: 'MASTERED', masteryScore: 10 });
        setOfflineHint('Sauvegardé en attente. La progression sera synchronisée dès le retour de la connexion.');
      } else {
        await studentApi.updateProgress(trick.id, { status: 'MASTERED', masteryScore: 10 });
      }
      setStatus('MASTERED');
      dispatchProgressUpdated({ trickId: trick.id });
    } catch {
      setError('Impossible de sauvegarder. Réessaie.');
    } finally {
      setSaving(false);
    }
  }

  const targetSeconds = Math.max(
    60,
    ((trick?.estimatedLearningDuration ?? 5) * 60)
  );
  const percent = Math.min((elapsed / targetSeconds) * 100, 100);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex items-center gap-1 text-xs text-text-muted mb-4 hover:text-text-secondary transition-colors"
        >
          ← Retour
        </button>

        {loading ? (
          <div className="h-10 rounded-xl animate-pulse bg-bg-card" />
        ) : trick ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-bold text-text-primary text-xl leading-tight">
                Session — {trick.name}
              </h1>
              <p className="text-xs text-text-muted mt-1">
                Niveau {LEVEL_LABELS[trick.levelName ?? 'Beginner'] ?? (trick.levelName ?? '—')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Temps</p>
              <p className="font-display text-2xl font-bold text-white">{formatDuration(elapsed)}</p>
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <OfflineBanner message="Hors connexion — tu peux pratiquer, et tes actions seront synchronisées plus tard." />

        {error && (
          <div className="p-4 rounded-2xl text-sm text-center text-alert bg-[#2A1020] border border-alert">
            {error}
          </div>
        )}

        {offlineHint && (
          <div className="p-3 rounded-2xl text-xs text-text-secondary bg-bg-card border border-border">
            {offlineHint}
          </div>
        )}

        {!loading && !error && trick && (
          <>
            <AnimationPreview trick={trick} variant="session" />

            <section className="p-4 rounded-2xl bg-bg-card border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Objectif (suggestion)</span>
                <span className="text-xs text-text-muted">
                  {Math.round(targetSeconds / 60)} min
                </span>
              </div>
              <ProgressBar value={percent} color="linear-gradient(90deg, #8B2BE2, #C724B1)" height="8px" />
              <p className="text-xs text-text-secondary mt-2">
                Concentre-toi sur la régularité. Fais une pause si tu fatigues.
              </p>
            </section>

            <section className="p-4 rounded-2xl bg-bg-card border border-border">
              <h2 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-3">
                Contrôles
              </h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRunning((v) => !v)}
                  className="jf-btn-secondary flex-1 min-h-11 rounded-2xl py-3 text-sm"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <AppIcon name={isRunning ? 'pause' : 'play'} size={18} label={isRunning ? 'Pause' : 'Reprendre'} />
                    {isRunning ? 'Pause' : 'Reprendre'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setElapsed(0); setIsRunning(true); }}
                  className="jf-btn-secondary flex-1 min-h-11 rounded-2xl py-3 text-sm"
                >
                  ↺ Réinitialiser
                </button>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={markMastered}
                disabled={saving || status === 'MASTERED' || !user?.id}
                className={[
                  'w-full py-3 rounded-2xl text-sm font-semibold min-h-11 transition-opacity',
                  status === 'MASTERED'
                    ? 'bg-success/20 text-success border border-success/40 cursor-default'
                    : 'bg-linear-to-br from-brand to-brand-end text-white hover:opacity-90',
                ].join(' ')}
              >
                {saving ? (
                  'Sauvegarde…'
                ) : status === 'MASTERED' ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <AppIcon name="status-mastered" size={18} label="Maîtrisée" />
                    Figure maîtrisée !
                  </span>
                ) : (
                  'Marquer comme maîtrisée'
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/student/trick/${trick.id}`)}
                className="jf-btn-secondary w-full min-h-11 rounded-2xl py-3 text-sm"
              >
                Retour à la fiche de la figure
              </button>
            </section>
          </>
        )}
      </main>

      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}


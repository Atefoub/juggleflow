import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import { useEffect, useMemo, useState } from 'react';
import { adminApi, type AdminSchoolClass } from '../../api/adminApi';

const navItems = [
  { label: 'Utilisateurs', icon: '👥', path: '/admin/users' },
  { label: 'Classes',      icon: '🏫', path: '/admin/classes' },
  { label: 'RGPD',         icon: '🔒', path: '/admin/rgpd' },
];

const LICENSE = {
  plan: 'Pack École',
  maxUsers: 60,
  usedUsers: 51,
  expiresAt: '30/06/2026',
};

function cycleLabel(level: string): string {
  if (['PS', 'MS', 'GS'].includes(level)) return 'Cycle 1';
  if (['CP', 'CE1', 'CE2'].includes(level)) return 'Cycle 2';
  if (['CM1', 'CM2'].includes(level)) return 'Cycle 3';
  return '—';
}

export default function AdminClassesPage() {
  const usedPercent = Math.round((LICENSE.usedUsers / LICENSE.maxUsers) * 100);
  const available   = LICENSE.maxUsers - LICENSE.usedUsers;
  const [classes, setClasses] = useState<AdminSchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminApi.getClasses();
        if (!cancelled) setClasses(data);
      } catch {
        if (!cancelled) setError('Impossible de charger les classes.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    return [...classes].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [classes]);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary font-body max-w-107.5 mx-auto pb-20">

      {/* Header */}
      <header className="px-5 pt-12 pb-4 bg-[#0D1235] border-b border-border">
        <h1 className="font-display font-bold text-text-primary text-2xl mb-1">Classes &amp; Licences</h1>
        <p className="text-xs text-text-muted">École Jules Ferry · Licence active jusqu'au {LICENSE.expiresAt}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* License card */}
        <section>
          <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider mb-3">
            Licence établissement
          </h2>
          <div className="p-4 rounded-2xl bg-bg-card border border-border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-text-primary">{LICENSE.plan} — {LICENSE.maxUsers} utilisateurs</p>
                <p className="text-xs text-text-muted mt-0.5">Renouvellement : {LICENSE.expiresAt}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-success/10 border border-success/30 text-success font-semibold shrink-0">
                Actif
              </span>
            </div>

            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Utilisation : {LICENSE.usedUsers} / {LICENSE.maxUsers}</span>
              <span>{usedPercent}%</span>
            </div>
            <ProgressBar
              value={usedPercent}
              color={usedPercent > 90 ? '#FF4D4D' : '#8B2BE2'}
              height="6px"
            />
            <p className="text-xs text-text-muted mt-1">
              {available} licence{available > 1 ? 's' : ''} disponible{available > 1 ? 's' : ''}
            </p>
          </div>
        </section>

        {/* Classes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-text-primary text-sm uppercase tracking-wider">
              Classes
            </h2>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-admin/20 border border-admin/40 text-xs font-semibold text-white min-h-8">
              + Classe
            </button>
          </div>

          {isLoading && (
            <p className="text-sm text-text-muted text-center py-8">Chargement…</p>
          )}

          {!isLoading && error && (
            <p className="text-sm text-alert text-center py-8">{error}</p>
          )}

          {!isLoading && !error && (
            <div className="flex flex-col gap-3">
              {sorted.map((cls) => (
                <div key={cls.id} className="p-4 rounded-2xl bg-bg-card border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-text-primary">{cls.name}</p>
                      <p className="text-xs text-text-muted">
                        {cls.studentCount} élèves · {cycleLabel(cls.schoolLevel)}
                      </p>
                    </div>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-border text-text-secondary min-h-8">
                      Gérer
                    </button>
                  </div>

                  <div className="flex gap-3 mb-3">
                    <div className="flex-1 p-2 rounded-xl bg-bg-primary border border-border text-center">
                      <p className="font-display font-bold text-brand text-xl">{cls.studentCount}</p>
                      <p className="text-[0.6rem] text-text-muted">Élèves</p>
                    </div>
                    <div className="flex-1 p-2 rounded-xl bg-bg-primary border border-border text-center">
                      <p className="font-display font-bold text-text-primary text-xl">
                        {cls.homeroomTeacherName ?? '—'}
                      </p>
                      <p className="text-[0.6rem] text-text-muted">Enseignant</p>
                    </div>
                    <div className="flex-1 p-2 rounded-xl bg-bg-primary border border-border text-center">
                      <p className="font-display font-bold text-text-muted text-xl">{cls.schoolYear}</p>
                      <p className="text-[0.6rem] text-text-muted">Année</p>
                    </div>
                  </div>

                  <ProgressBar value={0} color="#8B2BE2" height="5px" />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import ProgressBar from '../../components/ProgressBar';
import {
  teacherApi,
  GROUP_COLOR_MAP,
  GROUP_LABEL_MAP,
  type SchoolClass,
  type StudentSummary,
} from '../../api/teacherApi';

const navItems = [
  { label: "Vue d'ensemble", icon: '📊', path: '/teacher/dashboard' },
  { label: 'Élèves',         icon: '👦', path: '/teacher/eleves' },
  { label: 'Parcours',       icon: '📚', path: '/teacher/parcours' },
  { label: 'Ressources',     icon: '📁', path: '/teacher/ressources' },
];

// Regroupe les élèves par couleur de groupe pour l'affichage synthétique
function groupStudents(students: StudentSummary[]) {
  const groups: Record<StudentSummary['groupColor'], StudentSummary[]> = {
    VERT: [], ORANGE: [], ROUGE: [],
  };
  for (const s of students) {
    groups[s.groupColor].push(s);
  }
  return groups;
}

function averageProgress(students: StudentSummary[]): number {
  if (students.length === 0) return 0;
  return Math.round(
    students.reduce((sum, s) => sum + s.progressionPercent, 0) / students.length
  );
}

export default function TeacherDashboardPage() {
  const { user, logout } = useAuth();

  const [classes, setClasses]   = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // 1. Charge les classes de l'enseignant
  useEffect(() => {
    teacherApi
      .getMyClasses()
      .then((cls) => {
        setClasses(cls);
        if (cls.length > 0) setSelectedClass(cls[0]);
      })
      .catch(() => setError('Impossible de charger vos classes.'))
      .finally(() => setLoading(false));
  }, []);

  // 2. Charge les élèves de la classe sélectionnée
  useEffect(() => {
    if (!selectedClass) return;
    setStudents([]);
    teacherApi
      .getClassStudents(selectedClass.id)
      .then(setStudents)
      .catch(() => setError('Impossible de charger les élèves de cette classe.'));
  }, [selectedClass]);

  const groups   = groupStudents(students);
  const avgProgress = averageProgress(students);
  const blockedStudents = students.filter((s) => s.groupColor === 'ROUGE');

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#0A0E2A',
        fontFamily: 'DM Sans, sans-serif',
        maxWidth: '430px',
        margin: '0 auto',
        paddingBottom: '80px',
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-12 pb-4"
        style={{ backgroundColor: '#0D1235', borderBottom: '1px solid #1E2847' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0 text-xs"
            style={{ width: '40px', height: '40px', backgroundColor: '#4068D8' }}
          >
            Prof
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </p>
            {selectedClass && (
              <p className="text-xs" style={{ color: '#5A6480' }}>
                {selectedClass.name} · {selectedClass.studentCount} élève{selectedClass.studentCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={logout}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ backgroundColor: '#1E2847', color: '#A0AABF' }}
          >
            Quitter
          </button>
        </div>

        {/* Sélecteur de classe si plusieurs */}
        {classes.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className="flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold"
                style={{
                  backgroundColor: selectedClass?.id === cls.id ? '#4068D8' : '#1E2847',
                  color: selectedClass?.id === cls.id ? '#FFFFFF' : '#A0AABF',
                  border: '1px solid #1E2847',
                }}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

        {/* Erreur */}
        {error && (
          <div
            className="p-4 rounded-2xl text-sm text-center"
            style={{ backgroundColor: '#2A1020', color: '#FF4D4D', border: '1px solid #FF4D4D' }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{ height: '80px', backgroundColor: '#111638' }}
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Progression moyenne */}
            <div
              className="p-4 rounded-2xl flex items-center gap-4"
              style={{ backgroundColor: '#111638', border: '1px solid #1E2847' }}
            >
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#5A6480' }}>
                  Progression moyenne
                </p>
                <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {avgProgress}%
                </p>
                <p className="text-xs mt-1" style={{ color: '#A0AABF' }}>
                  {students.length} élève{students.length > 1 ? 's' : ''} dans la classe
                </p>
              </div>
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: '72px',
                  height: '72px',
                  border: '4px solid #8B2BE2',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {avgProgress}%
              </div>
            </div>

            {/* Groupes d'élèves */}
            {students.length > 0 && (
              <div>
                <h2
                  className="font-bold text-white text-sm uppercase tracking-wider mb-3"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  Groupes d'élèves
                </h2>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2847' }}>
                  {(['VERT', 'ORANGE', 'ROUGE'] as const)
                    .filter((color) => groups[color].length > 0)
                    .map((color, index, arr) => {
                      const group = groups[color];
                      const avg = averageProgress(group);
                      return (
                        <div
                          key={color}
                          className="flex items-center gap-3 p-4"
                          style={{
                            borderBottom: index < arr.length - 1 ? '1px solid #1E2847' : 'none',
                            backgroundColor: '#111638',
                          }}
                        >
                          <div
                            className="rounded-full flex-shrink-0"
                            style={{ width: '10px', height: '10px', backgroundColor: GROUP_COLOR_MAP[color] }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white">
                              Groupe {color.charAt(0) + color.slice(1).toLowerCase()}
                            </p>
                            <p className="text-xs" style={{ color: '#5A6480' }}>
                              {group.length} élève{group.length > 1 ? 's' : ''} · {GROUP_LABEL_MAP[color]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div style={{ width: '70px' }}>
                              <ProgressBar value={avg} color={GROUP_COLOR_MAP[color]} height="6px" />
                            </div>
                            <span className="text-sm font-bold text-white" style={{ minWidth: '32px', textAlign: 'right' }}>
                              {avg}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Alerte élèves bloqués */}
            {blockedStudents.length > 0 && (
              <div
                className="p-4 rounded-2xl flex items-start gap-3"
                style={{ backgroundColor: '#1A1020', border: '1px solid #2A1A10', borderLeft: '3px solid #FF7A00' }}
              >
                <span className="text-lg flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-white mb-1">
                    {blockedStudents.length} élève{blockedStudents.length > 1 ? 's' : ''} en difficulté
                  </p>
                  <p className="text-xs" style={{ color: '#A0AABF' }}>
                    {blockedStudents
                      .slice(0, 3)
                      .map((s) => `${s.firstName} ${s.lastName[0]}.`)
                      .join(', ')}
                    {blockedStudents.length > 3 && ` +${blockedStudents.length - 3} autres`}
                  </p>
                </div>
              </div>
            )}

            {/* Aucune classe */}
            {classes.length === 0 && (
              <div
                className="p-4 rounded-2xl text-sm"
                style={{ backgroundColor: '#111638', border: '1px solid #1E2847', color: '#A0AABF' }}
              >
                Vous n'avez pas encore de classe. Créez-en une pour commencer.
              </div>
            )}

            {/* Actions rapides */}
            <div>
              <h2
                className="font-bold text-white text-sm uppercase tracking-wider mb-3"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                Actions rapides
              </h2>
              <div className="flex flex-wrap gap-2">
                {[
                  '+ Assigner un parcours',
                  '↓ Générer rapport',
                  '+ Ajouter un élève',
                ].map((action) => (
                  <button
                    key={action}
                    className="px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{
                      backgroundColor: '#111638',
                      border: '1.5px solid #1E2847',
                      color: '#A0AABF',
                      minHeight: '44px',
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}
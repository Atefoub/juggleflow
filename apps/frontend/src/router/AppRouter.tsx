import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import { isOnboardingCompleted } from '../utils/onboarding';
import AdminLayout from '../components/admin/AdminLayout';

// Lazy pages (code-splitting)
const LoginPage            = lazy(() => import('../pages/LoginPage'));
const OnboardingPage       = lazy(() => import('../pages/student/OnboardingPage'));

const StudentDashboardPage = lazy(() => import('../pages/student/StudentDashboardPage'));
const CataloguePage        = lazy(() => import('../pages/student/CataloguePage'));
const TrickDetailPage      = lazy(() => import('../pages/student/TrickDetailPage'));
const StudentSessionPage   = lazy(() => import('../pages/student/StudentSessionPage'));
const ProgressPage         = lazy(() => import('../pages/student/ProgressPage'));
const BadgesPage           = lazy(() => import('../pages/student/BadgesPage'));
const StudentProfilePage   = lazy(() => import('../pages/student/StudentProfilePage'));
const ResourcesStudentPage = lazy(() => import('../pages/student/ResourcesStudentPage'));

const TeacherDashboardPage  = lazy(() => import('../pages/teacher/TeacherDashboardPage'));
const StudentDetailPage     = lazy(() => import('../pages/teacher/StudentDetailPage'));
const StudentListPage       = lazy(() => import('../pages/teacher/StudentListPage'));
const AssignPathPage        = lazy(() => import('../pages/teacher/AssignPathPage'));
const ResourcesTeacherPage  = lazy(() => import('../pages/teacher/ResourcesTeacherPage'));
const TeacherPathDetailPage = lazy(() => import('../pages/teacher/TeacherPathDetailPage'));
const TeacherGroupsPage     = lazy(() => import('../pages/teacher/TeacherGroupsPage'));

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminUsersPage     = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminClassesPage   = lazy(() => import('../pages/admin/AdminClassesPage'));
const AdminRgpdPage      = lazy(() => import('../pages/admin/AdminRgpdPage'));
const AdminAuditPage     = lazy(() => import('../pages/admin/AdminAuditPage'));

function AppFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary font-body px-6">
      <div className="w-full max-w-100 p-4 rounded-2xl bg-bg-card border border-border">
        <div className="h-4 rounded bg-border w-2/3 mb-3 animate-pulse" />
        <div className="h-3 rounded bg-border w-full mb-2 animate-pulse" />
        <div className="h-3 rounded bg-border w-5/6 animate-pulse" />
      </div>
    </div>
  );
}

function redirectForRole(role: Role, userId?: number): string {
  switch (role) {
    case 'ROLE_ELEVE':          return isOnboardingCompleted(userId) ? '/student/dashboard' : '/onboarding';
    case 'ROLE_ENSEIGNANT':     return '/teacher/dashboard';
    case 'ROLE_ADMINISTRATEUR': return '/admin/dashboard';
    default:                    return '/login';
  }
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole !== undefined && user.role !== requiredRole)
    return <Navigate to={redirectForRole(user.role, user.id)} replace />;

  if (
    user.role === 'ROLE_ELEVE' &&
    !isOnboardingCompleted(user.id) &&
    location.pathname !== '/onboarding'
  ) return <Navigate to="/onboarding" replace />;

  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={redirectForRole(user.role, user.id)} replace />;
}

function OnboardingRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_ELEVE') return <Navigate to={redirectForRole(user.role, user.id)} replace />;
  if (isOnboardingCompleted(user.id)) return <Navigate to="/student/dashboard" replace />;
  return <OnboardingPage />;
}

const student = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="ROLE_ELEVE">{el}</ProtectedRoute>
);
const teacher = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="ROLE_ENSEIGNANT">{el}</ProtectedRoute>
);
const admin = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="ROLE_ADMINISTRATEUR">
    <AdminLayout>{el}</AdminLayout>
  </ProtectedRoute>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />

          {/* ── Élève ── */}
          <Route path="/student/dashboard"   element={student(<StudentDashboardPage />)} />
          <Route path="/student/catalogue"   element={student(<CataloguePage />)} />
          <Route path="/student/trick/:id"   element={student(<TrickDetailPage />)} />
          <Route path="/student/session/:id" element={student(<StudentSessionPage />)} />
          <Route path="/student/progression" element={student(<ProgressPage />)} />
          <Route path="/student/badges"      element={student(<BadgesPage />)} />
          <Route path="/student/profil"      element={student(<StudentProfilePage />)} />
          <Route path="/student/resources"   element={student(<ResourcesStudentPage />)} />

          {/* ── Enseignant ── */}
          <Route path="/teacher/dashboard"        element={teacher(<TeacherDashboardPage />)} />
          <Route path="/teacher/eleves"           element={teacher(<StudentListPage />)} />
          <Route path="/teacher/eleve/:id"        element={teacher(<StudentDetailPage />)} />
          <Route path="/teacher/groupes"          element={teacher(<TeacherGroupsPage />)} />
          <Route path="/teacher/parcours/assigner" element={teacher(<AssignPathPage />)} />
          <Route path="/teacher/classe/:classId/parcours/:pathId" element={teacher(<TeacherPathDetailPage />)} />
          <Route path="/teacher/ressources"       element={teacher(<ResourcesTeacherPage />)} />

          {/* ── Administrateur ── */}
          <Route path="/admin/dashboard" element={admin(<AdminDashboardPage />)} />
          <Route path="/admin/users"     element={admin(<AdminUsersPage />)} />
          <Route path="/admin/classes"   element={admin(<AdminClassesPage />)} />
          <Route path="/admin/rgpd"      element={admin(<AdminRgpdPage />)} />
          <Route path="/admin/audit"     element={admin(<AdminAuditPage />)} />

          {/* ── Fallbacks ── */}
          <Route path="/"  element={<DefaultRedirect />} />
          <Route path="*"  element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
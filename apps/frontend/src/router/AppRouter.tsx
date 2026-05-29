import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import { isStudentOnboardingDone } from '../utils/onboarding';
import AdminLayout from '../components/admin/AdminLayout';
import AppThemeSync from '../components/AppThemeSync';
import TeacherLayout from '../components/teacher/TeacherLayout';

// Lazy pages (code-splitting)
const LoginPage            = lazy(() => import('../pages/LoginPage'));
const ForgotPasswordPage   = lazy(() => import('../pages/ForgotPasswordPage'));
const OnboardingPage       = lazy(() => import('../pages/student/OnboardingPage'));

const StudentDashboardPage = lazy(() => import('../pages/student/StudentDashboardPage'));
const CataloguePage        = lazy(() => import('../pages/student/CataloguePage'));
const TrickDetailPage      = lazy(() => import('../pages/student/TrickDetailPage'));
const StudentSessionPage   = lazy(() => import('../pages/student/StudentSessionPage'));
const ProgressPage         = lazy(() => import('../pages/student/ProgressPage'));
const BadgesPage           = lazy(() => import('../pages/student/BadgesPage'));
const StudentProfilePage   = lazy(() => import('../pages/student/StudentProfilePage'));
const ResourcesStudentPage = lazy(() => import('../pages/student/ResourcesStudentPage'));
const StudentLearningPathPage = lazy(() => import('../pages/student/StudentLearningPathPage'));

const TeacherDashboardPage  = lazy(() => import('../pages/teacher/TeacherDashboardPage'));
const StudentDetailPage     = lazy(() => import('../pages/teacher/StudentDetailPage'));
const StudentListPage       = lazy(() => import('../pages/teacher/StudentListPage'));
const AssignPathPage        = lazy(() => import('../pages/teacher/AssignPathPage'));
const ResourcesTeacherPage  = lazy(() => import('../pages/teacher/ResourcesTeacherPage'));
const TeacherPathDetailPage = lazy(() => import('../pages/teacher/TeacherPathDetailPage'));
const GroupManagementPage   = lazy(() => import('../pages/teacher/GroupManagementPage'));

const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminUsersPage     = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminClassesPage   = lazy(() => import('../pages/admin/AdminClassesPage'));
const AdminRgpdPage      = lazy(() => import('../pages/admin/AdminRgpdPage'));
const AdminAuditPage     = lazy(() => import('../pages/admin/AdminAuditPage'));
const AdminResourcesPage = lazy(() => import('../pages/admin/AdminResourcesPage'));

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

function redirectForRole(role: Role, user?: { id: number; onboardingCompleted?: boolean } | null): string {
  switch (role) {
    case 'ROLE_ELEVE':
      return user && !isStudentOnboardingDone(user) ? '/onboarding' : '/student/dashboard';
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
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppFallback />;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole !== undefined && user.role !== requiredRole)
    return <Navigate to={redirectForRole(user.role, user)} replace />;

  if (
    user.role === 'ROLE_ELEVE' &&
    !isStudentOnboardingDone(user) &&
    location.pathname !== '/onboarding'
  ) return <Navigate to="/onboarding" replace />;

  return children;
}

function DefaultRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={redirectForRole(user.role, user)} replace />;
}

function OnboardingRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ROLE_ELEVE') return <Navigate to={redirectForRole(user.role, user)} replace />;
  if (isStudentOnboardingDone(user)) return <Navigate to="/student/dashboard" replace />;
  return <OnboardingPage />;
}

const student = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="ROLE_ELEVE">{el}</ProtectedRoute>
);
const teacher = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="ROLE_ENSEIGNANT">
    <TeacherLayout>{el}</TeacherLayout>
  </ProtectedRoute>
);
const admin = (el: React.ReactNode) => (
  <ProtectedRoute requiredRole="ROLE_ADMINISTRATEUR">
    <AdminLayout>{el}</AdminLayout>
  </ProtectedRoute>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppThemeSync />
      <Suspense fallback={<AppFallback />}>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/login/forgot"     element={<ForgotPasswordPage />} />
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
          <Route path="/student/parcours"     element={student(<StudentLearningPathPage />)} />
          <Route path="/student/parcours/:pathId" element={student(<StudentLearningPathPage />)} />

          {/* ── Enseignant ── */}
          <Route path="/teacher/dashboard"        element={teacher(<TeacherDashboardPage />)} />
          <Route path="/teacher/eleves"           element={teacher(<StudentListPage />)} />
          <Route path="/teacher/groupes"         element={teacher(<GroupManagementPage />)} />
          <Route path="/teacher/eleve/:id"        element={teacher(<StudentDetailPage />)} />
          <Route path="/teacher/parcours/assigner" element={teacher(<AssignPathPage />)} />
          <Route path="/teacher/classe/:classId/parcours/:pathId" element={teacher(<TeacherPathDetailPage />)} />
          <Route path="/teacher/ressources"       element={teacher(<ResourcesTeacherPage />)} />

          {/* ── Administrateur ── */}
          <Route path="/admin/dashboard" element={admin(<AdminDashboardPage />)} />
          <Route path="/admin/users"     element={admin(<AdminUsersPage />)} />
          <Route path="/admin/classes"   element={admin(<AdminClassesPage />)} />
          <Route path="/admin/resources" element={admin(<AdminResourcesPage />)} />
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
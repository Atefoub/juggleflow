import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';

// Public
import LoginPage from '../pages/LoginPage';
import OnboardingPage from '../pages/student/OnboardingPage';

// Student
import StudentDashboardPage from '../pages/student/StudentDashboardPage';
import CataloguePage        from '../pages/student/CataloguePage';
import TrickDetailPage      from '../pages/student/TrickDetailPage';
import StudentSessionPage   from '../pages/student/StudentSessionPage';
import ProgressPage         from '../pages/student/ProgressPage';
import BadgesPage           from '../pages/student/BadgesPage';
import StudentProfilePage   from '../pages/student/StudentProfilePage';
import ResourcesStudentPage from '../pages/student/ResourcesStudentPage';

// Teacher
import TeacherDashboardPage  from '../pages/teacher/TeacherDashboardPage';
import StudentDetailPage     from '../pages/teacher/StudentDetailPage';
import StudentListPage       from '../pages/teacher/StudentListPage';
import AssignPathPage        from '../pages/teacher/AssignPathPage';
import ResourcesTeacherPage  from '../pages/teacher/ResourcesTeacherPage';

// Admin
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminUsersPage     from '../pages/admin/AdminUsersPage';
import AdminClassesPage   from '../pages/admin/AdminClassesPage';
import AdminRgpdPage      from '../pages/admin/AdminRgpdPage';

import { isOnboardingCompleted } from '../utils/onboarding';

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
  <ProtectedRoute requiredRole="ROLE_ADMINISTRATEUR">{el}</ProtectedRoute>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
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
        <Route path="/teacher/parcours/assigner" element={teacher(<AssignPathPage />)} />
        <Route path="/teacher/ressources"       element={teacher(<ResourcesTeacherPage />)} />

        {/* ── Administrateur ── */}
        <Route path="/admin/dashboard" element={admin(<AdminDashboardPage />)} />
        <Route path="/admin/users"     element={admin(<AdminUsersPage />)} />
        <Route path="/admin/classes"   element={admin(<AdminClassesPage />)} />
        <Route path="/admin/rgpd"      element={admin(<AdminRgpdPage />)} />

        {/* ── Fallbacks ── */}
        <Route path="/"  element={<DefaultRedirect />} />
        <Route path="*"  element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
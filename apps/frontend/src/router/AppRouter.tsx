import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import LoginPage from '../pages/LoginPage';
import OnboardingPage from '../pages/student/OnboardingPage';
import StudentDashboardPage from '../pages/student/DashboardPage';
import TeacherDashboardPage from '../pages/teacher/DashboardPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import { isOnboardingCompleted } from '../utils/onboarding';

function redirectForRole(role: Role, userId?: number): string {
  switch (role) {
    case 'ROLE_ELEVE':
      return isOnboardingCompleted(userId) ? '/student/dashboard' : '/onboarding';
    case 'ROLE_ENSEIGNANT':
      return '/teacher/dashboard';
    case 'ROLE_ADMINISTRATEUR':
      return '/admin/dashboard';
    default:
      return '/login';
  }
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole !== undefined && user.role !== requiredRole) {
    return <Navigate to={redirectForRole(user.role, user.id)} replace />;
  }

  // Élève: force onboarding tant que non terminé
  if (
    user.role === 'ROLE_ELEVE' &&
    !isOnboardingCompleted(user.id) &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingRoute />} />

        {/* Élève */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole={'ROLE_ELEVE'}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Enseignant */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute requiredRole={'ROLE_ENSEIGNANT'}>
              <TeacherDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Administrateur */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole={'ROLE_ADMINISTRATEUR'}> {/* ✅ corrigé */}
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Racine → redirection selon rôle */}
        <Route path="/" element={<DefaultRedirect />} />

        {/* 404 → retour accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
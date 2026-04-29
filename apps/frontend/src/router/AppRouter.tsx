import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types/auth';
import LoginPage from '../pages/LoginPage';
import OnboardingPage from '../pages/OnboardingPage';
import StudentDashboardPage from '../pages/student/DashboardPage';
import TeacherDashboardPage from '../pages/teacher/DashboardPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';

function redirectForRole(role: Role): string {
  switch (role) {
    case 'ROLE_ELEVE':
      return '/student/dashboard';
    case 'ROLE_ENSEIGNANT':
      return '/teacher/dashboard';
    case 'ROLE_ADMINISTRATEUR': // ✅ corrigé
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole !== undefined && user.role !== requiredRole) {
    return <Navigate to={redirectForRole(user.role)} replace />;
  }

  return children;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={redirectForRole(user.role)} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

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
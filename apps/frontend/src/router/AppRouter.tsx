import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/auth';
import LoginPage from '../pages/LoginPage';
import OnboardingPage from '../pages/OnboardingPage';
import StudentDashboard from '../pages/student/DashboardPage';
import TeacherDashboard from '../pages/teacher/DashboardPage';

function RedirectByRole() {
  const { user } = useAuth();
  const roleMap: Record<Role, string> = {
    ROLE_ELEVE: '/dashboard',
    ROLE_ENSEIGNANT: '/teacher/dashboard',
    ROLE_ADMIN: '/admin/dashboard',
  };
  return <Navigate to={roleMap[user!.role]} replace />;
}

function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: Role[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0E2A]">
        <div className="w-8 h-8 border-2 border-[#8B2BE2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <RedirectByRole />;
  }
  return <>{children}</>;
}

export default function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0E2A]">
        <div className="w-8 h-8 border-2 border-[#8B2BE2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <RedirectByRole /> : <LoginPage />
          }
        />
        <Route
          path="/onboarding"
          element={
            <PrivateRoute allowedRoles={['ROLE_ELEVE']}>
              <OnboardingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={['ROLE_ELEVE']}>
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/teacher/dashboard"
          element={
            <PrivateRoute allowedRoles={['ROLE_ENSEIGNANT']}>
              <TeacherDashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
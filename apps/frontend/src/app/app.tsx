import AppRouter from '../router/AppRouter';
import { AuthProvider } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import SyncStatusBanner from '../components/SyncStatusBanner';
import PwaUpdateBanner from '../components/PwaUpdateBanner';
import AppThemeSync from '../components/AppThemeSync';

export function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <PwaUpdateBanner />
        <SyncStatusBanner />
        <AppThemeSync />
        <AppRouter />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
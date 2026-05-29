import AppRouter from '../router/AppRouter';
import { AuthProvider } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import SyncStatusBanner from '../components/SyncStatusBanner';
import PwaUpdateBanner from '../components/PwaUpdateBanner';

export function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <PwaUpdateBanner />
        <SyncStatusBanner />
        <AppRouter />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;
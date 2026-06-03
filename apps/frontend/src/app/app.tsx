import AppRouter from '../router/AppRouter';
import { AuthProvider } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import SyncStatusBanner from '../components/SyncStatusBanner';
import PwaUpdateBanner from '../components/PwaUpdateBanner';
import QueryProvider from '../providers/QueryProvider';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ErrorBoundary>
          <PwaUpdateBanner />
          <SyncStatusBanner />
          <AppRouter />
        </ErrorBoundary>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
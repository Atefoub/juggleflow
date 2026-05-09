import AppRouter from '../router/AppRouter';
import { AuthProvider } from '../context/AuthContext';
import SyncStatusBanner from '../components/SyncStatusBanner';

export function App() {
  return (
    <AuthProvider>
      <SyncStatusBanner />
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
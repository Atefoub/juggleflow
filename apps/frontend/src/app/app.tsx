import AppRouter from '../router/AppRouter';
import { AuthProvider } from '../context/AuthContext';
import SyncStatusBanner from '../components/SyncStatusBanner';
import PwaUpdateBanner from '../components/PwaUpdateBanner';

export function App() {
  return (
    <AuthProvider>
      <PwaUpdateBanner />
      <SyncStatusBanner />
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
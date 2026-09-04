import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth.store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function App() {
  const isAuthenticated = useAuthStore((s) => !!s.token);

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? <Dashboard /> : <Login />}
    </QueryClientProvider>
  );
}

export default App;

import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@utils/trpc';
import { useQueryTrpcClient } from './useQueryClient';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Home } from '../pages/Home';

export function App() {
  const { queryClient, trpcClient } = useQueryTrpcClient();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        theme="colored"
        hideProgressBar
        closeOnClick
      />
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;

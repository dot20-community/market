import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@utils/trpc';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './app';
import { useQueryTrpcClient } from './useQueryClient';

export function Root() {
  const { queryClient, trpcClient } = useQueryTrpcClient();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <ToastContainer
        position="bottom-right"
        autoClose={10000}
        theme="colored"
        hideProgressBar
        closeOnClick
      />
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;

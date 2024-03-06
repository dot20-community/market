import { QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@utils/trpc';
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Account } from '../pages/Account';
import { Home } from '../pages/Home';
import { Layout } from '../pages/Layout';
import { Market } from '../pages/Market';
import { NoMatch } from '../pages/NoMatch';
import { useQueryTrpcClient } from './useQueryClient';

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
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="account" element={<Account />} />
              <Route path="market" element={<Market />} />
              <Route path="*" element={<NoMatch />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;

import { useGlobalStateStore } from '@GlobalState';
import { trpc } from '@utils/trpc';
import { getGas } from '@utils/wallet';
import { planck2Dot } from 'apps/libs/util';
import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { Account } from '../pages/Account';
import { CrossChain } from '../pages/CrossChain';
import { Home } from '../pages/Home';
import { Layout } from '../pages/Layout';
import { Market } from '../pages/Market';
import { NoMatch } from '../pages/NoMatch';

export function App() {
  const { client } = trpc.useUtils();
  const { setDotPrice, setGasFee, setAssetInfo } = useGlobalStateStore();

  useEffect(() => {
    const fetchDotPrice = async () => {
      const dotPrice = await client.order.dotPrice.query();
      setDotPrice(dotPrice);
    };
    const fetchGasFee = async () => {
      const gas = await getGas();
      setGasFee(planck2Dot(gas).toNumber());
    };
    const fetchAssetInfos = async () => {
      const assets = await client.asset.trending.query();
      for (const asset of assets) {
        setAssetInfo({ ...asset, ...{ symbol: asset.symbol.toUpperCase() } });
      }
    };

    Promise.all([fetchDotPrice(), fetchGasFee(), fetchAssetInfos()]);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="account" element={<Account />} />
          <Route path="market" element={<Market />} />
          <Route path="cross-chain" element={<CrossChain />} />
          <Route path="*" element={<NoMatch />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

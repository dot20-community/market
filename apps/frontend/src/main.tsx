import { NextUIProvider } from '@nextui-org/react';
import {
  setAssetHubEndpoint,
  setPolkadotDecimals,
  setPolkadotEndpoint,
} from 'apps/libs/util';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { Root } from './app/root';
import './styles.css';

setPolkadotDecimals(import.meta.env.VITE_POLKADOT_DECIMALS);
setPolkadotEndpoint(import.meta.env.VITE_POLKADOT_ENDPOINT);
setAssetHubEndpoint(import.meta.env.VITE_ASSET_HUB_ENDPOINT);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <NextUIProvider>
      <Root />
    </NextUIProvider>
  </StrictMode>,
);

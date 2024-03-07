/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  readonly VITE_POLKADOT_ENDPOINT: string;
  readonly VITE_POLKADOT_DECIMALS: string;
  readonly VITE_MIN_SELL_TOTAL_PRICE: string;
  readonly VITE_SERVER_FEE_RATE: string;
  // more .env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

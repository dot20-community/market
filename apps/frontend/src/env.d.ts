/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  readonly VITE_POLKADOT_ENDPOINT: string;
  readonly VITE_POLKADOT_DECIMALS: string;
  // more .env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

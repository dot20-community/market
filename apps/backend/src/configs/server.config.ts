import { config } from 'dotenv';
import { get } from 'env-var';
import type { ServerOptions } from '../server/server';
config();

export const serverConfig: ServerOptions = {
  environment: get('NODE_ENV')
    .required()
    .asEnum(['development', 'production', 'test', 'local']),

  port: get('APP_PORT').required().asPortNumber(),
  prefix: get('API_PREFIX').required().asString(),
  polkadotEndpoint: get('VITE_POLKADOT_ENDPOINT').required().asString(),
  polkadotDecimals: get('VITE_POLKADOT_DECIMALS').required().asInt(),
  serverFeeRate: get('VITE_SERVER_FEE_RATE').required().asFloat(),
  minSellTotalPrice: get('VITE_MIN_SELL_TOTAL_PRICE').required().asFloat(),
};

import { serverConfig } from './configs/server.config';
import { createServer } from './server/server';
import { buyBlockCheck } from './service/trade';

console.log('================== start server ==================');
console.log('environment', serverConfig.environment);
console.log('marketAccount', serverConfig.marketAccount);
console.log('polkadotEndpoint', serverConfig.polkadotEndpoint);
console.log('polkadotDecimals', serverConfig.polkadotDecimals);

createServer(serverConfig).then((server) => server.start());

(async function () {
  async function buyBlockCheckTask() {
    while (true) {
      try {
        await buyBlockCheck();
      } catch (e) {
        console.error('buyTransferCheckTask error', e);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  Promise.all([buyBlockCheckTask()]);
})();

import { serverConfig } from './configs/server.config';
import { createServer } from './server/server';
import { syncAssets } from './service/asset';
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

  async function syncAssetsTask() {
    while (true) {
      try {
        await syncAssets();
      } catch (e) {
        console.error('syncAssetsTask error', e);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }
  }

  Promise.all([buyBlockCheckTask(), syncAssetsTask()]);
})();

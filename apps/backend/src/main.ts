import { serverConfig } from './configs/server.config';
import { createServer } from './server/server';
import {
  buyBlockCheck,
  buyInscribeCheck,
  sellCancelInscribeCheck,
  sellInscribeCheck,
} from './service/trade';

console.log('================== start server ==================');
console.log('environment', serverConfig.environment);
console.log('marketAccount', serverConfig.marketAccount);
console.log('polkadotEndpoint', serverConfig.polkadotEndpoint);
console.log('polkadotDecimals', serverConfig.polkadotDecimals);

createServer(serverConfig).then((server) => server.start());

(async function () {
  async function sellInscribeCheckTask() {
    while (true) {
      try {
        await sellInscribeCheck();
      } catch (e) {
        console.error('sellInscribeCheckTask error', e);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async function sellCancelInscribeCheckTask() {
    while (true) {
      try {
        await sellCancelInscribeCheck();
      } catch (e) {
        console.error('sellCancelInscribeCheckTask error', e);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

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

  async function buyInscribeCheckTask() {
    while (true) {
      try {
        await buyInscribeCheck();
      } catch (e) {
        console.error('buyInscribeCheckTask error', e);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  Promise.all([
    sellInscribeCheckTask(),
    sellCancelInscribeCheckTask(),
    buyBlockCheckTask(),
    buyInscribeCheckTask(),
  ]);
})();

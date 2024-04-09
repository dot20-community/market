import { BN } from '@polkadot/util';
import { getApi } from 'apps/libs/util';
import Decimal from 'decimal.js';
import { prisma } from '../server/context';

/**
 * 同步资产信息
 */
export async function syncAssets() {
  const assets = await prisma.asset.findMany();
  if (!assets.length) {
    return;
  }

  const api = await getApi();
  for (const asset of assets) {
    try {
      const assetsMetadata = (
        await api.query.assets.metadata(new BN(asset.assetId))
      )?.toHuman() as any;
      if (!assetsMetadata) {
        continue;
      }
      const assetsAsset = (
        await api.query.assets.asset(new BN(asset.assetId))
      )?.toHuman() as any;
      if (!assetsAsset) {
        continue;
      }
      await prisma.asset.update({
        where: {
          id: asset.id,
        },
        data: {
          symbol: assetsMetadata.symbol,
          decimals: parseInt(assetsMetadata.decimals),
          name: assetsMetadata.name.toString(),
          supply: new Decimal(assetsAsset.supply.replace(/,/g, '')),
          holder: parseInt(assetsAsset.accounts.replace(/,/g, '')),
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      console.warn(`syncAssets [${asset.assetId}] fail:`, e);
    }
  }
}

import { buildAssetTransfer, getApi } from 'apps/libs/util';
import Decimal from 'decimal.js';
import { serverConfig } from '../configs/server.config';
import { prisma } from '../server/context';
import { signExtrinsic, submitSignedExtrinsicAndWait } from '../util/dapp';

/**
 * 处理买家支付完，上链成功后，转铭文给买家
 */
export async function buyBlockCheck() {
  const needCheckOrderList = await prisma.order.findMany({
    where: {
      status: 'LOCKED',
      chainStatus: 'BUY_BLOCK_CONFIRMED',
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (!needCheckOrderList.length) {
    return;
  }

  const api = await getApi();

  for (const order of needCheckOrderList) {
    // 如果已经转账过了，跳过，防止重复转账
    if (order.tradeHash) {
      continue;
    }

    // 构造铭文转账交易数据
    const tradeExtrinsic = await signExtrinsic(
      buildAssetTransfer(
        api,
        order.assetId,
        new Decimal(order.amount.toString()),
        order.buyer!!,
      ),
      serverConfig.marketAccountMnemonic,
    );

    // 更新订单交易 hash
    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        tradeHash: tradeExtrinsic.hash.toString(),
        updatedAt: new Date(),
      },
    });

    // 市场账户转账铭文给买家
    const tradeErrMsg = await submitSignedExtrinsicAndWait(api, tradeExtrinsic);
    if (tradeErrMsg) {
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'FAILED',
          chainStatus: 'TRADE_BLOCK_FAILED',
          failReason: tradeErrMsg,
          updatedAt: new Date(),
        },
      });
      continue;
    }

    // 更新订单子状态为区块确认
    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: 'SOLD',
        chainStatus: 'TRADE_BLOCK_CONFIRMED',
        updatedAt: new Date(),
      },
    });
  }
}

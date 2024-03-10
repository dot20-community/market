import { serverConfig } from '../configs/server.config';
import { prisma } from '../server/context';

/**
 * 查询铭文交易状态，1表示成功
 */
async function transactionStatus(hash: string): Promise<number> {
  if (serverConfig.environment !== 'production') {
    return 1;
  }
  const resp = await fetch(
    `${serverConfig.dotaApiUrl}/get_transaction_status?tx_hash=${hash}`,
  );
  const data = await resp.json();
  return data.status;
}

/**
 * 处理卖家挂单，上链成功后，铭文状态确认
 */
export async function sellInscribeCheck() {
  const needCheckOrderList = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      chainStatus: 'SELL_BLOCK_CONFIRMED',
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (!needCheckOrderList.length) {
    return;
  }

  for (const order of needCheckOrderList) {
    const status = await transactionStatus(order.sellHash!!);
    const now = new Date();
    // 如果铭文确认成功更新为挂单中
    if (status === 1) {
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'LISTING',
          chainStatus: 'SELL_INSCRIBE_CONFIRMED',
          listingAt: now,
          updatedAt: now,
        },
      });
    }
  }
}

/**
 * 处理卖家取消挂单，上链成功后，铭文状态确认
 */
export async function sellCancelInscribeCheck() {
  const needCheckOrderList = await prisma.order.findMany({
    where: {
      status: 'CANCELING',
      chainStatus: 'CANCEL_BLOCK_CONFIRMED',
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (!needCheckOrderList.length) {
    return;
  }

  for (const order of needCheckOrderList) {
    const status = await transactionStatus(order.cancelHash!!);
    const now = new Date();
    // 如果铭文确认成功更新为已取消
    if (status === 1) {
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'CANCELED',
          chainStatus: 'CANCEL_INSCRIBE_CONFIRMED',
          canceledAt: now,
          updatedAt: now,
        },
      });
    }
  }
}

/**
 * 处理买家支付完，上链成功后，转铭文到买家状态确认
 */
export async function buyInscribeCheck() {
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

  for (const order of needCheckOrderList) {
    const status = await transactionStatus(order.buyHash!!);
    const now = new Date();
    // 如果铭文确认成功更新为已售出
    if (status === 1) {
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'SOLD',
          chainStatus: 'TRADE_INSCRIBE_CONFIRMED',
          soldAt: now,
          updatedAt: now,
        },
      });
    }
  }
}

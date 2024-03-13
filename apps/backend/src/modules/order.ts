import { ChainStatus, Order, Status } from '@prisma/client';
import { BizError } from 'apps/libs/error';
import {
  buildInscribeTransfer,
  dot2Planck,
  fmtAddress,
  parseBatchTransfer,
  parseInscribeTransfer,
  toCamelCase,
} from 'apps/libs/util';
import Decimal from 'decimal.js';
import { LRUCache } from 'lru-cache';
import { PageReq, PageRes, noAuthProcedure, router } from '../server/trpc';
import { signExtrinsic, submitSignedExtrinsicAndWait } from '../util/dapp';
import { getAccountTick } from './account';

/**
 * 卖单请求参数
 */
export type SellReq = {
  /**
   * 卖家地址
   */
  seller: string;
  /**
   * 铭文出售总价
   */
  totalPrice: string;
  /**
   * 签名交易数据
   */
  signedExtrinsic: string;
};
/**
 * 卖单响应参数
 */
export type SellRes = {
  /**
   * 订单ID
   */
  id: bigint;
  /**
   * 交易哈希
   */
  hash: string;
};

/**
 * 取消卖单请求参数
 */
export type CancelReq = bigint;
/**
 * 取消卖单响应参数
 */
export type CancelRes = {
  /**
   * 订单ID
   */
  id: bigint;
  /**
   * 交易哈希
   */
  hash: string;
};

/**
 * 查询订单详情请求参数
 */
export type DetailReq = bigint;
/**
 * 查询订单详情响应参数
 */
export type DetailRes = Order;

/**
 * 查询订单列表请求参数
 */
export type ListReq = PageReq & {
  /**
   * 铭文币种名称
   */
  tick?: string;
  /**
   * 买家地址过滤条件
   */
  buyer?: string;
  /**
   * 卖家地址过滤条件
   */
  seller?: string;
  /**
   * 要排除的卖家地址过滤条件
   */
  excludeSeller?: string;
  /**
   * 订单状态列表过滤条件，为空时查询所有状态
   */
  statues?: Status[];
  /**
   * 排序方式
   */
  orderBy?:
  | 'price_asc'
  | 'price_desc'
  | 'create_asc'
  | 'create_desc'
  | 'update_asc'
  | 'update_desc';
};
/**
 * 查询订单列表响应参数
 */
export type ListRes = PageRes<Order>;

/**
 * 买单请求参数
 */
export type BuyReq = {
  /**
   * 订单ID
   */
  id: bigint;
  /**
   * 签名交易数据
   */
  signedExtrinsic: string;
};
/**
 * 买单响应参数
 */
export type BuyRes = {
  /**
   * 订单ID
   */
  id: bigint;
  /**
   * 交易哈希
   */
  hash: string;
};

const cache = new LRUCache<string, any>({
  ttl: 1000 * 60 * 60, // 1小时
  ttlAutopurge: true,
});

export const orderRouter = router({
  /**
   * 获取dot价格(单位：美元)
   */
  dotPrice: noAuthProcedure.query(async ({ ctx }): Promise<number> => {
    const key = 'dotPrice';
    const cachedPrice = cache.get(key);
    if (cachedPrice) {
      return cachedPrice;
    }
    const resp = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=polkadot&vs_currencies=usd',
    );
    const data = await resp.json();
    const price = data?.polkadot?.usd ?? 10;
    cache.set(key, price);
    return price;
  }),
  /**
   * 卖单
   */
  sell: noAuthProcedure
    .input((input) => input as SellReq)
    .mutation(async ({ input, ctx }): Promise<SellRes> => {
      const extrinsic = ctx.api.tx(input.signedExtrinsic);
      const totalPriceDecimal = new Decimal(input.totalPrice);
      // 解析铭文转账数据
      const inscribeTransfer = parseInscribeTransfer(extrinsic as any);
      if (!inscribeTransfer) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          'Invalid extrinsic format',
        );
      }
      // 校验卖家地址是否与签名地址一致
      const signer = fmtAddress(extrinsic.signer.toString());
      if (input.seller !== signer) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid seller: expect ${input.seller} but got ${signer}`,
        );
      }
      // 校验是否满足最小交易金额
      const minSellTotalPriceDecimal = dot2Planck(ctx.opts.minSellTotalPrice);
      if (totalPriceDecimal.lt(minSellTotalPriceDecimal)) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid total price: at least ${minSellTotalPriceDecimal} Planck but got ${totalPriceDecimal}`,
        );
      }
      // 检查是否转账给平台地址
      if (inscribeTransfer.to !== ctx.opts.marketAccount) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid receiver address: expect ${ctx.opts.marketAccount} but got ${inscribeTransfer.to}`,
        );
      }
      // 检查手续费否足够
      const needPayPrice = totalPriceDecimal.mul(ctx.opts.serverFeeRate);
      const realPayPrice = inscribeTransfer.value;
      if (realPayPrice.lt(needPayPrice)) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Insufficient service fee: expect at least ${needPayPrice} Planck but got ${realPayPrice}`,
        );
      }
      // 校验用户铭文数量是否足够
      const accountTick = await getAccountTick(
        ctx.opts.dotaApiUrl,
        input.seller,
        inscribeTransfer.inscribeTick,
      );
      if (accountTick.balance < inscribeTransfer.inscribeAmt) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Insufficient inscribe amount: expect at least ${inscribeTransfer.inscribeAmt} but got ${accountTick.balance}`,
        );
      }

      // 查询用户是否有待确认的订单
      const runningCount = await ctx.prisma.order.count({
        where: {
          seller: input.seller,
          status: {
            in: ['PENDING', 'CANCELING'],
          },
        },
      });
      if (runningCount > 0) {
        throw BizError.ofTrpc(
          'EXIST_PENDING_ORDER',
          'You have a pending order',
        );
      }

      const now = new Date();
      // 存储到数据库
      const order = await ctx.prisma.order.create({
        data: {
          seller: input.seller,
          totalPrice: BigInt(totalPriceDecimal.toFixed()),
          sellServiceFee: BigInt(needPayPrice.toFixed()),
          sellPayPrice: BigInt(realPayPrice.toFixed()),
          sellHash: extrinsic.hash.toString(),
          tick: inscribeTransfer.inscribeTick,
          amount: inscribeTransfer.inscribeAmt,
          createdAt: now,
          updatedAt: now,
        },
      });

      // 提交上链
      const errMsg = await submitSignedExtrinsicAndWait(
        ctx.api,
        extrinsic as any,
      );
      if (errMsg) {
        // 更新订单状态为FAILED
        await ctx.prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: 'FAILED',
            chainStatus: 'SELL_BLOCK_FAILED',
            failReason: errMsg,
            updatedAt: now,
          },
        });
        throw BizError.ofTrpc('TRANSFER_FAILED', errMsg);
      }

      // 更新订单子状态为区块已确认
      await ctx.prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          chainStatus: 'SELL_BLOCK_CONFIRMED',
          updatedAt: now,
        },
      });

      return { id: order.id, hash: extrinsic.hash.toHex() };
    }),
  /**
   * 取消卖单
   */
  cancel: noAuthProcedure
    .input((input) => input as CancelReq)
    .mutation(async ({ input, ctx }): Promise<CancelRes> => {
      const order = await ctx.prisma.order.findUnique({
        where: {
          id: input,
        },
      });
      if (!order) {
        throw BizError.ofTrpc('ORDER_NOT_FOUND');
      }

      // 计算退款金额 手续费 - 0.05 gas
      const refundAmount = new Decimal(order.sellServiceFee.toString()).sub(
        dot2Planck(0.05),
      );
      // 如果退款金额小于0，则不进行退还，保证不会因为支付gas而亏钱
      const realRefundAmount = refundAmount.lt(0)
        ? new Decimal(0)
        : refundAmount;

      // 生成铭文交易数据
      const extrinsic = await signExtrinsic(
        buildInscribeTransfer(
          ctx.api,
          order.tick,
          Number(order.amount),
          order.seller,
          realRefundAmount,
        ),
        ctx.opts.marketAccountMnemonic,
      );

      // 更新订单状态为已取消，只有在挂单中的订单才能取消
      const result = await ctx.prisma.order.updateMany({
        where: {
          id: input,
          status: 'LISTING',
        },
        data: {
          status: 'CANCELING',
          cancelHash: extrinsic.hash.toString(),
          updatedAt: new Date(),
        },
      });
      if (result.count === 0) {
        throw BizError.ofTrpc('ORDER_STATUS_ERROR', 'status is not LISTING');
      }

      const errMsg = await submitSignedExtrinsicAndWait(ctx.api, extrinsic);
      if (errMsg) {
        await ctx.prisma.order.update({
          where: {
            id: input,
          },
          data: {
            status: 'FAILED',
            chainStatus: 'CANCEL_BLOCK_FAILED',
            failReason: errMsg,
            updatedAt: new Date(),
          },
        });
        throw BizError.ofTrpc('TRANSFER_FAILED', errMsg);
      }

      // 更新订单子状态为区块已确认
      await ctx.prisma.order.update({
        where: {
          id: input,
        },
        data: {
          chainStatus: 'CANCEL_BLOCK_CONFIRMED',
          updatedAt: new Date(),
        },
      });

      return {
        id: order.id,
        hash: extrinsic.hash.toString(),
      };
    }),

  /**
   * 查询订单信息
   */
  detail: noAuthProcedure
    .input((input) => input as DetailReq)
    .query(async ({ input, ctx }): Promise<DetailRes> => {
      const order = await ctx.prisma.order.findUnique({
        where: {
          id: input,
        },
      });
      if (!order) {
        throw BizError.ofTrpc('ORDER_NOT_FOUND');
      }
      return order;
    }),
  /**
   * 查询订单列表
   */
  list: noAuthProcedure
    .input((input) => input as ListReq)
    .query(async ({ input, ctx }): Promise<ListRes> => {
      let whereSql = ' 1=1';
      let values = [];
      if (input.tick) {
        values.push(input.tick.toLowerCase());
        whereSql += ` AND tick = ?`;
      }
      if (input.buyer) {
        values.push(input.buyer);
        whereSql += ` AND buyer = ?`;
      }
      if (input.seller) {
        values.push(input.seller);
        whereSql += ` AND seller = ?`;
      }
      if (input.excludeSeller) {
        values.push(input.excludeSeller);
        whereSql += ` AND seller != ?`;
      }
      if (input.statues) {
        values.push(...input.statues);
        whereSql += ` AND status in (${input.statues
          .map(() => '?')
          .join(',')})`;
      }
      // 页码参数计算，从1开始
      const page = input.cursor ? parseInt(input.cursor) : 1;
      const [count] = await ctx.prisma.$queryRawUnsafe<any>(
        `
      select count(*) as total from orders where ${whereSql}
        `,
        ...values,
      );
      const total = Number(count.total);
      let list =
        total === 0
          ? []
          : await (async function () {
            // 排序方式
            let orderBySql = '';
            if (input.orderBy === 'price_asc') {
              orderBySql = '(total_price/amount) asc, id desc';
            } else if (input.orderBy === 'price_desc') {
              orderBySql = '(total_price/amount) desc, id desc';
            } else if (input.orderBy === 'create_asc') {
              orderBySql = 'id asc';
            } else if (input.orderBy === 'create_desc') {
              orderBySql = 'id desc';
            } else if (input.orderBy === 'update_asc') {
              orderBySql = 'updated_at asc, id desc';
            } else if (input.orderBy === 'update_desc') {
              orderBySql = 'updated_at desc, id desc';
            } else {
              orderBySql = 'id desc';
            }
            values.push((page - 1) * input.limit);
            values.push(input.limit);
            return await ctx.prisma.$queryRawUnsafe<Order[]>(
              `
     select * from orders where ${whereSql} order by ${orderBySql} limit ?,?
       `,
              ...values,
            );
          })();

      const totalPage = Math.ceil(Number(total) / input.limit);
      console.log('page', page);
      console.log('total', total);
      console.log('totalPage', totalPage);
      const nextCursor = page < totalPage ? (page + 1).toString() : undefined;
      const prevCursor = page > 1 ? (page - 1).toString() : undefined;

      if (list.length) {
        // 下划线转驼峰
        list = list.map((item: any) => {
          const newItem: any = {};
          for (const key in item) {
            newItem[toCamelCase(key)] = item[key];
          }
          return newItem;
        }) as any;
      }
      return {
        total,
        list,
        prev: prevCursor,
        next: nextCursor,
      };
    }),
  /**
   * 买单
   */
  buy: noAuthProcedure
    .input((input) => input as BuyReq)
    .mutation(async ({ input, ctx }): Promise<BuyRes> => {
      const extrinsic = ctx.api.tx(input.signedExtrinsic);
      // 查询订单信息
      const order = await ctx.prisma.order.findUnique({
        where: {
          id: input.id,
        },
      });
      if (!order) {
        throw BizError.ofTrpc('ORDER_NOT_FOUND');
      }
      // 买家和卖家不能是同一个地址
      const buyer = fmtAddress(extrinsic.signer.toString());
      if (order.seller === buyer) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          'seller and buyer cannot be the same address',
        );
      }
      // 校验是否为合法的转账交易
      const batchTransfer = parseBatchTransfer(extrinsic as any);
      if (!batchTransfer) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          'Invalid extrinsic format',
        );
      }
      // 检查是否转账给卖家地址
      const transferToSeller = batchTransfer.list.filter(
        (transfer) => transfer.to === order.seller,
      )[0];
      if (!transferToSeller) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid receiver address: not found seller address ${order.seller}`,
        );
      }
      // 检查是否转账给平台地址
      const transferToMarket = batchTransfer.list.filter(
        (transfer) => transfer.to === ctx.opts.marketAccount,
      )[0];
      if (!transferToMarket) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid receiver address: not found seller address ${ctx.opts.marketAccount}`,
        );
      }
      // 检查转账金额是否符合
      const needTotalPriceDecimal = new Decimal(order.totalPrice.toString());
      const needServiceFeeDecimal = needTotalPriceDecimal
        .mul(new Decimal(ctx.opts.serverFeeRate))
        .ceil();
      const realTotalPriceDecimal = transferToSeller.value;
      const realServiceFeeDecimal = transferToMarket.value;
      if (realTotalPriceDecimal.lt(needTotalPriceDecimal)) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid total price transfer amount: expect at least ${needTotalPriceDecimal} Planck but got ${realTotalPriceDecimal}`,
        );
      }
      if (realServiceFeeDecimal.lt(needServiceFeeDecimal)) {
        throw BizError.ofTrpc(
          'INVALID_TRANSACTION',
          `Invalid service fee transfer amount: expect at least ${needServiceFeeDecimal} Planck but got ${realServiceFeeDecimal}`,
        );
      }

      // 更新订单为锁定状态,如果更新成功表示抢单成功
      const result = await ctx.prisma.order.updateMany({
        where: {
          id: input.id,
          status: 'LISTING',
        },
        data: {
          status: 'LOCKED',
          buyHash: extrinsic.hash.toString(),
          buyer: buyer,
          updatedAt: new Date(),
        },
      });
      if (result.count === 0) {
        throw BizError.ofTrpc('ORDER_STATUS_ERROR', 'status is not LISTING');
      }

      // 买家转账事务上链
      const errMsg = await submitSignedExtrinsicAndWait(
        ctx.api,
        extrinsic as any,
      );
      if (errMsg) {
        // 如果是因为dot余额不足导致的失败，则取消锁单
        let afterStatus: Status;
        let afterChainStatus: ChainStatus | undefined;
        let afterBuyer: null | undefined;
        let failReason: string | undefined;
        if (
          errMsg === '{"token":"Frozen"}' ||
          errMsg === '{"token":"FundsUnavailable"}' ||
          errMsg === '{"token":"NotExpendable"}'
        ) {
          afterStatus = 'LISTING';
          afterChainStatus = undefined;
          afterBuyer = null;
          failReason = errMsg;
        } else {
          afterStatus = 'FAILED';
          afterChainStatus = 'BUY_BLOCK_FAILED';
          afterBuyer = undefined;
          failReason = errMsg;
        }
        await ctx.prisma.order.update({
          where: {
            id: input.id,
          },
          data: {
            status: afterStatus,
            buyer: afterBuyer,
            chainStatus: afterChainStatus,
            failReason: errMsg,
            updatedAt: new Date(),
          },
        });
        throw BizError.ofTrpc('TRANSFER_FAILED', errMsg);
      }

      // 更新订单子状态为区块确认
      await ctx.prisma.order.update({
        where: {
          id: input.id,
        },
        data: {
          chainStatus: 'BUY_BLOCK_CONFIRMED',
          updatedAt: new Date(),
        },
      });
      return { id: input.id, hash: extrinsic.hash.toHex() };
    }),
});

import { Order, Status } from '@prisma/client';
import { BizError } from 'apps/libs/error';
import {
  buildInscribeTransfer,
  dot2Planck,
  fmtAddress,
  parseBatchTransfer,
  parseInscribeTransfer,
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
export type CancelReq = number;
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
export type DetailReq = number;
/**
 * 查询订单详情响应参数
 */
export type DetailRes = Order;

/**
 * 查询订单列表请求参数
 */
export type ListReq = PageReq & {
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
      console.log("inscribeTransfer", JSON.stringify(inscribeTransfer))
      if (!inscribeTransfer) {
        throw BizError.of('INVALID_TRANSACTION', 'Invalid extrinsic format');
      }
      // 校验卖家地址是否与签名地址一致
      const signer = fmtAddress(extrinsic.signer.toString())
      if (input.seller !== signer) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Invalid seller: expect ${input.seller
          } but got ${signer}`,
        );
      }
      // 校验是否满足最小交易金额
      const minSellTotalPriceDecimal = dot2Planck(ctx.opts.minSellTotalPrice);
      if (totalPriceDecimal < minSellTotalPriceDecimal) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Invalid total price: at least ${minSellTotalPriceDecimal} Planck but got ${totalPriceDecimal}`,
        );
      }
      // 检查是否转账给平台地址
      if (inscribeTransfer.to !== ctx.opts.marketAccount) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Invalid receiver address: expect ${ctx.opts.marketAccount} but got ${inscribeTransfer.to}`,
        );
      }
      // 检查手续费否足够
      const needPayPrice = totalPriceDecimal.mul(ctx.opts.serverFeeRate);
      const realPayPrice = inscribeTransfer.value;
      if (realPayPrice < needPayPrice) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Insufficient service fee: expect at least ${needPayPrice} Planck but got ${realPayPrice}`,
        );
      }
      // 校验用户铭文数量是否足够
      const accountTick = await getAccountTick(ctx.opts.dotaApiUrl, input.seller, inscribeTransfer.inscribeTick);
      console.log(accountTick, 'accountTick')
      if (accountTick.balance < inscribeTransfer.inscribeAmt) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Insufficient inscribe amount: expect at least ${inscribeTransfer.inscribeAmt} but got ${accountTick.balance}`
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
        throw BizError.of('TRANSFER_FAILED', errMsg);
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
        throw BizError.of('ORDER_NOT_FOUND');
      }

      // 生成铭文交易数据
      const extrinsic = await signExtrinsic(
        buildInscribeTransfer(
          ctx.api,
          order.tick,
          Number(order.amount),
          order.seller,
        ),
        ctx.opts.marketAccountMnemonic,
      );

      // 更新订单状态为已取消，只有在挂单中的订单才能取消
      const result = await ctx.prisma.order.updateMany({
        where: {
          id: input,
          status: 'LISTING',
          cancelHash: extrinsic.hash.toString(),
        },
        data: {
          status: 'CANCELING',
          updatedAt: new Date(),
        },
      });
      if (result.count === 0) {
        throw BizError.of('ORDER_STATUS_ERROR', 'status is not LISTING');
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
        throw BizError.of('TRANSFER_FAILED', errMsg);
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
        throw BizError.of('ORDER_NOT_FOUND');
      }
      return order;
    }),
  /**
   * 查询订单列表
   */
  list: noAuthProcedure
    .input((input) => input as ListReq)
    .query(async ({ input, ctx }): Promise<ListRes> => {
      const list = await ctx.prisma.order.findMany({
        take: input.limit + 1, // get an extra item at the end which we'll use as next cursor
        where: {
          seller: {
            equals: input.seller,
            not: input.excludeSeller,
          },
          status: {
            in: input.statues,
          },
        },
        cursor: input.cursor ? { id: BigInt(input.cursor) } : undefined,
        orderBy: {
          id: 'desc',
        },
      });

      const nextCursor =
        list.length > input.limit ? list.pop()?.id.toString() : undefined;
      const prevCursor = list.length > 0 ? list[0].id.toString() : undefined;
      return {
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
        throw BizError.of('ORDER_NOT_FOUND');
      }
      // 买家和卖家不能是同一个地址
      const buyer = fmtAddress(extrinsic.signer.toString());
      if (order.seller === buyer) {
        throw BizError.of('INVALID_TRANSACTION', 'seller and buyer cannot be the same address');
      }
      // 校验是否为合法的转账交易
      const batchTransfer = parseBatchTransfer(extrinsic as any);
      if (!batchTransfer) {
        throw BizError.of('INVALID_TRANSACTION', 'Invalid extrinsic format');
      }
      // 检查是否转账给卖家地址
      const transferToSeller = batchTransfer.list.filter(
        (transfer) => transfer.to === order.seller,
      )[0];
      if (!transferToSeller) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Invalid receiver address: not found seller address ${order.seller}`,
        );
      }
      // 检查是否转账给平台地址
      const transferToMarket = batchTransfer.list.filter(
        (transfer) => transfer.to === ctx.opts.marketAccount,
      )[0];
      if (!transferToMarket) {
        throw BizError.of(
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
      if (realTotalPriceDecimal < needTotalPriceDecimal) {
        throw BizError.of(
          'INVALID_TRANSACTION',
          `Invalid total price transfer amount: expect at least ${needTotalPriceDecimal} Planck but got ${realTotalPriceDecimal}`,
        );
      }
      if (realServiceFeeDecimal < needServiceFeeDecimal) {
        throw BizError.of(
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
        throw BizError.of('ORDER_STATUS_ERROR', 'status is not LISTING');
      }

      const errMsg = await submitSignedExtrinsicAndWait(
        ctx.api,
        extrinsic as any,
      );
      if (errMsg) {
        await ctx.prisma.order.update({
          where: {
            id: input.id,
          },
          data: {
            status: 'FAILED',
            chainStatus: 'BUY_BLOCK_FAILED',
            failReason: errMsg,
            updatedAt: new Date(),
          },
        });
        throw BizError.of('TRANSFER_FAILED', errMsg);
      }

      // 构造铭文转账交易数据
      const tradeExtrinsic = await signExtrinsic(
        buildInscribeTransfer(
          ctx.api,
          order.tick,
          Number(order.amount),
          order.seller,
        ),
        ctx.opts.marketAccountMnemonic,
      );

      // 更新订单子状态为区块确认
      await ctx.prisma.order.update({
        where: {
          id: input.id,
        },
        data: {
          chainStatus: 'BUY_BLOCK_CONFIRMED',
          tradeHash: tradeExtrinsic.hash.toString(),
          updatedAt: new Date(),
        },
      });

      // 市场账户转账铭文给买家
      const tradeErrMsg = await submitSignedExtrinsicAndWait(
        ctx.api,
        tradeExtrinsic,
      );
      if (tradeErrMsg) {
        await ctx.prisma.order.update({
          where: {
            id: input.id,
          },
          data: {
            status: 'FAILED',
            chainStatus: 'TRADE_BLOCK_FAILED',
            failReason: tradeErrMsg,
            updatedAt: new Date(),
          },
        });
        throw BizError.of('TRANSFER_FAILED', tradeErrMsg);
      }

      // 更新订单子状态为区块确认
      await ctx.prisma.order.update({
        where: {
          id: input.id,
        },
        data: {
          chainStatus: 'TRADE_BLOCK_CONFIRMED',
          updatedAt: new Date(),
        },
      });

      return { id: input.id, hash: extrinsic.hash.toHex() };
    }),
});

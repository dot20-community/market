import { Order, Status } from '@prisma/client';
import { BizError } from 'apps/libs/error';
import { dot2Planck, parseInscribeTransfer } from 'apps/libs/util';
import Decimal from 'decimal.js';
import {
  PageReq,
  PageRes,
  error,
  noAuthProcedure,
  ok,
  router,
} from '../server/trpc';
import { submitAndWaitExtrinsic } from '../util/dapp';
import { Result } from './../server/trpc';

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
   * 服务费
   */
  serviceFee: string;
  /**
   * 签名交易数据
   */
  signedExtrinsic: string;
};
/**
 * 卖单响应参数
 */
export type SellRes = Result<{
  /**
   * 订单ID
   */
  id: bigint;
  /**
   * 交易哈希
   */
  hash: string;
}>;

/**
 * 查询订单详情请求参数
 */
export type DetailReq = number;
/**
 * 查询订单详情响应参数
 */
export type DetailRes = Result<Order>;

/**
 * 查询订单列表请求参数
 */
export type ListReq = PageReq & {
  /**
   * 卖家地址过滤条件
   */
  seller?: string;
  /**
   * 订单状态列表过滤条件，为空时查询所有状态
   */
  status?: Status[];
};
/**
 * 查询订单列表响应参数
 */
export type ListRes = Result<PageRes<Order>>;

/**
 * 买单请求参数
 */
export type BuyReq = {
  /**
   * 订单ID
   */
  id: number;
  /**
   * 买家地址
   */
  buyer: string;
  /**
   * 签名交易数据
   */
  signedTransfer: string;
};
/**
 * 买单响应参数
 */
export type BuyRes = Result<{
  /**
   * 订单ID
   */
  id: number;
  /**
   * 交易哈希
   */
  hash: string;
}>;

export const orderRouter = router({
  /**
   * 卖单
   */
  sell: noAuthProcedure
    .input((input) => input as SellReq)
    .mutation(async ({ input, ctx }): Promise<SellRes> => {
      const extrinsic = ctx.api.createType('Extrinsic', input.signedExtrinsic);
      const totalPriceDecimal = new Decimal(input.totalPrice);
      const serviceFeeDecimal = new Decimal(input.serviceFee);

      // 校验卖家地址是否与签名地址一致
      if (input.seller !== extrinsic.signer.toString()) {
        return error(BizError.of('INVALID_TRANSACTION', 'Invalid seller'));
      }
      // 校验是否满足最小交易金额
      if (totalPriceDecimal < dot2Planck(ctx.opts.minSellTotalPrice)) {
        return error(BizError.of('INVALID_TRANSACTION', 'Invalid total price'));
      }
      // 解析铭文转账数据
      const inscribeTransfer = parseInscribeTransfer(extrinsic as any);
      if (!inscribeTransfer) {
        return error(BizError.of('INVALID_TRANSACTION', 'Invalid inscribe format'));
      }
      // 检查是否转账给平台地址
      if (inscribeTransfer.to !== ctx.opts.marketAccount) {
        return error(BizError.of('INVALID_TRANSACTION', 'Invalid receiver address'));
      }
      // 检查转账金额是否符合
      const needPayPrice = totalPriceDecimal.add(serviceFeeDecimal);
      const realTransferPrice = inscribeTransfer.transfer
      if (realTransferPrice < needPayPrice) {
        return error(BizError.of('INVALID_TRANSACTION', 'Invalid transfer amount'));
      }

      // 提交上链
      const errMsg = await submitAndWaitExtrinsic(
        ctx.api,
        extrinsic as any,
      );
      if (errMsg) {
        return error(BizError.of('TRANSFER_FAILED', errMsg));
      }

      // 存储到数据库
      const order = await ctx.prisma.order.create({
        data: {
          seller: input.seller,
          totalPrice: BigInt(totalPriceDecimal.toFixed()),
          serviceFee: BigInt(serviceFeeDecimal.toFixed()),
          realPayPrice: BigInt(realTransferPrice.toFixed()),
          txHash: extrinsic.hash.toString(),
          tick: inscribeTransfer.inscribeTick,
          amount: inscribeTransfer.inscribeAmt,
        },
      });

      return ok({ id: order.id, hash: extrinsic.hash.toHex() });
    }),
  /**
   * 查询订单信息
   */
  detail: noAuthProcedure
    .input((input) => input as DetailReq)
    .query(async ({ input }) => {
      return ok({} as DetailRes);
    }),
  /**
   * 查询订单列表
   */
  list: noAuthProcedure
    .input((input) => input as ListReq)
    .query(async ({ input }): Promise<ListRes> => {
      return ok({
        total: 0,
        list: [],
      });
    }),
  /**
   * 买单
   */
  buy: noAuthProcedure
    .input((input) => input as BuyReq)
    .mutation(async ({ input }) => {
      return ok({} as BuyRes);
    }),
});

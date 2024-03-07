import { ApiPromise } from '@polkadot/api';
import { Order, Status } from '@prisma/client';
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
  totalPrice: bigint;
  /**
   * 服务费
   */
  serviceFee: bigint;
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
  id: number;
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

async function waitBlock(api: ApiPromise, extrinsicHash: string) {
  const blockHash = await api.rpc.chain.getBlockHash(extrinsicHash);
}

export const orderRouter = router({
  /**
   * 卖单
   */
  sell: noAuthProcedure
    .input((input) => input as SellReq)
    .mutation(async ({ input, ctx }): Promise<SellRes> => {
      const extrinsic = ctx.api.createType('Extrinsic', input.signedExtrinsic);
      // 校验卖家地址是否与签名地址一致
      if (input.seller !== extrinsic.signer.toString()) {
        return error('INVALID_TRANSACTION');
      }
      // 校验是否满足最小交易金额
      // 校验手续费是否满足

      try {
        const errorMsg = await submitAndWaitExtrinsic(
          ctx.api,
          input.signedExtrinsic,
        );
        if (errorMsg) {
          return error('TRANSFER_FAILED');
        }
        return ok({ id: 1, hash: extrinsic.hash.toHex() });
      } catch (e) {
        return error();
      }
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

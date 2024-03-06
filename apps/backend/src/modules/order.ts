import { Order, Status } from '@prisma/client';
import { PageReq, PageRes, error, noAuthProcedure, ok, router } from '../server/trpc';
import { Result } from './../server/trpc';


/**
 * 卖单请求参数
 */
export type SellReq = {
  /**
  * 卖家地址
  */
  seller: string,
  /**
 * 签名交易数据
*/
  signedTransfer: string,
}
/**
 * 卖单响应参数
 */
export type SellRes = Result<{
  /**
  * 订单ID
  */
  id: number,
  /**
 * 交易哈希
*/
  hash: string,
}>


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
  seller?: string,
  /**
   * 订单状态列表过滤条件，为空时查询所有状态
   */
  status?: Status[],
}
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
  id: number,
  /**
   * 买家地址
   */
  buyer: string,
  /**
   * 签名交易数据
   */
  signedTransfer: string,
}
/**
 * 买单响应参数
 */
export type BuyRes = Result<{
  /**
   * 订单ID
   */
  id: number,
  /**
   * 交易哈希
   */
  hash: string,
}>

export const orderRouter = router({
  /**
   * 卖单
   */
  sell: noAuthProcedure
    .input((input) => input as SellReq)
    .mutation(async ({ input, ctx }): Promise<SellRes> => {
      /* const extrinsic = api.createType("Extrinsic", input.signedTransfer);
      if (input.from === extrinsic.signer.toString()) {
        return {
          code: 200,
        };
      } */

      try {
        const hash = await ctx.api.rpc.author.submitExtrinsic(
          input.signedTransfer,
        );
        console.log('Extrinsic hash:', hash.toHex());
        return ok({ id: 1, hash: hash.toHex() });
      } catch (e) {
        return error();
      }
    }),
  /**
   * 查询订单信息
   */
  detail: noAuthProcedure
    .input((input) => input as DetailReq)
    .query(async ({ input }): Promise<DetailRes> => {
      return ok();
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
    .mutation(async ({ input }): Promise<BuyRes> => {
      return ok()
    }
    ),
});

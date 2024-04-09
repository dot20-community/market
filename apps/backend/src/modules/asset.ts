import { Status } from '@prisma/client';
import { noAuthProcedure, router } from '../server/trpc';

export type AssetInfo = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: bigint;
  holder: number;
  floorPrice: string;
  totalAmt: bigint;
  totalVol: bigint;
};
export type TrendingRes = AssetInfo[];

export const assetRouter = router({
  /**
   * 获取铭文交易排行列表
   */
  trending: noAuthProcedure.query(async ({ ctx }): Promise<TrendingRes> => {
    const listingStatus: Status = 'LISTING';
    const soldStatus: Status = 'SOLD';
    const resp = await ctx.prisma.$queryRaw<TrendingRes>`
    select a.asset_id                                                                      id,
          a.name,
          a.symbol,
          a.decimals,
          a.supply,
          a.holder,
          ifnull(min(if(o.status = ${listingStatus}, o.total_price * POW(10,a.decimals) / o.amount, null)), 0) floorPrice,
          sum(o.amount)                                                                   totalAmt,
          sum(if(o.status = ${soldStatus}, o.total_price, 0))                             totalVol
    from assets a
            left join orders o on o.asset_id = a.asset_id
    group by a.asset_id
    order by totalVol desc, a.id asc
    limit 10
    `;
    return resp;
  }),
});

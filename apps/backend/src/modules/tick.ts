import { Status } from '@prisma/client';
import { BizError } from 'apps/libs/error';
import { noAuthProcedure, router } from '../server/trpc';

/**
 * 获取所有铭文列表响应
 */
export type ListRes = {
  tick: string;
  holder: number;
  startBlock: number;
  totalBlock: number;
  totalSupply: bigint;
  circulatingSupply: bigint;
}[];

export type TrendingRes = {
  tick: string;
  floorPrice: bigint;
  totalAmt: bigint;
  totalVol: bigint;
}[];

export const tickRouter = router({
  /**
   * 获取所有铭文列表
   */
  list: noAuthProcedure.query(async ({ input, ctx }): Promise<ListRes> => {
    const resp = await fetch(`${ctx.opts.dotaApiUrl}/get_tick_list`);
    const data = await resp.json();
    if (!data.ticks) {
      throw BizError.of('ERROR', data?.error);
    }

    return data.ticks.map((item: any) => ({
      tick: item.tick,
      holder: item.holder,
      startBlock: item.start_block,
      totalBlocks: item.total_blocks,
      totalSupply: BigInt(parseInt(item.total_supply)),
      circulatingSupply: BigInt(parseInt(item.circulating_supply)),
    }));
  }),

  /**
   * 获取铭文交易排行列表
   */
  trending: noAuthProcedure.query(
    async ({ input, ctx }): Promise<TrendingRes> => {
      const soldStatus: Status = 'SOLD';
      const resp = await ctx.prisma.$queryRaw<TrendingRes>`
    select tick, min(total_price/amount) floorPrice, sum(amount) totalAmt, sum(if(status=${soldStatus},total_price,0)) totalVol from orders group by tick order by totalVol desc limit 10
    `;
      return resp;
    },
  ),
});

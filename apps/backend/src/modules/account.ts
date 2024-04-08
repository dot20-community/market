import { BizError } from 'apps/libs/error';
import { serverConfig } from '../configs/server.config';
import { ServerOptions } from '../server/server';
import { noAuthProcedure, router } from '../server/trpc';

/**
 * 获取账号铭文列表请求
 */
export type TickListReq = {
  /**
   * 钱包地址
   */
  account: string;
};
/**
 * 获取账号铭文列表响应
 */
export type TickListRes = {
  /**
   * 铭文名称
   */
  tick: string;
  /**
   * 余额
   */
  balance: bigint;
}[];

/**
 * 获取账号指定铭文余额请求
 */
export type TickBalanceReq = {
  /**
   * 钱包地址
   */
  account: string;
  /**
   * 铭文名称
   */
  tick: string;
};
/**
 * 获取账号指定铭文余额响应
 */
export type TickBalanceRes = {
  /**
   * 余额
   */
  balance: bigint;
};

export async function getAccountTickList(
  host: string,
  account: string,
): Promise<TickListRes> {
  const resp = await fetch(`${host}/get_account_balance?account=${account}`);
  const data = await resp.json();
  if (!data.balance) {
    throw BizError.ofTrpc('ERROR', data?.error);
  }

  const result = data.balance.map((item: any) => ({
    tick: item.tick,
    balance: BigInt(parseInt(item.available)),
  }));

  return mockTickList(account, result, serverConfig);
}

function mockTickList(
  account: string,
  realData: TickListRes,
  opts: ServerOptions,
): TickListRes {
  const mockTickData = opts.mockDot20Amount
    .split(',')
    .map((item) => {
      const [account, tick, balance] = item.split(':');
      return {
        account,
        tick,
        balance: BigInt(balance),
      };
    })
    .filter((item) => item.account === account);

  // 合并真实数据和模拟数据，真实数据优先
  const result = mockTickData.filter((mockItem) => {
    const realItem = realData.find(
      (realItem) => realItem.tick === mockItem.tick,
    );
    return !realItem;
  });
  return realData.concat(result);
}

export const accountRouter = router({
  /**
   * 获取账号铭文列表
   */
  tickList: noAuthProcedure
    .input((input) => input as TickListReq)
    .query(async ({ input, ctx }): Promise<TickListRes> => {
      return await getAccountTickList(ctx.opts.dotaApiUrl, input.account);
    }),
});

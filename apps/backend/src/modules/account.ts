import { BizError } from 'apps/libs/error';
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
    throw BizError.of('ERROR', data?.error);
  }

  return data.balance.map((item: any) => ({
    tick: item.tick,
    balance: BigInt(parseInt(item.available)),
  }));
}

export async function getAccountTick(
  host: string,
  account: string,
  tick: string,
): Promise<TickBalanceRes> {
  const list = await getAccountTickList(host, account);
  const item = list.find((item) => item.tick.toLocaleLowerCase() === tick.toLocaleLowerCase());
  return {
    balance: item?.balance ?? 0n,
  };
};

export const accountRouter = router({
  /**
   * 获取账号铭文列表
   */
  tickList: noAuthProcedure
    .input((input) => input as TickListReq)
    .query(async ({ input, ctx }): Promise<TickListRes> => {
      return getAccountTickList(ctx.opts.dotaApiUrl, input.account);
    }),
  /**
   * 查询账号指定铭文余额
   */
  tick: noAuthProcedure
    .input((input) => input as TickBalanceReq)
    .query(async ({ input, ctx }): Promise<TickBalanceRes> => {
      return await getAccountTick(ctx.opts.dotaApiUrl, input.account, input.tick);
    }),
});

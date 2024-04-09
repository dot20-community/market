/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  web3Accounts,
  web3Enable,
  web3FromSource,
} from '@polkadot/extension-dapp';
import type {
  InjectedAccountWithMeta,
  InjectedExtension,
} from '@polkadot/extension-inject/types';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { u128 } from '@polkadot/types';
import { BN } from '@polkadot/util';
import { buildInscribeTransfer, fmtAddress, getApi } from 'apps/libs/util';
import { Decimal } from 'decimal.js';
import { BizError } from '../../../libs/error';

export class Wallet {
  accounts!: InjectedAccountWithMeta[];

  constructor() {}

  /**
   * 连接钱包并获取账户授权
   */
  async open() {
    const extensions = await web3Enable('DOT-20 Market');
    if (extensions.length === 0) {
      throw new BizError({ code: 'NO_EXTENSION' });
    }
    const allAccounts = await web3Accounts();
    if (allAccounts.length === 0) {
      throw new BizError({ code: 'NO_ACCOUNT' });
    }
    this.accounts = allAccounts.map((account) => ({
      ...account,
      address: fmtAddress(account.address),
    }));
  }

  /**
   * 查询账户余额(单位: planck)
   * @param address
   */
  async getBalance(address?: string): Promise<u128> {
    if (!address) {
      return new BN(0) as u128;
    }
    const api = await getApi();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const result = (await api.query.system.account(address)) as any;
    return result.data.free.toBn() as u128;
  }

  /**
   * 签署铭文转账
   *
   * @param seller 发送方地址
   * @param marker 市场方地址
   * @param dotAmt 转账的 DOT 数量
   * @param transferTick 转账的铭文名称
   * @param transferAmt 转账的的铭文数量
   */
  async signTransferInscribe(
    seller: string,
    marker: string,
    dotAmt: Decimal,
    transferTick: string,
    transferAmt: Decimal,
  ): Promise<string> {
    const api = await getApi();

    const injected = await this.request(seller);
    const transfer = buildInscribeTransfer(
      api,
      transferTick,
      transferAmt,
      marker,
      dotAmt,
    );
    try {
      const signedTransfer = await transfer.signAsync(seller, {
        signer: injected.signer,
      });
      return signedTransfer.toHex();
    } catch (e) {
      if (e instanceof Error && e.message === 'Rejected by user') {
        throw new BizError({ code: 'USER_REJECTED' });
      }
      throw e;
    }
  }

  /**
   * 签署DOT转账
   * @param buyer  买方地址
   * @param marker  市场方地址
   * @param dotAmt  转账的 DOT 数量
   * @param serviceFee 转账手续费
   * @returns
   */
  async signTransfer(
    buyer: string,
    marker: string,
    dotAmt: Decimal,
    serviceFee: Decimal,
  ): Promise<string> {
    const api = await getApi();

    const injected = await this.request(buyer);
    // 转账 总价+服务费 给平台
    const tx = api.tx.balances.transferKeepAlive(
      marker,
      dotAmt.add(serviceFee).toFixed(),
    );
    try {
      const signedTransfer = await tx.signAsync(buyer, {
        signer: injected.signer,
      });
      return signedTransfer.toHex();
    } catch (e) {
      if (e instanceof Error && e.message === 'Rejected by user') {
        throw new BizError({ code: 'USER_REJECTED' });
      }
      throw e;
    }
  }

  setAccountsFromJSON(accountsJSON: string) {
    this.accounts = JSON.parse(accountsJSON);
  }

  private async request(from: string): Promise<InjectedExtension> {
    const account = this.accounts.find((account) => account.address === from);
    if (!account) {
      throw new BizError({ code: 'NO_ACCOUNT' });
    }

    return await web3FromSource(account.meta.source);
  }
}

export const wallet = new Wallet();

/**
 * 查询当前gas费用(单位: planck)
 */
export async function getGas(): Promise<u128> {
  const api = await getApi();

  const testAddress = import.meta.env.VITE_MARKET_ACCOUNT;
  const transfer = buildInscribeTransfer(
    api,
    '18',
    new Decimal(5000000),
    testAddress,
    new Decimal(0),
  );
  // Estimate the gas fee
  const paymentInfo = await transfer.paymentInfo(testAddress);
  return paymentInfo.partialFee.toBn() as u128;
}

/**
 * 脱敏钱包地址，展示前6位和后4位，中间用...代替
 */
export function desensitizeAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

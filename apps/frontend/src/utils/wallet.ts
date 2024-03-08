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
import { buildInscribeTransfer, fmtAddress, getApi } from 'apps/libs/util';
import { Decimal } from 'decimal.js';
import { BizError } from '../../../libs/error';

export class Wallet {
  accounts!: InjectedAccountWithMeta[];

  constructor() {
  }

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
    this.accounts = allAccounts;
  }

  /**
   * 查询账户余额(单位: planck)
   * @param address
   */
  async getBalance(address: string): Promise<u128> {
    const api = await getApi();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const result = (await api.query.system.account(address)) as any;
    return result.data.free.toBn() as u128;
  }

  /**
   * 签署铭文转账
   *
   * @param from 发送方地址
   * @param to 接收方地址
   * @param dotAmt 转账的 DOT 数量
   * @param inscribeTick 转账的铭文名称
   * @param inscribeAmt 转账的的铭文数量
   */
  async signTransferInscribe(
    from: string,
    to: string,
    dotAmt: Decimal,
    inscribeTick: string,
    inscribeAmt: number,
  ): Promise<string> {
    const api = await getApi();

    const injected = await this.request(from);
    const tx1 = api.tx.balances.transferKeepAlive(to, dotAmt.toFixed());
    const tx2 = api.tx.system.remarkWithEvent(
      buildInscribeTransfer(inscribeTick, inscribeAmt),
    );
    const transfer = api.tx.utility.batchAll([tx1, tx2]);
    try {
      const signedTransfer = await transfer.signAsync(from, {
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
   * @param from
   * @param to
   * @param dotAmt
   * @returns
   */
  async signTransfer(
    from: string,
    to: string,
    dotAmt: Decimal,
  ): Promise<string> {
    const injected = await this.request(from);
    const transfer = this.api.tx.balances.transferKeepAlive(
      to,
      dotAmt.toFixed(),
    );
    try {
      const signedTransfer = await transfer.signAsync(from, {
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

/**
 * 查询当前gas费用(单位: planck)
 */
export async function getGas(): Promise<u128> {
  const api = await getApi();

  const testAddress = import.meta.env.VITE_MARKET_ACCOUNT;
  const tx1 = api.tx.balances.transferKeepAlive(testAddress, 0);
  const tx2 = api.tx.system.remarkWithEvent(
    buildInscribeTransfer("DOTA", 5000),
  );
  const transfer = api.tx.utility.batchAll([tx1, tx2]);
  // Estimate the gas fee
  const paymentInfo = await transfer.paymentInfo(testAddress);
  return paymentInfo.partialFee.toBn() as u128;
}

/**
 * 从localstorage获取当前选中的的账号address
 */
export function getCurrentAccountAddress() {
  const accountsStr = localStorage.getItem('DotWalletAccounts');
  if (!accountsStr) {
    return '';
  }
  const accounts = JSON.parse(accountsStr) as InjectedAccountWithMeta[];
  const selectedAccountIndexStr = localStorage.getItem('selectedAccountIndex');
  if (!selectedAccountIndexStr) {
    return accounts[0].address;
  } else {
    return fmtAddress(accounts[parseInt(selectedAccountIndexStr)].address);
  }
}

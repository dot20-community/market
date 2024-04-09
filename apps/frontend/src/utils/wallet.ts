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
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { u128 } from '@polkadot/types';
import { BN } from '@polkadot/util';
import {
  assetAmountToDecimal,
  buildInscribeTransfer,
  dot2Planck,
  fmtAddress,
  fmtAssetBalance,
  getApi,
  getAssetHubApi,
} from 'apps/libs/util';
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
   * 查询AssetHub指定资产余额
   * @param assetId
   * @param address
   */
  async getAssetHubBalance(assetId: BN, address: string): Promise<number> {
    const api = await getAssetHubApi();
    const assetMetadataRes = await api.query.assets.metadata(assetId);
    const assetMetadata: any = assetMetadataRes.toPrimitive();
    const balanceInfoRes = await api.query.assets.account(assetId, address);
    const balanceInfo: any = balanceInfoRes.toPrimitive();
    const balance = fmtAssetBalance(
      balanceInfo['balance'],
      assetMetadata['decimals'],
    );
    return balance.toNumber();
  }

  /**
   * 转账AssetHub指定资产
   * @param assetId
   * @param from
   * @param to
   * @param amount
   * @param cb
   */
  async assetHubTransfer(
    assetId: BN,
    from: string,
    to: string,
    amount: number | u128 | Decimal | string,
    cb: (hash: string) => void,
  ) {
    const api = await getAssetHubApi();
    const assetMetadataRes = await api.query.assets.metadata(assetId);
    const assetMetadata: any = assetMetadataRes.toPrimitive();
    const assetDecimals = assetMetadata['decimals'];
    const tx = api.tx.assets.transferKeepAlive(
      assetId,
      to,
      new BN(assetAmountToDecimal(amount, assetDecimals).toString()),
    );
    await this.signAndSend(tx, from, cb);
  }

  /**
   * 跨链转账
   * @param from
   * @param to
   * @param amount
   */
  async dot2AssetHub(
    from: string,
    to: string,
    amount: number | u128 | Decimal | string,
    cb: (hash: string) => void,
  ) {
    const api = await getApi();
    const p1 = { V3: { interior: { X1: { ParaChain: 1000 } }, parents: 0 } };
    const p2 = {
      V3: {
        interior: {
          X1: {
            AccountId32: {
              id: api.createType('AccountId32', to).toHex(),
              network: null,
            },
          },
        },
        parents: 0,
      },
    };
    const p3 = {
      V3: [
        {
          fun: {
            Fungible: new BN(dot2Planck(amount).toString()),
          },
          id: {
            Concrete: {
              interior: 'Here',
              parents: 0,
            },
          },
        },
      ],
    };
    const tx = api.tx.xcmPallet.limitedTeleportAssets(p1, p2, p3, 0, {
      Unlimited: null,
    });
    await this.signAndSend(tx, from, cb);
  }

  /**
   * 跨链转账
   * @param from
   * @param to
   * @param amount
   */
  async assetHub2Dot(
    from: string,
    to: string,
    amount: number | u128 | Decimal | string,
    cb: (hash: string) => void,
  ) {
    const api = await getAssetHubApi();
    const p1 = { V3: { interior: 'Here', parents: 1 } };
    const p2 = {
      V3: {
        interior: {
          X1: {
            AccountId32: {
              id: api.createType('AccountId32', to).toHex(),
              network: null,
            },
          },
        },
        parents: 0,
      },
    };
    const p3 = {
      V3: [
        {
          fun: {
            Fungible: new BN(dot2Planck(amount).toString()),
          },
          id: {
            Concrete: {
              interior: 'Here',
              parents: 1,
            },
          },
        },
      ],
    };
    const tx = api.tx.polkadotXcm.limitedTeleportAssets(p1, p2, p3, 0, {
      Unlimited: null,
    });
    await this.signAndSend(tx, from, cb);
  }

  async signAndSend(
    tx: SubmittableExtrinsic<'promise', any>,
    account: string,
    cb: (hash: string) => void,
  ) {
    const accountInfo = this.accounts.find((i) => i.address === account);
    if (!accountInfo) {
      throw new BizError({ code: 'NO_ACCOUNT' });
    }
    const injected = await web3FromSource(accountInfo.meta.source);
    const unsub = await tx.signAndSend(
      account,
      { signer: injected.signer },
      ({ events, status }) => {
        console.log('Transaction status:', status.type);
        if (status.isInBlock) {
          const hash = status.asInBlock.toHex();
          console.log('Completed at block hash', hash);
          unsub();
          cb(hash);
        }
      },
    );
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
   * @param seller  卖方地址
   * @param marker  市场方地址
   * @param dotAmt  转账的 DOT 数量
   * @param serviceFee 转账手续费
   * @returns
   */
  async signTransfer(
    buyer: string,
    seller: string,
    marker: string,
    dotAmt: Decimal,
    serviceFee: Decimal,
  ): Promise<string> {
    const api = await getApi();

    const injected = await this.request(buyer);
    // 转账给卖方
    const tx1 = api.tx.balances.transferKeepAlive(seller, dotAmt.toFixed());
    // 转账手续费给平台
    const tx2 = api.tx.balances.transferKeepAlive(marker, serviceFee.toFixed());
    const transfer = api.tx.utility.batchAll([tx1, tx2]);
    try {
      const signedTransfer = await transfer.signAsync(buyer, {
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

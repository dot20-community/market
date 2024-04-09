import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { u128 } from '@polkadot/types';
import { Extrinsic } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { Decimal } from 'decimal.js';

let POLKADOT_DECIMALS: number;
export function setPolkadotDecimals(decimals: number | string) {
  POLKADOT_DECIMALS =
    typeof decimals === 'string' ? parseInt(decimals) : decimals;
}
export function getPolkadotDecimals() {
  return POLKADOT_DECIMALS;
}

let POLKADOT_ENDPOINT: string;
export function setPolkadotEndpoint(endpoint: string) {
  POLKADOT_ENDPOINT = endpoint;
}
export function getPolkadotEndpoint() {
  return POLKADOT_ENDPOINT;
}

let api: ApiPromise;
export async function getApi(): Promise<ApiPromise> {
  if (!api) {
    const provider = new WsProvider(POLKADOT_ENDPOINT);
    api = await ApiPromise.create({ provider });
  }
  return api;
}

/**
 * 校验是否为ss58地址
 */
export function isSS58Address(address: string): boolean {
  try {
    decodeAddress(address);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 格式化成波卡主网钱包地址
 * @param address
 * @returns
 */
export function fmtAddress(address: string): string {
  return encodeAddress(decodeAddress(address), 0);
}

/**
 * 转换planck到dot
 */
export function planck2Dot(
  balance: number | u128 | Decimal | bigint,
  decimals?: number,
): Decimal {
  const value =
    balance instanceof Decimal ? balance : new Decimal(balance.toString());
  return value.div(new Decimal(10).pow(decimals || POLKADOT_DECIMALS));
}

/**
 * 转换dot到planck
 */
export function dot2Planck(
  dot: number | u128 | Decimal,
  decimals?: number,
): Decimal {
  const value = dot instanceof Decimal ? dot : new Decimal(dot.toString());
  return value.mul(new Decimal(10).pow(decimals || POLKADOT_DECIMALS));
}

/**
 * 链上科学计数法转换成planck
 */
export function str2Planck(value?: string): Decimal {
  if (!value) {
    return new Decimal(0);
  }
  return new Decimal(value.replace(/,/g, ''));
}

/**
 * 校验是否为数值类型
 * @param value
 * @returns
 */
export function isNumber(value: string) {
  return /^-?\d+\.?\d*$/.test(value);
}

export async function getAssetBalance(
  api: ApiPromise,
  assetId: string,
  account: string,
) {
  const data = await getAssetsBalance(api, [assetId], account);
  return data[0].balance;
}

/**
 * 批量获取账户指定资产余额，单位: planck
 * @param api
 * @param assetIds
 * @param account
 */
export async function getAssetsBalance(
  api: ApiPromise,
  assetIds: string[],
  account: string,
) {
  const data = await api.query.assets.account.multi(
    assetIds.map((id) => [new BN(id), account]),
  );
  return assetIds.map((id, index) => ({
    assetId: id,
    balance: str2Planck((data[index]?.toHuman() as any)?.balance),
  }));
}

export function buildInscribeTransfer(
  api: ApiPromise,
  assetId: string,
  amt: Decimal,
  to: string,
  dotAmt: Decimal,
): SubmittableExtrinsic<'promise'> {
  const tx1 = api.tx.balances.transferKeepAlive(to, dotAmt.toFixed());
  const tx2 = api.tx.assets.transferKeepAlive(
    parseInt(assetId),
    to,
    amt.toFixed(),
  );
  return api.tx.utility.batchAll([tx1, tx2]);
}

export function buildAssetTransfer(
  api: ApiPromise,
  assetId: string,
  amt: Decimal,
  to: string,
): SubmittableExtrinsic<'promise'> {
  return api.tx.assets.transferKeepAlive(parseInt(assetId), to, amt.toFixed());
}

export type TransferCall = {
  to: string;
  value: Decimal;
};

export type TransferAssetCall = {
  assetId: string;
  to: string;
  value: Decimal;
};

export type InscribeTransfer = {
  from: string;
  transfer: TransferCall;
  assetTransfer: TransferAssetCall;
};

export type BatchTransfer = {
  from: string;
  list: TransferCall[];
};

/**
 * 解析铭文转账记录
 */
export function parseInscribeTransfer(ex: Extrinsic): InscribeTransfer | null {
  if (ex.method.method !== 'batchAll' || ex.method.section !== 'utility') {
    return null;
  }
  const methodJson = ex.method.toHuman() as any;
  if (!methodJson?.args?.calls || methodJson.args.calls.length !== 2) {
    return null;
  }

  const call0 = methodJson.args.calls[0];
  const call0Transfer = verifyIsBalanceTransferKeepAlive(call0);
  if (!call0Transfer) {
    return null;
  }

  const call1 = methodJson.args.calls[1];
  const call1Transfer = verifyIsAssetTransferKeepAlive(call1);
  if (!call1Transfer) {
    return null;
  }

  return {
    from: fmtAddress(ex.signer.toString()),
    transfer: call0Transfer,
    assetTransfer: call1Transfer,
  };
}

/**
 * 解析转账记录
 */
export function parseBatchTransfer(ex: Extrinsic): BatchTransfer | null {
  if (!verifyIsBatchUtil(ex)) {
    return null;
  }
  const methodJson = ex.method.toHuman() as any;
  if (!methodJson?.args?.calls || methodJson.args.calls.length !== 2) {
    return null;
  }

  const call0 = methodJson.args.calls[0];
  const call0Transfer = verifyIsBalanceTransferKeepAlive(call0);
  if (!call0Transfer) {
    return null;
  }
  const call1 = methodJson.args.calls[1];
  const call1Transfer = verifyIsBalanceTransferKeepAlive(call1);
  if (!call1Transfer) {
    return null;
  }

  return {
    from: fmtAddress(ex.signer.toString()),
    list: [call0Transfer, call1Transfer],
  };
}

function verifyIsBatchUtil(ex: Extrinsic): boolean {
  return ex.method.method === 'batchAll' && ex.method.section === 'utility';
}

function verifyIsBalanceTransferKeepAlive(call: any): TransferCall | null {
  if (
    call?.method !== 'transferKeepAlive' ||
    call?.section !== 'balances' ||
    !call?.args?.dest?.Id ||
    !isSS58Address(call.args.dest.Id) ||
    !call?.args?.value
  ) {
    return null;
  }

  return {
    to: fmtAddress(call.args.dest.Id),
    value: str2Planck(call.args.value),
  };
}

function verifyIsAssetTransferKeepAlive(call: any): TransferAssetCall | null {
  if (
    call?.method !== 'transferKeepAlive' ||
    call?.section !== 'assets' ||
    !call?.args?.id ||
    !call?.args?.target?.Id ||
    !isSS58Address(call.args.target.Id) ||
    !call?.args?.amount
  ) {
    return null;
  }

  return {
    assetId: call.args.id.replace(/,/g, ''),
    to: fmtAddress(call.args.target.Id),
    value: str2Planck(call.args.amount),
  };
}

export function toCamelCase(str: string) {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', ''),
  );
}

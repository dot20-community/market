import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { u128 } from '@polkadot/types';
import { Extrinsic } from '@polkadot/types/interfaces';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { Decimal } from 'decimal.js';

let POLKADOT_DECIMALS: number;
const decimalsPow = () => new Decimal(10).pow(POLKADOT_DECIMALS);

export function setPolkadotDecimals(decimals: number | string) {
  POLKADOT_DECIMALS =
    typeof decimals === 'string' ? parseInt(decimals) : decimals;
}

let POLKADOT_ENDPOINT: string;
export function setPolkadotEndpoint(endpoint: string) {
  POLKADOT_ENDPOINT = endpoint;
}

let api: ApiPromise;
export async function getApi(): Promise<ApiPromise> {
  if (!api) {
    console.log('Connecting to Polkadot API:', POLKADOT_ENDPOINT);
    const provider = new WsProvider(POLKADOT_ENDPOINT);
    api = await ApiPromise.create({ provider });
  }
  return api;
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
export function planck2Dot(balance: number | u128 | Decimal): Decimal {
  const value = balance instanceof Decimal ? balance : new Decimal(balance.toString());
  return value.div(decimalsPow());
}

/**
 * 转换dot到planck
 */
export function dot2Planck(dot: number | u128 | Decimal): Decimal {
  const value = dot instanceof Decimal ? dot : new Decimal(dot.toString());
  return value.mul(decimalsPow());
}

/**
 * 链上科学计数法转换成planck
 */
export function str2Planck(value: string): Decimal {
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

export function buildInscribeTransferRemark(tick: string, amt: number): string {
  return `{"p":"dot-20","op":"transfer","tick":"${tick.toUpperCase()}","amt":${amt}}`;
}

export function buildInscribeTransfer(
  api: ApiPromise,
  tick: string,
  amt: number,
  to: string,
  dotAmt?: Decimal,
): SubmittableExtrinsic<'promise'> {
  const tx1 = api.tx.balances.transferKeepAlive(
    to,
    dotAmt ? dotAmt.toFixed() : 0,
  );
  const tx2 = api.tx.system.remarkWithEvent(
    buildInscribeTransferRemark(tick, amt),
  );
  return api.tx.utility.batchAll([tx1, tx2]);
}

export type TransferCall = {
  to: string;
  value: Decimal;
};

export type InscribeTransfer = {
  from: string;
  inscribeTick: string;
  inscribeAmt: number;
} & TransferCall;

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
  const call0Transfer = verifyIsTransferKeepAlive(call0);
  if (!call0Transfer) {
    return null;
  }

  const call1 = methodJson.args.calls[1];
  if (
    !['remarkWithEvent'].includes(call1?.method as string) ||
    call1?.section !== 'system' ||
    !call1?.args?.remark
  ) {
    return null;
  }

  // Remove the spaces in the memo, replace single quotes with double quotes, then convert everything to lowercase
  const remark = (call1.args.remark as string)
    .replaceAll(' ', '')
    .replaceAll("'", '"')
    .toLowerCase();
  // Try to parse the remark as a JSON object
  let content: any;
  try {
    content = JSON.parse(remark);
  } catch (err) {
    return null;
  }

  if (remark !== buildInscribeTransferRemark(content.tick, content.amt)) {
    return null;
  }

  return {
    ...call0Transfer,
    from: fmtAddress(ex.signer.toString()),
    inscribeTick: content.tick,
    inscribeAmt: content.amt,
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
  const call0Transfer = verifyIsTransferKeepAlive(call0);
  if (!call0Transfer) {
    return null;
  }
  const call1 = methodJson.args.calls[1];
  const call1Transfer = verifyIsTransferKeepAlive(call1);
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

function verifyIsTransferKeepAlive(call: any): TransferCall | null {
  if (
    call?.method !== 'transferKeepAlive' ||
    call?.section !== 'balances' ||
    !call?.args?.dest?.Id ||
    call.args.dest.Id.length < 40 ||
    !call?.args?.value
  ) {
    return null;
  }

  return {
    to: fmtAddress(call.args.dest.Id),
    value: str2Planck(call.args.value),
  };
}

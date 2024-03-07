import { u128 } from '@polkadot/types';
import { Extrinsic } from '@polkadot/types/interfaces';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { Decimal } from 'decimal.js';

/**
 * 格式化成波卡主网钱包地址
 * @param address
 * @returns
 */
export function fmtAddress(address: string): string {
  return encodeAddress(decodeAddress(address), 0);
}

let POLKADOT_DECIMALS: number;
const decimalsPow = () => (new Decimal(10)).pow(POLKADOT_DECIMALS)

export function setPolkadotDecimals(decimals: number | string) {
  POLKADOT_DECIMALS = typeof decimals === 'string' ? parseInt(decimals) : decimals
}

/**
 * 转换planck到dot
 */
export function planck2Dot(balance: number | u128 | Decimal): Decimal {
  return new Decimal(balance.toString()).div(decimalsPow())
}

/**
 * 转换dot到planck
 */
export function dot2Planck(dot: number | u128 | Decimal): Decimal {
  return new Decimal(dot.toString()).mul(decimalsPow())
}

/**
 * 链上科学计数法转换成planck
 */
export function str2Planck(value: string): Decimal {
  return new Decimal(value.replace(/,/g, ''))
}

export function buildInscribeTransfer(tick: string, amt: number) {
  return `{"p":"dot-20","op":"transfer","tick":"${tick}","amt":${amt}}`
}

export type InscribeTransfer = {
  from: string;
  to: string;
  transfer: Decimal;
  inscribeTick: string;
  inscribeAmt: number;
}

/**
 * 解析铭文转账记录
 */
export function parseInscribeTransfer(ex: Extrinsic): InscribeTransfer | null {
  if (
    ex.method.method !== 'batchAll' ||
    ex.method.section !== 'utility'
  ) {
    return null;
  }
  const methodJson = ex.method.toHuman() as any;
  if (
    !methodJson?.args?.calls ||
    methodJson.args.calls.length !== 2
  ) {
    return null;
  }

  const call0 = methodJson.args.calls[0];
  if (
    call0?.method !== 'transferKeepAlive' ||
    call0?.section !== 'balances' ||
    !call0?.args?.dest?.Id ||
    call0.args.dest.Id.length < 40 ||
    !call0?.args?.value
  ) {
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

  if (remark !== buildInscribeTransfer(content.tick, content.amt)) {
    return null;
  }

  return {
    from: fmtAddress(ex.signer.toString()),
    to: fmtAddress(call0.args.dest.Id),
    transfer: str2Planck(call0.args.value),
    inscribeTick: content.tick,
    inscribeAmt: content.amt,
  }
}
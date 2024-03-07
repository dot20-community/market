import { u128 } from '@polkadot/types';
import { BN, formatBalance } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

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
export function planck2Dot(balance: u128, decimals: number | string): number {
  const decimalsInt =
    typeof decimals === 'string' ? parseInt(decimals) : decimals;
  console.log(
    'decimalsInt:',
    typeof decimalsInt,
    decimalsInt,
    formatBalance(balance, {
      withUnit: false,
      decimals: 12,
    }),
  );
  return parseFloat(
    formatBalance(balance, {
      withUnit: false,
      decimals: decimalsInt,
    }),
  );
}

/**
 * 转换dot到planck
 */
export function dot2Planck(dot: number, decimals: number | string): u128 {
  const decimalsInt =
    typeof decimals === 'string' ? parseInt(decimals) : decimals;
  return new BN(dot * 10 ** decimalsInt) as u128;
}

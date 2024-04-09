import { planck2Dot } from 'apps/libs/util';
import Decimal from 'decimal.js';

export function toDecimal(value: Decimal | bigint) {
  return value instanceof Decimal ? value : new Decimal(value.toString());
}

export function calcUnitPrice(
  totalPrice: Decimal | bigint,
  amount: Decimal | bigint,
  dp?: number,
): Decimal {
  const totalPriceDec = toDecimal(totalPrice);
  return totalPriceDec.mul(Math.pow(10, dp || 0)).div(toDecimal(amount));
}

export function fmtDecimal(value?: Decimal, dp?: number) {
  if (!value) {
    return '0';
  }
  const part1 = BigInt(value.trunc().toFixed()).toLocaleString();
  // 如果有小数部分，则再拼接上小数部分
  let part2 = '';
  if (value.dp() > 0) {
    const temp =
      dp && value.dp() > dp
        ? value.toFixed(dp, Decimal.ROUND_FLOOR)
        : value.toFixed();
    part2 = '.' + temp.split('.')[1];
  }
  return part1 + part2;
}

export function fmtDot(dotPlanck: Decimal | bigint) {
  const dotAmt = planck2Dot(toDecimal(dotPlanck));
  return fmtDecimal(dotAmt, 4);
}

export function toUsd(dotPlanck: Decimal | bigint, price: number, dp?: number) {
  return '$' + fmtDecimal(planck2Dot(toDecimal(dotPlanck)).mul(price), dp || 4);
}

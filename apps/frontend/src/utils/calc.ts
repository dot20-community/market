import { planck2Dot } from 'apps/libs/util';
import Decimal from 'decimal.js';

export function toDecimal(value: Decimal | bigint) {
  return value instanceof Decimal ? value : new Decimal(value.toString());
}

export function calcUnitPrice(
  totalPrice: Decimal | bigint,
  amount: Decimal | bigint,
): Decimal {
  const totalPriceDec = toDecimal(totalPrice);
  return totalPriceDec.mul(10000).div(toDecimal(amount));
}

export function fmtDecimal(value: Decimal) {
  if (value.dp() > 4) {
    return value.toFixed(4, Decimal.ROUND_UP);
  }
  return value.toFixed();
}

export function fmtDot(dotPlanck: Decimal | bigint) {
  const dotAmt = planck2Dot(toDecimal(dotPlanck));
  return fmtDecimal(dotAmt);
}

export function toUsd(dotPlanck: Decimal | bigint, price: number) {
  return '$' + fmtDecimal(planck2Dot(toDecimal(dotPlanck)).mul(price));
}

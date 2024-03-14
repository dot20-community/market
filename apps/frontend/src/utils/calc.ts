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

export function fmtDecimal(value: Decimal, dp?: number) {
  const showDp = dp ?? 4;
  if (value.dp() > showDp) {
    return value.toFixed(showDp, Decimal.ROUND_UP);
  }
  return value.toFixed();
}

export function fmtDot(dotPlanck: Decimal | bigint) {
  const dotAmt = planck2Dot(toDecimal(dotPlanck));
  return fmtDecimal(dotAmt);
}

export function toUsd(dotPlanck: Decimal | bigint, price: number, dp?: number) {
  return '$' + fmtDecimal(planck2Dot(toDecimal(dotPlanck)).mul(price), dp);
}

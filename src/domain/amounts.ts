import {invariant} from './errors';
export const UINT256_MAX = (1n << 256n) - 1n;
export function scale(decimals: number): bigint {
  invariant(Number.isInteger(decimals) && decimals >= 0 && decimals <= 36, 'Missing or unsupported asset decimals');
  return 10n ** BigInt(decimals);
}
export function parseAmount(text: string, decimals: number, positive = true): bigint {
  const unit = scale(decimals);
  invariant(text.length <= 120 && /^(0|[1-9]\d*)(\.\d+)?$/.test(text), 'Use plain decimal digits, without signs, commas or exponents');
  const [whole, fraction = ''] = text.split('.');
  invariant(fraction.length <= decimals, `At most ${decimals} decimal places allowed; values are never rounded`);
  const raw = BigInt(whole) * unit + BigInt(fraction.padEnd(decimals, '0') || '0');
  invariant(raw <= UINT256_MAX && (!positive || raw > 0n), 'Amount is zero or outside the supported range');
  return raw;
}
export function formatAmount(raw: bigint | string, decimals: number): string {
  const value = BigInt(raw); const unit = scale(decimals);
  const negative = value < 0n; const absolute = negative ? -value : value;
  const fraction = (absolute % unit).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${absolute / unit}${fraction ? `.${fraction}` : ''}`;
}
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  invariant(numerator >= 0n && denominator > 0n, 'Invalid bound divisor');
  return (numerator + denominator - 1n) / denominator;
}

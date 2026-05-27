import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeInn(value: string) {
  return value.replace(/\D/g, '').slice(0, 12);
}

function innControlDigit(digits: number[], coefficients: number[]) {
  const sum = coefficients.reduce((total, coefficient, index) => total + coefficient * digits[index], 0);
  return (sum % 11) % 10;
}

export function isValidRuInn(value: string) {
  const inn = normalizeInn(value);
  if (inn.length !== 10 && inn.length !== 12) return false;

  const digits = inn.split('').map(Number);

  if (inn.length === 10) {
    return innControlDigit(digits, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[9];
  }

  const firstControl = innControlDigit(digits, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
  const secondControl = innControlDigit(digits, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
  return firstControl === digits[10] && secondControl === digits[11];
}

export const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

export function isValidSymbol(value: string): boolean {
  return SYMBOL_PATTERN.test(value);
}

export function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Splits a comma or whitespace separated symbol list, normalizes each entry,
 * keeps only valid symbols, and dedupes. Optionally caps the result length.
 */
export function splitSymbols(value: string, max?: number): string[] {
  const symbols = [
    ...new Set(
      value
        .split(/[\s,]+/)
        .map(normalizeSymbol)
        .filter(isValidSymbol)
    ),
  ];
  return max === undefined ? symbols : symbols.slice(0, max);
}

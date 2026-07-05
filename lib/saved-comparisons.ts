const MAX_SYMBOLS = 5;
const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;
const RESERVED_WORDS = new Set([
  "DELETE",
  "DROP",
  "FROM",
  "INSERT",
  "SELECT",
  "TABLE",
  "UPDATE",
]);

export interface SavedComparisonInput {
  name: string;
  symbols: string | string[];
}

export interface NormalizedSavedComparisonInput {
  name: string;
  symbols: string[];
}

export function normalizeSavedComparisonInput(
  input: SavedComparisonInput
): NormalizedSavedComparisonInput {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) {
    throw new Error("Name is required");
  }

  const symbolsInput = Array.isArray(input.symbols)
    ? input.symbols.join(",")
    : input.symbols;
  const symbols = [
    ...new Set(
      symbolsInput
        .split(/[\s,]+/)
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(
          (symbol) => SYMBOL_PATTERN.test(symbol) && !RESERVED_WORDS.has(symbol)
        )
    ),
  ].slice(0, MAX_SYMBOLS);
  if (symbols.length < 2 || symbols.length > 5) {
    throw new Error("Choose 2 to 5 symbols");
  }

  return { name, symbols };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

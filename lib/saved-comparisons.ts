import { isValidSymbol } from "./symbol.ts";

const MAX_SYMBOLS = 5;
export const MAX_COMPARISON_NAME_LENGTH = 60;
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
  if (name.length > MAX_COMPARISON_NAME_LENGTH) {
    throw new Error(
      `Name must be ${MAX_COMPARISON_NAME_LENGTH} characters or fewer`
    );
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
          (symbol) => isValidSymbol(symbol) && !RESERVED_WORDS.has(symbol)
        )
    ),
  ].slice(0, MAX_SYMBOLS);
  if (symbols.length < 2 || symbols.length > 5) {
    throw new Error("Choose 2 to 5 symbols");
  }

  return { name, symbols };
}

export { isUuid } from "./parse.ts";

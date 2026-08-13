import Link from "next/link";
import { ChangeChip } from "@/components/change-chip";
import { TableCell } from "@/components/ui/table";
import { formatPrice } from "@/lib/format";

export interface StockQuoteData {
  price: number;
  changePercent: number;
  open: number;
  prevClose: number;
  low: number;
  high: number;
}

export interface StockQuoteRowData {
  symbol: string;
  error?: string | null;
  quote?: StockQuoteData | null;
}

export function QuotePriceChangeCells({
  quote,
}: Readonly<{
  quote?: StockQuoteData | null;
}>) {
  return (
    <>
      <TableCell className="text-right font-semibold tabular-nums">
        {quote ? formatPrice(quote.price) : "-"}
      </TableCell>
      <TableCell>
        {quote ? (
          <ChangeChip value={quote.changePercent} />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {quote ? formatPrice(quote.open) : "-"}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {quote ? formatPrice(quote.prevClose) : "-"}
      </TableCell>
      <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground lg:table-cell">
        {quote
          ? `${formatPrice(quote.low)} / ${formatPrice(quote.high)}`
          : "-"}
      </TableCell>
    </>
  );
}

export function StockQuoteRowCells({
  row,
}: Readonly<{
  row: StockQuoteRowData;
}>) {
  return (
    <>
      <TableCell>
        <Link
          href={`/stock/${row.symbol}`}
          className="font-semibold text-foreground hover:text-primary"
        >
          {row.symbol}
        </Link>
        {row.error && (
          <p className="mt-1 text-xs text-muted-foreground">{row.error}</p>
        )}
      </TableCell>
      <QuotePriceChangeCells quote={row.quote} />
    </>
  );
}

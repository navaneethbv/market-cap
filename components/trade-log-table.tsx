import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatPrice } from "@/lib/format";
import type { PaperTrade } from "@/lib/paper-trading";

export function TradeLogTable({
  trades,
}: Readonly<{
  trades: PaperTrade[];
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Total
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            Executed
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell>
              <Link
                href={`/stock/${trade.symbol}`}
                className="font-semibold text-foreground hover:text-primary"
              >
                {trade.symbol}
              </Link>
            </TableCell>
            <TableCell className="capitalize">{trade.side}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(trade.shares, 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPrice(trade.price)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {formatPrice(trade.shares * trade.price)}
            </TableCell>
            <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
              {new Date(trade.executed_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

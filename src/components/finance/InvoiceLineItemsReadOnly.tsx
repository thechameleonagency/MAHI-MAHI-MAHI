import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR } from "@/lib/formatCurrency";

export interface InvoiceLineItemReadModel {
  description: string;
  hsn?: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

interface InvoiceLineItemsReadOnlyProps {
  items: InvoiceLineItemReadModel[];
}

/** Taxable line value (GST shown in document footer totals). */
function lineTaxableAmount(item: InvoiceLineItemReadModel): number {
  return item.quantity * item.rate;
}

/** Read-only invoice lines: stacked cards on phone, table from `md` (UX3). */
export function InvoiceLineItemsReadOnly({ items }: InvoiceLineItemsReadOnlyProps) {
  if (items.length === 0) return null;

  return (
    <>
      <div className="space-y-2 md:hidden" aria-label="Invoice line items">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm space-y-2"
          >
            <p className="font-medium leading-snug">{item.description}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.hsn ? (
                <>
                  <dt>HSN</dt>
                  <dd className="text-foreground">{item.hsn}</dd>
                </>
              ) : null}
              <dt>Qty</dt>
              <dd className="text-foreground tabular-nums">{item.quantity}</dd>
              <dt>Rate</dt>
              <dd className="text-foreground tabular-nums">{formatINR(item.rate)}</dd>
              <dt>GST</dt>
              <dd className="text-foreground tabular-nums">{item.gstRate}%</dd>
            </dl>
            <p className="text-right font-semibold tabular-nums">{formatINR(lineTaxableAmount(item))}</p>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-md border" aria-hidden={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-[10rem] bg-background">Description</TableHead>
              <TableHead>HSN</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">GST %</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="sticky left-0 z-[1] min-w-[10rem] bg-background font-medium">
                  {item.description}
                </TableCell>
                <TableCell>{item.hsn}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(item.rate)}</TableCell>
                <TableCell className="text-right tabular-nums">{item.gstRate}%</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatINR(lineTaxableAmount(item))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

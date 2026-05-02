import { useState, useEffect } from "react";
import { Coffee, Package, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Input } from "@/components/ui/input";

interface Expense {
  id: string;
  date: string;
  description: string;
  whoPaid: string;
  amount: number;
  category?: string;
}

interface FoodOthersExpenseTableProps {
  type: "food" | "others";
  expenses: Expense[];
  employees?: { id: number; name: string }[];
}

export default function FoodOthersExpenseTable({
  type,
  expenses,
  employees = []
}: FoodOthersExpenseTableProps) {
  const [dateFilter, setDateFilter] = useState("all");
  const [whoPaidFilter, setWhoPaidFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const filteredExpenses = expenses.filter(expense => {
    if (dateFilter !== "all") {
      const expDate = new Date(expense.date);
      const now = new Date();
      if (dateFilter === "today" && expDate.toDateString() !== now.toDateString()) return false;
      if (dateFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (expDate < weekAgo) return false;
      }
      if (dateFilter === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (expDate < monthAgo) return false;
      }
    }
    if (whoPaidFilter !== "all" && expense.whoPaid !== whoPaidFilter) return false;
    if (searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const uniquePayers = [...new Set(expenses.map(e => e.whoPaid))];

  const { pagedItems: pagedFiltered, safePage } = usePagedSlice(filteredExpenses, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, whoPaidFilter, searchQuery, type, filteredExpenses.length]);

  useEffect(() => {
    setPage(1);
  }, [expenses.length]);

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {type === "food" ? (
              <>
                <Coffee className="w-4 h-4 text-orange-500" />
                Food Expenses
              </>
            ) : (
              <>
                <Package className="w-4 h-4 text-purple-500" />
                Other Expenses
              </>
            )}
          </CardTitle>
          <Badge variant="outline" className={type === "food" ? "text-orange-600" : "text-purple-600"}>
            ₹{total.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input 
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-8"
          />
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={whoPaidFilter} onValueChange={setWhoPaidFilter}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder="Who Paid" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payers</SelectItem>
              <SelectItem value="Company">Company</SelectItem>
              {uniquePayers.filter(p => p !== "Company").map(payer => (
                <SelectItem key={payer} value={payer}>{payer}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredExpenses.length > 0 ? (
          <DataTableShell
            maxHeight={listTableViewportMaxHeight(pageSize)}
            scrollResetKey={`${safePage}-${pageSize}-${type}-${filteredExpenses.length}`}
            footer={
              <TablePaginationBar
                page={safePage}
                pageSize={pageSize}
                total={filteredExpenses.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Who Paid</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedFiltered.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">{expense.date}</TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={expense.whoPaid === "Company" ? "bg-primary/10 text-primary border-0" : ""}>
                      {expense.whoPaid}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">₹{expense.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {type === "food" ? (
              <Coffee className="w-10 h-10 mx-auto mb-2 opacity-30" />
            ) : (
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            )}
            <p>No {type} expenses recorded</p>
          </div>
        )}

        {/* Summary by Payer */}
        {filteredExpenses.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Summary by Payer</p>
            <div className="flex flex-wrap gap-2">
              {uniquePayers.map(payer => {
                const payerTotal = filteredExpenses
                  .filter(e => e.whoPaid === payer)
                  .reduce((sum, e) => sum + e.amount, 0);
                if (payerTotal === 0) return null;
                return (
                  <Badge key={payer} variant="secondary" className="text-xs">
                    {payer}: ₹{payerTotal.toLocaleString()}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

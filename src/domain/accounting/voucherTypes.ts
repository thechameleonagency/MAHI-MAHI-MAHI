export type VoucherLine = {
  accountCode: string;
  debit: number;
  credit: number;
  narration?: string;
};

export type Voucher = {
  id: string;
  sourceEvent: string;
  sourceDocumentId: string;
  lines: VoucherLine[];
  createdAt: string;
};

export const isBalancedVoucher = (voucher: Voucher): boolean => {
  const totalDebit = voucher.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = voucher.lines.reduce((sum, line) => sum + line.credit, 0);
  return Number(totalDebit.toFixed(2)) === Number(totalCredit.toFixed(2));
};

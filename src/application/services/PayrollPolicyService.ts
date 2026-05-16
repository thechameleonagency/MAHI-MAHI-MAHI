export type PayrollInput = {
  monthlySalary: number;
  totalWorkingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidDays: number;
  companyHolidays: number;
  overtimeAmount: number;
  bonusAmount: number;
  deductionsAmount: number;
  salaryAdvances: number;
  manualAdjustments: number;
};

export type PayrollOutput = {
  grossEarning: number;
  payableBeforeDeductions: number;
  finalPayable: number;
};

export class PayrollPolicyService {
  /**
   * Prorates a **fixed monthly salary** by effective paid days vs working days in the month.
   * This is not a separate “daily rate” product field — it is calendar proration of the monthly contract.
   */
  calculate(input: PayrollInput): PayrollOutput {
    const paidDays = Math.max(0, input.presentDays + input.paidLeaveDays + input.companyHolidays);
    const effectiveDays = Math.min(input.totalWorkingDays, paidDays);
    const basePay = input.totalWorkingDays > 0 ? (input.monthlySalary / input.totalWorkingDays) * effectiveDays : 0;
    const grossEarning = basePay + input.overtimeAmount + input.bonusAmount + input.manualAdjustments;
    const totalDeductions = input.deductionsAmount + input.salaryAdvances + (input.totalWorkingDays > 0 ? (input.monthlySalary / input.totalWorkingDays) * input.unpaidDays : 0);
    const finalPayable = Math.max(0, grossEarning - totalDeductions);

    return {
      grossEarning: Number(grossEarning.toFixed(2)),
      payableBeforeDeductions: Number((grossEarning - input.deductionsAmount).toFixed(2)),
      finalPayable: Number(finalPayable.toFixed(2)),
    };
  }
}

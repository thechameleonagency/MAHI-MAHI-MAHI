import { describe, expect, it } from "vitest";
import { PayrollPolicyService } from "@/application/services/PayrollPolicyService";

describe("PayrollPolicyService", () => {
  const service = new PayrollPolicyService();

  it("calculates payroll with full policy inputs", () => {
    const output = service.calculate({
      monthlySalary: 30000,
      totalWorkingDays: 30,
      presentDays: 24,
      paidLeaveDays: 2,
      unpaidDays: 2,
      companyHolidays: 2,
      overtimeAmount: 1000,
      bonusAmount: 500,
      deductionsAmount: 300,
      salaryAdvances: 2000,
      manualAdjustments: 250,
    });

    expect(output.finalPayable).toBeGreaterThan(0);
  });
});

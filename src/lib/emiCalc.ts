/**
 * Standard reducing-balance EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1)
 * @param principal  Loan amount in ₹
 * @param annualRate Annual interest rate as a percentage (e.g. 12 for 12%)
 * @param tenureMonths Number of monthly instalments
 * @returns Monthly EMI rounded to nearest rupee, or 0 for invalid inputs
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0 || annualRate < 0) return 0;
  if (annualRate === 0) return Math.round(principal / tenureMonths);
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) /
    (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * For a given EMI period, returns the principal and interest components.
 * @param principal   Original loan principal
 * @param annualRate  Annual interest rate %
 * @param tenureMonths Total months
 * @param period      1-based period number (1 = first EMI)
 */
export function emiComponents(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  period: number
): { principalComponent: number; interestComponent: number } {
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const r = annualRate / 12 / 100;
  // Outstanding principal at start of period
  const outstandingAtStart =
    annualRate === 0
      ? principal - (period - 1) * (principal / tenureMonths)
      : principal * (Math.pow(1 + r, period - 1) - Math.pow(1 + r, tenureMonths)) /
        (1 - Math.pow(1 + r, tenureMonths));
  const interestComponent = Math.round(outstandingAtStart * r);
  const principalComponent = emi - interestComponent;
  return { principalComponent, interestComponent };
}

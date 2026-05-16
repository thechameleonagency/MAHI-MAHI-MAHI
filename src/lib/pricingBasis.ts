import { parseCapacityKw } from "@/domain/agents/agentCommission";
import type { CommercialBaseline, Project, Quotation } from "@/types/project";

export type PricingBasis = "fixed" | "per_kw" | "per_sqft";

export function resolvePricingBasis(
  project: Project,
  quotation?: Quotation | null,
): PricingBasis {
  if (project.commercialBaseline?.basis) return project.commercialBaseline.basis;
  if (project.scope?.rateBasis) return project.scope.rateBasis;
  if (quotation?.pricingBasis) return quotation.pricingBasis;
  const capKw = parseCapacityKw(project.capacity);
  if (capKw > 0 && project.contractAmount > 0) {
    const impliedRate = project.contractAmount / capKw;
    if (impliedRate > 1000 && impliedRate < 500_000) return "per_kw";
  }
  return "fixed";
}

export function resolvePricingRate(project: Project, quotation?: Quotation | null): number {
  if (project.commercialBaseline?.rateValue != null) return project.commercialBaseline.rateValue;
  if (project.scope?.rateValue != null) return project.scope.rateValue;
  if (quotation?.pricingRate != null) return quotation.pricingRate;
  const capKw = parseCapacityKw(project.capacity);
  if (capKw > 0 && project.contractAmount > 0) return Math.round(project.contractAmount / capKw);
  return project.contractAmount;
}

export function resolvePricingQuantity(
  project: Project,
  quotation?: Quotation | null,
): number | undefined {
  if (project.commercialBaseline?.pricingQuantity != null) {
    return project.commercialBaseline.pricingQuantity;
  }
  if (quotation?.pricingQuantity != null) return quotation.pricingQuantity;
  const basis = resolvePricingBasis(project, quotation);
  if (basis === "per_kw") return parseCapacityKw(project.capacity);
  return undefined;
}

export function computeContractFromBasis(
  basis: PricingBasis,
  rate: number,
  quantity: number,
): number {
  if (basis === "fixed") return Math.round(rate);
  if (basis === "per_kw") return Math.round(rate * quantity);
  return Math.round(rate * quantity);
}

/** Human-readable invoice / audit line (e.g. "5kW @ ₹50,000/kW"). */
export function formatPricingLineDescription(
  project: Project,
  quotation?: Quotation | null,
  amount?: number,
): string {
  const basis = resolvePricingBasis(project, quotation);
  const rate = resolvePricingRate(project, quotation);
  const qty = resolvePricingQuantity(project, quotation);
  const total = amount ?? project.contractAmount;
  if (basis === "per_kw") {
    const kw = qty ?? parseCapacityKw(project.capacity);
    return `${kw}kW @ ₹${rate.toLocaleString("en-IN")}/kW (₹${total.toLocaleString("en-IN")})`;
  }
  if (basis === "per_sqft") {
    const sqft = qty ?? 0;
    return `${sqft} sqft @ ₹${rate.toLocaleString("en-IN")}/sqft (₹${total.toLocaleString("en-IN")})`;
  }
  return `Fixed contract — ₹${total.toLocaleString("en-IN")}`;
}

export function commercialBaselineWithPricing(
  baseline: CommercialBaseline,
  quotation: Quotation,
): CommercialBaseline {
  const basis = quotation.pricingBasis ?? "fixed";
  const rateValue = quotation.pricingRate ?? quotation.clientAgreedAmount ?? quotation.totalAmount;
  const pricingQuantity =
    quotation.pricingQuantity ??
    (basis === "per_kw" ? parseCapacityKw(quotation.systemCapacity) : undefined);
  return {
    ...baseline,
    basis,
    rateValue,
    pricingQuantity,
  };
}

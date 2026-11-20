import type {
  PricingScenario,
  Stage2RevenuePricing,
  Stage3MarketSizeDemand,
  Stage4GoToMarket,
  StudioState,
} from "../types/venture";

export function formatCurrency(
  amount: number | null | undefined,
  currency: "INR" | "USD"
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const prefix = currency === "INR" ? "INR " : "$";
  const absFormatted = Math.abs(Math.round(amount)).toLocaleString(locale);
  return amount < 0 ? `-${prefix}${absFormatted}` : `${prefix}${absFormatted}`;
}

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }
  const absFormatted = Math.abs(Math.round(amount)).toLocaleString("en-IN");
  return amount < 0 ? `-₹${absFormatted}` : `₹${absFormatted}`;
}

export function formatNumber(
  value: number | null | undefined,
  currency: "INR" | "USD" = "INR",
  decimals = 0
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export interface UnitEconomicsMetrics {
  contributionPerUnit: number | null;
  contributionMarginPct: number | null;
  expectedMonthlyUnits: number | null;
  monthlyRevenue: number | null;
  expectedMonthlyContribution: number | null;
  totalVariableCost: number | null;
  operatingSurplus: number | null;
  breakEvenUnits: number | null;
  breakEvenCustomers: number | null;
  isNonViableContribution: boolean;
}

export function computeUnitEconomics(params: {
  sellingPrice: number | null;
  purchasesPerCustomer: number | null;
  variableCost: number | null;
  monthlyFixedCost: number | null;
  expectedCustomers: number | null;
}): UnitEconomicsMetrics {
  const {
    sellingPrice,
    purchasesPerCustomer,
    variableCost,
    monthlyFixedCost,
    expectedCustomers,
  } = params;

  const hasContribution = sellingPrice !== null && variableCost !== null;
  const contributionPerUnit = hasContribution
    ? sellingPrice - variableCost
    : null;

  const isNonViableContribution =
    contributionPerUnit !== null && contributionPerUnit <= 0;

  const contributionMarginPct =
    contributionPerUnit !== null && sellingPrice !== null && sellingPrice > 0
      ? (contributionPerUnit / sellingPrice) * 100
      : null;

  const expectedMonthlyUnits =
    expectedCustomers !== null && purchasesPerCustomer !== null
      ? expectedCustomers * purchasesPerCustomer
      : null;

  const monthlyRevenue =
    sellingPrice !== null && expectedMonthlyUnits !== null
      ? sellingPrice * expectedMonthlyUnits
      : null;

  const expectedMonthlyContribution =
    contributionPerUnit !== null && expectedMonthlyUnits !== null
      ? contributionPerUnit * expectedMonthlyUnits
      : null;

  const totalVariableCost =
    variableCost !== null && expectedMonthlyUnits !== null
      ? variableCost * expectedMonthlyUnits
      : null;

  const operatingSurplus =
    expectedMonthlyContribution !== null && monthlyFixedCost !== null
      ? expectedMonthlyContribution - monthlyFixedCost
      : null;

  const breakEvenUnits =
    monthlyFixedCost !== null &&
    contributionPerUnit !== null &&
    contributionPerUnit > 0
      ? monthlyFixedCost / contributionPerUnit
      : null;

  const breakEvenCustomers =
    breakEvenUnits !== null &&
    purchasesPerCustomer !== null &&
    purchasesPerCustomer > 0
      ? breakEvenUnits / purchasesPerCustomer
      : null;

  return {
    contributionPerUnit,
    contributionMarginPct,
    expectedMonthlyUnits,
    monthlyRevenue,
    expectedMonthlyContribution,
    totalVariableCost,
    operatingSurplus,
    breakEvenUnits,
    breakEvenCustomers,
    isNonViableContribution,
  };
}

export function computeScenarioMetrics(
  scenario: PricingScenario,
  effectiveVariableCost: number | null,
  effectiveFixedCost: number | null
): UnitEconomicsMetrics {
  return computeUnitEconomics({
    sellingPrice: scenario.sellingPrice,
    purchasesPerCustomer: scenario.purchasesPerCustomer,
    variableCost: effectiveVariableCost,
    monthlyFixedCost: effectiveFixedCost,
    expectedCustomers: scenario.customers,
  });
}

export function validatePricingDecisionReasoning(reasoning: string): {
  valid: boolean;
  message: string | null;
} {
  const trimmed = reasoning.trim();
  if (!trimmed) {
    return {
      valid: false,
      message: "Explain why your pricing position aligns with your positioning strategy.",
    };
  }

  const lower = trimmed.toLowerCase();
  const shallowPatterns = [
    "because competitors charge this",
    "because competitors charge",
    "competitors charge this",
    "same as competitors",
    "match competitors",
    "just copying competitors",
    "competitor price",
  ];

  // If the entire answer is essentially just citing competitor prices without strategic justification
  const matchesShallow = shallowPatterns.some((p) => lower.includes(p));
  if (matchesShallow && trimmed.length < 90) {
    return {
      valid: false,
      message:
        'Insufficient reasoning: "because competitors charge this" is not accepted. Connect your price position to FarmTrace AI\'s value differentiation, target farmer economics, or customer trust.',
    };
  }

  if (trimmed.length < 25) {
    return {
      valid: false,
      message:
        "Provide a fuller strategic explanation linking price to FarmTrace AI's positioning statement and customer willingness to pay.",
    };
  }

  return { valid: true, message: null };
}

export function isStage2ReadyToComplete(s2: Stage2RevenuePricing): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!s2.revenueModel) {
    reasons.push("Step 1: Choose a primary revenue model.");
  } else if (s2.revenueModel === "Other" && !s2.otherRevenueModel.trim()) {
    reasons.push("Step 1: Specify the custom revenue model.");
  }
  if (!s2.revenueModelDescription.trim()) {
    reasons.push("Step 1: Describe your revenue model in one sentence.");
  }

  const effectiveVarCost = s2.variableCostNotApplicable ? 0 : s2.variableCost;
  const effectiveFixedCost = s2.fixedCostNotApplicable ? 0 : s2.monthlyFixedCost;

  if (s2.sellingPrice === null || s2.sellingPrice <= 0) {
    reasons.push("Step 2: Enter a Selling Price (> 0).");
  }
  if (!s2.variableCostNotApplicable && (s2.variableCost === null || s2.variableCost < 0)) {
    reasons.push("Step 2: Enter Variable Cost (>= 0) or mark Not applicable.");
  }
  if (!s2.fixedCostNotApplicable && (s2.monthlyFixedCost === null || s2.monthlyFixedCost < 0)) {
    reasons.push("Step 2: Enter Monthly Fixed Cost (>= 0) or mark Not applicable.");
  }
  if (s2.expectedCustomers === null || s2.expectedCustomers <= 0) {
    reasons.push("Step 2: Enter Expected Paying Customers per Month (> 0).");
  }
  if (s2.purchasesPerCustomer === null || s2.purchasesPerCustomer <= 0) {
    reasons.push("Step 2: Enter Expected Purchases / Orders per Customer per Month (> 0).");
  }

  if (
    s2.sellingPrice !== null &&
    effectiveVarCost !== null &&
    s2.sellingPrice - effectiveVarCost <= 0
  ) {
    reasons.push(
      "Step 3: Current assumptions do not produce a viable contribution margin (Contribution per Unit must be > 0)."
    );
  }

  const baseScenario = s2.scenarios.find((sc) => sc.id === "base");
  const allScenariosPopulated = s2.scenarios.every(
    (sc) =>
      sc.sellingPrice !== null &&
      sc.customers !== null &&
      sc.purchasesPerCustomer !== null
  );
  if (!allScenariosPopulated) {
    reasons.push(
      "Step 4: Manually enter price, paying customers, and purchases per customer for Conservative, Base, and Ambitious scenarios."
    );
  } else if (!baseScenario || baseScenario.sellingPrice === null) {
    reasons.push("Step 4: Complete the Base scenario.");
  }

  if (!s2.pricingPosition) {
    reasons.push("Step 5: Select a pricing position relative to competitors.");
  }
  const reasoningCheck = validatePricingDecisionReasoning(s2.pricingPositionReasoning);
  if (!reasoningCheck.valid && reasoningCheck.message) {
    reasons.push(`Step 5: ${reasoningCheck.message}`);
  }
  if (!s2.biggestPricingAssumption.trim()) {
    reasons.push("Step 5: Identify your Biggest Pricing Assumption.");
  }

  // Also ensure effectiveFixedCost is numeric if used
  void effectiveFixedCost;

  return { ready: reasons.length === 0, reasons };
}

export interface MarketSizeMetrics {
  tam: number | null;
  sam: number | null;
  som: number | null;
  somShareOfSamPct: number | null;
  samShareOfTamPct: number | null;
  hierarchyValid: boolean;
}

export function computeMarketSize(s3: Stage3MarketSizeDemand): MarketSizeMetrics {
  const {
    totalPotentialCustomers,
    serviceableCustomers,
    obtainableCustomers,
    annualSpendPerCustomer,
  } = s3;

  const tam =
    totalPotentialCustomers !== null && annualSpendPerCustomer !== null
      ? totalPotentialCustomers * annualSpendPerCustomer
      : null;

  const sam =
    serviceableCustomers !== null && annualSpendPerCustomer !== null
      ? serviceableCustomers * annualSpendPerCustomer
      : null;

  const som =
    obtainableCustomers !== null && annualSpendPerCustomer !== null
      ? obtainableCustomers * annualSpendPerCustomer
      : null;

  const somShareOfSamPct =
    obtainableCustomers !== null &&
    serviceableCustomers !== null &&
    serviceableCustomers > 0
      ? (obtainableCustomers / serviceableCustomers) * 100
      : null;

  const samShareOfTamPct =
    serviceableCustomers !== null &&
    totalPotentialCustomers !== null &&
    totalPotentialCustomers > 0
      ? (serviceableCustomers / totalPotentialCustomers) * 100
      : null;

  const hierarchyValid =
    totalPotentialCustomers !== null &&
    serviceableCustomers !== null &&
    obtainableCustomers !== null
      ? obtainableCustomers <= serviceableCustomers &&
        serviceableCustomers <= totalPotentialCustomers
      : true;

  return {
    tam,
    sam,
    som,
    somShareOfSamPct,
    samShareOfTamPct,
    hierarchyValid,
  };
}

export function isStage3ReadyToComplete(
  s3: Stage3MarketSizeDemand,
  s2?: Stage2RevenuePricing
): {
  ready: boolean;
  reasons: string[];
  hasDemandInconsistency: boolean;
} {
  const reasons: string[] = [];
  if (!s3.targetCustomer.trim()) {
    reasons.push("Step 1: Define Target Customer.");
  }
  if (!s3.geography.trim()) {
    reasons.push("Step 1: Define Geography.");
  }
  if (!s3.coreOffer.trim()) {
    reasons.push("Step 1: Define Core Offer.");
  }
  if (s3.totalPotentialCustomers === null || s3.totalPotentialCustomers <= 0) {
    reasons.push("Step 2: Enter Total Potential Target Customers (> 0).");
  }
  if (s3.serviceableCustomers === null || s3.serviceableCustomers <= 0) {
    reasons.push("Step 2: Enter Customers realistically serviceable for SAM (> 0).");
  }
  if (s3.obtainableCustomers === null || s3.obtainableCustomers <= 0) {
    reasons.push("Step 2: Enter Customers realistically obtainable for SOM (> 0).");
  }
  if (s3.annualSpendPerCustomer === null || s3.annualSpendPerCustomer <= 0) {
    reasons.push("Step 2: Enter Annual Spend per Target Customer (> 0).");
  }
  if (
    s3.totalPotentialCustomers !== null &&
    s3.serviceableCustomers !== null &&
    s3.serviceableCustomers > s3.totalPotentialCustomers
  ) {
    reasons.push("Step 3: SAM Customer Count cannot exceed TAM Customer Count.");
  }
  if (
    s3.serviceableCustomers !== null &&
    s3.obtainableCustomers !== null &&
    s3.obtainableCustomers > s3.serviceableCustomers
  ) {
    reasons.push("Step 3: SOM Customer Count cannot exceed SAM Customer Count.");
  }

  const baseMonthlyCustomers =
    s2?.scenarios.find((sc) => sc.id === "base")?.customers ?? null;
  const hasDemandInconsistency =
    baseMonthlyCustomers !== null &&
    s3.obtainableCustomers !== null &&
    baseMonthlyCustomers > s3.obtainableCustomers;

  if (hasDemandInconsistency) {
    reasons.push(
      "Step 4: Revenue and market-size assumptions are inconsistent. Base-Scenario Monthly Customers exceed SOM Customer Count."
    );
  }

  if (!s3.whyCustomersBuy.trim()) {
    reasons.push("Step 4: Answer why these customers would buy.");
  }
  if (!s3.expectedPurchaseFrequency.trim()) {
    reasons.push("Step 4: Answer how often they are expected to buy.");
  }
  if (!s3.mostUrgentAssumption.trim()) {
    reasons.push("Step 4: Identify which demand assumption is least certain.");
  }
  if (!s3.demandValidationPlan.trim()) {
    reasons.push("Step 4: Specify what evidence would improve the demand estimate.");
  }
  return { ready: reasons.length === 0, reasons, hasDemandInconsistency };
}

export function isStage4ReadyToComplete(s4: Stage4GoToMarket): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!s4.firstCustomerSegment.trim()) {
    reasons.push("Step 1: Define First Customer Segment.");
  }
  if (!s4.reachLocations.trim()) {
    reasons.push("Step 1: Specify where they can be reached.");
  }
  if (!s4.mainProblemNeed.trim()) {
    reasons.push("Step 1: Specify Main Problem / Need.");
  }
  if (!s4.coreMessage.trim()) {
    reasons.push("Step 1: Define Core Message.");
  }
  if (!s4.callToAction.trim()) {
    reasons.push("Step 1: Define Call to Action.");
  }
  const validChannels = s4.channels.filter((c) => {
    if (!c.channelName.trim()) return false;
    if (c.channelName === "Other" && !(c.otherChannelName ?? "").trim()) {
      return false;
    }
    return true;
  });
  if (validChannels.length === 0) {
    reasons.push("Step 2: Choose at least 1 acquisition channel (up to 3).");
  }
  const filledWeeks = s4.experiment30Days.filter((w) => w.action.trim().length > 0);
  if (filledWeeks.length < 4) {
    reasons.push("Step 4: Complete actions for all 4 weeks in the 30-Day Launch Experiment.");
  }
  if (!s4.biggestGtmAssumption.trim()) {
    reasons.push("Step 5: Identify your Biggest GTM Assumption.");
  }
  return { ready: reasons.length === 0, reasons };
}

export interface EvidenceAuditSummary {
  verifiedCount: number;
  assumptionCount: number;
  missingEvidenceItems: string[];
}

export function computeEvidenceAudit(state: StudioState): EvidenceAuditSummary {
  const missing: string[] = [];
  let verified = 0;

  // Stage 1 baseline items
  state.stage1.competitors.forEach((c) => {
    if (c.evidenceSource.trim()) verified += 1;
    else missing.push(`Stage 1: ${c.name} evidence`);
    if (c.priceEvidenceNote.includes("Assumption")) {
      missing.push(`Stage 1: ${c.name} exact numeric price`);
    } else {
      verified += 1;
    }
  });

  // Stage 2 (Revenue & Pricing Lab)
  if (state.stage2.priceEvidenceSource.trim() && !state.stage2.priceEvidenceNotApplicable) {
    verified += 1;
  } else {
    missing.push("Stage 2: Selling price evidence");
  }

  if (
    state.stage2.variableCostNotApplicable ||
    (state.stage2.costEvidenceSource.trim() && !state.stage2.variableCostEvidenceNotApplicable)
  ) {
    verified += 1;
  } else {
    missing.push("Stage 2: Variable cost evidence");
  }

  if (
    state.stage2.fixedCostNotApplicable ||
    (state.stage2.fixedCostEvidenceSource.trim() && !state.stage2.fixedCostEvidenceNotApplicable)
  ) {
    verified += 1;
  } else {
    missing.push("Stage 2: Monthly fixed cost evidence");
  }

  // Stage 3 (only audit if unlocked)
  if (state.stage2.completed) {
    if (state.stage3.totalCustomersEvidence.trim()) verified += 1;
    else missing.push("Stage 3: Total customers evidence");

    if (state.stage3.serviceableEvidence.trim()) verified += 1;
    else missing.push("Stage 3: Serviceable customers evidence");

    if (state.stage3.obtainableEvidence.trim()) verified += 1;
    else missing.push("Stage 3: Obtainable customers evidence");

    if (state.stage3.annualSpendEvidence.trim()) verified += 1;
    else missing.push("Stage 3: Annual spend evidence");
  }

  // Stage 4 (only audit if unlocked)
  if (state.stage3.completed) {
    state.stage4.channels.forEach((ch, idx) => {
      if (ch.channelName.trim()) {
        if (ch.evidenceReason.trim()) verified += 1;
        else missing.push(`Stage 4: Channel ${idx + 1} (${ch.channelName}) evidence`);
      }
    });
    state.stage4.experiment30Days.forEach((wk) => {
      if (wk.observedEvidence.trim()) verified += 1;
      else missing.push(`Stage 4: ${wk.weekLabel} experiment outcome`);
    });
  }

  return {
    verifiedCount: verified,
    assumptionCount: missing.length,
    missingEvidenceItems: missing,
  };
}

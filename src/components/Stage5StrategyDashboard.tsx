import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FlaskConical,
  Lock,
} from "lucide-react";
import type {
  Stage1Data,
  Stage2RevenuePricing,
  Stage3MarketSizeDemand,
  Stage4GoToMarket,
  VentureProfile,
} from "../types/venture";
import {
  computeMarketSize,
  computeUnitEconomics,
  formatCurrency,
  formatINR,
  formatNumber,
} from "../utils/calculations";
import { ASSUMPTION_LABEL } from "../data/farmTraceSession11";
import { EvidenceStatusTag } from "./AssumptionNotice";

interface Stage5StrategyDashboardProps {
  venture: VentureProfile;
  stage1: Stage1Data;
  stage2: Stage2RevenuePricing;
  stage3: Stage3MarketSizeDemand;
  stage4: Stage4GoToMarket;
  unlocked: boolean;
  onGoToStage: (stage: 2 | 3 | 4) => void;
  onExportDossier: () => void;
}

export function Stage5StrategyDashboard({
  venture,
  stage1,
  stage2,
  stage3,
  stage4,
  unlocked,
  onGoToStage,
  onExportDossier,
}: Stage5StrategyDashboardProps) {
  if (!unlocked) {
    const firstIncomplete = !stage2.completed ? 2 : !stage3.completed ? 3 : 4;
    const incompleteLabel =
      firstIncomplete === 2
        ? "Stage 2: Revenue & Pricing Lab"
        : firstIncomplete === 3
        ? "Stage 3: Market Size & Demand Lab"
        : "Stage 4: Go-to-Market Launch Lab";

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 max-w-2xl mx-auto text-center space-y-5 my-8">
        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-slate-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            NEXUS Venture Strategy Dashboard is Locked
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Complete all three sequential stages (Revenue & Pricing, Market Size & Demand, and Go-to-Market) for {venture.name} to unlock the unified Strategy Dashboard.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => onGoToStage(firstIncomplete)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue to {incompleteLabel}</span>
          </button>
        </div>
      </div>
    );
  }

  const effectiveVarCost = stage2.variableCostNotApplicable
    ? 0
    : stage2.variableCost;
  const effectiveFixedCost = stage2.fixedCostNotApplicable
    ? 0
    : stage2.monthlyFixedCost;

  const unitEcon = computeUnitEconomics({
    sellingPrice: stage2.sellingPrice,
    purchasesPerCustomer: stage2.purchasesPerCustomer,
    variableCost: effectiveVarCost,
    monthlyFixedCost: effectiveFixedCost,
    expectedCustomers: stage2.expectedCustomers,
  });

  const market = computeMarketSize(stage3);
  const baseCustomers =
    stage2.scenarios.find((s) => s.id === "base")?.customers ?? null;

  const revenueModelLabel =
    stage2.revenueModel === "Other"
      ? stage2.otherRevenueModel.trim() || "Other"
      : stage2.revenueModel || "Not selected";

  const primaryChannel = stage4.channels[0];
  const primaryChannelLabel = primaryChannel?.channelName
    ? primaryChannel.channelName === "Other"
      ? primaryChannel.otherChannelName?.trim() || "Other"
      : primaryChannel.channelName
    : "Not selected";

  const totalBudget = stage4.channels.reduce(
    (sum, c) => sum + (c.budget ?? 0),
    0
  );
  const hasAnyBudget = stage4.channels.some((c) => c.budget !== null);
  const totalNewCustomers = stage4.channels.reduce(
    (sum, c) => sum + (c.expectedCustomers ?? 0),
    0
  );
  const hasAnyCustomers = stage4.channels.some(
    (c) => c.expectedCustomers !== null
  );

  const estimatedCac = (() => {
    if (hasAnyCustomers && totalNewCustomers === 0) return "Not calculable";
    if (hasAnyBudget && hasAnyCustomers && totalNewCustomers > 0) {
      return formatINR(totalBudget / totalNewCustomers);
    }
    return "—";
  })();

  // Strongest Current Evidence: strictly gathered from cited Session 11 + Stage 2-4 sources
  const strongSession11Competitors = stage1.competitors.filter(
    (c) => c.evidenceStrength === "Strong"
  );
  const citedEvidencePoints: string[] = [
    ...strongSession11Competitors.map(
      (c) => `${c.name} (${c.evidenceStrength}): ${c.evidenceSource}`
    ),
    `Primary Friction (${venture.frictionEvidenceStrength}): ${venture.frictionEvidenceSource}`,
  ];
  if (stage2.priceEvidenceSource.trim() && !stage2.priceEvidenceNotApplicable) {
    citedEvidencePoints.push(`Pricing Evidence: ${stage2.priceEvidenceSource}`);
  }
  if (stage3.totalCustomersEvidence.trim()) {
    citedEvidencePoints.push(`Market Count Source: ${stage3.totalCustomersEvidence}`);
  }
  if (stage4.channels[0]?.evidenceReason.trim()) {
    citedEvidencePoints.push(`GTM Channel Basis: ${stage4.channels[0].evidenceReason}`);
  }

  // Biggest Unvalidated Assumption: explicitly surfaced from Stages 2, 3, and 4
  const unvalidatedAssumptions: Array<{ stage: string; text: string }> = [
    ...(stage2.biggestPricingAssumption.trim()
      ? [{ stage: "Pricing", text: stage2.biggestPricingAssumption.trim() }]
      : []),
    ...(stage3.mostUrgentAssumption.trim()
      ? [{ stage: "Demand", text: stage3.mostUrgentAssumption.trim() }]
      : []),
    ...(stage4.biggestGtmAssumption.trim()
      ? [{ stage: "Go-to-Market", text: stage4.biggestGtmAssumption.trim() }]
      : []),
  ];

  // Next Real-World Experiment: drawn from Week 1-2 or Stage 3 demand validation plan
  const firstPlannedWeek =
    stage4.experiment30Days.find((w) => w.status !== "Validated" && w.action.trim()) ??
    stage4.experiment30Days[0];

  return (
    <div className="space-y-6">
      {/* Compact Dashboard Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{venture.name}</span>
              <span aria-hidden="true">·</span>
              <span>Stages 1–4 Complete</span>
              <span aria-hidden="true">·</span>
              <span>Session 11 Baseline Preserved</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              NEXUS Venture Strategy Dashboard
            </h2>
            <p className="text-xs text-slate-600">
              Consolidated evidence and assumptions across positioning, unit economics, market sizing, and launch execution. Assumptions are shown explicitly as unvalidated until field tests confirm them.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportDossier}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Venture Dossier</span>
          </button>
        </div>
      </section>

      {/* 4 Compact Pillars Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. COMPETITION & POSITIONING */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold tracking-wide text-slate-900">
              1. COMPETITION & POSITIONING
            </h3>
            <span className="text-[11px] font-medium text-emerald-700">
              Session 11 Preserved
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                Session 11 Score
              </div>
              <div className="mt-1 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                Positioning Coordinates: X {stage1.positioning.ventureAxisXScore}/10 ({stage1.positioning.axisXLabel}) · Y {stage1.positioning.ventureAxisYScore}/10 ({stage1.positioning.axisYLabel})
              </div>
              <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
                Competitors: AgriWebb (8, 2) · Cert Boards (3, 9) · Social Media (1, 5)
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">
                Positioning Statement
              </div>
              <p className="mt-1 text-xs text-slate-800 leading-relaxed">
                “{stage1.positioning.positioningStatement}”
              </p>
            </div>
          </div>
        </div>

        {/* 2. REVENUE & PRICING */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold tracking-wide text-slate-900">
              2. REVENUE & PRICING
            </h3>
            <span className="text-[11px] font-medium text-slate-500">
              {stage2.pricingPosition || "Position set"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                Revenue Model
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {revenueModelLabel}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                Selected Price
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(stage2.sellingPrice, stage2.currency)}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">
                Contribution per Unit
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(unitEcon.contributionPerUnit, stage2.currency)}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">
                Break-even Customers
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {unitEcon.isNonViableContribution
                  ? "Non-viable"
                  : unitEcon.breakEvenCustomers !== null
                  ? formatNumber(
                      Math.ceil(unitEcon.breakEvenCustomers),
                      stage2.currency
                    )
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* 3. MARKET SIZE & DEMAND */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold tracking-wide text-slate-900">
              3. MARKET SIZE & DEMAND
            </h3>
            <span className="text-[11px] text-slate-500">
              Assumption-based estimates
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-medium text-slate-500">TAM</div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatINR(market.tam)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {formatNumber(stage3.totalPotentialCustomers, "INR")} customers
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">SAM</div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatINR(market.sam)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {formatNumber(stage3.serviceableCustomers, "INR")} customers
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">SOM</div>
              <div className="mt-1 text-sm font-bold font-mono text-teal-800 tabular-nums">
                {formatINR(market.som)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                {formatNumber(stage3.obtainableCustomers, "INR")} customers
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">
                Base-Scenario Customers
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatNumber(baseCustomers, "INR")} / mo
              </div>
            </div>
          </div>
        </div>

        {/* 4. GO-TO-MARKET */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold tracking-wide text-slate-900">
              4. GO-TO-MARKET
            </h3>
            <span className="text-[11px] text-slate-500">
              {stage4.channels.length} channel(s)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="text-[11px] font-medium text-slate-500">
                Primary Customer Segment
              </div>
              <div className="mt-1 text-xs font-medium text-slate-900">
                {stage4.firstCustomerSegment}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500">
                Primary Channel
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {primaryChannelLabel}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] font-medium text-slate-500">
                  30-Day Budget
                </div>
                <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {hasAnyBudget ? formatINR(totalBudget) : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500">
                  Estimated CAC
                </div>
                <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                  {estimatedCac}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Synthesis Strip: Evidence · Assumption · Next Experiment */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold tracking-wide text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>STRONGEST CURRENT EVIDENCE</span>
            </h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {citedEvidencePoints.slice(0, 4).map((pt, idx) => (
              <li
                key={idx}
                className="pb-2 border-b border-slate-100 last:border-b-0 last:pb-0 leading-relaxed"
              >
                {pt}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold tracking-wide text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>BIGGEST UNVALIDATED ASSUMPTION</span>
            </h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {unvalidatedAssumptions.length > 0 ? (
              unvalidatedAssumptions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-amber-50/70 border border-amber-200 rounded space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-900">
                      {item.stage}
                    </span>
                    <EvidenceStatusTag hasEvidence={false} />
                  </div>
                  <p className="text-slate-800 leading-relaxed">{item.text}</p>
                </div>
              ))
            ) : (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded text-amber-900">
                {ASSUMPTION_LABEL}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold tracking-wide text-slate-900 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-teal-700 shrink-0" />
              <span>NEXT REAL-WORLD EXPERIMENT</span>
            </h3>
          </div>
          {firstPlannedWeek ? (
            <div className="space-y-2.5 text-xs">
              <div className="font-semibold text-slate-900">
                {firstPlannedWeek.weekLabel}
                {firstPlannedWeek.channel ? ` · ${firstPlannedWeek.channel}` : ""}
              </div>
              <p className="text-slate-700 leading-relaxed">
                {firstPlannedWeek.action}
              </p>
              <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                <div>
                  <span className="font-medium text-slate-800">Target: </span>
                  {firstPlannedWeek.target || ASSUMPTION_LABEL}
                </div>
                <div>
                  <span className="font-medium text-slate-800">Metric: </span>
                  {firstPlannedWeek.metric || ASSUMPTION_LABEL}
                </div>
                <div>
                  <span className="font-medium text-slate-800">
                    Learning Question:{" "}
                  </span>
                  {firstPlannedWeek.learningQuestion || ASSUMPTION_LABEL}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              {stage3.demandValidationPlan || ASSUMPTION_LABEL}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

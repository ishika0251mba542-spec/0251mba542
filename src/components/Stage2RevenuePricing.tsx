import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileDown,
  LockOpen,
  RotateCcw,
} from "lucide-react";
import type {
  CompetitorItem,
  PricingPositionOption,
  PricingScenario,
  RevenueModelOption,
  Stage2RevenuePricing,
  StrategyChallengeRecord,
  VentureProfile,
} from "../types/venture";
import {
  computeScenarioMetrics,
  computeUnitEconomics,
  formatCurrency,
  formatNumber,
  isStage2ReadyToComplete,
  validatePricingDecisionReasoning,
} from "../utils/calculations";
import {
  ASSUMPTION_LABEL,
  createEmptyStage2,
  getPdfDraftStage2,
} from "../data/farmTraceSession11";
import { EvidenceStatusTag } from "./AssumptionNotice";
import { StageChallengePanel } from "./StageChallengePanel";

interface Stage2RevenuePricingProps {
  venture: VentureProfile;
  competitors: CompetitorItem[];
  positioningStatement: string;
  data: Stage2RevenuePricing;
  stage3Unlocked: boolean;
  onChange: (next: Stage2RevenuePricing) => void;
  onCompleteStage: () => void;
  onGoToStage3: () => void;
  liveChallenges: StrategyChallengeRecord[];
  onRunChallenge: () => void;
  isChallenging: boolean;
  challengeError: string | null;
}

const REVENUE_MODELS: Exclude<RevenueModelOption, "">[] = [
  "Subscription",
  "Per Transaction / Per Order",
  "Commission",
  "Rental / Usage Fee",
  "Freemium + Paid Upgrade",
  "Advertising / Sponsorship",
  "Other",
];

const PRICING_POSITIONS: Exclude<PricingPositionOption, "">[] = [
  "Below competitors",
  "Near competitors",
  "Above competitors",
];

function parseNullableNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function Stage2RevenuePricing({
  venture,
  competitors,
  positioningStatement,
  data,
  stage3Unlocked,
  onChange,
  onCompleteStage,
  onGoToStage3,
  liveChallenges,
  onRunChallenge,
  isChallenging,
  challengeError,
}: Stage2RevenuePricingProps) {
  const effectiveVariableCost = data.variableCostNotApplicable
    ? 0
    : data.variableCost;
  const effectiveFixedCost = data.fixedCostNotApplicable
    ? 0
    : data.monthlyFixedCost;

  const unitEcon = computeUnitEconomics({
    sellingPrice: data.sellingPrice,
    purchasesPerCustomer: data.purchasesPerCustomer,
    variableCost: effectiveVariableCost,
    monthlyFixedCost: effectiveFixedCost,
    expectedCustomers: data.expectedCustomers,
  });

  const gate = isStage2ReadyToComplete(data);
  const reasoningValidation = validatePricingDecisionReasoning(
    data.pricingPositionReasoning
  );

  const handleLoadPdfDraft = () => {
    const draft = getPdfDraftStage2();
    onChange({
      ...data,
      ...draft,
    });
  };

  const handleResetStage = () => {
    onChange(createEmptyStage2());
  };

  const updateScenario = (
    id: PricingScenario["id"],
    patch: Partial<PricingScenario>
  ) => {
    onChange({
      ...data,
      scenarios: data.scenarios.map((sc) =>
        sc.id === id ? { ...sc, ...patch } : sc
      ),
    });
  };

  const scenarioRows = data.scenarios.map((sc) => ({
    scenario: sc,
    metrics: computeScenarioMetrics(
      sc,
      effectiveVariableCost,
      effectiveFixedCost
    ),
  }));

  const baseRow = scenarioRows.find((r) => r.scenario.id === "base");

  const resolvedRevenueModel =
    data.revenueModel === "Other"
      ? data.otherRevenueModel.trim() || "Other (unspecified)"
      : data.revenueModel || "Not selected";

  const hasPriceEvidence =
    !data.priceEvidenceNotApplicable && data.priceEvidenceSource.trim().length > 0;
  const hasVarCostEvidence =
    data.variableCostNotApplicable ||
    (!data.variableCostEvidenceNotApplicable &&
      data.costEvidenceSource.trim().length > 0);
  const hasFixedCostEvidence =
    data.fixedCostNotApplicable ||
    (!data.fixedCostEvidenceNotApplicable &&
      data.fixedCostEvidenceSource.trim().length > 0);

  return (
    <div className="space-y-8">
      {/* Lab Header & Purpose */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Selected Venture: {venture.name}</span>
              <span aria-hidden="true">·</span>
              <span>Stage 2</span>
              <span aria-hidden="true">·</span>
              <span>{data.completed ? "Completed" : "Active Lab"}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Revenue & Pricing Lab
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Help me decide how the venture will earn revenue, test a price, understand unit economics and estimate break-even.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(["INR", "USD"] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => onChange({ ...data, currency: curr })}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    data.currency === curr
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLoadPdfDraft}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Load PDF Numbers Only</span>
            </button>
            <button
              type="button"
              onClick={handleResetStage}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Lab</span>
            </button>
          </div>
        </div>

        {/* Session 11 Competitor-Price Reference Strip */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Session 11 Competitor-Price Reference (Reference Only — Your Price Is Never Auto-Selected)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {competitors.map((comp) => (
              <div
                key={comp.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1 text-xs"
              >
                <div className="font-semibold text-slate-900 truncate" title={comp.name}>
                  {comp.name}
                </div>
                <div className="text-slate-700">
                  Price / Cost: <span className="font-medium">{comp.priceCost}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {comp.priceEvidenceNote}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STEP 1 — CHOOSE A REVENUE MODEL */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 1 — Choose a Revenue Model
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select one primary revenue model for {venture.name} and describe how it works in one sentence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {REVENUE_MODELS.map((model) => {
            const active = data.revenueModel === model;
            return (
              <button
                key={model}
                type="button"
                onClick={() => onChange({ ...data, revenueModel: model })}
                className={`px-3.5 py-2.5 text-left text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  active
                    ? "bg-teal-50 border-teal-700 text-teal-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {model}
              </button>
            );
          })}
        </div>

        {data.revenueModel === "Other" && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-700">
              Specify Other Revenue Model
            </span>
            <input
              type="text"
              value={data.otherRevenueModel}
              onChange={(e) =>
                onChange({ ...data, otherRevenueModel: e.target.value })
              }
              placeholder="Name your custom revenue model..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-700">
            Describe the model in one sentence
          </span>
          <input
            type="text"
            value={data.revenueModelDescription}
            onChange={(e) =>
              onChange({ ...data, revenueModelDescription: e.target.value })
            }
            placeholder="e.g. Organic growers pay a recurring monthly fee per farm account to generate unlimited tamper-proof QR provenance labels."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
          />
        </label>
      </section>

      {/* STEP 2 — ENTER PRICING AND COST ASSUMPTIONS */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 2 — Enter Pricing and Cost Assumptions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your pricing, cost, and volume assumptions manually. Any value without cited evidence is labeled “{ASSUMPTION_LABEL}”.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Numeric Assumptions */}
          <div className="space-y-4">
            {/* Selling Price */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Selling Price per unit / order / month ({data.currency})
                </label>
                <EvidenceStatusTag
                  hasEvidence={hasPriceEvidence}
                  verifiedLabel="Price Evidence Cited"
                />
              </div>
              <input
                type="number"
                min={0}
                value={data.sellingPrice ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    sellingPrice: parseNullableNumber(e.target.value),
                  })
                }
                placeholder="Enter selling price manually"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
            </div>

            {/* Variable Cost */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Variable Cost per unit / order / month ({data.currency})
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.variableCostNotApplicable}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          variableCostNotApplicable: e.target.checked,
                          variableCost: e.target.checked ? 0 : data.variableCost,
                        })
                      }
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span>Not applicable</span>
                  </label>
                  <EvidenceStatusTag
                    hasEvidence={hasVarCostEvidence}
                    verifiedLabel={
                      data.variableCostNotApplicable
                        ? "Not applicable (0)"
                        : "Cost Evidence Cited"
                    }
                  />
                </div>
              </div>
              <input
                type="number"
                min={0}
                disabled={data.variableCostNotApplicable}
                value={data.variableCostNotApplicable ? 0 : data.variableCost ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    variableCost: parseNullableNumber(e.target.value),
                  })
                }
                placeholder={
                  data.variableCostNotApplicable
                    ? "Not applicable (0)"
                    : "Enter variable cost per unit"
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white disabled:bg-slate-100 disabled:text-slate-500 border border-slate-300 rounded-md"
              />
            </div>

            {/* Monthly Fixed Cost */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Monthly Fixed Cost ({data.currency})
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.fixedCostNotApplicable}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          fixedCostNotApplicable: e.target.checked,
                          monthlyFixedCost: e.target.checked
                            ? 0
                            : data.monthlyFixedCost,
                        })
                      }
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span>Not applicable</span>
                  </label>
                  <EvidenceStatusTag
                    hasEvidence={hasFixedCostEvidence}
                    verifiedLabel={
                      data.fixedCostNotApplicable
                        ? "Not applicable (0)"
                        : "Fixed Cost Cited"
                    }
                  />
                </div>
              </div>
              <input
                type="number"
                min={0}
                disabled={data.fixedCostNotApplicable}
                value={
                  data.fixedCostNotApplicable ? 0 : data.monthlyFixedCost ?? ""
                }
                onChange={(e) =>
                  onChange({
                    ...data,
                    monthlyFixedCost: parseNullableNumber(e.target.value),
                  })
                }
                placeholder={
                  data.fixedCostNotApplicable
                    ? "Not applicable (0)"
                    : "Enter monthly fixed cost"
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white disabled:bg-slate-100 disabled:text-slate-500 border border-slate-300 rounded-md"
              />
            </div>

            {/* Expected Paying Customers & Purchases */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800">
                    Expected Paying Customers / Month
                  </label>
                </div>
                <input
                  type="number"
                  min={0}
                  value={data.expectedCustomers ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      expectedCustomers: parseNullableNumber(e.target.value),
                    })
                  }
                  placeholder="Enter customer count"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                />
                <EvidenceStatusTag hasEvidence={false} />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800">
                    Purchases / Orders per Customer / Month
                  </label>
                </div>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={data.purchasesPerCustomer ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      purchasesPerCustomer: parseNullableNumber(e.target.value),
                    })
                  }
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
                />
                <EvidenceStatusTag hasEvidence={false} />
              </div>
            </div>
          </div>

          {/* Evidence / Source Inputs */}
          <div className="space-y-4">
            {/* Evidence for Price */}
            <div className="p-3.5 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Evidence / Source for Price
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.priceEvidenceNotApplicable}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          priceEvidenceNotApplicable: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span>Not applicable</span>
                  </label>
                  <EvidenceStatusTag hasEvidence={hasPriceEvidence} />
                </div>
              </div>
              <textarea
                rows={3}
                disabled={data.priceEvidenceNotApplicable}
                value={
                  data.priceEvidenceNotApplicable
                    ? "Not applicable"
                    : data.priceEvidenceSource
                }
                onChange={(e) =>
                  onChange({ ...data, priceEvidenceSource: e.target.value })
                }
                placeholder="Cite farmer willingness-to-pay interviews, pilot pricing commitments, or benchmark sheets..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Evidence for Variable Cost */}
            <div className="p-3.5 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Evidence / Source for Variable Cost
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.variableCostEvidenceNotApplicable}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          variableCostEvidenceNotApplicable: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span>Not applicable</span>
                  </label>
                  <EvidenceStatusTag hasEvidence={hasVarCostEvidence} />
                </div>
              </div>
              <textarea
                rows={3}
                disabled={
                  data.variableCostNotApplicable ||
                  data.variableCostEvidenceNotApplicable
                }
                value={
                  data.variableCostNotApplicable ||
                  data.variableCostEvidenceNotApplicable
                    ? "Not applicable"
                    : data.costEvidenceSource
                }
                onChange={(e) =>
                  onChange({ ...data, costEvidenceSource: e.target.value })
                }
                placeholder="Cite per-batch cloud/blockchain transaction quotes, QR print costs, or payment gateway fees..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Evidence for Fixed Cost */}
            <div className="p-3.5 border border-slate-200 rounded-md space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Evidence / Source for Fixed Cost
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.fixedCostEvidenceNotApplicable}
                      onChange={(e) =>
                        onChange({
                          ...data,
                          fixedCostEvidenceNotApplicable: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span>Not applicable</span>
                  </label>
                  <EvidenceStatusTag hasEvidence={hasFixedCostEvidence} />
                </div>
              </div>
              <textarea
                rows={3}
                disabled={
                  data.fixedCostNotApplicable ||
                  data.fixedCostEvidenceNotApplicable
                }
                value={
                  data.fixedCostNotApplicable ||
                  data.fixedCostEvidenceNotApplicable
                    ? "Not applicable"
                    : data.fixedCostEvidenceSource
                }
                onChange={(e) =>
                  onChange({ ...data, fixedCostEvidenceSource: e.target.value })
                }
                placeholder="Cite monthly cloud hosting plans, node retainers, salaries, or software subscriptions..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3 — CALCULATE UNIT ECONOMICS */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 3 — Calculate Unit Economics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Computed directly from your Step 2 inputs. No figures are inferred when fields are blank.
          </p>
        </div>

        {unitEcon.isNonViableContribution && (
          <div className="p-4 rounded-md border border-rose-300 bg-rose-50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-rose-900">
              Current assumptions do not produce a viable contribution margin.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricBox
            label="Contribution per Unit"
            value={formatCurrency(unitEcon.contributionPerUnit, data.currency)}
            formula="Selling Price − Variable Cost"
            tone={
              unitEcon.isNonViableContribution
                ? "danger"
                : unitEcon.contributionPerUnit !== null
                ? "positive"
                : "neutral"
            }
          />
          <MetricBox
            label="Contribution Margin %"
            value={
              unitEcon.contributionMarginPct !== null
                ? `${unitEcon.contributionMarginPct.toFixed(1)}%`
                : "—"
            }
            formula="Contribution ÷ Selling Price × 100"
          />
          <MetricBox
            label="Expected Monthly Units"
            value={formatNumber(unitEcon.expectedMonthlyUnits, data.currency)}
            formula="Paying Customers × Purchases/Cust."
          />
          <MetricBox
            label="Expected Monthly Revenue"
            value={formatCurrency(unitEcon.monthlyRevenue, data.currency)}
            formula="Selling Price × Monthly Units"
          />
          <MetricBox
            label="Expected Monthly Contribution"
            value={formatCurrency(
              unitEcon.expectedMonthlyContribution,
              data.currency
            )}
            formula="Contribution/Unit × Monthly Units"
          />
          <MetricBox
            label="Monthly Operating Surplus / Deficit"
            value={formatCurrency(unitEcon.operatingSurplus, data.currency)}
            formula="Monthly Contribution − Fixed Cost"
            tone={
              unitEcon.operatingSurplus === null
                ? "neutral"
                : unitEcon.operatingSurplus >= 0
                ? "positive"
                : "danger"
            }
          />
          <MetricBox
            label="Break-even Units"
            value={
              unitEcon.isNonViableContribution
                ? "Non-viable"
                : unitEcon.breakEvenUnits !== null
                ? `${formatNumber(Math.ceil(unitEcon.breakEvenUnits), data.currency)} (${unitEcon.breakEvenUnits.toFixed(1)})`
                : "—"
            }
            formula="Monthly Fixed Cost ÷ Contribution/Unit"
          />
          <MetricBox
            label="Break-even Customers"
            value={
              unitEcon.isNonViableContribution
                ? "Non-viable"
                : unitEcon.breakEvenCustomers !== null
                ? `${formatNumber(Math.ceil(unitEcon.breakEvenCustomers), data.currency)} (${unitEcon.breakEvenCustomers.toFixed(1)})`
                : "—"
            }
            formula="Break-even Units ÷ Purchases/Cust."
          />
        </div>
      </section>

      {/* STEP 4 — CREATE THREE MANUAL SCENARIOS */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 4 — Three Manual Scenarios (Conservative · Base · Ambitious)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjust price, paying customers, and purchases per customer manually for each scenario. Cost baseline uses Step 2 Variable Cost ({formatCurrency(effectiveVariableCost, data.currency)}) and Fixed Cost ({formatCurrency(effectiveFixedCost, data.currency)}).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Scenario</th>
                <th className="py-2.5 pr-4">Price ({data.currency})</th>
                <th className="py-2.5 pr-4">Paying Customers</th>
                <th className="py-2.5 pr-4">Purchases / Cust.</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Monthly Revenue</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Contribution</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Operating Surplus / Deficit</th>
                <th className="py-2.5">Break-even Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {scenarioRows.map(({ scenario, metrics }) => {
                const breakEvenText = (() => {
                  if (metrics.isNonViableContribution) {
                    return "Non-viable margin";
                  }
                  if (
                    metrics.breakEvenCustomers === null ||
                    scenario.customers === null
                  ) {
                    return "—";
                  }
                  const needed = Math.ceil(metrics.breakEvenCustomers);
                  const diff = scenario.customers - needed;
                  if (diff >= 0) {
                    return `Above break-even (+${diff} cust. · BE: ${needed})`;
                  }
                  return `Below break-even (${diff} cust. · BE: ${needed})`;
                })();

                return (
                  <tr key={scenario.id} className="hover:bg-slate-50/70 align-middle">
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                      {scenario.label}
                    </td>
                    <td className="py-3.5 pr-4 w-32">
                      <input
                        type="number"
                        min={0}
                        value={scenario.sellingPrice ?? ""}
                        onChange={(e) =>
                          updateScenario(scenario.id, {
                            sellingPrice: parseNullableNumber(e.target.value),
                          })
                        }
                        placeholder="Price"
                        className="w-28 px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3.5 pr-4 w-32">
                      <input
                        type="number"
                        min={0}
                        value={scenario.customers ?? ""}
                        onChange={(e) =>
                          updateScenario(scenario.id, {
                            customers: parseNullableNumber(e.target.value),
                          })
                        }
                        placeholder="Customers"
                        className="w-28 px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3.5 pr-4 w-32">
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={scenario.purchasesPerCustomer ?? ""}
                        onChange={(e) =>
                          updateScenario(scenario.id, {
                            purchasesPerCustomer: parseNullableNumber(
                              e.target.value
                            ),
                          })
                        }
                        placeholder="Orders/mo"
                        className="w-24 px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-xs text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(metrics.monthlyRevenue, data.currency)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-xs text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(
                        metrics.expectedMonthlyContribution,
                        data.currency
                      )}
                    </td>
                    <td
                      className={`py-3.5 pr-4 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                        metrics.operatingSurplus === null
                          ? "text-slate-500"
                          : metrics.operatingSurplus >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(metrics.operatingSurplus, data.currency)}
                    </td>
                    <td className="py-3.5 text-xs font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {breakEvenText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* STEP 5 — PRICING DECISION */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 5 — Pricing Decision
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Positioning anchor: “{positioningStatement}”
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-800 block">
              Select your pricing position relative to competitors
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRICING_POSITIONS.map((pos) => {
                const active = data.pricingPosition === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => onChange({ ...data, pricingPosition: pos })}
                    className={`px-4 py-2.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      active
                        ? "bg-teal-50 border-teal-700 text-teal-900 font-semibold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 block">
              Why is this pricing position consistent with my positioning strategy?
            </label>
            <textarea
              rows={3}
              value={data.pricingPositionReasoning}
              onChange={(e) =>
                onChange({ ...data, pricingPositionReasoning: e.target.value })
              }
              placeholder="Explain how your price reflects FarmTrace AI's low-complexity mobile workflow, tamper-proof QR differentiation, and boutique farmer margins..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
            {data.pricingPositionReasoning.trim().length > 0 &&
              !reasoningValidation.valid &&
              reasoningValidation.message && (
                <div className="p-2.5 rounded border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{reasoningValidation.message}</span>
                </div>
              )}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Biggest Pricing Assumption to Validate
            </span>
            <input
              type="text"
              value={data.biggestPricingAssumption}
              onChange={(e) =>
                onChange({ ...data, biggestPricingAssumption: e.target.value })
              }
              placeholder="e.g. Boutique berry growers will pay INR 1,499/mo continuously because QR verification yields a measurable price premium."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </label>
        </div>

        {/* Required 6-Field Summary Card */}
        <div className="pt-5 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-500 mb-3">
            Revenue & Pricing Lab Decision Summary
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-md p-5">
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                REVENUE MODEL
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {resolvedRevenueModel}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                SELECTED PRICE
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(data.sellingPrice, data.currency)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                CONTRIBUTION PER UNIT
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(unitEcon.contributionPerUnit, data.currency)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                BREAK-EVEN CUSTOMERS
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {unitEcon.isNonViableContribution
                  ? "Non-viable"
                  : unitEcon.breakEvenCustomers !== null
                  ? formatNumber(Math.ceil(unitEcon.breakEvenCustomers), data.currency)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                BASE-SCENARIO MONTHLY REVENUE
              </div>
              <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
                {formatCurrency(
                  baseRow?.metrics.monthlyRevenue ?? null,
                  data.currency
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">
                BIGGEST PRICING ASSUMPTION
              </div>
              <div className="mt-1 text-xs font-medium text-slate-900">
                {data.biggestPricingAssumption.trim() || ASSUMPTION_LABEL}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Strategy Challenge for Stage 2 */}
      <StageChallengePanel
        stage={2}
        stageLabel="Revenue & Pricing Lab"
        challenges={liveChallenges}
        onRunChallenge={onRunChallenge}
        isChallenging={isChallenging}
        challengeError={challengeError}
      />

      {/* Sequential Completion Gate */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              Stage 2 Completion Gate (Required to Unlock Stage 3)
            </h3>
            {gate.ready ? (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  All 5 Revenue & Pricing Lab steps are complete. Values without evidence remain labeled “{ASSUMPTION_LABEL}”.
                </span>
              </p>
            ) : (
              <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
                {gate.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!data.completed ? (
              <button
                type="button"
                onClick={onCompleteStage}
                disabled={!gate.ready}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <LockOpen className="w-4 h-4" />
                <span>Complete Stage 2 & Unlock Stage 3</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToStage3}
                disabled={!stage3Unlocked}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Stage 2 Completed · Open Stage 3: Market Size</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricBox({
  label,
  value,
  formula,
  tone = "neutral",
}: {
  label: string;
  value: string;
  formula: string;
  tone?: "neutral" | "positive" | "danger";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "danger"
      ? "text-rose-700"
      : "text-slate-900";

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-md">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <div
        className={`mt-1.5 text-xl font-bold font-mono tabular-nums ${valueClass}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{formula}</div>
    </div>
  );
}

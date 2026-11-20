import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileDown,
  Link2,
  Lock,
  LockOpen,
  RotateCcw,
} from "lucide-react";
import type {
  Stage2RevenuePricing,
  Stage3MarketSizeDemand,
  StrategyChallengeRecord,
  VentureProfile,
} from "../types/venture";
import {
  computeMarketSize,
  formatINR,
  formatNumber,
  isStage3ReadyToComplete,
} from "../utils/calculations";
import {
  ASSUMPTION_LABEL,
  createEmptyStage3,
  getPdfDraftStage3,
} from "../data/farmTraceSession11";
import { EvidenceStatusTag } from "./AssumptionNotice";
import { StageChallengePanel } from "./StageChallengePanel";

interface Stage3MarketSizeDemandProps {
  venture: VentureProfile;
  stage2: Stage2RevenuePricing;
  data: Stage3MarketSizeDemand;
  unlocked: boolean;
  stage4Unlocked: boolean;
  onChange: (next: Stage3MarketSizeDemand) => void;
  onCompleteStage: () => void;
  onGoToStage2: () => void;
  onGoToStage4: () => void;
  liveChallenges: StrategyChallengeRecord[];
  onRunChallenge: () => void;
  isChallenging: boolean;
  challengeError: string | null;
}

function parseNullableNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function Stage3MarketSizeDemand({
  venture,
  stage2,
  data,
  unlocked,
  stage4Unlocked,
  onChange,
  onCompleteStage,
  onGoToStage2,
  onGoToStage4,
  liveChallenges,
  onRunChallenge,
  isChallenging,
  challengeError,
}: Stage3MarketSizeDemandProps) {
  if (!unlocked) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 max-w-2xl mx-auto text-center space-y-5 my-8">
        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-slate-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Market Size & Demand Lab is Locked
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sequential progression requires completing Stage 2 (Revenue & Pricing Lab) first so your Base-scenario customer volume and annual spend ground your TAM, SAM, and SOM assumptions for {venture.name}.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={onGoToStage2}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Stage 2: Revenue & Pricing Lab</span>
          </button>
        </div>
      </div>
    );
  }

  const market = computeMarketSize(data);
  const gate = isStage3ReadyToComplete(data, stage2);

  const baseScenario = stage2.scenarios.find((sc) => sc.id === "base");
  const baseScenarioCustomers = baseScenario?.customers ?? null;

  const stage2AnnualizedSpend =
    stage2.sellingPrice !== null && stage2.purchasesPerCustomer !== null
      ? stage2.sellingPrice * stage2.purchasesPerCustomer * 12
      : null;

  const handleLoadPdfDraft = () => {
    const draft = getPdfDraftStage3();
    onChange({
      ...data,
      ...draft,
    });
  };

  const handleSyncAnnualSpend = () => {
    if (stage2AnnualizedSpend === null) return;
    onChange({
      ...data,
      annualSpendPerCustomer: stage2AnnualizedSpend,
      annualSpendEvidence:
        data.annualSpendEvidence.trim() ||
        `Derived from Stage 2 Selling Price (${formatINR(
          stage2.sellingPrice
        )} × ${stage2.purchasesPerCustomer}/mo × 12 months); farmer willingness-to-pay remains subject to live pilot verification.`,
    });
  };

  const handleResetStage = () => {
    onChange(createEmptyStage3());
  };

  return (
    <div className="space-y-8">
      {/* Lab Header & Disclaimer */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Selected Venture: {venture.name}</span>
              <span aria-hidden="true">·</span>
              <span>Stage 3</span>
              <span aria-hidden="true">·</span>
              <span>{data.completed ? "Completed" : "Active Lab"}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Market Size & Demand Lab
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Estimate the size of the opportunity using transparent assumptions and evidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {stage2AnnualizedSpend !== null && (
              <button
                type="button"
                onClick={handleSyncAnnualSpend}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5 text-teal-700" />
                <span>
                  Sync Stage 2 Spend ({formatINR(stage2AnnualizedSpend)}/yr)
                </span>
              </button>
            )}
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

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Methodological Note: </span>
          TAM, SAM and SOM are estimates based on assumptions. They are not guaranteed market outcomes.
        </div>
      </section>

      {/* STEP 1 — DEFINE THE MARKET */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 1 — Define the Market
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-filled from your {venture.name} Venture Profile. Edit if you want to refine the scope before entering customer counts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Target Customer
            </span>
            <textarea
              rows={3}
              value={data.targetCustomer}
              onChange={(e) =>
                onChange({ ...data, targetCustomer: e.target.value })
              }
              placeholder="Who specifically is in this market?"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Geography
            </span>
            <textarea
              rows={3}
              value={data.geography}
              onChange={(e) =>
                onChange({ ...data, geography: e.target.value })
              }
              placeholder="Geographic boundary for serviceable reach..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Core Offer
            </span>
            <textarea
              rows={3}
              value={data.coreOffer}
              onChange={(e) =>
                onChange({ ...data, coreOffer: e.target.value })
              }
              placeholder="Core product or service being priced..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </label>
        </div>
      </section>

      {/* STEP 2 — ENTER MARKET-SIZE ASSUMPTIONS */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 2 — Enter Market-Size Assumptions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter customer counts and annual spend manually—no counts are invented. Any field lacking cited evidence stays labeled “{ASSUMPTION_LABEL}”.
          </p>
        </div>

        {!market.hierarchyValid && (
          <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-800">
            Hierarchy check: SOM Customer Count must not exceed SAM Customer Count, and SAM Customer Count must not exceed TAM Customer Count.
          </div>
        )}

        <div className="space-y-5">
          {/* TAM Universe + Annual Spend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Total Potential Target Customers (TAM)
                </label>
                <EvidenceStatusTag
                  hasEvidence={data.totalCustomersEvidence.trim().length > 0}
                  verifiedLabel="Evidence Cited"
                />
              </div>
              <input
                type="number"
                min={0}
                value={data.totalPotentialCustomers ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    totalPotentialCustomers: parseNullableNumber(e.target.value),
                  })
                }
                placeholder="Enter total potential target customers"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-700 block">
                  Evidence / Source
                </span>
                <textarea
                  rows={2}
                  value={data.totalCustomersEvidence}
                  onChange={(e) =>
                    onChange({ ...data, totalCustomersEvidence: e.target.value })
                  }
                  placeholder="Cite agricultural census, ministry data, or registered farm directories..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Annual Spend per Target Customer (₹)
                </label>
                <EvidenceStatusTag
                  hasEvidence={data.annualSpendEvidence.trim().length > 0}
                  verifiedLabel="Evidence Cited"
                />
              </div>
              <input
                type="number"
                min={0}
                value={data.annualSpendPerCustomer ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    annualSpendPerCustomer: parseNullableNumber(e.target.value),
                  })
                }
                placeholder="Enter annual spend in ₹"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-700 block">
                  Evidence / Source
                </span>
                <textarea
                  rows={2}
                  value={data.annualSpendEvidence}
                  onChange={(e) =>
                    onChange({ ...data, annualSpendEvidence: e.target.value })
                  }
                  placeholder="Cite grower software budget benchmarks or Stage 2 annualized price..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* SAM & SOM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  SAM — Customers I can realistically serve within my chosen geography / segment
                </label>
                <EvidenceStatusTag
                  hasEvidence={data.serviceableEvidence.trim().length > 0}
                  verifiedLabel="Evidence Cited"
                />
              </div>
              <input
                type="number"
                min={0}
                value={data.serviceableCustomers ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    serviceableCustomers: parseNullableNumber(e.target.value),
                  })
                }
                placeholder="Enter serviceable customers"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-700 block">
                  Evidence / Source
                </span>
                <textarea
                  rows={2}
                  value={data.serviceableEvidence}
                  onChange={(e) =>
                    onChange({ ...data, serviceableEvidence: e.target.value })
                  }
                  placeholder="Cite regional cooperative rosters, organic clusters, or state agri-hubs..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  SOM — Customers I believe I could realistically win in the initial period
                </label>
                <EvidenceStatusTag
                  hasEvidence={data.obtainableEvidence.trim().length > 0}
                  verifiedLabel="Reason / Evidence Cited"
                />
              </div>
              <input
                type="number"
                min={0}
                value={data.obtainableCustomers ?? ""}
                onChange={(e) =>
                  onChange({
                    ...data,
                    obtainableCustomers: parseNullableNumber(e.target.value),
                  })
                }
                placeholder="Enter obtainable customers"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md"
              />
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-700 block">
                  Reason / Evidence
                </span>
                <textarea
                  rows={2}
                  value={data.obtainableEvidence}
                  onChange={(e) =>
                    onChange({ ...data, obtainableEvidence: e.target.value })
                  }
                  placeholder="Cite active vendor counts at target city markets, CSA lists, or field outreach capacity..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3 — CALCULATE TAM / SAM / SOM (Assumptions shown beside calculations) */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 3 — Calculate TAM / SAM / SOM
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculated values in Indian Rupees (₹) displayed directly alongside each underlying assumption and evidence status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Market Tier</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Customer Count</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Annual Spend / Cust.</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Calculated ₹ Value</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Tier Share</th>
                <th className="py-2.5">Assumption & Evidence Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr className="align-top hover:bg-slate-50/70">
                <td className="py-4 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                  TAM (Total Addressable)
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-900 tabular-nums whitespace-nowrap">
                  {formatNumber(data.totalPotentialCustomers, "INR")}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                  {formatINR(data.annualSpendPerCustomer)}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
                  {formatINR(market.tam)}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                  100%
                </td>
                <td className="py-4 min-w-[260px] space-y-1.5">
                  <div className="text-xs text-slate-700">
                    {data.totalCustomersEvidence.trim() || (
                      <span className="text-amber-800">{ASSUMPTION_LABEL}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Spend basis:{" "}
                    {data.annualSpendEvidence.trim() || ASSUMPTION_LABEL}
                  </div>
                </td>
              </tr>

              <tr className="align-top hover:bg-slate-50/70">
                <td className="py-4 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                  SAM (Serviceable Available)
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-900 tabular-nums whitespace-nowrap">
                  {formatNumber(data.serviceableCustomers, "INR")}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                  {formatINR(data.annualSpendPerCustomer)}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
                  {formatINR(market.sam)}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                  {market.samShareOfTamPct !== null
                    ? `${market.samShareOfTamPct.toFixed(2)}% of TAM`
                    : "—"}
                </td>
                <td className="py-4 min-w-[260px] space-y-1.5">
                  <div className="text-xs text-slate-700">
                    {data.serviceableEvidence.trim() || (
                      <span className="text-amber-800">{ASSUMPTION_LABEL}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Geography scope: {data.geography || ASSUMPTION_LABEL}
                  </div>
                </td>
              </tr>

              <tr className="align-top hover:bg-slate-50/70">
                <td className="py-4 pr-4 font-semibold text-teal-900 whitespace-nowrap">
                  SOM (Serviceable Obtainable)
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-teal-900 tabular-nums whitespace-nowrap">
                  {formatNumber(data.obtainableCustomers, "INR")}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                  {formatINR(data.annualSpendPerCustomer)}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-sm font-bold text-teal-800 tabular-nums whitespace-nowrap">
                  {formatINR(market.som)}
                </td>
                <td className="py-4 pr-4 text-right font-mono text-xs text-teal-800 tabular-nums whitespace-nowrap">
                  {market.somShareOfSamPct !== null
                    ? `${market.somShareOfSamPct.toFixed(2)}% of SAM`
                    : "—"}
                </td>
                <td className="py-4 min-w-[260px] space-y-1.5">
                  <div className="text-xs text-slate-700">
                    {data.obtainableEvidence.trim() || (
                      <span className="text-amber-800">{ASSUMPTION_LABEL}</span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* STEP 4 — DEMAND CHECK */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 4 — Demand Check
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-check your Stage 2 Base-Scenario monthly customer target against your SOM obtainable pool and stress-test real buyer behavior.
          </p>
        </div>

        {/* Comparison Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Stage 2 Base-Scenario Customers / Month
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatNumber(baseScenarioCustomers, "INR")}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              Stage 3 SOM Customer Count
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatNumber(data.obtainableCustomers, "INR")}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">
              Base-Scenario Share of SOM
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-slate-900 tabular-nums">
              {baseScenarioCustomers !== null &&
              data.obtainableCustomers !== null &&
              data.obtainableCustomers > 0
                ? `${((baseScenarioCustomers / data.obtainableCustomers) * 100).toFixed(2)}%`
                : "—"}
            </div>
          </div>
        </div>

        {gate.hasDemandInconsistency && (
          <div className="p-4 rounded-md border border-rose-300 bg-rose-50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-rose-900">
                Revenue and market-size assumptions are inconsistent. Review your inputs.
              </div>
              <p className="text-xs text-rose-800">
                Your Stage 2 Base Scenario requires {formatNumber(baseScenarioCustomers, "INR")} paying customers per month, which exceeds your SOM assumption of {formatNumber(data.obtainableCustomers, "INR")} obtainable customers.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Why would these customers buy?
            </span>
            <textarea
              rows={3}
              value={data.whyCustomersBuy}
              onChange={(e) =>
                onChange({ ...data, whyCustomersBuy: e.target.value })
              }
              placeholder="Explain the concrete purchasing trigger and economic payoff for growers..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              How often are they expected to buy?
            </span>
            <textarea
              rows={3}
              value={data.expectedPurchaseFrequency}
              onChange={(e) =>
                onChange({ ...data, expectedPurchaseFrequency: e.target.value })
              }
              placeholder="e.g. Monthly subscription renewal aligned with weekly weekend market harvest cycles..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Which assumption is least certain?
              </span>
              <EvidenceStatusTag hasEvidence={false} />
            </div>
            <textarea
              rows={3}
              value={data.mostUrgentAssumption}
              onChange={(e) =>
                onChange({ ...data, mostUrgentAssumption: e.target.value })
              }
              placeholder="State the riskiest assumption in your customer count or willingness to pay..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              What evidence would improve the demand estimate?
            </span>
            <textarea
              rows={3}
              value={data.demandValidationPlan}
              onChange={(e) =>
                onChange({ ...data, demandValidationPlan: e.target.value })
              }
              placeholder="Specify the field test, survey, or pilot conversion metric needed next..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
          </label>
        </div>
      </section>

      {/* STEP 5 — MARKET-SIZE SUMMARY */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 5 — Market-Size Summary
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            All values reported in Indian Rupees (₹). A large TAM alone does not validate venture attractiveness; focus on SOM reachability and demand evidence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-md p-5">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              TAM — Customer Count and ₹ Value
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatNumber(data.totalPotentialCustomers, "INR")} · {formatINR(market.tam)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              SAM — Customer Count and ₹ Value
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatNumber(data.serviceableCustomers, "INR")} · {formatINR(market.sam)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              SOM — Customer Count and ₹ Value
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-teal-800 tabular-nums">
              {formatNumber(data.obtainableCustomers, "INR")} · {formatINR(market.som)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Base-Scenario Monthly Customers
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatNumber(baseScenarioCustomers, "INR")}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              BIGGEST DEMAND ASSUMPTION
            </div>
            <div className="mt-1 text-xs font-medium text-slate-900">
              {data.mostUrgentAssumption.trim() || ASSUMPTION_LABEL}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              NEXT EVIDENCE NEEDED
            </div>
            <div className="mt-1 text-xs font-medium text-slate-900">
              {data.demandValidationPlan.trim() || ASSUMPTION_LABEL}
            </div>
          </div>
        </div>
      </section>

      {/* AI Strategy Challenge for Stage 3 */}
      <StageChallengePanel
        stage={3}
        stageLabel="Market Size & Demand Lab"
        challenges={liveChallenges}
        onRunChallenge={onRunChallenge}
        isChallenging={isChallenging}
        challengeError={challengeError}
      />

      {/* Sequential Gate to Stage 4 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              Stage 3 Completion Gate (Required to Unlock Stage 4)
            </h3>
            {gate.ready ? (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  All 5 Market Size & Demand Lab steps are complete and consistent with Stage 2 Base-Scenario customers.
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
                <span>Complete Stage 3 & Unlock Stage 4</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToStage4}
                disabled={!stage4Unlocked}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Stage 3 Completed · Open Stage 4: Go-to-Market</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

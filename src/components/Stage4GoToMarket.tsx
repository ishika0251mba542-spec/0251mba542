import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileDown,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  ExperimentWeek,
  GtmChannel,
  GtmChannelOption,
  Stage2RevenuePricing,
  Stage3MarketSizeDemand,
  Stage4GoToMarket,
  StrategyChallengeRecord,
  VentureProfile,
} from "../types/venture";
import {
  computeUnitEconomics,
  formatINR,
  formatNumber,
  isStage4ReadyToComplete,
} from "../utils/calculations";
import {
  ASSUMPTION_LABEL,
  createEmptyStage4,
  getPdfDraftStage4,
} from "../data/farmTraceSession11";
import { EvidenceStatusTag } from "./AssumptionNotice";
import { StageChallengePanel } from "./StageChallengePanel";

interface Stage4GoToMarketProps {
  venture: VentureProfile;
  positioningStatement: string;
  stage2: Stage2RevenuePricing;
  stage3: Stage3MarketSizeDemand;
  data: Stage4GoToMarket;
  unlocked: boolean;
  onChange: (next: Stage4GoToMarket) => void;
  onCompleteStage: () => void;
  onGoToStage3: () => void;
  onOpenDashboard: () => void;
  onExportDossier: () => void;
  liveChallenges: StrategyChallengeRecord[];
  onRunChallenge: () => void;
  isChallenging: boolean;
  challengeError: string | null;
}

const CHANNEL_OPTIONS: Exclude<GtmChannelOption, "">[] = [
  "Campus activation",
  "WhatsApp communities",
  "Instagram / social media",
  "Google Search",
  "Referral",
  "Partnerships",
  "Direct selling",
  "Events",
  "Local influencers",
  "Email",
  "Other",
];

function parseNullableNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function Stage4GoToMarket({
  venture,
  positioningStatement,
  stage2,
  stage3,
  data,
  unlocked,
  onChange,
  onCompleteStage,
  onGoToStage3,
  onOpenDashboard,
  onExportDossier,
  liveChallenges,
  onRunChallenge,
  isChallenging,
  challengeError,
}: Stage4GoToMarketProps) {
  const [isProposing, setIsProposing] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  if (!unlocked) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 max-w-2xl mx-auto text-center space-y-5 my-8">
        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-slate-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Go-to-Market Launch Lab is Locked
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sequential progression requires completing Stage 3 (Market Size & Demand Lab) first so your target customer, SOM estimate, and demand assumptions inform your first-customer launch plan.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={onGoToStage3}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Stage 3: Market Size & Demand Lab</span>
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

  const stage2Metrics = computeUnitEconomics({
    sellingPrice: stage2.sellingPrice,
    purchasesPerCustomer: stage2.purchasesPerCustomer,
    variableCost: effectiveVarCost,
    monthlyFixedCost: effectiveFixedCost,
    expectedCustomers: stage2.expectedCustomers,
  });

  const gate = isStage4ReadyToComplete(data);

  const handleLoadPdfDraft = () => {
    const draft = getPdfDraftStage4();
    onChange({
      ...data,
      ...draft,
    });
  };

  const handleResetStage = () => {
    onChange(createEmptyStage4());
  };

  const addChannel = () => {
    if (data.channels.length >= 3) return;
    const newCh: GtmChannel = {
      id: `ch-${Date.now()}`,
      channelName: "",
      otherChannelName: "",
      budget: null,
      expectedLeads: null,
      expectedCustomers: null,
      whyFitsCustomer: "",
      evidenceReason: "",
    };
    onChange({ ...data, channels: [...data.channels, newCh] });
  };

  const updateChannel = (id: string, patch: Partial<GtmChannel>) => {
    onChange({
      ...data,
      channels: data.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeChannel = (id: string) => {
    if (data.channels.length <= 1) return;
    onChange({
      ...data,
      channels: data.channels.filter((c) => c.id !== id),
    });
  };

  const updateWeek = (id: string, patch: Partial<ExperimentWeek>) => {
    onChange({
      ...data,
      experiment30Days: data.experiment30Days.map((w) =>
        w.id === id ? { ...w, ...patch } : w
      ),
    });
  };

  const handleProposeExperiment = async () => {
    setIsProposing(true);
    setProposeError(null);
    try {
      const res = await fetch("/api/gtm/propose-experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venture: {
            name: venture.name,
            beachheadSegment: venture.beachheadSegment,
            positioningStatement,
          },
          pricing: {
            revenueModel: stage2.revenueModel,
            sellingPrice: stage2.sellingPrice,
            currency: stage2.currency,
          },
          somCustomers: stage3.obtainableCustomers,
          gtmStep1: {
            firstCustomerSegment: data.firstCustomerSegment,
            reachLocations: data.reachLocations,
            mainProblemNeed: data.mainProblemNeed,
            coreMessage: data.coreMessage,
            callToAction: data.callToAction,
          },
          channels: data.channels.map((c) => ({
            channelName:
              c.channelName === "Other"
                ? c.otherChannelName || "Other"
                : c.channelName,
            budget: c.budget,
            expectedLeads: c.expectedLeads,
            expectedCustomers: c.expectedCustomers,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to propose 30-day experiment.");
      }
      const proposedWeeks: Array<Partial<ExperimentWeek>> = Array.isArray(
        json.weeks
      )
        ? json.weeks
        : [];
      const phaseDefaults = [
        "Week 1 — Prepare",
        "Week 2 — Launch",
        "Week 3 — Measure",
        "Week 4 — Learn & Adjust",
      ];
      const nextWeeks: ExperimentWeek[] = phaseDefaults.map((label, idx) => {
        const existing = data.experiment30Days[idx];
        const suggested = proposedWeeks[idx] ?? {};
        return {
          id: existing?.id ?? `wk-${idx + 1}`,
          weekLabel: label,
          channel: suggested.channel ?? "",
          action: suggested.action ?? "",
          target: suggested.target ?? "",
          metric: suggested.metric ?? "",
          responsibility: suggested.responsibility ?? "",
          learningQuestion: suggested.learningQuestion ?? "",
          status: "Planned",
          observedEvidence: "",
          isProposed: true,
        };
      });
      onChange({
        ...data,
        experiment30Days: nextWeeks,
      });
    } catch (err) {
      setProposeError(
        err instanceof Error ? err.message : "Failed to propose 30-day experiment."
      );
    } finally {
      setIsProposing(false);
    }
  };

  // Channel calculations (strictly from entered numbers; never invented)
  const channelCalculations = data.channels.map((ch) => {
    const label =
      ch.channelName === "Other"
        ? ch.otherChannelName?.trim() || "Other"
        : ch.channelName.trim() || "Unselected Channel";

    const convRate =
      ch.expectedLeads !== null &&
      ch.expectedCustomers !== null &&
      ch.expectedLeads > 0
        ? (ch.expectedCustomers / ch.expectedLeads) * 100
        : null;

    let cacDisplay = "—";
    let cacNumeric: number | null = null;
    if (ch.expectedCustomers === 0) {
      cacDisplay = "Not calculable";
    } else if (
      ch.budget !== null &&
      ch.expectedCustomers !== null &&
      ch.expectedCustomers > 0
    ) {
      cacNumeric = ch.budget / ch.expectedCustomers;
      cacDisplay = formatINR(cacNumeric);
    }

    return {
      ch,
      label,
      convRate,
      cacDisplay,
      cacNumeric,
    };
  });

  const totalBudget = data.channels.reduce((acc, c) => acc + (c.budget ?? 0), 0);
  const hasAnyBudget = data.channels.some((c) => c.budget !== null);
  const totalLeads = data.channels.reduce(
    (acc, c) => acc + (c.expectedLeads ?? 0),
    0
  );
  const hasAnyLeads = data.channels.some((c) => c.expectedLeads !== null);
  const totalExpectedCustomers = data.channels.reduce(
    (acc, c) => acc + (c.expectedCustomers ?? 0),
    0
  );
  const hasAnyExpectedCust = data.channels.some(
    (c) => c.expectedCustomers !== null
  );

  const blendedCacDisplay = (() => {
    if (hasAnyExpectedCust && totalExpectedCustomers === 0) {
      return "Not calculable";
    }
    if (hasAnyBudget && hasAnyExpectedCust && totalExpectedCustomers > 0) {
      return formatINR(totalBudget / totalExpectedCustomers);
    }
    return "—";
  })();

  const primaryChannelLabel =
    channelCalculations[0]?.ch.channelName ? channelCalculations[0].label : "Not selected";

  const knownFactsSummary = [
    `Positioning: ${positioningStatement}`,
    `Stage 2 Selected Price: ${formatINR(stage2.sellingPrice)} (${stage2.revenueModel || "Model pending"})`,
    `Stage 3 SOM Estimate: ${formatNumber(stage3.obtainableCustomers, "INR")} customers`,
  ];

  const activeAssumptionsSummary = [
    ...data.channels
      .filter((c) => c.channelName && !c.evidenceReason.trim())
      .map((c) => `${c.channelName} conversion & CAC (${ASSUMPTION_LABEL})`),
    ...(data.biggestGtmAssumption.trim() ? [data.biggestGtmAssumption.trim()] : []),
  ];

  const firstTestAction =
    data.experiment30Days[0]?.action.trim() ||
    data.experiment30Days[1]?.action.trim() ||
    "Define Week 1–2 experiment actions in Step 4.";

  return (
    <div className="space-y-8">
      {/* Lab Header & Anchored Context from Stages 1-3 */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Selected Venture: {venture.name}</span>
              <span aria-hidden="true">·</span>
              <span>Stage 4</span>
              <span aria-hidden="true">·</span>
              <span>{data.completed ? "Completed" : "Active Lab"}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Go-to-Market Launch Lab
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Turn the venture strategy into a practical first-customer acquisition plan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleLoadPdfDraft}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Load PDF Draft (Mission 9)</span>
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

        {/* Inherited Context Strip */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-[11px] font-medium text-slate-500">
              Target Customer (Stage 3)
            </div>
            <div className="mt-1 text-slate-800 line-clamp-2">
              {stage3.targetCustomer}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-[11px] font-medium text-slate-500">
              Positioning Statement (Stage 1)
            </div>
            <div className="mt-1 text-slate-800 line-clamp-2">
              {positioningStatement}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-[11px] font-medium text-slate-500">
              Selected Price (Stage 2)
            </div>
            <div className="mt-1 font-mono font-bold text-slate-900 tabular-nums">
              {formatINR(stage2.sellingPrice)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-[11px] font-medium text-slate-500">
              SOM Estimate (Stage 3)
            </div>
            <div className="mt-1 font-mono font-bold text-slate-900 tabular-nums">
              {formatNumber(stage3.obtainableCustomers, "INR")} customers
            </div>
          </div>
        </div>
      </section>

      {/* STEP 1 — DEFINE THE FIRST CUSTOMER SEGMENT */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Step 1 — Define the First Customer Segment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Focus narrowly on the exact initial buyer group you will approach first.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({ ...data, coreMessage: positioningStatement })
            }
            className="text-xs font-medium text-teal-700 hover:text-teal-800 underline cursor-pointer self-start sm:self-auto"
          >
            Use Stage 1 Positioning Statement
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              First customer segment
            </span>
            <textarea
              rows={2}
              value={data.firstCustomerSegment}
              onChange={(e) =>
                onChange({ ...data, firstCustomerSegment: e.target.value })
              }
              placeholder="Who is your immediate beachhead buyer?"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Where they can be reached
            </span>
            <textarea
              rows={2}
              value={data.reachLocations}
              onChange={(e) =>
                onChange({ ...data, reachLocations: e.target.value })
              }
              placeholder="Specific physical markets, associations, WhatsApp groups, or local directories..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-xs font-semibold text-slate-800">
              Main problem / need
            </span>
            <textarea
              rows={2}
              value={data.mainProblemNeed}
              onChange={(e) =>
                onChange({ ...data, mainProblemNeed: e.target.value })
              }
              placeholder="Primary customer friction solved at point of sale..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Core message
            </span>
            <textarea
              rows={2}
              value={data.coreMessage}
              onChange={(e) =>
                onChange({ ...data, coreMessage: e.target.value })
              }
              placeholder="Clear headline promise tailored to this segment..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-800">
              Call to action
            </span>
            <textarea
              rows={2}
              value={data.callToAction}
              onChange={(e) =>
                onChange({ ...data, callToAction: e.target.value })
              }
              placeholder="Exact next step you want the buyer to take..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </label>
        </div>
      </section>

      {/* STEP 2 — CHOOSE UP TO 3 ACQUISITION CHANNELS */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Step 2 — Choose Up to 3 Acquisition Channels ({data.channels.length} / 3)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your own budget, expected leads, and expected conversions—conversion assumptions are never auto-generated. Missing evidence stays labeled “{ASSUMPTION_LABEL}”.
            </p>
          </div>
          <button
            type="button"
            onClick={addChannel}
            disabled={data.channels.length >= 3}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {data.channels.length >= 3
                ? "Max 3 Channels Reached"
                : "Add Channel"}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {data.channels.map((ch, idx) => (
            <div
              key={ch.id}
              className="p-4 bg-slate-50/70 border border-slate-200 rounded-md space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">
                    Channel {idx + 1}
                  </span>
                  <EvidenceStatusTag
                    hasEvidence={ch.evidenceReason.trim().length > 0}
                    verifiedLabel="Evidence / Reason Cited"
                  />
                </div>
                {data.channels.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChannel(ch.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    aria-label="Remove channel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Channel
                  </span>
                  <select
                    value={ch.channelName}
                    onChange={(e) =>
                      updateChannel(ch.id, { channelName: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                  >
                    <option value="">Select channel...</option>
                    {CHANNEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Budget (₹)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={ch.budget ?? ""}
                    onChange={(e) =>
                      updateChannel(ch.id, {
                        budget: parseNullableNumber(e.target.value),
                      })
                    }
                    placeholder="Enter budget"
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Expected Leads / Prospects
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={ch.expectedLeads ?? ""}
                    onChange={(e) =>
                      updateChannel(ch.id, {
                        expectedLeads: parseNullableNumber(e.target.value),
                      })
                    }
                    placeholder="Enter leads"
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Expected Conversions / New Customers
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={ch.expectedCustomers ?? ""}
                    onChange={(e) =>
                      updateChannel(ch.id, {
                        expectedCustomers: parseNullableNumber(e.target.value),
                      })
                    }
                    placeholder="Enter new customers"
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded"
                  />
                </label>
              </div>

              {ch.channelName === "Other" && (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Specify Other Channel
                  </span>
                  <input
                    type="text"
                    value={ch.otherChannelName ?? ""}
                    onChange={(e) =>
                      updateChannel(ch.id, { otherChannelName: e.target.value })
                    }
                    placeholder="Enter custom channel name..."
                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded"
                  />
                </label>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Why this channel fits the target customer
                  </span>
                  <textarea
                    rows={2}
                    value={ch.whyFitsCustomer}
                    onChange={(e) =>
                      updateChannel(ch.id, { whyFitsCustomer: e.target.value })
                    }
                    placeholder="Explain why your first segment trusts and engages on this channel..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-700">
                    Evidence / Reason for assumption
                  </span>
                  <textarea
                    rows={2}
                    value={ch.evidenceReason}
                    onChange={(e) =>
                      updateChannel(ch.id, { evidenceReason: e.target.value })
                    }
                    placeholder="Cite field pilot observations, response logs, or market tests..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STEP 3 — CALCULATE BASIC GTM METRICS */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 3 — Calculate Basic GTM Metrics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Channel Conversion Rate and CAC compared against Stage 2 Contribution per Unit ({formatINR(stage2Metrics.contributionPerUnit)}).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Channel</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Budget</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Leads</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">New Customers</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Conversion Rate</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">Estimated CAC</th>
                <th className="py-2.5">CAC vs. Stage 2 Contribution / Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {channelCalculations.map(({ ch, label, convRate, cacDisplay, cacNumeric }) => {
                let comparisonText = "—";
                if (cacDisplay === "Not calculable") {
                  comparisonText = "Not calculable (0 expected customers)";
                } else if (
                  cacNumeric !== null &&
                  stage2Metrics.contributionPerUnit !== null
                ) {
                  if (stage2Metrics.contributionPerUnit <= 0) {
                    comparisonText = "Stage 2 contribution per unit is non-viable";
                  } else if (cacNumeric <= stage2Metrics.contributionPerUnit) {
                    comparisonText = `CAC (${cacDisplay}) ≤ 1st-unit contribution (${formatINR(
                      stage2Metrics.contributionPerUnit
                    )})`;
                  } else {
                    const unitsToRecover = cacNumeric / stage2Metrics.contributionPerUnit;
                    comparisonText = `CAC exceeds 1st-unit contribution (${unitsToRecover.toFixed(
                      1
                    )} units to recover)`;
                  }
                }

                return (
                  <tr key={ch.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                      {label}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {formatINR(ch.budget)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {formatNumber(ch.expectedLeads, "INR")}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {formatNumber(ch.expectedCustomers, "INR")}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {convRate !== null ? `${convRate.toFixed(1)}%` : "—"}
                    </td>
                    <td
                      className={`py-3 pr-4 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${
                        cacDisplay === "Not calculable"
                          ? "text-amber-800"
                          : "text-slate-900"
                      }`}
                    >
                      {cacDisplay}
                    </td>
                    <td className="py-3 text-xs text-slate-700">{comparisonText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
          CAC must be interpreted together with repeat purchase behaviour and customer lifetime. This is an early experiment, not a final profitability conclusion.
        </div>
      </section>

      {/* STEP 4 — BUILD A 30-DAY LAUNCH EXPERIMENT */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Step 4 — Build a 30-Day Launch Experiment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Four-week execution sprint. Gemini can propose a draft structure from your entered context (labeled “Proposed”), fully editable with zero invented results.
            </p>
          </div>
          <button
            type="button"
            onClick={handleProposeExperiment}
            disabled={isProposing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-700" />
            <span>
              {isProposing
                ? "Drafting Experiment..."
                : "Propose Draft with Gemini"}
            </span>
          </button>
        </div>

        {proposeError && (
          <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-800">
            {proposeError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.experiment30Days.map((wk) => (
            <div
              key={wk.id}
              className="p-4 border border-slate-200 rounded-md space-y-3 bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {wk.weekLabel}
                  </span>
                  {wk.isProposed && (
                    <span className="px-2 py-0.5 text-[11px] font-medium border border-sky-300 bg-sky-50 text-sky-800 rounded">
                      Proposed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <EvidenceStatusTag
                    hasEvidence={wk.observedEvidence.trim().length > 0}
                    verifiedLabel="Result Logged"
                  />
                  <select
                    value={wk.status}
                    onChange={(e) =>
                      updateWeek(wk.id, {
                        status: e.target.value as ExperimentWeek["status"],
                      })
                    }
                    className="px-2 py-1 text-xs font-medium border border-slate-300 rounded bg-white"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Validated">Validated</option>
                    <option value="Invalidated">Invalidated</option>
                  </select>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Action</span>
                <textarea
                  rows={2}
                  value={wk.action}
                  onChange={(e) =>
                    updateWeek(wk.id, { action: e.target.value, isProposed: false })
                  }
                  placeholder="Concrete weekly execution step..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Channel</span>
                  <input
                    type="text"
                    value={wk.channel}
                    onChange={(e) =>
                      updateWeek(wk.id, {
                        channel: e.target.value,
                        isProposed: false,
                      })
                    }
                    placeholder="e.g. Direct selling"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Target</span>
                  <input
                    type="text"
                    value={wk.target}
                    onChange={(e) =>
                      updateWeek(wk.id, {
                        target: e.target.value,
                        isProposed: false,
                      })
                    }
                    placeholder="e.g. 20 berry stall owners"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">
                    Metric to Track
                  </span>
                  <input
                    type="text"
                    value={wk.metric}
                    onChange={(e) =>
                      updateWeek(wk.id, {
                        metric: e.target.value,
                        isProposed: false,
                      })
                    }
                    placeholder="e.g. Trial sign-ups"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">
                    Owner / Responsibility
                  </span>
                  <input
                    type="text"
                    value={wk.responsibility}
                    onChange={(e) =>
                      updateWeek(wk.id, {
                        responsibility: e.target.value,
                        isProposed: false,
                      })
                    }
                    placeholder="e.g. Founder"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  Learning Question
                </span>
                <input
                  type="text"
                  value={wk.learningQuestion}
                  onChange={(e) =>
                    updateWeek(wk.id, {
                      learningQuestion: e.target.value,
                      isProposed: false,
                    })
                  }
                  placeholder="What critical unknown does this week answer?"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  Observed Outcome (log only after running test)
                </span>
                <input
                  type="text"
                  value={wk.observedEvidence}
                  onChange={(e) =>
                    updateWeek(wk.id, { observedEvidence: e.target.value })
                  }
                  placeholder="Leave blank until field experiment runs..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* STEP 5 — GTM DASHBOARD */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Step 5 — GTM Dashboard
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified launch summary connecting Stage 2 unit economics, Stage 3 SOM, and Stage 4 first-customer experiments.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-800">
            Biggest GTM Assumption
          </span>
          <input
            type="text"
            value={data.biggestGtmAssumption}
            onChange={(e) =>
              onChange({ ...data, biggestGtmAssumption: e.target.value })
            }
            placeholder="e.g. Direct weekend market demos will convert growers into active batch loggers."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </label>

        {/* 9-Field Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-md p-5">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              PRIMARY CUSTOMER SEGMENT
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-900">
              {data.firstCustomerSegment.trim() || ASSUMPTION_LABEL}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              PRIMARY CHANNEL
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {primaryChannelLabel}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              30-DAY BUDGET
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {hasAnyBudget ? formatINR(totalBudget) : "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              EXPECTED LEADS
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {hasAnyLeads ? formatNumber(totalLeads, "INR") : "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              EXPECTED NEW CUSTOMERS
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {hasAnyExpectedCust
                ? formatNumber(totalExpectedCustomers, "INR")
                : "—"}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              ESTIMATED CAC
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {blendedCacDisplay}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              SELECTED PRICE
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatINR(stage2.sellingPrice)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              CONTRIBUTION PER UNIT
            </div>
            <div className="mt-1 text-sm font-bold font-mono text-slate-900 tabular-nums">
              {formatINR(stage2Metrics.contributionPerUnit)}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">
              BIGGEST GTM ASSUMPTION
            </div>
            <div className="mt-1 text-xs font-medium text-slate-900">
              {data.biggestGtmAssumption.trim() || ASSUMPTION_LABEL}
            </div>
          </div>
        </div>

        {/* WHAT WE KNOW / WHAT WE ARE ASSUMING / WHAT WE WILL TEST FIRST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 border border-slate-200 rounded-md space-y-2">
            <div className="text-xs font-bold text-slate-900">WHAT WE KNOW</div>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              {knownFactsSummary.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <textarea
              rows={2}
              value={data.whatWeKnow}
              onChange={(e) => onChange({ ...data, whatWeKnow: e.target.value })}
              placeholder="Add any additional verified facts from field interviews..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded mt-2"
            />
          </div>

          <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-md space-y-2">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>WHAT WE ARE ASSUMING</span>
            </div>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              {activeAssumptionsSummary.length > 0 ? (
                activeAssumptionsSummary.map((item, i) => <li key={i}>{item}</li>)
              ) : (
                <li>{ASSUMPTION_LABEL}</li>
              )}
            </ul>
            <textarea
              rows={2}
              value={data.whatWeAssume}
              onChange={(e) =>
                onChange({ ...data, whatWeAssume: e.target.value })
              }
              placeholder="Add specific unvalidated channel or buyer assumptions..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded mt-2"
            />
          </div>

          <div className="p-4 border border-teal-200 bg-teal-50/40 rounded-md space-y-2">
            <div className="text-xs font-bold text-teal-900">
              WHAT WE WILL TEST FIRST
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {firstTestAction}
            </p>
            <textarea
              rows={2}
              value={data.whatWeWillTestFirst}
              onChange={(e) =>
                onChange({ ...data, whatWeWillTestFirst: e.target.value })
              }
              placeholder="Summarize your exact Day 1–14 first field test..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded mt-2"
            />
          </div>
        </div>
      </section>

      {/* AI Strategy Challenge for Stage 4 */}
      <StageChallengePanel
        stage={4}
        stageLabel="Go-to-Market Launch Lab"
        challenges={liveChallenges}
        onRunChallenge={onRunChallenge}
        isChallenging={isChallenging}
        challengeError={challengeError}
      />

      {/* Final Completion Gate */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              Stage 4 Completion & Venture Studio Finalization
            </h3>
            {data.completed ? (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  All 4 NEXUS Venture Studio stages are completed for {venture.name} and persisted to browser local storage.
                </span>
              </p>
            ) : gate.ready ? (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  All 5 Go-to-Market Launch Lab steps are complete. Unvalidated channel metrics remain labeled “{ASSUMPTION_LABEL}”.
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
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Stage 4 & Open Strategy Dashboard</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Open NEXUS Venture Strategy Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={onExportDossier}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Dossier</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

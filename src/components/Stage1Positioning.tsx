import { useState } from "react";
import { ShieldAlert, Sparkles, ArrowRight, FileText } from "lucide-react";
import type {
  CompetitorItem,
  Stage1Data,
  StrategyChallengeRecord,
  VentureProfile,
} from "../types/venture";
import { EvidenceStatusTag } from "./AssumptionNotice";

interface Stage1PositioningProps {
  venture: VentureProfile;
  stage1: Stage1Data;
  liveChallenges: StrategyChallengeRecord[];
  onRunChallenge: () => void;
  isChallenging: boolean;
  challengeError: string | null;
  onProceedToStage2: () => void;
  onOpenPdf: () => void;
}

export function Stage1Positioning({
  venture,
  stage1,
  liveChallenges,
  onRunChallenge,
  isChallenging,
  challengeError,
  onProceedToStage2,
  onOpenPdf,
}: Stage1PositioningProps) {
  const [compFilter, setCompFilter] = useState<"all" | "direct" | "indirect">("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredCompetitors = stage1.competitors.filter((c) => {
    if (compFilter === "direct") return c.type === "Direct Competitor";
    if (compFilter === "indirect") return c.type === "Indirect Competitor";
    return true;
  });

  const stage1LiveChallenges = liveChallenges.filter((c) => c.stage === 1);
  const allChallenges = [...stage1LiveChallenges, ...stage1.session11Challenges];

  return (
    <div className="space-y-8">
      {/* Venture Anchor Banner */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Session 11 Preserved Baseline</span>
              <span aria-hidden="true">·</span>
              <span>{venture.studentEmail}</span>
              <span aria-hidden="true">·</span>
              <span>{venture.institution}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              01. Venture Profile & Competitive Positioning — {venture.name}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {venture.ventureIdea}
            </p>
            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  Beachhead Customer Segment
                </div>
                <p className="text-sm text-slate-800">{venture.beachheadSegment}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">
                  Primary Friction ({venture.primaryFrictionId})
                </div>
                <p className="text-sm text-slate-800">{venture.primaryFriction}</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>Evidence Strength: {venture.frictionEvidenceStrength}</span>
                  <span aria-hidden="true">·</span>
                  <EvidenceStatusTag
                    hasEvidence={false}
                    detail={venture.willingnessToPayEvidenceNote}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenPdf}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>View Uploaded PDF Plan</span>
            </button>
            <button
              type="button"
              onClick={onProceedToStage2}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Continue to Stage 2: Revenue & Pricing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Positioning Map + Positioning Statement */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* 2x2 Positioning Map */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-1">
              <h3 className="text-base font-semibold text-slate-900">
                Positioning Map
              </h3>
              <span className="text-xs text-slate-500 tabular-nums">
                FarmTrace AI ({stage1.positioning.ventureAxisXScore}, {stage1.positioning.ventureAxisYScore})
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {stage1.positioning.axisXLabel} (X) vs. {stage1.positioning.axisYLabel} (Y)
            </p>
          </div>

          <div className="w-full overflow-x-auto">
            <PositioningMapSvg
              competitors={stage1.competitors}
              ventureX={stage1.positioning.ventureAxisXScore}
              ventureY={stage1.positioning.ventureAxisYScore}
              ventureName={venture.name}
              axisXLabel={stage1.positioning.axisXLabel}
              axisYLabel={stage1.positioning.axisYLabel}
              hoveredId={hoveredId}
              onHover={setHoveredId}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <span>Desired Position: {stage1.positioning.desiredAssociatedPosition}</span>
          </div>
        </div>

        {/* Positioning Statement */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                Positioning Statement
              </h3>
              <EvidenceStatusTag
                hasEvidence={stage1.positioning.reasonHasEvidence}
                verifiedLabel="Session 11 Evidence Cited"
              />
            </div>

            <blockquote className="p-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 leading-relaxed">
              “{stage1.positioning.positioningStatement}”
            </blockquote>

            <dl className="space-y-3 text-sm">
              <div className="pt-2 border-t border-slate-100">
                <dt className="text-xs font-medium text-slate-500">Target Customer</dt>
                <dd className="text-slate-800 mt-0.5">{stage1.positioning.targetCustomer}</dd>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <dt className="text-xs font-medium text-slate-500">Category & Main Alternative</dt>
                <dd className="text-slate-800 mt-0.5">
                  {stage1.positioning.category} · Alternative: {stage1.positioning.mainAlternative}
                </dd>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <dt className="text-xs font-medium text-slate-500">Main Differentiation</dt>
                <dd className="text-slate-800 mt-0.5">{stage1.positioning.mainDifferentiation}</dd>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <dt className="text-xs font-medium text-slate-500">Reason To Believe</dt>
                <dd className="text-slate-800 mt-0.5">{stage1.positioning.reasonToBelieve}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Competitor Research & Matrix */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Competitor Research & Battlefield Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Preserved Session 11 competitor analysis with evidence sources and price-transparency flags.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setCompFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({stage1.competitors.length})
            </button>
            <button
              type="button"
              onClick={() => setCompFilter("direct")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compFilter === "direct"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Direct
            </button>
            <button
              type="button"
              onClick={() => setCompFilter("indirect")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compFilter === "indirect"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Indirect
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                <th className="py-2.5 pr-4">Competitor</th>
                <th className="py-2.5 pr-4">Main Offer</th>
                <th className="py-2.5 pr-4">Price / Cost</th>
                <th className="py-2.5 pr-4">Strength & Weakness</th>
                <th className="py-2.5 pr-4 text-right tabular-nums">X / Y</th>
                <th className="py-2.5">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCompetitors.map((comp) => (
                <tr key={comp.id} className="hover:bg-slate-50/70 align-top">
                  <td className="py-3.5 pr-4 min-w-[180px]">
                    <div className="font-medium text-slate-900">{comp.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{comp.type}</div>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-700 min-w-[220px]">
                    {comp.mainOffer}
                  </td>
                  <td className="py-3.5 pr-4 min-w-[180px]">
                    <div className="text-slate-900 font-medium">{comp.priceCost}</div>
                    {comp.priceEvidenceNote.includes("Assumption") && (
                      <div className="mt-1.5">
                        <EvidenceStatusTag
                          hasEvidence={false}
                          detail={comp.priceEvidenceNote}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 pr-4 min-w-[240px] space-y-1.5">
                    <div className="text-xs text-slate-700">
                      <span className="font-medium text-emerald-700">Strength: </span>
                      {comp.mainStrength}
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-medium text-rose-700">Weakness: </span>
                      {comp.mainWeakness}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                    {comp.axisXScore} / {comp.axisYScore}
                  </td>
                  <td className="py-3.5 min-w-[200px]">
                    <div className="text-xs text-slate-700">{comp.evidenceSource}</div>
                    <div className="text-xs font-medium text-slate-500 mt-1">
                      Strength: {comp.evidenceStrength}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Competition War Room & AI Strategy Challenge */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            <h3 className="text-base font-semibold text-slate-900">
              Competition War Room Results
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {stage1.warRoomResults.map((item) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.competitorOrThreat}
                  </span>
                  <EvidenceStatusTag
                    hasEvidence={item.validationStatus === "Backed by Session 11 Evidence"}
                    verifiedLabel="Session 11 Evidence"
                    detail={item.evidenceBasis}
                  />
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-800">Threat Vector: </span>
                  {item.attackVector}
                </p>
                <p className="text-xs text-slate-700">
                  <span className="font-medium text-teal-800">Venture Defense: </span>
                  {item.ventureDefense}
                </p>
                <p className="text-xs text-slate-500">
                  Basis: {item.evidenceBasis}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                AI Strategy Challenge
              </h3>
              <p className="text-xs text-slate-500">
                Evidence-strict red-team review without invented metrics.
              </p>
            </div>
            <button
              type="button"
              onClick={onRunChallenge}
              disabled={isChallenging}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>{isChallenging ? "Running Challenge..." : "Run Fresh AI Challenge"}</span>
            </button>
          </div>

          {challengeError && (
            <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-800">
              {challengeError}
            </div>
          )}

          <div className="space-y-5 divide-y divide-slate-100">
            {allChallenges.map((ch) => (
              <div key={ch.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{ch.source}</span>
                  <span className="tabular-nums">
                    {new Date(ch.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{ch.headline}</p>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {ch.criticalQuestions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
                <div className="space-y-2 pt-1">
                  {ch.assumptionFlags.map((af, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">{af.claim}</span>
                        <EvidenceStatusTag hasEvidence={false} />
                      </div>
                      <p className="text-slate-600">Test: {af.validationTest}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-700">
                  <span className="font-medium text-slate-900">War Room Counter-Move: </span>
                  {ch.warRoomCounterMove}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

interface PositioningMapSvgProps {
  competitors: CompetitorItem[];
  ventureX: number;
  ventureY: number;
  ventureName: string;
  axisXLabel: string;
  axisYLabel: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}

function PositioningMapSvg({
  competitors,
  ventureX,
  ventureY,
  ventureName,
  axisXLabel,
  axisYLabel,
  hoveredId,
  onHover,
}: PositioningMapSvgProps) {
  const width = 560;
  const height = 340;
  const padLeft = 56;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 48;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const toPxX = (score: number) => padLeft + (score / 10) * plotW;
  const toPxY = (score: number) => padTop + ((10 - score) / 10) * plotH;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto max-w-[600px]"
      role="img"
      aria-label="Competitive Positioning Map"
    >
      {/* Plot frame */}
      <rect
        x={padLeft}
        y={padTop}
        width={plotW}
        height={plotH}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="1"
      />

      {/* Midpoint crosshairs at 5,5 */}
      <line
        x1={toPxX(5)}
        y1={padTop}
        x2={toPxX(5)}
        y2={padTop + plotH}
        stroke="#cbd5e1"
        strokeDasharray="4 4"
      />
      <line
        x1={padLeft}
        y1={toPxY(5)}
        x2={padLeft + plotW}
        y2={toPxY(5)}
        stroke="#cbd5e1"
        strokeDasharray="4 4"
      />

      {/* Grid ticks */}
      {[0, 2, 4, 6, 8, 10].map((tick) => (
        <g key={tick}>
          <text
            x={toPxX(tick)}
            y={padTop + plotH + 16}
            textAnchor="middle"
            className="fill-slate-400 text-[10px] font-mono tabular-nums"
          >
            {tick}
          </text>
          <text
            x={padLeft - 10}
            y={toPxY(tick) + 3}
            textAnchor="end"
            className="fill-slate-400 text-[10px] font-mono tabular-nums"
          >
            {tick}
          </text>
        </g>
      ))}

      {/* Axis labels */}
      <text
        x={padLeft + plotW / 2}
        y={height - 8}
        textAnchor="middle"
        className="fill-slate-600 text-[11px] font-medium"
      >
        {axisXLabel} →
      </text>
      <text
        x={16}
        y={padTop + plotH / 2}
        textAnchor="middle"
        transform={`rotate(-90 16 ${padTop + plotH / 2})`}
        className="fill-slate-600 text-[11px] font-medium"
      >
        {axisYLabel} →
      </text>

      {/* Competitor points */}
      {competitors.map((comp) => {
        const cx = toPxX(comp.axisXScore);
        const cy = toPxY(comp.axisYScore);
        const isHovered = hoveredId === comp.id;
        const shortName =
          comp.name.length > 26 ? `${comp.name.slice(0, 24)}…` : comp.name;
        const labelX = comp.axisXScore > 6 ? cx - 10 : cx + 10;
        const anchor = comp.axisXScore > 6 ? "end" : "start";

        return (
          <g
            key={comp.id}
            onMouseEnter={() => onHover(comp.id)}
            onMouseLeave={() => onHover(null)}
            className="cursor-pointer"
          >
            <circle
              cx={cx}
              cy={cy}
              r={isHovered ? 8 : 6}
              fill={comp.type === "Direct Competitor" ? "#dc2626" : "#475569"}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={labelX}
              y={cy + 4}
              textAnchor={anchor}
              className="fill-slate-800 text-[11px] font-medium"
            >
              {shortName} ({comp.axisXScore},{comp.axisYScore})
            </text>
          </g>
        );
      })}

      {/* Selected Venture point */}
      <g
        onMouseEnter={() => onHover("venture")}
        onMouseLeave={() => onHover(null)}
      >
        <circle
          cx={toPxX(ventureX)}
          cy={toPxY(ventureY)}
          r={9}
          fill="#0f766e"
          stroke="#ffffff"
          strokeWidth="2.5"
        />
        <text
          x={toPxX(ventureX) + 12}
          y={toPxY(ventureY) + 4}
          textAnchor="start"
          className="fill-teal-800 text-[12px] font-bold"
        >
          {ventureName} ({ventureX},{ventureY})
        </text>
      </g>
    </svg>
  );
}

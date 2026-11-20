import { Sparkles } from "lucide-react";
import type { StageId, StrategyChallengeRecord } from "../types/venture";
import { EvidenceStatusTag } from "./AssumptionNotice";

interface StageChallengePanelProps {
  stage: StageId;
  stageLabel: string;
  challenges: StrategyChallengeRecord[];
  onRunChallenge: () => void;
  isChallenging: boolean;
  challengeError: string | null;
}

export function StageChallengePanel({
  stage,
  stageLabel,
  challenges,
  onRunChallenge,
  isChallenging,
  challengeError,
}: StageChallengePanelProps) {
  const stageChallenges = challenges.filter((c) => c.stage === stage);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            AI Strategy Challenge — {stageLabel}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Red-team your current inputs strictly against cited evidence without fabricating external benchmarks.
          </p>
        </div>
        <button
          type="button"
          onClick={onRunChallenge}
          disabled={isChallenging}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          <span>{isChallenging ? "Analyzing Stage..." : "Run AI Strategy Challenge"}</span>
        </button>
      </div>

      {challengeError && (
        <div className="p-3 rounded-md border border-rose-200 bg-rose-50 text-xs text-rose-800">
          {challengeError}
        </div>
      )}

      {stageChallenges.length === 0 ? (
        <div className="p-4 rounded-md border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-600">
          No AI Strategy Challenge run on Stage {stage} yet. Enter your figures above and click “Run AI Strategy Challenge” to audit assumptions.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 space-y-5">
          {stageChallenges.map((ch) => (
            <div key={ch.id} className="pt-4 first:pt-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-medium text-teal-800">{ch.source}</span>
                <span className="tabular-nums">
                  {new Date(ch.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{ch.headline}</p>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                {ch.criticalQuestions.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
              {ch.assumptionFlags.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {ch.assumptionFlags.map((af, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span className="font-medium text-slate-800">{af.claim}</span>
                        <EvidenceStatusTag hasEvidence={false} />
                      </div>
                      <p className="text-slate-600">Validation Test: {af.validationTest}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="font-semibold text-slate-900">War Room Counter-Move: </span>
                  <span className="text-slate-700">{ch.warRoomCounterMove}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="font-semibold text-slate-900">Readiness Assessment: </span>
                  <span className="text-slate-700">{ch.readinessAssessment}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

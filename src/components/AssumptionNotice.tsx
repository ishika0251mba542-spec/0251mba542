import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ASSUMPTION_LABEL } from "../data/farmTraceSession11";

interface AssumptionNoticeProps {
  hasEvidence: boolean;
  verifiedLabel?: string;
  detail?: string;
}

export function EvidenceStatusTag({
  hasEvidence,
  verifiedLabel = "Evidence cited",
  detail,
}: AssumptionNoticeProps) {
  if (hasEvidence) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{verifiedLabel}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-xs font-medium text-amber-800 whitespace-nowrap shrink-0"
      title={detail ?? ASSUMPTION_LABEL}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-700" aria-hidden="true" />
      <span>{ASSUMPTION_LABEL}</span>
    </span>
  );
}

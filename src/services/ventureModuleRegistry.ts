import type {
  FutureModuleId,
  KnownFutureModuleId,
  VentureModuleDefinition,
  VentureModuleDocument,
  VentureModuleTrack,
} from "../types/venture";

export const VENTURE_WORKSPACE_SCHEMA_VERSION = 2;

export const FUTURE_VENTURE_MODULE_CATALOG: Record<
  KnownFutureModuleId,
  VentureModuleDefinition
> = {
  "mvp-brief": {
    moduleId: "mvp-brief",
    title: "MVP Brief",
    track: "product-mvp",
    sequenceOrder: 101,
    schemaVersion: 1,
    dependsOnCoreSections: [
      "ventureProfile",
      "competitionPositioning",
      "goToMarket",
    ],
    dependsOnModules: [],
  },
  "feature-prioritization": {
    moduleId: "feature-prioritization",
    title: "Feature Prioritization",
    track: "product-mvp",
    sequenceOrder: 102,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "competitionPositioning"],
    dependsOnModules: ["mvp-brief"],
  },
  "no-code-tool-selection": {
    moduleId: "no-code-tool-selection",
    title: "No-Code Tool Selection",
    track: "product-mvp",
    sequenceOrder: 103,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "revenuePricing"],
    dependsOnModules: ["feature-prioritization"],
  },
  "ux-customer-journey": {
    moduleId: "ux-customer-journey",
    title: "UX & Customer Journey",
    track: "product-mvp",
    sequenceOrder: 104,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "goToMarket"],
    dependsOnModules: ["mvp-brief", "feature-prioritization"],
  },
  "ai-feature-design": {
    moduleId: "ai-feature-design",
    title: "AI Feature Design",
    track: "product-mvp",
    sequenceOrder: 105,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "competitionPositioning"],
    dependsOnModules: ["mvp-brief", "feature-prioritization"],
  },
  "api-data-flow": {
    moduleId: "api-data-flow",
    title: "API & Data Flow",
    track: "product-mvp",
    sequenceOrder: 106,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile"],
    dependsOnModules: [
      "feature-prioritization",
      "no-code-tool-selection",
      "ai-feature-design",
    ],
  },
  "prototype-build": {
    moduleId: "prototype-build",
    title: "Prototype Build",
    track: "product-mvp",
    sequenceOrder: 107,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "goToMarket"],
    dependsOnModules: [
      "no-code-tool-selection",
      "ux-customer-journey",
      "api-data-flow",
    ],
  },
  "usability-testing": {
    moduleId: "usability-testing",
    title: "Usability Testing",
    track: "product-mvp",
    sequenceOrder: 108,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "goToMarket"],
    dependsOnModules: ["ux-customer-journey", "prototype-build"],
  },
  "mvp-evidence-review": {
    moduleId: "mvp-evidence-review",
    title: "MVP Evidence Review",
    track: "product-mvp",
    sequenceOrder: 109,
    schemaVersion: 1,
    dependsOnCoreSections: [
      "competitionPositioning",
      "revenuePricing",
      "marketSizeDemand",
      "goToMarket",
    ],
    dependsOnModules: ["mvp-brief", "usability-testing"],
  },
  "projected-financial-statements": {
    moduleId: "projected-financial-statements",
    title: "Projected Financial Statements",
    track: "finance-ops",
    sequenceOrder: 201,
    schemaVersion: 1,
    dependsOnCoreSections: [
      "revenuePricing",
      "marketSizeDemand",
      "goToMarket",
    ],
    dependsOnModules: [],
  },
  "operating-model": {
    moduleId: "operating-model",
    title: "Operating Model",
    track: "finance-ops",
    sequenceOrder: 202,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile", "revenuePricing", "goToMarket"],
    dependsOnModules: ["mvp-brief"],
  },
  "hr-founder-organisation": {
    moduleId: "hr-founder-organisation",
    title: "HR & Founder Organisation",
    track: "finance-ops",
    sequenceOrder: 203,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile"],
    dependsOnModules: ["operating-model"],
  },
  "cac-ltv-burn-runway": {
    moduleId: "cac-ltv-burn-runway",
    title: "CAC / LTV / Burn / Runway",
    track: "finance-ops",
    sequenceOrder: 204,
    schemaVersion: 1,
    dependsOnCoreSections: ["revenuePricing", "marketSizeDemand", "goToMarket"],
    dependsOnModules: ["projected-financial-statements", "operating-model"],
  },
  "legal-structure": {
    moduleId: "legal-structure",
    title: "Legal Structure",
    track: "legal-risk",
    sequenceOrder: 301,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile"],
    dependsOnModules: ["hr-founder-organisation"],
  },
  "labour-ip-data-risk": {
    moduleId: "labour-ip-data-risk",
    title: "Labour / IP / Data Risk",
    track: "legal-risk",
    sequenceOrder: 302,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile"],
    dependsOnModules: [
      "ai-feature-design",
      "api-data-flow",
      "hr-founder-organisation",
      "legal-structure",
    ],
  },
  "government-policy-risk": {
    moduleId: "government-policy-risk",
    title: "Government & Policy Risk",
    track: "legal-risk",
    sequenceOrder: 303,
    schemaVersion: 1,
    dependsOnCoreSections: [
      "ventureProfile",
      "marketSizeDemand",
      "goToMarket",
    ],
    dependsOnModules: ["legal-structure", "labour-ip-data-risk"],
  },
};

export function getVentureModuleDefinition(
  moduleId: FutureModuleId
): VentureModuleDefinition {
  if (moduleId in FUTURE_VENTURE_MODULE_CATALOG) {
    return FUTURE_VENTURE_MODULE_CATALOG[moduleId as KnownFutureModuleId];
  }
  return {
    moduleId,
    title: moduleId
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    track: "custom",
    sequenceOrder: 999,
    schemaVersion: 1,
    dependsOnCoreSections: ["ventureProfile"],
    dependsOnModules: [],
  };
}

export function createEmptyVentureModule<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
  TOutputs extends Record<string, unknown> = Record<string, unknown>,
>(params: {
  userId: string;
  ventureId: string;
  moduleId: FutureModuleId;
  track?: VentureModuleTrack;
  title?: string;
  inputs?: TInputs;
  outputs?: TOutputs;
}): VentureModuleDocument<TInputs, TOutputs> {
  const def = getVentureModuleDefinition(params.moduleId);
  return {
    userId: params.userId,
    ventureId: params.ventureId,
    moduleId: params.moduleId,
    track: params.track ?? def.track,
    title: params.title ?? def.title,
    schemaVersion: def.schemaVersion,
    status: "not_started",
    inputs: (params.inputs ?? {}) as TInputs,
    outputs: (params.outputs ?? {}) as TOutputs,
    assumptions: {},
    evidence: {},
    aiChallenges: [],
    completedAt: null,
  };
}

import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  ASSUMPTION_LABEL,
  createInitialStudioState,
} from "../data/farmTraceSession11";
import type {
  FutureModuleId,
  Stage2RevenuePricing,
  Stage3MarketSizeDemand,
  Stage4GoToMarket,
  StageId,
  StrategyChallengeRecord,
  StudioState,
  VentureModuleDocument,
  VentureModuleEntryDocument,
  VentureModuleStatus,
  VentureModuleTrack,
} from "../types/venture";
import {
  computeMarketSize,
  computeScenarioMetrics,
  computeUnitEconomics,
} from "../utils/calculations";
import {
  VENTURE_WORKSPACE_SCHEMA_VERSION,
  getVentureModuleDefinition,
} from "./ventureModuleRegistry";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = sanitizeForFirestore(v);
      }
    }
    return out as T;
  }
  return value;
}

function clampString(value: string | null | undefined, maxLen: number): string {
  const str = typeof value === "string" ? value : "";
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export async function syncUserAccount(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, "users", user.uid);
  const displayName = clampString(
    user.displayName?.trim() || user.email?.split("@")[0] || "Founder",
    200
  );
  const email = clampString(user.email || "", 320);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!snap.exists()) {
    try {
      await setDoc(userRef, {
        userId: user.uid,
        name: displayName,
        email,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(userRef, {
        name: displayName,
        email,
        lastLoginAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export interface VentureWorkspacePayload {
  userId: string;
  ventureId: string;
  activeStage: number;
  schemaVersion: number;
  activeModuleId?: string;
  ventureProfile: Record<string, unknown>;
  competitionPositioning: Record<string, unknown>;
  revenuePricing: Record<string, unknown>;
  marketSizeDemand: Record<string, unknown>;
  goToMarket: Record<string, unknown>;
}

function buildVentureSections(state: StudioState, nowIso: string): Omit<
  VentureWorkspacePayload,
  "userId" | "ventureId"
> {
  // 1. VENTURE PROFILE (preserving all existing VentureProfile fields + required aliases)
  const ventureProfile = sanitizeForFirestore({
    ...state.ventureProfile,
    name: clampString(state.ventureProfile.name || "FarmTrace AI", 200),
    targetCustomer: state.ventureProfile.beachheadSegment,
    problem: state.ventureProfile.problemSolved,
    geography: clampString(state.ventureProfile.geography, 500),
    offer: state.ventureProfile.productService,
    createdAt: state.ventureProfile.generatedTimestamp,
    updatedAt: nowIso,
  });

  // 2. COMPETITION & POSITIONING (preserving all Session 11 + AI Strategy Challenge fields)
  const boundedCompetitors = state.stage1.competitors.slice(0, 20);
  const boundedWarRoom = state.stage1.warRoomResults.slice(0, 20);
  const boundedLiveChallenges = state.liveChallenges.slice(0, 50);

  const competitionPositioning = sanitizeForFirestore({
    competitors: boundedCompetitors,
    positioning: state.stage1.positioning,
    positioningAxes: {
      axisXLabel: state.stage1.positioning.axisXLabel,
      axisYLabel: state.stage1.positioning.axisYLabel,
    },
    positioningScores: {
      ventureAxisXScore: state.stage1.positioning.ventureAxisXScore,
      ventureAxisYScore: state.stage1.positioning.ventureAxisYScore,
      competitorScores: boundedCompetitors.map((c) => ({
        id: c.id,
        name: c.name,
        axisXScore: c.axisXScore,
        axisYScore: c.axisYScore,
      })),
    },
    positioningStatement: state.stage1.positioning.positioningStatement,
    warRoomResults: boundedWarRoom,
    session11Challenges: state.stage1.session11Challenges,
    liveChallenges: boundedLiveChallenges,
    aiStrategyChallenge: {
      session11Challenges: state.stage1.session11Challenges,
      liveChallenges: boundedLiveChallenges,
    },
  });

  // 3. REVENUE & PRICING (preserving all inputs + exact computed outputs)
  const s2 = state.stage2;
  const effectiveVarCost = s2.variableCostNotApplicable ? 0 : s2.variableCost;
  const effectiveFixedCost = s2.fixedCostNotApplicable
    ? 0
    : s2.monthlyFixedCost;

  const unitEconomics = computeUnitEconomics({
    sellingPrice: s2.sellingPrice,
    purchasesPerCustomer: s2.purchasesPerCustomer,
    variableCost: effectiveVarCost,
    monthlyFixedCost: effectiveFixedCost,
    expectedCustomers: s2.expectedCustomers,
  });

  const scenariosWithOutputs = s2.scenarios.slice(0, 5).map((sc) => {
    const metrics = computeScenarioMetrics(
      sc,
      effectiveVarCost,
      effectiveFixedCost
    );
    return {
      ...sc,
      outputs: metrics,
    };
  });

  const conservativeScenario =
    scenariosWithOutputs.find((sc) => sc.id === "conservative") ?? null;
  const baseScenario =
    scenariosWithOutputs.find((sc) => sc.id === "base") ?? null;
  const ambitiousScenario =
    scenariosWithOutputs.find((sc) => sc.id === "ambitious") ?? null;

  const revenuePricing = sanitizeForFirestore({
    ...s2,
    selectedPrice: s2.sellingPrice,
    expectedCustomers: s2.expectedCustomers,
    purchaseFrequency: s2.purchasesPerCustomer,
    scenarios: scenariosWithOutputs,
    conservativeScenario,
    baseScenario,
    ambitiousScenario,
    outputs: {
      contributionPerUnit: unitEconomics.contributionPerUnit,
      contributionMarginPct: unitEconomics.contributionMarginPct,
      expectedMonthlyUnits: unitEconomics.expectedMonthlyUnits,
      monthlyRevenue: unitEconomics.monthlyRevenue,
      expectedMonthlyContribution: unitEconomics.expectedMonthlyContribution,
      totalVariableCost: unitEconomics.totalVariableCost,
      operatingSurplus: unitEconomics.operatingSurplus,
      breakEvenUnits: unitEconomics.breakEvenUnits,
      breakEvenCustomers: unitEconomics.breakEvenCustomers,
      isNonViableContribution: unitEconomics.isNonViableContribution,
    },
    pricingDecision: {
      pricingPosition: s2.pricingPosition,
      pricingPositionReasoning: s2.pricingPositionReasoning,
      biggestPricingAssumption: s2.biggestPricingAssumption,
    },
    assumptions: {
      biggestPricingAssumption: s2.biggestPricingAssumption || ASSUMPTION_LABEL,
      priceNeedsValidation:
        s2.priceEvidenceNotApplicable || !s2.priceEvidenceSource.trim(),
      variableCostNeedsValidation:
        !s2.variableCostNotApplicable &&
        (s2.variableCostEvidenceNotApplicable || !s2.costEvidenceSource.trim()),
      fixedCostNeedsValidation:
        !s2.fixedCostNotApplicable &&
        (s2.fixedCostEvidenceNotApplicable ||
          !s2.fixedCostEvidenceSource.trim()),
    },
    evidence: {
      priceEvidenceSource: s2.priceEvidenceSource,
      priceEvidenceNotApplicable: s2.priceEvidenceNotApplicable,
      costEvidenceSource: s2.costEvidenceSource,
      variableCostEvidenceNotApplicable: s2.variableCostEvidenceNotApplicable,
      fixedCostEvidenceSource: s2.fixedCostEvidenceSource,
      fixedCostEvidenceNotApplicable: s2.fixedCostEvidenceNotApplicable,
    },
  });

  // 4. MARKET SIZE & DEMAND (preserving all inputs + exact TAM/SAM/SOM outputs)
  const s3 = state.stage3;
  const marketMetrics = computeMarketSize(s3);

  const marketSizeDemand = sanitizeForFirestore({
    ...s3,
    outputs: {
      tamCustomerCount: s3.totalPotentialCustomers,
      tamValue: marketMetrics.tam,
      samCustomerCount: s3.serviceableCustomers,
      samValue: marketMetrics.sam,
      somCustomerCount: s3.obtainableCustomers,
      somValue: marketMetrics.som,
      somShareOfSamPct: marketMetrics.somShareOfSamPct,
      samShareOfTamPct: marketMetrics.samShareOfTamPct,
      hierarchyValid: marketMetrics.hierarchyValid,
    },
    assumptions: {
      mostUrgentAssumption: s3.mostUrgentAssumption || ASSUMPTION_LABEL,
      demandValidationPlan: s3.demandValidationPlan,
    },
    evidence: {
      totalCustomersEvidence: s3.totalCustomersEvidence,
      serviceableEvidence: s3.serviceableEvidence,
      obtainableEvidence: s3.obtainableEvidence,
      annualSpendEvidence: s3.annualSpendEvidence,
    },
  });

  // 5. GO-TO-MARKET (preserving all inputs + exact conversion & CAC outputs)
  const s4 = state.stage4;
  const boundedChannels = s4.channels.slice(0, 3).map((ch) => {
    const conversionRatePct =
      ch.expectedLeads !== null &&
      ch.expectedLeads > 0 &&
      ch.expectedCustomers !== null
        ? (ch.expectedCustomers / ch.expectedLeads) * 100
        : null;
    const cac =
      ch.budget !== null &&
      ch.expectedCustomers !== null &&
      ch.expectedCustomers > 0
        ? ch.budget / ch.expectedCustomers
        : null;
    return {
      ...ch,
      otherChannelName: ch.otherChannelName ?? "",
      outputs: {
        conversionRatePct,
        cac,
        cacStatus:
          ch.expectedCustomers === 0 ? "Not calculable" : cac !== null ? "Calculated" : "Pending",
      },
    };
  });

  const total30DayBudget = boundedChannels.reduce(
    (sum, c) => sum + (c.budget ?? 0),
    0
  );
  const totalExpectedLeads = boundedChannels.reduce(
    (sum, c) => sum + (c.expectedLeads ?? 0),
    0
  );
  const totalExpectedCustomers = boundedChannels.reduce(
    (sum, c) => sum + (c.expectedCustomers ?? 0),
    0
  );
  const blendedConversionRatePct =
    totalExpectedLeads > 0
      ? (totalExpectedCustomers / totalExpectedLeads) * 100
      : null;
  const blendedCac =
    totalExpectedCustomers > 0
      ? total30DayBudget / totalExpectedCustomers
      : null;

  const boundedExperiment = s4.experiment30Days.slice(0, 8).map((wk) => ({
    ...wk,
    isProposed: Boolean(wk.isProposed),
  }));

  const goToMarket = sanitizeForFirestore({
    ...s4,
    channels: boundedChannels,
    experiment30Days: boundedExperiment,
    outputs: {
      total30DayBudget,
      totalExpectedLeads,
      totalExpectedCustomers,
      blendedConversionRatePct,
      blendedCac,
    },
    gtmSummary: {
      whatWeKnow: s4.whatWeKnow,
      whatWeAssume: s4.whatWeAssume,
      whatWeWillTestFirst: s4.whatWeWillTestFirst,
      biggestGtmAssumption: s4.biggestGtmAssumption,
    },
  });

  const validActiveModuleId =
    typeof state.activeModuleId === "string" &&
    /^[a-z0-9-]+$/.test(state.activeModuleId)
      ? clampString(state.activeModuleId, 64)
      : undefined;

  return {
    activeStage: Math.min(5, Math.max(1, Math.trunc(state.activeStage))),
    schemaVersion: state.schemaVersion ?? VENTURE_WORKSPACE_SCHEMA_VERSION,
    ...(validActiveModuleId ? { activeModuleId: validActiveModuleId } : {}),
    ventureProfile,
    competitionPositioning,
    revenuePricing,
    marketSizeDemand,
    goToMarket,
  };
}

export function hydrateStudioStateFromFirestore(
  raw: Record<string, unknown>
): StudioState {
  const fallback = createInitialStudioState();
  const profileRaw = (raw.ventureProfile ?? {}) as Record<string, unknown>;
  const s2Raw = (raw.revenuePricing ?? {}) as Partial<Stage2RevenuePricing>;
  const s3Raw = (raw.marketSizeDemand ?? {}) as Partial<Stage3MarketSizeDemand>;
  const s4Raw = (raw.goToMarket ?? {}) as Partial<Stage4GoToMarket>;
  const compRaw = (raw.competitionPositioning ?? {}) as {
    competitors?: StudioState["stage1"]["competitors"];
    positioning?: Partial<StudioState["stage1"]["positioning"]>;
    warRoomResults?: StudioState["stage1"]["warRoomResults"];
    session11Challenges?: StudioState["stage1"]["session11Challenges"];
    liveChallenges?: StrategyChallengeRecord[];
    aiStrategyChallenge?: {
      session11Challenges?: StudioState["stage1"]["session11Challenges"];
      liveChallenges?: StrategyChallengeRecord[];
    };
  };

  const stageVal = raw.activeStage;
  const activeStage: StageId =
    stageVal === 1 ||
    stageVal === 2 ||
    stageVal === 3 ||
    stageVal === 4 ||
    stageVal === 5
      ? stageVal
      : fallback.activeStage;

  const restoredVentureProfile = { ...fallback.ventureProfile };
  for (const key of Object.keys(fallback.ventureProfile) as Array<
    keyof typeof fallback.ventureProfile
  >) {
    const val = profileRaw[key];
    if (typeof val === "string" && (key !== "name" || val.trim().length > 0)) {
      restoredVentureProfile[key] = val;
    }
  }
  if (
    typeof profileRaw.problemSolved !== "string" &&
    typeof profileRaw.problem === "string"
  ) {
    restoredVentureProfile.problemSolved = profileRaw.problem;
  }
  if (
    typeof profileRaw.beachheadSegment !== "string" &&
    typeof profileRaw.targetCustomer === "string"
  ) {
    restoredVentureProfile.beachheadSegment = profileRaw.targetCustomer;
  }
  if (
    typeof profileRaw.productService !== "string" &&
    typeof profileRaw.offer === "string"
  ) {
    restoredVentureProfile.productService = profileRaw.offer;
  }

  const restoredStage1 = {
    competitors:
      Array.isArray(compRaw.competitors) && compRaw.competitors.length > 0
        ? compRaw.competitors
        : fallback.stage1.competitors,
    positioning: compRaw.positioning
      ? {
          ...fallback.stage1.positioning,
          ...compRaw.positioning,
        }
      : fallback.stage1.positioning,
    warRoomResults:
      Array.isArray(compRaw.warRoomResults) && compRaw.warRoomResults.length > 0
        ? compRaw.warRoomResults
        : fallback.stage1.warRoomResults,
    session11Challenges:
      Array.isArray(compRaw.session11Challenges) &&
      compRaw.session11Challenges.length > 0
        ? compRaw.session11Challenges
        : Array.isArray(compRaw.aiStrategyChallenge?.session11Challenges) &&
          compRaw.aiStrategyChallenge.session11Challenges.length > 0
        ? compRaw.aiStrategyChallenge.session11Challenges
        : fallback.stage1.session11Challenges,
  };

  const restoredLiveChallenges = Array.isArray(compRaw.liveChallenges)
    ? compRaw.liveChallenges
    : Array.isArray(compRaw.aiStrategyChallenge?.liveChallenges)
    ? compRaw.aiStrategyChallenge.liveChallenges
    : [];

  const parsedScenarios =
    Array.isArray(s2Raw.scenarios) && s2Raw.scenarios.length === 3
      ? s2Raw.scenarios.map((sc, idx) => ({
          id: fallback.stage2.scenarios[idx].id,
          label: sc.label ?? fallback.stage2.scenarios[idx].label,
          customers:
            typeof sc.customers === "number" ? sc.customers : null,
          sellingPrice:
            typeof sc.sellingPrice === "number" ? sc.sellingPrice : null,
          purchasesPerCustomer:
            typeof sc.purchasesPerCustomer === "number"
              ? sc.purchasesPerCustomer
              : null,
          notes: typeof sc.notes === "string" ? sc.notes : "",
        }))
      : fallback.stage2.scenarios;

  const parsedChannels =
    Array.isArray(s4Raw.channels) && s4Raw.channels.length > 0
      ? s4Raw.channels.slice(0, 3).map((ch, idx) => ({
          id: typeof ch.id === "string" ? ch.id : `ch-${idx + 1}`,
          channelName: typeof ch.channelName === "string" ? ch.channelName : "",
          otherChannelName:
            typeof ch.otherChannelName === "string" ? ch.otherChannelName : "",
          budget: typeof ch.budget === "number" ? ch.budget : null,
          expectedLeads:
            typeof ch.expectedLeads === "number" ? ch.expectedLeads : null,
          expectedCustomers:
            typeof ch.expectedCustomers === "number"
              ? ch.expectedCustomers
              : null,
          whyFitsCustomer:
            typeof ch.whyFitsCustomer === "string" ? ch.whyFitsCustomer : "",
          evidenceReason:
            typeof ch.evidenceReason === "string" ? ch.evidenceReason : "",
        }))
      : fallback.stage4.channels;

  const parsedExperiment =
    Array.isArray(s4Raw.experiment30Days) && s4Raw.experiment30Days.length === 4
      ? s4Raw.experiment30Days.map((wk, idx) => ({
          ...fallback.stage4.experiment30Days[idx],
          id: typeof wk.id === "string" ? wk.id : fallback.stage4.experiment30Days[idx].id,
          weekLabel:
            typeof wk.weekLabel === "string"
              ? wk.weekLabel
              : fallback.stage4.experiment30Days[idx].weekLabel,
          channel: typeof wk.channel === "string" ? wk.channel : "",
          action: typeof wk.action === "string" ? wk.action : "",
          target: typeof wk.target === "string" ? wk.target : "",
          metric: typeof wk.metric === "string" ? wk.metric : "",
          responsibility:
            typeof wk.responsibility === "string" ? wk.responsibility : "",
          learningQuestion:
            typeof wk.learningQuestion === "string" ? wk.learningQuestion : "",
          status:
            wk.status === "Planned" ||
            wk.status === "In Progress" ||
            wk.status === "Validated" ||
            wk.status === "Invalidated"
              ? wk.status
              : "Planned",
          observedEvidence:
            typeof wk.observedEvidence === "string" ? wk.observedEvidence : "",
          isProposed: Boolean(wk.isProposed),
        }))
      : fallback.stage4.experiment30Days;

  const rawUpdatedAt = raw.updatedAt as
    | { toDate?: () => Date }
    | string
    | undefined;
  let resolvedLastSavedAt = new Date().toISOString();
  if (rawUpdatedAt && typeof rawUpdatedAt === "object" && typeof rawUpdatedAt.toDate === "function") {
    resolvedLastSavedAt = rawUpdatedAt.toDate().toISOString();
  } else if (typeof rawUpdatedAt === "string" && rawUpdatedAt) {
    resolvedLastSavedAt = rawUpdatedAt;
  }

  return {
    ...fallback,
    selectedVentureId:
      typeof raw.ventureId === "string"
        ? raw.ventureId
        : fallback.selectedVentureId,
    activeStage,
    ...(typeof raw.schemaVersion === "number"
      ? { schemaVersion: raw.schemaVersion }
      : {}),
    ...(typeof raw.activeModuleId === "string" &&
    /^[a-z0-9-]+$/.test(raw.activeModuleId)
      ? { activeModuleId: raw.activeModuleId }
      : {}),
    ventureProfile: restoredVentureProfile,
    stage1: restoredStage1,
    stage2: {
      currency: s2Raw.currency === "USD" ? "USD" : "INR",
      revenueModel:
        typeof s2Raw.revenueModel === "string"
          ? (s2Raw.revenueModel as Stage2RevenuePricing["revenueModel"])
          : "",
      otherRevenueModel:
        typeof s2Raw.otherRevenueModel === "string"
          ? s2Raw.otherRevenueModel
          : "",
      revenueModelDescription:
        typeof s2Raw.revenueModelDescription === "string"
          ? s2Raw.revenueModelDescription
          : "",
      sellingPrice:
        typeof s2Raw.sellingPrice === "number" ? s2Raw.sellingPrice : null,
      variableCost:
        typeof s2Raw.variableCost === "number" ? s2Raw.variableCost : null,
      variableCostNotApplicable: Boolean(s2Raw.variableCostNotApplicable),
      monthlyFixedCost:
        typeof s2Raw.monthlyFixedCost === "number"
          ? s2Raw.monthlyFixedCost
          : null,
      fixedCostNotApplicable: Boolean(s2Raw.fixedCostNotApplicable),
      expectedCustomers:
        typeof s2Raw.expectedCustomers === "number"
          ? s2Raw.expectedCustomers
          : null,
      purchasesPerCustomer:
        typeof s2Raw.purchasesPerCustomer === "number"
          ? s2Raw.purchasesPerCustomer
          : null,
      priceEvidenceSource:
        typeof s2Raw.priceEvidenceSource === "string"
          ? s2Raw.priceEvidenceSource
          : "",
      priceEvidenceNotApplicable: Boolean(s2Raw.priceEvidenceNotApplicable),
      costEvidenceSource:
        typeof s2Raw.costEvidenceSource === "string"
          ? s2Raw.costEvidenceSource
          : "",
      variableCostEvidenceNotApplicable: Boolean(
        s2Raw.variableCostEvidenceNotApplicable
      ),
      fixedCostEvidenceSource:
        typeof s2Raw.fixedCostEvidenceSource === "string"
          ? s2Raw.fixedCostEvidenceSource
          : "",
      fixedCostEvidenceNotApplicable: Boolean(
        s2Raw.fixedCostEvidenceNotApplicable
      ),
      scenarios: parsedScenarios,
      pricingPosition:
        s2Raw.pricingPosition === "Below competitors" ||
        s2Raw.pricingPosition === "Near competitors" ||
        s2Raw.pricingPosition === "Above competitors"
          ? s2Raw.pricingPosition
          : "",
      pricingPositionReasoning:
        typeof s2Raw.pricingPositionReasoning === "string"
          ? s2Raw.pricingPositionReasoning
          : "",
      biggestPricingAssumption:
        typeof s2Raw.biggestPricingAssumption === "string"
          ? s2Raw.biggestPricingAssumption
          : "",
      completed: Boolean(s2Raw.completed),
      completedAt:
        typeof s2Raw.completedAt === "string" ? s2Raw.completedAt : null,
    },
    stage3: {
      targetCustomer:
        typeof s3Raw.targetCustomer === "string"
          ? s3Raw.targetCustomer
          : fallback.stage3.targetCustomer,
      geography:
        typeof s3Raw.geography === "string"
          ? s3Raw.geography
          : fallback.stage3.geography,
      coreOffer:
        typeof s3Raw.coreOffer === "string"
          ? s3Raw.coreOffer
          : fallback.stage3.coreOffer,
      totalPotentialCustomers:
        typeof s3Raw.totalPotentialCustomers === "number"
          ? s3Raw.totalPotentialCustomers
          : null,
      totalCustomersEvidence:
        typeof s3Raw.totalCustomersEvidence === "string"
          ? s3Raw.totalCustomersEvidence
          : "",
      serviceableCustomers:
        typeof s3Raw.serviceableCustomers === "number"
          ? s3Raw.serviceableCustomers
          : null,
      serviceableEvidence:
        typeof s3Raw.serviceableEvidence === "string"
          ? s3Raw.serviceableEvidence
          : "",
      obtainableCustomers:
        typeof s3Raw.obtainableCustomers === "number"
          ? s3Raw.obtainableCustomers
          : null,
      obtainableEvidence:
        typeof s3Raw.obtainableEvidence === "string"
          ? s3Raw.obtainableEvidence
          : "",
      annualSpendPerCustomer:
        typeof s3Raw.annualSpendPerCustomer === "number"
          ? s3Raw.annualSpendPerCustomer
          : null,
      annualSpendEvidence:
        typeof s3Raw.annualSpendEvidence === "string"
          ? s3Raw.annualSpendEvidence
          : "",
      whyCustomersBuy:
        typeof s3Raw.whyCustomersBuy === "string" ? s3Raw.whyCustomersBuy : "",
      expectedPurchaseFrequency:
        typeof s3Raw.expectedPurchaseFrequency === "string"
          ? s3Raw.expectedPurchaseFrequency
          : "",
      mostUrgentAssumption:
        typeof s3Raw.mostUrgentAssumption === "string"
          ? s3Raw.mostUrgentAssumption
          : "",
      demandValidationPlan:
        typeof s3Raw.demandValidationPlan === "string"
          ? s3Raw.demandValidationPlan
          : "",
      completed: Boolean(s3Raw.completed),
      completedAt:
        typeof s3Raw.completedAt === "string" ? s3Raw.completedAt : null,
    },
    stage4: {
      firstCustomerSegment:
        typeof s4Raw.firstCustomerSegment === "string"
          ? s4Raw.firstCustomerSegment
          : fallback.stage4.firstCustomerSegment,
      reachLocations:
        typeof s4Raw.reachLocations === "string" ? s4Raw.reachLocations : "",
      mainProblemNeed:
        typeof s4Raw.mainProblemNeed === "string"
          ? s4Raw.mainProblemNeed
          : fallback.stage4.mainProblemNeed,
      coreMessage:
        typeof s4Raw.coreMessage === "string" ? s4Raw.coreMessage : "",
      callToAction:
        typeof s4Raw.callToAction === "string" ? s4Raw.callToAction : "",
      channels: parsedChannels,
      experiment30Days: parsedExperiment,
      biggestGtmAssumption:
        typeof s4Raw.biggestGtmAssumption === "string"
          ? s4Raw.biggestGtmAssumption
          : "",
      whatWeKnow: typeof s4Raw.whatWeKnow === "string" ? s4Raw.whatWeKnow : "",
      whatWeAssume:
        typeof s4Raw.whatWeAssume === "string" ? s4Raw.whatWeAssume : "",
      whatWeWillTestFirst:
        typeof s4Raw.whatWeWillTestFirst === "string"
          ? s4Raw.whatWeWillTestFirst
          : "",
      completed: Boolean(s4Raw.completed),
      completedAt:
        typeof s4Raw.completedAt === "string" ? s4Raw.completedAt : null,
    },
    liveChallenges: restoredLiveChallenges,
    lastSavedAt: resolvedLastSavedAt,
  };
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const v = record[key];
      if (v !== undefined) {
        sorted[key] = stableNormalize(v);
      }
    }
    return sorted;
  }
  return value;
}

function stripVolatileFields(state: StudioState) {
  return {
    selectedVentureId: state.selectedVentureId,
    activeStage: state.activeStage,
    ventureProfile: state.ventureProfile,
    stage1: state.stage1,
    stage2: state.stage2,
    stage3: state.stage3,
    stage4: state.stage4,
    liveChallenges: state.liveChallenges,
  };
}

export function areStudioStatesContentEqual(
  a: StudioState,
  b: StudioState
): boolean {
  return (
    JSON.stringify(stableNormalize(stripVolatileFields(a))) ===
    JSON.stringify(stableNormalize(stripVolatileFields(b)))
  );
}

export async function fetchExistingCloudVenture(
  userId: string,
  preferredVentureId = "farmtrace-ai"
): Promise<StudioState | null> {
  const venturesColPath = `users/${userId}/ventures`;
  const venturesQuery = query(
    collection(db, "users", userId, "ventures"),
    where("userId", "==", userId)
  );

  // Fetch directly from Firestore server so signing in on any browser/computer restores the latest saved venture
  let querySnap;
  try {
    querySnap = await getDocsFromServer(venturesQuery);
  } catch (serverErr) {
    const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
    if (
      msg.toLowerCase().includes("offline") ||
      msg.toLowerCase().includes("unavailable")
    ) {
      try {
        querySnap = await getDocs(venturesQuery);
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.LIST, venturesColPath);
      }
    } else {
      handleFirestoreError(serverErr, OperationType.LIST, venturesColPath);
    }
  }

  if (querySnap && !querySnap.empty) {
    const preferredDoc =
      querySnap.docs.find((d) => d.id === preferredVentureId) ??
      querySnap.docs[0];
    return hydrateStudioStateFromFirestore(
      preferredDoc.data() as Record<string, unknown>
    );
  }

  // Fallback direct document check (server-first)
  const docPath = `users/${userId}/ventures/${preferredVentureId}`;
  const ventureRef = doc(db, "users", userId, "ventures", preferredVentureId);
  let snap;
  try {
    snap = await getDocFromServer(ventureRef);
  } catch (serverErr) {
    const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
    if (
      msg.toLowerCase().includes("offline") ||
      msg.toLowerCase().includes("unavailable")
    ) {
      try {
        snap = await getDoc(ventureRef);
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.GET, docPath);
      }
    } else {
      handleFirestoreError(serverErr, OperationType.GET, docPath);
    }
  }

  if (snap && snap.exists()) {
    return hydrateStudioStateFromFirestore(snap.data() as Record<string, unknown>);
  }

  return null;
}

export async function createVentureInFirestore(
  userId: string,
  initialState: StudioState
): Promise<StudioState> {
  const ventureId = initialState.selectedVentureId || "farmtrace-ai";
  const docPath = `users/${userId}/ventures/${ventureId}`;
  const ventureRef = doc(db, "users", userId, "ventures", ventureId);
  const nowIso = new Date().toISOString();
  const sections = buildVentureSections(initialState, nowIso);

  try {
    await setDoc(ventureRef, {
      userId,
      ventureId,
      ...sections,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  return {
    ...initialState,
    selectedVentureId: ventureId,
    lastSavedAt: nowIso,
  };
}

export async function saveVentureWorkspace(
  userId: string,
  state: StudioState
): Promise<string> {
  const ventureId = state.selectedVentureId || "farmtrace-ai";
  const path = `users/${userId}/ventures/${ventureId}`;
  const ventureRef = doc(db, "users", userId, "ventures", ventureId);
  const nowIso = new Date().toISOString();
  const sections = buildVentureSections(state, nowIso);

  try {
    await updateDoc(ventureRef, {
      ...sections,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return nowIso;
}

export function subscribeToVenture(
  userId: string,
  ventureId: string,
  onData: (
    state: StudioState,
    hasPendingWrites: boolean,
    fromCache: boolean
  ) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/ventures/${ventureId}`;
  const ventureRef = doc(db, "users", userId, "ventures", ventureId);

  return onSnapshot(
    ventureRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const hydrated = hydrateStudioStateFromFirestore(
        snapshot.data() as Record<string, unknown>
      );
      onData(
        hydrated,
        snapshot.metadata.hasPendingWrites,
        snapshot.metadata.fromCache
      );
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        } else {
          throw err;
        }
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Extendable Venture Modules Subcollection Helpers
// Path: /users/{userId}/ventures/{ventureId}/modules/{moduleId}
// Path: /users/{userId}/ventures/{ventureId}/modules/{moduleId}/entries/{entryId}
// ---------------------------------------------------------------------------

function resolveIsoTimestamp(val: unknown): string | null {
  if (typeof val === "string") return val;
  if (
    val &&
    typeof val === "object" &&
    "toDate" in val &&
    typeof (val as { toDate: () => Date }).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export function hydrateVentureModuleFromFirestore<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
  TOutputs extends Record<string, unknown> = Record<string, unknown>,
>(
  raw: Record<string, unknown>,
  fallbackIds: { userId: string; ventureId: string; moduleId: FutureModuleId }
): VentureModuleDocument<TInputs, TOutputs> {
  const moduleId =
    typeof raw.moduleId === "string" && raw.moduleId.trim()
      ? (raw.moduleId as FutureModuleId)
      : fallbackIds.moduleId;
  const def = getVentureModuleDefinition(moduleId);

  const trackVal = raw.track;
  const track: VentureModuleTrack =
    trackVal === "strategy" ||
    trackVal === "product-mvp" ||
    trackVal === "finance-ops" ||
    trackVal === "legal-risk" ||
    trackVal === "custom"
      ? trackVal
      : def.track;

  const statusVal = raw.status;
  const status: VentureModuleStatus =
    statusVal === "not_started" ||
    statusVal === "in_progress" ||
    statusVal === "completed"
      ? statusVal
      : "not_started";

  return {
    userId:
      typeof raw.userId === "string" ? raw.userId : fallbackIds.userId,
    ventureId:
      typeof raw.ventureId === "string"
        ? raw.ventureId
        : fallbackIds.ventureId,
    moduleId,
    track,
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title
        : def.title,
    schemaVersion:
      typeof raw.schemaVersion === "number"
        ? raw.schemaVersion
        : def.schemaVersion,
    status,
    inputs: ((raw.inputs && typeof raw.inputs === "object"
      ? raw.inputs
      : {}) as TInputs),
    outputs: ((raw.outputs && typeof raw.outputs === "object"
      ? raw.outputs
      : {}) as TOutputs),
    assumptions:
      raw.assumptions && typeof raw.assumptions === "object"
        ? (raw.assumptions as Record<string, unknown>)
        : {},
    evidence:
      raw.evidence && typeof raw.evidence === "object"
        ? (raw.evidence as Record<string, unknown>)
        : {},
    aiChallenges: Array.isArray(raw.aiChallenges)
      ? (raw.aiChallenges as StrategyChallengeRecord[]).slice(0, 50)
      : [],
    completedAt:
      typeof raw.completedAt === "string" ? raw.completedAt : null,
    createdAt: resolveIsoTimestamp(raw.createdAt),
    updatedAt: resolveIsoTimestamp(raw.updatedAt),
  };
}

export async function loadVentureModule<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
  TOutputs extends Record<string, unknown> = Record<string, unknown>,
>(
  userId: string,
  ventureId: string,
  moduleId: FutureModuleId
): Promise<VentureModuleDocument<TInputs, TOutputs> | null> {
  const path = `users/${userId}/ventures/${ventureId}/modules/${moduleId}`;
  const moduleRef = doc(
    db,
    "users",
    userId,
    "ventures",
    ventureId,
    "modules",
    moduleId
  );

  let snap;
  try {
    snap = await getDocFromServer(moduleRef);
  } catch (serverErr) {
    const msg =
      serverErr instanceof Error ? serverErr.message : String(serverErr);
    if (
      msg.toLowerCase().includes("offline") ||
      msg.toLowerCase().includes("unavailable")
    ) {
      try {
        snap = await getDoc(moduleRef);
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.GET, path);
      }
    } else {
      handleFirestoreError(serverErr, OperationType.GET, path);
    }
  }

  if (!snap || !snap.exists()) {
    return null;
  }

  return hydrateVentureModuleFromFirestore<TInputs, TOutputs>(
    snap.data() as Record<string, unknown>,
    { userId, ventureId, moduleId }
  );
}

export async function listVentureModules(
  userId: string,
  ventureId: string
): Promise<VentureModuleDocument[]> {
  const colPath = `users/${userId}/ventures/${ventureId}/modules`;
  const modulesQuery = query(
    collection(db, "users", userId, "ventures", ventureId, "modules"),
    where("userId", "==", userId),
    where("ventureId", "==", ventureId)
  );

  let querySnap;
  try {
    querySnap = await getDocsFromServer(modulesQuery);
  } catch (serverErr) {
    const msg =
      serverErr instanceof Error ? serverErr.message : String(serverErr);
    if (
      msg.toLowerCase().includes("offline") ||
      msg.toLowerCase().includes("unavailable")
    ) {
      try {
        querySnap = await getDocs(modulesQuery);
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.LIST, colPath);
      }
    } else {
      handleFirestoreError(serverErr, OperationType.LIST, colPath);
    }
  }

  if (!querySnap || querySnap.empty) return [];

  return querySnap.docs.map((d) =>
    hydrateVentureModuleFromFirestore(d.data() as Record<string, unknown>, {
      userId,
      ventureId,
      moduleId: d.id as FutureModuleId,
    })
  );
}

export async function saveVentureModule<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
  TOutputs extends Record<string, unknown> = Record<string, unknown>,
>(
  userId: string,
  ventureId: string,
  moduleDoc: VentureModuleDocument<TInputs, TOutputs>
): Promise<string> {
  const moduleId = moduleDoc.moduleId;
  const path = `users/${userId}/ventures/${ventureId}/modules/${moduleId}`;
  const moduleRef = doc(
    db,
    "users",
    userId,
    "ventures",
    ventureId,
    "modules",
    moduleId
  );
  const def = getVentureModuleDefinition(moduleId);
  const nowIso = new Date().toISOString();

  const mutableFields = sanitizeForFirestore({
    track: moduleDoc.track ?? def.track,
    title: clampString(moduleDoc.title || def.title, 160),
    schemaVersion: Math.max(1, Math.min(100, Math.trunc(moduleDoc.schemaVersion || def.schemaVersion))),
    status: moduleDoc.status,
    inputs: moduleDoc.inputs ?? {},
    outputs: moduleDoc.outputs ?? {},
    assumptions: moduleDoc.assumptions ?? {},
    evidence: moduleDoc.evidence ?? {},
    aiChallenges: (moduleDoc.aiChallenges ?? []).slice(0, 50),
    completedAt:
      moduleDoc.completedAt !== undefined
        ? moduleDoc.completedAt
          ? clampString(moduleDoc.completedAt, 64)
          : null
        : null,
  });

  let existingSnap;
  try {
    existingSnap = await getDoc(moduleRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap || !existingSnap.exists()) {
    try {
      await setDoc(moduleRef, {
        userId,
        ventureId,
        moduleId,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(moduleRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  return nowIso;
}

export function subscribeToVentureModules(
  userId: string,
  ventureId: string,
  onData: (modules: VentureModuleDocument[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colPath = `users/${userId}/ventures/${ventureId}/modules`;
  const modulesQuery = query(
    collection(db, "users", userId, "ventures", ventureId, "modules"),
    where("userId", "==", userId),
    where("ventureId", "==", ventureId)
  );

  return onSnapshot(
    modulesQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        hydrateVentureModuleFromFirestore(d.data() as Record<string, unknown>, {
          userId,
          ventureId,
          moduleId: d.id as FutureModuleId,
        })
      );
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (err) {
        if (onError) {
          onError(err instanceof Error ? err : new Error(String(err)));
        } else {
          throw err;
        }
      }
    }
  );
}

export async function listVentureModuleEntries<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(
  userId: string,
  ventureId: string,
  moduleId: FutureModuleId
): Promise<VentureModuleEntryDocument<TPayload>[]> {
  const colPath = `users/${userId}/ventures/${ventureId}/modules/${moduleId}/entries`;
  const entriesQuery = query(
    collection(
      db,
      "users",
      userId,
      "ventures",
      ventureId,
      "modules",
      moduleId,
      "entries"
    ),
    where("userId", "==", userId),
    where("ventureId", "==", ventureId),
    where("moduleId", "==", moduleId)
  );

  let querySnap;
  try {
    querySnap = await getDocsFromServer(entriesQuery);
  } catch (serverErr) {
    const msg =
      serverErr instanceof Error ? serverErr.message : String(serverErr);
    if (
      msg.toLowerCase().includes("offline") ||
      msg.toLowerCase().includes("unavailable")
    ) {
      try {
        querySnap = await getDocs(entriesQuery);
      } catch (cacheErr) {
        handleFirestoreError(cacheErr, OperationType.LIST, colPath);
      }
    } else {
      handleFirestoreError(serverErr, OperationType.LIST, colPath);
    }
  }

  if (!querySnap || querySnap.empty) return [];

  return querySnap.docs.map((d) => {
    const raw = d.data() as Record<string, unknown>;
    return {
      userId: typeof raw.userId === "string" ? raw.userId : userId,
      ventureId: typeof raw.ventureId === "string" ? raw.ventureId : ventureId,
      moduleId:
        typeof raw.moduleId === "string"
          ? (raw.moduleId as FutureModuleId)
          : moduleId,
      entryId: typeof raw.entryId === "string" ? raw.entryId : d.id,
      entryType:
        typeof raw.entryType === "string" ? raw.entryType : "item",
      ...(typeof raw.orderIndex === "number"
        ? { orderIndex: raw.orderIndex }
        : {}),
      payload: ((raw.payload && typeof raw.payload === "object"
        ? raw.payload
        : {}) as TPayload),
      createdAt: resolveIsoTimestamp(raw.createdAt),
      updatedAt: resolveIsoTimestamp(raw.updatedAt),
    };
  });
}

export async function saveVentureModuleEntry<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(
  userId: string,
  ventureId: string,
  moduleId: FutureModuleId,
  entry: VentureModuleEntryDocument<TPayload>
): Promise<string> {
  const entryId = entry.entryId;
  const path = `users/${userId}/ventures/${ventureId}/modules/${moduleId}/entries/${entryId}`;
  const entryRef = doc(
    db,
    "users",
    userId,
    "ventures",
    ventureId,
    "modules",
    moduleId,
    "entries",
    entryId
  );
  const nowIso = new Date().toISOString();

  const mutableFields = sanitizeForFirestore({
    entryType: clampString(entry.entryType || "item", 64),
    ...(typeof entry.orderIndex === "number"
      ? {
          orderIndex: Math.max(
            0,
            Math.min(10000, Math.trunc(entry.orderIndex))
          ),
        }
      : {}),
    payload: entry.payload ?? {},
  });

  let existingSnap;
  try {
    existingSnap = await getDoc(entryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap || !existingSnap.exists()) {
    try {
      await setDoc(entryRef, {
        userId,
        ventureId,
        moduleId,
        entryId,
        ...mutableFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(entryRef, {
        ...mutableFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  return nowIso;
}


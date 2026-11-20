export type StageId = 1 | 2 | 3 | 4 | 5;

export interface VentureProfile {
  name: string;
  studentName: string;
  studentEmail: string;
  institution: string;
  generatedTimestamp: string;
  initialCustomer: string;
  whyChosen: string;
  ventureIdea: string;
  geography: string;
  problemSolved: string;
  primaryFrictionId: string;
  primaryFriction: string;
  frictionWhoExperiences: string;
  frictionWhenOccurs: string;
  frictionCurrentWorkaround: string;
  frictionWhyUnsatisfactory: string;
  frictionEvidenceSource: string;
  frictionEvidenceStrength: string;
  confidenceEvidenceNeeded: string;
  emotionalJob: string;
  functionalJob: string;
  socialJob: string;
  primaryJtbdOutcome: string;
  primaryJtbdAction: string;
  primaryJtbdSituation: string;
  beachheadSegment: string;
  specificSegment: string;
  broadCustomerGroup: string;
  demographicsRole: string;
  buyingBehaviour: string;
  willingnessToPayClaim: string;
  willingnessToPayEvidenceNote: string;
  cvpStatement: string;
  desiredGain: string;
  mainBenefit: string;
  whyChooseOverDoingNothing: string;
  reasonToBelieve: string;
  productService: string;
  referencePdfPath: string;
}

export interface CompetitorItem {
  id: string;
  name: string;
  type: "Direct Competitor" | "Indirect Competitor";
  mainOffer: string;
  priceCost: string;
  priceEvidenceNote: string;
  mainStrength: string;
  mainWeakness: string;
  axisXScore: number;
  axisYScore: number;
  evidenceSource: string;
  evidenceStrength: "Strong" | "Moderate" | "Weak";
}

export interface PositioningData {
  axisXLabel: string;
  axisYLabel: string;
  ventureAxisXScore: number;
  ventureAxisYScore: number;
  desiredAssociatedPosition: string;
  targetCustomer: string;
  mainAlternative: string;
  mainDifferentiation: string;
  reasonToBelieve: string;
  category: string;
  positioningStatement: string;
  primaryBenefit: string;
  reasonHasEvidence: boolean;
}

export interface WarRoomResult {
  id: string;
  competitorOrThreat: string;
  attackVector: string;
  ventureDefense: string;
  evidenceBasis: string;
  validationStatus: "Backed by Session 11 Evidence" | "Assumption — needs validation";
}

export interface StrategyChallengeRecord {
  id: string;
  stage: StageId;
  createdAt: string;
  headline: string;
  criticalQuestions: string[];
  assumptionFlags: Array<{
    claim: string;
    status: string;
    validationTest: string;
  }>;
  warRoomCounterMove: string;
  readinessAssessment: string;
  source: "Session 11" | "Live AI Strategy Challenge";
}

export interface Stage1Data {
  competitors: CompetitorItem[];
  positioning: PositioningData;
  warRoomResults: WarRoomResult[];
  session11Challenges: StrategyChallengeRecord[];
}

export type RevenueModelOption =
  | ""
  | "Subscription"
  | "Per Transaction / Per Order"
  | "Commission"
  | "Rental / Usage Fee"
  | "Freemium + Paid Upgrade"
  | "Advertising / Sponsorship"
  | "Other";

export type PricingPositionOption =
  | ""
  | "Below competitors"
  | "Near competitors"
  | "Above competitors";

export interface PricingScenario {
  id: "conservative" | "base" | "ambitious";
  label: string;
  customers: number | null;
  sellingPrice: number | null;
  purchasesPerCustomer: number | null;
  notes: string;
}

export interface Stage2RevenuePricing {
  currency: "INR" | "USD";
  // Step 1
  revenueModel: RevenueModelOption;
  otherRevenueModel: string;
  revenueModelDescription: string;
  // Step 2
  sellingPrice: number | null;
  variableCost: number | null;
  variableCostNotApplicable: boolean;
  monthlyFixedCost: number | null;
  fixedCostNotApplicable: boolean;
  expectedCustomers: number | null;
  purchasesPerCustomer: number | null;
  priceEvidenceSource: string;
  priceEvidenceNotApplicable: boolean;
  costEvidenceSource: string;
  variableCostEvidenceNotApplicable: boolean;
  fixedCostEvidenceSource: string;
  fixedCostEvidenceNotApplicable: boolean;
  // Step 4
  scenarios: PricingScenario[];
  // Step 5
  pricingPosition: PricingPositionOption;
  pricingPositionReasoning: string;
  biggestPricingAssumption: string;
  // Gate
  completed: boolean;
  completedAt: string | null;
}

export interface Stage3MarketSizeDemand {
  // Step 1 — Define the Market (pre-filled from Venture Profile, editable)
  targetCustomer: string;
  geography: string;
  coreOffer: string;
  // Step 2 — Market-Size Assumptions
  totalPotentialCustomers: number | null;
  totalCustomersEvidence: string;
  serviceableCustomers: number | null;
  serviceableEvidence: string;
  obtainableCustomers: number | null;
  obtainableEvidence: string;
  annualSpendPerCustomer: number | null;
  annualSpendEvidence: string;
  // Step 4 — Demand Check
  whyCustomersBuy: string;
  expectedPurchaseFrequency: string;
  mostUrgentAssumption: string;
  demandValidationPlan: string;
  // Gate
  completed: boolean;
  completedAt: string | null;
}

export type GtmChannelOption =
  | ""
  | "Campus activation"
  | "WhatsApp communities"
  | "Instagram / social media"
  | "Google Search"
  | "Referral"
  | "Partnerships"
  | "Direct selling"
  | "Events"
  | "Local influencers"
  | "Email"
  | "Other";

export interface GtmChannel {
  id: string;
  channelName: string;
  otherChannelName?: string;
  budget: number | null;
  expectedLeads: number | null;
  expectedCustomers: number | null;
  whyFitsCustomer: string;
  evidenceReason: string;
}

export interface ExperimentWeek {
  id: string;
  weekLabel: string;
  channel: string;
  action: string;
  target: string;
  metric: string;
  responsibility: string;
  learningQuestion: string;
  status: "Planned" | "In Progress" | "Validated" | "Invalidated";
  observedEvidence: string;
  isProposed?: boolean;
}

export interface Stage4GoToMarket {
  // Step 1
  firstCustomerSegment: string;
  reachLocations: string;
  mainProblemNeed: string;
  coreMessage: string;
  callToAction: string;
  // Step 2
  channels: GtmChannel[];
  // Step 4
  experiment30Days: ExperimentWeek[];
  // Step 5 Synthesis
  biggestGtmAssumption: string;
  whatWeKnow: string;
  whatWeAssume: string;
  whatWeWillTestFirst: string;
  // Gate
  completed: boolean;
  completedAt: string | null;
}

export type VentureModuleTrack =
  | "strategy"
  | "product-mvp"
  | "finance-ops"
  | "legal-risk"
  | "custom";

export type VentureModuleStatus = "not_started" | "in_progress" | "completed";

export type KnownFutureModuleId =
  | "mvp-brief"
  | "feature-prioritization"
  | "no-code-tool-selection"
  | "ux-customer-journey"
  | "ai-feature-design"
  | "api-data-flow"
  | "prototype-build"
  | "usability-testing"
  | "mvp-evidence-review"
  | "projected-financial-statements"
  | "operating-model"
  | "hr-founder-organisation"
  | "cac-ltv-burn-runway"
  | "legal-structure"
  | "labour-ip-data-risk"
  | "government-policy-risk";

export type FutureModuleId = KnownFutureModuleId | (string & {});

export interface VentureModuleDefinition {
  moduleId: FutureModuleId;
  title: string;
  track: VentureModuleTrack;
  sequenceOrder: number;
  schemaVersion: number;
  dependsOnCoreSections: Array<
    | "ventureProfile"
    | "competitionPositioning"
    | "revenuePricing"
    | "marketSizeDemand"
    | "goToMarket"
  >;
  dependsOnModules: FutureModuleId[];
}

export interface VentureModuleDocument<
  TInputs extends Record<string, unknown> = Record<string, unknown>,
  TOutputs extends Record<string, unknown> = Record<string, unknown>,
> {
  userId: string;
  ventureId: string;
  moduleId: FutureModuleId;
  track: VentureModuleTrack;
  title: string;
  schemaVersion: number;
  status: VentureModuleStatus;
  inputs: TInputs;
  outputs: TOutputs;
  assumptions: Record<string, unknown>;
  evidence: Record<string, unknown>;
  aiChallenges: StrategyChallengeRecord[];
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface VentureModuleEntryDocument<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  userId: string;
  ventureId: string;
  moduleId: FutureModuleId;
  entryId: string;
  entryType: string;
  orderIndex?: number;
  payload: TPayload;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface StudioState {
  selectedVentureId: string;
  activeStage: StageId;
  schemaVersion?: number;
  activeModuleId?: FutureModuleId;
  ventureProfile: VentureProfile;
  stage1: Stage1Data;
  stage2: Stage2RevenuePricing;
  stage3: Stage3MarketSizeDemand;
  stage4: Stage4GoToMarket;
  liveChallenges: StrategyChallengeRecord[];
  lastSavedAt: string;
}


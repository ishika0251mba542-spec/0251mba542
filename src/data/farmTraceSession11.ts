import type {
  Stage1Data,
  Stage2RevenuePricing,
  Stage3MarketSizeDemand,
  Stage4GoToMarket,
  StudioState,
  VentureProfile,
} from "../types/venture";

export const ASSUMPTION_LABEL = "Assumption — needs validation";

export const FARMTRACE_VENTURE_PROFILE: VentureProfile = {
  name: "FarmTrace AI",
  studentName: "DGU Student",
  studentEmail: "ishika.0251mba542@dgu.ac.in",
  institution: "Entrepreneurship & Innovation • DBS Global University",
  generatedTimestamp: "01/10/2026, 19:45:10",
  initialCustomer:
    "Small-scale organic farmers, local agricultural cooperatives, and independent specialty grocery stores.",
  whyChosen:
    "It connects the growing consumer demand for food transparency with accessible technology. It directly helps independent farmers increase their profits while promoting environmentally honest food supply chains.",
  ventureIdea:
    "A mobile app using AI and blockchain that lets small farmers instantly certify and track the organic origin of their produce, allowing urban consumers to scan a QR code to view its eco friendly journey.",
  geography: "Major metropolitan areas and their surrounding regional agricultural zones.",
  problemSolved:
    "Small organic farmers cannot easily prove their sustainable practices to charge premium prices. At the same time, eco-conscious city consumers struggle to find trustworthy, transparent food labelling free from corporate greenwashing.",
  primaryFrictionId: "f-1",
  primaryFriction:
    "Difficulty proving organic authenticity and sustainable practices to skeptical buyers without expensive corporate certifications.",
  frictionWhoExperiences:
    "Boutique, independent organic farmers and small agricultural cooperative managers.",
  frictionWhenOccurs:
    "During direct-to-consumer sales at premium farmers' markets and when pitching produce to specialty grocery store buyers.",
  frictionCurrentWorkaround:
    "Relying on verbal promises, displaying basic paper certificates or manually posting behind-the-scenes farming pictures on social media.",
  frictionWhyUnsatisfactory:
    "Verbal claims and social media photos lack cryptographic proof, are easily faked, and fail to satisfy strictly eco-conscious or premium buyers.",
  frictionEvidenceSource:
    "Customer discovery surveys indicating that many urban organic buyers do not completely trust unverified green labels or word-of-mouth claims.",
  frictionEvidenceStrength: "Moderate",
  confidenceEvidenceNeeded:
    "Verifiable digital ledger records and automated environmental sensor data logs that cannot be altered or falsified.",
  emotionalJob:
    "To feel proud, confident and deeply validated as a genuinely sustainable producer who is actively helping the planet.",
  functionalJob:
    "To instantly verify, trace and share the organic timeline and carbon footprint data of harvested crop batches with buyers.",
  socialJob:
    "To be recognized by the community and industry peers as an honest, premium and tech-forward agricultural leader.",
  primaryJtbdOutcome:
    "Justify premium market prices, bypass untrusted conventional labeling systems, and secure long-term buyer loyalty.",
  primaryJtbdAction:
    "Provide undeniable, transparent, and easy-to-verify digital proof of my eco-friendly and ethical farming processes.",
  primaryJtbdSituation:
    "Bring my fresh, sustainably grown organic harvest to premium markets or pitch to boutique grocery buyers.",
  beachheadSegment:
    "Boutique organic berry and heirloom vegetable growers operating within a 50-mile radius of the main target city who sell direct-to-consumers.",
  specificSegment:
    "Small-to-medium independent organic fruit, vegetable and specialty crop farmers.",
  broadCustomerGroup: "Commercial farmers and agricultural business owners worldwide.",
  demographicsRole: "Ages 28-55; tech friendly farm owners, managers and cooperative heads.",
  buyingBehaviour:
    "Uses mobile business apps frequently, updates farm social media accounts and actively seeks ways to stand out from industrial competitors.",
  willingnessToPayClaim:
    "Highly willing to pay a low monthly SaaS subscription because it yields an immediate 15% to 30% price premium on their harvests.",
  willingnessToPayEvidenceNote:
    "Assumption — needs validation (15%–30% harvest price premium & live subscription conversion not yet verified via A/B pricing test).",
  cvpStatement:
    "For boutique organic farmers who struggle to prove their sustainable practices, FarmTrace AI is a mobile tracking app that delivers instant, unalterable digital origin verification so they can confidently justify premium pricing and earn consumer trust.",
  desiredGain:
    "To effortlessly showcase high-trust, tamper-proof crop origin proof that instantly justifies premium pricing and builds buyer loyalty.",
  mainBenefit:
    "Enables small-scale farmers to boost profit margins by commandingly validating their organic premium without slow, costly corporate paperwork.",
  whyChooseOverDoingNothing:
    "Doing nothing keeps farmers trapped in low-margin price competition with corporate industrial farms. FarmTrace AI immediately unlocks the true market value of their sustainable farming practices.",
  reasonToBelieve:
    "Tamper-proof blockchain data ledger combined with instant mobile QR scanning that brings field-to-fork tracking directly onto the consumer's phone screen.",
  productService:
    "An AI and blockchain-powered mobile app that generates scannable smart QR codes containing certified supply chain and origin data for produce packaging.",
  referencePdfPath: "/assets/aistudio/ishika.0251mba542_dgu.ac.in_baa85100.pdf",
};

export const FARMTRACE_STAGE1_DATA: Stage1Data = {
  competitors: [
    {
      id: "comp-agriwebb",
      name: "AgriWebb",
      type: "Direct Competitor",
      mainOffer:
        "Complex back-office software focusing on intensive cattle management, enterprise livestock mapping and commercial farm logistics.",
      priceCost: "Expensive corporate tiered plans",
      priceEvidenceNote:
        "Exact numeric tier prices not cited in research sheets — Assumption — needs validation.",
      mainStrength:
        "Deep operational functionality, robust regulatory record keeping and widespread corporate market adoption.",
      mainWeakness:
        "Extremely complex desktop setup, prohibitively high price for small growers, and lacks any customer-facing trust tools like QR codes.",
      axisXScore: 8,
      axisYScore: 2,
      evidenceSource:
        "Competitor pricing sheets online and feedback from small farmers stating enterprise tools are too complicated and expensive.",
      evidenceStrength: "Strong",
    },
    {
      id: "comp-cert-boards",
      name: "Traditional Third-Party Organic Certification Boards (e.g. USDA Organic / local agencies)",
      type: "Indirect Competitor",
      mainOffer:
        "An official, government-backed legal organic seal printed on standard product labels.",
      priceCost: "High upfront costs",
      priceEvidenceNote:
        "Exact certification fee breakdown per micro-farm not documented — Assumption — needs validation.",
      mainStrength:
        "Massive, nationwide customer recognition and complete legal compliance status.",
      mainWeakness:
        "Extremely slow multi-month processing times, static paper tracking and massive bureaucratic friction for micro-farms.",
      axisXScore: 3,
      axisYScore: 9,
      evidenceSource:
        "Official government agricultural certification handbooks and agricultural cooperative forums.",
      evidenceStrength: "Strong",
    },
    {
      id: "comp-manual-social",
      name: "Manual Social Media & Word-of-mouth Storytelling",
      type: "Indirect Competitor",
      mainOffer:
        "Farmers posting informal photos of fields on Instagram/Facebook and chatting directly with shoppers at market stalls.",
      priceCost: "Free",
      priceEvidenceNote: "Verified zero software subscription cost.",
      mainStrength:
        "Completely free, accessible and creates a highly personal, emotional connection with local customers.",
      mainWeakness:
        "Lacks cryptographic or certified digital proof, making it easily faked and unable to satisfy strictly skeptical premium buyers.",
      axisXScore: 1,
      axisYScore: 5,
      evidenceSource:
        "Consumer trust surveys and direct observations of small-scale farmers at regional weekend markets.",
      evidenceStrength: "Strong",
    },
  ],
  positioning: {
    axisXLabel: "Back-office Software Complexity",
    axisYLabel: "Customer-facing Origin Transparency",
    ventureAxisXScore: 3,
    ventureAxisYScore: 10,
    desiredAssociatedPosition:
      "High consumer trust with low technological and financial complexity for independent producers.",
    targetCustomer:
      "Independent small-to-medium organic fruit and vegetable farmers selling direct-to-consumer.",
    mainAlternative:
      "Expensive corporate third-party certifications or manual, unverified social media updates.",
    mainDifferentiation:
      "Delivers instant, low-cost cryptographic origin proof straight to consumers via scannable packaging QR codes.",
    reasonToBelieve:
      "Tamper-proof blockchain data tracking coupled with real-time mobile scanning that verifies farm-to-table history instantly.",
    category: "AI and blockchain-powered mobile provenance and tracking application.",
    positioningStatement:
      "For boutique organic farmers, FarmTrace AI is a mobile tracking app that provides instant, unalterable digital origin verification, unlike slow corporate certifications, by delivering tamper-proof data directly to consumers via smart packaging QR codes.",
    primaryBenefit:
      "Instantly validates organic authenticity to justify premium consumer pricing and boost profit margins.",
    reasonHasEvidence: true,
  },
  warRoomResults: [
    {
      id: "wr-1",
      competitorOrThreat: "Traditional Certification Boards (Legal Authority Defense)",
      attackVector:
        "Urban buyers recognize statutory organic seals legally; a self-logged app badge could be dismissed as unaccredited unless backed by verifiable audit trails.",
      ventureDefense:
        "Position FarmTrace AI as an instant farm-to-table transparency layer for direct-to-consumer stalls rather than a statutory regulatory replacement, pairing tamper-proof timestamps with batch harvest photos.",
      evidenceBasis:
        "Official agricultural certification handbooks confirm multi-month lag & high upfront friction for micro-farms; buyer trust in QR scan rates remains an Assumption — needs validation.",
      validationStatus: "Assumption — needs validation",
    },
    {
      id: "wr-2",
      competitorOrThreat: "Manual Social Media & Word-of-Mouth (Zero-Cost Incumbent)",
      attackVector:
        "Farmers already post field photos on Instagram/Facebook for free; switching to a paid SaaS workflow fails if logging takes more than 3 minutes per harvest day.",
      ventureDefense:
        "Enforce a 1-minute mobile logging workflow and One-Click Batch QR Code Generator directly bridging stall packaging to consumer smartphones.",
      evidenceBasis:
        "Field survey indicates farmers refuse apps requiring >3 minutes of daily data input; 7-day 10-farmer compliance pilot planned (8/10 target).",
      validationStatus: "Backed by Session 11 Evidence",
    },
    {
      id: "wr-3",
      competitorOrThreat: "AgriWebb & Enterprise Farm Suites (Feature Depth)",
      attackVector:
        "Enterprise platforms hold deep regulatory logs and could introduce lightweight consumer export modules.",
      ventureDefense:
        "Remain ruthlessly scoped to mobile-first consumer QR trust for micro/boutique growers—explicitly excluding automated IoT sensors and complex enterprise desktop logs.",
      evidenceBasis:
        "Competitor pricing sheets and farmer feedback show enterprise desktop tools are overbuilt and unaffordable for small growers.",
      validationStatus: "Backed by Session 11 Evidence",
    },
  ],
  session11Challenges: [
    {
      id: "s11-challenge-1",
      stage: 1,
      createdAt: "2026-10-01T19:45:10.000Z",
      headline:
        "Session 11 Positioning Audit: Cryptographic proof vs. real-world stall behavior",
      criticalQuestions: [
        "If urban shoppers already trust face-to-face farmers' market rapport, will at least 50 unique shoppers scan a packaging QR code over a weekend?",
        "Can boutique berry and heirloom growers reliably log batch harvest data every day in under 3 minutes without external troubleshooting?",
        "Does the digital provenance badge actually unlock a measurable 15%–20% markup absorption rate in an A/B stall price test?",
      ],
      assumptionFlags: [
        {
          claim: "Farmers will actively input crop history and harvest data regularly into a smartphone app.",
          status: ASSUMPTION_LABEL,
          validationTest:
            "7-day tracking pilot with 10 local market farmers using a 1-minute mobile interface (target: >= 8 of 10 daily compliance).",
        },
        {
          claim: "Urban customers will actively scan product QR codes at the point of sale.",
          status: ASSUMPTION_LABEL,
          validationTest:
            "Place sample mock-up QR codes on organic produce baskets at 5 busy weekend farmers' market stalls for 2 days (target: >= 50 unique scans).",
        },
        {
          claim: "Verified provenance yields a 15%–30% price premium for farmers.",
          status: ASSUMPTION_LABEL,
          validationTest:
            "Run an A/B price test at selected stalls listing identical crop items with and without the digital provenance badge.",
        },
      ],
      warRoomCounterMove:
        "Execute the 7-day compliance pilot and 5-stall weekend QR scan test before building automated IoT sensors or enterprise integrations.",
      readinessAssessment:
        "Positioning map, competitor differentiation, and beachhead customer definition are coherent for Session 11. Financial pricing and demand assumptions must now be tested in Stages 2–4 without fabricating evidence.",
      source: "Session 11",
    },
  ],
};

export function createEmptyStage2(): Stage2RevenuePricing {
  return {
    currency: "INR",
    revenueModel: "",
    otherRevenueModel: "",
    revenueModelDescription: "",
    sellingPrice: null,
    variableCost: null,
    variableCostNotApplicable: false,
    monthlyFixedCost: null,
    fixedCostNotApplicable: false,
    expectedCustomers: null,
    purchasesPerCustomer: null,
    priceEvidenceSource: "",
    priceEvidenceNotApplicable: false,
    costEvidenceSource: "",
    variableCostEvidenceNotApplicable: false,
    fixedCostEvidenceSource: "",
    fixedCostEvidenceNotApplicable: false,
    scenarios: [
      {
        id: "conservative",
        label: "Conservative",
        customers: null,
        sellingPrice: null,
        purchasesPerCustomer: null,
        notes: "",
      },
      {
        id: "base",
        label: "Base",
        customers: null,
        sellingPrice: null,
        purchasesPerCustomer: null,
        notes: "",
      },
      {
        id: "ambitious",
        label: "Ambitious",
        customers: null,
        sellingPrice: null,
        purchasesPerCustomer: null,
        notes: "",
      },
    ],
    pricingPosition: "",
    pricingPositionReasoning: "",
    biggestPricingAssumption: "",
    completed: false,
    completedAt: null,
  };
}

export function createEmptyStage3(): Stage3MarketSizeDemand {
  return {
    targetCustomer: FARMTRACE_VENTURE_PROFILE.specificSegment,
    geography: FARMTRACE_VENTURE_PROFILE.geography,
    coreOffer: FARMTRACE_VENTURE_PROFILE.productService,
    totalPotentialCustomers: null,
    totalCustomersEvidence: "",
    serviceableCustomers: null,
    serviceableEvidence: "",
    obtainableCustomers: null,
    obtainableEvidence: "",
    annualSpendPerCustomer: null,
    annualSpendEvidence: "",
    whyCustomersBuy: "",
    expectedPurchaseFrequency: "",
    mostUrgentAssumption: "",
    demandValidationPlan: "",
    completed: false,
    completedAt: null,
  };
}

export function createEmptyStage4(): Stage4GoToMarket {
  return {
    firstCustomerSegment: FARMTRACE_VENTURE_PROFILE.beachheadSegment,
    reachLocations: "",
    mainProblemNeed: FARMTRACE_VENTURE_PROFILE.primaryFriction,
    coreMessage: "",
    callToAction: "",
    channels: [
      {
        id: "ch-1",
        channelName: "",
        otherChannelName: "",
        budget: null,
        expectedLeads: null,
        expectedCustomers: null,
        whyFitsCustomer: "",
        evidenceReason: "",
      },
    ],
    experiment30Days: [
      {
        id: "wk-1",
        weekLabel: "Week 1 — Prepare",
        channel: "",
        action: "",
        target: "",
        metric: "",
        responsibility: "",
        learningQuestion: "",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
      {
        id: "wk-2",
        weekLabel: "Week 2 — Launch",
        channel: "",
        action: "",
        target: "",
        metric: "",
        responsibility: "",
        learningQuestion: "",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
      {
        id: "wk-3",
        weekLabel: "Week 3 — Measure",
        channel: "",
        action: "",
        target: "",
        metric: "",
        responsibility: "",
        learningQuestion: "",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
      {
        id: "wk-4",
        weekLabel: "Week 4 — Learn & Adjust",
        channel: "",
        action: "",
        target: "",
        metric: "",
        responsibility: "",
        learningQuestion: "",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
    ],
    biggestGtmAssumption: "",
    whatWeKnow: "",
    whatWeAssume: "",
    whatWeWillTestFirst: "",
    completed: false,
    completedAt: null,
  };
}

// Verbatim Mission 7 / 8 / 9 reference drafts extracted directly from the attached PDF.
// Zero invented values; fields absent from the PDF remain blank and flagged "Assumption — needs validation".
export function getPdfDraftStage2(): Omit<Stage2RevenuePricing, "completed" | "completedAt"> {
  return {
    currency: "INR",
    revenueModel: "Subscription",
    otherRevenueModel: "n/a",
    revenueModelDescription: "", // Left blank for the user to author in Step 1
    sellingPrice: 1499,
    variableCost: 50,
    variableCostNotApplicable: false,
    monthlyFixedCost: 25000,
    fixedCostNotApplicable: false,
    expectedCustomers: 30,
    purchasesPerCustomer: 1,
    priceEvidenceSource:
      "Competitive benchmarking of regional agricultural software and direct feedback from small farm owners on budget constraint.",
    priceEvidenceNotApplicable: false,
    costEvidenceSource:
      "Standard hosting price points for scalable cloud application databases and automated blockchain node integrations.",
    variableCostEvidenceNotApplicable: false,
    fixedCostEvidenceSource:
      "Standard hosting price points for scalable cloud application databases and automated blockchain node integrations.",
    fixedCostEvidenceNotApplicable: false,
    scenarios: [
      {
        id: "conservative",
        label: "Conservative",
        customers: 15,
        sellingPrice: 1499,
        purchasesPerCustomer: 1,
        notes: "minimum market penetration during initial pilot launch phase with low marketing spend.",
      },
      {
        id: "base",
        label: "Base",
        customers: 50,
        sellingPrice: 1499,
        purchasesPerCustomer: 1,
        notes: "Steady growth hitting initial targets across local premium farmers' market networks.",
      },
      {
        id: "ambitious",
        label: "Ambitious",
        customers: 75,
        sellingPrice: 1499,
        purchasesPerCustomer: 1,
        notes: "Rapid onboarding driven by partnerships with major regional agricultural cooperatives.",
      },
    ],
    pricingPosition: "",
    pricingPositionReasoning: "",
    biggestPricingAssumption: "",
  };
}

export function getPdfDraftStage3(): Omit<Stage3MarketSizeDemand, "completed" | "completedAt"> {
  return {
    targetCustomer: FARMTRACE_VENTURE_PROFILE.specificSegment,
    geography: FARMTRACE_VENTURE_PROFILE.geography,
    coreOffer: FARMTRACE_VENTURE_PROFILE.productService,
    totalPotentialCustomers: 1000000,
    totalCustomersEvidence:
      "Agricultural census data and government reports on the growing number of certified organic farmers and agricultural holdings nationwide.",
    serviceableCustomers: 100000,
    serviceableEvidence:
      "Regional database registers of direct-to-consumer agri-cooperatives, organic clusters, and regional farming hubs.",
    obtainableCustomers: 1500,
    obtainableEvidence:
      "Active merchant counts across premium city farmers' markets, organic store suppliers, and local community-supported agriculture(CSA) networks.",
    annualSpendPerCustomer: 17988,
    annualSpendEvidence:
      "Standard budget allocation data for modern farming inputs, mobile tools and basic marketing expenses by commercial organic growers.",
    whyCustomersBuy: "",
    expectedPurchaseFrequency: "",
    mostUrgentAssumption:
      "Whether target farmers are willing to consistently log crop data in an app in exchange for the promised consumer price premium.",
    demandValidationPlan:
      "7-day tracking pilot with 10 local market farmers (>=8/10 daily logging) + 5-stall weekend QR scan test (>=50 unique scans) + A/B price test.",
  };
}

export function getPdfDraftStage4(): Omit<Stage4GoToMarket, "completed" | "completedAt"> {
  return {
    firstCustomerSegment:
      "boutique organic berry and heirloom vegetable growers selling direct-to-consumer at premium city markets.",
    reachLocations:
      "Physical premium weekend farmers' markets and active agricultural cooperative WhatsApp groups.",
    mainProblemNeed: FARMTRACE_VENTURE_PROFILE.primaryFriction,
    coreMessage:
      "stop losing profits to corporate labels- instantly prove your organic truth and earn 20% more per harvest.",
    callToAction: "Scan to verify your first harvest batch free today.",
    channels: [
      {
        id: "ch-pdf-1",
        channelName: "Direct selling",
        otherChannelName: "Direct B2B Field Sales & Demos",
        budget: 5000,
        expectedLeads: 50,
        expectedCustomers: 15,
        whyFitsCustomer:
          "Farmers value trust, face-to-face interactions and need to see a live mobile app demo working right in their hands on the field.",
        evidenceReason:
          "Pilot tests show that direct, personal onboarding works best for non-enterprise agricultural software adoption.",
      },
    ],
    experiment30Days: [
      {
        id: "wk-1",
        weekLabel: "Week 1 — Prepare",
        channel: "Direct selling",
        action:
          "Map out top local farmers' markets and conduct face-to-face pitches to stall owners.",
        target: "20 premium vegetable vendors",
        metric: "Number of vendors signed up for a free trial pitch",
        responsibility: "Founder/ Sales lead",
        learningQuestion:
          "what is the primary hesitation farmers have when opening the app interface?",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
      {
        id: "wk-2",
        weekLabel: "Week 2 — Launch",
        channel: "Events",
        action:
          "Set up sample smart QR code signs at early adopter stalls to test consumer scanning rates.",
        target: "5 active pilot farm stalls",
        metric: "Unique consumer QR code scans per weekend",
        responsibility: "product lead",
        learningQuestion: "Do buyers actually scan the packaging codes while purchasing?",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
      {
        id: "wk-3",
        weekLabel: "Week 3 — Measure",
        channel: "WhatsApp communities",
        action:
          "Launch a targeting pitch through regional agriculture cooperative WhatsApp/Facebook groups.",
        target: "3 regional farmer chat groups.",
        metric: "link clicks and inbound app trial downloads.",
        responsibility: "Marketing leads",
        learningQuestion: "Can peer recommendations drive organic software sign-ups?",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
      {
        id: "wk-4",
        weekLabel: "Week 4 — Learn & Adjust",
        channel: "Direct selling",
        action:
          "review trial usage metrics and convert active pilot farmers into paying subscribers.",
        target: "all trial users from weeks 1-3",
        metric: "paid subscription conversion rate",
        responsibility: "founder",
        learningQuestion:
          "Is the Rs. 1499 monthly fee a barrier to continuous software usage?",
        status: "Planned",
        observedEvidence: "",
        isProposed: false,
      },
    ],
    biggestGtmAssumption:
      "Direct stall demos at weekend farmers' markets will convert 30% of approached growers into active trial users.",
    whatWeKnow: "",
    whatWeAssume: "",
    whatWeWillTestFirst: "",
  };
}

export function createInitialStudioState(): StudioState {
  return {
    selectedVentureId: "farmtrace-ai",
    activeStage: 2, // Session 11 (Stage 1) is completed; Stage 2 is the active next stage!
    ventureProfile: FARMTRACE_VENTURE_PROFILE,
    stage1: FARMTRACE_STAGE1_DATA,
    stage2: createEmptyStage2(),
    stage3: createEmptyStage3(),
    stage4: createEmptyStage4(),
    liveChallenges: [],
    lastSavedAt: new Date().toISOString(),
  };
}

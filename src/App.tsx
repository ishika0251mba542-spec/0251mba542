import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileDown,
  FileText,
  HardDrive,
  Lock,
  LogIn,
  LogOut,
  Menu,
  RefreshCw,
  RotateCcw,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { auth, googleProvider } from "./firebase";
import {
  areStudioStatesContentEqual,
  createVentureInFirestore,
  fetchExistingCloudVenture,
  saveVentureWorkspace,
  subscribeToVenture,
  syncUserAccount,
} from "./services/firestoreService";
import {
  ASSUMPTION_LABEL,
  applyPdfDraftToStudioState,
  createEmptyStage2,
  createEmptyStage3,
  createEmptyStage4,
  createInitialStudioState,
  createPdfPopulatedStudioState,
  isStages2To4Untouched,
} from "./data/farmTraceSession11";
import type {
  Stage2RevenuePricing as Stage2RevenuePricingData,
  Stage3MarketSizeDemand as Stage3MarketSizeDemandData,
  Stage4GoToMarket as Stage4GoToMarketData,
  StageId,
  StrategyChallengeRecord,
  StudioState,
} from "./types/venture";
import {
  computeEvidenceAudit,
  computeMarketSize,
  computeUnitEconomics,
  formatCurrency,
  formatINR,
  isStage2ReadyToComplete,
  isStage3ReadyToComplete,
  isStage4ReadyToComplete,
} from "./utils/calculations";
import { Stage1Positioning } from "./components/Stage1Positioning";
import { Stage2RevenuePricing } from "./components/Stage2RevenuePricing";
import { Stage3MarketSizeDemand } from "./components/Stage3MarketSizeDemand";
import { Stage4GoToMarket } from "./components/Stage4GoToMarket";
import { Stage5StrategyDashboard } from "./components/Stage5StrategyDashboard";

const LEGACY_STORAGE_KEY = "nexus_venture_studio_v1_farmtrace";

function userCacheKey(uid: string): string {
  return `${LEGACY_STORAGE_KEY}_${uid}`;
}

function userDirtyKey(uid: string): string {
  return `${LEGACY_STORAGE_KEY}_${uid}_dirty`;
}

function userSkippedHashKey(uid: string): string {
  return `${LEGACY_STORAGE_KEY}_${uid}_skipped_hash`;
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function parseStoredStateStrict(raw: string | null): StudioState | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StudioState> | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const hasWorkspaceShape =
      "stage2" in parsed ||
      "stage3" in parsed ||
      "stage4" in parsed ||
      "ventureProfile" in parsed ||
      "activeStage" in parsed ||
      "stage1" in parsed;
    if (!hasWorkspaceShape) return null;

    const fallback = createInitialStudioState();
    return {
      ...fallback,
      selectedVentureId:
        typeof parsed.selectedVentureId === "string" &&
        parsed.selectedVentureId.trim()
          ? parsed.selectedVentureId
          : fallback.selectedVentureId,
      activeStage:
        parsed.activeStage === 1 ||
        parsed.activeStage === 2 ||
        parsed.activeStage === 3 ||
        parsed.activeStage === 4 ||
        parsed.activeStage === 5
          ? parsed.activeStage
          : fallback.activeStage,
      ventureProfile: parsed.ventureProfile
        ? { ...fallback.ventureProfile, ...parsed.ventureProfile }
        : fallback.ventureProfile,
      stage1: parsed.stage1
        ? {
            ...fallback.stage1,
            ...parsed.stage1,
            positioning: parsed.stage1.positioning
              ? {
                  ...fallback.stage1.positioning,
                  ...parsed.stage1.positioning,
                }
              : fallback.stage1.positioning,
            warRoomResults: Array.isArray(parsed.stage1.warRoomResults)
              ? parsed.stage1.warRoomResults
              : fallback.stage1.warRoomResults,
            competitors: Array.isArray(parsed.stage1.competitors)
              ? parsed.stage1.competitors
              : fallback.stage1.competitors,
            session11Challenges: Array.isArray(
              parsed.stage1.session11Challenges
            )
              ? parsed.stage1.session11Challenges
              : fallback.stage1.session11Challenges,
          }
        : fallback.stage1,
      stage2: parsed.stage2
        ? {
            ...fallback.stage2,
            ...parsed.stage2,
            scenarios:
              Array.isArray(parsed.stage2.scenarios) &&
              parsed.stage2.scenarios.length === 3
                ? parsed.stage2.scenarios.map((sc, idx) => ({
                    ...fallback.stage2.scenarios[idx],
                    ...sc,
                  }))
                : fallback.stage2.scenarios,
          }
        : fallback.stage2,
      stage3: parsed.stage3
        ? { ...fallback.stage3, ...parsed.stage3 }
        : fallback.stage3,
      stage4: parsed.stage4
        ? {
            ...fallback.stage4,
            ...parsed.stage4,
            channels:
              Array.isArray(parsed.stage4.channels) &&
              parsed.stage4.channels.length > 0
                ? parsed.stage4.channels.slice(0, 3)
                : fallback.stage4.channels,
            experiment30Days:
              Array.isArray(parsed.stage4.experiment30Days) &&
              parsed.stage4.experiment30Days.length === 4
                ? parsed.stage4.experiment30Days.map((wk, idx) => ({
                    ...fallback.stage4.experiment30Days[idx],
                    ...wk,
                  }))
                : fallback.stage4.experiment30Days,
          }
        : fallback.stage4,
      liveChallenges: Array.isArray(parsed.liveChallenges)
        ? parsed.liveChallenges
        : [],
      lastSavedAt:
        typeof parsed.lastSavedAt === "string"
          ? parsed.lastSavedAt
          : fallback.lastSavedAt,
    };
  } catch {
    return null;
  }
}

type LocalSourceKind = "unsaved_local" | "legacy_device" | "cached_device";

interface LocalVentureCandidate {
  state: StudioState;
  rawHash: string;
  source: LocalSourceKind;
  isDirtyOrLegacy: boolean;
}

function detectLocalVentureCandidate(
  uid: string
): LocalVentureCandidate | null {
  try {
    const dirtyFlag = window.localStorage.getItem(userDirtyKey(uid)) === "1";
    const userScopedRaw = window.localStorage.getItem(userCacheKey(uid));
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const skippedHash = window.localStorage.getItem(userSkippedHashKey(uid));

    if (dirtyFlag && userScopedRaw) {
      const parsed = parseStoredStateStrict(userScopedRaw);
      if (parsed) {
        return {
          state: parsed,
          rawHash: hashString(userScopedRaw),
          source: "unsaved_local",
          isDirtyOrLegacy: true,
        };
      }
    }

    if (legacyRaw) {
      const parsed = parseStoredStateStrict(legacyRaw);
      const rawHash = hashString(legacyRaw);
      if (parsed && rawHash !== skippedHash) {
        return {
          state: parsed,
          rawHash,
          source: "legacy_device",
          isDirtyOrLegacy: true,
        };
      }
    }

    if (userScopedRaw) {
      const parsed = parseStoredStateStrict(userScopedRaw);
      const rawHash = hashString(userScopedRaw);
      if (parsed && rawHash !== skippedHash) {
        return {
          state: parsed,
          rawHash,
          source: "cached_device",
          isDirtyOrLegacy: false,
        };
      }
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

function isTimestampNewer(
  candidateIso: string | null | undefined,
  baselineIso: string | null | undefined
): boolean {
  if (!candidateIso) return false;
  const candidateMs = Date.parse(candidateIso);
  if (Number.isNaN(candidateMs)) return false;
  if (!baselineIso) return true;
  const baselineMs = Date.parse(baselineIso);
  if (Number.isNaN(baselineMs)) return true;
  return candidateMs > baselineMs;
}

function describeStudioSnapshot(snapshot: StudioState) {
  const stageLabels: Record<StageId, string> = {
    1: "Stage 1: Positioning",
    2: "Stage 2: Revenue & Pricing",
    3: "Stage 3: Market Size & Demand",
    4: "Stage 4: Go-to-Market",
    5: "Stage 5: Strategy Dashboard",
  };
  const completedStages: string[] = [];
  if (snapshot.stage2.completed) completedStages.push("Stage 2");
  if (snapshot.stage3.completed) completedStages.push("Stage 3");
  if (snapshot.stage4.completed) completedStages.push("Stage 4");

  const parsedDate = snapshot.lastSavedAt ? Date.parse(snapshot.lastSavedAt) : NaN;
  const lastSavedFormatted = Number.isNaN(parsedDate)
    ? "Not recorded"
    : new Date(parsedDate).toLocaleString();

  return {
    ventureName: snapshot.ventureProfile.name,
    activeStageLabel: stageLabels[snapshot.activeStage],
    completedSummary:
      completedStages.length > 0
        ? `${completedStages.join(", ")} completed`
        : "Stages 2–4 in progress",
    priceLabel: formatCurrency(
      snapshot.stage2.sellingPrice,
      snapshot.stage2.currency
    ),
    somLabel:
      snapshot.stage3.obtainableCustomers !== null
        ? `${snapshot.stage3.obtainableCustomers.toLocaleString("en-IN")} customers`
        : "Not entered",
    channelsCount: snapshot.stage4.channels.length,
    challengesCount: snapshot.liveChallenges.length,
    lastSavedFormatted,
  };
}

type PendingSyncDecision =
  | {
      mode: "import-to-cloud";
      localState: StudioState;
      localRawHash: string;
      localSource: LocalSourceKind;
    }
  | {
      mode: "resolve-conflict";
      cloudState: StudioState;
      localState: StudioState;
      localRawHash: string;
      localSource: LocalSourceKind;
    };

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [pendingSyncDecision, setPendingSyncDecision] =
    useState<PendingSyncDecision | null>(null);
  const [resolvingSyncDecision, setResolvingSyncDecision] = useState(false);
  const [syncDecisionError, setSyncDecisionError] = useState<string | null>(
    null
  );
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "saving" | "synced" | "error"
  >("idle");
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [lastCloudSavedAt, setLastCloudSavedAt] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [state, setState] = useState<StudioState>(() =>
    createInitialStudioState()
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isChallenging, setIsChallenging] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const editVersionRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const latestStateRef = useRef<StudioState>(state);
  latestStateRef.current = state;

  if (fatalError) {
    throw fatalError;
  }

  const updateStudioState = useCallback(
    (updater: (prev: StudioState) => StudioState) => {
      editVersionRef.current += 1;
      dirtyRef.current = true;
      setSyncStatus("saving");
      setState((prev) => updater(prev));
    },
    []
  );

  const performCloudSave = useCallback(
    async (
      uid: string,
      stateToSave: StudioState,
      targetVersion: number
    ): Promise<boolean> => {
      savingRef.current = true;
      setSyncStatus("saving");
      try {
        const savedAt = await saveVentureWorkspace(uid, stateToSave);
        setFirestoreConnected(true);
        setLastCloudSavedAt(savedAt);
        if (editVersionRef.current === targetVersion) {
          dirtyRef.current = false;
          try {
            window.localStorage.removeItem(userDirtyKey(uid));
            window.localStorage.setItem(
              userCacheKey(uid),
              JSON.stringify({ ...stateToSave, lastSavedAt: savedAt })
            );
          } catch {
            // Ignore storage quota errors
          }
          setSyncStatus("synced");
        }
        return true;
      } catch (err) {
        console.error("Cloud save failed:", err);
        setFirestoreConnected(false);
        setSyncStatus("error");
        return false;
      } finally {
        savingRef.current = false;
      }
    },
    []
  );

  // Track browser network connectivity
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => {
      setIsBrowserOnline(false);
      setFirestoreConnected(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (!user) {
        setWorkspaceReady(false);
        setPendingSyncDecision(null);
        setSyncDecisionError(null);
        setResolvingSyncDecision(false);
        setSyncStatus("idle");
        setFirestoreConnected(false);
        setLastCloudSavedAt(null);
        dirtyRef.current = false;
        savingRef.current = false;
        editVersionRef.current = 0;
        setState(createInitialStudioState());
      }
    });
    return () => unsubscribe();
  }, []);

  // Inspect Cloud Firestore and browser localStorage after login without silently overwriting either
  useEffect(() => {
    if (!authReady || !authUser) return;

    let cancelled = false;
    const uid = authUser.uid;

    const bootstrapWorkspace = async () => {
      setWorkspaceReady(false);
      setPendingSyncDecision(null);
      setSyncDecisionError(null);
      try {
        await syncUserAccount(authUser);
        const cloudState = await fetchExistingCloudVenture(uid);
        if (cancelled) return;

        const localCandidate = detectLocalVentureCandidate(uid);

        if (cloudState === null) {
          if (localCandidate !== null) {
            setPendingSyncDecision({
              mode: "import-to-cloud",
              localState: localCandidate.state,
              localRawHash: localCandidate.rawHash,
              localSource: localCandidate.source,
            });
            return;
          }

          const created = await createVentureInFirestore(
            uid,
            createPdfPopulatedStudioState()
          );
          if (cancelled) return;
          try {
            window.localStorage.removeItem(userDirtyKey(uid));
            window.localStorage.setItem(
              userCacheKey(uid),
              JSON.stringify(created)
            );
          } catch {
            // Ignore storage quota errors
          }
          dirtyRef.current = false;
          setFirestoreConnected(navigator.onLine);
          setState(created);
          setLastCloudSavedAt(created.lastSavedAt);
          setSyncStatus("synced");
          setWorkspaceReady(true);
          return;
        }

        // Cloud venture already exists in Firestore
        const hasLocalConflict =
          localCandidate !== null &&
          !areStudioStatesContentEqual(localCandidate.state, cloudState) &&
          (localCandidate.isDirtyOrLegacy ||
            isTimestampNewer(
              localCandidate.state.lastSavedAt,
              cloudState.lastSavedAt
            ));

        if (hasLocalConflict && localCandidate) {
          setPendingSyncDecision({
            mode: "resolve-conflict",
            cloudState,
            localState: localCandidate.state,
            localRawHash: localCandidate.rawHash,
            localSource: localCandidate.source,
          });
          return;
        }

        // If existing cloud venture has untouched empty Stages 2-4, auto-fill from the uploaded FarmTrace AI PDF
        let resolvedCloudState = cloudState;
        let syncedStatus: "synced" | "error" = "synced";
        if (isStages2To4Untouched(cloudState)) {
          const populated = applyPdfDraftToStudioState(cloudState);
          try {
            const savedAt = await saveVentureWorkspace(uid, populated);
            if (cancelled) return;
            resolvedCloudState = { ...populated, lastSavedAt: savedAt };
            dirtyRef.current = false;
          } catch (saveErr) {
            console.error("Failed to auto-populate untouched cloud workspace from PDF:", saveErr);
            resolvedCloudState = populated;
            dirtyRef.current = true;
            syncedStatus = "error";
          }
        } else {
          dirtyRef.current = false;
        }

        // Align local cache with resolved Cloud Firestore state
        try {
          if (syncedStatus === "synced") {
            window.localStorage.removeItem(userDirtyKey(uid));
          } else {
            window.localStorage.setItem(userDirtyKey(uid), "1");
          }
          window.localStorage.setItem(
            userCacheKey(uid),
            JSON.stringify(resolvedCloudState)
          );
        } catch {
          // Ignore storage quota errors
        }
        setFirestoreConnected(syncedStatus === "synced" && navigator.onLine);
        setState(resolvedCloudState);
        setLastCloudSavedAt(resolvedCloudState.lastSavedAt);
        setSyncStatus(syncedStatus);
        setWorkspaceReady(true);
      } catch (err) {
        if (!cancelled) {
          setFirestoreConnected(false);
          setFatalError(
            err instanceof Error ? err : new Error(String(err))
          );
        }
      }
    };

    void bootstrapWorkspace();

    return () => {
      cancelled = true;
    };
  }, [authReady, authUser]);

  // Attach real-time Firestore listener once workspace is active
  useEffect(() => {
    if (!authReady || !authUser || !workspaceReady) return;

    let cancelled = false;
    const uid = authUser.uid;
    const ventureId = latestStateRef.current.selectedVentureId || "farmtrace-ai";

    const unsubscribeSnapshot = subscribeToVenture(
      uid,
      ventureId,
      (remoteState, hasPendingWrites, fromCache) => {
        if (cancelled) return;
        if (!fromCache) {
          setFirestoreConnected(true);
        } else if (!navigator.onLine) {
          setFirestoreConnected(false);
        }
        if (hasPendingWrites || dirtyRef.current || savingRef.current) {
          return;
        }
        try {
          window.localStorage.setItem(
            userCacheKey(uid),
            JSON.stringify(remoteState)
          );
        } catch {
          // Ignore storage quota errors
        }
        setState(remoteState);
        setLastCloudSavedAt(remoteState.lastSavedAt);
        setSyncStatus("synced");
      },
      (err) => {
        if (!cancelled) {
          setFirestoreConnected(false);
          setFatalError(err);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribeSnapshot();
    };
  }, [authReady, authUser, workspaceReady]);

  const handleImportLocalToCloud = async () => {
    if (!authUser || !pendingSyncDecision || pendingSyncDecision.mode !== "import-to-cloud") {
      return;
    }
    const uid = authUser.uid;
    setResolvingSyncDecision(true);
    setSyncDecisionError(null);
    try {
      const created = await createVentureInFirestore(
        uid,
        pendingSyncDecision.localState
      );
      try {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        window.localStorage.removeItem(userDirtyKey(uid));
        window.localStorage.removeItem(userSkippedHashKey(uid));
        window.localStorage.setItem(
          userCacheKey(uid),
          JSON.stringify(created)
        );
      } catch {
        // Ignore storage quota errors
      }
      dirtyRef.current = false;
      setFirestoreConnected(true);
      setState(created);
      setLastCloudSavedAt(created.lastSavedAt);
      setSyncStatus("synced");
      setPendingSyncDecision(null);
      setWorkspaceReady(true);
    } catch (err) {
      setSyncDecisionError(
        err instanceof Error
          ? err.message
          : "Cloud save failed. Please retry importing your local data."
      );
    } finally {
      setResolvingSyncDecision(false);
    }
  };

  const handleSkipLocalImport = async () => {
    if (!authUser || !pendingSyncDecision || pendingSyncDecision.mode !== "import-to-cloud") {
      return;
    }
    const uid = authUser.uid;
    setResolvingSyncDecision(true);
    setSyncDecisionError(null);
    try {
      const created = await createVentureInFirestore(
        uid,
        createPdfPopulatedStudioState()
      );
      try {
        window.localStorage.setItem(
          userSkippedHashKey(uid),
          pendingSyncDecision.localRawHash
        );
        window.localStorage.removeItem(userDirtyKey(uid));
        window.localStorage.setItem(
          userCacheKey(uid),
          JSON.stringify(created)
        );
      } catch {
        // Ignore storage quota errors
      }
      dirtyRef.current = false;
      setFirestoreConnected(true);
      setState(created);
      setLastCloudSavedAt(created.lastSavedAt);
      setSyncStatus("synced");
      setPendingSyncDecision(null);
      setWorkspaceReady(true);
    } catch (err) {
      setSyncDecisionError(
        err instanceof Error
          ? err.message
          : "Failed to initialize cloud workspace. Please retry."
      );
    } finally {
      setResolvingSyncDecision(false);
    }
  };

  const handleRetainCloudVersion = () => {
    if (!authUser || !pendingSyncDecision || pendingSyncDecision.mode !== "resolve-conflict") {
      return;
    }
    const uid = authUser.uid;
    const cloudState = pendingSyncDecision.cloudState;
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.localStorage.removeItem(userDirtyKey(uid));
      window.localStorage.removeItem(userSkippedHashKey(uid));
      window.localStorage.setItem(
        userCacheKey(uid),
        JSON.stringify(cloudState)
      );
    } catch {
      // Ignore storage quota errors
    }
    dirtyRef.current = false;
    setFirestoreConnected(navigator.onLine);
    setSyncDecisionError(null);
    setState(cloudState);
    setLastCloudSavedAt(cloudState.lastSavedAt);
    setSyncStatus("synced");
    setPendingSyncDecision(null);
    setWorkspaceReady(true);
  };

  const handleRetainLocalVersion = async () => {
    if (!authUser || !pendingSyncDecision || pendingSyncDecision.mode !== "resolve-conflict") {
      return;
    }
    const uid = authUser.uid;
    const localState = pendingSyncDecision.localState;
    setResolvingSyncDecision(true);
    setSyncDecisionError(null);
    try {
      const savedAt = await saveVentureWorkspace(uid, localState);
      const updatedLocalState: StudioState = {
        ...localState,
        lastSavedAt: savedAt,
      };
      try {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        window.localStorage.removeItem(userDirtyKey(uid));
        window.localStorage.removeItem(userSkippedHashKey(uid));
        window.localStorage.setItem(
          userCacheKey(uid),
          JSON.stringify(updatedLocalState)
        );
      } catch {
        // Ignore storage quota errors
      }
      dirtyRef.current = false;
      setFirestoreConnected(true);
      setState(updatedLocalState);
      setLastCloudSavedAt(savedAt);
      setSyncStatus("synced");
      setPendingSyncDecision(null);
      setWorkspaceReady(true);
    } catch (err) {
      setSyncDecisionError(
        err instanceof Error
          ? err.message
          : "Cloud save failed. Please retry retaining your local version."
      );
    } finally {
      setResolvingSyncDecision(false);
    }
  };

  // Persist local edits to Firestore (debounced) + durable local backup
  useEffect(() => {
    if (!authUser || !workspaceReady || !dirtyRef.current) return;

    const uid = authUser.uid;
    const targetVersion = editVersionRef.current;

    try {
      window.localStorage.setItem(userCacheKey(uid), JSON.stringify(state));
      window.localStorage.setItem(userDirtyKey(uid), "1");
    } catch {
      // Ignore storage quota errors
    }

    const timer = window.setTimeout(() => {
      void performCloudSave(uid, state, targetVersion);
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [state, authUser, workspaceReady, performCloudSave]);

  const handleRetryCloudSave = () => {
    if (!authUser || savingRef.current) return;
    void performCloudSave(
      authUser.uid,
      latestStateRef.current,
      editVersionRef.current
    );
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Google Sign-In could not be completed.";
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    if (authUser && dirtyRef.current) {
      const flushed = await performCloudSave(
        authUser.uid,
        latestStateRef.current,
        editVersionRef.current
      );
      if (!flushed) {
        return;
      }
    }
    try {
      await signOut(auth);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Failed to sign out."
      );
    }
  };

  const stage3Unlocked = state.stage2.completed;
  const stage4Unlocked = state.stage2.completed && state.stage3.completed;
  const stage5Unlocked =
    state.stage2.completed && state.stage3.completed && state.stage4.completed;

  const evidenceAudit = useMemo(() => computeEvidenceAudit(state), [state]);

  const setActiveStage = (stage: StageId) => {
    setChallengeError(null);
    updateStudioState((prev) => ({
      ...prev,
      activeStage: stage,
      lastSavedAt: new Date().toISOString(),
    }));
    setMobileMenuOpen(false);
  };

  const handleStage2Change = (next: Stage2RevenuePricingData) => {
    const readiness = isStage2ReadyToComplete(next);
    const stillCompleted = next.completed && readiness.ready;
    updateStudioState((prev) => ({
      ...prev,
      stage2: { ...next, completed: stillCompleted },
      stage3: stillCompleted
        ? prev.stage3
        : { ...prev.stage3, completed: false, completedAt: null },
      stage4: stillCompleted
        ? prev.stage4
        : { ...prev.stage4, completed: false, completedAt: null },
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleCompleteStage2 = () => {
    const readiness = isStage2ReadyToComplete(state.stage2);
    if (!readiness.ready) return;
    updateStudioState((prev) => ({
      ...prev,
      stage2: {
        ...prev.stage2,
        completed: true,
        completedAt: new Date().toISOString(),
      },
      activeStage: 3,
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleStage3Change = (next: Stage3MarketSizeDemandData) => {
    const readiness = isStage3ReadyToComplete(next, state.stage2);
    const stillCompleted = next.completed && readiness.ready;
    updateStudioState((prev) => ({
      ...prev,
      stage3: { ...next, completed: stillCompleted },
      stage4: stillCompleted
        ? prev.stage4
        : { ...prev.stage4, completed: false, completedAt: null },
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleCompleteStage3 = () => {
    const readiness = isStage3ReadyToComplete(state.stage3, state.stage2);
    if (!readiness.ready) return;
    updateStudioState((prev) => ({
      ...prev,
      stage3: {
        ...prev.stage3,
        completed: true,
        completedAt: new Date().toISOString(),
      },
      activeStage: 4,
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleStage4Change = (next: Stage4GoToMarketData) => {
    const readiness = isStage4ReadyToComplete(next);
    const stillCompleted = next.completed && readiness.ready;
    updateStudioState((prev) => ({
      ...prev,
      stage4: { ...next, completed: stillCompleted },
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleCompleteStage4 = () => {
    if (!isStage4ReadyToComplete(state.stage4).ready) return;
    updateStudioState((prev) => ({
      ...prev,
      stage4: {
        ...prev.stage4,
        completed: true,
        completedAt: new Date().toISOString(),
      },
      activeStage: 5,
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handleResetStages2To4 = () => {
    setChallengeError(null);
    updateStudioState((prev) => ({
      ...prev,
      activeStage: 2,
      stage2: createEmptyStage2(),
      stage3: createEmptyStage3(),
      stage4: createEmptyStage4(),
      liveChallenges: prev.liveChallenges.filter((c) => c.stage === 1),
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const handlePopulateFromPdf = () => {
    setChallengeError(null);
    updateStudioState((prev) => applyPdfDraftToStudioState(prev));
  };

  const handleRunChallenge = async (stage: StageId) => {
    setIsChallenging(true);
    setChallengeError(null);
    const stageNames: Record<1 | 2 | 3 | 4, string> = {
      1: "Positioning & Competition War Room",
      2: "Revenue & Pricing",
      3: "Market Size & Demand",
      4: "Go-to-Market",
    };
    const activeChallengeStage = stage === 5 ? 4 : stage;
    const stagePayload =
      stage === 1
        ? state.stage1
        : stage === 2
        ? state.stage2
        : stage === 3
        ? state.stage3
        : state.stage4;

    try {
      const res = await fetch("/api/strategy/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: activeChallengeStage,
          stageName: stageNames[activeChallengeStage],
          venture: {
            name: state.ventureProfile.name,
            idea: state.ventureProfile.ventureIdea,
            geography: state.ventureProfile.geography,
            beachheadSegment: state.ventureProfile.beachheadSegment,
            problemSolved: state.ventureProfile.problemSolved,
            positioningStatement:
              state.stage1.positioning.positioningStatement,
          },
          stagePayload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate strategy challenge.");
      }

      const record: StrategyChallengeRecord = {
        id: json.id || `challenge-${Date.now()}`,
        stage,
        createdAt: json.createdAt || new Date().toISOString(),
        headline: json.headline,
        criticalQuestions: Array.isArray(json.criticalQuestions)
          ? json.criticalQuestions
          : [],
        assumptionFlags: Array.isArray(json.assumptionFlags)
          ? json.assumptionFlags
          : [],
        warRoomCounterMove: json.warRoomCounterMove || "",
        readinessAssessment: json.readinessAssessment || "",
        source: "Live AI Strategy Challenge",
      };

      updateStudioState((prev) => ({
        ...prev,
        liveChallenges: [record, ...prev.liveChallenges],
        lastSavedAt: new Date().toISOString(),
      }));
    } catch (err) {
      setChallengeError(
        err instanceof Error
          ? err.message
          : "Failed to run AI Strategy Challenge."
      );
    } finally {
      setIsChallenging(false);
    }
  };

  const handleExportDossier = () => {
    const effectiveVarCost = state.stage2.variableCostNotApplicable
      ? 0
      : state.stage2.variableCost;
    const effectiveFixedCost = state.stage2.fixedCostNotApplicable
      ? 0
      : state.stage2.monthlyFixedCost;
    const unitEcon = computeUnitEconomics({
      sellingPrice: state.stage2.sellingPrice,
      purchasesPerCustomer: state.stage2.purchasesPerCustomer,
      variableCost: effectiveVarCost,
      monthlyFixedCost: effectiveFixedCost,
      expectedCustomers: state.stage2.expectedCustomers,
    });
    const market = computeMarketSize(state.stage3);

    const lines: string[] = [
      `# NEXUS Venture Studio — Complete Venture Dossier`,
      `Venture: ${state.ventureProfile.name}`,
      `Founder Account: ${authUser?.displayName || state.ventureProfile.studentName} (${authUser?.email || state.ventureProfile.studentEmail})`,
      `Institution: ${state.ventureProfile.institution}`,
      `Exported: ${new Date().toISOString()}`,
      ``,
      `## Stage 1: Session 11 Positioning & War Room (Completed)`,
      `Idea: ${state.ventureProfile.ventureIdea}`,
      `Beachhead: ${state.ventureProfile.beachheadSegment}`,
      `Positioning Statement: ${state.stage1.positioning.positioningStatement}`,
      ``,
      `## Stage 2: Revenue & Pricing Lab (${
        state.stage2.completed ? "Completed" : "In Progress"
      })`,
      `Revenue Model: ${state.stage2.revenueModel || "Not selected"} (${
        state.stage2.revenueModelDescription || ASSUMPTION_LABEL
      })`,
      `Selling Price: ${formatCurrency(
        state.stage2.sellingPrice,
        state.stage2.currency
      )}`,
      `Variable Cost: ${
        state.stage2.variableCostNotApplicable
          ? "Not applicable"
          : formatCurrency(state.stage2.variableCost, state.stage2.currency)
      }`,
      `Monthly Fixed Cost: ${
        state.stage2.fixedCostNotApplicable
          ? "Not applicable"
          : formatCurrency(state.stage2.monthlyFixedCost, state.stage2.currency)
      }`,
      `Expected Monthly Customers: ${
        state.stage2.expectedCustomers ?? ASSUMPTION_LABEL
      }`,
      `Purchases per Customer / Month: ${
        state.stage2.purchasesPerCustomer ?? ASSUMPTION_LABEL
      }`,
      `Contribution per Unit: ${formatCurrency(
        unitEcon.contributionPerUnit,
        state.stage2.currency
      )}`,
      `Monthly Revenue: ${formatCurrency(
        unitEcon.monthlyRevenue,
        state.stage2.currency
      )}`,
      `Operating Surplus / Deficit: ${formatCurrency(
        unitEcon.operatingSurplus,
        state.stage2.currency
      )}`,
      `Break-even Customers: ${
        unitEcon.breakEvenCustomers !== null
          ? Math.ceil(unitEcon.breakEvenCustomers)
          : "—"
      }`,
      `Pricing Position: ${
        state.stage2.pricingPosition || "Not selected"
      } — ${state.stage2.pricingPositionReasoning || ASSUMPTION_LABEL}`,
      `Biggest Pricing Assumption: ${
        state.stage2.biggestPricingAssumption || ASSUMPTION_LABEL
      }`,
      `Price Evidence: ${
        state.stage2.priceEvidenceSource || ASSUMPTION_LABEL
      }`,
      `Variable Cost Evidence: ${
        state.stage2.variableCostNotApplicable
          ? "Not applicable"
          : state.stage2.costEvidenceSource || ASSUMPTION_LABEL
      }`,
      `Fixed Cost Evidence: ${
        state.stage2.fixedCostNotApplicable
          ? "Not applicable"
          : state.stage2.fixedCostEvidenceSource || ASSUMPTION_LABEL
      }`,
      ``,
      `## Stage 3: Market Size & Demand Lab (${
        state.stage3.completed
          ? "Completed"
          : stage3Unlocked
          ? "In Progress"
          : "Locked"
      })`,
      `Market Definition: Target Customer: ${state.stage3.targetCustomer} | Geography: ${state.stage3.geography} | Core Offer: ${state.stage3.coreOffer}`,
      `TAM: ${state.stage3.totalPotentialCustomers ?? "—"} customers · ${formatINR(
        market.tam
      )} (Evidence: ${
        state.stage3.totalCustomersEvidence || ASSUMPTION_LABEL
      })`,
      `SAM: ${state.stage3.serviceableCustomers ?? "—"} customers · ${formatINR(
        market.sam
      )} (Evidence: ${state.stage3.serviceableEvidence || ASSUMPTION_LABEL})`,
      `SOM: ${state.stage3.obtainableCustomers ?? "—"} customers · ${formatINR(
        market.som
      )} (Evidence: ${state.stage3.obtainableEvidence || ASSUMPTION_LABEL})`,
      `Annual Spend Per Customer: ${formatINR(
        state.stage3.annualSpendPerCustomer
      )} (Evidence: ${state.stage3.annualSpendEvidence || ASSUMPTION_LABEL})`,
      `Base-Scenario Monthly Customers: ${
        state.stage2.scenarios.find((s) => s.id === "base")?.customers ?? "—"
      }`,
      `Biggest Demand Assumption: ${
        state.stage3.mostUrgentAssumption || ASSUMPTION_LABEL
      }`,
      `Next Evidence Needed: ${
        state.stage3.demandValidationPlan || ASSUMPTION_LABEL
      }`,
      ``,
      `## Stage 4: Go-to-Market Launch Lab (${
        state.stage4.completed
          ? "Completed"
          : stage4Unlocked
          ? "In Progress"
          : "Locked"
      })`,
      `Primary Customer Segment: ${state.stage4.firstCustomerSegment}`,
      `Reach Locations: ${state.stage4.reachLocations || ASSUMPTION_LABEL}`,
      `Main Problem / Need: ${
        state.stage4.mainProblemNeed || ASSUMPTION_LABEL
      }`,
      `Core Message: ${state.stage4.coreMessage || ASSUMPTION_LABEL}`,
      `Call To Action: ${state.stage4.callToAction || ASSUMPTION_LABEL}`,
      `Channels: ${state.stage4.channels
        .map(
          (c) =>
            `${
              c.channelName === "Other"
                ? c.otherChannelName || "Other"
                : c.channelName || "Unnamed"
            } (Budget: ${formatINR(c.budget)}, Leads: ${
              c.expectedLeads ?? "—"
            }, Customers: ${c.expectedCustomers ?? "—"}, Evidence: ${
              c.evidenceReason || ASSUMPTION_LABEL
            })`
        )
        .join("; ")}`,
      `Biggest GTM Assumption: ${
        state.stage4.biggestGtmAssumption || ASSUMPTION_LABEL
      }`,
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-venture-studio-farmtrace-ai.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-5 text-sm text-slate-600">
          Initializing NEXUS Venture Studio...
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-7 space-y-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              NEXUS Venture Studio
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              Sign in with Google to access your NEXUS Venture Studio
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your Venture Profile, Session 11 Competition &amp; Positioning,
              Revenue &amp; Pricing, Market Size &amp; Demand, and Go-to-Market
              work are stored privately in your authenticated Cloud Firestore
              workspace across devices.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>
              {signingIn ? "Signing in..." : "Sign in with Google"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!workspaceReady && pendingSyncDecision) {
    if (pendingSyncDecision.mode === "import-to-cloud") {
      const localSummary = describeStudioSnapshot(
        pendingSyncDecision.localState
      );
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-7 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  NEXUS Venture Studio · Local Data Detected
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {authUser.email}
                </span>
              </div>
              <h1 className="text-lg font-bold text-slate-900">
                Existing NEXUS venture data was found on this device. Import it
                into your cloud database?
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                No cloud venture exists yet for your account. You can import
                your device data into Cloud Firestore so it syncs across devices,
                or skip to start with a clean cloud workspace.
              </p>
            </div>

            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <HardDrive className="w-4 h-4 text-teal-700" />
                <span>Device Local Data Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] text-slate-600 pt-1">
                <div>
                  <span className="text-slate-500">Venture:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {localSummary.ventureName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Progress:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {localSummary.completedSummary}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Active View:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {localSummary.activeStageLabel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Selected Price:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {localSummary.priceLabel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">SOM Estimate:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {localSummary.somLabel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Last Local Edit:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {localSummary.lastSavedFormatted}
                  </span>
                </div>
              </div>
            </div>

            {syncDecisionError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{syncDecisionError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleImportLocalToCloud}
                disabled={resolvingSyncDecision}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {resolvingSyncDecision ? "Importing..." : "Import to Cloud"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleSkipLocalImport}
                disabled={resolvingSyncDecision}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <span>Skip</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={resolvingSyncDecision}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    const cloudSummary = describeStudioSnapshot(pendingSyncDecision.cloudState);
    const localSummary = describeStudioSnapshot(pendingSyncDecision.localState);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-lg p-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                NEXUS Venture Studio · Version Conflict Check
              </span>
              <span className="text-[11px] text-slate-500 truncate">
                {authUser.email}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              Both Cloud Firestore data and local device data exist. Which
              version should be retained?
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Neither version has been overwritten automatically. Review both
              snapshots below and choose which version to keep in your workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Database className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Cloud Database Version</span>
                </div>
                <dl className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Venture:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.ventureName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Active View:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.activeStageLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Progress:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.completedSummary}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Selected Price:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.priceLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">SOM Estimate:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.somLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">GTM Channels:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.channelsCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">AI Challenges:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.challengesCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 pt-1 border-t border-slate-200">
                    <dt className="text-slate-500">Last Saved:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {cloudSummary.lastSavedFormatted}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                onClick={handleRetainCloudVersion}
                disabled={resolvingSyncDecision}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                <span>Retain Cloud Version</span>
              </button>
            </div>

            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40 flex flex-col justify-between space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <HardDrive className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Local Device Version</span>
                </div>
                <dl className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Venture:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.ventureName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Active View:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.activeStageLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Progress:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.completedSummary}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Selected Price:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.priceLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">SOM Estimate:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.somLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">GTM Channels:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.channelsCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">AI Challenges:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.challengesCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 pt-1 border-t border-amber-200/70">
                    <dt className="text-slate-500">Last Saved:</dt>
                    <dd className="font-medium text-slate-800 text-right">
                      {localSummary.lastSavedFormatted}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                type="button"
                onClick={handleRetainLocalVersion}
                disabled={resolvingSyncDecision}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-amber-50 border border-amber-300 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-amber-700" />
                <span>
                  {resolvingSyncDecision
                    ? "Saving to Cloud..."
                    : "Retain Local Version"}
                </span>
              </button>
            </div>
          </div>

          {syncDecisionError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{syncDecisionError}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={resolvingSyncDecision}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!workspaceReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg px-6 py-5 space-y-2 text-center">
          <div className="text-sm font-semibold text-slate-900">
            Loading your NEXUS Venture Studio...
          </div>
          <div className="text-xs text-slate-500">
            Syncing {authUser.email} workspace from Cloud Firestore
          </div>
        </div>
      </div>
    );
  }

  const accountName =
    authUser.displayName?.trim() ||
    authUser.email?.split("@")[0] ||
    "Authenticated User";

  const navItems: Array<{
    id: StageId;
    label: string;
    unlocked: boolean;
    completed: boolean;
  }> = [
    { id: 1, label: "01. Positioning", unlocked: true, completed: true },
    {
      id: 2,
      label: "02. Revenue & Pricing",
      unlocked: true,
      completed: state.stage2.completed,
    },
    {
      id: 3,
      label: "03. Market Size",
      unlocked: stage3Unlocked,
      completed: state.stage3.completed,
    },
    {
      id: 4,
      label: "04. Go-to-Market",
      unlocked: stage4Unlocked,
      completed: state.stage4.completed,
    },
    {
      id: 5,
      label: "05. Strategy Dashboard",
      unlocked: stage5Unlocked,
      completed: stage5Unlocked,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle workspace navigation"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              NEXUS Venture Studio
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = state.activeStage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveStage(item.id)}
                  className={`inline-flex items-center gap-1.5 py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? "border-teal-700 text-slate-900 font-semibold"
                      : item.unlocked
                      ? "border-transparent text-slate-600 hover:text-slate-900"
                      : "border-transparent text-slate-400 hover:text-slate-500"
                  }`}
                >
                  {!item.unlocked && (
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {item.unlocked && item.completed && (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-emerald-600"
                      aria-hidden="true"
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportDossier}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex relative">
        {/* Left Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? "block fixed inset-y-0 left-0 z-40 pt-16" : "hidden"
          } lg:block w-[270px] shrink-0 bg-white border-r border-slate-200 p-5 space-y-6 overflow-y-auto`}
        >
          {/* Authenticated Account Card */}
          <div className="space-y-2 pb-5 border-b border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <UserIcon className="w-3.5 h-3.5 text-teal-700" />
              <span>Signed In Account</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate">
              {accountName}
            </div>
            <div className="text-[11px] text-slate-600 truncate">
              {authUser.email}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Selected Venture Anchor */}
          <div className="space-y-2 pb-5 border-b border-slate-200">
            <div className="text-xs font-medium text-slate-500">
              Selected Venture
            </div>
            <div className="text-base font-bold text-slate-900">
              {state.ventureProfile.name}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {state.ventureProfile.beachheadSegment}
            </p>
            <div className="pt-1 text-[11px] text-slate-500">
              {state.ventureProfile.studentEmail}
            </div>
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Reference Venture PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePopulateFromPdf}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-teal-700" />
              <span>Fill Stages 2–4 from PDF</span>
            </button>
          </div>

          {/* Sequential Stage Pipeline */}
          <div className="space-y-2 pb-5 border-b border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-2">
              Sequential Venture Pipeline
            </div>
            {navItems.map((item) => {
              const isActive = state.activeStage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveStage(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-left text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-teal-50 text-teal-900 font-semibold border border-teal-200"
                      : item.unlocked
                      ? "text-slate-700 hover:bg-slate-50 border border-transparent"
                      : "text-slate-400 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0">
                    {!item.unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    ) : item.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-[11px] font-medium text-teal-700">
                        Active
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Evidence Integrity Summary */}
          <div className="space-y-3 pb-5 border-b border-slate-200">
            <div className="text-xs font-medium text-slate-500">
              Evidence Integrity Check
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-500 text-[11px]">Cited</div>
                <div className="font-mono font-bold text-emerald-700 text-base tabular-nums mt-0.5">
                  {evidenceAudit.verifiedCount}
                </div>
              </div>
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded">
                <div className="text-amber-800 text-[11px]">Assumptions</div>
                <div className="font-mono font-bold text-amber-800 text-base tabular-nums mt-0.5">
                  {evidenceAudit.assumptionCount}
                </div>
              </div>
            </div>
            {evidenceAudit.assumptionCount > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{ASSUMPTION_LABEL}:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-600 max-h-40 overflow-y-auto pr-1">
                  {evidenceAudit.missingEvidenceItems.map((item, idx) => (
                    <li key={idx} className="leading-snug">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* NEXUS Cloud Status & Reset Controls */}
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wide">
                  NEXUS Cloud Status
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                    isBrowserOnline &&
                    firestoreConnected &&
                    syncStatus !== "error"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBrowserOnline &&
                      firestoreConnected &&
                      syncStatus !== "error"
                        ? "bg-emerald-600"
                        : "bg-rose-600"
                    }`}
                  />
                  <span>
                    {isBrowserOnline &&
                    firestoreConnected &&
                    syncStatus !== "error"
                      ? "Connected"
                      : "Not Connected"}
                  </span>
                </span>
              </div>

              <dl className="space-y-1.5 text-[11px] pt-1 border-t border-slate-200/80">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">Signed-in user</dt>
                  <dd
                    className="font-medium text-slate-800 truncate text-right"
                    title={`${accountName} (${authUser.email || ""})`}
                  >
                    {authUser.email || accountName}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">Venture name</dt>
                  <dd className="font-medium text-slate-800 truncate text-right">
                    {state.ventureProfile.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">Cloud database</dt>
                  <dd
                    className={`font-medium text-right ${
                      isBrowserOnline &&
                      firestoreConnected &&
                      syncStatus !== "error"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {isBrowserOnline &&
                    firestoreConnected &&
                    syncStatus !== "error"
                      ? "Connected"
                      : "Not Connected"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">Last saved time</dt>
                  <dd className="font-medium text-slate-800 tabular-nums text-right">
                    {lastCloudSavedAt
                      ? new Date(lastCloudSavedAt).toLocaleTimeString()
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 shrink-0">
                    Current completed stage
                  </dt>
                  <dd className="font-medium text-slate-800 text-right truncate">
                    {state.stage4.completed &&
                    state.stage3.completed &&
                    state.stage2.completed
                      ? "Stage 4: Go-to-Market"
                      : state.stage3.completed && state.stage2.completed
                      ? "Stage 3: Market Size"
                      : state.stage2.completed
                      ? "Stage 2: Revenue & Pricing"
                      : "Stage 1: Positioning"}
                  </dd>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <dt className="text-slate-500 shrink-0">Sync status</dt>
                  <dd className="text-right">
                    {syncStatus === "error" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-rose-700">
                        <CloudOff className="w-3 h-3 shrink-0" />
                        <span>Save failed</span>
                      </span>
                    ) : syncStatus === "saving" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-teal-700">
                        <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                        <span>Saving to Cloud...</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <Cloud className="w-3 h-3 shrink-0" />
                        <span>Saved to Cloud</span>
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              {syncStatus === "error" && (
                <div className="pt-1.5 border-t border-rose-200 space-y-1.5">
                  <div className="text-[11px] font-medium text-rose-800">
                    Cloud save failed. Please retry.
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryCloudSave}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Save</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetStages2To4}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Stages 2–4 Only</span>
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Contextual Breadcrumb */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">
                  {state.ventureProfile.name}
                </span>
                <span aria-hidden="true">/</span>
                <span>
                  {state.activeStage === 1 &&
                    "Stage 1: Session 11 Positioning & War Room"}
                  {state.activeStage === 2 && "Stage 2: Revenue & Pricing"}
                  {state.activeStage === 3 && "Stage 3: Market Size & Demand"}
                  {state.activeStage === 4 && "Stage 4: Go-to-Market"}
                  {state.activeStage === 5 && "NEXUS Venture Strategy Dashboard"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="hidden sm:inline text-slate-500">
                  Sequential Mode: Stage 2 → Stage 3 → Stage 4 → Dashboard
                </span>
                {syncStatus === "error" ? (
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                    <CloudOff className="w-3.5 h-3.5 shrink-0" />
                    <span>Cloud save failed. Please retry.</span>
                    <button
                      type="button"
                      onClick={handleRetryCloudSave}
                      className="underline font-semibold hover:text-rose-950 cursor-pointer"
                    >
                      Retry
                    </button>
                  </span>
                ) : syncStatus === "saving" ? (
                  <span className="inline-flex items-center gap-1.5 text-teal-700 font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Saving to Cloud...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium tabular-nums">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>
                      Saved to Cloud
                      {lastCloudSavedAt
                        ? ` · ${new Date(lastCloudSavedAt).toLocaleTimeString()}`
                        : ""}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {state.activeStage === 1 && (
              <Stage1Positioning
                venture={state.ventureProfile}
                stage1={state.stage1}
                liveChallenges={state.liveChallenges}
                onRunChallenge={() => handleRunChallenge(1)}
                isChallenging={isChallenging}
                challengeError={challengeError}
                onProceedToStage2={() => setActiveStage(2)}
                onOpenPdf={() => setShowPdfModal(true)}
              />
            )}

            {state.activeStage === 2 && (
              <Stage2RevenuePricing
                venture={state.ventureProfile}
                competitors={state.stage1.competitors}
                positioningStatement={
                  state.stage1.positioning.positioningStatement
                }
                data={state.stage2}
                stage3Unlocked={stage3Unlocked}
                onChange={handleStage2Change}
                onCompleteStage={handleCompleteStage2}
                onGoToStage3={() => setActiveStage(3)}
                liveChallenges={state.liveChallenges}
                onRunChallenge={() => handleRunChallenge(2)}
                isChallenging={isChallenging}
                challengeError={challengeError}
              />
            )}

            {state.activeStage === 3 && (
              <Stage3MarketSizeDemand
                venture={state.ventureProfile}
                stage2={state.stage2}
                data={state.stage3}
                unlocked={stage3Unlocked}
                stage4Unlocked={stage4Unlocked}
                onChange={handleStage3Change}
                onCompleteStage={handleCompleteStage3}
                onGoToStage2={() => setActiveStage(2)}
                onGoToStage4={() => setActiveStage(4)}
                liveChallenges={state.liveChallenges}
                onRunChallenge={() => handleRunChallenge(3)}
                isChallenging={isChallenging}
                challengeError={challengeError}
              />
            )}

            {state.activeStage === 4 && (
              <Stage4GoToMarket
                venture={state.ventureProfile}
                positioningStatement={
                  state.stage1.positioning.positioningStatement
                }
                stage2={state.stage2}
                stage3={state.stage3}
                data={state.stage4}
                unlocked={stage4Unlocked}
                onChange={handleStage4Change}
                onCompleteStage={handleCompleteStage4}
                onGoToStage3={() => setActiveStage(3)}
                onOpenDashboard={() => setActiveStage(5)}
                onExportDossier={handleExportDossier}
                liveChallenges={state.liveChallenges}
                onRunChallenge={() => handleRunChallenge(4)}
                isChallenging={isChallenging}
                challengeError={challengeError}
              />
            )}

            {state.activeStage === 5 && (
              <Stage5StrategyDashboard
                venture={state.ventureProfile}
                stage1={state.stage1}
                stage2={state.stage2}
                stage3={state.stage3}
                stage4={state.stage4}
                unlocked={stage5Unlocked}
                onGoToStage={(s) => setActiveStage(s)}
                onExportDossier={handleExportDossier}
              />
            )}
          </div>
        </main>
      </div>

      {/* Reference Venture Plan PDF Modal */}
      {showPdfModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Uploaded Venture Plan PDF"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  DGU Venture Quest — {state.ventureProfile.name} Reference PDF
                </h3>
                <p className="text-xs text-slate-500">
                  {state.ventureProfile.studentEmail} ·{" "}
                  {state.ventureProfile.institution}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close PDF viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={state.ventureProfile.referencePdfPath}
                title="FarmTrace AI Reference Venture Plan PDF"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

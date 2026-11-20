import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));

interface StrategyChallengeRequest {
  stage: 1 | 2 | 3 | 4;
  stageName: string;
  venture: {
    name: string;
    idea: string;
    geography: string;
    beachheadSegment: string;
    problemSolved: string;
    positioningStatement: string;
  };
  stagePayload: unknown;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/strategy/challenge", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "GEMINI_API_KEY is not configured in environment secrets. Please configure it in Settings > Secrets.",
    });
    return;
  }

  const body = req.body as StrategyChallengeRequest | undefined;
  if (!body || !body.venture || !body.stage) {
    res.status(400).json({ error: "Missing venture or stage payload." });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `You are the NEXUS Venture Studio Strategy Partner and War Room Red-Team Critic.
Your role is to challenge the founder's current stage work for the selected venture (${body.venture.name}) with ruthless clarity.

STRICT EVIDENCE RULES:
1. NEVER invent market data, customer counts, competitor prices, unit costs, conversion rates, or external statistics.
2. Only reference numbers, facts, and evidence explicitly present in the provided venture context and stagePayload.
3. Whenever any numeric claim, price point, cost, conversion rate, market size estimate, or channel expectation lacks cited primary evidence, explicitly classify it as "Assumption — needs validation".
4. Do NOT output numeric scores (like 85/100) or fabricated percentages.
5. Keep your response concise, practical, and directly tied to the venture's beachhead segment and current stage.`;

    const prompt = `Evaluate Stage ${body.stage}: ${body.stageName} for venture "${body.venture.name}".

Venture Context:
${JSON.stringify(body.venture, null, 2)}

Current Stage Data:
${JSON.stringify(body.stagePayload, null, 2)}

Provide:
1. A sharp diagnostic headline summarizing the strongest strategic tension.
2. 3 critical red-team questions exposing unverified assumptions or competitive vulnerabilities.
3. A list of specific claims in this stage that lack proof and must remain marked "Assumption — needs validation".
4. One concrete, low-cost War Room counter-move or validation test using the founder's actual context (no invented metrics).
5. A brief qualitative readiness assessment for unlocking or strengthening the next stage.`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            criticalQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            assumptionFlags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  claim: { type: Type.STRING },
                  status: { type: Type.STRING },
                  validationTest: { type: Type.STRING },
                },
                required: ["claim", "status", "validationTest"],
              },
            },
            warRoomCounterMove: { type: Type.STRING },
            readinessAssessment: { type: Type.STRING },
          },
          required: [
            "headline",
            "criticalQuestions",
            "assumptionFlags",
            "warRoomCounterMove",
            "readinessAssessment",
          ],
        },
      },
    });

    const text = (response.text ?? "").trim();
    if (!text) {
      res.status(502).json({ error: "Empty response from Gemini model." });
      return;
    }

    const parsed = JSON.parse(text);
    res.json({
      id: `challenge-${Date.now()}`,
      stage: body.stage,
      createdAt: new Date().toISOString(),
      ...parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to run AI strategy challenge.";
    res.status(500).json({ error: message });
  }
});

interface ProposeExperimentRequest {
  venture: {
    name: string;
    beachheadSegment: string;
    positioningStatement: string;
  };
  pricing: {
    revenueModel: string;
    sellingPrice: number | null;
    currency: string;
  };
  somCustomers: number | null;
  gtmStep1: {
    firstCustomerSegment: string;
    reachLocations: string;
    mainProblemNeed: string;
    coreMessage: string;
    callToAction: string;
  };
  channels: Array<{
    channelName: string;
    budget: number | null;
    expectedLeads: number | null;
    expectedCustomers: number | null;
  }>;
}

app.post("/api/gtm/propose-experiment", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "GEMINI_API_KEY is not configured in environment secrets. Please configure it in Settings > Secrets.",
    });
    return;
  }

  const body = req.body as ProposeExperimentRequest | undefined;
  if (!body || !body.venture) {
    res.status(400).json({ error: "Missing venture context." });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `You are a practical Go-to-Market coach inside NEXUS Venture Studio.
Propose a realistic 4-week launch experiment draft using ONLY the venture, pricing, SOM, segment, and channels already entered by the founder.
STRICT RULES:
1. Return exactly 4 weeks matching these exact phases:
   - Week 1 — Prepare
   - Week 2 — Launch
   - Week 3 — Measure
   - Week 4 — Learn & Adjust
2. Do NOT invent past results, conversion rates, or unverified customer behavior.
3. Keep actions concrete, low-cost, and directly aligned with the user's selected channels and reach locations.`;

    const prompt = `Draft a 4-week 30-day launch experiment structure for ${body.venture.name}.

Context already entered:
${JSON.stringify(body, null, 2)}

For each week (Week 1 — Prepare, Week 2 — Launch, Week 3 — Measure, Week 4 — Learn & Adjust), provide:
- weekLabel (exact label)
- action
- channel (using one of the user's selected channels if provided)
- target (concrete activity volume or milestone, never claimed results)
- metric (exact metric to track)
- responsibility (role/owner)
- learningQuestion (the key unknown this week tests)`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weeks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  weekLabel: { type: Type.STRING },
                  action: { type: Type.STRING },
                  channel: { type: Type.STRING },
                  target: { type: Type.STRING },
                  metric: { type: Type.STRING },
                  responsibility: { type: Type.STRING },
                  learningQuestion: { type: Type.STRING },
                },
                required: [
                  "weekLabel",
                  "action",
                  "channel",
                  "target",
                  "metric",
                  "responsibility",
                  "learningQuestion",
                ],
              },
            },
          },
          required: ["weeks"],
        },
      },
    });

    const text = (response.text ?? "").trim();
    if (!text) {
      res.status(502).json({ error: "Empty response from Gemini model." });
      return;
    }

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate proposed 30-day experiment.";
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distDir, "index.html"));
      });
    }
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`NEXUS Venture Studio listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

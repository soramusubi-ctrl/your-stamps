import { GoogleGenAI } from "@google/genai";

const MAX_INTENT_LENGTH = 300;
const PLAN_MODEL = "gemini-3.1-flash-preview";

type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] || text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("invalid_plan_json");
  return JSON.parse(raw.slice(start, end + 1));
}

function fallbackPlan(intent: string) {
  return {
    japaneseTitle: "気持ちを伝えるスタンプ",
    japaneseDescription: "毎日のやりとりで使いやすい、気持ちをやさしく伝えるスタンプです。",
    englishTitle: "Gentle Everyday Stickers",
    englishDescription: "Stickers for sharing small everyday feelings with family and friends.",
    stylePrompt: "cute friendly hand-drawn LINE sticker character, simple white background, clear expressive pose",
    items: [
      { text: "ありがとう", expression: "smiling warmly and saying thank you" },
      { text: "ごめんね", expression: "apologizing gently" },
      { text: "おつかれさま", expression: "caring and comforting" },
      { text: "助かる！", expression: "grateful and relieved" },
      { text: "了解！", expression: "cheerful okay sign" },
      { text: "今むり…", expression: "tired and low battery" },
      { text: "あとでね", expression: "softly asking to wait" },
      { text: "大丈夫？", expression: "worried and kind" }
    ]
  };
}

function normalizePlan(plan: any, intent: string) {
  const fallback = fallbackPlan(intent);
  const items = Array.isArray(plan?.items) ? plan.items : fallback.items;

  return {
    japaneseTitle: String(plan?.japaneseTitle || fallback.japaneseTitle).slice(0, 40),
    japaneseDescription: String(plan?.japaneseDescription || fallback.japaneseDescription).slice(0, 120),
    englishTitle: String(plan?.englishTitle || fallback.englishTitle).slice(0, 40),
    englishDescription: String(plan?.englishDescription || fallback.englishDescription).slice(0, 160),
    stylePrompt: String(plan?.stylePrompt || fallback.stylePrompt).slice(0, 240),
    items: items.slice(0, 8).map((item: any, index: number) => ({
      text: String(item?.text || fallback.items[index]?.text || "OK").replace(/\r\n/g, "\n").split("\n").slice(0, 2).map((line: string) => line.slice(0, 12)).join("\n"),
      expression: String(item?.expression || fallback.items[index]?.expression || "cute expression").slice(0, 100),
    })).concat(fallback.items).slice(0, 8),
  };
}

function sendSafeError(res: VercelResponse, error: any) {
  const message = error?.message || "unknown_error";
  console.error("Plan API Error:", message);

  if (message === "GEMINI_API_KEY is not set") {
    return res.status(500).json({ error: "設定エラー: APIキーが設定されていません。" });
  }
  if (message.includes("429") || message.includes("quota")) {
    return res.status(429).json({ error: "AIの利用制限を超えました。少し時間を置いてから再度お試しください。" });
  }

  return res.status(500).json({ error: "スタンプ案の作成に失敗しました。時間をおいて再度お試しください。" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTメソッドでリクエストしてください。" });
  }

  try {
    const { intent } = req.body || {};
    if (!intent || typeof intent !== "string") {
      return res.status(400).json({ error: "どんなスタンプにしたいか入力してください。" });
    }
    if (intent.length > MAX_INTENT_LENGTH) {
      return res.status(400).json({ error: `入力が長すぎます（最大${MAX_INTENT_LENGTH}文字）。` });
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: PLAN_MODEL,
      contents: {
        parts: [
          {
            text: `You are planning a LINE sticker set for Japanese users.
The user wants to communicate this idea: ${intent}

Create exactly 8 sticker ideas.
Each sticker text must be Japanese, short, readable, and at most 2 lines.
Avoid long sentences. Avoid aggressive or blaming tone.
Make them useful in everyday chat.
Also create LINE Creators Market title and description in Japanese and English.
Return JSON only with this schema:
{
  "japaneseTitle": "...",
  "japaneseDescription": "...",
  "englishTitle": "...",
  "englishDescription": "...",
  "stylePrompt": "English visual style prompt for a coherent sticker set",
  "items": [
    { "text": "...", "expression": "English expression/pose prompt" }
  ]
}`,
          },
        ],
      },
    });

    const text = response.text || "";
    const plan = normalizePlan(extractJson(text), intent);
    return res.status(200).json(plan);
  } catch (error: any) {
    try {
      const { intent } = req.body || {};
      return res.status(200).json(normalizePlan(fallbackPlan(String(intent || "")), String(intent || "")));
    } catch {
      return sendSafeError(res, error);
    }
  }
}

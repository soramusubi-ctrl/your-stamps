import { GoogleGenAI } from "@google/genai";

const MAX_PROMPT_LENGTH = 300;
const MAX_GENERATION_COUNT = 4;
const MAX_REFERENCE_IMAGE_BASE64_LENGTH = 7 * 1024 * 1024;
const MAX_BODY_BYTES = 9 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const MODEL_IMAGE = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

const DEFAULT_EXPRESSIONS = [
  "Happy and smiling",
  "Sad or crying",
  "Angry or frustrated",
  "Surprised or shocked",
];

type VercelRequest = {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type RateEntry = {
  startedAt: number;
  count: number;
};

let genAI: GoogleGenAI | null = null;
const requestCounts = new Map<string, RateEntry>();

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

function getHeader(req: VercelRequest, name: string) {
  const value = req.headers?.[name] || req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getClientKey(req: VercelRequest) {
  const forwarded = getHeader(req, "x-forwarded-for");
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isSameOrigin(req: VercelRequest) {
  const origin = getHeader(req, "origin");
  if (!origin) return true;

  const host = getHeader(req, "host") || getHeader(req, "x-forwarded-host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function checkRateLimit(req: VercelRequest) {
  const key = getClientKey(req);
  const now = Date.now();
  const current = requestCounts.get(key);

  if (!current || now - current.startedAt > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(key, { startedAt: now, count: 1 });
    return true;
  }

  current.count += 1;
  return current.count <= RATE_LIMIT_MAX_REQUESTS;
}

function guardRequest(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POSTメソッドでリクエストしてください。" });
    return false;
  }

  if (!isSameOrigin(req)) {
    res.status(403).json({ error: "許可されていない送信元です。" });
    return false;
  }

  if (!checkRateLimit(req)) {
    res.status(429).json({ error: "リクエスト制限を超えました。少し時間を置いてから再度お試しください。" });
    return false;
  }

  const contentLength = Number(getHeader(req, "content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    res.status(413).json({ error: "送信データが大きすぎます。画像を小さくしてから再度お試しください。" });
    return false;
  }

  return true;
}

function normalizeReferenceImage(referenceImageBase64?: unknown) {
  if (!referenceImageBase64) return undefined;
  if (typeof referenceImageBase64 !== "string") {
    throw new Error("invalid_reference_image");
  }

  const base64Data = referenceImageBase64.split(",")[1] || referenceImageBase64;
  if (base64Data.length > MAX_REFERENCE_IMAGE_BASE64_LENGTH) {
    throw new Error("reference_image_too_large");
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    throw new Error("invalid_reference_image");
  }

  return base64Data;
}

function normalizeExpressions(customExpressions: unknown, count: unknown) {
  const requestedCount = Math.min(Math.max(1, Number(count) || 1), MAX_GENERATION_COUNT);

  if (Array.isArray(customExpressions) && customExpressions.length > 0) {
    return customExpressions
      .filter((expression): expression is string => typeof expression === "string" && expression.trim().length > 0)
      .slice(0, MAX_GENERATION_COUNT)
      .map((expression) => expression.trim().replace(/[<>]/g, "").slice(0, 80));
  }

  return requestedCount === 1 ? ["Happy"] : DEFAULT_EXPRESSIONS.slice(0, requestedCount);
}

function sendSafeError(res: VercelResponse, error: any) {
  const message = error?.message || "unknown_error";
  console.error("Generate API Error:", message);

  if (message === "GEMINI_API_KEY is not set") {
    return res.status(500).json({ error: "設定エラー: APIキーが設定されていません。" });
  }
  if (message === "reference_image_too_large") {
    return res.status(400).json({ error: "参考画像が大きすぎます。小さい画像に変更してください。" });
  }
  if (message === "invalid_reference_image") {
    return res.status(400).json({ error: "参考画像の形式を確認してください。" });
  }
  if (message === "safety_block") {
    return res.status(400).json({ error: "安全フィルターにより画像生成が拒否されました。別の言葉を試してください。" });
  }
  if (message.includes("429") || message.includes("quota")) {
    return res.status(429).json({ error: "AIの利用制限を超えました。少し時間を置いてから再度お試しください。" });
  }

  return res.status(500).json({ error: "スタンプの生成に失敗しました。時間をおいて再度お試しください。" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (!guardRequest(req, res)) return;

  try {
    const { prompt, count = 4, referenceImageBase64, customExpressions } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "有効なプロンプトを入力してください。" });
    }

    const safePrompt = prompt.trim().replace(/[<>]/g, "");
    if (!safePrompt) {
      return res.status(400).json({ error: "有効なプロンプトを入力してください。" });
    }
    if (safePrompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `プロンプトが長すぎます（最大${MAX_PROMPT_LENGTH}文字）。` });
    }

    const expressionsToUse = normalizeExpressions(customExpressions, count);
    if (expressionsToUse.length === 0) {
      return res.status(400).json({ error: "有効なバリエーションを入力してください。" });
    }

    const referenceImageData = normalizeReferenceImage(referenceImageBase64);
    const ai = getAI();

    const results = await Promise.all(expressionsToUse.map(async (expression) => {
      const parts: any[] = [
        {
          text: `Create a professional sticker character: ${safePrompt}.
          Current Variation/Expression: ${expression}.
          Requirements:
          - Character only, NO TEXT in the image
          - Full body, centered character
          - Solid white background
          - Clean vector style with bold, simple outlines
          - Vibrant colors, cute and expressive
          - Professional sticker quality`,
        },
      ];

      if (referenceImageData) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceImageData,
          },
        });
        parts[0].text += " Use the provided image for character design and style reference to ensure consistency.";
      }

      const response = await ai.models.generateContent({
        model: MODEL_IMAGE,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      const candidate = response.candidates?.[0];
      if (!candidate || candidate.finishReason === "SAFETY") {
        throw new Error("safety_block");
      }

      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        }
      }

      throw new Error("no_image_data");
    }));

    return res.status(200).json({ results });
  } catch (error: any) {
    return sendSafeError(res, error);
  }
}

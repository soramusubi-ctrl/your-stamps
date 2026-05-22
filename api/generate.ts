import { GoogleGenAI } from "@google/genai";

const MAX_PROMPT_LENGTH = 300;
const MAX_GENERATION_COUNT = 8;
const MAX_REFERENCE_IMAGE_BASE64_LENGTH = 7 * 1024 * 1024;
const IMAGE_MODEL = "gemini-2.5-flash-image";
const DEFAULT_EXPRESSIONS = [
  "Happy and smiling",
  "Sad or crying",
  "Angry or frustrated",
  "Surprised or shocked",
  "Saying thank you warmly",
  "Apologizing gently",
  "Tired but kind",
  "Cheering softly",
];

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
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
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
      .map((expression) => expression.trim().slice(0, 80));
  }

  return DEFAULT_EXPRESSIONS.slice(0, requestedCount);
}

function buildGenerationPrompt(prompt: string, expression: string, hasReferenceImage: boolean) {
  if (hasReferenceImage) {
    return `Create a LINE sticker based on the provided reference image and the user prompt: ${prompt}.
Current Variation/Expression: ${expression}.

Reference image preservation rules:
- Use the provided image as the exact character source.
- Do NOT create a new character design.
- Preserve the face shape, eye shape, hairstyle, body shape, clothing, colors, silhouette, and handmade feeling as much as possible.
- Preserve the original rough, hand-drawn, simple, or childlike charm if it exists.
- Only change the expression and small pose details for the requested variation.
- Do NOT make the character look like a different person.
- Do NOT modernize, beautify, simplify, polish, or reinterpret the design too much.
- Do NOT change hairstyle, outfit, colors, species, age, body proportions, or major design features.

Sticker requirements:
- Character only, NO TEXT in the image.
- Full body if visible in the reference image.
- Centered character.
- Simple solid white background.
- Suitable for a LINE sticker while preserving the original character identity.`;
  }

  return `Create a professional sticker character: ${prompt}.
Current Variation/Expression: ${expression}.
Requirements:
- Character only, NO TEXT in the image
- Full body, centered character
- Solid white background
- Clean vector style with bold, simple outlines
- Vibrant colors, cute and expressive
- Professional sticker quality`;
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTメソッドでリクエストしてください。" });
  }

  try {
    const { prompt, count = 4, referenceImageBase64, customExpressions } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "有効なプロンプトを入力してください。" });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
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
          text: buildGenerationPrompt(prompt, expression, Boolean(referenceImageData)),
        },
      ];

      if (referenceImageData) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: referenceImageData,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
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
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("no_image_data");
    }));

    return res.status(200).json({ results });
  } catch (error: any) {
    return sendSafeError(res, error);
  }
}

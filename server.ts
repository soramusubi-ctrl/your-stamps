import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per window
    message: { error: "リクエスト制限を超えました。少し時間を置いてから再度お試しください。" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(express.json({ limit: '50mb' }));
  app.use("/api/", limiter);

  // Gemini Setup
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

  const DEFAULT_EXPRESSIONS = [
    "Happy and smiling",
    "Sad or crying",
    "Angry or frustrated",
    "Surprised or shocked"
  ];

  // API Route
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, count = 4, referenceImageBase64, customExpressions } = req.body;

      // 1. Validation
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "有効なプロンプトを入力してください。" });
      }
      if (prompt.length > 300) {
        return res.status(400).json({ error: "プロンプトが長すぎます（最大300文字）。" });
      }
      
      const stickerCount = Math.min(Math.max(1, Number(count) || 1), 8);
      
      const expressionsToUse = (customExpressions && Array.isArray(customExpressions) && customExpressions.length > 0) 
        ? customExpressions.slice(0, 8) // Limit to 8
        : (stickerCount === 1 ? ["Happy"] : DEFAULT_EXPRESSIONS.slice(0, stickerCount));

      const ai = getAI();

      const results = await Promise.all(expressionsToUse.map(async (expression) => {
        const parts: any[] = [
          {
            text: `Create a professional LINE sticker character: ${prompt}. 
            Current Variation/Expression: ${expression}.
            Requirements:
            - Character only, NO TEXT in the image
            - Full body, centered character
            - Solid white background (essential for transparency)
            - Clean vector style with bold, simple outlines
            - Vibrant colors, cute and expressive
            - Professional sticker quality`,
          },
        ];

        if (referenceImageBase64) {
          const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
          parts.push({
            inlineData: {
              mimeType: "image/png",
              data: base64Data,
            }
          });
          parts[0].text += " Use the provided image for character design and style reference to ensure consistency.";
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            },
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate || candidate.finishReason === 'SAFETY') {
          throw new Error("safety_block");
        }

        for (const part of candidate.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
        throw new Error("no_image_data");
      }));

      res.json({ results });
    } catch (error: any) {
      console.error("Server Error:", error);
      
      // Sanitized Error Responses
      if (error.message === "GEMINI_API_KEY is not set") {
        return res.status(500).json({ error: "設定エラー: APIキーが設定されていません。" });
      }
      if (error.message === "safety_block") {
        return res.status(400).json({ error: "安全フィルターにより画像生成が拒否されました。別の言葉を試してください。" });
      }
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        return res.status(429).json({ error: "AIの利用制限（クォータ）を超えました。少し時間を置いてから再度お試しください。" });
      }
      
      res.status(500).json({ error: "スタンプの生成に失敗しました。時間をおいて再度お試しください。" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

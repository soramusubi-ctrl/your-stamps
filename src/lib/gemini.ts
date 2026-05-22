export type StickerPlanItem = {
  text: string;
  expression: string;
};

export type StickerPlan = {
  japaneseTitle: string;
  japaneseDescription: string;
  englishTitle: string;
  englishDescription: string;
  stylePrompt: string;
  items: StickerPlanItem[];
};

export async function generateStickerPlan(intent: string): Promise<StickerPlan> {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ intent }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to generate sticker plan');
  }

  return response.json();
}

export async function generateCharacterImage(prompt: string, referenceImageBase64?: string): Promise<string> {
  const images = await generateStickerSet(prompt, 1, referenceImageBase64);
  return images[0];
}

export async function generateStickerSet(
  prompt: string,
  count: number = 4,
  referenceImageBase64?: string,
  customExpressions?: string[]
): Promise<string[]> {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        count,
        referenceImageBase64,
        customExpressions
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to generate stickers');
    }

    const data = await response.json();
    return data.results;
  } catch (error: any) {
    console.error("Error in generateStickerSet:", error);
    throw error;
  }
}

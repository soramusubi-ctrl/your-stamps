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

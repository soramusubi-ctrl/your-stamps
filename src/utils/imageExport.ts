export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function createResizedPng(src: string, width: number, height: number, padding = 8) {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');

  ctx.clearRect(0, 0, width, height);
  const targetW = width - padding * 2;
  const targetH = height - padding * 2;
  const scale = Math.min(targetW / img.width, targetH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const x = (width - drawW) / 2;
  const y = (height - drawH) / 2;

  ctx.drawImage(img, x, y, drawW, drawH);
  return canvas.toDataURL('image/png');
}

export async function downloadMainImage(src: string) {
  const dataUrl = await createResizedPng(src, 240, 240, 16);
  downloadDataUrl(dataUrl, 'main.png');
}

export async function downloadTabImage(src: string) {
  const dataUrl = await createResizedPng(src, 96, 74, 4);
  downloadDataUrl(dataUrl, 'tab.png');
}

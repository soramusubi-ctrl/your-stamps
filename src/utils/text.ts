export function normalizeStickerText(value: string, maxLines = 2, maxCharsPerLine = 18) {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .slice(0, maxLines)
    .map((line) => line.slice(0, maxCharsPerLine))
    .join('\n');
}

export function splitStickerText(value: string) {
  return value.replace(/\r\n/g, '\n').split('\n').slice(0, 2);
}

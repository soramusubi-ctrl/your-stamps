import type { FontOption } from '../types/sticker';

export const FONTS: FontOption[] = [
  { name: 'まる', family: '"M PLUS Rounded 1c"', fontVar: 'var(--font-rounded)' },
  { name: 'ロック', family: '"RocknRoll One"', fontVar: 'var(--font-rock)' },
  { name: 'ポップ', family: '"Hachi Maru Pop"', fontVar: 'var(--font-hachi)' },
  { name: 'キウイ', family: '"Kiwi Maru"', fontVar: 'var(--font-kiwi)' },
  { name: 'ドット', family: '"DotGothic16"', fontVar: 'var(--font-dot)' },
  { name: 'カイセイ', family: '"Kaisei Decol"', fontVar: 'var(--font-kaisei)' },
  { name: 'ゴシック', family: '"Sawarabi Gothic"', fontVar: 'var(--font-gothic)' },
];

export const COLORS = [
  '#000000', '#FFFFFF', '#FF4D4D', '#4DFF4D', '#4D4DFF', '#FFFF4D', '#FF4DFF', '#4DFFFF',
];

export const FREE_GENERATION_LIMIT = 3;
export const GALLERY_STORAGE_KEY = 'stampai_gallery';
export const GENERATION_COUNT_STORAGE_KEY = 'your_stamps_generation_count_v2';

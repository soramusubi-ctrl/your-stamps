export type AppTab = 'character' | 'text' | 'preview' | 'my-stickers' | 'guide';

export type GalleryItem = {
  id: string;
  data: string;
  date: string;
};

export type FontOption = {
  name: string;
  family: string;
  fontVar: string;
};

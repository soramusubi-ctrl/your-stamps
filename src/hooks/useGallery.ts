import { useEffect, useState } from 'react';
import type { GalleryItem } from '../types/sticker';
import { GALLERY_STORAGE_KEY } from '../constants/sticker';

export function useGallery() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (!saved) return;

    try {
      setGallery(JSON.parse(saved));
    } catch (error) {
      console.error('Failed to load gallery', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
  }, [gallery]);

  const addGalleryItem = (data: string) => {
    const newItem: GalleryItem = {
      id: Math.random().toString(36).substring(7),
      data,
      date: new Date().toISOString(),
    };
    setGallery((prev) => [newItem, ...prev]);
    return newItem;
  };

  const deleteGalleryItem = (id: string) => {
    setGallery((prev) => prev.filter((item) => item.id !== id));
  };

  return { gallery, addGalleryItem, deleteGalleryItem };
}

import { useEffect, useState } from 'react';
import { FREE_GENERATION_LIMIT, GENERATION_COUNT_STORAGE_KEY } from '../constants/sticker';

export function useGenerationLimit() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(Number(localStorage.getItem(GENERATION_COUNT_STORAGE_KEY) || '0'));
  }, []);

  const canGenerate = count < FREE_GENERATION_LIMIT;

  const consumeGeneration = () => {
    if (!canGenerate) return false;
    const next = count + 1;
    setCount(next);
    localStorage.setItem(GENERATION_COUNT_STORAGE_KEY, String(next));
    return true;
  };

  const resetGenerationCount = () => {
    setCount(0);
    localStorage.setItem(GENERATION_COUNT_STORAGE_KEY, '0');
  };

  return {
    count,
    limit: FREE_GENERATION_LIMIT,
    canGenerate,
    consumeGeneration,
    resetGenerationCount,
  };
}

import { useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { translate } from './index';

/**
 * Çeviri fonksiyonu. Dil store'dan okunduğu için dil değişince
 * bu hook'u kullanan bileşenler yeniden çizilir.
 */
export function useT() {
  const lang = useStore((s) => s.lang);
  return useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );
}

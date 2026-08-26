import { en } from './en';

export type Lang = 'tr' | 'en';

const STORAGE_KEY = 'latia_lang';

/**
 * Dil, işletme değil **cihaz** tercihidir: mutfaktaki tablet İngilizce,
 * patronun telefonu Türkçe olabilsin diye yerelde saklanır.
 */
let current: Lang = readStored();

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'tr') return v;
  } catch {
    /* localStorage kapalıysa varsayılana düş */
  }
  return 'tr';
}

export function getLang(): Lang {
  return current;
}

export function setStoredLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* yoksay */
  }
  document.documentElement.lang = l;
}

/** Sayı ve tarih biçimlendirmesi için yerel ayar */
export function getLocale(): string {
  return current === 'en' ? 'en-US' : 'tr-TR';
}

/**
 * Çeviri. Anahtar = Türkçe metin; karşılığı yoksa anahtarın kendisi döner.
 * `{isim}` yer tutucuları params ile doldurulur.
 */
export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let out = lang === 'en' ? (en[key] ?? key) : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

/** Bileşen dışından (ör. store bildirimleri) kullanım için */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(current, key, params);
}

document.documentElement.lang = current;

// ---------------------------------------------------------------------------
// Tema de dil gibi CİHAZ tercihidir: mutfak ekranı koyu, patronun telefonu
// açık olabilsin diye yerelde saklanır (işletme genelinde paylaşılmaz).
// ---------------------------------------------------------------------------
const THEME_KEY = 'latia_theme';

export function getStoredTheme(): 'light' | 'dark' {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* yoksay */
  }
  return 'light';
}

export function setStoredTheme(v: 'light' | 'dark') {
  try {
    localStorage.setItem(THEME_KEY, v);
  } catch {
    /* yoksay */
  }
}

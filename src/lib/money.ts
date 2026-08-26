import { getLocale } from '@/i18n';

/**
 * Sayıyı Türk Lirası formatında string'e çevirir.
 * Tam sayılar sade gösterilir ("390 TL"), ondalıklı tutarlar (ör. hesap
 * bölme, indirim) virgülden sonra 2 hane ile gösterilir ("83,33 TL").
 * Örn: 1234 -> "1.234 TL", 250/3 -> "83,33 TL"
 */
export function fmt(n: number): string {
  // Kayan nokta hatalarını önlemek için 2 haneye sabitle, sonra biçimlendir
  const rounded = Math.round(n * 100) / 100;
  const hasFraction = Math.abs(rounded - Math.round(rounded)) > 0.0001;
  return (
    rounded.toLocaleString(getLocale(), {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    }) + ' TL'
  );
}

/**
 * Girdi metnini fiyata çevirir. Ondalık için virgül veya nokta kabul eder,
 * en fazla 2 haneye yuvarlar. Örn: "12,50" -> 12.5, "390" -> 390, "12.5" -> 12.5
 */
export function parsePrice(s: string): number {
  // Virgülü ondalık ayırıcı kabul et, rakam ve nokta dışını at
  let str = String(s).replace(',', '.').replace(/[^0-9.]/g, '');
  // Birden fazla nokta varsa ilkini ondalık kabul et, kalanını birleştir
  const parts = str.split('.');
  if (parts.length > 2) str = parts[0] + '.' + parts.slice(1).join('');
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

import { getLocale } from '@/i18n';

export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
/** Grafik ekseni için kısa gün adı (yerel ayara göre) */
export function shortDayName(ts: number): string {
  return new Date(ts).toLocaleDateString(getLocale(), { weekday: 'short' });
}
export const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Gün anahtarı: aynı güne düşen timestamp'ler için eşit string üretir */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Verilen günün 00:00:00 timestamp'i */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Verilen günün 23:59:59.999 timestamp'i */
export function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** "22 Temmuz Salı" / "Tuesday, July 22" gibi okunur tarih */
export function formatLongDate(ts: number): string {
  return new Date(ts).toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', weekday: 'long' });
}

/** "22 Tem" / "Jul 22" gibi kısa tarih */
export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
}

/** Saat:dakika (tr) */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
}

/** <input type="date"> için YYYY-MM-DD */
export function toDateInput(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** YYYY-MM-DD -> o günün başlangıç timestamp'i */
export function fromDateInput(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

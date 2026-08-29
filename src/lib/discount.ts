import { t } from '@/i18n';

/**
 * İkram / indirim gerekçeleri.
 *
 * Sebep serbest metin olarak tutulsaydı raporlanamazdı: "ikramların %40'ı
 * şikayet kaynaklı" gibi bir çıkarım ancak sabit bir kod listesiyle mümkün.
 * Serbest açıklama ayrıca (discountNote) tutulur.
 */
export const DISCOUNT_REASONS = [
  { code: 'tanidik', label: 'Tanıdık / dost' },
  { code: 'sikayet', label: 'Şikayet / memnuniyet' },
  { code: 'hata', label: 'Yanlış hazırlandı' },
  { code: 'personel', label: 'Personel yemeği' },
  { code: 'tanitim', label: 'Tanıtım / sosyal medya' },
  { code: 'yonetim', label: 'Yönetici ikramı' },
  { code: 'diger', label: 'Diğer' },
] as const;

export type DiscountReason = (typeof DISCOUNT_REASONS)[number]['code'];

/** Kod → okunur etiket. Bilinmeyen kod olduğu gibi döner (eski kayıtlar). */
export function discountReasonLabel(code: string): string {
  const r = DISCOUNT_REASONS.find((x) => x.code === code);
  return r ? t(r.label) : code || t('Belirtilmedi');
}

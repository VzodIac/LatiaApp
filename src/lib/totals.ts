import { t } from '@/i18n';
import type { Extra, Order, OrderItem, Totals } from '@/types';

/** Bir adetin satış fiyatı (ürün + iliştirilmiş ekstralar) */
export function unitTotal(it: OrderItem, extras: Extra[]): number {
  let per = it.price;
  for (const sel of it.extras) {
    const e = extras.find((x) => x.id === sel.id);
    if (e) per += e.price * sel.qty;
  }
  return per;
}

/** Bir adetin maliyeti */
export function unitCost(it: OrderItem, extras: Extra[]): number {
  let per = it.cost;
  for (const sel of it.extras) {
    const e = extras.find((x) => x.id === sel.id);
    if (e) per += e.cost * sel.qty;
  }
  return per;
}

/** Bir sipariş satırının satış toplamı (ürün + ekstralar) × adet */
export function lineTotal(it: OrderItem, extras: Extra[]): number {
  let per = it.price;
  for (const sel of it.extras) {
    const e = extras.find((x) => x.id === sel.id);
    if (e) per += e.price * sel.qty;
  }
  return per * it.qty;
}

/** Bir sipariş satırının maliyet toplamı (kâr marjı için) */
export function lineCost(it: OrderItem, extras: Extra[]): number {
  let per = it.cost;
  for (const sel of it.extras) {
    const e = extras.find((x) => x.id === sel.id);
    if (e) per += e.cost * sel.qty;
  }
  return per * it.qty;
}

/** Bir siparişin ara toplam / indirim / genel toplam ve maliyetini hesaplar */
export function computeTotals(order: Pick<Order, 'items' | 'discountType'>, extras: Extra[]): Totals {
  let sub = 0;
  let cost = 0;
  for (const it of order.items) {
    sub += lineTotal(it, extras);
    cost += lineCost(it, extras);
  }

  let disc = 0;
  if (order.discountType === 'comp') disc = sub;
  else if (order.discountType === 'p10') disc = sub * 0.1;
  else if (order.discountType === 'p15') disc = sub * 0.15;

  const total = Math.max(0, sub - disc);
  return { sub, disc, total, cost };
}

/**
 * Henüz ödenmemiş satırların toplamı — masada kalan tutar.
 * Kısmi ödemeden sonra masanın "borcu" bu kadardır; ödenen satırlar düşer.
 */
export function computeRemaining(order: Pick<Order, 'items' | 'discountType'>, extras: Extra[]): Totals {
  const unpaid = order.items.filter((it) => !it.paymentId);
  return computeTotals({ items: unpaid, discountType: order.discountType }, extras);
}

/** İndirim tipinin okunur etiketi */
export function discountLabel(type: Order['discountType']): string {
  return t({ none: 'Yok', p10: '%10 İndirim', p15: '%15 İndirim', comp: 'İkram' }[type]);
}

import type { Extra, Order } from '@/types';
import { computeTotals, lineTotal } from './totals';
import { dayKey, startOfDay, endOfDay, shortDayName } from './date';
import { t } from '@/i18n';

export type RangeKey = 'today' | 'yesterday' | 'week' | 'custom';

export interface Bar {
  label: string;
  /** 0..100 arası yükseklik yüzdesi */
  pct: number;
  active: boolean;
}

export interface TopItem {
  rank: number;
  name: string;
  qty: number;
  rev: number;
  pct: number;
}

export interface Report {
  from: number;
  to: number;
  revenue: number;
  avg: number;
  paidCount: number;
  itemCount: number;
  bars: Bar[];
  chartTitle: string;
  top: TopItem[];
}

/** Aralık sınırlarını [from, to] olarak çözer */
export function resolveRange(range: RangeKey, now: number, customFrom: number, customTo: number): [number, number] {
  if (range === 'today') return [startOfDay(now), endOfDay(now)];
  if (range === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return [startOfDay(d.getTime()), endOfDay(d.getTime())];
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return [startOfDay(d.getTime()), endOfDay(now)];
  }
  // custom — from/to hangi sırada olursa olsun normalize et
  const a = Math.min(customFrom, customTo);
  const b = Math.max(customFrom, customTo);
  return [startOfDay(a), endOfDay(b)];
}

/** Bir aralık için ciro raporu üretir */
export function buildReport(orders: Order[], extras: Extra[], range: RangeKey, now: number, customFrom: number, customTo: number): Report {
  const [from, to] = resolveRange(range, now, customFrom, customTo);
  const paid = orders.filter((o) => o.status === 'paid' && o.paidAt != null && o.paidAt >= from && o.paidAt <= to);

  let revenue = 0;
  let itemCount = 0;
  const salesMap: Record<string, { name: string; qty: number; rev: number }> = {};
  const hours: Record<number, number> = {};
  const dayRev: Record<string, number> = {};

  for (const o of paid) {
    const t = computeTotals(o, extras);
    revenue += t.total;
    const h = new Date(o.paidAt!).getHours();
    hours[h] = (hours[h] || 0) + t.total;
    dayRev[dayKey(o.paidAt!)] = (dayRev[dayKey(o.paidAt!)] || 0) + t.total;
    for (const it of o.items) {
      itemCount += it.qty;
      const s = (salesMap[it.itemId] ||= { name: it.name, qty: 0, rev: 0 });
      s.qty += it.qty;
      s.rev += lineTotal(it, extras);
    }
  }

  // en çok satanlar
  const topArr = Object.values(salesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = topArr[0]?.qty || 1;
  const top: TopItem[] = topArr.map((p, i) => ({ rank: i + 1, name: p.name, qty: p.qty, rev: p.rev, pct: Math.round((p.qty / maxQty) * 100) }));

  // grafik: aralık birden fazla gün kapsıyorsa günlük, tek gün ise saatlik
  const spanDays = Math.round((startOfDay(to) - startOfDay(from)) / 86400000) + 1;
  let bars: Bar[];
  let chartTitle: string;

  if (spanDays > 1) {
    const days: Date[] = [];
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const maxD = Math.max(1, ...days.map((d) => dayRev[dayKey(d.getTime())] || 0));
    bars = days.map((d) => {
      const v = dayRev[dayKey(d.getTime())] || 0;
      return { label: shortDayName(d.getTime()), pct: Math.round((v / maxD) * 100), active: v > 0 };
    });
    chartTitle = t('Günlük Ciro ({n} gün)', { n: spanDays });
  } else {
    const hourList = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const maxH = Math.max(1, ...hourList.map((h) => hours[h] || 0));
    bars = hourList.map((h) => {
      const v = hours[h] || 0;
      return { label: String(h), pct: Math.round((v / maxH) * 100), active: v > 0 };
    });
    chartTitle = t('Saatlik Yoğunluk');
  }

  return {
    from,
    to,
    revenue,
    avg: paid.length ? revenue / paid.length : 0,
    paidCount: paid.length,
    itemCount,
    bars,
    chartTitle,
    top,
  };
}

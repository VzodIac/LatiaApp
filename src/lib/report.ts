import type { Extra, Order } from '@/types';
import { computeTotals, lineTotal } from './totals';
import { dayKey, startOfDay, endOfDay, shortDayName } from './date';
import { discountReasonLabel } from './discount';
import { t } from '@/i18n';

export type RangeKey = 'today' | 'yesterday' | 'week' | 'custom';

export interface Bar {
  label: string;
  /** 0..100 arası yükseklik yüzdesi */
  pct: number;
  active: boolean;
}

/** Çok satanlar listesinin yiyecek/içecek kırılımı */
export type TopFilter = 'all' | 'food' | 'drink';

export interface TopItem {
  rank: number;
  name: string;
  /** Satış anında dondurulmuş kategori adı (eski kayıtlarda boş olabilir) */
  category: string;
  qty: number;
  rev: number;
  pct: number;
}

/** Bir garsonun aralık içindeki performansı */
export interface WaiterStat {
  rank: number;
  name: string;
  revenue: number;
  orders: number;
  guests: number;
  /** Kişi başı ortalama harcama — sadece salon adisyonlarından */
  perGuest: number;
  discount: number;
  /** İkramın ara toplama oranı (%) — denetim göstergesi */
  discountPct: number;
}

/** İkram/indirim gerekçesi kırılımı */
export interface DiscountStat {
  code: string;
  label: string;
  amount: number;
  count: number;
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
  /** Salon adisyonlarındaki toplam misafir sayısı (paket hariç) */
  guests: number;
  /** Kişi başı ortalama harcama — restoranların temel metriği */
  perGuest: number;
  discountTotal: number;
  /** İkramın brüt satışa oranı (%) */
  discountPct: number;
  discounts: DiscountStat[];
  waiters: WaiterStat[];
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
export function buildReport(
  orders: Order[],
  extras: Extra[],
  range: RangeKey,
  now: number,
  customFrom: number,
  customTo: number,
  topFilter: TopFilter = 'all',
): Report {
  const [from, to] = resolveRange(range, now, customFrom, customTo);
  const paid = orders.filter((o) => o.status === 'paid' && o.paidAt != null && o.paidAt >= from && o.paidAt <= to);

  let revenue = 0;
  let itemCount = 0;
  let subtotal = 0;
  let discountTotal = 0;
  // Kişi başı harcama yalnızca salon adisyonlarından hesaplanır; paket
  // siparişlerin misafir sayısı yoktur ve ortalamayı bozar.
  let guests = 0;
  let dineInRevenue = 0;
  const salesMap: Record<string, { name: string; category: string; station: string; qty: number; rev: number }> = {};
  const hours: Record<number, number> = {};
  const dayRev: Record<string, number> = {};
  const discMap: Record<string, { amount: number; count: number }> = {};
  const waiterMap: Record<string, { revenue: number; orders: number; guests: number; dineIn: number; sub: number; disc: number }> = {};
  // Döngü içinde `t` computeTotals sonucuna gölgelendiği için i18n burada çözülür
  const unknownWaiter = t('Bilinmiyor');

  for (const o of paid) {
    const t = computeTotals(o, extras);
    revenue += t.total;
    subtotal += t.sub;
    discountTotal += t.disc;

    const dineIn = o.kind !== 'paket';
    if (dineIn) {
      guests += Math.max(1, o.guestCount);
      dineInRevenue += t.total;
    }

    const h = new Date(o.paidAt!).getHours();
    hours[h] = (hours[h] || 0) + t.total;
    dayRev[dayKey(o.paidAt!)] = (dayRev[dayKey(o.paidAt!)] || 0) + t.total;

    if (t.disc > 0) {
      const code = o.discountReason || '';
      const d = (discMap[code] ||= { amount: 0, count: 0 });
      d.amount += t.disc;
      d.count += 1;
    }

    const wname = o.waiter || unknownWaiter;
    const w = (waiterMap[wname] ||= { revenue: 0, orders: 0, guests: 0, dineIn: 0, sub: 0, disc: 0 });
    w.revenue += t.total;
    w.orders += 1;
    w.sub += t.sub;
    w.disc += t.disc;
    if (dineIn) {
      w.guests += Math.max(1, o.guestCount);
      w.dineIn += t.total;
    }

    for (const it of o.items) {
      itemCount += it.qty;
      const s = (salesMap[it.itemId] ||= { name: it.name, category: it.categoryName, station: it.station, qty: 0, rev: 0 });
      // Eski kayıtlarda kategori snapshot'ı yok; sonradan gelen doluysa kullan
      if (!s.category && it.categoryName) s.category = it.categoryName;
      s.qty += it.qty;
      s.rev += lineTotal(it, extras);
    }
  }

  // en çok satanlar — istasyon snapshot'ı yiyecek/içecek ayrımını eski
  // kayıtlarda da verir (kategori adı sonradan eklendi)
  const sales = Object.values(salesMap).filter((p) =>
    topFilter === 'all' ? true : topFilter === 'food' ? p.station === 'kitchen' : p.station === 'bar',
  );
  const topArr = sales.sort((a, b) => b.qty - a.qty).slice(0, 5);
  const maxQty = topArr[0]?.qty || 1;
  const top: TopItem[] = topArr.map((p, i) => ({
    rank: i + 1,
    name: p.name,
    category: p.category,
    qty: p.qty,
    rev: p.rev,
    pct: Math.round((p.qty / maxQty) * 100),
  }));

  const discounts: DiscountStat[] = Object.entries(discMap)
    .map(([code, d]) => ({
      code,
      label: discountReasonLabel(code),
      amount: d.amount,
      count: d.count,
      pct: discountTotal > 0 ? Math.round((d.amount / discountTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const waiters: WaiterStat[] = Object.entries(waiterMap)
    .map(([name, w]) => ({
      rank: 0,
      name,
      revenue: w.revenue,
      orders: w.orders,
      guests: w.guests,
      perGuest: w.guests > 0 ? w.dineIn / w.guests : 0,
      discount: w.disc,
      discountPct: w.sub > 0 ? Math.round((w.disc / w.sub) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .map((w, i) => ({ ...w, rank: i + 1 }));

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
    guests,
    perGuest: guests > 0 ? dineInRevenue / guests : 0,
    discountTotal,
    discountPct: subtotal > 0 ? Math.round((discountTotal / subtotal) * 1000) / 10 : 0,
    discounts,
    waiters,
  };
}

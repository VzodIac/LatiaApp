import type { Extra, Order } from '@/types';
import { computeTotals, lineCost, lineTotal } from './totals';
import { dayKey, shortDayName, startOfDay } from './date';

/**
 * Reçete tabanlı kârlılık.
 *
 * Maliyet satış anında dondurulduğu için (order_items.unit_cost) buradaki
 * geçmiş marjlar, malzeme fiyatları sonradan değişse bile doğru kalır.
 *
 * İndirim ve ikram adisyon düzeyinde uygulanır; satır düzeyine oransal
 * dağıtılır. Aksi hâlde tamamen ikram edilen bir adisyon raporda tam ciro
 * ve tam kâr gibi görünürdü.
 *
 * Maliyeti girilmemiş ürünlerin maliyeti 0 görünür — bu yüzden "maliyeti
 * bilinmeyen" cironun payı ayrıca raporlanır, yoksa marj olduğundan yüksek okunur.
 */
export interface ProfitRow {
  itemId: string;
  name: string;
  category: string;
  qty: number;
  /** Brüt satış — indirim öncesi */
  gross: number;
  /** Bu satıra düşen indirim/ikram payı */
  discount: number;
  /** Net ciro — indirim sonrası */
  revenue: number;
  cost: number;
  /** Net kâr = net ciro − maliyet */
  profit: number;
  /** Net kâr marjı (%) */
  margin: number;
  costMissing: boolean;
}

/** Gün bazında özet */
export interface ProfitDay {
  key: string;
  label: string;
  date: number;
  gross: number;
  discount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  orders: number;
}

export interface ProfitReport {
  rows: ProfitRow[];
  days: ProfitDay[];
  gross: number;
  discount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  /** Maliyeti bilinmeyen satışın net ciro içindeki payı (%) — güven göstergesi */
  unknownCostPct: number;
}

export function buildProfit(orders: Order[], extras: Extra[], from: number, to: number): ProfitReport {
  const paid = orders.filter((o) => o.status === 'paid' && o.paidAt != null && o.paidAt >= from && o.paidAt <= to);

  const map: Record<string, ProfitRow> = {};
  const dayMap: Record<string, ProfitDay> = {};

  let gross = 0;
  let discount = 0;
  let cost = 0;
  let unknownRevenue = 0;

  for (const o of paid) {
    const tot = computeTotals(o, extras);
    // İndirim satırlara ciro payları oranında dağıtılır
    const ratio = tot.sub > 0 ? tot.total / tot.sub : 1;

    const dk = dayKey(o.paidAt!);
    const day = (dayMap[dk] ||= {
      key: dk,
      label: shortDayName(o.paidAt!),
      date: startOfDay(o.paidAt!),
      gross: 0,
      discount: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      margin: 0,
      orders: 0,
    });
    day.orders += 1;

    for (const it of o.items) {
      const g = lineTotal(it, extras);
      const net = g * ratio;
      const c = lineCost(it, extras);

      gross += g;
      discount += g - net;
      cost += c;
      if (c <= 0) unknownRevenue += net;

      day.gross += g;
      day.discount += g - net;
      day.cost += c;

      const key = it.itemId || it.name;
      const row = (map[key] ||= {
        itemId: key,
        name: it.name,
        category: it.categoryName,
        qty: 0,
        gross: 0,
        discount: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        costMissing: false,
      });
      if (!row.category && it.categoryName) row.category = it.categoryName;
      row.qty += it.qty;
      row.gross += g;
      row.discount += g - net;
      row.cost += c;
      if (c <= 0) row.costMissing = true;
    }
  }

  const finish = <T extends { gross: number; discount: number; cost: number }>(x: T) => {
    const revenue = x.gross - x.discount;
    const profit = revenue - x.cost;
    return {
      ...x,
      revenue,
      profit,
      margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
    };
  };

  const rows = Object.values(map)
    .map(finish)
    .sort((a, b) => b.profit - a.profit);

  const days = Object.values(dayMap)
    .map(finish)
    .sort((a, b) => a.date - b.date);

  const revenue = gross - discount;
  return {
    rows,
    days,
    gross,
    discount,
    revenue,
    cost,
    profit: revenue - cost,
    margin: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : 0,
    unknownCostPct: revenue > 0 ? Math.round((unknownRevenue / revenue) * 1000) / 10 : 0,
  };
}

/** Bahşiş havuzunun garsonlara dağıtımı */
export type TipSplitMode = 'equal' | 'byOrders';

export interface TipShare {
  name: string;
  orders: number;
  /** Bu garsonun tahsil ettiği bahşiş (havuz payı değil) */
  collected: number;
  /** Havuzdan hak edilen pay */
  share: number;
}

export interface TipPool {
  total: number;
  shares: TipShare[];
}

/**
 * Havuz modelinde bahşiş garsona değil işletmeye gelir ve sonra paylaşılır;
 * bu yüzden "kim topladı" ile "kim ne alacak" ayrı hesaplanır.
 *
 * Sektör normu çalışılan saate göre dağıtımdır; vardiya takibi (shifts)
 * henüz kullanılmadığı için adisyon sayısı yaklaşık ölçü olarak sunuluyor.
 */
export function buildTipPool(
  orders: Order[],
  from: number,
  to: number,
  mode: TipSplitMode,
  staffNames: string[],
): TipPool {
  const paid = orders.filter((o) => o.status === 'paid' && o.paidAt != null && o.paidAt >= from && o.paidAt <= to);

  const stats: Record<string, { orders: number; collected: number }> = {};
  for (const n of staffNames) stats[n] = { orders: 0, collected: 0 };

  let total = 0;
  for (const o of paid) {
    total += o.tipTotal;
    const s = (stats[o.waiter] ||= { orders: 0, collected: 0 });
    s.orders += 1;
    s.collected += o.tipTotal;
  }

  const names = Object.keys(stats);
  const totalOrders = names.reduce((a, n) => a + stats[n].orders, 0);
  // Adisyonu olmayan personel havuzdan pay almaz
  const active = names.filter((n) => stats[n].orders > 0);

  const shares: TipShare[] = names.map((name) => {
    const st = stats[name];
    let share = 0;
    if (total > 0 && st.orders > 0) {
      share = mode === 'equal' ? total / active.length : totalOrders > 0 ? (total * st.orders) / totalOrders : 0;
    }
    return { name, orders: st.orders, collected: st.collected, share: Math.round(share * 100) / 100 };
  });

  shares.sort((a, b) => b.share - a.share || b.orders - a.orders);
  return { total, shares };
}

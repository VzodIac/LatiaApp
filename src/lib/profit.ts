import type { Extra, Order } from '@/types';
import { lineCost, lineTotal } from './totals';

/**
 * Reçete tabanlı kârlılık.
 *
 * Maliyet satış anında dondurulduğu için (order_items.unit_cost) buradaki
 * geçmiş marjlar, malzeme fiyatları sonradan değişse bile doğru kalır.
 * Maliyeti girilmemiş ürünlerin maliyeti 0 görünür — bu yüzden "maliyeti
 * bilinmeyen" satır sayısı ayrıca raporlanır, yoksa marj olduğundan yüksek okunur.
 */
export interface ProfitRow {
  itemId: string;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  /** Brüt kâr marjı (%) */
  margin: number;
  /** Maliyeti girilmemiş (reçetesiz) satış var mı */
  costMissing: boolean;
}

export interface ProfitReport {
  rows: ProfitRow[];
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  /** Maliyeti bilinmeyen satışın ciro içindeki payı (%) — güven göstergesi */
  unknownCostPct: number;
}

export function buildProfit(orders: Order[], extras: Extra[], from: number, to: number): ProfitReport {
  const paid = orders.filter((o) => o.status === 'paid' && o.paidAt != null && o.paidAt >= from && o.paidAt <= to);

  const map: Record<string, ProfitRow> = {};
  let revenue = 0;
  let cost = 0;
  let unknownRevenue = 0;

  for (const o of paid) {
    for (const it of o.items) {
      const rev = lineTotal(it, extras);
      const cst = lineCost(it, extras);
      revenue += rev;
      cost += cst;
      if (cst <= 0) unknownRevenue += rev;

      const key = it.itemId || it.name;
      const row = (map[key] ||= {
        itemId: key,
        name: it.name,
        category: it.categoryName,
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        costMissing: false,
      });
      if (!row.category && it.categoryName) row.category = it.categoryName;
      row.qty += it.qty;
      row.revenue += rev;
      row.cost += cst;
      if (cst <= 0) row.costMissing = true;
    }
  }

  const rows = Object.values(map)
    .map((r) => ({
      ...r,
      profit: r.revenue - r.cost,
      margin: r.revenue > 0 ? Math.round(((r.revenue - r.cost) / r.revenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  return {
    rows,
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

import { supabase } from '@/lib/supabase';
import type {
  Category,
  Extra,
  Ingredient,
  ItemStatus,
  MenuItem,
  Order,
  OrderItem,
  PaymentMethod,
  RecipeItem,
  SelectedExtra,
  Settings,
  Station,
  TableDef,
  Waiter,
} from '@/types';

/**
 * Supabase veri katmanı.
 *
 * Postgres tarafında veri normalize edilmiştir (orders / order_items /
 * order_item_extras) çünkü analiz SQL'i böyle çalışır. Uygulama tarafında ise
 * sipariş satırları adisyonun içinde gömülü taşınır. Bu dosya iki şekil
 * arasındaki çeviriyi yapan tek yerdir.
 */

const num = (v: unknown, d = 0) => (v == null ? d : Number(v));
const ts = (v: unknown): number | null => (v ? Date.parse(String(v)) : null);
const iso = (v: number | null | undefined) => (v ? new Date(v).toISOString() : null);
export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------------------
// İşletme
// ---------------------------------------------------------------------------
let businessId: string | null = null;

export async function loadBusinessId(): Promise<string> {
  if (businessId) return businessId;
  const { data, error } = await supabase.from('businesses').select('id').limit(1).single();
  if (error) throw new Error(`İşletme bulunamadı: ${error.message}`);
  businessId = data.id as string;
  return businessId;
}

// ---------------------------------------------------------------------------
// Satır → domain dönüşümleri
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function toCategory(r: Row): Category {
  return {
    id: String(r.id),
    name: String(r.name),
    station: (r.station as Station) ?? 'kitchen',
    allowExtras: Boolean(r.allow_extras),
    sort: num(r.sort),
  };
}

function toTable(r: Row): TableDef {
  return {
    id: String(r.id),
    number: num(r.number),
    name: String(r.name),
    section: (r.section as string) ?? null,
    seats: num(r.seats, 4),
    active: r.active !== false,
    sort: num(r.sort),
  };
}

function toMenuItem(r: Row): MenuItem {
  return {
    id: String(r.id),
    catId: String(r.category_id),
    name: String(r.name),
    price: num(r.price),
    cost: num(r.cost),
    desc: (r.description as string) ?? '',
    kcal: r.kcal == null ? null : num(r.kcal),
    allergens: (r.allergens as string[]) ?? [],
    station: (r.station as Station) ?? null,
    soldOut: Boolean(r.sold_out),
    sort: num(r.sort),
  };
}

function toExtra(r: Row): Extra {
  return {
    id: String(r.id),
    name: String(r.name),
    price: num(r.price),
    cost: num(r.cost),
    sort: num(r.sort),
  };
}

function toIngredient(r: Row): Ingredient {
  return {
    id: String(r.id),
    name: String(r.name),
    unit: (r.unit as string) ?? 'g',
    costPerUnit: num(r.cost_per_unit),
    allergens: (r.allergens as string[]) ?? [],
    supplier: (r.supplier as string) ?? null,
    active: r.active !== false,
  };
}

function toRecipeItem(r: Row): RecipeItem {
  return {
    id: String(r.id),
    menuItemId: (r.menu_item_id as string) ?? null,
    extraId: (r.extra_id as string) ?? null,
    ingredientId: String(r.ingredient_id),
    qty: num(r.qty),
    note: (r.note as string) ?? null,
    sort: num(r.sort),
  };
}

function toWaiter(r: Row): Waiter {
  return {
    id: String(r.id),
    name: String(r.name),
    pin: String(r.pin),
    role: (r.role as string) ?? 'waiter',
  };
}

function toOrder(r: Row, items: OrderItem[]): Order {
  return {
    id: String(r.id),
    kind: (r.kind as Order['kind']) ?? 'table',
    label: String(r.label),
    table: r.table_no == null ? null : num(r.table_no),
    name: (r.label as string) ?? null,
    guestCount: num(r.guest_count, 1),
    waiter: (r.waiter_name as string) ?? '',
    staffId: (r.staff_id as string) ?? null,
    items,
    status: (r.status as Order['status']) ?? 'open',
    createdAt: ts(r.opened_at) ?? Date.now(),
    paidAt: ts(r.paid_at),
    paymentMethod: (r.payment_method as Order['paymentMethod']) ?? null,
    discountType: (r.discount_type as Order['discountType']) ?? 'none',
    splitCount: num(r.split_count, 1),
  };
}

function toOrderItem(r: Row, selectedExtras: SelectedExtra[]): OrderItem {
  return {
    uid: String(r.id),
    itemId: (r.menu_item_id as string) ?? '',
    name: String(r.name),
    price: num(r.unit_price),
    cost: num(r.unit_cost),
    qty: num(r.qty, 1),
    note: (r.note as string) ?? '',
    extras: selectedExtras,
    station: (r.station as Station) ?? 'kitchen',
    kdsStatus: (r.status as ItemStatus) ?? 'new',
    sentAt: ts(r.sent_at),
    readyAt: ts(r.ready_at),
    paymentId: (r.payment_id as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

export interface Snapshot {
  businessId: string;
  orders: Order[];
  categories: Category[];
  menuItems: MenuItem[];
  extras: Extra[];
  ingredients: Ingredient[];
  recipes: RecipeItem[];
  waiters: Waiter[];
  tables: TableDef[];
  settings: Settings;
}

/** Menü, personel, malzeme ve son dönem siparişlerini yükler */
export async function loadAll(daysOfHistory = 30): Promise<Snapshot> {
  const bid = await loadBusinessId();
  const since = new Date(Date.now() - daysOfHistory * 86400000).toISOString();

  const [cats, items, extras, ings, recipes, staff, tables, settingsRow] = await Promise.all([
    supabase.from('categories').select('*').eq('business_id', bid).order('sort'),
    supabase.from('menu_items').select('*').eq('business_id', bid).eq('active', true).order('sort'),
    supabase.from('extras').select('*').eq('business_id', bid).eq('active', true).order('sort'),
    supabase.from('ingredients').select('*').eq('business_id', bid).order('name'),
    supabase.from('recipe_items').select('*').order('sort'),
    supabase.from('staff').select('*').eq('business_id', bid).eq('active', true).order('sort'),
    supabase.from('tables').select('*').eq('business_id', bid).eq('active', true).order('sort'),
    supabase.from('settings').select('*').eq('business_id', bid).maybeSingle(),
  ]);

  const orders = await loadOrders(since);

  const waiters = (staff.data ?? []).map(toWaiter);
  const s = settingsRow.data as Row | null;

  return {
    businessId: bid,
    orders,
    categories: (cats.data ?? []).map(toCategory),
    menuItems: (items.data ?? []).map(toMenuItem),
    extras: (extras.data ?? []).map(toExtra),
    ingredients: (ings.data ?? []).map(toIngredient),
    recipes: (recipes.data ?? []).map(toRecipeItem),
    waiters,
    tables: (tables.data ?? []).map(toTable),
    settings: {
      theme: ((s?.theme as Settings['theme']) ?? 'light'),
      activeWaiter: waiters[0]?.name ?? '',
      tableCount: num(s?.table_count, 10),
    },
  };
}

/** Açık adisyonlar + verilen tarihten sonra kapanmış olanlar */
export async function loadOrders(sinceIso: string): Promise<Order[]> {
  const bid = await loadBusinessId();
  const { data: orderRows, error } = await supabase
    .from('orders')
    .select('*')
    .eq('business_id', bid)
    .or(`status.eq.open,paid_at.gte."${sinceIso}"`)
    .order('opened_at', { ascending: false });
  if (error) throw new Error(`Siparişler okunamadı: ${error.message}`);
  return assembleOrders(orderRows ?? []);
}

/**
 * Belirli tarih aralığında kapanmış adisyonlar.
 * `includeVoid` ile iptal edilenler de gelir (geçmiş/düzeltme ekranı için).
 */
export async function loadOrdersInRange(fromMs: number, toMs: number, includeVoid = false): Promise<Order[]> {
  const bid = await loadBusinessId();
  const q = supabase
    .from('orders')
    .select('*')
    .eq('business_id', bid)
    .gte('paid_at', new Date(fromMs).toISOString())
    .lte('paid_at', new Date(toMs).toISOString())
    .order('paid_at', { ascending: false });
  const { data, error } = await (includeVoid ? q.in('status', ['paid', 'void']) : q.eq('status', 'paid'));
  if (error) throw new Error(`Rapor verisi okunamadı: ${error.message}`);
  return assembleOrders(data ?? []);
}

/** Sipariş satırlarını ve ekstralarını çekip adisyonlara gömer */
async function assembleOrders(orderRows: Row[]): Promise<Order[]> {
  if (orderRows.length === 0) return [];
  const ids = orderRows.map((o) => String(o.id));

  const { data: itemRows } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', ids)
    .order('created_at');

  const itemIds = (itemRows ?? []).map((i) => String(i.id));
  const { data: extraRows } = itemIds.length
    ? await supabase.from('order_item_extras').select('*').in('order_item_id', itemIds)
    : { data: [] as Row[] };

  const extrasByItem = new Map<string, SelectedExtra[]>();
  for (const e of extraRows ?? []) {
    const key = String(e.order_item_id);
    const list = extrasByItem.get(key) ?? [];
    if (e.extra_id) list.push({ id: String(e.extra_id), qty: num(e.qty, 1) });
    extrasByItem.set(key, list);
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const r of itemRows ?? []) {
    if (r.voided) continue;
    const key = String(r.order_id);
    const list = itemsByOrder.get(key) ?? [];
    list.push(toOrderItem(r, extrasByItem.get(String(r.id)) ?? []));
    itemsByOrder.set(key, list);
  }

  return orderRows.map((o) => toOrder(o, itemsByOrder.get(String(o.id)) ?? []));
}

// ---------------------------------------------------------------------------
// Yazma
// ---------------------------------------------------------------------------

/**
 * Adisyonu ve satırlarını kaydeder.
 * Satırlar uid üzerinden upsert edilir; listede olmayanlar silinir. Böylece
 * mutfağın işaretlediği "hazır" durumu, garson yeni ürün eklediğinde kaybolmaz.
 */
export async function saveOrder(order: Order, totals: { sub: number; disc: number; total: number; cost: number }) {
  const bid = await loadBusinessId();

  const { error: oErr } = await supabase.from('orders').upsert({
    id: order.id,
    business_id: bid,
    kind: order.kind,
    label: order.label,
    table_no: order.table,
    guest_count: order.guestCount,
    staff_id: order.staffId,
    waiter_name: order.waiter,
    status: order.status,
    opened_at: iso(order.createdAt),
    paid_at: iso(order.paidAt),
    payment_method: order.paymentMethod,
    subtotal: totals.sub,
    discount_type: order.discountType,
    discount_amount: totals.disc,
    total: totals.total,
    total_cost: totals.cost,
    split_count: order.splitCount,
    updated_at: new Date().toISOString(),
  });
  if (oErr) throw new Error(`Adisyon kaydedilemedi: ${oErr.message}`);

  if (order.items.length) {
    const { error: iErr } = await supabase.from('order_items').upsert(
      order.items.map((it) => ({
        id: it.uid,
        order_id: order.id,
        menu_item_id: it.itemId || null,
        name: it.name,
        unit_price: it.price,
        unit_cost: it.cost,
        qty: it.qty,
        note: it.note,
        station: it.station,
        status: it.kdsStatus,
        sent_at: iso(it.sentAt),
        ready_at: iso(it.readyAt),
        payment_id: it.paymentId,
      })),
    );
    if (iErr) throw new Error(`Sipariş satırları kaydedilemedi: ${iErr.message}`);
  }

  // Silinen satırları temizle (uid listesi dışında kalanlar)
  const keep = order.items.map((i) => `"${i.uid}"`);
  const del = supabase.from('order_items').delete().eq('order_id', order.id);
  await (keep.length ? del.not('id', 'in', `(${keep.join(',')})`) : del);

  // Ekstralar: satır başına sil-yaz (durum taşımadıkları için güvenli)
  await syncOrderItemExtras(order);
}

async function syncOrderItemExtras(order: Order) {
  const itemIds = order.items.map((i) => i.uid);
  if (!itemIds.length) return;
  await supabase.from('order_item_extras').delete().in('order_item_id', itemIds);

  const rows = order.items.flatMap((it) =>
    it.extras.map((sel) => ({
      order_item_id: it.uid,
      extra_id: sel.id,
      qty: sel.qty,
      name: '',
      price: 0,
      cost: 0,
    })),
  );
  if (rows.length) {
    // Ad/fiyat snapshot'ını extras tablosundan doldur
    const { data: exRows } = await supabase.from('extras').select('id,name,price,cost').in('id', rows.map((r) => r.extra_id));
    const byId = new Map((exRows ?? []).map((e: Row) => [String(e.id), e]));
    for (const r of rows) {
      const e = byId.get(r.extra_id);
      if (e) {
        r.name = String(e.name);
        r.price = num(e.price);
        r.cost = num(e.cost);
      }
    }
    await supabase.from('order_item_extras').insert(rows);
  }
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw new Error(`Adisyon silinemedi: ${error.message}`);
}

/**
 * Adisyonu iptal eder (void). Kayıt silinmez ama ciroya dahil edilmez —
 * hatalı girişlerin izi kalır, gün sonu mutabakatı bozulmaz.
 */
export async function voidOrder(id: string, reason: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'void', void_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Adisyon iptal edilemedi: ${error.message}`);
}

/**
 * Kapanmış adisyonu tekrar açar: ödemeler geri alınır, satırların ödeme
 * bağlantısı temizlenir. Ürün ekleyip çıkardıktan sonra yeniden kapatılabilir.
 */
export async function reopenOrder(id: string) {
  const { data: items } = await supabase.from('order_items').select('id').eq('order_id', id);
  const uids = (items ?? []).map((i: Row) => String(i.id));
  if (uids.length) {
    const { error: iErr } = await supabase.from('order_items').update({ payment_id: null }).in('id', uids);
    if (iErr) throw new Error(`Satırlar güncellenemedi: ${iErr.message}`);
  }
  const { error: pErr } = await supabase.from('payments').delete().eq('order_id', id);
  if (pErr) throw new Error(`Ödemeler geri alınamadı: ${pErr.message}`);

  const { error } = await supabase
    .from('orders')
    .update({ status: 'open', paid_at: null, payment_method: null, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Adisyon açılamadı: ${error.message}`);
}

/** Mutfak ekranı: tek satırın durumunu güncelle */
export async function setItemStatus(uid: string, status: ItemStatus) {
  const patch: Row = { status };
  if (status === 'preparing') patch.sent_at = new Date().toISOString();
  if (status === 'ready') patch.ready_at = new Date().toISOString();
  if (status === 'served') patch.served_at = new Date().toISOString();
  const { error } = await supabase.from('order_items').update(patch).eq('id', uid);
  if (error) throw new Error(`Durum güncellenemedi: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Menü / personel / malzeme yönetimi
// ---------------------------------------------------------------------------

export async function saveMenuItem(m: MenuItem) {
  const bid = await loadBusinessId();
  const { error } = await supabase.from('menu_items').upsert({
    id: m.id,
    business_id: bid,
    category_id: m.catId,
    name: m.name,
    description: m.desc,
    price: m.price,
    kcal: m.kcal,
    allergens: m.allergens,
    station: m.station,
    sold_out: m.soldOut,
    sort: m.sort,
  });
  if (error) throw new Error(`Ürün kaydedilemedi: ${error.message}`);
}

export async function deleteMenuItem(id: string) {
  // Geçmiş siparişlerde referans kalabilir → tamamen silmek yerine pasifleştir
  const { error } = await supabase.from('menu_items').update({ active: false }).eq('id', id);
  if (error) throw new Error(`Ürün silinemedi: ${error.message}`);
}

export async function saveCategory(c: Category) {
  const bid = await loadBusinessId();
  const { error } = await supabase.from('categories').upsert({
    id: c.id,
    business_id: bid,
    name: c.name,
    station: c.station,
    allow_extras: c.allowExtras,
    sort: c.sort,
  });
  if (error) throw new Error(`Kategori kaydedilemedi: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Masalar
// ---------------------------------------------------------------------------

export async function saveTable(t: TableDef) {
  const bid = await loadBusinessId();
  const { error } = await supabase.from('tables').upsert({
    id: t.id,
    business_id: bid,
    number: t.number,
    name: t.name,
    section: t.section,
    seats: t.seats,
    active: t.active,
    sort: t.sort,
  });
  if (error) throw new Error(`Masa kaydedilemedi: ${error.message}`);
}

export async function deleteTable(id: string) {
  const { error } = await supabase.from('tables').update({ active: false }).eq('id', id);
  if (error) throw new Error(`Masa silinemedi: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Kısmi (kişi bazlı) ödeme
// ---------------------------------------------------------------------------

/**
 * Seçilen sipariş satırlarının ödemesini alır.
 * Satırlar bir ödeme kaydına bağlanır; adisyonun geri kalanı açık kalır.
 * Tüm satırlar ödendiğinde adisyon otomatik kapanır.
 *
 * @returns ödeme id'si ve adisyonun tamamen kapanıp kapanmadığı
 */
export async function payItems(args: {
  order: Order;
  /** Ödenecek satırlar ve adetleri (adet satırın tamamından az olabilir) */
  items: { uid: string; qty: number }[];
  amount: number;
  cost: number;
  method: PaymentMethod;
  staffId: string | null;
  staffName: string;
}): Promise<{ paymentId: string; orderClosed: boolean }> {
  const bid = await loadBusinessId();
  const paymentId = newId();

  const { error: pErr } = await supabase.from('payments').insert({
    id: paymentId,
    business_id: bid,
    order_id: args.order.id,
    amount: args.amount,
    cost: args.cost,
    method: args.method,
    staff_id: args.staffId,
    staff_name: args.staffName,
  });
  if (pErr) throw new Error(`Ödeme kaydedilemedi: ${pErr.message}`);

  // Tamamı ödenen satırlar doğrudan ödemeye bağlanır
  const fullUids: string[] = [];
  // Kısmen ödenenler ikiye ayrılır: ödenen adet yeni bir satır olur, kalan
  // adet mevcut satırda kalır. Böylece "2 lattenin 1'ini öde" mümkün olur.
  const partials: { it: (typeof args.order.items)[number]; payQty: number }[] = [];

  for (const sel of args.items) {
    const it = args.order.items.find((x) => x.uid === sel.uid);
    if (!it || it.paymentId) continue;
    const q = Math.min(Math.max(1, Math.round(sel.qty)), it.qty);
    if (q >= it.qty) fullUids.push(it.uid);
    else partials.push({ it, payQty: q });
  }

  if (fullUids.length) {
    const { error: uErr } = await supabase
      .from('order_items')
      .update({ payment_id: paymentId })
      .in('id', fullUids);
    if (uErr) throw new Error(`Satırlar ödemeye bağlanamadı: ${uErr.message}`);
  }

  for (const { it, payQty } of partials) {
    const newUid = newId();
    const { error: insErr } = await supabase.from('order_items').insert({
      id: newUid,
      order_id: args.order.id,
      menu_item_id: it.itemId || null,
      name: it.name,
      unit_price: it.price,
      unit_cost: it.cost,
      qty: payQty,
      note: it.note,
      station: it.station,
      status: it.kdsStatus,
      sent_at: iso(it.sentAt),
      ready_at: iso(it.readyAt),
      payment_id: paymentId,
    });
    if (insErr) throw new Error(`Satır bölünemedi: ${insErr.message}`);

    // Ekstralar yeni satıra da kopyalanır (fiyat birim başına hesaplanıyor)
    if (it.extras.length) {
      const { data: exRows } = await supabase
        .from('extras')
        .select('id,name,price,cost')
        .in('id', it.extras.map((e) => e.id));
      const byId = new Map((exRows ?? []).map((e: Row) => [String(e.id), e]));
      await supabase.from('order_item_extras').insert(
        it.extras.map((sel) => {
          const e = byId.get(sel.id);
          return {
            order_item_id: newUid,
            extra_id: sel.id,
            qty: sel.qty,
            name: e ? String(e.name) : '',
            price: e ? num(e.price) : 0,
            cost: e ? num(e.cost) : 0,
          };
        }),
      );
    }

    const { error: updErr } = await supabase
      .from('order_items')
      .update({ qty: it.qty - payQty })
      .eq('id', it.uid);
    if (updErr) throw new Error(`Kalan adet güncellenemedi: ${updErr.message}`);
  }

  // Ödenmemiş satır kaldı mı? (kısmen ödenenlerde kalan adet duruyor)
  const remaining = args.order.items.filter(
    (it) => !it.paymentId && !fullUids.includes(it.uid),
  );
  const orderClosed = remaining.length === 0;

  if (orderClosed) {
    const { error: oErr } = await supabase
      .from('orders')
      .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: args.method })
      .eq('id', args.order.id);
    if (oErr) throw new Error(`Adisyon kapatılamadı: ${oErr.message}`);
  }

  return { paymentId, orderClosed };
}

export async function saveWaiter(w: Waiter) {
  const bid = await loadBusinessId();
  const { error } = await supabase
    .from('staff')
    .upsert({ id: w.id, business_id: bid, name: w.name, pin: w.pin, role: w.role });
  if (error) throw new Error(`Garson kaydedilemedi: ${error.message}`);
}

export async function deleteWaiter(id: string) {
  const { error } = await supabase.from('staff').update({ active: false }).eq('id', id);
  if (error) throw new Error(`Garson silinemedi: ${error.message}`);
}

export async function saveIngredient(i: Ingredient) {
  const bid = await loadBusinessId();
  const { error } = await supabase.from('ingredients').upsert({
    id: i.id,
    business_id: bid,
    name: i.name,
    unit: i.unit,
    cost_per_unit: i.costPerUnit,
    allergens: i.allergens,
    supplier: i.supplier,
    active: i.active,
  });
  if (error) throw new Error(`Malzeme kaydedilemedi: ${error.message}`);
}

export async function deleteIngredient(id: string) {
  const { error } = await supabase.from('ingredients').update({ active: false }).eq('id', id);
  if (error) throw new Error(`Malzeme silinemedi: ${error.message}`);
}

export async function saveRecipeItem(r: RecipeItem) {
  const { error } = await supabase.from('recipe_items').upsert({
    id: r.id,
    menu_item_id: r.menuItemId,
    extra_id: r.extraId,
    ingredient_id: r.ingredientId,
    qty: r.qty,
    note: r.note,
    sort: r.sort,
  });
  if (error) throw new Error(`Reçete kaydedilemedi: ${error.message}`);
}

export async function deleteRecipeItem(id: string) {
  const { error } = await supabase.from('recipe_items').delete().eq('id', id);
  if (error) throw new Error(`Reçete satırı silinemedi: ${error.message}`);
}

export async function saveSettings(s: Settings) {
  const bid = await loadBusinessId();
  const { error } = await supabase
    .from('settings')
    .upsert({ business_id: bid, theme: s.theme, table_count: s.tableCount, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Ayarlar kaydedilemedi: ${error.message}`);
}

/** Tüm siparişleri sil (gerçek kullanıma temiz başlangıç) */
export async function clearOrders() {
  const bid = await loadBusinessId();
  const { error } = await supabase.from('orders').delete().eq('business_id', bid);
  if (error) throw new Error(`Siparişler temizlenemedi: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Gerçek zamanlı senkron
// ---------------------------------------------------------------------------

/**
 * Sipariş değişikliklerini dinler. Herhangi bir cihazda sipariş açılır,
 * ürün eklenir veya mutfak "hazır" derse callback tetiklenir.
 */
export function subscribeToOrders(onChange: () => void) {
  const channel = supabase
    .channel('orders-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item_extras' }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

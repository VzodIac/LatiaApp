import { create } from 'zustand';
import * as remote from '@/data/remote';
import { newId } from '@/data/remote';
import { getSession, signOutDevice } from '@/lib/supabase';
import { computeTotals, unitCost, unitTotal } from '@/lib/totals';
import { resolveRange } from '@/lib/report';
import { getLang, getStoredTheme, setStoredLang, setStoredTheme, t, type Lang } from '@/i18n';
import { beep, systemNotify } from '@/lib/notify';
import { parsePrice } from '@/lib/money';
import type {
  Category,
  DiscountType,
  Extra,
  Ingredient,
  ItemStatus,
  MenuItem,
  Order,
  OrderKind,
  PaymentMethod,
  RecipeItem,
  Settings,
  Station,
  TableDef,
  ThemeName,
  Waiter,
} from '@/types';

/** Ödeme ekranında ne ödeniyor: tüm açık hesap mı, seçilen ürünler mi */
export type PayMode = 'all' | 'select';

/** Fiş ekranında gösterilecek ödeme */
export interface ReceiptData {
  orderId: string;
  label: string;
  waiter: string;
  /** Fişte yazacak satırlar — ödeme anındaki hâlleriyle saklanır */
  items: { name: string; qty: number; amount: number; extras: string[] }[];
  amount: number;
  method: PaymentMethod;
  paidAt: number;
  orderClosed: boolean;
}

type Tab = 'orders' | 'dash' | 'menu' | 'settings';
type RangeKey = 'today' | 'yesterday' | 'week' | 'custom';

interface EditorDraft {
  mode: 'new' | 'edit';
  id: string | null;
  name: string;
  price: string;
  desc: string;
  catId: string;
  soldOut: boolean;
}

interface State {
  ready: boolean;
  /** Arayüz dili (cihaz tercihi) */
  lang: Lang;
  /** Bu cihaz mutfak ekranı mı, garson cihazı mı */
  mode: 'waiter' | 'kitchen';
  /** Cihaz henüz işletmeye bağlanmadı → kurulum ekranı */
  needsDeviceLogin: boolean;
  syncing: boolean;

  // ---- veri ----
  orders: Order[];
  categories: Category[];
  menuItems: MenuItem[];
  extras: Extra[];
  ingredients: Ingredient[];
  recipes: RecipeItem[];
  waiters: Waiter[];
  tables: TableDef[];
  settings: Settings;

  // ---- oturum / kilit ----
  locked: boolean;
  loginWaiter: string | null;
  pinEntry: string;
  lockError: boolean;

  // ---- navigasyon ----
  tab: Tab;

  // ---- yeni sipariş ----
  newOrderOpen: boolean;
  newKind: OrderKind;
  nameInput: string;

  // ---- sipariş detayı ----
  orderOpen: string | null;
  browseOpen: boolean;
  browseCat: string;
  itemEdit: string | null;
  payOpen: boolean;
  /** Ödeme ekranı: tüm hesap mı, seçilen ürünler mi */
  payMode: PayMode;
  /** Kısmi ödemede seçilenler: satır uid'i → ödenecek adet */
  paySelection: Record<string, number>;
  receipt: ReceiptData | null;

  // ---- menü editörü ----
  editor: EditorDraft | null;
  catInput: string;

  // ---- dashboard ----
  range: RangeKey;
  customFrom: number;
  customTo: number;

  // ---- adisyon geçmişi / düzeltme ----
  /** Seçili aralıkta yüklenmiş kapanmış adisyonlar (iptaller dahil) */
  historyOrders: Order[];
  historyLoading: boolean;
  /** Geçmişte üzerinde işlem yapılan adisyon */
  manageOrderId: string | null;

  toast: string | null;

  // ---- actions ----
  boot: () => Promise<void>;
  refresh: () => Promise<void>;

  pickLoginWaiter: (w: string) => void;
  backToWaiterSelect: () => void;
  pinPress: (d: string) => void;
  pinDel: () => void;
  lockApp: () => void;
  unlinkDevice: () => Promise<void>;

  setTab: (t: Tab) => void;
  setTheme: (t: ThemeName) => void;
  setLang: (l: Lang) => void;
  setActiveWaiter: (w: string) => void;
  addWaiter: (name: string, pin: string) => Promise<boolean>;
  removeWaiter: (id: string) => Promise<void>;
  clearOrders: () => Promise<void>;

  openNewOrder: () => void;
  closeNewOrder: () => void;
  setNewKind: (k: OrderKind) => void;
  setNameInput: (v: string) => void;
  createTableOrder: (n: number) => void;
  createNamedOrder: () => void;

  openOrder: (id: string) => void;
  closeOrder: () => void;
  deleteOrderNow: () => void;
  setGuestCount: (n: number) => void;

  openBrowse: () => void;
  closeBrowse: () => void;
  setBrowseCat: (c: string) => void;
  addToOrder: (itemId: string) => void;
  changeQty: (uid: string, d: number) => void;
  removeUid: (uid: string) => void;
  openItemEdit: (uid: string) => void;
  closeItemEdit: () => void;
  setNote: (uid: string, v: string) => void;
  toggleExtra: (uid: string, xid: string) => void;
  changeExtraQty: (uid: string, xid: string, delta: number) => void;

  openPay: () => void;
  closePay: () => void;
  setPayMode: (m: PayMode) => void;
  togglePaySelection: (uid: string) => void;
  setPayQty: (uid: string, qty: number) => void;
  selectAllForPay: () => void;
  clearPaySelection: () => void;
  setDiscount: (t: DiscountType) => void;
  setDiscountReason: (code: string) => void;
  setDiscountNote: (v: string) => void;
  changeSplit: (d: number) => void;
  setMethod: (m: PaymentMethod) => void;
  confirmPay: () => Promise<void>;

  closeReceipt: () => void;
  newAfterReceipt: () => void;

  // ---- masalar ----
  renameTable: (id: string, name: string) => Promise<void>;
  addTable: () => Promise<void>;
  removeTable: (id: string) => Promise<void>;

  openEditor: (item: MenuItem | null) => void;
  closeEditor: () => void;
  setEditorField: (patch: Partial<EditorDraft>) => void;
  saveEditor: () => Promise<void>;
  deleteEditorItem: () => Promise<void>;
  addCategory: () => Promise<void>;
  setCatInput: (v: string) => void;

  // ---- mutfak ekranı ----
  setItemStatus: (uid: string, status: ItemStatus) => Promise<void>;

  // ---- malzeme & reçete ----
  saveIngredient: (i: Ingredient) => Promise<void>;
  removeIngredient: (id: string) => Promise<void>;
  saveRecipeItem: (r: RecipeItem) => Promise<void>;
  removeRecipeItem: (id: string) => Promise<void>;

  setRange: (r: RangeKey) => void;
  setCustomFrom: (ts: number) => void;
  setCustomTo: (ts: number) => void;

  // ---- adisyon geçmişi / düzeltme ----
  loadHistory: () => Promise<void>;
  openManageOrder: (id: string | null) => void;
  voidOrder: (id: string, reason: string) => Promise<void>;
  reopenOrder: (id: string) => Promise<void>;
  hardDeleteOrder: (id: string) => Promise<void>;

  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** Geciktirilmiş sipariş yazımı (not gibi hızlı değişen alanlar için) */
let writeTimer: ReturnType<typeof setTimeout> | undefined;
let pendingWrite: Order | null = null;
/** İlk yükleme bitene kadar bildirim üretme */
let notifyArmed = false;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | null = null;

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Bilinmeyen hata');

function blankOrder(p: Partial<Order> & Pick<Order, 'id' | 'kind' | 'label' | 'waiter'>): Order {
  return {
    table: null,
    name: null,
    guestCount: 1,
    staffId: null,
    items: [],
    status: 'open',
    createdAt: Date.now(),
    paidAt: null,
    paymentMethod: null,
    discountType: 'none',
    discountReason: '',
    discountNote: '',
    splitCount: 1,
    ...p,
  };
}

export const useStore = create<State>((set, get) => {
  /**
   * Siparişi bellekte güncelle + buluta yaz.
   *
   * `defer` ile yazma geciktirilir: not yazarken her tuş vuruşunda ağ isteği
   * göndermek arayüzü kilitliyordu. Vuruşlar tek bir yazmada birleştirilir.
   */
  const patchOrder = (id: string, fn: (o: Order) => Order, defer = false) => {
    let updated: Order | undefined;
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        updated = fn({ ...o });
        return updated;
      }),
    }));
    if (!updated) return;
    if (defer) {
      pendingWrite = updated;
      clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        const o = pendingWrite;
        pendingWrite = null;
        if (o) void persist(o);
      }, 700);
    } else {
      // Bekleyen geciktirilmiş yazma varsa bu yazma onu da kapsar
      clearTimeout(writeTimer);
      pendingWrite = null;
      void persist(updated);
    }
  };

  const persist = async (o: Order) => {
    try {
      await remote.saveOrder(o, computeTotals(o, get().extras));
    } catch (e) {
      get().showToast(errText(e));
    }
  };

  const addOrder = (o: Order) => {
    set((s) => ({ orders: [...s.orders, o] }));
    void persist(o);
  };

  /** Ürünün düşeceği istasyon: üründe tanımlıysa o, yoksa kategoriden */
  /** Satış anında dondurulacak kategori adı — sonradan yeniden adlandırılsa da rapor bozulmaz */
  const categoryNameOf = (m: MenuItem): string =>
    get().categories.find((c) => c.id === m.catId)?.name ?? '';

  const stationOf = (m: MenuItem): Station => {
    if (m.station) return m.station;
    return get().categories.find((c) => c.id === m.catId)?.station ?? 'kitchen';
  };

  /**
   * Sipariş değişikliklerinden bildirim üretir.
   * Mutfak cihazı yeni siparişi, garson cihazı hazırlanan ürünü duyar.
   * İlk yüklemede sessiz kalır (her açılışta alarm çalmasın).
   */
  const notifyChanges = (prev: Order[], next: Order[]) => {
    if (!notifyArmed) return;
    const isKitchen = get().mode === 'kitchen';
    const prevItems = new Map<string, string>();
    for (const o of prev) for (const it of o.items) prevItems.set(it.uid, it.kdsStatus);

    const labels = new Set<string>();
    let count = 0;

    for (const o of next) {
      if (o.status !== 'open') continue;
      for (const it of o.items) {
        const before = prevItems.get(it.uid);
        if (isKitchen) {
          // Mutfağa yeni düşen ürün
          if (before === undefined && it.kdsStatus === 'new') {
            labels.add(o.label);
            count += it.qty;
          }
        } else {
          // Garsona: hazır olan ürün
          if (before && before !== 'ready' && it.kdsStatus === 'ready') {
            labels.add(o.label);
            count += it.qty;
          }
        }
      }
    }

    if (!count) return;
    const where = [...labels].join(', ');
    const title = isKitchen ? t('Yeni sipariş') : t('Sipariş hazır');
    const body = isKitchen
      ? t('{where} · {n} ürün mutfağa düştü', { where, n: count })
      : t('{where} · {n} ürün hazır', { where, n: count });
    beep(isKitchen ? 'new' : 'ready');
    systemNotify(title, body);
    get().showToast(body);
  };

  /** Realtime olayları için: çok sık gelmesin diye geciktirilmiş yenileme */
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      // Kullanıcı hâlâ yazıyorsa yenilemeyi ertele; aksi halde yazdığı metin
      // sunucudan gelen eski değerle değiştirilir
      if (pendingWrite) {
        scheduleRefresh();
        return;
      }
      void get().refresh();
    }, 400);
  };

  return {
    ready: false,
    lang: getLang(),
    mode:
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/kitchen') ||
        new URLSearchParams(window.location.search).get('mode') === 'kitchen')
        ? 'kitchen'
        : 'waiter',
    needsDeviceLogin: false,
    syncing: false,

    orders: [],
    categories: [],
    menuItems: [],
    extras: [],
    ingredients: [],
    recipes: [],
    waiters: [],
    tables: [],
    settings: { theme: getStoredTheme(), activeWaiter: '', tableCount: 10 },

    locked: true,
    loginWaiter: null,
    pinEntry: '',
    lockError: false,

    tab: 'orders',

    newOrderOpen: false,
    newKind: 'table',
    nameInput: '',

    orderOpen: null,
    browseOpen: false,
    browseCat: '',
    itemEdit: null,
    payOpen: false,
    payMode: 'all',
    paySelection: {},
    receipt: null,

    editor: null,
    catInput: '',

    range: 'today',
    customFrom: Date.now(),
    customTo: Date.now(),

    historyOrders: [],
    historyLoading: false,
    manageOrderId: null,

    toast: null,

    // ---------- boot ----------
    async boot() {
      const session = await getSession();
      if (!session) {
        set({ ready: true, needsDeviceLogin: true });
        return;
      }
      try {
        const snap = await remote.loadAll();
        set({
          ready: true,
          needsDeviceLogin: false,
          orders: snap.orders,
          categories: snap.categories,
          menuItems: snap.menuItems,
          extras: snap.extras,
          ingredients: snap.ingredients,
          recipes: snap.recipes,
          waiters: snap.waiters,
          tables: snap.tables,
          // Tema cihaz tercihi — sunucudan geleni ezmesin
          settings: { ...snap.settings, theme: getStoredTheme() },
          browseCat: snap.categories[0]?.id ?? '',
        });
        unsubscribe?.();
        unsubscribe = remote.subscribeToOrders(scheduleRefresh);
        notifyArmed = true;
        void get().loadHistory();
      } catch (e) {
        set({ ready: true });
        get().showToast(errText(e));
      }
    },

    async refresh() {
      if (get().syncing) return;
      set({ syncing: true });
      try {
        const prevOrders = get().orders;
        const snap = await remote.loadAll();
        notifyChanges(prevOrders, snap.orders);
        set({
          orders: snap.orders,
          categories: snap.categories,
          menuItems: snap.menuItems,
          extras: snap.extras,
          ingredients: snap.ingredients,
          recipes: snap.recipes,
          waiters: snap.waiters,
          tables: snap.tables,
        });
      } catch (e) {
        get().showToast(errText(e));
      } finally {
        set({ syncing: false });
      }
    },

    // ---------- auth ----------
    pickLoginWaiter(w) {
      set({ loginWaiter: w, pinEntry: '', lockError: false });
    },
    backToWaiterSelect() {
      set({ loginWaiter: null, pinEntry: '', lockError: false });
    },
    pinDel() {
      set((s) => ({ pinEntry: s.pinEntry.slice(0, -1), lockError: false }));
    },
    pinPress(d) {
      const s = get();
      if (!s.loginWaiter) return;
      const p = (s.pinEntry + d).slice(0, 4);
      if (p.length >= 4) {
        const w = s.waiters.find((x) => x.name === s.loginWaiter);
        if (w && w.pin === p) {
          set({
            locked: false,
            loginWaiter: null,
            pinEntry: '',
            lockError: false,
            tab: 'orders',
            settings: { ...s.settings, activeWaiter: w.name },
          });
        } else {
          set({ pinEntry: '', lockError: true });
        }
      } else {
        set({ pinEntry: p, lockError: false });
      }
    },
    lockApp() {
      set({ locked: true, loginWaiter: null, pinEntry: '', lockError: false });
    },
    async unlinkDevice() {
      unsubscribe?.();
      unsubscribe = null;
      await signOutDevice();
      set({ needsDeviceLogin: true, locked: true, orders: [], ready: true });
    },

    // ---------- nav / settings ----------
    setTab(t) {
      set({ tab: t });
    },
    setTheme(th) {
      setStoredTheme(th);
      set((s) => ({ settings: { ...s.settings, theme: th } }));
    },
    setLang(l) {
      setStoredLang(l);
      set({ lang: l });
    },
    setActiveWaiter(w) {
      set((s) => ({ settings: { ...s.settings, activeWaiter: w } }));
    },
    async addWaiter(name, pin) {
      const nm = name.trim();
      const p = pin.trim();
      if (!nm) {
        get().showToast(t('Garson adı gerekli'));
        return false;
      }
      if (!/^\d{4}$/.test(p)) {
        get().showToast(t('PIN 4 haneli olmalı'));
        return false;
      }
      if (get().waiters.some((w) => w.name.toLowerCase() === nm.toLowerCase())) {
        get().showToast(t('Bu garson zaten var'));
        return false;
      }
      const w: Waiter = { id: newId(), name: nm, pin: p, role: 'waiter' };
      try {
        await remote.saveWaiter(w);
        set((s) => ({ waiters: [...s.waiters, w] }));
        get().showToast(t('Garson eklendi'));
        return true;
      } catch (e) {
        get().showToast(errText(e));
        return false;
      }
    },
    async removeWaiter(id) {
      const s = get();
      if (s.waiters.length <= 1) {
        get().showToast(t('En az bir garson olmalı'));
        return;
      }
      const gone = s.waiters.find((w) => w.id === id);
      try {
        await remote.deleteWaiter(id);
        const waiters = s.waiters.filter((w) => w.id !== id);
        set({
          waiters,
          settings:
            gone && s.settings.activeWaiter === gone.name
              ? { ...s.settings, activeWaiter: waiters[0].name }
              : s.settings,
        });
        get().showToast(t('Garson silindi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async clearOrders() {
      try {
        await remote.clearOrders();
        set({ orders: [], orderOpen: null, payOpen: false, browseOpen: false, receipt: null, itemEdit: null });
        get().showToast(t('Siparişler temizlendi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    // ---------- new order ----------
    openNewOrder() {
      set({ newOrderOpen: true, newKind: 'table', nameInput: '' });
    },
    closeNewOrder() {
      set({ newOrderOpen: false });
    },
    setNewKind(k) {
      set({ newKind: k, nameInput: k === 'paket' ? 'Paket' : '' });
    },
    setNameInput(v) {
      set({ nameInput: v });
    },
    createTableOrder(n) {
      const s = get();
      const existing = s.orders.find((o) => o.kind === 'table' && o.table === n && o.status === 'open');
      if (existing) {
        set({ newOrderOpen: false, orderOpen: existing.id });
        return;
      }
      const staff = s.waiters.find((w) => w.name === s.settings.activeWaiter);
      const id = newId();
      addOrder(
        blankOrder({
          id,
          kind: 'table',
          label: s.tables.find((t) => t.number === n)?.name ?? 'Masa ' + n,
          table: n,
          waiter: s.settings.activeWaiter,
          staffId: staff?.id ?? null,
        }),
      );
      set({ newOrderOpen: false, orderOpen: id, browseOpen: true });
    },
    createNamedOrder() {
      const s = get();
      const nm = (s.nameInput || '').trim() || (s.newKind === 'paket' ? 'Paket' : 'Misafir');
      const staff = s.waiters.find((w) => w.name === s.settings.activeWaiter);
      const id = newId();
      addOrder(
        blankOrder({
          id,
          kind: s.newKind === 'paket' ? 'paket' : 'name',
          label: nm,
          name: nm,
          waiter: s.settings.activeWaiter,
          staffId: staff?.id ?? null,
        }),
      );
      set({ newOrderOpen: false, nameInput: '', orderOpen: id, browseOpen: true });
    },

    // ---------- order detail ----------
    openOrder(id) {
      set({ orderOpen: id });
    },
    closeOrder() {
      set({ orderOpen: null });
    },
    setGuestCount(n) {
      const id = get().orderOpen;
      if (!id) return;
      patchOrder(id, (o) => {
        o.guestCount = Math.max(1, n);
        return o;
      });
    },
    deleteOrderNow() {
      const id = get().orderOpen;
      if (!id) return;
      set((s) => ({ orders: s.orders.filter((o) => o.id !== id), orderOpen: null, payOpen: false, browseOpen: false }));
      void remote.deleteOrder(id).catch((e) => get().showToast(errText(e)));
      get().showToast(t('Adisyon silindi'));
    },

    // ---------- items ----------
    openBrowse() {
      set({ browseOpen: true });
    },
    closeBrowse() {
      set({ browseOpen: false });
    },
    setBrowseCat(c) {
      set({ browseCat: c });
    },
    addToOrder(itemId) {
      const s = get();
      const oid = s.orderOpen;
      if (!oid) return;
      const mi = s.menuItems.find((m) => m.id === itemId);
      if (!mi || mi.soldOut) return;
      patchOrder(oid, (o) => {
        const ex = o.items.find((it) => it.itemId === itemId && it.extras.length === 0 && !it.note);
        if (ex) {
          o.items = o.items.map((it) => (it === ex ? { ...it, qty: it.qty + 1 } : it));
        } else {
          o.items = [
            ...o.items,
            {
              uid: newId(),
              itemId,
              name: mi.name,
              price: mi.price,
              cost: mi.cost,
              qty: 1,
              note: '',
              extras: [],
              categoryName: categoryNameOf(mi),
              station: stationOf(mi),
              kdsStatus: 'new',
              sentAt: null,
              readyAt: null,
              paymentId: null,
            },
          ];
        }
        return o;
      });
    },
    changeQty(uid, d) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.items = o.items.map((it) => (it.uid === uid ? { ...it, qty: it.qty + d } : it)).filter((it) => it.qty > 0);
        return o;
      });
    },
    removeUid(uid) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.items = o.items.filter((it) => it.uid !== uid);
        return o;
      });
      set({ itemEdit: null });
    },
    openItemEdit(uid) {
      set({ itemEdit: uid });
    },
    closeItemEdit() {
      set({ itemEdit: null });
    },
    setNote(uid, v) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(
        oid,
        (o) => {
          o.items = o.items.map((it) => (it.uid === uid ? { ...it, note: v } : it));
          return o;
        },
        true, // yazmayı geciktir
      );
    },
    toggleExtra(uid, xid) {
      const cur = get()
        .orders.find((o) => o.id === get().orderOpen)
        ?.items.find((it) => it.uid === uid)
        ?.extras.find((e) => e.id === xid);
      get().changeExtraQty(uid, xid, cur ? -cur.qty : 1);
    },
    /** Ekstranın adedini değiştirir; 0'a inince listeden düşer */
    changeExtraQty(uid, xid, delta) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.items = o.items.map((it) => {
          if (it.uid !== uid) return it;
          const existing = it.extras.find((e) => e.id === xid);
          if (!existing) {
            return delta > 0 ? { ...it, extras: [...it.extras, { id: xid, qty: delta }] } : it;
          }
          const qty = existing.qty + delta;
          return {
            ...it,
            extras:
              qty > 0
                ? it.extras.map((e) => (e.id === xid ? { ...e, qty } : e))
                : it.extras.filter((e) => e.id !== xid),
          };
        });
        return o;
      });
    },

    // ---------- payment ----------
    openPay() {
      set({ payOpen: true, payMode: 'all', paySelection: {} });
    },
    closePay() {
      set({ payOpen: false });
    },
    setPayMode(m) {
      set({ payMode: m, paySelection: {} });
    },
    togglePaySelection(uid) {
      const s = get();
      const it = s.orders.find((x) => x.id === s.orderOpen)?.items.find((i) => i.uid === uid);
      set((st) => {
        const next = { ...st.paySelection };
        if (next[uid]) delete next[uid];
        else next[uid] = it?.qty ?? 1; // varsayılan: satırın tamamı
        return { paySelection: next };
      });
    },
    setPayQty(uid, qty) {
      const s = get();
      const it = s.orders.find((x) => x.id === s.orderOpen)?.items.find((i) => i.uid === uid);
      const max = it?.qty ?? 1;
      const q = Math.min(Math.max(0, qty), max);
      set((st) => {
        const next = { ...st.paySelection };
        if (q <= 0) delete next[uid];
        else next[uid] = q;
        return { paySelection: next };
      });
    },
    selectAllForPay() {
      const s = get();
      const o = s.orders.find((x) => x.id === s.orderOpen);
      const next: Record<string, number> = {};
      for (const it of o?.items ?? []) if (!it.paymentId) next[it.uid] = it.qty;
      set({ paySelection: next });
    },
    clearPaySelection() {
      set({ paySelection: {} });
    },
    setDiscount(t) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.discountType = o.discountType === t ? 'none' : t;
        // İndirim kaldırılırsa gerekçe de düşer
        if (o.discountType === 'none') {
          o.discountReason = '';
          o.discountNote = '';
        }
        return o;
      });
    },
    setDiscountReason(code) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.discountReason = o.discountReason === code ? '' : code;
        return o;
      });
    },
    setDiscountNote(v) {
      const oid = get().orderOpen;
      if (!oid) return;
      // Not yazarken her tuşta ağ isteği göndermemek için geciktirilir
      patchOrder(oid, (o) => {
        o.discountNote = v;
        return o;
      }, true);
    },
    changeSplit(d) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.splitCount = Math.max(1, o.splitCount + d);
        return o;
      });
    },
    setMethod(m) {
      const oid = get().orderOpen;
      if (!oid) return;
      patchOrder(oid, (o) => {
        o.paymentMethod = m;
        return o;
      });
    },
    async confirmPay() {
      const s = get();
      const o = s.orders.find((x) => x.id === s.orderOpen);
      if (!o) return;
      if (!o.paymentMethod) {
        get().showToast(t('Ödeme tipi seç'));
        return;
      }
      // İkram/indirim gerekçesiz kapatılamaz — denetlenemeyen ikram kâr sızıntısıdır
      if (o.discountType !== 'none' && !o.discountReason) {
        get().showToast(t('İkram / indirim sebebi seç'));
        return;
      }

      const unpaid = o.items.filter((it) => !it.paymentId);
      if (!unpaid.length) {
        get().showToast(t('Ödenecek ürün yok'));
        return;
      }

      // Hangi satırdan kaç adet ödenecek
      const picks =
        s.payMode === 'select'
          ? unpaid
              .map((it) => ({ it, qty: Math.min(s.paySelection[it.uid] ?? 0, it.qty) }))
              .filter((p) => p.qty > 0)
          : unpaid.map((it) => ({ it, qty: it.qty }));

      if (!picks.length) {
        get().showToast(t('Ödenecek ürün seç'));
        return;
      }

      // İndirim tüm adisyona uygulanır; kısmi ödemede oransal yansır
      const all = computeTotals(o, s.extras);
      const ratio = all.sub > 0 ? all.total / all.sub : 1;
      const paySub = picks.reduce((a, p) => a + unitTotal(p.it, s.extras) * p.qty, 0);
      const payCost = picks.reduce((a, p) => a + unitCost(p.it, s.extras) * p.qty, 0);
      const amount = Math.round(paySub * ratio * 100) / 100;

      const staff = s.waiters.find((w) => w.name === s.settings.activeWaiter);
      const extraName = (id: string) => s.extras.find((x) => x.id === id)?.name ?? '';

      try {
        const { orderClosed } = await remote.payItems({
          order: o,
          items: picks.map((p) => ({ uid: p.it.uid, qty: p.qty })),
          amount,
          cost: payCost,
          method: o.paymentMethod,
          staffId: staff?.id ?? null,
          staffName: s.settings.activeWaiter,
        });

        set({
          payOpen: false,
          paySelection: {},
          payMode: 'all',
          orderOpen: orderClosed ? null : o.id,
          receipt: {
            orderId: o.id,
            label: o.label,
            waiter: s.settings.activeWaiter,
            items: picks.map((p) => ({
              name: p.it.name,
              qty: p.qty,
              amount: unitTotal(p.it, s.extras) * p.qty * ratio,
              extras: p.it.extras
                .map((e) => (e.qty > 1 ? `${e.qty}× ${extraName(e.id)}` : extraName(e.id)))
                .filter(Boolean),
            })),
            amount,
            method: o.paymentMethod!,
            paidAt: Date.now(),
            orderClosed,
          },
        });

        // Satır bölünmüş olabilir; doğru hâli sunucudan al
        await get().refresh();
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    closeReceipt() {
      set({ receipt: null });
    },
    newAfterReceipt() {
      set({ receipt: null, newOrderOpen: true, newKind: 'table' });
    },

    // ---------- masalar ----------
    async renameTable(id, name) {
      const tbl = get().tables.find((x) => x.id === id);
      if (!tbl) return;
      const nm = name.trim();
      if (!nm) {
        get().showToast(t('Masa adı boş olamaz'));
        return;
      }
      const updated = { ...tbl, name: nm };
      set((s) => ({ tables: s.tables.map((x) => (x.id === id ? updated : x)) }));
      try {
        await remote.saveTable(updated);
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async addTable() {
      const s = get();
      const next = s.tables.reduce((a, t) => Math.max(a, t.number), 0) + 1;
      const tbl: TableDef = {
        id: newId(),
        number: next,
        name: 'Masa ' + next,
        section: null,
        seats: 4,
        active: true,
        sort: next,
      };
      try {
        await remote.saveTable(tbl);
        set((st) => ({ tables: [...st.tables, tbl] }));
        get().showToast(t('Masa eklendi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async removeTable(id) {
      const s = get();
      const tbl = s.tables.find((x) => x.id === id);
      if (!tbl) return;
      if (s.orders.some((o) => o.status === 'open' && o.table === tbl.number)) {
        get().showToast(t('Bu masada açık adisyon var'));
        return;
      }
      try {
        await remote.deleteTable(id);
        set((st) => ({ tables: st.tables.filter((x) => x.id !== id) }));
        get().showToast(t('Masa silindi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    // ---------- menü editörü ----------
    openEditor(item) {
      if (item) {
        set({
          editor: {
            mode: 'edit',
            id: item.id,
            name: item.name,
            price: String(item.price),
            desc: item.desc,
            catId: item.catId,
            soldOut: item.soldOut,
          },
        });
      } else {
        set({
          editor: { mode: 'new', id: null, name: '', price: '', desc: '', catId: get().categories[0]?.id ?? '', soldOut: false },
        });
      }
    },
    closeEditor() {
      set({ editor: null });
    },
    setEditorField(patch) {
      set((s) => (s.editor ? { editor: { ...s.editor, ...patch } } : {}));
    },
    async saveEditor() {
      const s = get();
      const e = s.editor;
      if (!e) return;
      if (!e.name.trim()) {
        get().showToast(t('Ürün adı gerekli'));
        return;
      }
      const price = parsePrice(e.price);
      const prev = e.id ? s.menuItems.find((m) => m.id === e.id) : undefined;
      const saved: MenuItem = {
        id: e.id ?? newId(),
        catId: e.catId,
        name: e.name.trim(),
        price,
        cost: prev?.cost ?? 0,
        desc: e.desc,
        kcal: prev?.kcal ?? null,
        allergens: prev?.allergens ?? [],
        station: prev?.station ?? null,
        soldOut: e.soldOut,
        sort: prev?.sort ?? s.menuItems.reduce((a, m) => Math.max(a, m.sort), 0) + 1,
      };
      try {
        await remote.saveMenuItem(saved);
        set((st) => ({
          menuItems: prev ? st.menuItems.map((m) => (m.id === saved.id ? saved : m)) : [...st.menuItems, saved],
          editor: null,
        }));
        get().showToast(t('Kaydedildi'));
      } catch (err) {
        get().showToast(errText(err));
      }
    },
    async deleteEditorItem() {
      const e = get().editor;
      if (!e?.id) return;
      try {
        await remote.deleteMenuItem(e.id);
        set((s) => ({ menuItems: s.menuItems.filter((m) => m.id !== e.id), editor: null }));
        get().showToast(t('Ürün silindi'));
      } catch (err) {
        get().showToast(errText(err));
      }
    },
    async addCategory() {
      const n = get().catInput.trim();
      if (!n) return;
      const cat: Category = {
        id: newId(),
        name: n,
        station: 'kitchen',
        allowExtras: false,
        sort: get().categories.reduce((a, c) => Math.max(a, c.sort), 0) + 1,
      };
      try {
        await remote.saveCategory(cat);
        set((s) => ({ categories: [...s.categories, cat], catInput: '' }));
        get().showToast(t('Kategori eklendi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    setCatInput(v) {
      set({ catInput: v });
    },

    // ---------- mutfak ekranı ----------
    async setItemStatus(uid, status) {
      // Önce yerelde göster (anında tepki), sonra buluta yaz
      set((s) => ({
        orders: s.orders.map((o) => ({
          ...o,
          items: o.items.map((it) =>
            it.uid === uid
              ? {
                  ...it,
                  kdsStatus: status,
                  sentAt: status === 'preparing' ? Date.now() : it.sentAt,
                  readyAt: status === 'ready' ? Date.now() : it.readyAt,
                }
              : it,
          ),
        })),
      }));
      try {
        await remote.setItemStatus(uid, status);
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    // ---------- malzeme & reçete ----------
    async saveIngredient(i) {
      try {
        await remote.saveIngredient(i);
        set((s) => ({
          ingredients: s.ingredients.some((x) => x.id === i.id)
            ? s.ingredients.map((x) => (x.id === i.id ? i : x))
            : [...s.ingredients, i],
        }));
        get().showToast(t('Malzeme kaydedildi'));
        void get().refresh(); // maliyetler tetiklenerek güncellenir
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async removeIngredient(id) {
      try {
        await remote.deleteIngredient(id);
        set((s) => ({ ingredients: s.ingredients.filter((x) => x.id !== id) }));
        get().showToast(t('Malzeme silindi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async saveRecipeItem(r) {
      try {
        await remote.saveRecipeItem(r);
        set((s) => ({
          recipes: s.recipes.some((x) => x.id === r.id)
            ? s.recipes.map((x) => (x.id === r.id ? r : x))
            : [...s.recipes, r],
        }));
        void get().refresh();
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async removeRecipeItem(id) {
      try {
        await remote.deleteRecipeItem(id);
        set((s) => ({ recipes: s.recipes.filter((x) => x.id !== id) }));
        void get().refresh();
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    // ---------- dashboard ----------
    setRange(r) {
      set({ range: r });
      void get().loadHistory();
    },
    setCustomFrom(ts) {
      set({ customFrom: ts });
      void get().loadHistory();
    },
    setCustomTo(ts) {
      set({ customTo: ts });
      void get().loadHistory();
    },

    // ---------- adisyon geçmişi / düzeltme ----------
    async loadHistory() {
      const s = get();
      const [from, to] = resolveRange(s.range, Date.now(), s.customFrom, s.customTo);
      set({ historyLoading: true });
      try {
        const rows = await remote.loadOrdersInRange(from, to, true);
        set({ historyOrders: rows });
      } catch (e) {
        get().showToast(errText(e));
      } finally {
        set({ historyLoading: false });
      }
    },
    openManageOrder(id) {
      set({ manageOrderId: id });
    },
    async voidOrder(id, reason) {
      try {
        await remote.voidOrder(id, reason);
        set((s) => ({
          historyOrders: s.historyOrders.map((o) => (o.id === id ? { ...o, status: 'void' } : o)),
          orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'void' } : o)),
          manageOrderId: null,
        }));
        get().showToast(t('Adisyon iptal edildi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async reopenOrder(id) {
      try {
        await remote.reopenOrder(id);
        set({ manageOrderId: null, tab: 'orders', orderOpen: id });
        await get().refresh();
        await get().loadHistory();
        get().showToast(t('Adisyon yeniden açıldı'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },
    async hardDeleteOrder(id) {
      try {
        await remote.deleteOrder(id);
        set((s) => ({
          historyOrders: s.historyOrders.filter((o) => o.id !== id),
          orders: s.orders.filter((o) => o.id !== id),
          manageOrderId: null,
        }));
        get().showToast(t('Adisyon kalıcı olarak silindi'));
      } catch (e) {
        get().showToast(errText(e));
      }
    },

    showToast(msg) {
      set({ toast: msg });
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 2600);
    },
  };
});

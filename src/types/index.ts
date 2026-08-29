// ---- Domain modelleri ----
// Bu tipler UI ve veri katmanı tarafından paylaşılır. Postgres'te veri
// normalize edilmiş tablolarda durur (analiz için); uygulama içinde ise
// sipariş satırları adisyonun içine gömülü olarak taşınır (UI için pratik).
// Dönüşümü src/data/remote.ts yapar.

export type ThemeName = 'light' | 'dark';

export type OrderKind = 'table' | 'name' | 'paket';
export type OrderStatus = 'open' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'card';
export type DiscountType = 'none' | 'p10' | 'p15' | 'comp';

/** Siparişin hangi hazırlık ekranına düşeceği */
export type Station = 'kitchen' | 'bar';

/** Mutfak ekranı (KDS) akışı */
export type ItemStatus = 'new' | 'preparing' | 'ready' | 'served';

/** Menü kategorisi (ör. "Ekmek Üstü / Sandviç") */
export interface Category {
  id: string;
  name: string;
  station: Station;
  /** Bu kategorideki ürünlere ekstra (modifier) iliştirilebilir mi */
  allowExtras: boolean;
  sort: number;
}

/** Salondaki masa — adı işletmeye göre değiştirilebilir */
export interface TableDef {
  id: string;
  number: number;
  name: string;
  section: string | null;
  seats: number;
  active: boolean;
  sort: number;
}

/** Kısmi ödeme kaydı — bir adisyonun bir bölümünün ödenmesi */
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  cost: number;
  method: PaymentMethod;
  staffName: string;
  paidAt: number;
}

/** Menüdeki bir ürün */
export interface MenuItem {
  id: string;
  catId: string;
  name: string;
  price: number;
  /** Reçeteden hesaplanan güncel maliyet (kâr marjı için) */
  cost: number;
  desc: string;
  kcal: number | null;
  allergens: string[];
  /** Boşsa kategorinin istasyonu kullanılır */
  station: Station | null;
  soldOut: boolean;
  sort: number;
}

/** Ürüne iliştirilen ekstra (ör. "Glutensiz Ekmek +75") */
export interface Extra {
  id: string;
  name: string;
  price: number;
  cost: number;
  sort: number;
}

/** Malzeme — maliyetin ve alerjen bilgisinin kaynağı */
export interface Ingredient {
  id: string;
  name: string;
  /** Temel birim: g | ml | adet */
  unit: string;
  /** Temel birim başına maliyet (ör. 1 kg = 400 TL ise 0.40) */
  costPerUnit: number;
  allergens: string[];
  supplier: string | null;
  active: boolean;
}

/** Reçete satırı — bir ürün/ekstra ile malzeme arasındaki bağ */
export interface RecipeItem {
  id: string;
  menuItemId: string | null;
  extraId: string | null;
  ingredientId: string;
  qty: number;
  note: string | null;
  sort: number;
}

/** Sipariş satırına iliştirilmiş ekstra ve adedi (ör. 2× çırpılmış yumurta) */
export interface SelectedExtra {
  id: string;
  qty: number;
}

/** Bir siparişteki tek satır */
export interface OrderItem {
  uid: string;
  itemId: string;
  name: string;
  /** Satış anındaki birim fiyat (snapshot) */
  price: number;
  /** Satış anındaki birim maliyet (snapshot) — geçmiş marj bunun sayesinde doğru kalır */
  cost: number;
  qty: number;
  note: string;
  /** Seçili ekstralar ve adetleri */
  extras: SelectedExtra[];
  /** Satış anındaki kategori adı (snapshot) — kategori sonradan değişse de rapor bozulmaz */
  categoryName: string;
  station: Station;
  /** Mutfak ekranı durumu */
  kdsStatus: ItemStatus;
  sentAt: number | null;
  readyAt: number | null;
  /** Bu satır hangi ödemeye dahil edildi (null = henüz ödenmedi) */
  paymentId: string | null;
}

/** Bir adisyon / sipariş */
export interface Order {
  id: string;
  kind: OrderKind;
  /** Görünen ad: "Masa 3", "Elif H." */
  label: string;
  /** kind === 'table' ise masa no */
  table: number | null;
  /** kind === 'name'|'paket' ise misafir adı */
  name: string | null;
  /** Kişi sayısı — kişi başı harcama analizi için */
  guestCount: number;
  /** Garson adı (snapshot) */
  waiter: string;
  staffId: string | null;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  paidAt: number | null;
  paymentMethod: PaymentMethod | null;
  discountType: DiscountType;
  /** İkram / indirim gerekçesi (sabit kod — bkz. lib/discount.ts) */
  discountReason: string;
  /** Gerekçeye ek serbest açıklama */
  discountNote: string;
  splitCount: number;
}

export interface Waiter {
  id: string;
  name: string;
  pin: string;
  role: string;
}

/** Uygulama ayarları */
export interface Settings {
  theme: ThemeName;
  activeWaiter: string;
  tableCount: number;
}

/** Hesap özeti (hesaplanmış değerler) */
export interface Totals {
  sub: number;
  disc: number;
  total: number;
  /** Satılan ürünlerin maliyet toplamı */
  cost: number;
}

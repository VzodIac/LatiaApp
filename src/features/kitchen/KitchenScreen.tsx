import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatTime } from '@/lib/date';
import { Logo } from '@/components/Logo';
import { Sheet, SectionLabel } from '@/components/Sheet';
import { Signature } from '@/components/Signature';
import { NotificationSetting } from '@/components/NotificationSetting';
import type { ItemStatus, Order, OrderItem, Station } from '@/types';
import { useT } from '@/i18n/useT';

/**
 * Mutfak ekranı (KDS) — tablet veya monitörde tam ekran çalışır.
 * Adrese ?mode=kitchen eklenerek açılır.
 *
 * Akış: Yeni → Hazırlanıyor → Hazır. Ürüne dokununca bir sonraki duruma geçer.
 * Kart yaşlandıkça renk değişir (yeşil → sarı → kırmızı) ki geciken sipariş
 * ekranda kendini belli etsin.
 */

type StationFilter = Station | 'all';

const AGE_WARN_MIN = 5;
const AGE_LATE_MIN = 10;

function ageColor(minutes: number): string {
  if (minutes >= AGE_LATE_MIN) return 'var(--danger)';
  if (minutes >= AGE_WARN_MIN) return '#D9A441';
  return 'var(--good)';
}

const nextStatus = (s: ItemStatus): ItemStatus =>
  s === 'new' ? 'preparing' : s === 'preparing' ? 'ready' : 'new';

const statusLabel: Record<ItemStatus, string> = {
  new: 'Bekliyor',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  served: 'Servis edildi',
};

export function KitchenScreen() {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const menuItems = useStore((s) => s.menuItems);
  const ingredients = useStore((s) => s.ingredients);
  const recipes = useStore((s) => s.recipes);
  const extraDefs = useStore((s) => s.extras);
  const setItemStatus = useStore((s) => s.setItemStatus);
  const refresh = useStore((s) => s.refresh);
  const theme = useStore((s) => s.settings.theme);

  const [station, setStation] = useState<StationFilter>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [, tick] = useState(0);

  // Geçen süreyi canlı tutmak için periyodik yeniden çizim
  useEffect(() => {
    const t = setInterval(() => tick((v) => v + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // Yedek yoklama: mutfak ekranı saatlerce açık kalıyor ve gerçek zamanlı
  // bağlantı sessizce düşebiliyor. Düzenli yenileme, siparişlerin ekrana
  // düşmemesi riskini ortadan kaldırır (bildirimler de bu yolla tetiklenir).
  useEffect(() => {
    const t = setInterval(() => void refresh(), 25000);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const now = Date.now();

  // Açık adisyonlardaki, henüz servis edilmemiş satırlar
  const tickets = orders
    .filter((o) => o.status === 'open')
    .map((o) => ({
      order: o,
      items: o.items.filter((it) => station === 'all' || it.station === station),
    }))
    // Tamamı teslim edilen sipariş ekrandan düşer
    .filter((t) => t.items.length > 0 && t.items.some((it) => it.kdsStatus !== 'served'))
    .sort((a, b) => a.order.createdAt - b.order.createdAt);

  // "Tümü" sayacı — toplu hazırlık için bekleyen ürün adetleri
  const allDay = new Map<string, number>();
  for (const t of tickets) {
    for (const it of t.items) {
      if (it.kdsStatus === 'ready' || it.kdsStatus === 'served') continue;
      allDay.set(it.name, (allDay.get(it.name) ?? 0) + it.qty);
    }
  }
  const allDayList = [...allDay.entries()].sort((a, b) => b[1] - a[1]);

  const recipeFor = (it: OrderItem) => {
    const mi = menuItems.find((m) => m.id === it.itemId);
    if (!mi) return [];
    return recipes
      .filter((r) => r.menuItemId === mi.id)
      .map((r) => ({
        name: ingredients.find((i) => i.id === r.ingredientId)?.name ?? '—',
        qty: r.qty,
        unit: ingredients.find((i) => i.id === r.ingredientId)?.unit ?? '',
        note: r.note,
      }));
  };

  const descFor = (it: OrderItem) => menuItems.find((m) => m.id === it.itemId)?.desc ?? '';

  /** Satıra iliştirilen ekstralar — mutfağın hazırlarken görmesi şart */
  const extrasFor = (it: OrderItem) =>
    it.extras
      .map((sel) => {
        const e = extraDefs.find((x) => x.id === sel.id);
        return e ? { name: e.name, qty: sel.qty } : null;
      })
      .filter(Boolean) as { name: string; qty: number }[];

  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: '9px 18px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  });

  return (
    <div
      className={`app ${theme === 'dark' ? 'dark' : 'light'}`}
      style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Başlık */}
      <div className="kds-header" style={{ flex: 'none' }}>
        <div>
          <Logo height={26} />
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg2)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              // Logo genişliğine göre ortalanır; harf aralığı sağda fazladan
              // boşluk bıraktığı için o kadar sola kaydırılıyor
              textAlign: 'center',
              textIndent: '1.5px',
            }}
          >
            {tr('Mutfak')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setStation('all')} style={filterBtn(station === 'all')}>
            {tr('Tümü')}
          </button>
          <button onClick={() => setStation('kitchen')} style={filterBtn(station === 'kitchen')}>
            {tr('Mutfak')}
          </button>
          <button onClick={() => setStation('bar')} style={filterBtn(station === 'bar')}>
            {tr('Bar')}
          </button>
        </div>

        <div className="kds-spacer" />

        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
          {tr('{n} açık sipariş', { n: tickets.length })}
        </div>
        <button
          onClick={() => void refresh()}
          style={{ padding: '9px 16px', borderRadius: 12, border: '1px solid var(--line)', color: 'var(--accent)', fontSize: 13.5, fontWeight: 600, background: 'var(--surface2)' }}
        >
          {tr('Yenile')}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label={tr('Ayarlar')}
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--line)', color: 'var(--fg2)', fontSize: 18, background: 'var(--surface2)' }}
        >
          ⚙
        </button>
      </div>

      {/* Toplam bekleyenler */}
      {allDayList.length > 0 && (
        <div
          className="scr"
          style={{ flex: 'none', display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface2)' }}
        >
          <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '.6px', alignSelf: 'center' }}>
            {tr('Bekleyen')}
          </span>
          {allDayList.map(([name, qty]) => (
            <span
              key={name}
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 20,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                fontSize: 13,
                color: 'var(--fg)',
                whiteSpace: 'nowrap',
              }}
            >
              <b style={{ color: 'var(--accent)' }}>{qty}×</b>
              {name}
            </span>
          ))}
        </div>
      )}

      {settingsOpen && <KitchenSettings onClose={() => setSettingsOpen(false)} />}

      {/* Sipariş kartları */}
      <div className="scr" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg2)' }}>{tr('Bekleyen sipariş yok')}</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>{tr('Yeni siparişler buraya otomatik düşer')}</div>
          </div>
        ) : (
          <div className="kds-grid">
            {tickets.map(({ order, items }) => (
              <Ticket
                key={order.id}
                order={order}
                items={items}
                now={now}
                openRecipe={openRecipe}
                onToggleRecipe={(uid) => setOpenRecipe((v) => (v === uid ? null : uid))}
                onItemTap={(it) => void setItemStatus(it.uid, nextStatus(it.kdsStatus))}
                onAllReady={(its) => its.forEach((it) => void setItemStatus(it.uid, 'ready'))}
                recipeFor={recipeFor}
                descFor={descFor}
                extrasFor={extrasFor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Ticket({
  order,
  items,
  now,
  openRecipe,
  onToggleRecipe,
  onItemTap,
  onAllReady,
  recipeFor,
  descFor,
  extrasFor,
}: {
  order: Order;
  items: OrderItem[];
  now: number;
  openRecipe: string | null;
  onToggleRecipe: (uid: string) => void;
  onItemTap: (it: OrderItem) => void;
  onAllReady: (its: OrderItem[]) => void;
  recipeFor: (it: OrderItem) => { name: string; qty: number; unit: string; note: string | null }[];
  descFor: (it: OrderItem) => string;
  extrasFor: (it: OrderItem) => { name: string; qty: number }[];
}) {
  const tr = useT();
  const minutes = Math.floor((now - order.createdAt) / 60000);
  const color = ageColor(minutes);
  const pending = items.filter((it) => it.kdsStatus !== 'ready' && it.kdsStatus !== 'served');
  const allReady = pending.length === 0;

  return (
    <div
      style={{
        minWidth: 0,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderTop: `4px solid ${allReady ? 'var(--good)' : color}`,
        borderRadius: 16,
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        opacity: allReady ? 0.75 : 1,
      }}
    >
      {/* Kart başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {order.label}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 1 }}>
            {order.waiter} · {formatTime(order.createdAt)}
          </div>
        </div>
        <span
          style={{
            flex: 'none',
            padding: '5px 10px',
            borderRadius: 20,
            background: allReady ? 'var(--good)' : color,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {allReady ? tr('Hazır') : `${minutes} dk`}
        </span>
      </div>

      {/* Ürünler */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((it) => {
          const served = it.kdsStatus === 'served';
          const ready = it.kdsStatus === 'ready';
          const preparing = it.kdsStatus === 'preparing';
          const recipe = openRecipe === it.uid ? recipeFor(it) : null;
          const desc = descFor(it);
          return (
            <div key={it.uid} style={{ borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '11px 14px' }}>
                <button
                  onClick={() => !served && onItemTap(it)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    opacity: served ? 0.5 : 1,
                    cursor: served ? 'default' : 'pointer',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      minWidth: 30,
                      height: 30,
                      padding: '0 6px',
                      borderRadius: 9,
                      background: served ? 'var(--surface2)' : ready ? 'var(--good)' : preparing ? 'var(--accent)' : 'var(--surface2)',
                      color: served ? 'var(--fg2)' : ready || preparing ? '#fff' : 'var(--fg)',
                      fontSize: 15,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {served ? '✓✓' : ready ? '✓' : `${it.qty}×`}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 15,
                        fontWeight: 600,
                        color: ready || served ? 'var(--muted)' : 'var(--fg)',
                        textDecoration: ready || served ? 'line-through' : 'none',
                        lineHeight: 1.3,
                      }}
                    >
                      {it.name}
                    </span>
                    {extrasFor(it).map((x) => (
                      <span
                        key={x.name}
                        style={{
                          display: 'block',
                          fontSize: 13,
                          color: 'var(--accent)',
                          fontWeight: 700,
                          marginTop: 3,
                        }}
                      >
                        + {x.qty > 1 ? `${x.qty}× ` : ''}
                        {x.name}
                      </span>
                    ))}
                    {it.note && (
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--coral)', fontWeight: 600, marginTop: 3 }}>
                        “{it.note}”
                      </span>
                    )}
                    {served && (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--good)', fontWeight: 700, marginTop: 3 }}>
                        {tr('Teslim edildi')}
                      </span>
                    )}
                    {!ready && !served && (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                        {tr(statusLabel[it.kdsStatus])} · {tr('dokun → {status}', { status: tr(statusLabel[nextStatus(it.kdsStatus)]).toLowerCase() })}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => onToggleRecipe(it.uid)}
                  aria-label={tr('İçindekiler')}
                  style={{
                    flex: 'none',
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    border: '1px solid var(--line)',
                    color: 'var(--fg2)',
                    fontSize: 13,
                    fontWeight: 700,
                    background: openRecipe === it.uid ? 'var(--surface2)' : 'transparent',
                  }}
                >
                  ?
                </button>
              </div>

              {/* İçindekiler — yeni gelen personel için */}
              {recipe && (
                <div style={{ padding: '0 14px 12px 54px', background: 'var(--surface2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '.6px', padding: '10px 0 6px' }}>
                    {tr('İçindekiler')}
                  </div>
                  {recipe.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {desc || tr('Reçete girilmemiş — Menü sekmesinden ekleyebilirsin')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {recipe.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--fg)' }}>
                          <span>
                            {r.name}
                            {r.note && <span style={{ color: 'var(--fg2)' }}> · {r.note}</span>}
                          </span>
                          <span style={{ color: 'var(--fg2)', fontWeight: 600 }}>
                            {r.qty} {r.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Kart aksiyonu */}
      {!allReady && (
        <button
          onClick={() => onAllReady(pending)}
          style={{ width: '100%', padding: 13, background: 'var(--good)', color: '#fff', fontSize: 14.5, fontWeight: 700 }}
        >
          {tr('Tümü Hazır')}
        </button>
      )}
    </div>
  );
}


/** Mutfak ekranı ayarları — dil ve tema (ikisi de o cihaza özeldir) */
function KitchenSettings({ onClose }: { onClose: () => void }) {
  const tr = useT();
  const theme = useStore((s) => s.settings.theme);
  const setTheme = useStore((s) => s.setTheme);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);

  const btn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 14,
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  });

  return (
    <Sheet onClose={onClose} zIndex={60} maxHeight={520}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg)', marginBottom: 18 }}>{tr('Ayarlar')}</div>

      <SectionLabel>{tr('Görünüm')}</SectionLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <button onClick={() => setTheme('light')} style={btn(theme === 'light')}>
          {tr('☀ Gündüz')}
        </button>
        <button onClick={() => setTheme('dark')} style={btn(theme === 'dark')}>
          {tr('☾ Gece')}
        </button>
      </div>

      <SectionLabel>{tr('Dil')}</SectionLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <button onClick={() => setLang('tr')} style={btn(lang === 'tr')}>
          Türkçe
        </button>
        <button onClick={() => setLang('en')} style={btn(lang === 'en')}>
          English
        </button>
      </div>

      <SectionLabel>{tr('Bildirimler')}</SectionLabel>
      <div style={{ marginBottom: 22 }}>
        <NotificationSetting />
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>
        {tr('Bu ayarlar yalnızca bu cihazı etkiler.')}
      </div>

      <button onClick={onClose} style={{ width: '100%', padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
        {tr('Kapat')}
      </button>

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>
          La Tía {tr('Mutfak')} · v{__APP_VERSION__}
        </div>
        <Signature />
      </div>
    </Sheet>
  );
}

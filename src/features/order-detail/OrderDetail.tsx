import { useStore } from '@/store/useStore';
import { computeRemaining, computeTotals, lineTotal } from '@/lib/totals';
import { fmt } from '@/lib/money';
import { formatTime } from '@/lib/date';
import { ChevronLeft } from '@/components/icons';
import { FullSheet } from '@/components/Sheet';
import type { Extra, Order, SelectedExtra } from '@/types';
import { useT } from '@/i18n/useT';

function metaLine(itExtras: SelectedExtra[], note: string, extras: Extra[]): string {
  const extraNames = itExtras
    .map((sel) => {
      const e = extras.find((x) => x.id === sel.id);
      if (!e) return null;
      return sel.qty > 1 ? `${sel.qty}× ${e.name}` : e.name;
    })
    .filter(Boolean) as string[];
  const parts: string[] = [];
  if (note) parts.push(`“${note}”`);
  if (extraNames.length) parts.push('+ ' + extraNames.join(', '));
  return parts.join('  ');
}

export function OrderDetail({ order }: { order: Order }) {
  const tr = useT();
  const extras = useStore((s) => s.extras);
  const closeOrder = useStore((s) => s.closeOrder);
  const deleteOrderNow = useStore((s) => s.deleteOrderNow);
  const openBrowse = useStore((s) => s.openBrowse);
  const openPay = useStore((s) => s.openPay);
  const changeQty = useStore((s) => s.changeQty);
  const openItemEdit = useStore((s) => s.openItemEdit);
  const setItemStatus = useStore((s) => s.setItemStatus);
  const setGuestCount = useStore((s) => s.setGuestCount);

  const all = computeTotals(order, extras);
  const t = computeRemaining(order, extras);
  const paidAmount = all.total - t.total;
  const empty = order.items.length === 0;
  const nothingLeft = order.items.length > 0 && order.items.every((it) => it.paymentId);

  const qtyBtn: React.CSSProperties = { width: 30, height: 30, fontSize: 18, color: 'var(--accent)', fontWeight: 600 };

  return (
    <FullSheet zIndex={25}>
      <div style={{ flex: 'none', padding: '52px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
        <button onClick={closeOrder} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>
          <ChevronLeft />
          {tr('Masalar')}
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{order.label}</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg2)' }}>
            {order.waiter} · {formatTime(order.createdAt)}
          </div>
        </div>
        <button onClick={deleteOrderNow} style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
          {tr('Sil')}
        </button>
      </div>

      {/* Kişi sayısı: kişi başı harcama restoranların temel metriği.
          Paket siparişte misafir kavramı yok, bu yüzden gizlenir. */}
      {order.kind !== 'paket' && (
        <div
          style={{
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--surface)',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--fg2)' }}>{tr('Kişi sayısı')}</span>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 10 }}>
            <button onClick={() => setGuestCount(order.guestCount - 1)} style={qtyBtn} aria-label={tr('Azalt')}>
              −
            </button>
            <span style={{ minWidth: 26, textAlign: 'center', fontSize: 14.5, fontWeight: 700, color: 'var(--fg)' }}>
              {order.guestCount}
            </span>
            <button onClick={() => setGuestCount(order.guestCount + 1)} style={qtyBtn} aria-label={tr('Artır')}>
              +
            </button>
          </div>
        </div>
      )}

      <div className="scr" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 20px' }}>
        {empty ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg2)' }}>{tr('Henüz ürün yok')}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>{tr('Aşağıdan ürün ekle')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {order.items.map((it) => {
              const meta = metaLine(it.extras, it.note, extras);
              return (
                <div
                  key={it.uid}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 14,
                    padding: '12px 13px',
                    opacity: it.paymentId ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <button onClick={() => openItemEdit(it.uid)} style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{it.name}</span>
                        {it.paymentId && (
                          <span
                            style={{
                              flex: 'none',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 20,
                              textTransform: 'uppercase',
                              letterSpacing: '.4px',
                              background: 'var(--good)',
                              color: '#fff',
                            }}
                          >
                            {tr('Ödendi')}
                          </span>
                        )}
                        {!it.paymentId && it.kdsStatus !== 'new' && (
                          <span
                            style={{
                              flex: 'none',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 20,
                              textTransform: 'uppercase',
                              letterSpacing: '.4px',
                              background:
                                it.kdsStatus === 'ready'
                                  ? 'var(--good)'
                                  : it.kdsStatus === 'served'
                                    ? 'var(--surface2)'
                                    : 'var(--accent)',
                              color: it.kdsStatus === 'served' ? 'var(--fg2)' : '#fff',
                            }}
                          >
                            {tr(it.kdsStatus === 'ready' ? 'Hazır' : it.kdsStatus === 'preparing' ? 'Hazırlanıyor' : 'Teslim edildi')}
                          </span>
                        )}
                      </div>
                      {meta && <div style={{ fontSize: 11.5, color: 'var(--coral)', marginTop: 3, lineHeight: 1.4 }}>{meta}</div>}
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{tr('Not / ekstra ekle ›')}</div>
                    </button>
                    <div style={{ textAlign: 'right', flex: 'none' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{fmt(lineTotal(it, extras))}</div>
                      {!it.paymentId && (
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, background: 'var(--surface2)', borderRadius: 10 }}>
                        <button onClick={() => changeQty(it.uid, -1)} style={qtyBtn}>
                          −
                        </button>
                        <span style={{ minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{it.qty}</span>
                        <button onClick={() => changeQty(it.uid, 1)} style={qtyBtn}>
                          +
                        </button>
                      </div>
                      )}
                      {!it.paymentId && it.kdsStatus === 'ready' && (
                        <button
                          onClick={() => void setItemStatus(it.uid, 'served')}
                          style={{
                            marginTop: 6,
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 10,
                            background: 'var(--good)',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tr('Teslim Et')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ flex: 'none', padding: '14px 18px 26px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        <button
          onClick={openBrowse}
          style={{ width: '100%', padding: 13, borderRadius: 14, border: '1.5px dashed var(--accent)', color: 'var(--accent)', fontSize: 14, fontWeight: 600, marginBottom: 11, background: 'transparent' }}
        >
          {tr('+ Ürün Ekle')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--fg2)' }}>{paidAmount > 0 ? tr('Kalan') : tr('Toplam')}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-.5px' }}>{fmt(t.total)}</div>
            {paidAmount > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--good)', fontWeight: 600 }}>
                {tr('Ödenen')}: {fmt(paidAmount)}
              </div>
            )}
            {order.kind !== 'paket' && order.guestCount > 1 && all.total > 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--fg2)' }}>
                {tr('Kişi başı')}: {fmt(all.total / order.guestCount)}
              </div>
            )}
          </div>
          <button
            onClick={openPay}
            disabled={empty || nothingLeft}
            style={{
              flex: 'none',
              padding: '14px 22px',
              borderRadius: 14,
              background: 'var(--good)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              opacity: empty || nothingLeft ? 0.4 : 1,
              pointerEvents: empty || nothingLeft ? 'none' : 'auto',
            }}
          >
            {tr('Hesabı Kapat')}
          </button>
        </div>
      </div>
    </FullSheet>
  );
}

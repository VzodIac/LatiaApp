import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { computeTotals, discountLabel, lineTotal } from '@/lib/totals';
import { fmt } from '@/lib/money';
import { formatTime } from '@/lib/date';
import { printReceipt } from '@/lib/print';
import { Sheet, SectionLabel } from '@/components/Sheet';
import type { Order } from '@/types';
import { discountReasonLabel } from '@/lib/discount';
import { useT } from '@/i18n/useT';

/** Gün Sonu altındaki adisyon listesi — seçili tarih aralığındaki kapanmış hesaplar */
export function OrderHistory() {
  const tr = useT();
  const historyOrders = useStore((s) => s.historyOrders);
  const historyLoading = useStore((s) => s.historyLoading);
  const extras = useStore((s) => s.extras);
  const openManageOrder = useStore((s) => s.openManageOrder);

  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? historyOrders : historyOrders.slice(0, 5);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{tr('Adisyonlar')}</div>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          {historyLoading ? tr('Yükleniyor…') : `${historyOrders.length} kayıt`}
        </span>
      </div>

      {historyOrders.length === 0 && !historyLoading ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{tr('Bu aralıkta kapanmış adisyon yok')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map((o) => {
            const t = computeTotals(o, extras);
            const voided = o.status === 'void';
            return (
              <button
                key={o.id}
                onClick={() => openManageOrder(o.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  background: 'var(--surface2)',
                  textAlign: 'left',
                  opacity: voided ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
                    {o.label}
                    {voided && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--danger)', marginLeft: 7 }}>{tr('İPTAL')}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 2 }}>
                    {o.waiter} · {o.paidAt ? formatTime(o.paidAt) : ''} ·{' '}
                    {o.paymentMethod === 'cash' ? tr('Nakit') : o.paymentMethod === 'card' ? tr('Kart') : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: voided ? 'var(--muted)' : 'var(--fg)',
                      textDecoration: voided ? 'line-through' : 'none',
                    }}
                  >
                    {fmt(t.total)}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{tr('düzelt ›')}</div>
                </div>
              </button>
            );
          })}

          {historyOrders.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', padding: 6 }}
            >
              {showAll ? tr('Daha az göster') : `Tümünü göster (${historyOrders.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Seçilen adisyon üzerinde düzeltme işlemleri */
export function ManageOrderSheet({ order }: { order: Order }) {
  const tr = useT();
  const extras = useStore((s) => s.extras);
  const openManageOrder = useStore((s) => s.openManageOrder);
  const voidOrder = useStore((s) => s.voidOrder);
  const reopenOrder = useStore((s) => s.reopenOrder);
  const hardDeleteOrder = useStore((s) => s.hardDeleteOrder);

  const [reason, setReason] = useState('');
  const t = computeTotals(order, extras);
  const voided = order.status === 'void';

  const close = () => openManageOrder(null);

  const doVoid = () => {
    if (!reason.trim()) {
      useStore.getState().showToast(tr('İptal sebebi yaz'));
      return;
    }
    void voidOrder(order.id, reason.trim());
  };

  const doReopen = () => {
    if (window.confirm(tr('Adisyon yeniden açılacak ve ödemesi geri alınacak. Ürünleri değiştirip tekrar kapatabilirsin. Devam edilsin mi?'))) {
      void reopenOrder(order.id);
    }
  };

  const doDelete = () => {
    if (
      window.confirm(
        tr('Bu adisyon veritabanından KALICI olarak silinecek. Ciro geçmişinden tamamen kaybolur ve geri alınamaz.\n\nİz kalması için "İptal et" önerilir. Yine de silinsin mi?'),
      )
    ) {
      void hardDeleteOrder(order.id);
    }
  };

  const actionBtn = (color: string): React.CSSProperties => ({
    width: '100%',
    padding: 13,
    borderRadius: 14,
    border: `1px solid ${color}`,
    color,
    fontSize: 13.5,
    fontWeight: 700,
    background: 'var(--surface)',
    marginTop: 10,
  });

  return (
    <Sheet onClose={close} zIndex={55} maxHeight={720}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg)', marginBottom: 3 }}>{order.label}</div>
      <div style={{ fontSize: 13, color: 'var(--fg2)', marginBottom: 16 }}>
        {order.waiter} · {order.paidAt ? formatTime(order.paidAt) : ''} ·{' '}
        {order.paymentMethod === 'cash' ? tr('Nakit') : order.paymentMethod === 'card' ? tr('Kart') : '—'}
        {voided && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> · {tr('İPTAL EDİLDİ')}</span>}
      </div>

      {/* İkram/indirim gerekçesi — denetim için adisyonun üzerinde durmalı */}
      {t.disc > 0 && (
        <div
          style={{
            background: 'color-mix(in oklch, var(--coral), transparent 90%)',
            border: '1px solid var(--coral)',
            borderRadius: 12,
            padding: '10px 13px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--coral)' }}>
            {discountLabel(order.discountType)} · −{fmt(t.disc)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 3 }}>
            {discountReasonLabel(order.discountReason)}
            {order.discountNote && ` — ${order.discountNote}`}
          </div>
        </div>
      )}

      <SectionLabel>{tr('Ürünler')}</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
        {order.items.map((it) => (
          <div key={it.uid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg)', marginBottom: 6 }}>
            <span style={{ flex: 1, minWidth: 0 }}>{it.name}</span>
            <span style={{ color: 'var(--fg2)', margin: '0 8px' }}>×{it.qty}</span>
            <span style={{ fontWeight: 600 }}>{fmt(lineTotal(it, extras))}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--fg)', borderTop: '1px solid var(--line)', paddingTop: 9, marginTop: 6 }}>
          <span>{tr('Toplam')}</span>
          <span>{fmt(t.total)}</span>
        </div>
      </div>

      <button
        onClick={() =>
          printReceipt({
            order,
            lines: order.items.map((it) => ({
              name: it.name,
              qty: it.qty,
              amount: lineTotal(it, extras),
              extras: it.extras
                .map((sel) => {
                  const e = extras.find((x) => x.id === sel.id);
                  return e ? (sel.qty > 1 ? `${sel.qty}× ${e.name}` : e.name) : '';
                })
                .filter(Boolean),
              note: it.note || undefined,
            })),
            amount: t.total,
            subtotal: t.sub,
            discount: t.disc,
            method: order.paymentMethod,
            waiter: order.waiter,
            paidAt: order.paidAt ?? Date.now(),
          })
        }
        style={{
          width: '100%',
          marginBottom: 18,
          padding: 13,
          borderRadius: 14,
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          background: 'var(--surface)',
          fontSize: 13.5,
          fontWeight: 700,
        }}
      >
        🖨 {tr('Fişi Yazdır')}
      </button>

      {!voided && (
        <>
          <SectionLabel>{tr('Düzeltme')}</SectionLabel>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
              {tr('Yeniden aç: ürünleri değiştirip tekrar kapatmak için.')} <br />
              {tr('İptal et: hatalı hesabı ciro dışına çıkarır, kayıt izlenebilir kalır.')} <br />
              {tr('Kalıcı sil: kaydı tamamen yok eder — geri alınamaz.')}
            </div>
          </div>

          <button onClick={doReopen} style={actionBtn('var(--accent)')}>
            {tr('Yeniden aç (ürünleri düzenle)')}
          </button>

          <div style={{ marginTop: 16 }}>
            <SectionLabel>{tr('İptal sebebi')}</SectionLabel>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr('ör. yanlış masaya girildi')}
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '11px 13px',
                fontSize: 13.5,
                color: 'var(--fg)',
                outline: 'none',
              }}
            />
            <button onClick={doVoid} style={actionBtn('var(--coral)')}>
              {tr('İptal et (ciro dışına çıkar)')}
            </button>
          </div>
        </>
      )}

      <button onClick={doDelete} style={actionBtn('var(--danger)')}>
        {tr('Kalıcı olarak sil')}
      </button>

      <button
        onClick={close}
        style={{ width: '100%', marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700 }}
      >
        {tr('Kapat')}
      </button>
    </Sheet>
  );
}

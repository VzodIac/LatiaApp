import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { DISCOUNT_REASONS } from '@/lib/discount';
import { computeTotals, discountLabel, lineTotal, unitTotal } from '@/lib/totals';
import { fmt } from '@/lib/money';
import { Sheet, SectionLabel } from '@/components/Sheet';
import type { DiscountType, Order } from '@/types';
import { useT } from '@/i18n/useT';

export function PaymentSheet({ order }: { order: Order }) {
  const tr = useT();
  const extras = useStore((s) => s.extras);
  const payMode = useStore((s) => s.payMode);
  const paySelection = useStore((s) => s.paySelection);
  const closePay = useStore((s) => s.closePay);
  const setPayMode = useStore((s) => s.setPayMode);
  const toggleSel = useStore((s) => s.togglePaySelection);
  const setPayQty = useStore((s) => s.setPayQty);
  const selectAll = useStore((s) => s.selectAllForPay);
  const clearSel = useStore((s) => s.clearPaySelection);
  const setDiscount = useStore((s) => s.setDiscount);
  const setDiscountReason = useStore((s) => s.setDiscountReason);
  const setDiscountNote = useStore((s) => s.setDiscountNote);
  const changeSplit = useStore((s) => s.changeSplit);
  const setMethod = useStore((s) => s.setMethod);
  const payTip = useStore((s) => s.payTip);
  const setPayTip = useStore((s) => s.setPayTip);
  const confirmPay = useStore((s) => s.confirmPay);

  // Yazma buluta geciktirilerek gönderiliyor; alan yerel durumdan beslenmezse
  // realtime yankısı yazılanı geri alır
  const [noteDraft, setNoteDraft] = useState(order.discountNote);
  useEffect(() => setNoteDraft(order.discountNote), [order.id]);

  const unpaid = order.items.filter((it) => !it.paymentId);
  const paidCount = order.items.length - unpaid.length;
  const needsReason = order.discountType !== 'none' && !order.discountReason;
  const tipPresets = [5, 10, 15];

  // İndirim tüm adisyona uygulanır; kısmi ödemede oransal yansır
  const all = computeTotals(order, extras);
  const ratio = all.sub > 0 ? all.total / all.sub : 1;
  const remainingSub = unpaid.reduce((a, it) => a + lineTotal(it, extras), 0);
  const remainingTotal = remainingSub * ratio;

  const selectedSub = unpaid.reduce(
    (a, it) => a + unitTotal(it, extras) * Math.min(paySelection[it.uid] ?? 0, it.qty),
    0,
  );
  const payAmount = payMode === 'select' ? selectedSub * ratio : remainingTotal;

  const discounts: { t: DiscountType; label: string }[] = [
    { t: 'none', label: tr('Yok') },
    { t: 'p10', label: '%10' },
    { t: 'p15', label: '%15' },
    { t: 'comp', label: tr('İkram') },
  ];

  const modeBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 10,
    borderRadius: 11,
    fontSize: 13.5,
    fontWeight: 600,
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--fg2)',
    boxShadow: active ? 'var(--shadow)' : 'none',
  });

  const dBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '11px 4px',
    borderRadius: 12,
    fontSize: 12.5,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  });

  const pBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 15,
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  });

  const splitBtn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: 'var(--surface2)',
    fontSize: 20,
    color: 'var(--accent)',
    fontWeight: 600,
  };
  const row: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13.5,
    color: 'var(--fg2)',
    marginBottom: 6,
  };

  return (
    <Sheet onClose={closePay} zIndex={40} maxHeight={760}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{tr('Hesabı Kapat')}</div>
      <div style={{ fontSize: 13, color: 'var(--fg2)', marginBottom: 14 }}>
        {order.label} · {order.waiter}
        {paidCount > 0 && <span style={{ color: 'var(--good)', fontWeight: 600 }}> · {tr('{n} ürün ödendi', { n: paidCount })}</span>}
      </div>

      {/* Tüm hesap / ürün seçerek */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: 'var(--surface2)', padding: 4, borderRadius: 14 }}>
        <button onClick={() => setPayMode('all')} style={modeBtn(payMode === 'all')}>
          {tr('Tüm hesap')}
        </button>
        <button onClick={() => setPayMode('select')} style={modeBtn(payMode === 'select')}>
          {tr('Ürün seç')}
        </button>
      </div>

      {payMode === 'select' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <SectionLabel style={{ marginBottom: 0 }}>{tr('Ödenecek ürünler')}</SectionLabel>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={selectAll} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                {tr('Tümü')}
              </button>
              <button onClick={clearSel} style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg2)' }}>
                {tr('Temizle')}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
            {unpaid.map((it) => {
              const picked = Math.min(paySelection[it.uid] ?? 0, it.qty);
              const on = picked > 0;
              const extraNames = it.extras
                .map((sel) => {
                  const e = extras.find((x) => x.id === sel.id);
                  return e ? (sel.qty > 1 ? `${sel.qty}× ${e.name}` : e.name) : null;
                })
                .filter(Boolean) as string[];
              return (
                <div
                  key={it.uid}
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    background: on ? 'color-mix(in oklch, var(--accent), transparent 90%)' : 'var(--surface)',
                  }}
                >
                  <button
                    onClick={() => toggleSel(it.uid)}
                    style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 13px', textAlign: 'left' }}
                  >
                    <span
                      style={{
                        width: 21,
                        height: 21,
                        flex: 'none',
                        marginTop: 1,
                        borderRadius: 6,
                        border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                        background: on ? 'var(--accent)' : 'transparent',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, color: 'var(--fg)' }}>
                        {it.qty > 1 && <b>{it.qty}× </b>}
                        {it.name}
                      </span>
                      {/* Ekstralar ödemeye dahil — ne ödendiği açık olmalı */}
                      {extraNames.map((n) => (
                        <span key={n} style={{ display: 'block', fontSize: 11.5, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                          + {n}
                        </span>
                      ))}
                    </span>
                    <span style={{ flex: 'none', textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
                        {fmt(on ? unitTotal(it, extras) * picked : lineTotal(it, extras))}
                      </span>
                      {it.qty > 1 && (
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)' }}>
                          {fmt(unitTotal(it, extras))} / {tr('adet')}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Adet seçici: "2 lattenin 1'ini öde" gibi durumlar için */}
                  {on && it.qty > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '0 13px 11px 45px',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--fg2)' }}>{tr('Ödenecek adet')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)' }}>
                        <button onClick={() => setPayQty(it.uid, picked - 1)} style={{ width: 30, height: 30, fontSize: 17, color: 'var(--accent)', fontWeight: 600 }}>
                          −
                        </button>
                        <span style={{ minWidth: 26, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
                          {picked} / {it.qty}
                        </span>
                        <button onClick={() => setPayQty(it.uid, picked + 1)} style={{ width: 30, height: 30, fontSize: 17, color: 'var(--accent)', fontWeight: 600 }}>
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {unpaid.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 12 }}>
                {tr('Tüm ürünler ödendi')}
              </div>
            )}
          </div>
        </>
      )}

      {/* Özet */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '14px 15px', marginBottom: 16 }}>
        <div style={row}>
          <span>{tr('Adisyon ara toplamı')}</span>
          <span>{fmt(all.sub)}</span>
        </div>
        {all.disc > 0 && (
          <div style={{ ...row, color: 'var(--coral)' }}>
            <span>{discountLabel(order.discountType)}</span>
            <span>−{fmt(all.disc)}</span>
          </div>
        )}
        {paidCount > 0 && (
          <div style={{ ...row, color: 'var(--good)' }}>
            <span>{tr('Ödenen')}</span>
            <span>{fmt(all.total - remainingTotal)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 800, color: 'var(--fg)', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 4 }}>
          <span>{payMode === 'select' ? tr('Seçilen') : tr('Kalan')}</span>
          <span>{fmt(payAmount)}</span>
        </div>
        {payMode === 'all' && order.splitCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--accent)', marginTop: 8, fontWeight: 600 }}>
            <span>{tr('{n} kişi', { n: order.splitCount })} ×</span>
            <span>{fmt(payAmount / order.splitCount)}</span>
          </div>
        )}
      </div>

      <SectionLabel>{tr('İndirim / İkram')}</SectionLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: order.discountType === 'none' ? 18 : 12 }}>
        {discounts.map((d) => (
          <button key={d.t} onClick={() => setDiscount(d.t)} style={dBtn(order.discountType === d.t)}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Gerekçe zorunlu: sebebi kaydedilmeyen ikram denetlenemez ve
          kâr sızıntısının en yaygın kanalıdır. Sabit liste kullanılıyor ki
          gün sonunda "ikramların %40'ı şikayet kaynaklı" gibi bir çıkarım
          yapılabilsin; serbest açıklama ayrıca tutulur. */}
      {order.discountType !== 'none' && (
        <div
          style={{
            border: `1px solid ${needsReason ? 'var(--coral)' : 'var(--line)'}`,
            background: 'var(--surface)',
            borderRadius: 14,
            padding: 13,
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: needsReason ? 'var(--coral)' : 'var(--fg2)', marginBottom: 9 }}>
            {needsReason ? tr('Sebep seç (zorunlu)') : tr('Sebep')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {DISCOUNT_REASONS.map((r) => {
              const on = order.discountReason === r.code;
              return (
                <button
                  key={r.code}
                  onClick={() => setDiscountReason(r.code)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    background: on ? 'var(--accent)' : 'var(--surface2)',
                    color: on ? '#fff' : 'var(--fg)',
                  }}
                >
                  {tr(r.label)}
                </button>
              );
            })}
          </div>
          <input
            value={noteDraft}
            onChange={(e) => {
              setNoteDraft(e.target.value);
              setDiscountNote(e.target.value);
            }}
            placeholder={tr('Açıklama — ör. kimin tanıdığı, ne şikayet edildi')}
            style={{
              width: '100%',
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
              borderRadius: 11,
              padding: '10px 12px',
              fontSize: 13,
              color: 'var(--fg)',
              outline: 'none',
            }}
          />
        </div>
      )}

      {payMode === 'all' && (
        <>
          <SectionLabel>{tr('Eşit Böl')}</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '9px 14px' }}>
            <button onClick={() => changeSplit(-1)} style={splitBtn}>
              −
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{tr('{n} kişi', { n: order.splitCount })}</span>
            </div>
            <button onClick={() => changeSplit(1)} style={splitBtn}>
              +
            </button>
          </div>
        </>
      )}

      {/* Bahşiş — havuza gider, garsona doğrudan değil.
          Uygulama yalnızca GİRİLEN tutarı kaydeder; kartlı bahşişin gerçek
          tahsilatı POS tarafındadır ve mutabakat oradan yapılır. */}
      <SectionLabel>{tr('Bahşiş (havuz)')}</SectionLabel>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 13, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
          <button
            onClick={() => setPayTip(0)}
            style={{
              flex: 1,
              padding: '9px 4px',
              borderRadius: 11,
              fontSize: 12.5,
              fontWeight: 600,
              border: `1px solid ${payTip === 0 ? 'var(--accent)' : 'var(--line)'}`,
              background: payTip === 0 ? 'var(--accent)' : 'var(--surface2)',
              color: payTip === 0 ? '#fff' : 'var(--fg)',
            }}
          >
            {tr('Yok')}
          </button>
          {tipPresets.map((pct) => {
            const val = Math.round(payAmount * pct) / 100;
            const on = payTip > 0 && Math.abs(payTip - val) < 0.005;
            return (
              <button
                key={pct}
                onClick={() => setPayTip(val)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  borderRadius: 11,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                  background: on ? 'var(--accent)' : 'var(--surface2)',
                  color: on ? '#fff' : 'var(--fg)',
                }}
              >
                %{pct}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--fg2)', flex: 'none' }}>{tr('Tutar')}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={payTip === 0 ? '' : payTip}
            onChange={(e) => setPayTip(Number(e.target.value) || 0)}
            placeholder="0"
            style={{
              flex: 1,
              background: 'var(--surface2)',
              border: '1px solid var(--line)',
              borderRadius: 11,
              padding: '10px 12px',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--fg)',
              outline: 'none',
            }}
          />
        </div>
        {payTip > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: 'var(--good)', marginTop: 10 }}>
            <span>{tr('Tahsil edilecek')}</span>
            <span>{fmt(payAmount + payTip)}</span>
          </div>
        )}
      </div>

      <SectionLabel>{tr('Ödeme Tipi')}</SectionLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setMethod('cash')} style={pBtn(order.paymentMethod === 'cash')}>
          {tr('Nakit')}
        </button>
        <button onClick={() => setMethod('card')} style={pBtn(order.paymentMethod === 'card')}>
          {tr('Kart')}
        </button>
      </div>

      <button
        onClick={() => void confirmPay()}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 16,
          background: 'var(--good)',
          color: '#fff',
          fontSize: 16,
          fontWeight: 700,
          boxShadow: '0 6px 18px rgba(79,122,82,.3)',
          opacity: needsReason ? 0.5 : payAmount > 0 || order.discountType === 'comp' ? 1 : 0.5,
        }}
      >
        {order.discountType === 'comp'
          ? tr('İkram Olarak Kapat')
          : payMode === 'select'
            ? tr('Seçilenleri Al · {amount}', { amount: fmt(payAmount + payTip) })
            : tr('Ödemeyi Al · {amount}', { amount: fmt(payAmount + payTip) })}
      </button>
    </Sheet>
  );
}

import { useStore } from '@/store/useStore';
import { fmt } from '@/lib/money';
import { formatTime } from '@/lib/date';
import { printReceipt } from '@/lib/print';
import { Logo } from '@/components/Logo';
import type { ReceiptData } from '@/store/useStore';
import { useT } from '@/i18n/useT';

export function Receipt({ data }: { data: ReceiptData }) {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const closeReceipt = useStore((s) => s.closeReceipt);
  const newAfterReceipt = useStore((s) => s.newAfterReceipt);

  const order = orders.find((o) => o.id === data.orderId);
  const items = data.items;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 45,
        background: 'rgba(10,20,40,.55)',
        animation: 'fadeIn .2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="scr" style={{ width: '100%', background: 'var(--surface)', borderRadius: 22, padding: '24px 22px', animation: 'pop .3s', maxHeight: 700, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--good)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#fff', fontSize: 26 }}>
            ✓
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Logo height={34} variant="full" /></div>
          <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 2 }}>
            {data.orderClosed ? tr('Hesap kapandı') : tr('Kısmi ödeme alındı')}
          </div>
        </div>

        <div style={{ borderTop: '1px dashed var(--line)', borderBottom: '1px dashed var(--line)', padding: '12px 0', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--fg2)', marginBottom: 4 }}>
            <span>{data.label}</span>
            <span>{formatTime(data.paidAt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--fg2)' }}>
            <span>Garson: {data.waiter}</span>
            <span>{data.method === 'cash' ? tr('Nakit') : tr('Kart')}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {items.map((it, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--fg)' }}>
                <span style={{ flex: 1, minWidth: 0 }}>{it.name}</span>
                <span style={{ color: 'var(--fg2)', margin: '0 8px' }}>×{it.qty}</span>
                <span style={{ fontWeight: 600 }}>{fmt(it.amount)}</span>
              </div>
              {it.extras.map((x) => (
                <div key={x} style={{ fontSize: 11.5, color: 'var(--fg2)', paddingLeft: 6 }}>+ {x}</div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--fg)', borderTop: '1px solid var(--line)', paddingTop: 10, marginBottom: 6 }}>
          <span>{tr('Alınan')}</span>
          <span>{fmt(data.amount)}</span>
        </div>

        {data.tip > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--good)', fontWeight: 600, marginBottom: 6 }}>
            <span>{tr('Bahşiş (havuz)')}</span>
            <span>{fmt(data.tip)}</span>
          </div>
        )}

        {!data.orderClosed && (
          <div style={{ fontSize: 12.5, color: 'var(--coral)', fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>
            {tr('Adisyon açık kaldı — kalan ürünler ayrıca ödenecek')}
          </div>
        )}

        <button
          onClick={() =>
            order &&
            printReceipt({
              order,
              lines: items,
              amount: data.amount,
              method: data.method,
              waiter: data.waiter,
              paidAt: data.paidAt,
              tip: data.tip,
              partial: !data.orderClosed,
            })
          }
          style={{
            width: '100%',
            marginTop: 12,
            padding: 13,
            borderRadius: 14,
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            background: 'var(--surface)',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          🖨 {tr('Fişi Yazdır')}
        </button>

        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button onClick={closeReceipt} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 14, fontWeight: 600, background: 'transparent' }}>
            {tr('Kapat')}
          </button>
          {data.orderClosed && (
            <button onClick={newAfterReceipt} style={{ flex: 1, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {tr('Yeni Sipariş')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

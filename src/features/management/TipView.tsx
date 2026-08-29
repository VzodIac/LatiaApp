import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { buildTipPool, type TipSplitMode } from '@/lib/profit';
import { fmt } from '@/lib/money';
import { useT } from '@/i18n/useT';
import { card, sectionTitle } from './ui';

/** Bahşiş havuzu — toplanan tutar ve garsonlara dağıtımı */
export function TipView({ from, to }: { from: number; to: number }) {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const waiters = useStore((s) => s.waiters);
  const [mode, setMode] = useState<TipSplitMode>('byOrders');

  const pool = buildTipPool(orders, from, to, mode, waiters.map((w) => w.name));
  const active = pool.shares.filter((s) => s.orders > 0);

  const modeBtn = (m: TipSplitMode, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        flex: 1,
        padding: 9,
        borderRadius: 10,
        fontSize: 12.5,
        fontWeight: 600,
        background: mode === m ? 'var(--surface)' : 'transparent',
        color: mode === m ? 'var(--accent)' : 'var(--fg2)',
        boxShadow: mode === m ? 'var(--shadow)' : 'none',
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 11.5, color: 'var(--fg2)', letterSpacing: '.4px' }}>{tr('HAVUZDAKİ BAHŞİŞ')}</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--good)', margin: '4px 0 2px', letterSpacing: '-.5px' }}>
          {fmt(pool.total)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg2)' }}>
          {active.length > 0 ? tr('{n} garson arasında paylaşılacak', { n: active.length }) : tr('Bu aralıkta bahşiş girilmedi')}
        </div>
      </div>

      {pool.total > 0 && (
        <>
          <div style={sectionTitle}>{tr('Dağıtım kuralı')}</div>
          <div style={{ display: 'flex', gap: 6, background: 'var(--surface2)', padding: 4, borderRadius: 13, marginBottom: 10 }}>
            {modeBtn('byOrders', tr('Adisyon sayısına göre'))}
            {modeBtn('equal', tr('Eşit'))}
          </div>

          {/* Sektör normu çalışılan saate göre dağıtımdır; vardiya takibi
              henüz yok, bu yüzden adisyon sayısı yaklaşık ölçü olarak sunuluyor. */}
          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, margin: '0 2px 12px' }}>
            {tr('Sektörde havuz genelde çalışılan saate göre bölünür. Vardiya takibi henüz olmadığı için adisyon sayısı yaklaşık ölçü olarak kullanılıyor — dağıtımı elle de yapabilirsin, buradaki rakam yol göstericidir.')}
          </div>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {pool.shares.map((s, i) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  opacity: s.orders === 0 ? 0.5 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
                    {tr('{n} adisyon', { n: s.orders })} · {tr('topladığı')} {fmt(s.collected)}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--good)', flex: 'none' }}>{fmt(s.share)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, margin: '4px 2px' }}>
        ⚠️ {tr('Uygulama yalnızca girilen bahşişi kaydeder. Kartlı bahşişin gerçek tahsilatı POS/banka tarafındadır; mutabakat oradan yapılmalıdır.')}
      </div>
    </>
  );
}

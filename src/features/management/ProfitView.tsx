import { useStore } from '@/store/useStore';
import { buildProfit } from '@/lib/profit';
import { fmt } from '@/lib/money';
import { useT } from '@/i18n/useT';
import { card, sectionTitle } from './ui';

/** Reçete tabanlı kârlılık — ürün bazında ciro, maliyet ve brüt marj */
export function ProfitView({ from, to }: { from: number; to: number }) {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const extras = useStore((s) => s.extras);
  const rep = buildProfit(orders, extras, from, to);

  if (rep.rows.length === 0) {
    return <div style={{ ...card, color: 'var(--muted)', fontSize: 13.5 }}>{tr('Bu aralıkta satış yok')}</div>;
  }

  const stat = (label: string, value: string, color = 'var(--fg)') => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );

  return (
    <>
      <div style={card}>
        <div style={{ display: 'flex', gap: 12 }}>
          {stat(tr('Ciro'), fmt(rep.revenue))}
          {stat(tr('Maliyet'), fmt(rep.cost), 'var(--coral)')}
          {stat(tr('Brüt kâr'), fmt(rep.profit), 'var(--good)')}
          {stat(tr('Marj'), `%${rep.margin}`, 'var(--good)')}
        </div>

        {/* Maliyeti girilmemiş satış marjı olduğundan yüksek gösterir —
            rakama güvenilip güvenilmeyeceği burada söylenmeli. */}
        {rep.unknownCostPct > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: '9px 11px',
              borderRadius: 11,
              background: 'color-mix(in oklch, var(--coral), transparent 90%)',
              border: '1px solid var(--coral)',
              fontSize: 11.5,
              color: 'var(--fg2)',
              lineHeight: 1.5,
            }}
          >
            <b style={{ color: 'var(--coral)' }}>{tr('Cironun %{p}’inde maliyet bilinmiyor.', { p: String(rep.unknownCostPct) })}</b>{' '}
            {tr('Bu ürünlerin reçetesi girilmediği için maliyet 0 sayıldı; gerçek marj gösterilenden düşüktür.')}
          </div>
        )}
      </div>

      <div style={sectionTitle}>{tr('Ürün bazında')}</div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {rep.rows.map((r, i) => (
          <div
            key={r.itemId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
                {r.costMissing && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--coral)', marginLeft: 6 }}>
                    {tr('reçetesiz')}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
                {r.qty}× {r.category && `· ${r.category} `}· {tr('maliyet')} {fmt(r.cost)}
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--good)' }}>{fmt(r.profit)}</div>
              <div style={{ fontSize: 11, color: r.costMissing ? 'var(--muted)' : 'var(--fg2)' }}>
                %{r.margin} · {fmt(r.revenue)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

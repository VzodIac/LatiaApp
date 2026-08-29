import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { buildProfit, type ProfitDay } from '@/lib/profit';
import { fmt } from '@/lib/money';
import { formatShortDate } from '@/lib/date';
import { useT } from '@/i18n/useT';
import { card } from './ui';

type Mode = 'item' | 'day';

/** Reçete tabanlı kârlılık — ürün ve gün bazında ciro, maliyet ve net kâr */
export function ProfitView({ from, to }: { from: number; to: number }) {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const extras = useStore((s) => s.extras);
  const [mode, setMode] = useState<Mode>('item');
  const rep = buildProfit(orders, extras, from, to);

  if (rep.rows.length === 0) {
    return <div style={{ ...card, color: 'var(--muted)', fontSize: 13.5 }}>{tr('Bu aralıkta satış yok')}</div>;
  }

  const stat = (label: string, value: string, color = 'var(--fg)') => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: 'var(--fg2)', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color, marginTop: 2, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );

  const modeBtn = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        flex: 1,
        padding: 8,
        borderRadius: 9,
        fontSize: 12,
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
      {/* Özet */}
      <div style={card}>
        <div style={{ display: 'flex', gap: 10 }}>
          {stat(tr('Ciro'), fmt(rep.revenue))}
          {stat(tr('Maliyet'), fmt(rep.cost), 'var(--coral)')}
          {stat(tr('Net kâr'), fmt(rep.profit), 'var(--good)')}
          {stat(tr('Marj'), `%${rep.margin}`, 'var(--good)')}
        </div>

        {rep.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg2)', marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <span>
              {tr('Brüt satış')} {fmt(rep.gross)} · {tr('ikram/indirim')}{' '}
              <b style={{ color: 'var(--coral)' }}>−{fmt(rep.discount)}</b>
            </span>
          </div>
        )}

        {/* Sabit giderler sistemde tutulmuyor; "net" ifadesi yanlış
            okunmasın diye kapsamı açıkça yazılıyor. */}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 9, lineHeight: 1.5 }}>
          {tr('Net kâr = ciro − ikram/indirim − ürün maliyeti. Kira, maaş ve fatura gibi sabit giderler dahil değildir.')}
        </div>

        {/* Maliyeti girilmemiş satış marjı olduğundan yüksek gösterir —
            rakama güvenilip güvenilmeyeceği burada söylenmeli. */}
        {rep.unknownCostPct > 0 && (
          <div
            style={{
              marginTop: 11,
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

      {/* Gün bazında grafik — ciro ve net kâr yan yana */}
      {rep.days.length > 0 && <DayChart days={rep.days} />}

      <div style={{ display: 'flex', gap: 6, background: 'var(--surface2)', padding: 4, borderRadius: 12, margin: '16px 0 10px' }}>
        {modeBtn('item', tr('Ürün bazında'))}
        {modeBtn('day', tr('Gün bazında'))}
      </div>

      {mode === 'item' ? (
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
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--coral)', marginLeft: 6 }}>{tr('reçetesiz')}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
                  {r.qty}× {r.category && `· ${r.category} `}· {tr('ciro')} {fmt(r.revenue)} · {tr('maliyet')} {fmt(r.cost)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--good)' }}>{fmt(r.profit)}</div>
                <div style={{ fontSize: 11, color: r.costMissing ? 'var(--muted)' : 'var(--fg2)' }}>%{r.margin}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {rep.days.map((d, i) => (
            <div
              key={d.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{formatShortDate(d.date)}</div>
                <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
                  {tr('{n} adisyon', { n: d.orders })} · {tr('ciro')} {fmt(d.revenue)} · {tr('maliyet')} {fmt(d.cost)}
                  {d.discount > 0 && <span style={{ color: 'var(--coral)' }}> · −{fmt(d.discount)}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--good)' }}>{fmt(d.profit)}</div>
                <div style={{ fontSize: 11, color: 'var(--fg2)' }}>%{d.margin}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Günlük ciro ve net kâr grafiği.
 *
 * İki çubuk üst üste değil yan yana: yığılmış çubuk "kâr cironun bir parçası"
 * izlenimi verir ama maliyet de ciroya dahildir; ayrı çubuk kâr/ciro oranını
 * doğrudan okutur.
 */
function DayChart({ days }: { days: ProfitDay[] }) {
  const tr = useT();
  const max = Math.max(1, ...days.map((d) => Math.max(d.revenue, d.profit)));
  // Çok uzun aralıklarda çubuklar okunmaz hâle gelir; son 21 gün gösterilir
  const shown = days.slice(-21);

  return (
    <div style={{ ...card, paddingBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg)', flex: 1 }}>{tr('Günlük ciro ve net kâr')}</div>
        <Legend color="var(--accent)" label={tr('Ciro')} />
        <Legend color="var(--good)" label={tr('Net kâr')} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: shown.length > 12 ? 3 : 6, height: 108 }}>
        {shown.map((d) => (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', height: '100%' }}>
              <div
                title={`${tr('Ciro')} ${fmt(d.revenue)}`}
                style={{ flex: 1, background: 'var(--accent)', borderRadius: '4px 4px 2px 2px', height: `${(d.revenue / max) * 100}%`, minHeight: 2 }}
              />
              <div
                title={`${tr('Net kâr')} ${fmt(d.profit)}`}
                style={{
                  flex: 1,
                  background: d.profit >= 0 ? 'var(--good)' : 'var(--danger)',
                  borderRadius: '4px 4px 2px 2px',
                  height: `${(Math.abs(d.profit) / max) * 100}%`,
                  minHeight: 2,
                }}
              />
            </div>
            <span style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
          </div>
        ))}
      </div>

      {days.length > shown.length && (
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 8 }}>
          {tr('Son {n} gün gösteriliyor', { n: shown.length })}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 'none' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 10.5, color: 'var(--fg2)' }}>{label}</span>
    </div>
  );
}

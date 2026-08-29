import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { buildReport, type RangeKey, type TopFilter } from '@/lib/report';
import { fmt } from '@/lib/money';
import { formatLongDate, formatShortDate, toDateInput, fromDateInput } from '@/lib/date';
import { OrderHistory } from './OrderHistory';
import { useT } from '@/i18n/useT';

const TOP_FILTERS: { key: TopFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'food', label: 'Yiyecek' },
  { key: 'drink', label: 'İçecek' },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'custom', label: 'Tarih' },
];

export function DashboardTab() {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const extras = useStore((s) => s.extras);
  const openCount = orders.filter((o) => o.status === 'open').length;
  const range = useStore((s) => s.range);
  const customFrom = useStore((s) => s.customFrom);
  const customTo = useStore((s) => s.customTo);
  const setRange = useStore((s) => s.setRange);
  const setCustomFrom = useStore((s) => s.setCustomFrom);
  const setCustomTo = useStore((s) => s.setCustomTo);

  // Çok satanlar kırılımı yalnızca görünümü etkiler, cihazda kalır
  const [topFilter, setTopFilter] = useState<TopFilter>('all');

  const now = Date.now();
  const rep = buildReport(orders, extras, range, now, customFrom, customTo, topFilter);

  const ciroLabel = range === 'today' ? tr('GÜNÜN CİROSU') : range === 'yesterday' ? tr('DÜNKÜ CİRO') : range === 'week' ? tr('HAFTALIK CİRO') : tr('SEÇİLİ CİRO');
  const headerDate =
    range === 'custom'
      ? `${formatShortDate(rep.from)} – ${formatShortDate(rep.to)}`
      : range === 'week'
        ? `${formatShortDate(rep.from)} – ${formatShortDate(rep.to)}`
        : formatLongDate(rep.from);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '9px 4px',
    borderRadius: 11,
    fontSize: 12.5,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  });

  const dateInput: React.CSSProperties = {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--fg)',
    outline: 'none',
    WebkitAppearance: 'none',
    colorScheme: 'light dark',
  };

  const statCard: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '13px 12px' };

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fg)', margin: '2px 0 3px' }}>{tr('Gün Sonu')}</div>
      <div style={{ fontSize: 13, color: 'var(--fg2)', marginBottom: 14 }}>{headerDate}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: range === 'custom' ? 10 : 14 }}>
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)} style={chipStyle(range === r.key)}>
            {tr(r.label)}
          </button>
        ))}
      </div>

      {range === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <input type="date" value={toDateInput(customFrom)} max={toDateInput(customTo)} onChange={(e) => e.target.value && setCustomFrom(fromDateInput(e.target.value))} style={dateInput} />
          <span style={{ color: 'var(--fg2)', fontSize: 13 }}>→</span>
          <input type="date" value={toDateInput(customTo)} min={toDateInput(customFrom)} onChange={(e) => e.target.value && setCustomTo(fromDateInput(e.target.value))} style={dateInput} />
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,var(--accent),color-mix(in oklch,var(--accent),#000 18%))', borderRadius: 20, padding: 20, color: '#fff', boxShadow: '0 8px 24px rgba(170,38,50,.28)' }}>
        <div style={{ fontSize: 12.5, opacity: 0.85, letterSpacing: '.4px' }}>{ciroLabel}</div>
        <div style={{ fontSize: 38, fontWeight: 800, margin: '4px 0 2px', letterSpacing: '-.5px' }}>{fmt(rep.revenue)}</div>
        <div style={{ fontSize: 12.5, opacity: 0.85 }}>
          {tr('Ort. adisyon')} {fmt(rep.avg)}
          {rep.guests > 0 && <> · {tr('Kişi başı')} {fmt(rep.perGuest)}</>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
        <div style={statCard}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{rep.paidCount}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg2)', marginTop: 2 }}>{tr('Kapanan')}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{rep.guests}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg2)', marginTop: 2 }}>{tr('Kişi')}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{openCount}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg2)', marginTop: 2 }}>{tr('Aktif masa')}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{rep.itemCount}</div>
          <div style={{ fontSize: 10.5, color: 'var(--fg2)', marginTop: 2 }}>{tr('Ürün')}</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: '16px 16px 12px', marginTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 14 }}>{rep.chartTitle}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 96 }}>
          {rep.bars.map((b, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', background: b.active ? 'var(--accent)' : 'var(--line)', borderRadius: '5px 5px 2px 2px', height: `${b.pct}%`, minHeight: 3, transition: 'height .4s' }} />
              <span style={{ fontSize: 9, color: 'var(--muted)' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 16, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{tr('En Çok Satanlar')}</div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', padding: 3, borderRadius: 10 }}>
            {TOP_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTopFilter(f.key)}
                style={{
                  padding: '5px 9px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: topFilter === f.key ? 'var(--surface)' : 'transparent',
                  color: topFilter === f.key ? 'var(--accent)' : 'var(--fg2)',
                  boxShadow: topFilter === f.key ? 'var(--shadow)' : 'none',
                }}
              >
                {tr(f.label)}
              </button>
            ))}
          </div>
        </div>
        {rep.top.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{tr('Bu aralıkta satış yok')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rep.top.map((p) => (
              <div key={p.rank} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 22, height: 22, flex: 'none', borderRadius: 7, background: 'var(--surface2)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.rank}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                    {p.category && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}> · {p.category}</span>}
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', marginTop: 5 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: 'var(--coral)', width: `${p.pct}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{p.qty}×</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg2)' }}>{fmt(p.rev)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Garson performansı.
          Sadece ciroya göre sıralamak iyi masalara bakanı ödüllendirir, iyi
          çalışanı değil. Adisyon sayısı, kişi başı harcama ve ikram oranı
          birlikte gösteriliyor ki sıralama tek başına yanıltmasın. */}
      {rep.waiters.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{tr('Garson Performansı')}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>{tr('Ciroya göre sıralı')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rep.waiters.map((w) => (
              <div key={w.name} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flex: 'none',
                    borderRadius: 7,
                    background: w.rank === 1 ? 'var(--accent)' : 'var(--surface2)',
                    color: w.rank === 1 ? '#fff' : 'var(--accent)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {w.rank}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
                    {tr('{n} adisyon', { n: w.orders })}
                    {w.guests > 0 && <> · {tr('kişi başı')} {fmt(w.perGuest)}</>}
                    {w.discount > 0 && (
                      <span style={{ color: 'var(--coral)' }}> · {tr('ikram')} %{w.discountPct}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', flex: 'none' }}>{fmt(w.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İkram / indirim dökümü — kâr sızıntısının izlendiği yer */}
      {rep.discountTotal > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{tr('İkram & İndirim')}</div>
            <div style={{ fontSize: 12, color: 'var(--coral)', fontWeight: 700 }}>
              {fmt(rep.discountTotal)} · %{rep.discountPct}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rep.discounts.map((d) => (
              <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{d.label}</div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', marginTop: 5 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: 'var(--coral)', width: `${d.pct}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{fmt(d.amount)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg2)' }}>{tr('{n} adisyon', { n: d.count })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <OrderHistory />
    </div>
  );
}

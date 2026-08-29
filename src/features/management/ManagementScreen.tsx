import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Logo } from '@/components/Logo';
import { Signature } from '@/components/Signature';
import { resolveRange, type RangeKey } from '@/lib/report';
import { formatShortDate, formatLongDate, toDateInput, fromDateInput } from '@/lib/date';
import { useT } from '@/i18n/useT';
import { ProfitView } from './ProfitView';
import { TipView } from './TipView';
import { PurchasesView } from './PurchasesView';
import { ReservationsView } from './ReservationsView';

type Section = 'profit' | 'tips' | 'purchases' | 'reservations';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'profit', label: 'Kârlılık' },
  { key: 'tips', label: 'Bahşiş' },
  { key: 'purchases', label: 'Alımlar' },
  { key: 'reservations', label: 'Rezervasyon' },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'week', label: 'Bu Hafta' },
  { key: 'custom', label: 'Tarih' },
];

/**
 * Yönetim paneli — /yonetim adresinde ayrı bir PWA.
 *
 * Servis ve mutfaktan ayrı tutuluyor: burada görülen şeyler (maliyet, marj,
 * bahşiş havuzu, tedarikçi fiyatları) salondaki cihazlarda durmamalı.
 */
export function ManagementScreen() {
  const tr = useT();
  const [section, setSection] = useState<Section>('profit');
  const [range, setRange] = useState<RangeKey>('today');
  const [customFrom, setCustomFrom] = useState(Date.now());
  const [customTo, setCustomTo] = useState(Date.now());

  const refresh = useStore((s) => s.refresh);
  const [from, to] = resolveRange(range, Date.now(), customFrom, customTo);
  const needsRange = section === 'profit' || section === 'tips';

  const chip = (active: boolean): React.CSSProperties => ({
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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 620, margin: '0 auto', flex: 1, padding: '46px 18px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Logo height={30} variant="word" />
          <button
            onClick={() => void refresh()}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', padding: '6px 4px' }}
          >
            {tr('Yenile')}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg2)', letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: 18 }}>
          {tr('Yönetim')}
        </div>

        {/* Bölümler */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: 'var(--surface2)', padding: 4, borderRadius: 13 }}>
          {SECTIONS.map((sc) => (
            <button
              key={sc.key}
              onClick={() => setSection(sc.key)}
              style={{
                flex: 1,
                padding: '9px 3px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                background: section === sc.key ? 'var(--surface)' : 'transparent',
                color: section === sc.key ? 'var(--accent)' : 'var(--fg2)',
                boxShadow: section === sc.key ? 'var(--shadow)' : 'none',
              }}
            >
              {tr(sc.label)}
            </button>
          ))}
        </div>

        {/* Tarih aralığı — yalnızca aralığa bağlı bölümlerde */}
        {needsRange && (
          <>
            <div style={{ display: 'flex', gap: 7, marginBottom: range === 'custom' ? 9 : 6 }}>
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => setRange(r.key)} style={chip(range === r.key)}>
                  {tr(r.label)}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input type="date" value={toDateInput(customFrom)} max={toDateInput(customTo)} onChange={(e) => e.target.value && setCustomFrom(fromDateInput(e.target.value))} style={dateInput} />
                <span style={{ color: 'var(--fg2)', fontSize: 13 }}>→</span>
                <input type="date" value={toDateInput(customTo)} min={toDateInput(customFrom)} onChange={(e) => e.target.value && setCustomTo(fromDateInput(e.target.value))} style={dateInput} />
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', margin: '0 2px 14px' }}>
              {range === 'today' || range === 'yesterday'
                ? formatLongDate(from)
                : `${formatShortDate(from)} – ${formatShortDate(to)}`}
            </div>
          </>
        )}

        {section === 'profit' && <ProfitView from={from} to={to} />}
        {section === 'tips' && <TipView from={from} to={to} />}
        {section === 'purchases' && <PurchasesView />}
        {section === 'reservations' && <ReservationsView />}
      </div>

      <Signature style={{ paddingBottom: 22 }} />
    </div>
  );
}

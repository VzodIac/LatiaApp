import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { newId } from '@/data/remote';
import { formatTime, toDateInput, fromDateInput } from '@/lib/date';
import type { Reservation, ReservationStatus } from '@/types';
import { useT } from '@/i18n/useT';
import { card, sectionTitle, input, primaryBtn } from './ui';

const STATUS: { key: ReservationStatus; label: string; color: string }[] = [
  { key: 'booked', label: 'Bekliyor', color: 'var(--accent)' },
  { key: 'seated', label: 'Geldi', color: 'var(--good)' },
  { key: 'noshow', label: 'Gelmedi', color: 'var(--danger)' },
  { key: 'cancelled', label: 'İptal', color: 'var(--muted)' },
];

/** Gün bazlı rezervasyon listesi ve girişi */
export function ReservationsView() {
  const tr = useT();
  const reservations = useStore((s) => s.reservations);
  const resDay = useStore((s) => s.resDay);
  const loading = useStore((s) => s.mgmtLoading);
  const setResDay = useStore((s) => s.setResDay);
  const load = useStore((s) => s.loadReservations);
  const save = useStore((s) => s.saveReservation);
  const remove = useStore((s) => s.removeReservation);
  const showToast = useStore((s) => s.showToast);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [time, setTime] = useState('19:00');
  const [guests, setGuests] = useState('2');
  const [tableNo, setTableNo] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setName('');
    setPhone('');
    setTime('19:00');
    setGuests('2');
    setTableNo('');
    setNote('');
    setOpen(false);
  };

  const submit = () => {
    if (!name.trim()) return showToast(tr('İsim gir'));
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return showToast(tr('Saat gir'));

    const d = new Date(resDay);
    d.setHours(h, m, 0, 0);

    const r: Reservation = {
      id: newId(),
      guestName: name.trim(),
      phone: phone.trim() || null,
      reservedAt: d.getTime(),
      guestCount: Math.max(1, Number(guests) || 2),
      tableNo: tableNo.trim() ? Number(tableNo) : null,
      status: 'booked',
      note: note.trim() || null,
    };
    void save(r);
    reset();
  };

  const shiftDay = (delta: number) => setResDay(resDay + delta * 86400000);

  const totalGuests = reservations
    .filter((r) => r.status !== 'cancelled' && r.status !== 'noshow')
    .reduce((a, r) => a + r.guestCount, 0);

  return (
    <>
      {/* Gün seçimi */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <button onClick={() => shiftDay(-1)} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', fontSize: 17, color: 'var(--accent)', fontWeight: 600 }}>
          ‹
        </button>
        <input
          type="date"
          value={toDateInput(resDay)}
          onChange={(e) => e.target.value && setResDay(fromDateInput(e.target.value))}
          style={{ ...input, flex: 1, textAlign: 'center' }}
        />
        <button onClick={() => shiftDay(1)} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', fontSize: 17, color: 'var(--accent)', fontWeight: 600 }}>
          ›
        </button>
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--fg2)', margin: '0 2px 12px' }}>
        {loading
          ? tr('Yükleniyor…')
          : reservations.length === 0
            ? tr('Bu gün için rezervasyon yok')
            : tr('{n} rezervasyon · {g} kişi', { n: reservations.length, g: totalGuests })}
      </div>

      {!open ? (
        <button onClick={() => setOpen(true)} style={{ ...primaryBtn, marginBottom: 12 }}>
          + {tr('Rezervasyon Ekle')}
        </button>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{tr('Yeni rezervasyon')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('İsim')} style={input} />
            <div style={{ display: 'flex', gap: 9 }}>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={input} />
              <input value={guests} onChange={(e) => setGuests(e.target.value)} inputMode="numeric" placeholder={tr('Kişi')} style={input} />
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder={tr('Telefon')} style={input} />
              <input value={tableNo} onChange={(e) => setTableNo(e.target.value)} inputMode="numeric" placeholder={tr('Masa no')} style={input} />
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('Not — ör. doğum günü, pencere kenarı')} style={input} />
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
            <button onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13.5, fontWeight: 600, background: 'transparent' }}>
              {tr('Vazgeç')}
            </button>
            <button onClick={submit} style={{ ...primaryBtn, flex: 1, width: 'auto' }}>
              {tr('Kaydet')}
            </button>
          </div>
        </div>
      )}

      {reservations.length > 0 && (
        <>
          <div style={sectionTitle}>{tr('Gün listesi')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {reservations.map((r) => {
              const dim = r.status === 'cancelled' || r.status === 'noshow';
              return (
                <div key={r.id} style={{ ...card, marginBottom: 0, opacity: dim ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 'none', textAlign: 'center', minWidth: 46 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{formatTime(r.reservedAt)}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{tr('{n} kişi', { n: r.guestCount })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                        {r.guestName}
                        {r.tableNo != null && <span style={{ fontSize: 11.5, color: 'var(--fg2)', fontWeight: 500 }}> · {tr('Masa')} {r.tableNo}</span>}
                      </div>
                      {r.phone && <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 2 }}>{r.phone}</div>}
                      {r.note && <div style={{ fontSize: 11.5, color: 'var(--coral)', marginTop: 2 }}>{r.note}</div>}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(tr('Rezervasyon silinsin mi?'))) void remove(r.id);
                      }}
                      style={{ flex: 'none', color: 'var(--danger)', fontSize: 16 }}
                      aria-label={tr('Sil')}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 11 }}>
                    {STATUS.map((x) => (
                      <button
                        key={x.key}
                        onClick={() => void save({ ...r, status: x.key })}
                        style={{
                          flex: 1,
                          padding: '7px 4px',
                          borderRadius: 9,
                          fontSize: 11.5,
                          fontWeight: 600,
                          border: `1px solid ${r.status === x.key ? x.color : 'var(--line)'}`,
                          background: r.status === x.key ? x.color : 'var(--surface2)',
                          color: r.status === x.key ? '#fff' : 'var(--fg2)',
                        }}
                      >
                        {tr(x.label)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

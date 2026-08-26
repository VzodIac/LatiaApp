import type { CSSProperties } from 'react';

/** Seçilebilir çip (garson, aralık, indirim vb.) */
export function chip(active: boolean): CSSProperties {
  return {
    padding: '9px 15px',
    borderRadius: 11,
    fontSize: 13.5,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
    background: active ? 'var(--accent)' : 'var(--surface)',
    color: active ? '#fff' : 'var(--fg)',
  };
}

/** Ana (dolgulu) buton */
export const primaryBtn: CSSProperties = {
  width: '100%',
  padding: 15,
  borderRadius: 16,
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
};

/** İkincil (çerçeveli) buton */
export const outlineBtn: CSSProperties = {
  width: '100%',
  padding: 14,
  borderRadius: 14,
  border: '1px solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--fg)',
  fontSize: 14,
  fontWeight: 600,
};

/** Metin girişi */
export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  padding: 14,
  fontSize: 15,
  color: 'var(--fg)',
  outline: 'none',
};

/** Kart yüzeyi */
export const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  boxShadow: 'var(--shadow)',
};

/** Sekme içi kaydırılabilir alan için ortak padding */
export const tabScroll: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  position: 'relative',
};

/** Yönetim panelinde tekrar eden kart ve başlık biçimleri */
export const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 16,
  padding: 15,
  marginBottom: 12,
};

export const sectionTitle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--fg2)',
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  margin: '18px 2px 8px',
};

export const input: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--line)',
  borderRadius: 11,
  padding: '10px 12px',
  fontSize: 13.5,
  color: 'var(--fg)',
  outline: 'none',
  colorScheme: 'light dark',
};

export const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: 13,
  borderRadius: 13,
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
};

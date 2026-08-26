import { Logo } from '@/components/Logo';
import { Signature } from '@/components/Signature';

/**
 * Bağlantı bilgileri girilmeden uygulama çalışamaz. Bu ekran olmadan
 * uygulama bembeyaz açılıyordu ve sebebi anlaşılmıyordu.
 */
export function SetupNeeded() {
  const step: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 14,
    padding: '13px 15px',
    fontSize: 13,
    color: 'var(--fg2)',
    lineHeight: 1.55,
  };
  const code: React.CSSProperties = {
    display: 'inline-block',
    background: 'var(--surface2)',
    borderRadius: 6,
    padding: '1px 6px',
    fontFamily: 'Menlo, Consolas, monospace',
    fontSize: 12,
    color: 'var(--fg)',
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '56px 22px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Logo height={64} variant="full" />
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--fg2)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 26,
          }}
        >
          Kurulum Gerekli
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={step}>
            <b style={{ color: 'var(--fg)' }}>1 · Supabase projesi aç</b>
            <br />
            supabase.com üzerinde yeni bir proje oluştur (bölge: Frankfurt).
          </div>
          <div style={step}>
            <b style={{ color: 'var(--fg)' }}>2 · Veritabanını kur</b>
            <br />
            SQL Editor'da sırayla çalıştır: <span style={code}>supabase/schema.sql</span> →{' '}
            <span style={code}>supabase/seed.sql</span> →{' '}
            <span style={code}>supabase/migrations/*.sql</span>
          </div>
          <div style={step}>
            <b style={{ color: 'var(--fg)' }}>3 · İşletme hesabı oluştur</b>
            <br />
            Authentication → Users → Add user (Auto Confirm açık).
          </div>
          <div style={step}>
            <b style={{ color: 'var(--fg)' }}>4 · Bağlantı bilgilerini gir</b>
            <br />
            Project Settings → API'deki <b>Project URL</b> ve <b>publishable</b> anahtarı{' '}
            <span style={code}>src/lib/supabase.ts</span> dosyasına yaz.
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 20, textAlign: 'center' }}>
          Bu ekran, bağlantı bilgileri girilene kadar görünür.
        </div>
      </div>

      <Signature style={{ paddingTop: 24 }} />
    </div>
  );
}

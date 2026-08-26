import { Logo } from '@/components/Logo';
import { Signature } from '@/components/Signature';
import { useT } from '@/i18n/useT';

/**
 * Kök adresteki seçim ekranı.
 *
 * Uygulama üç bağımsız yüze ayrıldı: servis (garson), mutfak ve ileride
 * yönetim paneli. Her biri kendi adresinde olduğu için ayrı ayrı ana ekrana
 * eklenebiliyor; bu sayfa da hangisinin nerede olduğunu gösteriyor.
 */
export function Hub() {
  const tr = useT();

  const card = (opts: {
    href?: string;
    title: string;
    desc: string;
    soon?: boolean;
  }) => {
    const inner = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>{opts.title}</span>
          {opts.soon && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'var(--surface2)',
                color: 'var(--fg2)',
                textTransform: 'uppercase',
                letterSpacing: '.4px',
              }}
            >
              {tr('Yakında')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--fg2)', marginTop: 4, lineHeight: 1.5 }}>{opts.desc}</div>
      </>
    );

    const style: React.CSSProperties = {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      textDecoration: 'none',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 16,
      padding: '16px 17px',
      boxShadow: 'var(--shadow)',
      opacity: opts.soon ? 0.55 : 1,
    };

    return opts.href ? (
      <a key={opts.title} href={opts.href} style={style}>
        {inner}
      </a>
    ) : (
      <div key={opts.title} style={style}>
        {inner}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 22px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <Logo height={56} variant="full" />
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--fg2)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 30,
          }}
        >
          {tr('Yönetim Sistemi')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {card({
            href: '/servis',
            title: tr('Servis'),
            desc: tr('Sipariş alma, masa takibi, ödeme ve gün sonu'),
          })}
          {card({
            href: '/kitchen',
            title: tr('Mutfak'),
            desc: tr('Hazırlık ekranı — gelen siparişler ve durumları'),
          })}
          {card({
            title: tr('Yönetim'),
            desc: tr('Kârlılık, menü analizi ve maliyet raporları'),
            soon: true,
          })}
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginTop: 22, textAlign: 'center' }}>
          {tr('Kullandığın bölümü açıp "Ana Ekrana Ekle" dersen ayrı bir uygulama olarak kurulur.')}
        </div>
      </div>

      <Signature style={{ paddingTop: 24 }} />
    </div>
  );
}

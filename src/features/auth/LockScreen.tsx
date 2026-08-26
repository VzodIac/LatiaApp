import { useStore } from '@/store/useStore';
import { Signature } from '@/components/Signature';
import { Logo } from '@/components/Logo';
import { useT } from '@/i18n/useT';

export function LockScreen() {
  const tr = useT();
  const loginWaiter = useStore((s) => s.loginWaiter);
  const waiters = useStore((s) => s.waiters);
  const pinEntry = useStore((s) => s.pinEntry);
  const lockError = useStore((s) => s.lockError);
  const pickLoginWaiter = useStore((s) => s.pickLoginWaiter);
  const backToWaiterSelect = useStore((s) => s.backToWaiterSelect);
  const pinPress = useStore((s) => s.pinPress);
  const pinDel = useStore((s) => s.pinDel);

  const keyBtn: React.CSSProperties = {
    height: 62,
    borderRadius: 16,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    fontSize: 25,
    fontWeight: 600,
    color: 'var(--fg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 70,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn .25s',
      }}
    >
      <div className="scr" style={{ flex: 1, overflowY: 'auto', padding: '70px 26px 30px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo height={62} variant="full" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg2)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 4 }}>{tr('Servis')}</div>
        </div>

        {!loginWaiter ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', textAlign: 'center', marginBottom: 18 }}>{tr('Garson seç')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {waiters.map((w) => (
                <button
                  key={w.name}
                  onClick={() => pickLoginWaiter(w.name)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    padding: '20px 10px',
                    borderRadius: 18,
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow)',
                  }}
                >
                  <span
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 24,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {w.name[0]}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{w.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', textAlign: 'center' }}>{loginWaiter}</div>
            <div style={{ fontSize: 13, color: 'var(--fg2)', textAlign: 'center', marginTop: 2 }}>{tr('PIN gir')}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, margin: '22px 0 8px' }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: `2px solid ${i < pinEntry.length ? 'var(--accent)' : 'var(--line)'}`,
                    background: i < pinEntry.length ? 'var(--accent)' : 'transparent',
                  }}
                />
              ))}
            </div>
            {lockError && (
              <div style={{ fontSize: 12.5, color: 'var(--danger)', textAlign: 'center', fontWeight: 600, marginBottom: 6 }}>{tr('Hatalı PIN, tekrar dene')}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 280, margin: '18px auto 0', width: '100%' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} onClick={() => pinPress(d)} style={keyBtn}>
                  {d}
                </button>
              ))}
              <div style={{ height: 62, pointerEvents: 'none' }} />
              <button onClick={() => pinPress('0')} style={keyBtn}>
                0
              </button>
              <button onClick={pinDel} style={keyBtn}>
                ⌫
              </button>
            </div>
            <button onClick={backToWaiterSelect} style={{ margin: '20px auto 0', color: 'var(--accent)', fontSize: 14, fontWeight: 600 }}>
              {tr('‹ Garson değiştir')}
            </button>
          </>
        )}
      </div>
      <Signature style={{ flex: 'none', padding: '0 0 30px' }} />
    </div>
  );
}

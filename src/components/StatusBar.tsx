import { SignalIcon, BatteryIcon } from './icons';

/** iOS taklidi durum çubuğu (masaüstü önizlemede görünür, gerçek telefonda gizlenir) */
export function StatusBar() {
  return (
    <div
      className="fake-statusbar"
      style={{
        height: 52,
        flex: 'none',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '0 26px 8px',
        position: 'relative',
        zIndex: 3,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--sb)', letterSpacing: '.3px' }}>9:41</span>
      <div style={{ position: 'absolute', left: '50%', top: 9, transform: 'translateX(-50%)', width: 104, height: 30, background: '#0a0a0a', borderRadius: 16 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sb)' }}>
        <SignalIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

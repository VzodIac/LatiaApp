import type { CSSProperties } from 'react';

/** Minimal "powered by AUK" imzası — uygulama fontuyla, sade. */
export function Signature({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        textAlign: 'center',
        fontSize: 11,
        letterSpacing: '.6px',
        color: 'var(--muted)',
        ...style,
      }}
    >
      powered by <span style={{ fontWeight: 700, color: 'var(--fg2)', letterSpacing: '1px' }}>AUK</span>
    </div>
  );
}

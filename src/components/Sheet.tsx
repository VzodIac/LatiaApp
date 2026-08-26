import type { CSSProperties, ReactNode } from 'react';

interface SheetProps {
  onClose: () => void;
  children: ReactNode;
  maxHeight?: number;
  zIndex?: number;
}

/** Alttan açılan modal panel (bottom sheet). Arka plana dokununca kapanır. */
export function Sheet({ onClose, children, maxHeight = 660, zIndex = 30 }: SheetProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        background: 'rgba(10,20,40,.4)',
        animation: 'fadeIn .2s',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="scr"
        style={{
          width: '100%',
          background: 'var(--bg)',
          borderRadius: '26px 26px 0 0',
          padding: '10px 20px 30px',
          animation: 'sheetUp .28s cubic-bezier(.2,.9,.3,1)',
          maxHeight,
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--line)', margin: '6px auto 16px' }} />
        {children}
      </div>
    </div>
  );
}

/** Tam ekran kaplayan panel (aşağıdan yukarı kayarak açılır) */
export function FullSheet({ children, zIndex = 25, style }: { children: ReactNode; zIndex?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        background: 'var(--bg)',
        animation: 'sheetUp .26s cubic-bezier(.2,.9,.3,1)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Bölüm başlığı (küçük, büyük harf) */
export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--fg2)',
        textTransform: 'uppercase',
        letterSpacing: '.6px',
        marginBottom: 9,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

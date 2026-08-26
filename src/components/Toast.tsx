import { useStore } from '@/store/useStore';

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        background: 'var(--fg)',
        color: 'var(--bg)',
        padding: '11px 20px',
        borderRadius: 14,
        fontSize: 13.5,
        fontWeight: 600,
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        animation: 'toastIn .25s',
        whiteSpace: 'nowrap',
      }}
    >
      {toast}
    </div>
  );
}

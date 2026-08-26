// Küçük SVG ikonları — prototipten alındı. currentColor ile renklenir.

export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 18) / 16} viewBox="0 0 16 18" aria-hidden>
      <rect x="1" y="7" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function PlusIcon({ size = 15, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" aria-hidden>
      <rect x="6.2" y="1" width="2.6" height="13" rx="1.3" fill={color} />
      <rect x="1" y="6.2" width="13" height="2.6" rx="1.3" fill={color} />
    </svg>
  );
}

export function ChevronLeft({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 16) / 10} viewBox="0 0 10 16" aria-hidden>
      <path d="M8 1L2 8l6 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SignalIcon() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden>
      <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
      <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
      <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

export function BatteryIcon() {
  return (
    <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden>
      <rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" />
      <rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor" />
      <rect x="21.5" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" opacity=".5" />
    </svg>
  );
}

import { useStore } from '@/store/useStore';
import { useT } from '@/i18n/useT';

type Tab = 'orders' | 'dash' | 'menu' | 'settings';

const TABS: { id: Tab; name: string; icon: string }[] = [
  { id: 'orders', name: 'Masalar', icon: '▦' },
  { id: 'dash', name: 'Gün Sonu', icon: '▤' },
  { id: 'menu', name: 'Menü', icon: '☰' },
  { id: 'settings', name: 'Ayarlar', icon: '⚙' },
];

export function TabBar() {
  const tr = useT();
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  return (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        background: 'var(--tab)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--line)',
        padding: '9px 8px 26px',
        position: 'relative',
        zIndex: 3,
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
          <span style={{ fontSize: 10.5, fontWeight: 600 }}>{tr(t.name)}</span>
        </button>
      ))}
    </div>
  );
}

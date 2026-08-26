import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { fmt } from '@/lib/money';
import { IngredientsView } from './IngredientsView';
import { useT } from '@/i18n/useT';

export function MenuTab() {
  const tr = useT();
  const [view, setView] = useState<'items' | 'ingredients'>('items');
  const categories = useStore((s) => s.categories);
  const menuItems = useStore((s) => s.menuItems);
  const catInput = useStore((s) => s.catInput);
  const setCatInput = useStore((s) => s.setCatInput);
  const addCategory = useStore((s) => s.addCategory);
  const openEditor = useStore((s) => s.openEditor);

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '2px 0 14px' }}>
        <div style={{ fontSize: 23, fontWeight: 700, color: 'var(--fg)', whiteSpace: 'nowrap' }}>{tr('Menü Yönetimi')}</div>
        {view === 'items' && (
          <button onClick={() => openEditor(null)} style={{ flex: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
            {tr('+ Ürün')}
          </button>
        )}
      </div>

      {/* Ürünler / Malzemeler */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--surface2)', padding: 4, borderRadius: 14 }}>
        {(['items', 'ingredients'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 11,
              fontSize: 13.5,
              fontWeight: 600,
              background: view === v ? 'var(--surface)' : 'transparent',
              color: view === v ? 'var(--accent)' : 'var(--fg2)',
              boxShadow: view === v ? 'var(--shadow)' : 'none',
            }}
          >
            {v === 'items' ? tr('Ürünler') : tr('Malzemeler')}
          </button>
        ))}
      </div>

      {view === 'ingredients' && <IngredientsView />}

      {view === 'items' && categories.map((c) => {
        const items = menuItems.filter((m) => m.catId === c.id);
        return (
          <div key={c.id} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 2px 9px' }}>{c.name}</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
              {items.length === 0 && <div style={{ padding: '13px 15px', fontSize: 13, color: 'var(--muted)' }}>{tr('Ürün yok')}</div>}
              {items.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openEditor(m)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '13px 15px',
                    borderBottom: '1px solid var(--line)',
                    textAlign: 'left',
                    opacity: m.soldOut ? 0.6 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: m.soldOut ? 'var(--muted)' : 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    {m.soldOut && <div style={{ fontSize: 10.5, color: 'var(--danger)', fontWeight: 600, marginTop: 1 }}>{tr('Tükendi')}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--coral)' }}>{fmt(m.price)}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {view === 'items' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            value={catInput}
            onChange={(e) => setCatInput(e.target.value)}
            placeholder={tr('Yeni kategori adı')}
            style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', fontSize: 13, color: 'var(--fg)', outline: 'none' }}
          />
          <button onClick={() => void addCategory()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--fg)', padding: '0 16px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
            {tr('Ekle')}
          </button>
        </div>
      )}
    </div>
  );
}

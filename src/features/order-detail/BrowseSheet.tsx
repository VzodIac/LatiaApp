import { useStore } from '@/store/useStore';
import { fmt } from '@/lib/money';
import { FullSheet } from '@/components/Sheet';
import type { Order } from '@/types';
import { useT } from '@/i18n/useT';

export function BrowseSheet({ order }: { order: Order }) {
  const tr = useT();
  const categories = useStore((s) => s.categories);
  const menuItems = useStore((s) => s.menuItems);
  const browseCat = useStore((s) => s.browseCat);
  const setBrowseCat = useStore((s) => s.setBrowseCat);
  const closeBrowse = useStore((s) => s.closeBrowse);
  const addToOrder = useStore((s) => s.addToOrder);
  const changeQty = useStore((s) => s.changeQty);

  const items = menuItems.filter((m) => m.catId === browseCat);

  return (
    <FullSheet zIndex={30}>
      <div style={{ flex: 'none', padding: '52px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>{tr('Ürün Ekle')}</div>
        <button onClick={closeBrowse} style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}>
          {tr('Bitti')}
        </button>
      </div>

      <div className="scr" style={{ flex: 'none', display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 18px 12px' }}>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setBrowseCat(c.id)}
            style={{
              flex: 'none',
              padding: '8px 15px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              border: `1px solid ${browseCat === c.id ? 'var(--accent)' : 'var(--line)'}`,
              background: browseCat === c.id ? 'var(--accent)' : 'var(--surface)',
              color: browseCat === c.id ? '#fff' : 'var(--fg)',
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="scr" style={{ flex: 1, overflowY: 'auto', padding: '2px 18px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {items.map((m) => {
            const inOrder = order.items.filter((it) => it.itemId === m.id).reduce((a, it) => a + it.qty, 0);
            const firstUid = order.items.find((it) => it.itemId === m.id)?.uid ?? null;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  padding: '12px 13px',
                  opacity: m.soldOut ? 0.55 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: m.soldOut ? 'var(--muted)' : 'var(--fg)' }}>{m.name}</div>
                  {m.desc && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--fg2)',
                        marginTop: 2,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {m.desc}
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral)', marginTop: 4 }}>{fmt(m.price)}</div>
                </div>

                {m.soldOut ? (
                  <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, alignSelf: 'center' }}>{tr('Tükendi')}</span>
                ) : inOrder > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 11, alignSelf: 'center', flex: 'none' }}>
                    <button onClick={() => firstUid && changeQty(firstUid, -1)} style={{ width: 32, height: 32, fontSize: 19, color: 'var(--accent)', fontWeight: 600 }}>
                      −
                    </button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{inOrder}</span>
                    <button onClick={() => addToOrder(m.id)} style={{ width: 32, height: 32, fontSize: 19, color: 'var(--accent)', fontWeight: 600 }}>
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToOrder(m.id)}
                    style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--accent)', color: '#fff', fontSize: 20, fontWeight: 600, alignSelf: 'center', flex: 'none' }}
                  >
                    +
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </FullSheet>
  );
}

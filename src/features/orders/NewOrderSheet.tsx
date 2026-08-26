import { useStore } from '@/store/useStore';
import { Sheet, SectionLabel } from '@/components/Sheet';
import { chip, inputStyle, primaryBtn } from '@/components/ui';
import type { OrderKind } from '@/types';
import { useT } from '@/i18n/useT';

export function NewOrderSheet() {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const newKind = useStore((s) => s.newKind);
  const nameInput = useStore((s) => s.nameInput);
  const activeWaiter = useStore((s) => s.settings.activeWaiter);
  const waiters = useStore((s) => s.waiters);
  const tableDefs = useStore((s) => s.tables);
  const closeNewOrder = useStore((s) => s.closeNewOrder);
  const setNewKind = useStore((s) => s.setNewKind);
  const setNameInput = useStore((s) => s.setNameInput);
  const createTableOrder = useStore((s) => s.createTableOrder);
  const createNamedOrder = useStore((s) => s.createNamedOrder);
  const setActiveWaiter = useStore((s) => s.setActiveWaiter);

  const kinds: { k: OrderKind; label: string }[] = [
    { k: 'table', label: tr('Masa') },
    { k: 'name', label: tr('İsim') },
    { k: 'paket', label: tr('Paket') },
  ];

  const kindTabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: 10,
    borderRadius: 11,
    fontSize: 13.5,
    fontWeight: 600,
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--fg2)',
    boxShadow: active ? 'var(--shadow)' : 'none',
  });

  const open = orders.filter((o) => o.status === 'open');
  const isTable = newKind === 'table';

  return (
    <Sheet onClose={closeNewOrder} zIndex={20} maxHeight={640}>
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--fg)', marginBottom: 16 }}>{tr('Yeni Sipariş')}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, background: 'var(--surface2)', padding: 4, borderRadius: 14 }}>
        {kinds.map((k) => (
          <button key={k.k} onClick={() => setNewKind(k.k)} style={kindTabStyle(newKind === k.k)}>
            {k.label}
          </button>
        ))}
      </div>

      {isTable ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 20 }}>
          {tableDefs.map((t) => {
            const occ = open.some((x) => x.kind === 'table' && x.table === t.number);
            return (
              <button
                key={t.id}
                onClick={() => createTableOrder(t.number)}
                style={{
                  height: 52,
                  padding: '0 8px',
                  borderRadius: 13,
                  fontSize: 13.5,
                  fontWeight: 700,
                  border: '1px solid var(--line)',
                  background: occ ? 'var(--surface2)' : 'var(--surface)',
                  color: occ ? 'var(--muted)' : 'var(--fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={tr('Misafir adı')}
          style={{ ...inputStyle, marginBottom: 20 }}
        />
      )}

      <SectionLabel>{tr('Garson')}</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 22 }}>
        {waiters.map((w) => (
          <button key={w.name} onClick={() => setActiveWaiter(w.name)} style={chip(activeWaiter === w.name)}>
            {w.name}
          </button>
        ))}
      </div>

      {isTable ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{tr('Boş masaya dokun → sipariş açılır')}</div>
      ) : (
        <button onClick={createNamedOrder} style={primaryBtn}>
          {tr('Siparişi Aç')}
        </button>
      )}
    </Sheet>
  );
}

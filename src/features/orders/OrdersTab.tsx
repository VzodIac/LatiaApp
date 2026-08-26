import { useStore } from '@/store/useStore';
import { computeRemaining } from '@/lib/totals';
import { fmt } from '@/lib/money';
import { LockIcon, PlusIcon } from '@/components/icons';
import { card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { useT } from '@/i18n/useT';

export function OrdersTab() {
  const tr = useT();
  const orders = useStore((s) => s.orders);
  const extras = useStore((s) => s.extras);
  const tableDefs = useStore((s) => s.tables);
  const activeWaiter = useStore((s) => s.settings.activeWaiter);
  const openOrder = useStore((s) => s.openOrder);
  const createTableOrder = useStore((s) => s.createTableOrder);
  const openNewOrder = useStore((s) => s.openNewOrder);
  const lockApp = useStore((s) => s.lockApp);

  const open = orders.filter((o) => o.status === 'open');
  let openTotal = 0;
  open.forEach((o) => (openTotal += computeRemaining(o, extras).total));

  // Masalar (adları Ayarlar'dan değiştirilebilir)
  const tables = tableDefs.map((td) => {
    const o = open.find((x) => x.kind === 'table' && x.table === td.number);
    const t = computeRemaining(o ?? { items: [], discountType: 'none' }, extras);
    // Teslim edilenler durumu etkilemez; kalan ürünlere bakılır
    const pending = o ? o.items.filter((it) => it.kdsStatus !== 'served') : [];
    const ready = pending.some((it) => it.kdsStatus === 'ready');
    const preparing = !ready && pending.some((it) => it.kdsStatus === 'preparing');
    const allServed = !!o && o.items.length > 0 && pending.length === 0;
    return { ...td, occ: !!o, orderId: o?.id, ready, preparing, allServed, sub: o ? fmt(t.total) : tr('Boş') };
  });

  const named = open.filter((o) => o.kind === 'name' || o.kind === 'paket');

  return (
    <div style={{ padding: '4px 20px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 18px' }}>
        <div>
          <Logo height={30} />
          <div style={{ fontSize: 12, color: 'var(--fg2)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: 3 }}>{tr('Garson')} · {activeWaiter}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <button
            onClick={lockApp}
            style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg2)' }}
          >
            <LockIcon />
          </button>
          <button
            onClick={openNewOrder}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--accent)', color: '#fff', padding: '11px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 14px rgba(170,38,50,.3)' }}
          >
            <PlusIcon />
            {tr('Yeni')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ ...card, flex: 1, padding: '13px 14px' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>{open.length}</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 3 }}>{tr('Açık adisyon')}</div>
        </div>
        <div style={{ ...card, flex: 1, padding: '13px 14px' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--coral)', lineHeight: 1 }}>{fmt(openTotal)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--fg2)', marginTop: 3 }}>{tr('Açık tutar')}</div>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '.8px', margin: '6px 2px 10px' }}>{tr('Masalar')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {tables.map((t) => (
          <button
            key={t.id}
            onClick={() => (t.occ && t.orderId ? openOrder(t.orderId) : createTableOrder(t.number))}
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: 82,
              padding: 12,
              borderRadius: 16,
              textAlign: 'left',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--line)',
              background: t.occ ? 'var(--surface)' : 'var(--surface2)',
              color: t.occ ? 'var(--fg)' : 'var(--muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name}
              </span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.occ ? 'var(--coral)' : 'var(--good)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto' }}>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{t.sub}</span>
              {t.ready ? (
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 20, background: 'var(--good)', color: '#fff' }}>
                  {tr('Hazır')}
                </span>
              ) : t.preparing ? (
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 20, background: 'var(--accent)', color: '#fff' }}>
                  {tr('Hazırlanıyor')}
                </span>
              ) : t.allServed ? (
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--fg2)' }}>
                  {tr('Teslim edildi')}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {named.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg2)', textTransform: 'uppercase', letterSpacing: '.8px', margin: '22px 2px 10px' }}>{tr('İsim / Paket')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {named.map((o) => {
              const t = computeRemaining(o, extras);
              return (
                <button
                  key={o.id}
                  onClick={() => openOrder(o.id)}
                  style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 15px', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>{o.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg2)', marginTop: 2 }}>
                      {o.waiter} · {tr('{n} ürün', { n: o.items.length })}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--coral)' }}>{fmt(t.total)}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

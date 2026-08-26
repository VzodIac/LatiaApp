import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { fmt } from '@/lib/money';
import { Sheet, SectionLabel } from '@/components/Sheet';
import type { Order } from '@/types';
import { useT } from '@/i18n/useT';

export function ItemEditSheet({ order }: { order: Order }) {
  const tr = useT();
  const extras = useStore((s) => s.extras);
  const menuItems = useStore((s) => s.menuItems);
  const categories = useStore((s) => s.categories);
  const itemEdit = useStore((s) => s.itemEdit);
  const closeItemEdit = useStore((s) => s.closeItemEdit);
  const setNote = useStore((s) => s.setNote);
  const toggleExtra = useStore((s) => s.toggleExtra);
  const changeExtraQty = useStore((s) => s.changeExtraQty);
  const removeUid = useStore((s) => s.removeUid);

  const it = order.items.find((x) => x.uid === itemEdit);

  // Not alanı yerel tutulur: yazarken uzaktan gelen senkron güncellemesi
  // imleci ve yazılanı bozmasın. Store'a yazma geciktirilerek yapılır.
  const [note, setNoteLocal] = useState(it?.note ?? '');
  const editedUid = useRef<string | null>(null);
  useEffect(() => {
    if (it && editedUid.current !== it.uid) {
      editedUid.current = it.uid;
      setNoteLocal(it.note);
    }
  }, [it]);

  if (!it) return null;

  // İliştirilebilir ekstralar, kategorisinde izin verilen ürünlerde gösterilir
  // (kategori adı değişse de bozulmaması için bayrak üzerinden)
  const catId = menuItems.find((m) => m.id === it.itemId)?.catId;
  const allowsExtras = categories.find((c) => c.id === catId)?.allowExtras ?? false;

  return (
    <Sheet onClose={closeItemEdit} zIndex={35} maxHeight={660}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 14 }}>{it.name}</div>

      <SectionLabel style={{ marginBottom: 8 }}>{tr('Not')}</SectionLabel>
      <textarea
        value={note}
        onChange={(e) => {
          setNoteLocal(e.target.value);
          setNote(it.uid, e.target.value);
        }}
        placeholder={tr('ör. ekmek glutensiz, az pişmiş')}
        style={{
          width: '100%',
          minHeight: 64,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: 12,
          fontSize: 14,
          color: 'var(--fg)',
          outline: 'none',
          resize: 'none',
          marginBottom: 18,
        }}
      />

      {allowsExtras && extras.length > 0 && (
        <>
          <SectionLabel>{tr('Ekstralar')}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {extras.map((x) => {
              const sel = it.extras.find((e) => e.id === x.id);
              const qty = sel?.qty ?? 0;
              const on = qty > 0;
              return (
                <div
                  key={x.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 10px 9px 14px',
                    borderRadius: 12,
                    fontSize: 13.5,
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
                    background: on ? 'color-mix(in oklch, var(--accent), transparent 88%)' : 'var(--surface)',
                    color: on ? 'var(--accent)' : 'var(--fg)',
                  }}
                >
                  <button
                    onClick={() => toggleExtra(it.uid, x.id)}
                    style={{ flex: 1, minWidth: 0, textAlign: 'left', color: 'inherit' }}
                  >
                    <span style={{ display: 'block' }}>{x.name}</span>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                      +{fmt(x.price)}
                      {qty > 1 && <span style={{ color: 'var(--fg2)' }}> · toplam {fmt(x.price * qty)}</span>}
                    </span>
                  </button>

                  {on ? (
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 10, flex: 'none' }}>
                      <button
                        onClick={() => changeExtraQty(it.uid, x.id, -1)}
                        style={{ width: 32, height: 32, fontSize: 18, color: 'var(--accent)', fontWeight: 600 }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 20, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{qty}</span>
                      <button
                        onClick={() => changeExtraQty(it.uid, x.id, 1)}
                        style={{ width: 32, height: 32, fontSize: 18, color: 'var(--accent)', fontWeight: 600 }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => changeExtraQty(it.uid, x.id, 1)}
                      style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', color: '#fff', fontSize: 19, fontWeight: 600, flex: 'none' }}
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => removeUid(it.uid)}
          style={{ flex: 'none', padding: '14px 18px', borderRadius: 14, border: '1px solid var(--line)', color: 'var(--danger)', fontSize: 14, fontWeight: 600, background: 'var(--surface)' }}
        >
          {tr('Kaldır')}
        </button>
        <button onClick={closeItemEdit} style={{ flex: 1, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
          {tr('Tamam')}
        </button>
      </div>
    </Sheet>
  );
}

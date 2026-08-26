import { useStore } from '@/store/useStore';
import { Sheet, SectionLabel } from '@/components/Sheet';
import { parsePrice } from '@/lib/money';
import { RecipeEditor } from './IngredientsView';
import { useT } from '@/i18n/useT';

export function MenuEditor() {
  const tr = useT();
  const editor = useStore((s) => s.editor);
  const categories = useStore((s) => s.categories);
  const closeEditor = useStore((s) => s.closeEditor);
  const setEditorField = useStore((s) => s.setEditorField);
  const saveEditor = useStore((s) => s.saveEditor);
  const deleteEditorItem = useStore((s) => s.deleteEditorItem);

  if (!editor) return null;

  const fieldLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--fg2)', marginBottom: 6 };
  const field: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: 'var(--fg)',
    outline: 'none',
  };

  return (
    <Sheet onClose={closeEditor} zIndex={50} maxHeight={700}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 16 }}>{editor.mode === 'new' ? tr('Yeni Ürün') : tr('Ürünü Düzenle')}</div>

      <div style={fieldLabel}>{tr('Ürün adı')}</div>
      <input value={editor.name} onChange={(e) => setEditorField({ name: e.target.value })} style={{ ...field, marginBottom: 14 }} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={fieldLabel}>{tr('Fiyat (TL)')}</div>
          <input value={editor.price} onChange={(e) => setEditorField({ price: e.target.value })} inputMode="decimal" placeholder={tr('ör. 12,50')} style={field} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={fieldLabel}>{tr('Kategori')}</div>
          <select value={editor.catId} onChange={(e) => setEditorField({ catId: e.target.value })} style={{ ...field, fontSize: 14, WebkitAppearance: 'none' }}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={fieldLabel}>{tr('Açıklama')}</div>
      <textarea
        value={editor.desc}
        onChange={(e) => setEditorField({ desc: e.target.value })}
        style={{ ...field, minHeight: 56, resize: 'none', fontSize: 14, marginBottom: 14 }}
      />

      <button
        onClick={() => setEditorField({ soldOut: !editor.soldOut })}
        style={{
          width: '100%',
          padding: 13,
          borderRadius: 12,
          fontSize: 13.5,
          fontWeight: 600,
          border: `1px solid ${editor.soldOut ? 'var(--danger)' : 'var(--line)'}`,
          background: editor.soldOut ? 'color-mix(in oklch, var(--danger), transparent 88%)' : 'var(--surface)',
          color: editor.soldOut ? 'var(--danger)' : 'var(--fg2)',
        }}
      >
        {editor.soldOut ? tr('✓ Tükendi olarak işaretli') : tr('Tükendi işaretle')}
      </button>

      {editor.mode === 'edit' && editor.id && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>{tr('Reçete (içindekiler)')}</SectionLabel>
          <RecipeEditor menuItemId={editor.id} price={parsePrice(editor.price)} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        {editor.mode === 'edit' && (
          <button
            onClick={() => void deleteEditorItem()}
            style={{ flex: 'none', padding: '14px 18px', borderRadius: 14, border: '1px solid var(--line)', color: 'var(--danger)', fontSize: 14, fontWeight: 600, background: 'var(--surface)' }}
          >
            {tr('Sil')}
          </button>
        )}
        <button onClick={() => void saveEditor()} style={{ flex: 1, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
          {tr('Kaydet')}
        </button>
      </div>
    </Sheet>
  );
}

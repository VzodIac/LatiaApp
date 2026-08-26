import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { newId } from '@/data/remote';
import { fmt, parsePrice } from '@/lib/money';
import { Sheet } from '@/components/Sheet';
import type { Ingredient } from '@/types';
import { useT } from '@/i18n/useT';

const UNITS = [
  { id: 'g', label: 'gram' },
  { id: 'ml', label: 'mililitre' },
  { id: 'adet', label: 'adet' },
];

/**
 * Malzeme listesi. Ürün maliyetleri buradaki birim maliyetlerden hesaplanır,
 * fiyat değiştiğinde geçmişe kayıt düşülür (veritabanı tetikleyicisi).
 */
export function IngredientsView() {
  const tr = useT();
  const ingredients = useStore((s) => s.ingredients);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  const blank = (): Ingredient => ({
    id: newId(),
    name: '',
    unit: 'g',
    costPerUnit: 0,
    allergens: [],
    supplier: null,
    active: true,
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '2px 0 14px' }}>
        <div style={{ fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
          {tr('Birim maliyeti gir, ürün reçetesine ekle — ürün maliyeti ve kâr marjı otomatik hesaplansın.')}
        </div>
        <button
          onClick={() => setEditing(blank())}
          style={{ flex: 'none', background: 'var(--accent)', color: '#fff', padding: '9px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600 }}
        >
          {tr('+ Malzeme')}
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        {ingredients.length === 0 && (
          <div style={{ padding: '14px 15px', fontSize: 13, color: 'var(--muted)' }}>
            {tr('Henüz malzeme yok. "+ Malzeme" ile başla.')}
          </div>
        )}
        {ingredients.map((i) => (
          <button
            key={i.id}
            onClick={() => setEditing(i)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '13px 15px',
              borderBottom: '1px solid var(--line)',
              textAlign: 'left',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{i.name}</div>
              {i.allergens.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--coral)', marginTop: 2 }}>{i.allergens.join(', ')}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--coral)' }}>{fmt(i.costPerUnit)}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>/ {i.unit}</div>
            </div>
          </button>
        ))}
      </div>

      {editing && <IngredientEditor draft={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function IngredientEditor({ draft, onClose }: { draft: Ingredient; onClose: () => void }) {
  const tr = useT();
  const ingredients = useStore((s) => s.ingredients);
  const saveIngredient = useStore((s) => s.saveIngredient);
  const removeIngredient = useStore((s) => s.removeIngredient);
  const showToast = useStore((s) => s.showToast);

  const exists = ingredients.some((i) => i.id === draft.id);
  const [name, setName] = useState(draft.name);
  const [unit, setUnit] = useState(draft.unit);
  const [cost, setCost] = useState(draft.costPerUnit ? String(draft.costPerUnit) : '');
  const [allergens, setAllergens] = useState(draft.allergens.join(', '));
  // Kullanıcı kolaylığı: "1 kg kaça mal oluyor" girip birim maliyete çevirebilsin
  const [bulkQty, setBulkQty] = useState('');
  const [bulkCost, setBulkCost] = useState('');

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
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--fg2)', marginBottom: 6 };

  const applyBulk = () => {
    const q = parsePrice(bulkQty);
    const c = parsePrice(bulkCost);
    if (q <= 0 || c <= 0) {
      showToast(tr('Miktar ve tutar gir'));
      return;
    }
    setCost(String(Math.round((c / q) * 10000) / 10000));
    setBulkQty('');
    setBulkCost('');
  };

  const save = () => {
    if (!name.trim()) {
      showToast(tr('Malzeme adı gerekli'));
      return;
    }
    void saveIngredient({
      ...draft,
      name: name.trim(),
      unit,
      costPerUnit: parsePrice(cost),
      allergens: allergens
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    });
    onClose();
  };

  return (
    <Sheet onClose={onClose} zIndex={52} maxHeight={720}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 16 }}>
        {exists ? tr('Malzemeyi Düzenle') : tr('Yeni Malzeme')}
      </div>

      <div style={label}>{tr('Malzeme adı')}</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('ör. Mozzarella')} style={{ ...field, marginBottom: 14 }} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={label}>{tr('Birim')}</div>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...field, fontSize: 14, WebkitAppearance: 'none' }}>
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>
                {tr(u.label)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <div style={label}>{tr('Birim maliyet (TL)')}</div>
          <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="0,40" style={field} />
        </div>
      </div>

      {/* Toplu alımdan birim maliyet hesaplama */}
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--fg2)', marginBottom: 8, lineHeight: 1.4 }}>
          {tr('Toplu alımdan hesapla:')} <b>{unit === tr('adet') ? tr('kaç adet') : `kaç ${unit}`}</b> {tr('kaça geldi?')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={bulkQty}
            onChange={(e) => setBulkQty(e.target.value)}
            inputMode="decimal"
            placeholder={unit === tr('adet') ? tr('adet') : unit}
            style={{ ...field, flex: 1, fontSize: 13, padding: '10px 11px' }}
          />
          <input
            value={bulkCost}
            onChange={(e) => setBulkCost(e.target.value)}
            inputMode="decimal"
            placeholder="TL"
            style={{ ...field, flex: 1, fontSize: 13, padding: '10px 11px' }}
          />
          <button
            onClick={applyBulk}
            style={{ flex: 'none', padding: '0 14px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}
          >
            {tr('Hesapla')}
          </button>
        </div>
      </div>

      <div style={label}>{tr('Alerjenler (virgülle ayır)')}</div>
      <input
        value={allergens}
        onChange={(e) => setAllergens(e.target.value)}
        placeholder={tr('Süt, Gluten')}
        style={{ ...field, marginBottom: 18 }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        {exists && (
          <button
            onClick={() => {
              void removeIngredient(draft.id);
              onClose();
            }}
            style={{ flex: 'none', padding: '14px 18px', borderRadius: 14, border: '1px solid var(--line)', color: 'var(--danger)', fontSize: 14, fontWeight: 600, background: 'var(--surface)' }}
          >
            {tr('Sil')}
          </button>
        )}
        <button onClick={save} style={{ flex: 1, padding: 14, borderRadius: 14, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
          {tr('Kaydet')}
        </button>
      </div>
    </Sheet>
  );
}

/**
 * Ürün düzenleme ekranındaki reçete bölümü.
 * Malzeme + miktar girilir; maliyet ve kâr marjı anında görünür.
 */
export function RecipeEditor({ menuItemId, price }: { menuItemId: string; price: number }) {
  const tr = useT();
  const ingredients = useStore((s) => s.ingredients);
  const recipes = useStore((s) => s.recipes);
  const saveRecipeItem = useStore((s) => s.saveRecipeItem);
  const removeRecipeItem = useStore((s) => s.removeRecipeItem);
  const showToast = useStore((s) => s.showToast);

  const [ingId, setIngId] = useState('');
  const [qty, setQty] = useState('');

  const rows = recipes.filter((r) => r.menuItemId === menuItemId);
  const cost = rows.reduce((a, r) => {
    const ing = ingredients.find((i) => i.id === r.ingredientId);
    return a + (ing ? ing.costPerUnit * r.qty : 0);
  }, 0);
  const margin = price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : 0;

  const add = () => {
    if (!ingId) {
      showToast(tr('Malzeme seç'));
      return;
    }
    const q = parsePrice(qty);
    if (q <= 0) {
      showToast(tr('Miktar gir'));
      return;
    }
    void saveRecipeItem({
      id: newId(),
      menuItemId,
      extraId: null,
      ingredientId: ingId,
      qty: q,
      note: null,
      sort: rows.length,
    });
    setIngId('');
    setQty('');
  };

  const field: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 12,
    padding: '11px 12px',
    fontSize: 13.5,
    color: 'var(--fg)',
    outline: 'none',
  };

  if (ingredients.length === 0) {
    return (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 12, padding: 13, fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.5 }}>
        {tr('Reçete girmek için önce Menü → Malzemeler bölümünden malzeme eklemelisin.')}
      </div>
    );
  }

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
        {rows.length === 0 && (
          <div style={{ padding: '12px 13px', fontSize: 12.5, color: 'var(--muted)' }}>{tr('Reçete girilmemiş')}</div>
        )}
        {rows.map((r) => {
          const ing = ingredients.find((i) => i.id === r.ingredientId);
          const lineCost = ing ? ing.costPerUnit * r.qty : 0;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--fg)' }}>{ing?.name ?? '—'}</span>
              <span style={{ fontSize: 12.5, color: 'var(--fg2)' }}>
                {r.qty} {ing?.unit}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--coral)', minWidth: 56, textAlign: 'right' }}>{fmt(lineCost)}</span>
              <button
                onClick={() => void removeRecipeItem(r.id)}
                aria-label={tr('Sil')}
                style={{ flex: 'none', width: 26, height: 26, borderRadius: 8, color: 'var(--danger)', fontSize: 16, fontWeight: 700 }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={ingId} onChange={(e) => setIngId(e.target.value)} style={{ ...field, flex: 1, minWidth: 0, WebkitAppearance: 'none' }}>
          <option value="">{tr('Malzeme seç…')}</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.unit})
            </option>
          ))}
        </select>
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputMode="decimal"
          placeholder={tr('miktar')}
          style={{ ...field, width: 82 }}
        />
        <button onClick={add} style={{ flex: 'none', padding: '0 14px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700 }}>
          {tr('Ekle')}
        </button>
      </div>

      {/* Maliyet özeti */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{fmt(cost)}</div>
          <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{tr('Maliyet')}</div>
        </div>
        <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: margin >= 60 ? 'var(--good)' : margin >= 30 ? 'var(--fg)' : 'var(--danger)' }}>
            %{margin}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg2)' }}>{tr('Kâr marjı')}</div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { newId, uploadReceipt, receiptUrl } from '@/data/remote';
import { scanReceipt, type ReceiptScan } from '@/lib/ocr';
import { fmt } from '@/lib/money';
import { parsePrice } from '@/lib/money';
import { formatShortDate, toDateInput, fromDateInput } from '@/lib/date';
import type { Purchase } from '@/types';
import { useT } from '@/i18n/useT';
import { card, sectionTitle, input, primaryBtn } from './ui';

/**
 * Malzeme alımları — e-faturaya giden yolun ilk adımı.
 *
 * e-Fatura entegrasyonunun zor kısmı bağlantı değil, fatura satırını kendi
 * malzemene eşleştirmektir. Önce burada elle/fişten veri toplanır; entegratör
 * bağlandığında aynı tabloya yazılır ve raporlar değişmez.
 */
export function PurchasesView() {
  const tr = useT();
  const ingredients = useStore((s) => s.ingredients);
  const purchases = useStore((s) => s.purchases);
  const loading = useStore((s) => s.mgmtLoading);
  const load = useStore((s) => s.loadPurchases);
  const addPurchase = useStore((s) => s.addPurchase);
  const removePurchase = useStore((s) => s.removePurchase);
  const showToast = useStore((s) => s.showToast);

  const [open, setOpen] = useState(false);
  const [ingId, setIngId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [docNo, setDocNo] = useState('');
  const [qty, setQty] = useState('');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState(() => toDateInput(Date.now()));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [scan, setScan] = useState<ReceiptScan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const ing = ingredients.find((i) => i.id === ingId);
  const qtyNum = parsePrice(qty);
  const totalNum = parsePrice(total);
  const unitCost = qtyNum > 0 ? totalNum / qtyNum : 0;

  const reset = () => {
    setIngId('');
    setSupplier('');
    setDocNo('');
    setQty('');
    setTotal('');
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceipt(null);
    setReceiptPreview(null);
    setScan(null);
    setOpen(false);
  };

  const pickReceipt = (f: File | null) => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceipt(f);
    setReceiptPreview(f ? URL.createObjectURL(f) : null);
    setScan(null);
  };

  /**
   * Fişi cihazda okur ve alanları ÖNERİ olarak doldurur.
   *
   * Okuma otomatik başlamıyor: ilk kullanımda ~5 MB model iniyor, bu mobil
   * veride sürpriz olmamalı. Ayrıca yalnızca boş alanlar doldurulur —
   * kullanıcının elle girdiği bir değer OCR tahminiyle ezilmemeli.
   */
  const runScan = async () => {
    if (!receipt) return;
    setScanning(true);
    setScanPct(0);
    try {
      const r = await scanReceipt(receipt, setScanPct);
      setScan(r);
      if (r.total != null && !total) setTotal(String(r.total).replace('.', ','));
      if (r.date != null) setDate(toDateInput(r.date));
      if (r.docNo && !docNo) setDocNo(r.docNo);
      if (r.supplier && !supplier) setSupplier(r.supplier);
      if (r.total == null && !r.date && !r.docNo) showToast(tr('Fişten bilgi okunamadı'));
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  const submit = async () => {
    if (!ing) return showToast(tr('Malzeme seç'));
    if (qtyNum <= 0) return showToast(tr('Miktar gir'));
    if (totalNum <= 0) return showToast(tr('Tutar gir'));

    setSaving(true);
    try {
      // Fiş fotoğrafı varsa önce yüklenir; yükleme başarısızsa alım yine de
      // kaydedilir — fotoğraf yüzünden veri girişi kaybolmamalı.
      let path: string | null = null;
      if (receipt) {
        try {
          path = await uploadReceipt(receipt);
        } catch (e) {
          showToast(e instanceof Error ? e.message : String(e));
        }
      }

      const p: Purchase = {
        id: newId(),
        ingredientId: ing.id,
        ingredientName: ing.name,
        supplier: supplier.trim() || null,
        docNo: docNo.trim() || null,
        source: 'manual',
        qty: qtyNum,
        unit: ing.unit,
        total: totalNum,
        unitCost: Math.round(unitCost * 10000) / 10000,
        purchasedAt: fromDateInput(date),
        note: null,
        receiptPath: path,
      };
      await addPurchase(p);
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ ...primaryBtn, marginBottom: 12 }}>
          + {tr('Alım Ekle')}
        </button>
      ) : (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>{tr('Yeni alım')}</div>

          {/* Fiş fotoğrafı.
              Otomatik okuma (OCR / e-fatura) henüz bağlı değil; fotoğraf
              alımla birlikte arşivleniyor, böylece okuma devreye girdiğinde
              geçmiş fişler de işlenebilir ve bu arada belge kayıt altında kalır. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)}
            style={{ display: 'none' }}
          />

          {receiptPreview ? (
            <div style={{ position: 'relative', marginBottom: 11 }}>
              <img
                src={receiptPreview}
                alt={tr('Fiş')}
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--line)' }}
              />
              <button
                onClick={() => pickReceipt(null)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: 'rgba(0,0,0,.6)',
                  color: '#fff',
                  fontSize: 17,
                  fontWeight: 700,
                }}
                aria-label={tr('Kaldır')}
              >
                ×
              </button>

              <button
                onClick={() => void runScan()}
                disabled={scanning}
                style={{
                  width: '100%',
                  marginTop: 9,
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid var(--accent)',
                  background: 'var(--surface2)',
                  color: 'var(--accent)',
                  fontSize: 13.5,
                  fontWeight: 700,
                  opacity: scanning ? 0.7 : 1,
                }}
              >
                {scanning
                  ? `${tr('Okunuyor')} %${Math.round(scanPct * 100)}`
                  : `🔍 ${tr('Fişten oku')}`}
              </button>

              {scanning && (
                <div style={{ height: 3, borderRadius: 2, background: 'var(--line)', marginTop: 7, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', width: `${scanPct * 100}%`, transition: 'width .2s' }} />
                </div>
              )}

              {scan && !scanning && (
                <div
                  style={{
                    marginTop: 9,
                    padding: '9px 11px',
                    borderRadius: 11,
                    background: 'var(--surface2)',
                    fontSize: 11.5,
                    color: 'var(--fg2)',
                    lineHeight: 1.5,
                  }}
                >
                  <b style={{ color: 'var(--fg)' }}>{tr('Fişten okunanlar aşağı yazıldı — kontrol et.')}</b>
                  <br />
                  {tr('Okuma güveni')}: %{Math.round(scan.confidence)}
                  {scan.total != null && scan.totalLabel == null && (
                    <>
                      <br />
                      <span style={{ color: 'var(--coral)' }}>
                        {tr('Toplam etiketi bulunamadı; fişteki en büyük tutar alındı.')}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%',
                padding: '14px 12px',
                borderRadius: 12,
                border: '1.5px dashed var(--accent)',
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: 13.5,
                fontWeight: 600,
                marginBottom: 11,
              }}
            >
              📷 {tr('Fiş fotoğrafı çek')}
            </button>
          )}

          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
            {tr('Fiş alım kaydına eklenir ve arşivlenir. Okuma cihazda yapılır — fotoğraf hiçbir sunucuya gönderilmez. İlk okumada yaklaşık 5 MB model iner. Termal fişte hata payı vardır; okunan değerleri mutlaka kontrol et.')}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <select value={ingId} onChange={(e) => setIngId(e.target.value)} style={input}>
              <option value="">{tr('Malzeme seç…')}</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 9 }}>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="decimal"
                placeholder={ing ? tr('Miktar ({unit})', { unit: ing.unit }) : tr('Miktar')}
                style={input}
              />
              <input
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                inputMode="decimal"
                placeholder={tr('Ödenen toplam')}
                style={input}
              />
            </div>

            <div style={{ display: 'flex', gap: 9 }}>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder={tr('Tedarikçi')} style={input} />
              <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder={tr('Fatura / fiş no')} style={input} />
            </div>

            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} style={input} />
          </div>

          {/* Hesaplanan birim maliyet — kaydetmeden önce görünsün ki
              yanlış birim (kg yerine gram) fark edilsin */}
          {ing && qtyNum > 0 && totalNum > 0 && (
            <div
              style={{
                marginTop: 11,
                padding: '10px 12px',
                borderRadius: 11,
                background: 'var(--surface2)',
                fontSize: 12.5,
                color: 'var(--fg2)',
                lineHeight: 1.5,
              }}
            >
              {tr('Yeni birim maliyet')}: <b style={{ color: 'var(--fg)' }}>{fmt(unitCost)} / {ing.unit}</b>
              <br />
              {tr('Şu anki')}: {fmt(ing.costPerUnit)} / {ing.unit}
            </div>
          )}

          <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
            <button onClick={reset} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)', color: 'var(--fg)', fontSize: 13.5, fontWeight: 600, background: 'transparent' }}>
              {tr('Vazgeç')}
            </button>
            <button onClick={() => void submit()} disabled={saving} style={{ ...primaryBtn, flex: 1, width: 'auto', opacity: saving ? 0.6 : 1 }}>
              {saving ? tr('Kaydediliyor…') : tr('Kaydet')}
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, margin: '0 2px 4px' }}>
        {tr('Alım kaydedildiğinde malzemenin birim maliyeti güncellenir ve reçetelerden ürün maliyetlerine yayılır. Satılmış ürünlerin maliyeti satış anında dondurulduğu için geçmiş kâr bozulmaz.')}
      </div>

      <div style={sectionTitle}>
        {tr('Son alımlar')} {loading && <span style={{ fontWeight: 400 }}>· {tr('Yükleniyor…')}</span>}
      </div>

      {purchases.length === 0 ? (
        <div style={{ ...card, color: 'var(--muted)', fontSize: 13.5 }}>{tr('Henüz alım kaydı yok')}</div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {purchases.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>
                  {p.ingredientName}
                  {p.receiptPath && <ReceiptLink path={p.receiptPath} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg2)', marginTop: 2 }}>
                  {formatShortDate(p.purchasedAt)} · {p.qty} {p.unit}
                  {p.supplier && ` · ${p.supplier}`}
                  {p.docNo && ` · #${p.docNo}`}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>{fmt(p.total)}</div>
                <div style={{ fontSize: 11, color: 'var(--fg2)' }}>
                  {fmt(p.unitCost)} / {p.unit}
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(tr('Bu alım kaydı silinsin mi? Malzemenin güncel maliyeti değişmez.'))) void removePurchase(p.id);
                }}
                style={{ flex: 'none', color: 'var(--danger)', fontSize: 16, padding: '0 2px' }}
                aria-label={tr('Sil')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Arşivlenmiş fişi kısa ömürlü imzalı bağlantıyla açar */
function ReceiptLink({ path }: { path: string }) {
  const tr = useT();
  const [busy, setBusy] = useState(false);

  return (
    <button
      onClick={async () => {
        setBusy(true);
        const url = await receiptUrl(path);
        setBusy(false);
        if (url) window.open(url, '_blank', 'noopener');
      }}
      style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginLeft: 7 }}
    >
      {busy ? '…' : `📷 ${tr('Fiş')}`}
    </button>
  );
}

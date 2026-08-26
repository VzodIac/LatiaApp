import { fmt } from './money';
import { formatTime } from './date';
import { t, getLocale } from '@/i18n';
import type { Order } from '@/types';

/**
 * Termal yazıcı fişi.
 *
 * Termal yazıcılar (58/80 mm) işletim sisteminin yazdırma kuyruğuna bağlanır;
 * tarayıcıdan doğrudan ESC/POS göndermek mümkün olmadığı için fiş, kağıt
 * genişliğine göre biçimlenmiş bir HTML olarak yazdırılır. Gizli bir iframe
 * kullanılır: açılır pencere engelleyicilerine takılmaz ve sayfadan ayrılmaz.
 */

export interface PrintOptions {
  /** Kağıt genişliği (mm) — çoğu termal yazıcı 80, küçükler 58 */
  widthMm?: number;
  /** Fiş başlığındaki işletme adı */
  businessName?: string;
  /** Alt bilgi (adres/telefon) */
  footer?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Fişte yazacak tek satır */
export interface ReceiptLine {
  name: string;
  qty: number;
  amount: number;
  /** Görüntülenecek ekstra adları (ör. "2× Yumurta") */
  extras: string[];
  note?: string;
}

function itemsHtml(lines: ReceiptLine[]): string {
  return lines
    .map((l) => {
      const extraLines = l.extras.map((x) => `<div class="sub">+ ${esc(x)}</div>`).join('');
      const note = l.note ? `<div class="sub">“${esc(l.note)}”</div>` : '';
      return `
        <div class="row">
          <span class="qty">${l.qty}×</span>
          <span class="name">${esc(l.name)}${extraLines}${note}</span>
          <span class="amt">${esc(fmt(l.amount))}</span>
        </div>`;
    })
    .join('');
}

export interface ReceiptPayload {
  order: Order;
  lines: ReceiptLine[];
  /** Bu fişte tahsil edilen tutar (kısmi ödemede seçilenlerin toplamı) */
  amount: number;
  subtotal?: number;
  discount?: number;
  method: 'cash' | 'card' | null;
  waiter: string;
  paidAt: number;
  partial?: boolean;
}

function receiptHtml(p: ReceiptPayload, opts: PrintOptions): string {
  const w = opts.widthMm ?? 80;
  const name = opts.businessName ?? 'LA TÍA';
  const date = new Date(p.paidAt).toLocaleDateString(getLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const discountRow =
    p.discount && p.discount > 0
      ? `<div class="row total-row"><span>${esc(t('İndirim'))}</span><span>−${esc(fmt(p.discount))}</span></div>`
      : '';
  const subtotalRow =
    p.subtotal != null
      ? `<div class="row total-row"><span>${esc(t('Ara toplam'))}</span><span>${esc(fmt(p.subtotal))}</span></div>`
      : '';

  return `<!doctype html>
<html lang="${getLocale().slice(0, 2)}"><head><meta charset="utf-8">
<title>${esc(name)}</title>
<style>
  @page { size: ${w}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: ${w}mm;
    padding: 4mm 3mm 8mm;
    font-family: "Menlo", "Consolas", "Courier New", monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    -webkit-font-smoothing: none;
  }
  .center { text-align: center; }
  .brand { font-size: 19px; font-weight: 700; letter-spacing: 1px; margin-bottom: 1mm; }
  .muted { font-size: 10px; }
  .sep { border-top: 1px dashed #000; margin: 2mm 0; }
  .meta { display: flex; justify-content: space-between; font-size: 10px; }
  .row { display: flex; align-items: flex-start; gap: 2mm; margin-bottom: 1.2mm; }
  .qty { flex: none; min-width: 7mm; font-weight: 700; }
  .name { flex: 1; word-break: break-word; }
  .amt { flex: none; text-align: right; white-space: nowrap; }
  .sub { font-size: 9.5px; padding-left: 1mm; }
  .total-row { justify-content: space-between; font-size: 11px; }
  .grand { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; margin-top: 1.5mm; }
  .footer { margin-top: 4mm; font-size: 9.5px; }
</style></head>
<body>
  <div class="center brand">${esc(name)}</div>
  ${p.partial ? `<div class="center muted">${esc(t('Kısmi ödeme'))}</div>` : ''}
  <div class="sep"></div>

  <div class="meta"><span>${esc(p.order.label)}</span><span>${esc(date)} ${esc(formatTime(p.paidAt))}</span></div>
  <div class="meta"><span>${esc(t('Garson'))}: ${esc(p.waiter)}</span><span>${esc(
    p.method === 'cash' ? t('Nakit') : p.method === 'card' ? t('Kart') : '—',
  )}</span></div>

  <div class="sep"></div>
  ${itemsHtml(p.lines)}
  <div class="sep"></div>

  ${subtotalRow}
  ${discountRow}
  <div class="grand"><span>${esc(t('Toplam'))}</span><span>${esc(fmt(p.amount))}</span></div>

  <div class="center footer">
    ${opts.footer ? esc(opts.footer) + '<br>' : ''}
    ${esc(t('Teşekkür ederiz'))}
  </div>
</body></html>`;
}

/** Fişi yazdırma iletişim kutusuna gönderir */
export function printReceipt(payload: ReceiptPayload, opts: PrintOptions = {}) {
  const html = receiptHtml(payload, opts);

  // Var olan yazdırma iframe'ini temizle
  document.getElementById('latia-print-frame')?.remove();

  const frame = document.createElement('iframe');
  frame.id = 'latia-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  const go = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      /* yazdırma iptal edildi */
    }
    // Yazdırma iletişim kutusu kapandıktan sonra temizle
    setTimeout(() => frame.remove(), 60000);
  };

  if (doc.readyState === 'complete') setTimeout(go, 60);
  else frame.onload = () => setTimeout(go, 60);
}

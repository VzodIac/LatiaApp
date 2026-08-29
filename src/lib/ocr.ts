/**
 * Cihaz üstü fiş okuma (OCR).
 *
 * Tesseract WASM olarak tarayıcıda çalışır — fotoğraf hiçbir sunucuya gitmez.
 * Model ve çekirdek kendi sunucumuzdan, ilk kullanımda indirilir (~5 MB) ve
 * tarayıcı önbelleğinde kalır.
 *
 * BEKLENTİ: Termal fiş OCR'ı mükemmel değildir — soluk baskı, kıvrım ve
 * dar matris yazı hata üretir. Bu yüzden sonuçlar "öneri" olarak dönüyor;
 * hiçbir alan kullanıcı onayı olmadan kesinleşmiş sayılmamalı. Satır satır
 * ürün eşleştirmesi bu yolla güvenilir değildir ve denenmiyor: yalnızca
 * toplam tutar, tarih, belge no ve tedarikçi adı çıkarılıyor.
 */

export interface ReceiptScan {
  /** Okunan ham metin — kullanıcıya gösterilebilir, hata ayıklamada işe yarar */
  text: string;
  /** Tesseract'ın genel güven puanı (0-100) */
  confidence: number;
  total: number | null;
  /** Tutarın hangi anahtar kelimeden bulunduğu ("GENEL TOPLAM" gibi) */
  totalLabel: string | null;
  date: number | null;
  docNo: string | null;
  supplier: string | null;
}

const MAX_EDGE = 1800;

/**
 * Görüntü ön işleme — OCR doğruluğundaki en büyük kaldıraç.
 *
 * Ölçekleme + gri tonlama + Otsu eşikleme. Termal fişte gölge ve düşük
 * kontrast en yaygın hata sebebi; ikili görüntüye çevirmek bunu belirgin
 * biçimde azaltıyor.
 */
export async function preprocess(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  // Gri tonlama + histogram
  const hist = new Uint32Array(256);
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    gray[p] = g;
    hist[g | 0]++;
  }

  // Otsu: sınıf içi varyansı en aza indiren eşik
  const total = w * h;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }

  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const v = gray[p] > threshold ? 255 : 0;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Görüntü işlenemedi'))), 'image/png'),
  );
}

/** Fişi okur. onProgress 0..1 arası ilerleme bildirir. */
export async function scanReceipt(file: File, onProgress?: (p: number) => void): Promise<ReceiptScan> {
  const prepared = await preprocess(file);
  onProgress?.(0.1);

  // Ağır bağımlılık: ancak fiş okunmak istendiğinde yüklenir
  const { createWorker, PSM } = await import('tesseract.js');

  const worker = await createWorker('tur', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/',
    langPath: '/ocr/lang',
    gzip: true,
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(0.1 + m.progress * 0.9);
    },
  });

  try {
    await worker.setParameters({
      // Fiş tek bir metin bloğudur; sütun/sayfa analizi hata üretiyor
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
    });
    const { data } = await worker.recognize(prepared);
    onProgress?.(1);
    return parseReceipt(data.text, data.confidence ?? 0);
  } finally {
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// Ayrıştırma
// ---------------------------------------------------------------------------

/** "1.234,56" / "1234.56" / "1 234,56" → 1234.56 */
function toAmount(raw: string): number | null {
  const s = raw.replace(/\s/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})*|\d+)([.,]\d{1,2})?$/.exec(s);
  if (!m) return null;
  const intPart = m[1].replace(/[.,]/g, '');
  const frac = m[2] ? m[2].slice(1) : '0';
  const v = Number(`${intPart}.${frac.padEnd(2, '0')}`);
  return Number.isFinite(v) ? v : null;
}

const AMOUNT_RE = /(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})/g;

/** Öncelik sırasıyla toplam anahtarları — en spesifik önce */
const TOTAL_KEYS = ['GENEL TOPLAM', 'ODENECEK', 'ÖDENECEK', 'TOPLAM', 'TUTAR'];

const upper = (s: string) => s.toLocaleUpperCase('tr-TR');

export function parseReceipt(text: string, confidence: number): ReceiptScan {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // ---- Toplam tutar ----
  let total: number | null = null;
  let totalLabel: string | null = null;

  outer: for (const key of TOTAL_KEYS) {
    for (let i = 0; i < lines.length; i++) {
      const U = upper(lines[i]);
      if (!U.includes(key)) continue;
      // "TOPLAM KDV" / "KDV TOPLAMI" toplam değil, vergi satırıdır
      if (U.includes('KDV')) continue;

      // Tutar aynı satırda ya da hemen altındaki satırda olur
      for (const cand of [lines[i], lines[i + 1] ?? '']) {
        const found = cand.match(AMOUNT_RE);
        if (!found?.length) continue;
        // Satırdaki son sayı tutardır (öncekiler adet/birim fiyat olabilir)
        const v = toAmount(found[found.length - 1]);
        if (v != null && v > 0) {
          total = v;
          totalLabel = key;
          break outer;
        }
      }
    }
  }

  // Anahtar kelime bulunamadıysa fişteki en büyük tutar makul bir tahmindir
  if (total == null) {
    const all = (text.match(AMOUNT_RE) ?? []).map(toAmount).filter((v): v is number => v != null);
    if (all.length) {
      total = Math.max(...all);
      totalLabel = null;
    }
  }

  // ---- Tarih ----
  let date: number | null = null;
  const dm = text.match(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
  if (dm) {
    const d = Number(dm[1]);
    const mo = Number(dm[2]);
    let y = Number(dm[3]);
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) {
      const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
      if (dt.getDate() === d && dt.getMonth() === mo - 1) date = dt.getTime();
    }
  }

  // ---- Belge no ----
  let docNo: string | null = null;
  // Fatura numaraları "A-2026/8841" gibi bölü de içerebilir
  const nm = text.match(/(?:FİŞ|FIS|BELGE|FATURA)\s*(?:NO|NU)?\s*[:.]?\s*([A-Z0-9/-]{3,20})/i);
  if (nm) docNo = nm[1].trim();

  // ---- Tedarikçi ----
  // Fişin üst kısmındaki ilk anlamlı metin satırı işletme adıdır. Sayı ve
  // tarih ağırlıklı satırlar (adres, tel, vergi no) elenir.
  let supplier: string | null = null;
  for (const l of lines.slice(0, 6)) {
    const letters = (l.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) ?? []).length;
    const digits = (l.match(/\d/g) ?? []).length;
    if (letters >= 4 && letters > digits * 2 && l.length <= 40) {
      supplier = l;
      break;
    }
  }

  return { text, confidence, total, totalLabel, date, docNo, supplier };
}

// La Tía marka görsellerini logodan üretir.
//
// Logo, bordo yazı + siyah kemer yazısından oluşan beyaz zeminli bir taramadır.
// Bunu ALFA MASKESİNE çeviriyoruz: mürekkep opak, kağıt şeffaf. Böylece
// uygulamada CSS mask ile istenen renk verilebilir (açık/koyu temada uyum).
//
// Çalıştır: node scripts/gen-brand.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'brand/latia-logo.png');
const pub = resolve(root, 'public');
const iconDir = resolve(pub, 'icons');
mkdirSync(iconDir, { recursive: true });

const BRAND = '#AA2632'; // logodan örneklenen bordo
const IVORY = '#F7F2EC'; // sıcak fildişi
const CLAY = '#C4763E';  // terracotta — yönetim paneli
const DARK = '#1A1513';

// Sayfadaki logo bloğu (kenar botanik süsleri hariç)
const src = sharp(SRC);
const meta = await src.metadata();
const BLOCK = {
  left: Math.round(meta.width * 0.29),
  top: Math.round(meta.height * 0.29),
  width: Math.round(meta.width * 0.42),
  height: Math.round(meta.height * 0.28),
};

/** Logo bloğundan (ya da bir bölümünden) beyaz-üzeri-şeffaf maske üretir */
async function inkMask({ topRatio = 0, heightRatio = 1 } = {}, targetHeight) {
  const region = {
    left: BLOCK.left,
    top: BLOCK.top + Math.round(BLOCK.height * topRatio),
    width: BLOCK.width,
    height: Math.round(BLOCK.height * heightRatio),
  };
  return sharp(SRC)
    .extract(region)
    // PDF'ten gelen PNG'nin alfa kanalı var; beyaza düzleştirilmezse maske
    // tümüyle opak çıkıyor (alfa, eşikleme sonrası da korunuyor)
    .flatten({ background: '#ffffff' })
    .trim({ threshold: 25 })
    .resize({ height: targetHeight, kernel: 'lanczos3' })
    .greyscale()
    .normalise()
    .threshold(190)
    .negate() // mürekkep beyaz (opak), kağıt siyah (şeffaf)
    .removeAlpha()
    .toColourspace('b-w')
    .png()
    .toBuffer();
}

async function maskToPng(mask, out) {
  const m = await sharp(mask).metadata();
  await sharp({ create: { width: m.width, height: m.height, channels: 3, background: '#ffffff' } })
    .joinChannel(mask)
    .png()
    .toFile(out);
  console.log('yazıldı:', out.replace(root + '/', ''), `${m.width}x${m.height}`);
}

// 1) Tam kilit: "TEA · COFFEE · FOOD" + "LA TÍA"
await maskToPng(await inkMask({}, 420), resolve(pub, 'logo-full.png'));

// 2) Sadece "LA TÍA" (kemer yazısı hariç — alt %52)
await maskToPng(await inkMask({ topRatio: 0.46, heightRatio: 0.54 }, 260), resolve(pub, 'logo-word.png'));

/** Uygulama ikonu: zemin üzerine kelime logosu */
async function icon(size, { bg, fg, radius, widthRatio = 0.68, maskable = false }, out) {
  const corner = radius ?? (maskable ? 0 : Math.round(size * 0.22));
  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${corner}" fill="${bg}"/></svg>`;
  const wordW = Math.round(size * (maskable ? 0.54 : widthRatio));
  let m = await inkMask({ topRatio: 0.46, heightRatio: 0.54 }, 300);
  m = await sharp(m).resize({ width: wordW, kernel: 'lanczos3' }).toColourspace('b-w').png().toBuffer();
  const mm = await sharp(m).metadata();
  const glyph = await sharp({ create: { width: mm.width, height: mm.height, channels: 3, background: fg } })
    .joinChannel(m)
    .png()
    .toBuffer();
  await sharp(Buffer.from(bgSvg)).composite([{ input: glyph, gravity: 'center' }]).png().toFile(out);
  console.log('yazıldı:', out.replace(root + '/', ''));
}

// Servis (ana uygulama): bordo zemin, fildişi yazı
await icon(192, { bg: BRAND, fg: IVORY }, resolve(iconDir, 'icon-192.png'));
await icon(512, { bg: BRAND, fg: IVORY }, resolve(iconDir, 'icon-512.png'));
await icon(512, { bg: BRAND, fg: IVORY, maskable: true }, resolve(iconDir, 'icon-512-maskable.png'));
await icon(180, { bg: BRAND, fg: IVORY, radius: 0 }, resolve(pub, 'apple-touch-icon.png'));
await icon(64, { bg: BRAND, fg: IVORY, radius: 14, widthRatio: 0.78 }, resolve(pub, 'favicon.png'));

// Mutfak: ters renk — ana ekranda karışmasın
await icon(192, { bg: IVORY, fg: BRAND }, resolve(iconDir, 'kitchen-192.png'));
await icon(512, { bg: IVORY, fg: BRAND }, resolve(iconDir, 'kitchen-512.png'));
await icon(180, { bg: IVORY, fg: BRAND, radius: 0 }, resolve(pub, 'apple-touch-icon-kitchen.png'));

// Seçim ekranı: koyu zemin
await icon(192, { bg: DARK, fg: IVORY }, resolve(iconDir, 'hub-192.png'));
await icon(512, { bg: DARK, fg: IVORY }, resolve(iconDir, 'hub-512.png'));
await icon(180, { bg: DARK, fg: IVORY, radius: 0 }, resolve(pub, 'apple-touch-icon-hub.png'));

// Yönetim paneli — terracotta zemin
await icon(192, { bg: CLAY, fg: IVORY }, resolve(iconDir, 'admin-192.png'));
await icon(512, { bg: CLAY, fg: IVORY }, resolve(iconDir, 'admin-512.png'));
await icon(180, { bg: CLAY, fg: IVORY, radius: 0 }, resolve(pub, 'apple-touch-icon-admin.png'));

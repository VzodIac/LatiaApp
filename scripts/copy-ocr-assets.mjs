// Tesseract varlıklarını kendi sunucumuza kopyalar.
//
// tesseract.js varsayılan olarak worker/çekirdek/dil dosyalarını bir CDN'den
// çeker. Bunu istemiyoruz: üçüncü taraf bir çalışma zamanı bağımlılığı olur,
// engellenebilir ve sürüm kayması yaşanır. Dosyalar public/ocr altına kopyalanır.
//
// Bu dosyalar service worker tarafından ÖNBELLEĞE ALINMAZ (vite.config.ts →
// globIgnores). ~5 MB'lık indirme yalnızca fiş okuma ilk kez kullanıldığında olur.
//
// Çalıştır: node scripts/copy-ocr-assets.mjs   (npm run build öncesi otomatik)
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/ocr');
const langOut = resolve(out, 'lang');
mkdirSync(langOut, { recursive: true });

const copy = (from, toDir = out) => {
  if (!existsSync(from)) throw new Error(`Bulunamadı: ${from}`);
  const to = resolve(toDir, basename(from));
  copyFileSync(from, to);
  console.log(`  ${basename(from).padEnd(38)} ${(statSync(to).size / 1048576).toFixed(1)} MB`);
};

console.log('OCR varlıkları kopyalanıyor → public/ocr');

// Worker betiği
copy(resolve(root, 'node_modules/tesseract.js/dist/worker.min.js'));

// Çekirdek: yalnızca LSTM sürümleri gerekiyor (kullandığımız model LSTM).
// Üç varyant kopyalanır; tarayıcı SIMD desteğine göre birini seçer, tek dosya iner.
const coreDir = resolve(root, 'node_modules/tesseract.js-core');
for (const f of [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]) {
  copy(resolve(coreDir, f));
}

// Türkçe model — "best_int" sürümü: fast'ten belirgin daha doğru, best'ten
// dört kat küçük. Termal fişte fark ediyor.
copy(resolve(root, 'node_modules/@tesseract.js-data/tur/4.0.0_best_int/tur.traineddata.gz'), langOut);

console.log('bitti');

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  bacaStatusTundaPwa,
  deteksiTipePerangkatPwa,
  DURASI_TUNDA_BANNER_MS,
  simpanTundaPwa7Hari,
} from '../app/PwaContext';

function bacaUkuranPng(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  const signature = buf.subarray(0, 8);
  const expected = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(signature.equals(expected), `Signature PNG tidak valid untuk ${filePath}`);
  const chunkType = buf.toString('ascii', 12, 16);
  assert.equal(chunkType, 'IHDR', `IHDR tidak ditemukan pada ${filePath}`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

// 1. Uji logika tunda banner 7 hari (menggunakan fallback memori saat tanpa browser)
const t0 = 1_750_000_000_000;
assert.equal(bacaStatusTundaPwa(t0), false, 'Awalnya tidak sedang ditunda');

const batasTunda = simpanTundaPwa7Hari(t0);
assert.equal(batasTunda, t0 + DURASI_TUNDA_BANNER_MS, 'Batas tunda harus 7 hari ke depan');
assert.equal(bacaStatusTundaPwa(t0 + 1000), true, 'Harus tertunda selama 7 hari');
assert.equal(
  bacaStatusTundaPwa(t0 + DURASI_TUNDA_BANNER_MS - 1),
  true,
  'Harus masih tertunda 1 ms sebelum 7 hari habis'
);
assert.equal(
  bacaStatusTundaPwa(t0 + DURASI_TUNDA_BANNER_MS + 1),
  false,
  'Harus aktif lagi setelah 7 hari lewat'
);

// 2. Uji deteksi tipe perangkat
assert.equal(
  deteksiTipePerangkatPwa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'),
  'ios'
);
assert.equal(
  deteksiTipePerangkatPwa('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)'),
  'ios'
);
assert.equal(
  deteksiTipePerangkatPwa('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0'),
  'android'
);
assert.equal(
  deteksiTipePerangkatPwa('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Firefox/127.0'),
  'firefox'
);
assert.equal(
  deteksiTipePerangkatPwa('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0'),
  'desktop'
);

// 3. Uji manifest.webmanifest
const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'public', 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.name, 'Duel Otak – Tarik Tambang Kuis');
assert.equal(manifest.short_name, 'Duel Otak');
assert.equal(manifest.lang, 'id');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.background_color, '#0B1B4D');
assert.equal(manifest.theme_color, '#1E6BFF');
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);

const diharapkanIkon = [
  { src: './icon-192.png', sizes: '192x192', purpose: 'any', px: 192 },
  { src: './icon-512.png', sizes: '512x512', purpose: 'any', px: 512 },
  { src: './icon-maskable-192.png', sizes: '192x192', purpose: 'maskable', px: 192 },
  { src: './icon-maskable-512.png', sizes: '512x512', purpose: 'maskable', px: 512 },
];

for (const item of diharapkanIkon) {
  const ketemu = manifest.icons.find(
    (ic: { src: string; sizes: string; purpose?: string }) =>
      ic.src === item.src && ic.sizes === item.sizes && ic.purpose === item.purpose
  );
  assert.ok(ketemu, `Ikon manifest ${item.src} (${item.purpose}) tidak ditemukan`);
  const namaFile = item.src.replace('./', '');
  const dimensi = bacaUkuranPng(path.join(rootDir, 'public', namaFile));
  assert.equal(dimensi.width, item.px);
  assert.equal(dimensi.height, item.px);
}

const appleIconDim = bacaUkuranPng(path.join(rootDir, 'public', 'apple-touch-icon.png'));
assert.equal(appleIconDim.width, 180);
assert.equal(appleIconDim.height, 180);

// 4. Uji index.html
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
assert.ok(indexHtml.includes('rel="manifest" href="./manifest.webmanifest"'));
assert.ok(indexHtml.includes('rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png"'));
assert.ok(indexHtml.includes('name="theme-color" content="#1E6BFF"'));

// 5. Uji template sw.js
const swSource = fs.readFileSync(path.join(rootDir, 'public', 'sw.js'), 'utf8');
assert.ok(swSource.includes('/*__CACHE_VERSION__*/'));
assert.ok(swSource.includes('/*__PRECACHE_MANIFEST__*/'));
assert.ok(swSource.includes('SKIP_WAITING'));
assert.ok(!swSource.includes('self.skipWaiting();\n});'), 'Jangan auto skipWaiting tanpa tombol muat ulang');
assert.ok(swSource.includes('reqUrl.origin !== self.location.origin'));
assert.ok(swSource.includes("reqUrl.pathname.startsWith('/__/')"));
assert.ok(swSource.includes("reqUrl.pathname.startsWith('/api/')"));

console.log('Semua uji unit PWA berhasil lulus.');

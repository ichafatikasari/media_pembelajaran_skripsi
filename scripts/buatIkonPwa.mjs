import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function buatCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = buatCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function buatChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePngRgba(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter none
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    buatChunk('IHDR', ihdr),
    buatChunk('IDAT', compressed),
    buatChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function insideRoundedRect(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.abs(x - cx) - (halfW - r);
  const dy = Math.abs(y - cy) - (halfH - r);
  if (dx <= 0 && dy <= 0) return true;
  if (dx > 0 && dy > 0) return dx * dx + dy * dy <= r * r;
  return dx <= 0 ? dy <= r : dx <= r;
}

function distSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

// Koordinat huruf D dan O dalam ruang badge ternormalisasi [-1, 1] x [-1, 1]
function insideHurufDO(nx, ny) {
  // Garis tebal stroke = 0.145
  const rStroke = 0.088;

  // HURUF "D" di sebelah kiri (x: -0.68 .. -0.10, y: -0.34 .. +0.34)
  // Batang vertikal D
  if (distSegment(nx, ny, -0.58, -0.28, -0.58, 0.28) <= rStroke) return true;
  // Batang atas & bawah D ke lengkungan
  if (distSegment(nx, ny, -0.58, -0.28, -0.37, -0.28) <= rStroke) return true;
  if (distSegment(nx, ny, -0.58, 0.28, -0.37, 0.28) <= rStroke) return true;
  // Lengkungan kanan D (setengah lingkaran pusat (-0.37, 0), radius 0.28)
  if (nx >= -0.37) {
    const dD = Math.hypot(nx - (-0.37), ny);
    if (Math.abs(dD - 0.28) <= rStroke) return true;
  }

  // HURUF "O" di sebelah kanan (pusat (0.37, 0), oval/stadium tinggi)
  // Bagian tengah vertikal (|ny| <= 0.08) + tutup setengah lingkaran atas & bawah
  const ox = 0.37;
  const rx = 0.23;
  const oySpan = 0.06;
  const clampedY = Math.max(-oySpan, Math.min(oySpan, ny));
  const dO = Math.hypot(nx - ox, ny - clampedY);
  if (Math.abs(dO - rx) <= rStroke) return true;

  return false;
}

const C_NAVY_DARK = hexToRgb('#071236');
const C_NAVY = hexToRgb('#0B1B4D');
const C_BLUE_PANEL = hexToRgb('#173287');
const C_BLUE = hexToRgb('#1E6BFF');
const C_RED = hexToRgb('#FF1744');
const C_GOLD = hexToRgb('#FFD400');
const C_GOLD_LIGHT = hexToRgb('#FFE875');
const C_GOLD_SHADOW = hexToRgb('#C79A00');
const C_ORANGE = hexToRgb('#FF9100');

function samplePixel(u, v, maskable, opaqueSquare) {
  // u, v dalam [0, 1]
  // Latar belakang luar
  if (!maskable && !opaqueSquare) {
    if (!insideRoundedRect(u, v, 0.5, 0.5, 0.48, 0.48, 0.12)) {
      return [0, 0, 0, 0];
    }
  }

  let rgb = C_NAVY;

  // Bingkai dalam biru terang
  const scaleSafe = maskable ? 0.72 : 0.90;
  const outerHalf = 0.48 * scaleSafe;
  if (insideRoundedRect(u, v, 0.5, 0.5, outerHalf, outerHalf, 0.10 * scaleSafe)) {
    rgb = C_BLUE;
  }
  const innerHalf = 0.44 * scaleSafe;
  if (insideRoundedRect(u, v, 0.5, 0.5, innerHalf, innerHalf, 0.085 * scaleSafe)) {
    rgb = C_BLUE_PANEL;
  }

  // Pita aksen tarik tambang: merah kiri & biru kanan + tali oranye di bagian bawah
  const ropeY = 0.5 + 0.285 * scaleSafe;
  if (Math.abs(v - ropeY) <= 0.028 * scaleSafe && Math.abs(u - 0.5) <= 0.36 * scaleSafe) {
    rgb = C_ORANGE;
  }
  const leftDotD = Math.hypot(u - (0.5 - 0.31 * scaleSafe), v - ropeY);
  if (leftDotD <= 0.052 * scaleSafe) {
    rgb = leftDotD <= 0.036 * scaleSafe ? C_RED : C_NAVY_DARK;
  }
  const rightDotD = Math.hypot(u - (0.5 + 0.31 * scaleSafe), v - ropeY);
  if (rightDotD <= 0.052 * scaleSafe) {
    rgb = rightDotD <= 0.036 * scaleSafe ? C_BLUE : C_NAVY_DARK;
  }

  // Lencana emas 3D "DO" di tengah-atas
  const badgeCy = 0.5 - 0.045 * scaleSafe;
  const badgeHalfW = 0.33 * scaleSafe;
  const badgeHalfH = 0.255 * scaleSafe;
  const badgeR = 0.075 * scaleSafe;

  // Outline gelap lencana
  if (
    insideRoundedRect(
      u,
      v,
      0.5,
      badgeCy + 0.014 * scaleSafe,
      badgeHalfW + 0.028 * scaleSafe,
      badgeHalfH + 0.028 * scaleSafe,
      badgeR + 0.02 * scaleSafe
    )
  ) {
    rgb = C_NAVY_DARK;
  }

  // Bayangan bawah 3D emas
  if (
    insideRoundedRect(
      u,
      v,
      0.5,
      badgeCy + 0.022 * scaleSafe,
      badgeHalfW,
      badgeHalfH,
      badgeR
    )
  ) {
    rgb = C_GOLD_SHADOW;
  }

  // Kilau atas emas
  if (
    insideRoundedRect(
      u,
      v,
      0.5,
      badgeCy - 0.008 * scaleSafe,
      badgeHalfW,
      badgeHalfH,
      badgeR
    )
  ) {
    rgb = C_GOLD_LIGHT;
  }

  // Isi utama emas
  if (insideRoundedRect(u, v, 0.5, badgeCy, badgeHalfW - 0.012 * scaleSafe, badgeHalfH - 0.012 * scaleSafe, badgeR * 0.85)) {
    rgb = C_GOLD;
  }

  // Huruf "DO" di dalam lencana
  const nx = (u - 0.5) / (badgeHalfW * 0.88);
  const ny = (v - badgeCy) / (badgeHalfH * 0.82);
  if (Math.abs(nx) <= 1.0 && Math.abs(ny) <= 1.0 && insideHurufDO(nx, ny)) {
    rgb = C_NAVY;
  }

  return [rgb[0], rgb[1], rgb[2], 255];
}

function renderIconPng(size, { maskable = false, opaqueSquare = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const ss = 4; // 4x4 supersampling untuk tepi mulus
  const invSs2 = 1 / (ss * ss);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;

      for (let sy = 0; sy < ss; sy += 1) {
        for (let sx = 0; sx < ss; sx += 1) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          const [r, g, b, a] = samplePixel(u, v, maskable, opaqueSquare);
          const w = a / 255;
          rSum += r * w;
          gSum += g * w;
          bSum += b * w;
          aSum += a;
        }
      }

      const alphaAvg = aSum * invSs2;
      const idx = (y * size + x) * 4;
      if (alphaAvg > 0.5) {
        const wNorm = alphaAvg / 255;
        rgba[idx] = Math.min(255, Math.round((rSum * invSs2) / wNorm));
        rgba[idx + 1] = Math.min(255, Math.round((gSum * invSs2) / wNorm));
        rgba[idx + 2] = Math.min(255, Math.round((bSum * invSs2) / wNorm));
        rgba[idx + 3] = Math.min(255, Math.round(alphaAvg));
      } else {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
      }
    }
  }

  return encodePngRgba(size, size, rgba);
}

const outDir = path.resolve(process.cwd(), 'public');
const targetList = [
  { file: 'icon-192.png', size: 192, maskable: false, opaqueSquare: false },
  { file: 'icon-512.png', size: 512, maskable: false, opaqueSquare: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true, opaqueSquare: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true, opaqueSquare: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false, opaqueSquare: true },
];

for (const item of targetList) {
  const png = renderIconPng(item.size, {
    maskable: item.maskable,
    opaqueSquare: item.opaqueSquare,
  });
  fs.writeFileSync(path.join(outDir, item.file), png);
  console.log(`Generated public/${item.file} (${item.size}x${item.size}, ${png.length} bytes)`);
}

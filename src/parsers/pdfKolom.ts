import { normalisasiTeksBiasa } from './normalizer';
import { parseTeksSoal } from './textParser';
import { HasilValidasiDraft, InfoKolomPdf, ModeKolomPdf } from './validator';

export interface ItemTeksPdf {
  teks: string;
  x: number;
  y: number;
  width?: number;
}

export interface HalamanItemsPdf {
  items: ItemTeksPdf[];
  lebarHalaman?: number;
}

export interface HasilDeteksiCelahPdf {
  terdeteksi: boolean;
  splitX: number | null;
  celahStart: number | null;
  celahEnd: number | null;
}

function lebarEfektifItem(item: ItemTeksPdf): number {
  if (typeof item.width === 'number' && Number.isFinite(item.width) && item.width > 0) {
    return item.width;
  }
  return Math.max(4, item.teks.trim().length * 4.8);
}

function kelompokkanBarisVisual(items: readonly ItemTeksPdf[]): ItemTeksPdf[][] {
  if (items.length === 0) return [];
  const terurut = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 4.5) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const barisList: ItemTeksPdf[][] = [];
  for (const item of terurut) {
    const barisTerakhir = barisList[barisList.length - 1];
    if (!barisTerakhir || Math.abs(barisTerakhir[0].y - item.y) > 4.5) {
      barisList.push([item]);
    } else {
      barisTerakhir.push(item);
    }
  }
  return barisList;
}

function cariPitaKosongTerlebar(
  histogram: Uint16Array,
  xMulai: number,
  xAkhir: number,
  maksTutupan: number
): { start: number; end: number } | null {
  let terbaikStart = -1;
  let terbaikEnd = -1;
  let aktifStart = -1;

  for (let x = xMulai; x <= xAkhir; x += 1) {
    if (histogram[x] <= maksTutupan) {
      if (aktifStart === -1) aktifStart = x;
    } else if (aktifStart !== -1) {
      if (x - 1 - aktifStart > terbaikEnd - terbaikStart) {
        terbaikStart = aktifStart;
        terbaikEnd = x - 1;
      }
      aktifStart = -1;
    }
  }

  if (aktifStart !== -1 && xAkhir - aktifStart > terbaikEnd - terbaikStart) {
    terbaikStart = aktifStart;
    terbaikEnd = xAkhir;
  }

  if (terbaikStart < 0 || terbaikEnd < terbaikStart) return null;
  return { start: terbaikStart, end: terbaikEnd };
}

/**
 * Menghitung histogram tutupan sumbu-x per baris visual untuk mencari celah antar-kolom
 * di tengah halaman (30%–70% lebar) dengan lebar >= 3% lebar halaman dan teks di kedua sisi >= 30% baris.
 */
export function deteksiCelahDuaKolom(
  items: readonly ItemTeksPdf[],
  lebarHalamanInput?: number
): HasilDeteksiCelahPdf {
  const bersihItems = items.filter((i) => i.teks.trim().length > 0);
  if (bersihItems.length < 4) {
    return { terdeteksi: false, splitX: null, celahStart: null, celahEnd: null };
  }

  const maksX = Math.max(
    ...bersihItems.map((i) => i.x + lebarEfektifItem(i))
  );
  const lebarHalaman =
    lebarHalamanInput && lebarHalamanInput > 100
      ? lebarHalamanInput
      : Math.max(595.4, maksX + 28);

  const barisVisual = kelompokkanBarisVisual(bersihItems);
  const totalBaris = barisVisual.length;
  if (totalBaris < 3) {
    return { terdeteksi: false, splitX: null, celahStart: null, celahEnd: null };
  }

  const panjangBin = Math.ceil(lebarHalaman) + 2;
  const histogram = new Uint16Array(panjangBin);

  for (const baris of barisVisual) {
    const tertutupDiBaris = new Set<number>();
    for (const item of baris) {
      const startBin = Math.max(0, Math.floor(item.x));
      const endBin = Math.min(
        panjangBin - 1,
        Math.ceil(item.x + lebarEfektifItem(item))
      );
      for (let b = startBin; b <= endBin; b += 1) {
        tertutupDiBaris.add(b);
      }
    }
    for (const b of tertutupDiBaris) {
      histogram[b] += 1;
    }
  }

  const xMin = Math.floor(lebarHalaman * 0.3);
  const xMax = Math.ceil(lebarHalaman * 0.7);
  const lebarMinimalCelah = lebarHalaman * 0.03;

  let pita = cariPitaKosongTerlebar(histogram, xMin, xMax, 0);
  if (
    (!pita || pita.end - pita.start + 1 < lebarMinimalCelah) &&
    totalBaris >= 8
  ) {
    // Izinkan maksimal 1 baris judul/header terpusat di tengah halaman
    pita = cariPitaKosongTerlebar(histogram, xMin, xMax, 1);
  }

  if (!pita || pita.end - pita.start + 1 < lebarMinimalCelah) {
    return { terdeteksi: false, splitX: null, celahStart: null, celahEnd: null };
  }

  const splitX = (pita.start + pita.end) / 2;

  const kiriY: number[] = [];
  const kananY: number[] = [];

  for (const baris of barisVisual) {
    let adaKiri = false;
    let adaKanan = false;
    const yBaris = baris[0].y;
    for (const item of baris) {
      const tengah = item.x + lebarEfektifItem(item) / 2;
      if (tengah < splitX) adaKiri = true;
      else adaKanan = true;
    }
    if (adaKiri) kiriY.push(yBaris);
    if (adaKanan) kananY.push(yBaris);
  }

  if (kiriY.length < 4 || kananY.length < 4) {
    return { terdeteksi: false, splitX: null, celahStart: null, celahEnd: null };
  }

  const minKiriY = Math.min(...kiriY);
  const maxKiriY = Math.max(...kiriY);
  const minKananY = Math.min(...kananY);
  const maxKananY = Math.max(...kananY);

  // Pastikan kolom kiri dan kanan sejajar berdampingan secara vertikal (bukan atas-bawah)
  const overlapMin = Math.max(minKiriY, minKananY) - 10;
  const overlapMax = Math.min(maxKiriY, maxKananY) + 10;
  if (overlapMax <= overlapMin) {
    return { terdeteksi: false, splitX: null, celahStart: null, celahEnd: null };
  }

  const kananDalamRentangKiri = kananY.filter(
    (y) => y >= minKiriY - 12 && y <= maxKiriY + 12
  ).length;
  const kiriDalamRentangKanan = kiriY.filter(
    (y) => y >= minKananY - 12 && y <= maxKananY + 12
  ).length;

  if (Math.min(kananDalamRentangKiri, kiriDalamRentangKanan) < 3) {
    return { terdeteksi: false, splitX: null, celahStart: null, celahEnd: null };
  }

  return {
    terdeteksi: true,
    splitX,
    celahStart: pita.start,
    celahEnd: pita.end,
  };
}

export function susunBarisDariDaftarItem(items: readonly ItemTeksPdf[]): string[] {
  const barisKelompok = kelompokkanBarisVisual(items);
  const hasil: string[] = [];

  for (const baris of barisKelompok) {
    baris.sort((a, b) => a.x - b.x);
    let gabungan = '';
    for (let i = 0; i < baris.length; i += 1) {
      const cur = baris[i];
      if (i > 0 && !gabungan.endsWith(' ') && !cur.teks.startsWith(' ')) {
        gabungan += ' ';
      }
      gabungan += cur.teks;
    }
    const bersih = normalisasiTeksBiasa(gabungan);
    if (bersih) {
      hasil.push(bersih);
    }
  }

  return hasil;
}

export function susunTeksHalamanPdf(
  items: readonly ItemTeksPdf[],
  lebarHalamanInput?: number,
  modeKolom: ModeKolomPdf = 'otomatis'
): { teksHalaman: string; terdeteksiDuaKolom: boolean } {
  const bersihItems = items.filter((i) => i.teks.trim().length > 0);
  if (bersihItems.length === 0) {
    return { teksHalaman: '', terdeteksiDuaKolom: false };
  }

  if (modeKolom === '1kolom') {
    return {
      teksHalaman: susunBarisDariDaftarItem(bersihItems).join('\n'),
      terdeteksiDuaKolom: false,
    };
  }

  const celah = deteksiCelahDuaKolom(bersihItems, lebarHalamanInput);
  const pakaiDuaKolom = modeKolom === '2kolom' || celah.terdeteksi;

  if (!pakaiDuaKolom) {
    return {
      teksHalaman: susunBarisDariDaftarItem(bersihItems).join('\n'),
      terdeteksiDuaKolom: false,
    };
  }

  const lebarEstimasi =
    lebarHalamanInput && lebarHalamanInput > 100
      ? lebarHalamanInput
      : Math.max(
          595.4,
          ...bersihItems.map((i) => i.x + lebarEfektifItem(i))
        );
  const splitX = celah.splitX ?? lebarEstimasi / 2;

  const headerAtas: ItemTeksPdf[] = [];
  const kolomKiri: ItemTeksPdf[] = [];
  const kolomKanan: ItemTeksPdf[] = [];

  const maxYKiriAwal = bersihItems
    .filter((it) => it.x + lebarEfektifItem(it) / 2 < splitX)
    .reduce((m, it) => Math.max(m, it.y), -Infinity);
  const maxYKananAwal = bersihItems
    .filter((it) => it.x + lebarEfektifItem(it) / 2 >= splitX)
    .reduce((m, it) => Math.max(m, it.y), -Infinity);

  for (const item of bersihItems) {
    const itemWidth = lebarEfektifItem(item);
    const itemEnd = item.x + itemWidth;
    const itemCenter = item.x + itemWidth / 2;
    const teksTrim = item.teks.trim();

    // Jika ada elemen judul/kepala yang membentang melewati garis tengah
    // atau judul terpusat yang berdiri sendiri di atas kedua kolom
    const membentangTengah = item.x < splitX - 12 && itemEnd > splitX + 12;
    const terpusatDiAtasKolom =
      itemCenter >= lebarEstimasi * 0.28 &&
      itemCenter <= lebarEstimasi * 0.72 &&
      (item.y > maxYKiriAwal + 8 || item.y > maxYKananAwal + 8) &&
      !/^\s*(?:\d{1,3}\s*[.)]|[A-Da-d]\s*[.)])/.test(teksTrim);

    if (membentangTengah || terpusatDiAtasKolom) {
      headerAtas.push(item);
    } else if (itemCenter < splitX) {
      kolomKiri.push(item);
    } else {
      kolomKanan.push(item);
    }
  }

  const semuaBaris = [
    ...susunBarisDariDaftarItem(headerAtas),
    ...susunBarisDariDaftarItem(kolomKiri),
    ...susunBarisDariDaftarItem(kolomKanan),
  ];

  return {
    teksHalaman: semuaBaris.join('\n'),
    terdeteksiDuaKolom: true,
  };
}

export function parseHalamanPdfKeDraft(
  halamanList: readonly HalamanItemsPdf[],
  modeKolom: ModeKolomPdf = 'otomatis'
): HasilValidasiDraft {
  const halamanTeks: string[] = [];
  let terdeteksiDuaKolom = false;

  for (const hal of halamanList) {
    const susunan = susunTeksHalamanPdf(hal.items, hal.lebarHalaman, modeKolom);
    if (susunan.terdeteksiDuaKolom) {
      terdeteksiDuaKolom = true;
    }
    if (susunan.teksHalaman) {
      halamanTeks.push(susunan.teksHalaman);
    }
  }

  const keterangan = terdeteksiDuaKolom
    ? 'Terdeteksi 2 kolom, dibaca kiri lalu kanan'
    : modeKolom === '1kolom'
      ? 'Mode 1 kolom aktif'
      : 'Terdeteksi 1 kolom';

  const infoKolomPdf: InfoKolomPdf = {
    mode: modeKolom,
    terdeteksiDuaKolom,
    keterangan,
  };

  const teksGabungan = halamanTeks.join('\n');
  const hasil = parseTeksSoal(teksGabungan, 'pdf', []);
  return {
    ...hasil,
    infoKolomPdf,
  };
}

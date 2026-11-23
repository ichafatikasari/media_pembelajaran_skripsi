import LZString from 'lz-string';
import QRCode from 'qrcode';
import {
  AkhirPermainan,
  DurasiSoalDetik,
  Game,
  JumlahPenarik,
  ModeJikaImbang,
  ModePermainan,
  Pengaturan,
  Soal,
  TingkatSoal,
} from '../data/types';
import { buatPengaturanDefault } from '../engine/gameEngine';
import { ambilAlamatAplikasiDasar } from './alamatAplikasi';
import { buatId } from './id';

export const NAMA_APLIKASI_PAKET = 'duel-otak-tarik-tambang';
export const VERSI_SKEMA_PAKET = 1;
export const VERSI_SKEMA_RINGKAS_V2 = 2;

export const BATAS_KARAKTER_LINK_DATA = 8000;
export const BATAS_PERINGATAN_LINK_DATA = 4000;
export const BATAS_KARAKTER_QR_DATA = 2000;
export const BATAS_KARAKTER_KODE_LINK = BATAS_KARAKTER_LINK_DATA;

export interface PaketGameJson {
  aplikasi: typeof NAMA_APLIKASI_PAKET;
  versiSkema: number;
  dieksporPada: number;
  game: Game;
}

export interface SoalRingkasV2 {
  q: string; // pertanyaan
  o: string[]; // pilihan
  a: number; // kunci
  c?: string; // kode
  e?: string; // penjelasan
  l?: TingkatSoal; // tingkat
  tp?: string; // topik
  b?: 1; // bonus
  cd?: 1; // cadangan (penentu)
}

export interface PaketRingkasV2 {
  v: 2;
  j: string; // judul
  m?: string; // mapel
  s?: string; // namaSekolah
  st?: 'draf' | 'siap'; // status
  p?: Partial<Pengaturan>; // pengaturan non-default
  q: SoalRingkasV2[];
}

export interface OpsiRingkasV2 {
  sertakanPenjelasan?: boolean;
}

export type HasilValidasiPaket =
  | { ok: true; game: Game; versiSkema: number }
  | { ok: false; pesanError: string };

export type HasilBuatLink =
  | {
      ok: true;
      url: string;
      kodeTerkompresi: string;
      panjangKode: number;
      panjangUrl: number;
      qrDiizinkan: boolean;
      peringatanPanjang?: string;
      estimasiMaksSoal: number;
    }
  | {
      ok: false;
      pesanError: string;
      panjangKode: number;
      panjangUrl: number;
      qrDiizinkan: false;
      estimasiMaksSoal: number;
    };

function isObjectRecord(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === 'object' && nilai !== null && !Array.isArray(nilai);
}

function normalisasiTingkat(nilai: unknown): TingkatSoal | undefined {
  if (nilai === 'Mudah' || nilai === 'Sedang' || nilai === 'Sulit') {
    return nilai;
  }
  return undefined;
}

function validasiPengaturanPaket(mentah: unknown): Pengaturan {
  const bawaan = buatPengaturanDefault();
  if (!isObjectRecord(mentah)) {
    return bawaan;
  }

  const mode: ModePermainan =
    mentah.mode === '2tim' || mentah.mode === '4tim' || mentah.mode === '1lawan1'
      ? mentah.mode
      : bawaan.mode;

  const jumlahPenarik: JumlahPenarik =
    mentah.jumlahPenarik === 3 || mentah.jumlahPenarik === 4 || mentah.jumlahPenarik === 5
      ? mentah.jumlahPenarik
      : bawaan.jumlahPenarik;

  const durasiSoal: DurasiSoalDetik =
    mentah.durasiSoal === 10 || mentah.durasiSoal === 15 || mentah.durasiSoal === 20
      ? mentah.durasiSoal
      : bawaan.durasiSoal;

  const akhirPermainan: AkhirPermainan =
    mentah.akhirPermainan === 'waktu' ||
    mentah.akhirPermainan === 'soalHabis' ||
    mentah.akhirPermainan === 'keduanya'
      ? mentah.akhirPermainan
      : bawaan.akhirPermainan;

  const durasiWaktu =
    typeof mentah.durasiWaktu === 'number' && Number.isFinite(mentah.durasiWaktu) && mentah.durasiWaktu > 0
      ? Math.min(120, Math.max(0.5, mentah.durasiWaktu))
      : bawaan.durasiWaktu;

  const langkahKeGaris =
    typeof mentah.langkahKeGaris === 'number' && Number.isFinite(mentah.langkahKeGaris)
      ? Math.min(10, Math.max(3, Math.round(mentah.langkahKeGaris)))
      : bawaan.langkahKeGaris;

  const namaTim = Array.isArray(mentah.namaTim)
    ? mentah.namaTim
        .slice(0, 4)
        .map((n, idx) => (typeof n === 'string' && n.trim() ? n.trim() : bawaan.namaTim[idx] ?? `Tim ${idx + 1}`))
    : [...bawaan.namaTim];

  while (namaTim.length < 4) {
    namaTim.push(bawaan.namaTim[namaTim.length] ?? `Tim ${namaTim.length + 1}`);
  }

  const anggota: string[][] = Array.isArray(mentah.anggota)
    ? [0, 1, 2, 3].map((idx) => {
        const grup =
          mentah.anggota && Array.isArray((mentah.anggota as unknown[])[idx])
            ? ((mentah.anggota as unknown[])[idx] as unknown[])
            : [];
        return grup
          .filter((nama): nama is string => typeof nama === 'string')
          .map((nama) => nama.trim())
          .filter((nama) => nama.length > 0);
      })
    : [[], [], [], []];

  const pinGuru =
    typeof mentah.pinGuru === 'string' && /^\d{4}$/.test(mentah.pinGuru.trim())
      ? mentah.pinGuru.trim()
      : '';

  const jikaImbang: ModeJikaImbang =
    mentah.jikaImbang === 'otomatis' ||
    mentah.jikaImbang === 'kecepatan' ||
    mentah.jikaImbang === 'seri'
      ? mentah.jikaImbang
      : bawaan.jikaImbang ?? 'otomatis';

  return {
    mode,
    namaTim,
    anggota,
    jumlahPenarik,
    durasiSoal,
    akhirPermainan,
    durasiWaktu,
    langkahKeGaris,
    salahMenarikLawan:
      typeof mentah.salahMenarikLawan === 'boolean'
        ? mentah.salahMenarikLawan
        : bawaan.salahMenarikLawan,
    bonus: typeof mentah.bonus === 'boolean' ? mentah.bonus : bawaan.bonus,
    penjelasan:
      typeof mentah.penjelasan === 'boolean' ? mentah.penjelasan : bawaan.penjelasan,
    ulangiSoal:
      typeof mentah.ulangiSoal === 'boolean' ? mentah.ulangiSoal : bawaan.ulangiSoal,
    suara: typeof mentah.suara === 'boolean' ? mentah.suara : bawaan.suara,
    musik: typeof mentah.musik === 'boolean' ? mentah.musik : bawaan.musik,
    pinGuru,
    modeRekam: typeof mentah.modeRekam === 'boolean' ? mentah.modeRekam : bawaan.modeRekam,
    efekRingan:
      typeof mentah.efekRingan === 'boolean' ? mentah.efekRingan : bawaan.efekRingan,
    jikaImbang,
  };
}

function ringkasPengaturan(pengaturan: Pengaturan): Partial<Pengaturan> | undefined {
  const bawaan = buatPengaturanDefault();
  const ringkas: Partial<Pengaturan> = {};

  if (pengaturan.mode !== bawaan.mode) ringkas.mode = pengaturan.mode;
  if (JSON.stringify(pengaturan.namaTim) !== JSON.stringify(bawaan.namaTim)) {
    ringkas.namaTim = [...pengaturan.namaTim];
  }
  if (pengaturan.anggota.some((grup) => grup.length > 0)) {
    ringkas.anggota = pengaturan.anggota.map((grup) => [...grup]);
  }
  if (pengaturan.jumlahPenarik !== bawaan.jumlahPenarik) {
    ringkas.jumlahPenarik = pengaturan.jumlahPenarik;
  }
  if (pengaturan.durasiSoal !== bawaan.durasiSoal) ringkas.durasiSoal = pengaturan.durasiSoal;
  if (pengaturan.akhirPermainan !== bawaan.akhirPermainan) {
    ringkas.akhirPermainan = pengaturan.akhirPermainan;
  }
  if (pengaturan.durasiWaktu !== bawaan.durasiWaktu) ringkas.durasiWaktu = pengaturan.durasiWaktu;
  if (pengaturan.langkahKeGaris !== bawaan.langkahKeGaris) {
    ringkas.langkahKeGaris = pengaturan.langkahKeGaris;
  }
  if (pengaturan.salahMenarikLawan !== bawaan.salahMenarikLawan) {
    ringkas.salahMenarikLawan = pengaturan.salahMenarikLawan;
  }
  if (pengaturan.bonus !== bawaan.bonus) ringkas.bonus = pengaturan.bonus;
  if (pengaturan.penjelasan !== bawaan.penjelasan) ringkas.penjelasan = pengaturan.penjelasan;
  if (pengaturan.ulangiSoal !== bawaan.ulangiSoal) ringkas.ulangiSoal = pengaturan.ulangiSoal;
  if (pengaturan.suara !== bawaan.suara) ringkas.suara = pengaturan.suara;
  if (pengaturan.musik !== bawaan.musik) ringkas.musik = pengaturan.musik;
  if (pengaturan.pinGuru && pengaturan.pinGuru.trim()) ringkas.pinGuru = pengaturan.pinGuru.trim();
  if (pengaturan.modeRekam !== bawaan.modeRekam) ringkas.modeRekam = pengaturan.modeRekam;
  if (pengaturan.efekRingan !== bawaan.efekRingan) ringkas.efekRingan = pengaturan.efekRingan;
  if (pengaturan.jikaImbang && pengaturan.jikaImbang !== bawaan.jikaImbang) {
    ringkas.jikaImbang = pengaturan.jikaImbang;
  }

  return Object.keys(ringkas).length > 0 ? ringkas : undefined;
}

/**
 * Mengubah Game menjadi format ringkas v2 (tanpa id, tanpa isian kosong, pengaturan non-default, dan penjelasan opsional).
 */
export function buatPaketRingkasV2(
  game: Game,
  opsi: OpsiRingkasV2 = {}
): PaketRingkasV2 {
  const sertakanPenjelasan = opsi.sertakanPenjelasan === true;
  const pengaturanRingkas = ringkasPengaturan(game.pengaturan);
  const soalRingkas: SoalRingkasV2[] = game.soal.map((s) => {
    const item: SoalRingkasV2 = {
      q: s.pertanyaan.trim(),
      o: s.pilihan.map((p) => p.trim()),
      a: s.kunci,
    };
    if (s.kode && s.kode.trim()) item.c = s.kode;
    if (sertakanPenjelasan && s.penjelasan && s.penjelasan.trim()) {
      item.e = s.penjelasan.trim();
    }
    if (s.tingkat) item.l = s.tingkat;
    if (s.topik && s.topik.trim()) item.tp = s.topik.trim();
    if (s.bonus) item.b = 1;
    if (s.cadangan) item.cd = 1;
    return item;
  });

  const paket: PaketRingkasV2 = {
    v: 2,
    j: game.judul.trim(),
    q: soalRingkas,
  };
  if (game.mapel && game.mapel.trim() && game.mapel.trim() !== 'Umum') {
    paket.m = game.mapel.trim();
  }
  if (game.namaSekolah && game.namaSekolah.trim()) {
    paket.s = game.namaSekolah.trim();
  }
  if (game.status === 'draf') {
    paket.st = 'draf';
  }
  if (pengaturanRingkas) {
    paket.p = pengaturanRingkas;
  }
  return paket;
}

export function kompresGameKePayloadV2(
  game: Game,
  opsi: OpsiRingkasV2 = {}
): string {
  return LZString.compressToEncodedURIComponent(
    JSON.stringify(buatPaketRingkasV2(game, opsi))
  );
}

export function buatPaketGameJson(game: Game): PaketGameJson {
  return {
    aplikasi: NAMA_APLIKASI_PAKET,
    versiSkema: VERSI_SKEMA_PAKET,
    dieksporPada: Date.now(),
    game: {
      ...game,
      soal: game.soal.map((s) => ({ ...s, pilihan: [...s.pilihan] })),
      pengaturan: {
        ...game.pengaturan,
        namaTim: [...game.pengaturan.namaTim],
        anggota: game.pengaturan.anggota.map((a) => [...a]),
      },
    },
  };
}

export function serialisasiPaketGameJson(game: Game): string {
  return JSON.stringify(buatPaketGameJson(game), null, 2);
}

export function unduhPaketGameJson(game: Game): void {
  const konten = serialisasiPaketGameJson(game);
  const slug = game.judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '');
  const blob = new Blob([konten], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = `paket-${slug || 'duel-otak'}.json`;
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function validasiPaketRingkasV2(obj: Record<string, unknown>): HasilValidasiPaket {
  if (typeof obj.j !== 'string' || !obj.j.trim()) {
    return { ok: false, pesanError: 'Judul game pada paket ringkas v2 kosong atau tidak valid.' };
  }
  if (!Array.isArray(obj.q) || obj.q.length === 0) {
    return {
      ok: false,
      pesanError: 'Paket ringkas v2 tidak memiliki soal (minimal harus ada 1 soal valid).',
    };
  }

  const soalValid: Soal[] = [];
  for (let i = 0; i < obj.q.length; i += 1) {
    const item = obj.q[i];
    if (!isObjectRecord(item)) {
      return { ok: false, pesanError: `Format soal ke-${i + 1} pada paket v2 rusak.` };
    }
    if (typeof item.q !== 'string' || !item.q.trim()) {
      return { ok: false, pesanError: `Teks pertanyaan soal ke-${i + 1} kosong atau tidak valid.` };
    }
    if (!Array.isArray(item.o) || item.o.length < 2 || item.o.length > 4) {
      return {
        ok: false,
        pesanError: `Soal ke-${i + 1} harus memiliki 2 sampai 4 pilihan jawaban.`,
      };
    }
    const pilihanBersih = item.o.map((p) => (typeof p === 'string' ? p.trim() : ''));
    if (pilihanBersih.some((p) => p.length === 0)) {
      return { ok: false, pesanError: `Ada teks pilihan kosong pada soal ke-${i + 1}.` };
    }
    if (
      typeof item.a !== 'number' ||
      !Number.isInteger(item.a) ||
      item.a < 0 ||
      item.a >= pilihanBersih.length
    ) {
      return {
        ok: false,
        pesanError: `Kunci jawaban pada soal ke-${i + 1} tidak valid.`,
      };
    }

    soalValid.push({
      id: buatId('soal'),
      pertanyaan: item.q.trim(),
      ...(typeof item.c === 'string' && item.c.trim() ? { kode: item.c } : {}),
      pilihan: pilihanBersih,
      kunci: item.a,
      ...(typeof item.e === 'string' && item.e.trim() ? { penjelasan: item.e.trim() } : {}),
      ...(normalisasiTingkat(item.l) ? { tingkat: normalisasiTingkat(item.l) } : {}),
      ...(typeof item.tp === 'string' && item.tp.trim() ? { topik: item.tp.trim() } : {}),
      ...(item.b === 1 || item.b === true ? { bonus: true } : {}),
      ...(item.cd === 1 || item.cd === true ? { cadangan: true } : {}),
    });
  }

  const sekarang = Date.now();
  return {
    ok: true,
    versiSkema: VERSI_SKEMA_RINGKAS_V2,
    game: {
      id: buatId('game'),
      judul: obj.j.trim(),
      mapel: typeof obj.m === 'string' && obj.m.trim() ? obj.m.trim() : 'Umum',
      namaSekolah: typeof obj.s === 'string' ? obj.s.trim() : '',
      soal: soalValid,
      pengaturan: validasiPengaturanPaket(obj.p),
      status: obj.st === 'draf' ? 'draf' : 'siap',
      dibuatPada: sekarang,
      diubahPada: sekarang,
    },
  };
}

export function validasiDanParsePaketGame(input: unknown): HasilValidasiPaket {
  let obj: unknown = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      return {
        ok: false,
        pesanError:
          'Berkas atau data rusak (bukan format JSON yang valid). Pastikan Anda memilih paket Duel Otak yang utuh.',
      };
    }
  }

  if (!isObjectRecord(obj)) {
    return {
      ok: false,
      pesanError: 'Struktur paket tidak valid (harus berupa objek data).',
    };
  }

  // Dukungan format ringkas v2
  if (obj.v === VERSI_SKEMA_RINGKAS_V2) {
    return validasiPaketRingkasV2(obj);
  }

  if (obj.aplikasi !== undefined && obj.aplikasi !== NAMA_APLIKASI_PAKET) {
    return {
      ok: false,
      pesanError: 'Berkas ini bukan paket game Duel Otak – Tarik Tambang Kuis.',
    };
  }

  if (
    typeof obj.versiSkema !== 'number' ||
    !Number.isInteger(obj.versiSkema) ||
    obj.versiSkema < 1 ||
    obj.versiSkema > VERSI_SKEMA_PAKET
  ) {
    return {
      ok: false,
      pesanError: `Versi skema paket tidak didukung (${String(obj.versiSkema ?? 'kosong')}). Aplikasi mendukung skema versi 1 dan 2.`,
    };
  }

  if (!isObjectRecord(obj.game)) {
    return {
      ok: false,
      pesanError: 'Data "game" tidak ditemukan di dalam paket.',
    };
  }

  const g = obj.game;
  if (typeof g.judul !== 'string' || !g.judul.trim()) {
    return {
      ok: false,
      pesanError: 'Judul game pada paket kosong atau tidak valid.',
    };
  }

  if (!Array.isArray(g.soal) || g.soal.length === 0) {
    return {
      ok: false,
      pesanError: 'Paket tidak memiliki soal (minimal harus ada 1 soal valid).',
    };
  }

  const soalValid: Soal[] = [];
  for (let i = 0; i < g.soal.length; i += 1) {
    const item = g.soal[i];
    if (!isObjectRecord(item)) {
      return {
        ok: false,
        pesanError: `Format soal ke-${i + 1} rusak (bukan objek soal).`,
      };
    }
    if (typeof item.pertanyaan !== 'string' || !item.pertanyaan.trim()) {
      return {
        ok: false,
        pesanError: `Teks pertanyaan pada soal ke-${i + 1} kosong atau tidak valid.`,
      };
    }
    if (!Array.isArray(item.pilihan) || item.pilihan.length < 2 || item.pilihan.length > 4) {
      return {
        ok: false,
        pesanError: `Soal ke-${i + 1} harus memiliki 2 sampai 4 pilihan jawaban.`,
      };
    }
    const pilihanBersih = item.pilihan.map((p) => (typeof p === 'string' ? p.trim() : ''));
    if (pilihanBersih.some((p) => p.length === 0)) {
      return {
        ok: false,
        pesanError: `Ada teks pilihan kosong pada soal ke-${i + 1}.`,
      };
    }
    if (
      typeof item.kunci !== 'number' ||
      !Number.isInteger(item.kunci) ||
      item.kunci < 0 ||
      item.kunci >= pilihanBersih.length
    ) {
      return {
        ok: false,
        pesanError: `Kunci jawaban pada soal ke-${i + 1} tidak valid (harus indeks 0..${pilihanBersih.length - 1}).`,
      };
    }

    soalValid.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : buatId('soal'),
      pertanyaan: item.pertanyaan.trim(),
      ...(typeof item.kode === 'string' && item.kode.trim() ? { kode: item.kode } : {}),
      pilihan: pilihanBersih,
      kunci: item.kunci,
      ...(typeof item.penjelasan === 'string' && item.penjelasan.trim()
        ? { penjelasan: item.penjelasan.trim() }
        : {}),
      ...(normalisasiTingkat(item.tingkat) ? { tingkat: normalisasiTingkat(item.tingkat) } : {}),
      ...(typeof item.topik === 'string' && item.topik.trim() ? { topik: item.topik.trim() } : {}),
      ...(typeof item.bonus === 'boolean' ? { bonus: item.bonus } : {}),
      ...(typeof item.cadangan === 'boolean' ? { cadangan: item.cadangan } : {}),
    });
  }

  const sekarang = Date.now();
  const gameTervalidasi: Game = {
    id: typeof g.id === 'string' && g.id.trim() ? g.id.trim() : buatId('game'),
    judul: g.judul.trim(),
    mapel: typeof g.mapel === 'string' && g.mapel.trim() ? g.mapel.trim() : 'Umum',
    namaSekolah: typeof g.namaSekolah === 'string' ? g.namaSekolah.trim() : '',
    soal: soalValid,
    pengaturan: validasiPengaturanPaket(g.pengaturan),
    status: g.status === 'draf' ? 'draf' : 'siap',
    dibuatPada:
      typeof g.dibuatPada === 'number' && Number.isFinite(g.dibuatPada) ? g.dibuatPada : sekarang,
    diubahPada:
      typeof g.diubahPada === 'number' && Number.isFinite(g.diubahPada) ? g.diubahPada : sekarang,
  };

  return {
    ok: true,
    game: gameTervalidasi,
    versiSkema: obj.versiSkema,
  };
}

export function dekompresPayloadKeGame(kodeTerkompresi: string): HasilValidasiPaket {
  const bersih = kodeTerkompresi.trim();
  if (!bersih) {
    return {
      ok: false,
      pesanError: 'Data paket terkompresi kosong.',
    };
  }
  try {
    const hasilDekompresi = LZString.decompressFromEncodedURIComponent(bersih);
    if (!hasilDekompresi) {
      return {
        ok: false,
        pesanError: 'Data game terkompresi rusak atau terpotong.',
      };
    }
    return validasiDanParsePaketGame(hasilDekompresi);
  } catch {
    return {
      ok: false,
      pesanError: 'Data link game tidak dapat dibaca. Pastikan link tersalin utuh.',
    };
  }
}

export function estimasiMaksSoalUntukLink(
  game: Game,
  opsi: OpsiRingkasV2 = {}
): number {
  if (game.soal.length === 0) return 40;
  const kode = kompresGameKePayloadV2(game, opsi);
  if (kode.length <= 0) return 40;
  const rasio = Math.floor((game.soal.length * BATAS_KARAKTER_LINK_DATA) / kode.length);
  return Math.max(10, Math.min(250, rasio));
}

export function buatKodeLinkGame(
  game: Game,
  opsi: OpsiRingkasV2 = {}
): {
  kode: string;
  estimasiMaksSoal: number;
  melebihiBatas: boolean;
} {
  const kode = kompresGameKePayloadV2(game, opsi);
  const estimasiMaksSoal = estimasiMaksSoalUntukLink(game, opsi);
  return {
    kode,
    estimasiMaksSoal,
    melebihiBatas: kode.length > BATAS_KARAKTER_LINK_DATA,
  };
}

export function buatLinkBerbagiGame(
  game: Game,
  originPathUrl?: string,
  opsi: OpsiRingkasV2 = {}
): HasilBuatLink {
  const { kode, estimasiMaksSoal } = buatKodeLinkGame(game, opsi);
  const dasar = originPathUrl ?? ambilAlamatAplikasiDasar();
  const url = `${dasar}#/impor/${kode}`;

  if (url.length > BATAS_KARAKTER_LINK_DATA) {
    return {
      ok: false,
      pesanError: `Link melebihi batas maksimal ${BATAS_KARAKTER_LINK_DATA} karakter (${url.length} karakter). Perkiraan batas untuk panjang soal ini sekitar ${estimasiMaksSoal} soal. Gunakan Paket (.json) atau Bagikan Online untuk membuat link pendek & QR.`,
      panjangKode: kode.length,
      panjangUrl: url.length,
      qrDiizinkan: false,
      estimasiMaksSoal,
    };
  }

  const qrDiizinkan = url.length < BATAS_KARAKTER_QR_DATA;
  const peringatanPanjang =
    url.length > BATAS_PERINGATAN_LINK_DATA
      ? `Peringatan: link cukup panjang (${url.length} karakter, di atas 4.000). Sebagian aplikasi chat mungkin memotong URL sangat panjang — disarankan memakai Paket (.json) atau Bagikan Online.`
      : undefined;

  return {
    ok: true,
    url,
    kodeTerkompresi: kode,
    panjangKode: kode.length,
    panjangUrl: url.length,
    qrDiizinkan,
    peringatanPanjang,
    estimasiMaksSoal,
  };
}

export function parseLinkImporHash(hash: string): HasilValidasiPaket {
  const bersih = hash.replace(/^#/, '');
  const prefix = '/impor/';
  const idx = bersih.indexOf(prefix);
  if (idx === -1) {
    return {
      ok: false,
      pesanError: 'Link impor tidak memiliki kode paket soal.',
    };
  }

  const kode = bersih.slice(idx + prefix.length).split('?')[0].trim();
  if (!kode) {
    return {
      ok: false,
      pesanError: 'Kode game pada link kosong atau terpotong.',
    };
  }

  return dekompresPayloadKeGame(kode);
}

export async function buatQrDataUrl(teksUrl: string): Promise<string> {
  return QRCode.toDataURL(teksUrl, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: teksUrl.length > 1400 ? 'L' : 'M',
    color: {
      dark: '#071236',
      light: '#FFFFFF',
    },
  });
}

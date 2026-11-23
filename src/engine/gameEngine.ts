import { Pengaturan, Soal, SoalSiswa, TimSisi } from '../data/types';
import { acakFisherYates } from '../utils/shuffle';

export interface HasilCekJawaban {
  ditemukan: boolean;
  benar: boolean;
  kunciIndeks: number;
  poinTarikan: number;
  penjelasan?: string;
}

export function buatPengaturanDefault(): Pengaturan {
  return {
    mode: '2tim',
    namaTim: ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Kuning'],
    anggota: [[], [], [], []],
    jumlahPenarik: 4,
    durasiSoal: 15,
    akhirPermainan: 'keduanya',
    durasiWaktu: 3,
    langkahKeGaris: 6,
    salahMenarikLawan: true,
    bonus: false,
    penjelasan: false,
    ulangiSoal: false,
    suara: true,
    musik: false,
    pinGuru: '',
    modeRekam: true,
    efekRingan: false,
    jikaImbang: 'otomatis',
  };
}

/**
 * Menghapus kunci jawaban dan penjelasan agar tampilan siswa tidak pernah memiliki akses ke kunci.
 */
export function ambilSoalUntukSiswa(soal: Soal): SoalSiswa {
  return {
    id: soal.id,
    pertanyaan: soal.pertanyaan,
    ...(soal.kode !== undefined ? { kode: soal.kode } : {}),
    pilihan: [...soal.pilihan],
    ...(soal.tingkat !== undefined ? { tingkat: soal.tingkat } : {}),
    ...(soal.topik !== undefined ? { topik: soal.topik } : {}),
    ...(soal.bonus !== undefined ? { bonus: soal.bonus } : {}),
    ...(soal.cadangan !== undefined ? { cadangan: soal.cadangan } : {}),
  };
}

export function ambilDaftarSoalUntukSiswa(daftarSoal: readonly Soal[]): SoalSiswa[] {
  return daftarSoal.map(ambilSoalUntukSiswa);
}

/**
 * Satu-satunya fungsi pengecekan jawaban pada lapisan mesin permainan.
 */
export function cekJawaban(
  daftarSoal: readonly Soal[],
  soalId: string,
  indeksPilihan: number | null,
  sertakanPenjelasan: boolean,
  izinkanBonus = true
): HasilCekJawaban {
  const soalAsli = daftarSoal.find((item) => item.id === soalId);
  if (!soalAsli) {
    return {
      ditemukan: false,
      benar: false,
      kunciIndeks: -1,
      poinTarikan: 0,
    };
  }

  const benar = indeksPilihan !== null && indeksPilihan === soalAsli.kunci;
  const faktorBonus = izinkanBonus && soalAsli.bonus ? 2 : 1;

  return {
    ditemukan: true,
    benar,
    kunciIndeks: soalAsli.kunci,
    poinTarikan: benar ? 1 * faktorBonus : 0,
    penjelasan: sertakanPenjelasan ? soalAsli.penjelasan : undefined,
  };
}

/**
 * Membagi bank soal secara adil untuk Tim Merah dan Tim Biru tanpa pengulangan selama stok mencukupi.
 */
export function bagiSoalAdil(
  daftarSoal: readonly Soal[],
  acak = true
): { merah: Soal[]; biru: Soal[] } {
  const sumber = acak ? acakFisherYates(daftarSoal) : [...daftarSoal];
  const merah: Soal[] = [];
  const biru: Soal[] = [];

  sumber.forEach((soal, indeks) => {
    if (indeks % 2 === 0) {
      merah.push(soal);
    } else {
      biru.push(soal);
    }
  });

  return { merah, biru };
}

/**
 * Menghitung posisi tali baru (nilai negatif = menguntungkan Tim Merah / kiri, positif = Tim Biru / kanan).
 */
export function hitungPerubahanPosisiTali(
  posisiSekarang: number,
  timPenjawab: TimSisi,
  benar: boolean,
  besarLangkah: number,
  salahMenarikLawan: boolean
): { posisiBaru: number; arahTarikan: TimSisi | 'netral'; langkah: number } {
  if (benar) {
    const delta = timPenjawab === 'merah' ? -besarLangkah : besarLangkah;
    return {
      posisiBaru: posisiSekarang + delta,
      arahTarikan: timPenjawab,
      langkah: besarLangkah,
    };
  }

  if (!salahMenarikLawan) {
    return {
      posisiBaru: posisiSekarang,
      arahTarikan: 'netral',
      langkah: 0,
    };
  }

  const lawan: TimSisi = timPenjawab === 'merah' ? 'biru' : 'merah';
  const delta = lawan === 'merah' ? -1 : 1;
  return {
    posisiBaru: posisiSekarang + delta,
    arahTarikan: lawan,
    langkah: 1,
  };
}

/**
 * Posisi tali tertahan secara visual di garis batas, sementara posisi asli tetap disimpan untuk skor.
 */
export function hitungPosisiTaliVisual(posisiAsli: number, langkahKeGaris: number): number {
  const batas = Math.max(1, langkahKeGaris);
  return Math.max(-batas, Math.min(batas, posisiAsli));
}

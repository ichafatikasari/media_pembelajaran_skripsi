import { buatId } from '../utils/id';
import { normalisasiTeksBiasa } from './normalizer';
import {
  DraftSoal,
  HasilValidasiDraft,
  SumberImpor,
  validasiDaftarDraftSoal,
} from './validator';

export type PeranBaris =
  | 'soal'
  | 'opsi_a'
  | 'opsi_b'
  | 'opsi_c'
  | 'opsi_d'
  | 'kunci_a'
  | 'kunci_b'
  | 'kunci_c'
  | 'kunci_d'
  | 'abaikan';

export type PetaPeranBaris = Record<number, PeranBaris>;

function bersihkanAwalanNomorBaris(teks: string): string {
  return normalisasiTeksBiasa(
    teks.replace(
      /^\s*(?:(?:no\.?|soal)\s*\d{1,3}\s*[.)\-:]?|\d{1,3}\s*[.)\-:]|\(\s*\d{1,3}\s*\))\s*/i,
      ''
    )
  );
}

function bersihkanAwalanOpsiBaris(teks: string): string {
  return normalisasiTeksBiasa(
    teks
      .replace(/^\s*(?:\*?\s*\(\s*[A-Da-d]\s*\)\s*\.?\s*\*?|\*?\s*[A-Da-d]\s*[.)]\s*\*?|\*\s*[A-Da-d]\s*[.)]?)\s*/, '')
      .replace(/^\s*\*\s*/, '')
      .replace(/\s*\*\s*$/, '')
      .replace(/[✓✔]/g, '')
  );
}

/**
 * Menandai satu baris sebagai Mulai Soal lalu 4 baris non-kosong berikutnya sebagai Pilihan A–D.
 */
export function terapkanTandaiCepat(
  barisMentah: readonly string[],
  peranSaatIni: PetaPeranBaris,
  indeksMulai: number
): { peranBaru: PetaPeranBaris; indeksBerikutnya: number } {
  if (indeksMulai < 0 || indeksMulai >= barisMentah.length) {
    return { peranBaru: { ...peranSaatIni }, indeksBerikutnya: indeksMulai };
  }

  const peranBaru: PetaPeranBaris = { ...peranSaatIni, [indeksMulai]: 'soal' };
  const peranOpsi: PeranBaris[] = ['opsi_a', 'opsi_b', 'opsi_c', 'opsi_d'];
  let diisi = 0;
  let kursor = indeksMulai + 1;

  while (kursor < barisMentah.length && diisi < 4) {
    if (barisMentah[kursor].trim().length > 0) {
      peranBaru[kursor] = peranOpsi[diisi];
      diisi += 1;
    }
    kursor += 1;
  }

  while (kursor < barisMentah.length && barisMentah[kursor].trim().length === 0) {
    kursor += 1;
  }

  return {
    peranBaru,
    indeksBerikutnya: Math.min(kursor, Math.max(0, barisMentah.length - 1)),
  };
}

/**
 * Mengonversi penandaan baris manual guru menjadi daftar DraftSoal tervalidasi.
 */
export function konversiPenandaBarisKeDraft(
  barisMentah: readonly string[],
  peranPerBaris: PetaPeranBaris,
  sumber: SumberImpor = 'docx'
): HasilValidasiDraft {
  interface AkumulatorManual {
    nomorUrut: number;
    bagianPertanyaan: string[];
    opsi: string[];
    kunci: number | null;
    sudahAdaOpsi: boolean;
  }

  const daftarAkumulator: AkumulatorManual[] = [];
  let aktif: AkumulatorManual | null = null;
  let nomorUrut = 1;

  const simpanAktif = () => {
    if (!aktif) return;
    if (aktif.bagianPertanyaan.length > 0 || aktif.opsi.some((o) => o.trim().length > 0)) {
      daftarAkumulator.push(aktif);
    }
    aktif = null;
  };

  for (let i = 0; i < barisMentah.length; i += 1) {
    const teksAsli = normalisasiTeksBiasa(barisMentah[i] ?? '');
    if (!teksAsli) continue;

    const peran = peranPerBaris[i];
    if (peran === 'abaikan') {
      continue;
    }

    if (peran === 'soal') {
      simpanAktif();
      const pertanyaanAwal = bersihkanAwalanNomorBaris(teksAsli) || teksAsli;
      aktif = {
        nomorUrut,
        bagianPertanyaan: [pertanyaanAwal],
        opsi: ['', '', '', ''],
        kunci: null,
        sudahAdaOpsi: false,
      };
      nomorUrut += 1;
      continue;
    }

    if (!aktif) {
      // Baris sebelum Mulai Soal pertama (jika belum diberi peran): abaikan agar kepala dokumen tidak ikut
      if (!peran) continue;
      aktif = {
        nomorUrut,
        bagianPertanyaan: [],
        opsi: ['', '', '', ''],
        kunci: null,
        sudahAdaOpsi: false,
      };
      nomorUrut += 1;
    }

    if (!peran) {
      // Baris berurutan di bawah "Mulai Soal" yang tidak diberi peran digabung sebagai lanjutan soal
      if (!aktif.sudahAdaOpsi) {
        aktif.bagianPertanyaan.push(teksAsli);
      }
      continue;
    }

    if (peran === 'opsi_a' || peran === 'opsi_b' || peran === 'opsi_c' || peran === 'opsi_d') {
      const idxOpsi =
        peran === 'opsi_a' ? 0 : peran === 'opsi_b' ? 1 : peran === 'opsi_c' ? 2 : 3;
      const bintang = /^\s*\*/.test(teksAsli) || /[✓✔]/.test(teksAsli);
      aktif.opsi[idxOpsi] = bersihkanAwalanOpsiBaris(teksAsli);
      aktif.sudahAdaOpsi = true;
      if (bintang) {
        aktif.kunci = idxOpsi;
      }
      continue;
    }

    if (
      peran === 'kunci_a' ||
      peran === 'kunci_b' ||
      peran === 'kunci_c' ||
      peran === 'kunci_d'
    ) {
      aktif.kunci =
        peran === 'kunci_a' ? 0 : peran === 'kunci_b' ? 1 : peran === 'kunci_c' ? 2 : 3;
    }
  }

  simpanAktif();

  const daftarDraft: DraftSoal[] = daftarAkumulator.map((item) => {
    const pilihanTrim = [...item.opsi];
    while (pilihanTrim.length > 2 && !pilihanTrim[pilihanTrim.length - 1]) {
      pilihanTrim.pop();
    }

    return {
      id: buatId('soal'),
      pertanyaan: normalisasiTeksBiasa(item.bagianPertanyaan.join(' ')),
      pilihan: pilihanTrim,
      kunci: item.kunci,
      sumber,
      nomorAsli: item.nomorUrut,
      tanpaNomorJelas: false,
      masalah: [],
      peringatanDetail: [],
    };
  });

  return validasiDaftarDraftSoal(daftarDraft, [], {
    teksMentah: barisMentah.join('\n'),
    barisMentah: [...barisMentah],
    jenisDokumen: sumber,
  });
}

export function buatLaporanDiagnosaTeks(params: {
  jenisDokumen: SumberImpor | string;
  namaFile?: string;
  barisMentah: readonly string[];
  soalTerbaca: readonly DraftSoal[];
  peringatan: readonly string[];
}): string {
  const baris40Pertama = params.barisMentah
    .slice(0, 40)
    .map((b, idx) => `${idx + 1}: ${b}`);

  const laporan = {
    jenisDokumen: params.jenisDokumen,
    ...(params.namaFile ? { namaFile: params.namaFile } : {}),
    totalBarisMentah: params.barisMentah.length,
    barisMentah40Pertama: baris40Pertama,
    peringatan: [...params.peringatan],
    totalSoalTerbaca: params.soalTerbaca.length,
    soalTerbaca: params.soalTerbaca.map((s, idx) => ({
      urutan: idx + 1,
      keyakinan: s.keyakinan ?? 'yakin',
      alasan: s.alasanKeyakinan ?? s.peringatanDetail,
      pertanyaan: s.pertanyaan,
      pilihan: s.pilihan,
      kunciIndeks: s.kunci,
    })),
  };

  return JSON.stringify(laporan, null, 2);
}

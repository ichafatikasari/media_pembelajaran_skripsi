import * as XLSX from 'xlsx';
import { TingkatSoal } from '../data/types';
import { buatId } from '../utils/id';
import { normalisasiTeksBiasa } from './normalizer';
import { DraftSoal, HasilValidasiDraft, validasiDaftarDraftSoal } from './validator';

type PetaKolom = {
  soal?: number;
  kode?: number;
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  kunci?: number;
  penjelasan?: number;
  tingkat?: number;
  topik?: number;
  bonus?: number;
};

function normalisasiNamaHeader(teks: unknown): string {
  return String(teks ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function deteksiPetaKolom(barisHeader: unknown[]): PetaKolom {
  const peta: PetaKolom = {};

  barisHeader.forEach((sel, idx) => {
    const nama = normalisasiNamaHeader(sel);
    if (!nama) return;

    if (['soal', 'pertanyaan', 'question', 'tekssoal'].includes(nama)) {
      peta.soal = idx;
    } else if (['kode', 'code', 'potongankode'].includes(nama)) {
      peta.kode = idx;
    } else if (['a', 'pilihana', 'opsia', 'jawabana'].includes(nama)) {
      peta.a = idx;
    } else if (['b', 'pilihanb', 'opsib', 'jawabanb'].includes(nama)) {
      peta.b = idx;
    } else if (['c', 'pilihanc', 'opsic', 'jawabanc'].includes(nama)) {
      peta.c = idx;
    } else if (['d', 'pilihand', 'opsid', 'jawaband'].includes(nama)) {
      peta.d = idx;
    } else if (['kunci', 'jawaban', 'kuncijawaban', 'jawabanbenar', 'answer'].includes(nama)) {
      peta.kunci = idx;
    } else if (['penjelasan', 'pembahasan', 'keterangan'].includes(nama)) {
      peta.penjelasan = idx;
    } else if (['tingkat', 'level', 'kesulitan'].includes(nama)) {
      peta.tingkat = idx;
    } else if (['topik', 'materi', 'bab', 'mapel'].includes(nama)) {
      peta.topik = idx;
    } else if (['bonus', 'soalbonus'].includes(nama)) {
      peta.bonus = idx;
    }
  });

  return peta;
}

function terjemahkanKunciExcel(nilaiKunci: unknown, pilihan: string[]): number | null {
  const mentah = normalisasiTeksBiasa(String(nilaiKunci ?? ''));
  if (!mentah) return null;

  if (/^[A-Da-d]$/.test(mentah)) {
    return mentah.toUpperCase().charCodeAt(0) - 65;
  }

  if (/^[1-4]$/.test(mentah)) {
    return Number(mentah) - 1;
  }

  const cocokTeks = pilihan.findIndex(
    (p) => p.trim().toLowerCase() === mentah.toLowerCase()
  );
  if (cocokTeks >= 0) {
    return cocokTeks;
  }

  return null;
}

function parseTingkatExcel(nilai: unknown): TingkatSoal | undefined {
  const bersih = String(nilai ?? '').trim().toLowerCase();
  if (bersih === 'mudah') return 'Mudah';
  if (bersih === 'sedang') return 'Sedang';
  if (bersih === 'sulit' || bersih === 'sukar') return 'Sulit';
  return undefined;
}

function parseBonusExcel(nilai: unknown): boolean {
  const bersih = String(nilai ?? '').trim().toLowerCase();
  return ['ya', 'iya', 'yes', 'true', '1', 'bonus'].includes(bersih);
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer): HasilValidasiDraft {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const namaSheet = workbook.SheetNames[0];
  if (!namaSheet) {
    return validasiDaftarDraftSoal([], ['Berkas lembar kerja tidak memiliki sheet yang dapat dibaca.']);
  }

  const sheet = workbook.Sheets[namaSheet];
  const semuaBaris = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (semuaBaris.length === 0) {
    return validasiDaftarDraftSoal([], ['Berkas lembar kerja kosong.']);
  }

  // Cari baris header (maksimal 5 baris pertama)
  let indeksHeader = -1;
  let petaKolom: PetaKolom = {};

  for (let i = 0; i < Math.min(5, semuaBaris.length); i += 1) {
    const kandidat = deteksiPetaKolom(semuaBaris[i]);
    if (kandidat.soal !== undefined && kandidat.a !== undefined && kandidat.b !== undefined) {
      indeksHeader = i;
      petaKolom = kandidat;
      break;
    }
  }

  const peringatan: string[] = [];
  if (indeksHeader === -1) {
    peringatan.push(
      'Header kolom standar (Soal, A, B, C, D, Kunci) tidak terdeteksi penuh. Sistem membaca urutan kolom bawaan (Soal, A, B, C, D, Kunci).'
    );
    indeksHeader = 0;
    petaKolom = {
      soal: 0,
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      kunci: 5,
      penjelasan: 6,
      tingkat: 7,
      topik: 8,
      bonus: 9,
    };
  }

  const daftarDraft: DraftSoal[] = [];

  for (let i = indeksHeader + 1; i < semuaBaris.length; i += 1) {
    const baris = semuaBaris[i];
    if (!Array.isArray(baris)) continue;

    // Abaikan baris kosong sepenuhnya
    const adaIsi = baris.some((sel) => String(sel ?? '').trim().length > 0);
    if (!adaIsi) continue;

    const teksSoal = normalisasiTeksBiasa(String(baris[petaKolom.soal ?? 0] ?? ''));
    const teksKode =
      petaKolom.kode !== undefined ? String(baris[petaKolom.kode] ?? '') : '';

    const kandidatPilihan = [
      petaKolom.a !== undefined ? normalisasiTeksBiasa(String(baris[petaKolom.a] ?? '')) : '',
      petaKolom.b !== undefined ? normalisasiTeksBiasa(String(baris[petaKolom.b] ?? '')) : '',
      petaKolom.c !== undefined ? normalisasiTeksBiasa(String(baris[petaKolom.c] ?? '')) : '',
      petaKolom.d !== undefined ? normalisasiTeksBiasa(String(baris[petaKolom.d] ?? '')) : '',
    ].filter((p, idx) => idx < 2 || p.length > 0);

    const pilihan = kandidatPilihan.filter((p) => p.length > 0);
    const kunci =
      petaKolom.kunci !== undefined
        ? terjemahkanKunciExcel(baris[petaKolom.kunci], pilihan)
        : null;

    const penjelasan =
      petaKolom.penjelasan !== undefined
        ? normalisasiTeksBiasa(String(baris[petaKolom.penjelasan] ?? ''))
        : '';
    const tingkat =
      petaKolom.tingkat !== undefined ? parseTingkatExcel(baris[petaKolom.tingkat]) : undefined;
    const topik =
      petaKolom.topik !== undefined
        ? normalisasiTeksBiasa(String(baris[petaKolom.topik] ?? ''))
        : '';
    const bonus =
      petaKolom.bonus !== undefined ? parseBonusExcel(baris[petaKolom.bonus]) : false;

    daftarDraft.push({
      id: buatId('soal'),
      pertanyaan: teksSoal,
      ...(teksKode.trim() ? { kode: teksKode } : {}),
      pilihan,
      kunci,
      ...(penjelasan ? { penjelasan } : {}),
      ...(tingkat ? { tingkat } : {}),
      ...(topik ? { topik } : {}),
      ...(bonus ? { bonus: true } : {}),
      sumber: 'xlsx',
      masalah: [],
      peringatanDetail: [],
    });
  }

  return validasiDaftarDraftSoal(daftarDraft, peringatan);
}

export function buatWorkbookTemplateExcel(): XLSX.WorkBook {
  const data = [
    ['Soal', 'A', 'B', 'C', 'D', 'Kunci', 'Penjelasan', 'Tingkat', 'Topik', 'Bonus'],
    [
      'Berapakah hasil dari 15 + 27?',
      '32',
      '42',
      '44',
      '52',
      'B',
      '15 ditambah 27 sama dengan 42.',
      'Mudah',
      'Matematika',
      'tidak',
    ],
    [
      'Bagian tumbuhan yang berfungsi menyerap air dan mineral dari dalam tanah adalah ...',
      'Daun',
      'Batang',
      'Akar',
      'Bunga',
      '3',
      'Akar menyerap air dan unsur hara dari tanah.',
      'Mudah',
      'IPA',
      'tidak',
    ],
    [
      'Ibukota Provinsi Jawa Tengah adalah ...',
      'Bandung',
      'Surabaya',
      'Semarang',
      'Yogyakarta',
      'Semarang',
      'Semarang merupakan ibukota Provinsi Jawa Tengah.',
      'Mudah',
      'IPS',
      'ya',
    ],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [
    { wch: 52 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 36 },
    { wch: 12 },
    { wch: 16 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Template Soal');
  return wb;
}

export function unduhTemplateExcel(): void {
  const wb = buatWorkbookTemplateExcel();
  XLSX.writeFile(wb, 'Template_Soal_Duel_Otak.xlsx');
}

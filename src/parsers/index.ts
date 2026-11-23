import { parseSpreadsheetBuffer, unduhTemplateExcel } from './excelParser';
import {
  HasilParseKunci,
  parseSpreadsheetKunciBuffer,
  parseTeksKunci,
  parseWordKunciBuffer,
} from './kunciParser';
import { susunBarisDariDaftarItem } from './pdfKolom';
import { ekstrakHalamanItemsPdf, parsePdfBuffer } from './pdfParser';
import { parseTeksSoal } from './textParser';
import {
  HasilValidasiDraft,
  ModeKolomPdf,
  SumberImpor,
  validasiDaftarDraftSoal,
} from './validator';
import { parseWordBuffer } from './wordParser';

export interface DeskripsiParser {
  id: SumberImpor;
  label: string;
  ekstensi: string[];
}

export const DAFTAR_PARSER_TERSEDIA: DeskripsiParser[] = [
  { id: 'manual', label: 'Input Manual', ekstensi: [] },
  { id: 'teks', label: 'Tempel Teks Terstruktur', ekstensi: ['.txt'] },
  { id: 'docx', label: 'Dokumen Word', ekstensi: ['.docx'] },
  { id: 'xlsx', label: 'Lembar Kerja Excel / CSV', ekstensi: ['.xlsx', '.xls', '.csv'] },
  { id: 'pdf', label: 'Dokumen PDF (Berisi Teks)', ekstensi: ['.pdf'] },
];

export const CONTOH_FORMAT_TEKS = `1. Hasil dari 18 × 4 adalah ...
A. 64
B. 72
C. 78
D. 84
Kunci: B
Penjelasan: 18 dikali 4 sama dengan 72.
Tingkat: Mudah
Topik: Matematika

2) Manakah yang merupakan ibu kota Provinsi Jawa Barat?
(A) Surabaya
(B) *Bandung
(C) Semarang
(D) Medan
Topik: Geografi

3 - Perhatikan potongan kode berikut:
\`\`\`
let total = 0;
for (let i = 1; i <= 3; i++) {
  total += i;
}
\`\`\`
Nilai akhir variabel total adalah ...
a. 3
b. 5
c. 6
d. 7
Topik: Informatika
Bonus: ya

No. 4 Planet yang memiliki cincin paling jelas di tata surya kita adalah ...
A) Mars
B) Venus
C) Saturnus ✓
D) Merkurius
Topik: IPA

Kunci Jawaban:
3. C`;

export function unduhContohFormatTeks(): void {
  const blob = new Blob([CONTOH_FORMAT_TEKS], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = 'Contoh_Format_Soal_Duel_Otak.txt';
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  URL.revokeObjectURL(url);
}

export async function parseFileDokumen(
  file: File,
  opsi?: { modeKolomPdf?: ModeKolomPdf }
): Promise<HasilValidasiDraft> {
  const nama = file.name.toLowerCase();

  try {
    if (nama.endsWith('.txt')) {
      const teks = await file.text();
      return parseTeksSoal(teks, 'teks');
    }

    if (nama.endsWith('.docx')) {
      const buffer = await file.arrayBuffer();
      return await parseWordBuffer(buffer);
    }

    if (nama.endsWith('.xlsx') || nama.endsWith('.xls') || nama.endsWith('.csv')) {
      const buffer = await file.arrayBuffer();
      return parseSpreadsheetBuffer(buffer);
    }

    if (nama.endsWith('.pdf')) {
      const buffer = await file.arrayBuffer();
      return await parsePdfBuffer(buffer, opsi?.modeKolomPdf ?? 'otomatis');
    }

    if (nama.endsWith('.doc')) {
      return validasiDaftarDraftSoal(
        [],
        [
          'Format .doc lama tidak didukung langsung. Silakan simpan ulang sebagai .docx di Microsoft Word atau salin teks soal ke tab Tempel Teks.',
        ]
      );
    }

    return validasiDaftarDraftSoal(
      [],
      ['Format berkas belum didukung. Gunakan .docx, .xlsx, .xls, .csv, .pdf (berisi teks), atau .txt.']
    );
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal membaca berkas.';
    return validasiDaftarDraftSoal([], [`Berkas gagal diproses: ${pesan}`]);
  }
}

export async function parseFileKunciDokumen(
  file: File,
  jumlahSoal = 0
): Promise<HasilParseKunci> {
  const nama = file.name.toLowerCase();

  try {
    if (nama.endsWith('.txt')) {
      const teks = await file.text();
      return parseTeksKunci(teks, jumlahSoal);
    }

    if (nama.endsWith('.docx')) {
      const buffer = await file.arrayBuffer();
      return await parseWordKunciBuffer(buffer, jumlahSoal);
    }

    if (nama.endsWith('.xlsx') || nama.endsWith('.xls') || nama.endsWith('.csv')) {
      const buffer = await file.arrayBuffer();
      return parseSpreadsheetKunciBuffer(buffer, jumlahSoal);
    }

    if (nama.endsWith('.pdf')) {
      const buffer = await file.arrayBuffer();
      const { halamanList } = await ekstrakHalamanItemsPdf(buffer);
      const teksGabungan = halamanList
        .map((hal) => susunBarisDariDaftarItem(hal.items).join('\n'))
        .join('\n');
      return parseTeksKunci(teksGabungan, jumlahSoal);
    }

    return {
      petaKunci: {},
      daftarPasangan: [],
      mode: 'kosong',
      peringatan: ['Format berkas kunci belum didukung. Gunakan .docx, .pdf, .xlsx, .csv, atau .txt.'],
    };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal membaca berkas kunci.';
    return {
      petaKunci: {},
      daftarPasangan: [],
      mode: 'kosong',
      peringatan: [`Berkas kunci gagal diproses: ${pesan}`],
    };
  }
}

export {
  parseSpreadsheetBuffer,
  parsePdfBuffer,
  parseTeksSoal,
  parseWordBuffer,
  unduhTemplateExcel,
};
export { ekstrakBarisDariHtmlWord, parseHtmlWord } from './wordParser';
export * from './kunciParser';
export * from './koreksiSoal';
export * from './normalizer';
export * from './pdfKolom';
export * from './penandaBaris';
export * from './validator';

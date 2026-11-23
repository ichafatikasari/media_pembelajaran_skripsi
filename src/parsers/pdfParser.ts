import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  HalamanItemsPdf,
  ItemTeksPdf,
  parseHalamanPdfKeDraft,
} from './pdfKolom';
import {
  HasilValidasiDraft,
  ModeKolomPdf,
  validasiDaftarDraftSoal,
} from './validator';

if (typeof (Promise as unknown as { try?: unknown }).try !== 'function') {
  (Promise as unknown as { try: <T>(fn: (...args: unknown[]) => T, ...args: unknown[]) => Promise<T> }).try = (
    fn,
    ...args
  ) =>
    new Promise((resolve) => {
      resolve(fn(...args));
    });
}

if (typeof (Uint8Array.prototype as unknown as { toHex?: unknown }).toHex !== 'function') {
  (Uint8Array.prototype as unknown as { toHex: (this: Uint8Array) => string }).toHex = function () {
    let hex = '';
    for (let i = 0; i < this.length; i += 1) {
      hex += this[i].toString(16).padStart(2, '0');
    }
    return hex;
  };
}

export async function ekstrakHalamanItemsPdf(buffer: ArrayBuffer): Promise<{
  halamanList: HalamanItemsPdf[];
  totalKarakter: number;
}> {
  if (typeof pdfWorkerUrl === 'string' && pdfWorkerUrl) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;

  const halamanList: HalamanItemsPdf[] = [];
  let totalKarakter = 0;

  for (let nomorHal = 1; nomorHal <= pdf.numPages; nomorHal += 1) {
    const halaman = await pdf.getPage(nomorHal);
    const viewport = halaman.getViewport({ scale: 1 });
    const konten = await halaman.getTextContent();
    const itemTeks: ItemTeksPdf[] = [];

    for (const raw of konten.items) {
      if ('str' in raw && typeof raw.str === 'string') {
        const teks = raw.str;
        if (teks.trim().length > 0) {
          const transform = raw.transform;
          const width = 'width' in raw && typeof raw.width === 'number' ? raw.width : undefined;
          itemTeks.push({
            teks,
            x: Array.isArray(transform) ? Number(transform[4] ?? 0) : 0,
            y: Array.isArray(transform) ? Number(transform[5] ?? 0) : 0,
            ...(width !== undefined ? { width } : {}),
          });
          totalKarakter += teks.trim().length;
        }
      }
    }

    halamanList.push({
      items: itemTeks,
      lebarHalaman: viewport.width,
    });
  }

  return { halamanList, totalKarakter };
}

export async function parsePdfBuffer(
  buffer: ArrayBuffer,
  modeKolom: ModeKolomPdf = 'otomatis'
): Promise<HasilValidasiDraft> {
  const { halamanList, totalKarakter } = await ekstrakHalamanItemsPdf(buffer);

  // Deteksi PDF hasil scan (gambar tanpa lapisan teks)
  if (totalKarakter < 15) {
    return validasiDaftarDraftSoal(
      [],
      [
        'PDF ini tampak seperti hasil scan/gambar dan tidak memiliki lapisan teks yang dapat dibaca secara offline. Saran: salin teks soal lalu gunakan tab Tempel Teks, atau ubah soal ke format Word (.docx) / Excel (.xlsx).',
      ],
      { jenisDokumen: 'pdf' }
    );
  }

  return parseHalamanPdfKeDraft(halamanList, modeKolom);
}

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { normalisasiBarisMentah, normalisasiTeksBiasa } from './normalizer';
import {
  DraftSoal,
  SumberImpor,
  validasiDaftarDraftSoal,
} from './validator';

export interface PasanganKunci {
  nomor: number;
  kunci: number;
  huruf: string;
}

export interface HasilParseKunci {
  petaKunci: Record<number, number>;
  daftarPasangan: PasanganKunci[];
  mode: 'bernomor' | 'deretan' | 'kosong';
  peringatan: string[];
}

export function buatPeringatanJumlahKunci(
  jumlahKunci: number,
  jumlahSoal: number
): string[] {
  if (jumlahKunci === 0) {
    return ['Tidak ada kunci jawaban (A–D) yang terbaca dari masukan.'];
  }
  if (jumlahSoal > 0 && jumlahKunci !== jumlahSoal) {
    return [
      `Jumlah kunci terbaca (${jumlahKunci}) tidak sama dengan jumlah soal (${jumlahSoal}). Periksa kembali sebelum menerapkan.`,
    ];
  }
  return [];
}

/**
 * Membaca berbagai format tempel/teks kunci jawaban:
 * - "1. B  2. C  3. A"
 * - "1-B, 2-C"
 * - "1:B" / "No. 1: B"
 * - "1 B" per baris atau berderet
 * - Deretan huruf "BCADBDA..." (berurutan 1..N)
 */
export function parseTeksKunci(
  teksMentah: string,
  jumlahSoal = 0
): HasilParseKunci {
  const bersih = normalisasiBarisMentah(teksMentah)
    .replace(/\u00A0/g, ' ')
    .trim();

  if (!bersih) {
    return {
      petaKunci: {},
      daftarPasangan: [],
      mode: 'kosong',
      peringatan: buatPeringatanJumlahKunci(0, jumlahSoal),
    };
  }

  // Hilangkan kata pembuka umum seperti "Kunci Jawaban:" atau "Kunci:"
  const tanpaHeader = bersih
    .replace(/^(?:daftar\s+)?kunci(?:\s+jawaban)?(?:\s+(?:pilihan\s+ganda|pg))?\s*[:=\-]?\s*/i, '')
    .trim();

  // 1. Cari pasangan bernomor: "1. B", "1-B", "1:B", "1) B", "1 B", "No. 1 B"
  const regexPasangan =
    /(?:^|[\s,;|\n])(?:no\.?\s*)?(\d{1,3})\s*(?:[.\-:)]|\s+)\s*([A-Da-d])(?=$|[\s,;.)|\n])/gi;
  const pasanganMatches = [...tanpaHeader.matchAll(regexPasangan)];

  if (pasanganMatches.length > 0) {
    const petaKunci: Record<number, number> = {};
    const daftarPasangan: PasanganKunci[] = [];
    const nomorSudah = new Set<number>();

    for (const m of pasanganMatches) {
      const nomor = Number(m[1]);
      const huruf = m[2].toUpperCase();
      const kunci = huruf.charCodeAt(0) - 65;
      if (nomor >= 1 && kunci >= 0 && kunci <= 3) {
        petaKunci[nomor] = kunci;
        if (!nomorSudah.has(nomor)) {
          nomorSudah.add(nomor);
          daftarPasangan.push({ nomor, kunci, huruf });
        } else {
          const idxAda = daftarPasangan.findIndex((p) => p.nomor === nomor);
          if (idxAda >= 0) daftarPasangan[idxAda] = { nomor, kunci, huruf };
        }
      }
    }

    daftarPasangan.sort((a, b) => a.nomor - b.nomor);
    return {
      petaKunci,
      daftarPasangan,
      mode: 'bernomor',
      peringatan: buatPeringatanJumlahKunci(daftarPasangan.length, jumlahSoal),
    };
  }

  // 2. Cek deretan huruf seperti "BCADBDA..." atau "B C A D B..."
  const tanpaPemisah = tanpaHeader.replace(/[\s,;|.\-\n]+/g, '').toUpperCase();
  if (/^[A-D]+$/.test(tanpaPemisah) && tanpaPemisah.length > 0) {
    const petaKunci: Record<number, number> = {};
    const daftarPasangan: PasanganKunci[] = [];
    for (let i = 0; i < tanpaPemisah.length; i += 1) {
      const huruf = tanpaPemisah[i];
      const kunci = huruf.charCodeAt(0) - 65;
      const nomor = i + 1;
      petaKunci[nomor] = kunci;
      daftarPasangan.push({ nomor, kunci, huruf });
    }
    return {
      petaKunci,
      daftarPasangan,
      mode: 'deretan',
      peringatan: buatPeringatanJumlahKunci(daftarPasangan.length, jumlahSoal),
    };
  }

  return {
    petaKunci: {},
    daftarPasangan: [],
    mode: 'kosong',
    peringatan: buatPeringatanJumlahKunci(0, jumlahSoal),
  };
}

export function parseSpreadsheetKunciBuffer(
  buffer: ArrayBuffer,
  jumlahSoal = 0
): HasilParseKunci {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return parseTeksKunci('', jumlahSoal);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    return parseTeksKunci('', jumlahSoal);
  }

  const petaKunci: Record<number, number> = {};
  const daftarPasangan: PasanganKunci[] = [];
  let urutTanpaNomor = 1;

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const selBersih = row
      .map((c) => normalisasiTeksBiasa(String(c ?? '')))
      .filter((s) => s.length > 0);
    if (selBersih.length === 0) continue;

    // Lewati baris header seperti ["No", "Kunci"]
    if (
      r === 0 &&
      selBersih.some((s) => /^(?:no\.?|nomor|kunci|jawaban)$/i.test(s))
    ) {
      continue;
    }

    // Jika baris berupa 2 kolom [nomor, huruf/angka]
    if (selBersih.length >= 2 && /^\d{1,3}[.)]?$/.test(selBersih[0])) {
      const nomor = Number(selBersih[0].replace(/[^\d]/g, ''));
      const val = selBersih[1].toUpperCase();
      let kunci = -1;
      if (/^[A-D]$/.test(val)) kunci = val.charCodeAt(0) - 65;
      else if (/^[1-4]$/.test(val)) kunci = Number(val) - 1;
      if (nomor >= 1 && kunci >= 0 && kunci <= 3) {
        const huruf = String.fromCharCode(65 + kunci);
        petaKunci[nomor] = kunci;
        daftarPasangan.push({ nomor, kunci, huruf });
        continue;
      }
    }

    // Jika satu sel berisi "1. B" atau hanya huruf "B"
    if (selBersih.length === 1) {
      if (/^[A-Da-d]$/.test(selBersih[0])) {
        const huruf = selBersih[0].toUpperCase();
        const kunci = huruf.charCodeAt(0) - 65;
        petaKunci[urutTanpaNomor] = kunci;
        daftarPasangan.push({ nomor: urutTanpaNomor, kunci, huruf });
        urutTanpaNomor += 1;
        continue;
      }
      const sub = parseTeksKunci(selBersih[0], 0);
      for (const p of sub.daftarPasangan) {
        petaKunci[p.nomor] = p.kunci;
        daftarPasangan.push(p);
      }
    }
  }

  if (daftarPasangan.length > 0) {
    daftarPasangan.sort((a, b) => a.nomor - b.nomor);
    return {
      petaKunci,
      daftarPasangan,
      mode: 'bernomor',
      peringatan: buatPeringatanJumlahKunci(daftarPasangan.length, jumlahSoal),
    };
  }

  // Cadangan: gabungkan semua teks sheet ke parseTeksKunci
  const teksGabungan = rows
    .map((r) => (Array.isArray(r) ? r.join(' ') : ''))
    .join('\n');
  return parseTeksKunci(teksGabungan, jumlahSoal);
}

export async function parseWordKunciBuffer(
  buffer: ArrayBuffer,
  jumlahSoal = 0
): Promise<HasilParseKunci> {
  const mammothInput =
    typeof window === 'undefined' && typeof Buffer !== 'undefined'
      ? ({ buffer: Buffer.from(buffer) } as unknown as { arrayBuffer: ArrayBuffer })
      : { arrayBuffer: buffer };

  const res = await mammoth.extractRawText(mammothInput);
  return parseTeksKunci(res.value ?? '', jumlahSoal);
}

/**
 * Menerapkan peta kunci (1-based) ke daftar DraftSoal dan memvalidasi ulang status keyakinan.
 */
export function terapkanPetaKunciKeDraft(
  daftar: readonly DraftSoal[],
  petaKunci: Readonly<Record<number, number>>,
  peringatanUmum: string[] = [],
  jenisDokumen?: SumberImpor
): DraftSoal[] {
  const diperbarui = daftar.map((item, idx) => {
    const kunciOlehUrut = petaKunci[idx + 1];
    const kunciOlehNomorAsli =
      item.nomorAsli !== null && item.nomorAsli !== undefined
        ? petaKunci[item.nomorAsli]
        : undefined;
    const kunciBaru =
      kunciOlehUrut !== undefined ? kunciOlehUrut : kunciOlehNomorAsli;

    if (kunciBaru === undefined || kunciBaru < 0 || kunciBaru >= item.pilihan.length) {
      return item;
    }
    return {
      ...item,
      kunci: kunciBaru,
    };
  });

  return validasiDaftarDraftSoal(diperbarui, peringatanUmum, {
    ...(jenisDokumen ? { jenisDokumen } : {}),
  }).daftar;
}

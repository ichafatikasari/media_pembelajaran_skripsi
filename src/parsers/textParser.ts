import { TingkatSoal } from '../data/types';
import { buatId } from '../utils/id';
import { parseTeksKunci } from './kunciParser';
import { normalisasiBarisMentah, normalisasiTeksBiasa } from './normalizer';
import {
  DraftSoal,
  HasilValidasiDraft,
  KandidatKunciBertentangan,
  LABEL_SUMBER_KUNCI,
  SumberImpor,
  SumberKunciSoal,
  validasiDaftarDraftSoal,
} from './validator';

export const PENANDA_TEKS_BENAR = '[[TANDABENAR]]';
export const PENANDA_ADA_MEDIA = '[[ADAMEDIA]]';

const REGEX_NOMOR_SOAL =
  /^\s*(?:(?:no\.?|soal)\s*(\d{1,3})\s*[.)\-:]?|(\d{1,3})\s*[.)\-:]|\(\s*(\d{1,3})\s*\))\s+(.*)$/i;
const REGEX_NOMOR_SOAL_RAPAT = /^\s*(\d{1,3})\.(?=[A-Za-z"'\u201C(])(.*)$/;
const REGEX_PILIHAN =
  /^\s*(?:\*?\s*\(\s*([A-Da-d])\s*\)\s*\.?\s*\*?|\*?\s*([A-Da-d])\s*[.)]\s*\*?|\*\s*([A-Da-d])\s*[.)]?)\s*(.+)$/;
const REGEX_KUNCI_BARIS =
  /^\s*(?:kunci(?:\s*jawaban)?|jawaban(?:\s*benar)?|ans(?:wer)?)\s*[:=\-]\s*(.+)$/i;
const REGEX_PENJELASAN = /^\s*(?:penjelasan|pembahasan)\s*[:=\-]\s*(.*)$/i;
const REGEX_TINGKAT = /^\s*(?:tingkat|level|kesulitan)\s*[:=\-]\s*(.+)$/i;
const REGEX_TOPIK = /^\s*(?:topik|materi|bab|mapel)\s*[:=\-]\s*(.+)$/i;
const REGEX_BONUS = /^\s*bonus\s*[:=\-]\s*(.+)$/i;

const REGEX_KEPALA_METADATA =
  /^\s*(?:nama(?:\s+siswa|\s+peserta|\s+lengkap)?|kelas(?:\s*\/\s*semester)?|no\.?\s*absen|nomor\s+(?:peserta|ujian)|hari\s*\/?\s*tanggal|tanggal|waktu|alokasi\s+waktu|lama\s+ujian|materi(?:\s+pokok)?|mata\s+pelajaran|mapel|kompetensi\s+dasar|indikator|tahun\s+(?:ajaran|pelajaran)|semester|sekolah|madrasah|guru(?:\s+mapel)?|bidang\s+studi|judul(?:\s+ujian)?|petunjuk(?:\s+umum|\s+pengerjaan)?)\s*[:=\-]/i;

const REGEX_KEPALA_JUDUL_UJIAN =
  /^\s*(?:soal\s+)?(?:ulangan(?:\s+harian|\s+tengah|\s+akhir)?|penilaian\s+(?:tengah|akhir|harian)|asesmen\s+(?:sumatif|formatif|nasional)|ujian\s+(?:akhir|tengah|sekolah|madrasah)|latihan\s+soal|evaluasi(?:\s+pembelajaran)?|tryout|try\s+out|kuis\s+harian|microsoft\s+word|lembar\s+soal)\b/i;

const REGEX_BARIS_PETUNJUK =
  /^\s*(?:petunjuk(?:\s+umum|\s+pengerjaan)?\s*[:\-]?|pilihlah\s+(?:salah\s+satu\s+)?jawaban|berilah\s+tanda\s+silang|silanglah\s+(?:huruf|jawaban)|jawablah\s+pertanyaan|kerjakanlah?\s+soal|isilah\s+(?:titik|pertanyaan)|jodohkanlah\s+pernyataan|bacalah\s+soal(?:\s+berikut)?\s+dengan\s+(?:teliti|cermat|seksama))\b/i;

const REGEX_JAWAB_URAIAN =
  /^\s*(?:jawab(?:an)?|penyelesaian)\s*[:=\-]?\s*(?:[._\-\u2026\u00B7\s]{2,}|\s*)$/i;

const REGEX_GARIS_KOSONG = /^\s*[._\-=\u2026\u00B7•]{3,}\s*$/;

const REGEX_KEPALA_ISIAN_TITIK =
  /^\s*(?:(?:nama(?:\s+siswa|\s+peserta|\s+lengkap)?|kelas(?:\s*\/\s*semester)?|no\.?\s*absen|hari\s*\/?\s*tanggal|tanggal|waktu|materi)\s*[:=\-]?\s*[._\-\u2026]{2,}(?:\s+|$))+$/i;

function parseTingkat(nilai: string): TingkatSoal | undefined {
  const bersih = nilai.trim().toLowerCase();
  if (bersih.startsWith('mudah')) return 'Mudah';
  if (bersih.startsWith('sedang')) return 'Sedang';
  if (bersih.startsWith('sulit') || bersih.startsWith('sukar')) return 'Sulit';
  return undefined;
}

function parseBonus(nilai: string): boolean {
  const bersih = nilai.trim().toLowerCase();
  return ['ya', 'iya', 'yes', 'true', '1', 'bonus'].includes(bersih);
}

function bersihkanPenandaPilihan(teksAwal: string): {
  teks: string;
  ditandaiBenar: boolean;
} {
  let teks = teksAwal;
  let ditandaiBenar = false;

  if (teks.includes(PENANDA_TEKS_BENAR)) {
    ditandaiBenar = true;
    teks = teks.replaceAll(PENANDA_TEKS_BENAR, '');
  }

  if (
    /^\*/.test(teks.trim()) ||
    /\*\s*$/.test(teks.trim()) ||
    /\(\s*(?:benar|kunci)\s*\)|\[\s*(?:benar|kunci)\s*\]|[✓✔]/i.test(teks)
  ) {
    ditandaiBenar = true;
    teks = teks
      .replace(/^\s*\*\s*/, '')
      .replace(/\s*\*\s*$/, '')
      .replace(/\(\s*(?:benar|kunci)\s*\)|\[\s*(?:benar|kunci)\s*\]/gi, '')
      .replace(/[✓✔]/g, '');
  }

  return {
    teks: normalisasiTeksBiasa(teks),
    ditandaiBenar,
  };
}

function terjemahkanKunci(nilaiMentah: string, pilihan: string[]): number | null {
  const bersih = normalisasiTeksBiasa(nilaiMentah);
  if (!bersih || /^[._\-\u2026]+$/.test(bersih)) return null;

  const hurufMatch = bersih.match(/^([A-Da-d])(?:[.)\s]|$)/);
  if (hurufMatch) {
    return hurufMatch[1].toUpperCase().charCodeAt(0) - 65;
  }

  const angkaMatch = bersih.match(/^([1-4])(?:[.)\s]|$)/);
  if (angkaMatch) {
    return Number(angkaMatch[1]) - 1;
  }

  const cocokTeks = pilihan.findIndex(
    (p) => p.trim().toLowerCase() === bersih.toLowerCase()
  );
  if (cocokTeks >= 0) {
    return cocokTeks;
  }

  return null;
}

export interface InfoJudulBagian {
  tipe: 'pg' | 'lewati';
  label: string;
  sisaTeks?: string;
}

export function deteksiJudulBagian(barisMentah: string): InfoJudulBagian | null {
  const trim = normalisasiTeksBiasa(barisMentah);
  if (!trim || trim.length > 95) return null;
  if (/\?$/.test(trim)) return null;

  const tanpaAwalan = trim
    .replace(/^(?:bagian|bab|romawi)\s+(?:[IVXLCDM]+|[A-D]|\d+)\s*[:.\-]?\s*/i, '')
    .replace(/^(?:[IVXLCDM]+|[A-D]|\d{1,2})\s*[.):\-]\s+/i, '')
    .trim();

  const cocokPg = tanpaAwalan.match(
    /^(?:soal\s+)?(pilihan\s+ganda|pilihan\s+berganda|multiple\s+choice|pg)(?:\s*[:\-]\s*(.*)|\s+(pilihlah.*)|\s*\(.*\))?$/i
  );
  if (cocokPg) {
    return {
      tipe: 'pg',
      label: 'PILIHAN GANDA',
      sisaTeks: (cocokPg[2] || cocokPg[3] || '').trim() || undefined,
    };
  }

  const cocokLewati = tanpaAwalan.match(
    /^(?:soal\s+)?(uraian|essay|esai|isian\s+singkat|isian\s+pendek|isian|jawaban\s+singkat|menjodohkan|jodohkan|benar\s*(?:\/|\satau\s)?\s*salah|true\s*(?:\/|\sor\s)?\s*false|tugas\s+praktik)(?:\s*[:\-]\s*(.*)|\s+(jawablah.*|kerjakan.*|isilah.*|jodohkan.*)|\s*\(.*\))?$/i
  );
  if (cocokLewati) {
    const namaBersih = cocokLewati[1]
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
    return {
      tipe: 'lewati',
      label: namaBersih,
      sisaTeks: (cocokLewati[2] || cocokLewati[3] || '').trim() || undefined,
    };
  }

  return null;
}

function cocokNomorSoal(baris: string): { nomor: number; teks: string } | null {
  const m1 = baris.match(REGEX_NOMOR_SOAL);
  if (m1) {
    return {
      nomor: Number(m1[1] || m1[2] || m1[3]),
      teks: m1[4] ?? '',
    };
  }
  const m2 = baris.match(REGEX_NOMOR_SOAL_RAPAT);
  if (m2) {
    return {
      nomor: Number(m2[1]),
      teks: m2[2] ?? '',
    };
  }
  return null;
}

function adalahBarisKepalaAtauPetunjuk(
  barisTrim: string,
  sudahAdaSoalPg: boolean,
  adaSoalAktif: boolean
): boolean {
  if (!barisTrim) return false;
  if (REGEX_GARIS_KOSONG.test(barisTrim)) return true;
  if (REGEX_JAWAB_URAIAN.test(barisTrim)) return true;
  if (REGEX_KEPALA_ISIAN_TITIK.test(barisTrim)) return true;
  if (REGEX_BARIS_PETUNJUK.test(barisTrim)) return true;

  if (!sudahAdaSoalPg && !adaSoalAktif) {
    if (REGEX_KEPALA_METADATA.test(barisTrim)) return true;
    if (REGEX_KEPALA_JUDUL_UJIAN.test(barisTrim)) return true;
    if (
      barisTrim.length <= 80 &&
      barisTrim === barisTrim.toUpperCase() &&
      /[A-Z]{3,}/.test(barisTrim) &&
      !/[?]/.test(barisTrim) &&
      !cocokNomorSoal(barisTrim) &&
      !REGEX_PILIHAN.test(barisTrim)
    ) {
      return true;
    }
  }

  return false;
}

function pecahBarisPilihanSebaris(baris: string): string[] {
  const trim = baris.trim();
  if (!trim) return [baris];
  if (!REGEX_PILIHAN.test(trim)) return [baris];

  const terpecah = trim.split(/(?:[ \t]{2,}|\t)(?=(?:\*?\s*\(?[B-Db-d]\)?[.)]))/);
  if (terpecah.length >= 2 && terpecah.every((part) => REGEX_PILIHAN.test(part.trim()))) {
    return terpecah.map((part) => part.trim());
  }
  return [baris];
}

const REGEX_HEADER_BAGIAN_KUNCI =
  /^(?:(?:bagian|romawi|[IVXLCDM]+|[A-D])\s*[.)\-:]\s*)?(?:daftar\s+)?(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?)(?:\s+(?:pilihan\s+ganda|pg|soal))?(?:\s*[:=\-]\s*(.*))?$/i;

/**
 * Membaca blok daftar kunci di dokumen (bagian "Kunci Jawaban", "Kunci:", "Jawaban:",
 * tabel nomor-huruf, atau deretan huruf "1. B 2. C", "1-B", "BCAD...").
 */
function ekstrakDaftarKunciAkhir(teks: string): {
  teksTanpaDaftarKunci: string;
  petaKunciNomor: Map<number, number>;
} {
  const baris = normalisasiBarisMentah(teks).split('\n');
  const petaKunciNomor = new Map<number, number>();

  // 1. Cari header eksplisit bagian kunci setelah soal muncul (mis. di halaman akhir setelah PG atau Uraian)
  let sudahLihatPilihanAtauSoal = false;
  let indeksHeaderKunci = -1;

  for (let i = 0; i < baris.length; i += 1) {
    const b = baris[i].trim();
    if (!b) continue;

    if (REGEX_PILIHAN.test(b) || cocokNomorSoal(b)) {
      sudahLihatPilihanAtauSoal = true;
    }

    if (!sudahLihatPilihanAtauSoal) continue;

    const cocokHeader = b.match(REGEX_HEADER_BAGIAN_KUNCI);
    if (!cocokHeader) continue;

    const sisa = (cocokHeader[1] ?? '').trim();
    // Jika satu baris berbentuk "Kunci: B" / "Jawaban: B" (hanya 1 huruf), itu kunci per-soal (sumber 2), bukan bagian akhir!
    if (/^[A-Da-d1-4]$/.test(sisa)) {
      continue;
    }

    // Pastikan setelah baris header ini memang ada pasangan nomor-huruf atau deretan huruf kunci
    const sisaTeksSetelahHeader = [sisa, ...baris.slice(i + 1, Math.min(baris.length, i + 12))]
      .filter(Boolean)
      .join('\n');
    const cek = parseTeksKunci(sisaTeksSetelahHeader, 0);
    if (cek.daftarPasangan.length >= 1) {
      indeksHeaderKunci = i;
      break;
    }
  }

  if (indeksHeaderKunci >= 0) {
    const barisKunciPg: string[] = [];
    const headerMatch = baris[indeksHeaderKunci].trim().match(REGEX_HEADER_BAGIAN_KUNCI);
    if (headerMatch?.[1]?.trim()) {
      barisKunciPg.push(headerMatch[1].trim());
    }

    for (let j = indeksHeaderKunci + 1; j < baris.length; j += 1) {
      const bt = baris[j].trim();
      if (!bt) continue;
      // Jika di dalam bagian kunci masuk ke subbagian Uraian/Essay, hentikan pengambilan kunci PG
      const subBagian = deteksiJudulBagian(bt);
      if (subBagian && subBagian.tipe === 'lewati') {
        break;
      }
      if (/^(?:b\.|ii\.)?\s*(?:uraian|essay|esai|isian)\b/i.test(bt)) {
        break;
      }
      // Abaikan judul penutup atau nomor halaman umum
      if (/^(?:halaman\s*\d+|selamat\s+mengerjakan|semoga\s+sukses)/i.test(bt)) {
        continue;
      }
      barisKunciPg.push(bt);
    }

    const hasilKunci = parseTeksKunci(barisKunciPg.join('\n'), 0);
    for (const p of hasilKunci.daftarPasangan) {
      petaKunciNomor.set(p.nomor, p.kunci);
    }

    if (petaKunciNomor.size > 0) {
      return {
        teksTanpaDaftarKunci: baris.slice(0, indeksHeaderKunci).join('\n'),
        petaKunciNomor,
      };
    }
  }

  // 2. Cadangan: baris kunci di paling bawah dokumen tanpa header eksplisit
  let indeksMulaiKunci = -1;
  for (let i = baris.length - 1; i >= 0; i -= 1) {
    const b = baris[i].trim();
    if (!b) continue;

    if (/^(?:kunci\s*jawaban|daftar\s*kunci|kunci|jawaban)\s*[:\-]?$/i.test(b)) {
      indeksMulaiKunci = i;
      break;
    }

    const pasangan = [
      ...b.matchAll(/(?:^|[\s,;])(\d{1,3})\s*[.\-:)]\s*([A-Da-d])(?=$|[\s,;.)])/g),
    ];
    const sisa = b
      .replace(/(?:kunci(?:\s*jawaban)?\s*[:\-]?|jawaban\s*[:\-]?)/gi, '')
      .replace(/(\d{1,3})\s*[.\-:)]\s*([A-Da-d])/g, '')
      .replace(/[\s,;.\-]/g, '');

    if (pasangan.length >= 1 && sisa.length === 0) {
      indeksMulaiKunci = i;
      continue;
    }

    const bersihDeret = b.replace(/[\s,;.\-|]+/g, '').toUpperCase();
    if (/^[A-D]{2,}$/.test(bersihDeret)) {
      indeksMulaiKunci = i;
      continue;
    }

    break;
  }

  if (indeksMulaiKunci === -1) {
    return { teksTanpaDaftarKunci: teks, petaKunciNomor };
  }

  const bagianKunci = baris.slice(indeksMulaiKunci).join('\n');
  const hasilParse = parseTeksKunci(bagianKunci, 0);
  for (const p of hasilParse.daftarPasangan) {
    petaKunciNomor.set(p.nomor, p.kunci);
  }

  if (petaKunciNomor.size === 0) {
    return { teksTanpaDaftarKunci: teks, petaKunciNomor };
  }

  return {
    teksTanpaDaftarKunci: baris.slice(0, indeksMulaiKunci).join('\n'),
    petaKunciNomor,
  };
}

interface AkumulatorSoal {
  nomorSoal?: number;
  barisPertanyaan: string[];
  barisKode: string[];
  pilihan: string[];
  kunciMentah?: string;
  kunciDariTandaSet: Set<number>;
  mengandungMediaDokumen?: boolean;
  barisPenjelasan: string[];
  tingkat?: TingkatSoal;
  topik?: string;
  bonus?: boolean;
  sedangDiField: 'pertanyaan' | 'pilihan' | 'penjelasan';
  dideteksiDariParagraf?: boolean;
}

function buatAkumulatorKosong(): AkumulatorSoal {
  return {
    barisPertanyaan: [],
    barisKode: [],
    pilihan: [],
    kunciDariTandaSet: new Set<number>(),
    barisPenjelasan: [],
    sedangDiField: 'pertanyaan',
  };
}

function ekstrakFallbackParagraf(barisPg: string[]): AkumulatorSoal[] {
  const bersihList = barisPg.map((b) => normalisasiTeksBiasa(b)).filter(Boolean);
  if (bersihList.length < 3) return [];

  const hasil: AkumulatorSoal[] = [];
  let i = 0;

  while (i < bersihList.length) {
    const kandidatSoal = bersihList[i];
    const adalahPertanyaanTampak =
      /[?…:.]$/.test(kandidatSoal) || kandidatSoal.length >= 24;

    if (!adalahPertanyaanTampak) {
      i += 1;
      continue;
    }

    const opsiKandidat: string[] = [];
    let j = i + 1;
    while (j < bersihList.length && opsiKandidat.length < 5) {
      const barisCalon = bersihList[j];
      if (/[?]$/.test(barisCalon) || barisCalon.length > 140) {
        break;
      }
      if (opsiKandidat.length >= 2 && /\.{3,}$/.test(barisCalon)) {
        break;
      }
      const { teks, ditandaiBenar } = bersihkanPenandaPilihan(barisCalon);
      if (!teks) break;
      opsiKandidat.push(ditandaiBenar ? `${teks} ${PENANDA_TEKS_BENAR}` : teks);
      j += 1;
    }

    if (opsiKandidat.length >= 2 && opsiKandidat.length <= 5) {
      const ak = buatAkumulatorKosong();
      ak.dideteksiDariParagraf = true;
      ak.barisPertanyaan.push(kandidatSoal);
      for (const op of opsiKandidat.slice(0, 4)) {
        const { teks, ditandaiBenar } = bersihkanPenandaPilihan(op);
        if (ditandaiBenar) {
          ak.kunciDariTandaSet.add(ak.pilihan.length);
        }
        ak.pilihan.push(teks);
      }
      hasil.push(ak);
      i = j;
    } else {
      i += 1;
    }
  }

  return hasil;
}

function selesaikanKunciDanSumber(params: {
  kunciBagian: number | null;
  kunciBaris: number | null;
  kunciPenanda: number | null;
}): {
  kunci: number | null;
  sumberKunci?: SumberKunciSoal;
  detailSumberKunci?: string;
  kunciBertentangan?: KandidatKunciBertentangan[];
  kunciTerdeteksiOtomatis?: boolean;
} {
  const kandidat: KandidatKunciBertentangan[] = [];

  if (params.kunciBagian !== null) {
    kandidat.push({
      kunci: params.kunciBagian,
      sumber: 'bagian_kunci',
      keterangan: `${LABEL_SUMBER_KUNCI.bagian_kunci}: ${String.fromCharCode(65 + params.kunciBagian)}`,
    });
  }
  if (params.kunciBaris !== null) {
    kandidat.push({
      kunci: params.kunciBaris,
      sumber: 'baris_jawaban',
      keterangan: `${LABEL_SUMBER_KUNCI.baris_jawaban}: ${String.fromCharCode(65 + params.kunciBaris)}`,
    });
  }
  if (params.kunciPenanda !== null) {
    kandidat.push({
      kunci: params.kunciPenanda,
      sumber: 'penanda_pilihan',
      keterangan: `${LABEL_SUMBER_KUNCI.penanda_pilihan}: ${String.fromCharCode(65 + params.kunciPenanda)}`,
    });
  }

  if (kandidat.length === 0) {
    return { kunci: null };
  }

  const nilaiUnik = new Set(kandidat.map((k) => k.kunci));
  if (nilaiUnik.size > 1) {
    // Dua sumber bertentangan: jangan memilih diam-diam!
    return {
      kunci: null,
      kunciBertentangan: kandidat,
    };
  }

  // Semua sumber sepakat (atau hanya satu sumber); ambil sumber prioritas tertinggi (1 > 2 > 3)
  const utama = kandidat[0];
  return {
    kunci: utama.kunci,
    sumberKunci: utama.sumber,
    detailSumberKunci: LABEL_SUMBER_KUNCI[utama.sumber],
    kunciTerdeteksiOtomatis: true,
  };
}

export function parseTeksSoal(
  teksMentah: string,
  sumber: SumberImpor = 'teks',
  peringatanTambahan: string[] = []
): HasilValidasiDraft {
  const barisMentahSemua = normalisasiBarisMentah(teksMentah)
    .split('\n')
    .map((b) =>
      b.replaceAll(PENANDA_TEKS_BENAR, '').replaceAll(PENANDA_ADA_MEDIA, '').trim()
    )
    .filter((b) => b.length > 0);

  const { teksTanpaDaftarKunci, petaKunciNomor } = ekstrakDaftarKunciAkhir(teksMentah);
  const barisAwal = normalisasiBarisMentah(teksTanpaDaftarKunci).split('\n');
  const barisList: string[] = [];
  for (const b of barisAwal) {
    for (const sub of pecahBarisPilihanSebaris(b)) {
      barisList.push(sub);
    }
  }

  const hasilAkumulator: AkumulatorSoal[] = [];
  let aktif: AkumulatorSoal | null = null;
  let dalamBlokBacktick = false;
  let bagianSaatIni: 'belum_ditentukan' | 'pg' | 'lewati' = 'belum_ditentukan';
  let sudahAdaSoalPg = false;

  const bagianLewatiUrutan: string[] = [];
  const hitunganBagianLewati = new Map<string, number>();
  let bagianLewatiAktif = 'URAIAN';
  let dalamItemLewati = false;

  const barisKandidatFallback: string[] = [];

  const catatBagianLewati = (label: string) => {
    if (!hitunganBagianLewati.has(label)) {
      hitunganBagianLewati.set(label, 0);
      bagianLewatiUrutan.push(label);
    }
    bagianLewatiAktif = label;
    dalamItemLewati = false;
  };

  const selesaikanAktif = () => {
    if (!aktif) return;
    if (
      aktif.barisPertanyaan.length > 0 ||
      aktif.pilihan.length > 0 ||
      aktif.barisKode.length > 0
    ) {
      hasilAkumulator.push(aktif);
      sudahAdaSoalPg = true;
    }
    aktif = null;
  };

  for (let i = 0; i < barisList.length; i += 1) {
    let barisAsli = barisList[i];
    const adaPenandaMedia = barisAsli.includes(PENANDA_ADA_MEDIA);
    if (adaPenandaMedia) {
      barisAsli = barisAsli.replaceAll(PENANDA_ADA_MEDIA, '').trim();
    }
    const barisTrim = barisAsli.trim();

    if (barisTrim.startsWith('```') && bagianSaatIni !== 'lewati') {
      if (!aktif) {
        aktif = buatAkumulatorKosong();
      }
      dalamBlokBacktick = !dalamBlokBacktick;
      continue;
    }

    if (dalamBlokBacktick) {
      if (!aktif) {
        aktif = buatAkumulatorKosong();
      }
      aktif.barisKode.push(barisAsli);
      continue;
    }

    if (!barisTrim) {
      if (bagianSaatIni === 'lewati') {
        dalamItemLewati = false;
      }
      continue;
    }

    // 1. Deteksi judul bagian (PILIHAN GANDA vs URAIAN/ESSAY/ISIAN/MENJODOHKAN/BENAR SALAH)
    const infoBagian = deteksiJudulBagian(barisTrim);
    if (infoBagian) {
      if (infoBagian.tipe === 'pg') {
        selesaikanAktif();
        bagianSaatIni = 'pg';
        continue;
      } else {
        selesaikanAktif();
        bagianSaatIni = 'lewati';
        catatBagianLewati(infoBagian.label);
        continue;
      }
    }

    // 2. Jika sedang di bagian yang dilewati (URAIAN, ESSAY, ISIAN, dll.)
    if (bagianSaatIni === 'lewati') {
      if (REGEX_BARIS_PETUNJUK.test(barisTrim) || REGEX_GARIS_KOSONG.test(barisTrim)) {
        continue;
      }
      if (REGEX_JAWAB_URAIAN.test(barisTrim)) {
        dalamItemLewati = false;
        continue;
      }
      const cocokNoUraian = cocokNomorSoal(barisAsli);
      if (cocokNoUraian) {
        hitunganBagianLewati.set(
          bagianLewatiAktif,
          (hitunganBagianLewati.get(bagianLewatiAktif) ?? 0) + 1
        );
        dalamItemLewati = true;
        continue;
      }
      if (!dalamItemLewati) {
        hitunganBagianLewati.set(
          bagianLewatiAktif,
          (hitunganBagianLewati.get(bagianLewatiAktif) ?? 0) + 1
        );
        dalamItemLewati = true;
      }
      continue;
    }

    // 3. Abaikan kepala dokumen, petunjuk pengerjaan, dan baris "Jawab: ....."
    if (adalahBarisKepalaAtauPetunjuk(barisTrim, sudahAdaSoalPg, Boolean(aktif))) {
      continue;
    }

    // Baris berindentasi 4 spasi atau tab saat masih di pertanyaan -> simpan sebagai blok kode
    if (
      aktif &&
      aktif.sedangDiField === 'pertanyaan' &&
      /^(?: {4}|\t)/.test(barisAsli) &&
      barisTrim.length > 0 &&
      !REGEX_PILIHAN.test(barisAsli) &&
      !cocokNomorSoal(barisAsli)
    ) {
      aktif.barisKode.push(barisAsli.replace(/^(?: {4}|\t)/, ''));
      continue;
    }

    barisKandidatFallback.push(barisTrim);

    // 4. Cek nomor soal baru
    const cocokNo = cocokNomorSoal(barisAsli);
    if (cocokNo) {
      selesaikanAktif();
      aktif = buatAkumulatorKosong();
      aktif.nomorSoal = cocokNo.nomor;
      if (adaPenandaMedia) aktif.mengandungMediaDokumen = true;
      if (bagianSaatIni === 'belum_ditentukan') {
        bagianSaatIni = 'pg';
      }
      if (cocokNo.teks.trim()) {
        aktif.barisPertanyaan.push(normalisasiTeksBiasa(cocokNo.teks));
      }
      continue;
    }

    // 5. Cek metadata soal (HANYA bila soal aktif sudah punya pertanyaan!)
    if (aktif && aktif.barisPertanyaan.length > 0) {
      const cocokKunci = barisAsli.match(REGEX_KUNCI_BARIS);
      if (cocokKunci) {
        aktif.kunciMentah = cocokKunci[1].trim();
        continue;
      }

      const cocokPenjelasan = barisAsli.match(REGEX_PENJELASAN);
      if (cocokPenjelasan) {
        if (cocokPenjelasan[1]?.trim()) {
          aktif.barisPenjelasan.push(normalisasiTeksBiasa(cocokPenjelasan[1]));
        }
        aktif.sedangDiField = 'penjelasan';
        continue;
      }

      const cocokTingkat = barisAsli.match(REGEX_TINGKAT);
      if (cocokTingkat) {
        aktif.tingkat = parseTingkat(cocokTingkat[1]);
        continue;
      }

      const cocokTopik = barisAsli.match(REGEX_TOPIK);
      if (cocokTopik) {
        aktif.topik = normalisasiTeksBiasa(cocokTopik[1]);
        continue;
      }

      const cocokBonus = barisAsli.match(REGEX_BONUS);
      if (cocokBonus) {
        aktif.bonus = parseBonus(cocokBonus[1]);
        continue;
      }
    }

    if (!aktif) {
      aktif = buatAkumulatorKosong();
    }
    if (adaPenandaMedia) {
      aktif.mengandungMediaDokumen = true;
    }

    // 6. Cek pilihan A-D
    const cocokPilihan = barisAsli.match(REGEX_PILIHAN);
    if (cocokPilihan && aktif.barisPertanyaan.length > 0) {
      const huruf = (cocokPilihan[1] || cocokPilihan[2] || cocokPilihan[3] || '').toUpperCase();
      const indeksPilihan = huruf ? huruf.charCodeAt(0) - 65 : aktif.pilihan.length;
      const prefixCocok = barisAsli.slice(0, barisAsli.length - cocokPilihan[4].length);
      const awalanBintang = /\*/.test(prefixCocok);
      const { teks, ditandaiBenar } = bersihkanPenandaPilihan(cocokPilihan[4]);

      while (aktif.pilihan.length < indeksPilihan) {
        aktif.pilihan.push('');
      }
      aktif.pilihan[indeksPilihan] = teks;
      if (awalanBintang || ditandaiBenar) {
        aktif.kunciDariTandaSet.add(indeksPilihan);
      }
      aktif.sedangDiField = 'pilihan';
      continue;
    }

    // 7. Baris lanjutan untuk field yang sedang aktif
    if (aktif.sedangDiField === 'pilihan' && aktif.pilihan.length > 0) {
      const idxTerakhir = aktif.pilihan.length - 1;
      const { teks, ditandaiBenar } = bersihkanPenandaPilihan(barisTrim);
      aktif.pilihan[idxTerakhir] = normalisasiTeksBiasa(`${aktif.pilihan[idxTerakhir]} ${teks}`);
      if (ditandaiBenar) {
        aktif.kunciDariTandaSet.add(idxTerakhir);
      }
    } else if (aktif.sedangDiField === 'penjelasan') {
      aktif.barisPenjelasan.push(normalisasiTeksBiasa(barisTrim));
    } else {
      aktif.barisPertanyaan.push(normalisasiTeksBiasa(barisTrim));
    }
  }

  selesaikanAktif();

  const perluCobaFallbackParagraf =
    hasilAkumulator.length === 0 ||
    (hasilAkumulator.length === 1 &&
      hasilAkumulator[0].nomorSoal === undefined &&
      hasilAkumulator[0].pilihan.length === 0 &&
      barisKandidatFallback.length >= 3);

  let sumberAkhirAkumulator = hasilAkumulator;
  if (perluCobaFallbackParagraf) {
    const hasilFallback = ekstrakFallbackParagraf(barisKandidatFallback);
    if (hasilFallback.length >= 1) {
      sumberAkhirAkumulator = hasilFallback;
    }
  }

  const catatanBagian: string[] = [];
  for (const label of bagianLewatiUrutan) {
    const jml = hitunganBagianLewati.get(label) ?? 0;
    catatanBagian.push(`Bagian ${label} dilewati: ${jml} soal (tidak didukung)`);
  }

  const daftarDraft: DraftSoal[] = sumberAkhirAkumulator.map((item, idx) => {
    const pertanyaan = normalisasiTeksBiasa(item.barisPertanyaan.join(' '));
    const pilihan = item.pilihan.slice(0, 4);

    // Kumpulkan kunci dari semua sumber (1: Bagian kunci, 2: Baris jawaban, 3: Penanda pilihan)
    const kunciBagianRaw =
      item.nomorSoal !== undefined && petaKunciNomor.has(item.nomorSoal)
        ? petaKunciNomor.get(item.nomorSoal) ?? null
        : petaKunciNomor.has(idx + 1)
          ? petaKunciNomor.get(idx + 1) ?? null
          : null;
    const kunciBagian =
      kunciBagianRaw !== null && kunciBagianRaw >= 0 && kunciBagianRaw < pilihan.length
        ? kunciBagianRaw
        : kunciBagianRaw !== null && pilihan.length === 0
          ? kunciBagianRaw
          : null;

    const kunciBaris = item.kunciMentah
      ? terjemahkanKunci(item.kunciMentah, pilihan)
      : null;

    // Jika hanya SATU pilihan di soal yang ditandai sendiri -> jadikan kandidat kunci
    const daftarTanda = Array.from(item.kunciDariTandaSet).filter(
      (idxTanda) => idxTanda >= 0 && idxTanda < pilihan.length
    );
    const kunciPenanda = daftarTanda.length === 1 ? daftarTanda[0] : null;

    const hasilKunci = selesaikanKunciDanSumber({
      kunciBagian,
      kunciBaris,
      kunciPenanda,
    });

    const kode = item.barisKode.length > 0 ? item.barisKode.join('\n') : undefined;
    const penjelasan =
      item.barisPenjelasan.length > 0
        ? normalisasiTeksBiasa(item.barisPenjelasan.join(' '))
        : undefined;

    return {
      id: buatId('soal'),
      pertanyaan,
      ...(kode !== undefined ? { kode } : {}),
      pilihan,
      kunci: hasilKunci.kunci,
      ...(hasilKunci.sumberKunci ? { sumberKunci: hasilKunci.sumberKunci } : {}),
      ...(hasilKunci.detailSumberKunci
        ? { detailSumberKunci: hasilKunci.detailSumberKunci }
        : {}),
      ...(hasilKunci.kunciBertentangan
        ? { kunciBertentangan: hasilKunci.kunciBertentangan }
        : {}),
      ...(hasilKunci.kunciTerdeteksiOtomatis ? { kunciTerdeteksiOtomatis: true } : {}),
      ...(item.mengandungMediaDokumen ? { mengandungMediaDokumen: true } : {}),
      ...(penjelasan !== undefined ? { penjelasan } : {}),
      ...(item.tingkat !== undefined ? { tingkat: item.tingkat } : {}),
      ...(item.topik ? { topik: item.topik } : {}),
      ...(item.bonus ? { bonus: true } : {}),
      sumber,
      nomorAsli: item.nomorSoal ?? null,
      tanpaNomorJelas: item.nomorSoal === undefined,
      ...(item.dideteksiDariParagraf ? { dideteksiDariParagraf: true } : {}),
      masalah: [],
      peringatanDetail: [],
    };
  });

  const semuaPeringatan = [...peringatanTambahan, ...catatanBagian];

  return validasiDaftarDraftSoal(daftarDraft, semuaPeringatan, {
    teksMentah,
    barisMentah: barisMentahSemua,
    catatanBagian,
    jenisDokumen: sumber,
  });
}

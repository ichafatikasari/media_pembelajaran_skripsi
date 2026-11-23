import { Soal, TingkatSoal } from '../data/types';
import { acakFisherYates } from '../utils/shuffle';
import { buatId } from '../utils/id';
import { normalisasiTeksBiasa } from './normalizer';

export type SumberImpor = 'manual' | 'teks' | 'docx' | 'xlsx' | 'pdf';

export type SumberKunciSoal =
  | 'bagian_kunci'
  | 'baris_jawaban'
  | 'penanda_pilihan'
  | 'manual';

export interface KandidatKunciBertentangan {
  kunci: number;
  sumber: SumberKunciSoal;
  keterangan: string;
}

export interface PasanganSoalMirip {
  nomor: number; // 1-based
  id: string;
  persen: number;
}

export type KodeMasalahSoal =
  | 'soal_kosong'
  | 'kunci_tidak_ditemukan'
  | 'kunci_bertentangan'
  | 'kunci_tidak_cocok'
  | 'pilihan_kurang'
  | 'pilihan_kosong'
  | 'pilihan_kembar'
  | 'soal_kembar'
  | 'teks_terpotong'
  | 'tanpa_nomor'
  | 'teks_terlalu_panjang'
  | 'dideteksi_paragraf'
  | 'pilihan_rawan'
  | 'pilihan_terlalu_panjang_timpang'
  | 'tanda_baca_soal'
  | 'soal_terlalu_pendek'
  | 'soal_terlalu_panjang'
  | 'format_kurang_rapi'
  | 'cek_manual_media';

export type TingkatKeyakinanSoal = 'yakin' | 'perlu_dicek' | 'bermasalah';

export interface DraftSoal {
  id: string;
  pertanyaan: string;
  kode?: string;
  pilihan: string[];
  kunci: number | null;
  penjelasan?: string;
  tingkat?: TingkatSoal;
  topik?: string;
  bonus?: boolean;
  cadangan?: boolean;
  sumber: SumberImpor;
  sumberKunci?: SumberKunciSoal;
  detailSumberKunci?: string;
  kunciBertentangan?: KandidatKunciBertentangan[];
  kunciTerdeteksiOtomatis?: boolean;
  kunciDiterima?: boolean;
  mengandungMediaDokumen?: boolean;
  pasanganMirip?: PasanganSoalMirip[];
  nomorAsli?: number | null;
  tanpaNomorJelas?: boolean;
  dideteksiDariParagraf?: boolean;
  keyakinan?: TingkatKeyakinanSoal;
  alasanKeyakinan?: string[];
  masalah: KodeMasalahSoal[];
  peringatanDetail: string[];
}

export type ModeKolomPdf = 'otomatis' | '1kolom' | '2kolom';

export interface InfoKolomPdf {
  mode: ModeKolomPdf;
  terdeteksiDuaKolom: boolean;
  keterangan: string;
}

export interface HasilValidasiDraft {
  daftar: DraftSoal[];
  totalSoal: number;
  jumlahBermasalah: number;
  peringatanUmum: string[];
  teksMentah?: string;
  barisMentah?: string[];
  catatanBagian?: string[];
  indikasiGagalBacaBesar?: boolean;
  peringatanKritis?: string;
  jenisDokumen?: SumberImpor;
  infoKolomPdf?: InfoKolomPdf;
}

export const PESAN_PERINGATAN_GAGAL_BACA_BESAR =
  'Dokumen kemungkinan tidak terbaca dengan benar. Gunakan Penanda Baris atau perbaiki format dokumen.';

export const BATAS_KARAKTER_SOAL_WAJAR = 800;
export const BATAS_KARAKTER_PILIHAN_WAJAR = 300;

export const LABEL_SUMBER_KUNCI: Record<SumberKunciSoal, string> = {
  bagian_kunci: 'Bagian kunci',
  baris_jawaban: 'Baris jawaban',
  penanda_pilihan: 'Penanda pilihan',
  manual: 'Diisi guru',
};

const LABEL_MASALAH: Record<KodeMasalahSoal, string> = {
  soal_kosong: 'Teks soal kosong',
  kunci_tidak_ditemukan: 'Kunci belum ada',
  kunci_bertentangan: 'Kunci bertentangan antar sumber',
  kunci_tidak_cocok: 'Kunci menunjuk pilihan yang tidak ada',
  pilihan_kurang: 'Pilihan jawaban kurang dari 2',
  pilihan_kosong: 'Ada pilihan jawaban yang kosong',
  pilihan_kembar: 'Ada dua pilihan jawaban yang persis sama',
  soal_kembar: 'Soal ganda / mirip (>90%) dengan soal lain',
  teks_terpotong: 'Teks soal atau pilihan tampak terpotong mencurigakan',
  tanpa_nomor: 'Soal tidak memiliki nomor yang jelas',
  teks_terlalu_panjang:
    'Teks soal (>800 karakter) atau pilihan (>300 karakter) terlalu panjang dan mencurigakan',
  dideteksi_paragraf:
    'Disusun dari urutan paragraf tanpa nomor otomatis — mohon periksa kembali',
  pilihan_rawan:
    'Pilihan rawan ("Semua benar/salah" atau "A dan B benar") — hati-hati jika pilihan diacak',
  pilihan_terlalu_panjang_timpang:
    'Salah satu pilihan jauh lebih panjang dari yang lain (mudah ditebak)',
  tanda_baca_soal: 'Teks soal belum diakhiri tanda tanya (?) atau titik (./...)',
  soal_terlalu_pendek: 'Teks soal terlalu pendek (<15 karakter)',
  soal_terlalu_panjang: 'Teks soal terlalu panjang (>200 karakter)',
  format_kurang_rapi:
    'Format teks kurang rapi (spasi ganda, awalan tersisa, atau huruf awal kecil)',
  cek_manual_media: 'Cek manual: soal merujuk gambar/tabel/kode yang mungkin tidak terbaca',
};

export function teksTerpotongMencurigakan(teks: string, apakahPertanyaan = true): boolean {
  const bersih = teks.trim();
  if (!bersih) {
    return true;
  }
  if (/\[\.{3}\]|\(\.{3}\)$/.test(bersih)) {
    return true;
  }
  if (/[,;(]$/.test(bersih)) {
    return true;
  }
  if (apakahPertanyaan) {
    if (bersih.length < 8 && !/[?=]$/.test(bersih)) {
      return true;
    }
  } else {
    if (bersih === '...' || bersih === '-' || bersih === '.') {
      return true;
    }
  }
  return false;
}

export function cekIndikasiGagalBacaBesar(
  daftar: readonly DraftSoal[],
  sumberDokumen?: SumberImpor
): { gagalBesar: boolean; alasan: string[] } {
  if (daftar.length === 0) {
    return { gagalBesar: false, alasan: [] };
  }

  const alasan: string[] = [];
  const sumberUtama = sumberDokumen ?? daftar[0]?.sumber;

  if (
    daftar.length === 1 &&
    (sumberUtama === 'docx' || sumberUtama === 'pdf' || sumberUtama === 'teks')
  ) {
    alasan.push('Hanya 1 soal yang terbaca dari dokumen.');
  }

  const adaSoalKepanjangan = daftar.some(
    (item) => item.pertanyaan.trim().length > BATAS_KARAKTER_SOAL_WAJAR
  );
  if (adaSoalKepanjangan) {
    alasan.push(
      `Ada soal yang teksnya melebihi ${BATAS_KARAKTER_SOAL_WAJAR} karakter.`
    );
  }

  const adaPilihanKepanjangan = daftar.some((item) =>
    item.pilihan.some((p) => p.trim().length > BATAS_KARAKTER_PILIHAN_WAJAR)
  );
  if (adaPilihanKepanjangan) {
    alasan.push(
      `Ada pilihan jawaban yang melebihi ${BATAS_KARAKTER_PILIHAN_WAJAR} karakter.`
    );
  }

  return {
    gagalBesar: alasan.length > 0,
    alasan,
  };
}

function jarakLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    const chA = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j += 1) {
      const cost = chA === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

function normalisasiUntukBanding(teks: string): string {
  return normalisasiTeksBiasa(teks)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hitungKemiripanTeks(a: string, b: string): number {
  const na = normalisasiUntukBanding(a);
  const nb = normalisasiUntukBanding(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const maks = Math.max(na.length, nb.length);
  const min = Math.min(na.length, nb.length);
  if (min / maks < 0.8) return 0;

  // Jika perbedaan HANYA terletak pada angka (mis. "soal ke-1" vs "soal ke-2" atau "5 + 3" vs "5 + 4"),
  // anggap sebagai variasi angka yang disengaja, bukan soal duplikat.
  const polaA = na.replace(/\d+/g, '#');
  const polaB = nb.replace(/\d+/g, '#');
  if (polaA === polaB && na !== nb) {
    return 0;
  }

  const dist = jarakLevenshtein(na, nb);
  return Math.max(0, 1 - dist / maks);
}

export function deteksiMasalahKerapianSoal(item: Pick<DraftSoal, 'pertanyaan' | 'pilihan' | 'kode'>): string[] {
  const alasan: string[] = [];
  const teksTanya = item.pertanyaan ?? '';
  const semuaTeks = [teksTanya, ...item.pilihan];

  if (semuaTeks.some((t) => / {2,}/.test(t))) {
    alasan.push('Spasi ganda');
  }
  // Spasi sebelum tanda baca (?, ; : ! ) atau titik tunggal, tetapi izinkan "adalah ..."
  if (semuaTeks.some((t) => /\s+(?:[?,;:!)]|\.(?!\.))/.test(t))) {
    alasan.push('Spasi sebelum tanda baca');
  }
  if (/^\s*[a-z]/.test(teksTanya) && !item.kode) {
    alasan.push('Huruf awal kalimat kecil');
  }
  if (
    item.pilihan.some((p) =>
      /^\s*(?:\(?[A-Da-d]\s*[.)]|\([A-Da-d]\))\s+\S/.test(p)
    )
  ) {
    alasan.push('Awalan huruf (A./a)) tersisa di pilihan');
  }
  if (
    /^\s*(?:(?:no\.?|soal)\s*\d{1,3}\s*[.)\-:]?|\d{1,3}\s*[.)\-:])\s+\S/i.test(
      teksTanya
    )
  ) {
    alasan.push('Nomor tersisa di teks soal');
  }

  return alasan;
}

const REGEX_PILIHAN_RAWAN =
  /\b(?:semua(?:\s+jawaban)?\s+(?:benar|salah)|tidak\s+ada\s+(?:yang|jawaban)\s+benar|(?:jawaban\s+)?[a-d]\s*(?:dan|&|,)\s*[a-d]\s+(?:benar|salah)|benar\s+semua|salah\s+semua)\b/i;

const REGEX_MEDIA_TIDAK_TERBACA =
  /\b(?:perhatikan\s+(?:gambar|tabel|grafik|bagan|diagram|foto|skema|ilustrasi)|berdasarkan\s+(?:gambar|tabel|grafik|diagram)|gambar\s+(?:di\s+)?(?:bawah|samping|atas|berikut)|tabel\s+(?:di\s+)?(?:bawah|atas|berikut)|\[image\]|\[gambar\]|\[tabel\])\b/i;

export function cekPilihanJauhLebihPanjang(pilihan: readonly string[]): boolean {
  const terisi = pilihan.map((p) => p.trim()).filter((p) => p.length > 0);
  if (terisi.length < 2) return false;
  const panjangList = terisi.map((p) => p.length).sort((a, b) => b - a);
  const terpanjang = panjangList[0];
  const keduaTerpanjang = panjangList[1];
  const rataLain =
    panjangList.slice(1).reduce((acc, n) => acc + n, 0) /
    Math.max(1, panjangList.length - 1);
  return terpanjang >= rataLain * 2.2 && terpanjang - keduaTerpanjang >= 20;
}

export function cekSoalTampakSederhanaDanLengkap(
  pertanyaan: string
): { tandaBacaKurang: boolean; terlaluPendek: boolean; terlaluPanjang: boolean } {
  const trim = pertanyaan.trim();
  if (!trim) {
    return { tandaBacaKurang: false, terlaluPendek: false, terlaluPanjang: false };
  }
  const akhiranSah = /[?.!:\u2026]$|\.{2,}$/.test(trim);
  return {
    tandaBacaKurang: !akhiranSah,
    terlaluPendek: trim.length < 15,
    terlaluPanjang: trim.length > 200 && trim.length <= BATAS_KARAKTER_SOAL_WAJAR,
  };
}

export function validasiDaftarDraftSoal(
  daftarAwal: readonly DraftSoal[],
  peringatanAwal: string[] = [],
  metaTambahan?: {
    teksMentah?: string;
    barisMentah?: string[];
    catatanBagian?: string[];
    jenisDokumen?: SumberImpor;
  }
): HasilValidasiDraft {
  // Hitung kemiripan antar soal (>90%)
  const miripMap = new Map<number, PasanganSoalMirip[]>();
  for (let i = 0; i < daftarAwal.length; i += 1) {
    const teksI = daftarAwal[i].pertanyaan.trim();
    if (!teksI) continue;
    for (let j = i + 1; j < daftarAwal.length; j += 1) {
      const teksJ = daftarAwal[j].pertanyaan.trim();
      if (!teksJ) continue;
      const sim = hitungKemiripanTeks(teksI, teksJ);
      if (sim > 0.9) {
        const persen = Math.min(100, Math.round(sim * 100));
        const listI = miripMap.get(i) ?? [];
        listI.push({ nomor: j + 1, id: daftarAwal[j].id, persen });
        miripMap.set(i, listI);

        const listJ = miripMap.get(j) ?? [];
        listJ.push({ nomor: i + 1, id: daftarAwal[i].id, persen });
        miripMap.set(j, listJ);
      }
    }
  }

  let jumlahBermasalah = 0;

  const daftarTervalidasi: DraftSoal[] = daftarAwal.map((item, idx) => {
    const masalah: KodeMasalahSoal[] = [];
    const teksPertanyaanTrim = item.pertanyaan.trim();
    const pilihanBersih = item.pilihan.map((p) => p.trim());
    const pilihanTerisi = pilihanBersih.filter((p) => p.length > 0);
    const adaPilihanKosong = pilihanBersih.some((p) => p.length === 0);

    // 1. ATURAN MERAH (wajib diperbaiki sebelum ikut game)
    if (!teksPertanyaanTrim) {
      masalah.push('soal_kosong');
    }

    if (pilihanTerisi.length < 2) {
      masalah.push('pilihan_kurang');
    }

    if (adaPilihanKosong) {
      masalah.push('pilihan_kosong');
    }

    const setPilihan = new Set<string>();
    let adaKembar = false;
    for (const p of pilihanTerisi) {
      const norm = p.toLowerCase();
      if (setPilihan.has(norm)) {
        adaKembar = true;
        break;
      }
      setPilihan.add(norm);
    }
    if (adaKembar) {
      masalah.push('pilihan_kembar');
    }

    const adaKonflikKunci =
      Array.isArray(item.kunciBertentangan) && item.kunciBertentangan.length >= 2;

    if (adaKonflikKunci) {
      masalah.push('kunci_bertentangan');
    } else if (
      item.kunci === null ||
      item.kunci === undefined ||
      Number.isNaN(item.kunci)
    ) {
      masalah.push('kunci_tidak_ditemukan');
    } else if (
      item.kunci < 0 ||
      item.kunci >= pilihanBersih.length ||
      !pilihanBersih[item.kunci]
    ) {
      masalah.push('kunci_tidak_cocok');
    }

    if (
      teksPertanyaanTrim.length > BATAS_KARAKTER_SOAL_WAJAR ||
      pilihanBersih.some((p) => p.length > BATAS_KARAKTER_PILIHAN_WAJAR)
    ) {
      masalah.push('teks_terlalu_panjang');
    }

    if (item.dideteksiDariParagraf) {
      masalah.push('dideteksi_paragraf');
    } else if (
      item.tanpaNomorJelas &&
      (item.sumber === 'docx' || item.sumber === 'pdf' || item.sumber === 'teks')
    ) {
      masalah.push('tanpa_nomor');
    }

    // 2. ATURAN KUNING (sebaiknya dicek)
    const pasanganMirip = miripMap.get(idx) ?? [];
    if (pasanganMirip.length > 0) {
      masalah.push('soal_kembar');
    }

    if (pilihanTerisi.some((p) => REGEX_PILIHAN_RAWAN.test(p))) {
      masalah.push('pilihan_rawan');
    }

    if (cekPilihanJauhLebihPanjang(pilihanBersih)) {
      masalah.push('pilihan_terlalu_panjang_timpang');
    }

    const cekPanjangTandaBaca = cekSoalTampakSederhanaDanLengkap(teksPertanyaanTrim);
    if (cekPanjangTandaBaca.tandaBacaKurang) {
      masalah.push('tanda_baca_soal');
    }
    if (cekPanjangTandaBaca.terlaluPendek) {
      masalah.push('soal_terlalu_pendek');
    }
    if (cekPanjangTandaBaca.terlaluPanjang) {
      masalah.push('soal_terlalu_panjang');
    }

    const detailKerapian = deteksiMasalahKerapianSoal(item);
    if (detailKerapian.length > 0) {
      masalah.push('format_kurang_rapi');
    }

    if (
      item.mengandungMediaDokumen ||
      REGEX_MEDIA_TIDAK_TERBACA.test(teksPertanyaanTrim)
    ) {
      masalah.push('cek_manual_media');
    }

    const soalTerpotong =
      (teksPertanyaanTrim.length > 0 && teksTerpotongMencurigakan(item.pertanyaan, true)) ||
      pilihanTerisi.some((p) => teksTerpotongMencurigakan(p, false));
    if (soalTerpotong) {
      masalah.push('teks_terpotong');
    }

    const masalahKritis = masalah.some(
      (m) =>
        m === 'soal_kosong' ||
        m === 'pilihan_kurang' ||
        m === 'pilihan_kosong' ||
        m === 'pilihan_kembar' ||
        m === 'kunci_tidak_ditemukan' ||
        m === 'kunci_bertentangan' ||
        m === 'kunci_tidak_cocok' ||
        m === 'tanpa_nomor' ||
        m === 'teks_terlalu_panjang'
    );

    let keyakinan: TingkatKeyakinanSoal = 'yakin';
    if (masalahKritis || !teksPertanyaanTrim) {
      keyakinan = 'bermasalah';
    } else if (masalah.length > 0) {
      keyakinan = 'perlu_dicek';
    }

    if (masalah.length > 0) {
      jumlahBermasalah += 1;
    }

    const peringatanDetail = masalah.map((kode) => {
      if (kode === 'soal_kembar' && pasanganMirip.length > 0) {
        const labelPasangan = pasanganMirip
          .slice(0, 2)
          .map((p) => `#${p.nomor} (${p.persen}%)`)
          .join(', ');
        return `Mirip dengan Soal ${labelPasangan}`;
      }
      if (kode === 'format_kurang_rapi' && detailKerapian.length > 0) {
        return `Bisa dirapikan: ${detailKerapian.join(', ')}`;
      }
      if (kode === 'kunci_bertentangan' && item.kunciBertentangan?.length) {
        const ringkas = item.kunciBertentangan.map((k) => k.keterangan).join(' vs ');
        return `Kunci bertentangan (${ringkas})`;
      }
      return LABEL_MASALAH[kode];
    });

    const alasanKeyakinan =
      peringatanDetail.length > 0
        ? peringatanDetail
        : ['Nomor, pilihan, dan kunci jawaban terbaca lengkap'];

    return {
      ...item,
      ...(pasanganMirip.length > 0 ? { pasanganMirip } : { pasanganMirip: undefined }),
      keyakinan,
      alasanKeyakinan,
      masalah,
      peringatanDetail,
    };
  });

  const deteksiGagal = cekIndikasiGagalBacaBesar(
    daftarTervalidasi,
    metaTambahan?.jenisDokumen
  );

  return {
    daftar: daftarTervalidasi,
    totalSoal: daftarTervalidasi.length,
    jumlahBermasalah,
    peringatanUmum: [...peringatanAwal],
    ...(metaTambahan?.teksMentah !== undefined ? { teksMentah: metaTambahan.teksMentah } : {}),
    ...(metaTambahan?.barisMentah !== undefined ? { barisMentah: metaTambahan.barisMentah } : {}),
    ...(metaTambahan?.catatanBagian !== undefined
      ? { catatanBagian: metaTambahan.catatanBagian }
      : {}),
    ...(metaTambahan?.jenisDokumen !== undefined
      ? { jenisDokumen: metaTambahan.jenisDokumen }
      : {}),
    indikasiGagalBacaBesar: deteksiGagal.gagalBesar,
    ...(deteksiGagal.gagalBesar
      ? { peringatanKritis: PESAN_PERINGATAN_GAGAL_BACA_BESAR }
      : {}),
  };
}

export function konversiDraftValidKeSoal(daftar: readonly DraftSoal[]): {
  soalValid: Soal[];
  jumlahDilewati: number;
} {
  const soalValid: Soal[] = [];
  let jumlahDilewati = 0;

  for (const draft of daftar) {
    const pilihanBersih = draft.pilihan.map((p) => p.trim()).filter((p) => p.length > 0);
    const adaPilihanKosong = draft.pilihan.some((p) => p.trim().length === 0);
    const kunciValid =
      draft.kunci !== null &&
      draft.kunci >= 0 &&
      draft.kunci < draft.pilihan.length &&
      draft.pilihan[draft.kunci].trim().length > 0;

    const masalahKritis = draft.masalah.some(
      (m) =>
        m === 'soal_kosong' ||
        m === 'kunci_tidak_ditemukan' ||
        m === 'kunci_bertentangan' ||
        m === 'kunci_tidak_cocok' ||
        m === 'pilihan_kurang' ||
        m === 'pilihan_kosong' ||
        m === 'pilihan_kembar' ||
        m === 'teks_terlalu_panjang' ||
        m === 'tanpa_nomor'
    );

    if (
      masalahKritis ||
      adaPilihanKosong ||
      !kunciValid ||
      pilihanBersih.length < 2 ||
      !draft.pertanyaan.trim()
    ) {
      jumlahDilewati += 1;
      continue;
    }

    const teksKunci = draft.pilihan[draft.kunci!].trim();
    const indeksBaru = pilihanBersih.findIndex((p) => p === teksKunci);
    if (indeksBaru < 0) {
      jumlahDilewati += 1;
      continue;
    }

    soalValid.push({
      id: draft.id || buatId('soal'),
      pertanyaan: draft.pertanyaan.trim(),
      ...(draft.kode?.trim() ? { kode: draft.kode } : {}),
      pilihan: pilihanBersih.slice(0, 4),
      kunci: indeksBaru,
      ...(draft.penjelasan?.trim() ? { penjelasan: draft.penjelasan.trim() } : {}),
      ...(draft.tingkat ? { tingkat: draft.tingkat } : {}),
      ...(draft.topik?.trim() ? { topik: draft.topik.trim() } : {}),
      ...(draft.bonus ? { bonus: true } : {}),
      ...(draft.cadangan ? { cadangan: true } : {}),
    });
  }

  return { soalValid, jumlahDilewati };
}

export function acakUrutanPilihanDraft(draft: DraftSoal): DraftSoal {
  const entri = draft.pilihan.map((teks, indeksAsli) => ({
    teks,
    adalahKunci: draft.kunci === indeksAsli,
  }));
  const teracak = acakFisherYates(entri);
  const kunciBaru = teracak.findIndex((item) => item.adalahKunci);

  return {
    ...draft,
    pilihan: teracak.map((item) => item.teks),
    kunci: kunciBaru >= 0 ? kunciBaru : draft.kunci,
  };
}

export function soalKeDraft(soal: Soal, sumber: SumberImpor = 'manual'): DraftSoal {
  return {
    id: soal.id,
    pertanyaan: soal.pertanyaan,
    kode: soal.kode,
    pilihan: [...soal.pilihan],
    kunci: soal.kunci,
    penjelasan: soal.penjelasan,
    tingkat: soal.tingkat,
    topik: soal.topik,
    bonus: soal.bonus,
    cadangan: soal.cadangan,
    sumber,
    sumberKunci: 'manual',
    detailSumberKunci: LABEL_SUMBER_KUNCI.manual,
    nomorAsli: 1,
    tanpaNomorJelas: false,
    masalah: [],
    peringatanDetail: [],
  };
}

import { Pengaturan } from '../data/types';
import { hitungPerkiraanKebutuhanSoal } from '../engine/deal';
import { normalisasiTeksBiasa } from './normalizer';
import {
  deteksiMasalahKerapianSoal,
  DraftSoal,
  SumberImpor,
  validasiDaftarDraftSoal,
} from './validator';

export type LevelLencanaKoreksi = 'merah' | 'kuning' | 'hijau';

export interface StatusKoreksiItem {
  id: string;
  level: LevelLencanaKoreksi;
  alasanMerah: string[];
  alasanKuning: string[];
  cekManualMedia: boolean;
  bisaDirapikan: boolean;
}

export interface RingkasanKunciOtomatis {
  total: number;
  otomatis: number;
  bertentangan: number;
  belumAda: number;
  manual: number;
  otomatisBelumDiterima: number;
}

export interface PeringatanUmumKoreksi {
  sebaranKunciTimpang: string | null;
  urutanKunciBeruntun: string | null;
  kunciTerpanjangDominan: string | null;
  soalKurangUntukWaktu: string | null;
}

export interface HasilAnalisisKoreksi {
  perSoal: Record<string, StatusKoreksiItem>;
  jumlahMerah: number;
  jumlahKuning: number;
  jumlahHijau: number;
  jumlahBisaDirapikan: number;
  ringkasanKunci: RingkasanKunciOtomatis;
  peringatanUmumKoreksi: PeringatanUmumKoreksi;
}

export interface ItemPratinjauRapikan {
  id: string;
  nomorUrut: number;
  pertanyaanSebelum: string;
  pertanyaanSesudah: string;
  pilihanSebelum: string[];
  pilihanSesudah: string[];
  perubahan: string[];
}

const KODE_MASALAH_MERAH = new Set([
  'soal_kosong',
  'pilihan_kurang',
  'pilihan_kosong',
  'pilihan_kembar',
  'kunci_tidak_ditemukan',
  'kunci_bertentangan',
  'kunci_tidak_cocok',
  'tanpa_nomor',
  'teks_terlalu_panjang',
]);

export function analisisKoreksiDaftarSoal(
  daftar: readonly DraftSoal[],
  pengaturan?: Pick<
    Pengaturan,
    'akhirPermainan' | 'durasiWaktu' | 'durasiSoal' | 'mode' | 'jumlahPenarik' | 'namaTim' | 'anggota' | 'langkahKeGaris' | 'salahMenarikLawan' | 'bonus' | 'penjelasan' | 'ulangiSoal' | 'suara' | 'musik' | 'modeRekam' | 'efekRingan'
  >
): HasilAnalisisKoreksi {
  const perSoal: Record<string, StatusKoreksiItem> = {};
  let jumlahMerah = 0;
  let jumlahKuning = 0;
  let jumlahHijau = 0;
  let jumlahBisaDirapikan = 0;

  let otomatis = 0;
  let bertentangan = 0;
  let belumAda = 0;
  let manual = 0;
  let otomatisBelumDiterima = 0;

  const hitungHuruf = [0, 0, 0, 0];
  let totalKunciSah = 0;
  let beruntunMaks = 0;
  let beruntunHuruf = -1;
  let beruntunMulai = 0;
  let beruntunSekarang = 0;
  let hurufSebelumnya = -1;
  let mulaiSekarang = 0;

  let jumlahKunciTerpanjang = 0;
  let jumlahSoalUntukCekTerpanjang = 0;

  daftar.forEach((item, idx) => {
    const alasanMerah: string[] = [];
    const alasanKuning: string[] = [];

    item.masalah.forEach((kode, mIdx) => {
      const teks = item.peringatanDetail[mIdx] ?? kode;
      if (KODE_MASALAH_MERAH.has(kode)) {
        alasanMerah.push(teks);
      } else {
        alasanKuning.push(teks);
      }
    });

    const adaKode = Boolean(item.kode?.trim());
    const cekManualMedia =
      item.masalah.includes('cek_manual_media') ||
      Boolean(item.mengandungMediaDokumen) ||
      adaKode;
    if (adaKode && !item.masalah.includes('cek_manual_media')) {
      alasanKuning.push('Cek manual: soal berisi blok kode');
    }

    const bisaDirapikan = deteksiMasalahKerapianSoal(item).length > 0;
    if (bisaDirapikan) {
      jumlahBisaDirapikan += 1;
    }

    let level: LevelLencanaKoreksi = 'hijau';
    if (alasanMerah.length > 0) {
      level = 'merah';
      jumlahMerah += 1;
    } else if (alasanKuning.length > 0) {
      level = 'kuning';
      jumlahKuning += 1;
    } else {
      jumlahHijau += 1;
    }

    perSoal[item.id] = {
      id: item.id,
      level,
      alasanMerah,
      alasanKuning,
      cekManualMedia,
      bisaDirapikan,
    };

    // Hitung sumber kunci
    if (item.kunciBertentangan && item.kunciBertentangan.length >= 2) {
      bertentangan += 1;
    } else if (
      item.kunci === null ||
      item.kunci === undefined ||
      item.kunci < 0 ||
      item.kunci >= item.pilihan.length
    ) {
      belumAda += 1;
    } else if (
      item.sumberKunci === 'bagian_kunci' ||
      item.sumberKunci === 'baris_jawaban' ||
      item.sumberKunci === 'penanda_pilihan'
    ) {
      otomatis += 1;
      if (!item.kunciDiterima) {
        otomatisBelumDiterima += 1;
      }
    } else {
      manual += 1;
    }

    // Statistik sebaran kunci
    if (
      item.kunci !== null &&
      item.kunci >= 0 &&
      item.kunci < 4 &&
      item.pilihan[item.kunci]?.trim()
    ) {
      totalKunciSah += 1;
      hitungHuruf[item.kunci] += 1;

      if (item.kunci === hurufSebelumnya) {
        beruntunSekarang += 1;
      } else {
        hurufSebelumnya = item.kunci;
        mulaiSekarang = idx + 1;
        beruntunSekarang = 1;
      }
      if (beruntunSekarang > beruntunMaks) {
        beruntunMaks = beruntunSekarang;
        beruntunHuruf = item.kunci;
        beruntunMulai = mulaiSekarang;
      }

      // Cek apakah kunci adalah pilihan terpanjang secara jelas
      const panjangTerisi = item.pilihan
        .map((p, oIdx) => ({ oIdx, len: p.trim().length }))
        .filter((x) => x.len > 0);
      if (panjangTerisi.length >= 2) {
        const maksLen = Math.max(...panjangTerisi.map((x) => x.len));
        const kandidatTerpanjang = panjangTerisi.filter((x) => x.len === maksLen);
        if (kandidatTerpanjang.length === 1) {
          jumlahSoalUntukCekTerpanjang += 1;
          if (kandidatTerpanjang[0].oIdx === item.kunci) {
            jumlahKunciTerpanjang += 1;
          }
        }
      }
    } else {
      hurufSebelumnya = -1;
      beruntunSekarang = 0;
    }
  });

  // Peringatan sebaran kunci timpang (>45% atau 4x berturut-turut)
  let sebaranKunciTimpang: string | null = null;
  if (totalKunciSah >= 6) {
    let idxMaks = 0;
    for (let i = 1; i < 4; i += 1) {
      if (hitungHuruf[i] > hitungHuruf[idxMaks]) idxMaks = i;
    }
    const rasio = hitungHuruf[idxMaks] / totalKunciSah;
    if (rasio > 0.45) {
      const persen = Math.round(rasio * 100);
      const huruf = String.fromCharCode(65 + idxMaks);
      sebaranKunciTimpang = `Sebaran kunci tidak seimbang: huruf ${huruf} muncul ${persen}% (${hitungHuruf[idxMaks]}/${totalKunciSah} soal).`;
    }
  }

  let urutanKunciBeruntun: string | null = null;
  if (beruntunMaks >= 4 && beruntunHuruf >= 0) {
    const huruf = String.fromCharCode(65 + beruntunHuruf);
    urutanKunciBeruntun = `Kunci huruf ${huruf} muncul ${beruntunMaks} kali berturut-turut (Soal #${beruntunMulai}–#${beruntunMulai + beruntunMaks - 1}).`;
  }

  let kunciTerpanjangDominan: string | null = null;
  if (
    jumlahSoalUntukCekTerpanjang >= 5 &&
    jumlahKunciTerpanjang >= 4 &&
    jumlahKunciTerpanjang / jumlahSoalUntukCekTerpanjang >= 0.6
  ) {
    kunciTerpanjangDominan = `Kunci terlalu sering berada di pilihan terpanjang (${jumlahKunciTerpanjang} dari ${jumlahSoalUntukCekTerpanjang} soal) — mudah ditebak siswa.`;
  }

  let soalKurangUntukWaktu: string | null = null;
  if (
    pengaturan &&
    (pengaturan.akhirPermainan === 'waktu' || pengaturan.akhirPermainan === 'keduanya')
  ) {
    const utamaValid = daftar.filter((d) => {
      if (d.cadangan) return false;
      const st = perSoal[d.id];
      return st ? st.level !== 'merah' : true;
    }).length;
    const perTim = Math.floor(utamaValid / 2);
    if (perTim < 25) {
      const perkiraan = hitungPerkiraanKebutuhanSoal(pengaturan, utamaValid);
      const saranTotal = Math.max(50, perkiraan.totalSoalDibutuhkan);
      const saranPerTim = Math.max(25, Math.ceil(saranTotal / 2));
      soalKurangUntukWaktu = `Jumlah soal utama siap pakai ${utamaValid} soal (~${perTim} per tim) masih kurang dari 25 per tim untuk mode waktu (${pengaturan.durasiWaktu} menit). Disarankan minimal ${saranTotal} soal (${saranPerTim} soal/tim).`;
    }
  }

  return {
    perSoal,
    jumlahMerah,
    jumlahKuning,
    jumlahHijau,
    jumlahBisaDirapikan,
    ringkasanKunci: {
      total: daftar.length,
      otomatis,
      bertentangan,
      belumAda,
      manual,
      otomatisBelumDiterima,
    },
    peringatanUmumKoreksi: {
      sebaranKunciTimpang,
      urutanKunciBeruntun,
      kunciTerpanjangDominan,
      soalKurangUntukWaktu,
    },
  };
}

function rapikanTeksUmum(teks: string): string {
  return normalisasiTeksBiasa(teks)
    .replace(/ {2,}/g, ' ')
    // Hapus spasi sebelum ?, ; : ! ) atau titik tunggal (bukan elipsis "..." / "..")
    .replace(/\s+([?,;:!)]|\.(?!\.))/g, '$1')
    .trim();
}

function rapikanPertanyaanTeks(teks: string, punyaKode = false): string {
  let hasil = rapikanTeksUmum(teks);
  // Hapus nomor tersisa di awal soal ("1. ", "1) ", "No. 1: ")
  hasil = hasil.replace(
    /^\s*(?:(?:no\.?|soal)\s*\d{1,3}\s*[.)\-:]?|\d{1,3}\s*[.)\-:])\s+(?=\S)/i,
    ''
  );
  hasil = rapikanTeksUmum(hasil);
  if (!punyaKode && /^[a-z]/.test(hasil)) {
    hasil = hasil.charAt(0).toUpperCase() + hasil.slice(1);
  }
  return hasil;
}

function rapikanOpsiTeks(teks: string): string {
  let hasil = rapikanTeksUmum(teks);
  hasil = hasil.replace(/^\s*(?:\(?[A-Da-d]\s*[.)]|\([A-Da-d]\))\s+(?=\S)/, '');
  return rapikanTeksUmum(hasil);
}

export function rapikanSatuDraftSoal(draft: DraftSoal): {
  sesudah: DraftSoal;
  perubahan: string[];
  berubah: boolean;
} {
  const perubahan: string[] = [];
  const pertanyaanBaru = rapikanPertanyaanTeks(draft.pertanyaan, Boolean(draft.kode));
  if (pertanyaanBaru !== draft.pertanyaan) {
    perubahan.push('Merapikan teks pertanyaan (spasi/nomor/huruf awal)');
  }

  let opsiBerubah = false;
  const pilihanBaru = draft.pilihan.map((op) => {
    const rapi = rapikanOpsiTeks(op);
    if (rapi !== op) opsiBerubah = true;
    return rapi;
  });
  if (opsiBerubah) {
    perubahan.push('Membersihkan spasi/awalan huruf pada pilihan');
  }

  const berubah = perubahan.length > 0;
  return {
    sesudah: berubah
      ? {
          ...draft,
          pertanyaan: pertanyaanBaru,
          pilihan: pilihanBaru,
        }
      : draft,
    perubahan,
    berubah,
  };
}

export function buatPratinjauRapikanOtomatis(
  daftar: readonly DraftSoal[]
): ItemPratinjauRapikan[] {
  const hasil: ItemPratinjauRapikan[] = [];
  daftar.forEach((item, idx) => {
    const res = rapikanSatuDraftSoal(item);
    if (res.berubah) {
      hasil.push({
        id: item.id,
        nomorUrut: idx + 1,
        pertanyaanSebelum: item.pertanyaan,
        pertanyaanSesudah: res.sesudah.pertanyaan,
        pilihanSebelum: [...item.pilihan],
        pilihanSesudah: [...res.sesudah.pilihan],
        perubahan: res.perubahan,
      });
    }
  });
  return hasil;
}

export function terapkanRapikanOtomatis(
  daftar: readonly DraftSoal[],
  peringatanUmum: string[] = [],
  jenisDokumen?: SumberImpor
): { daftarBaru: DraftSoal[]; jumlahDiubah: number } {
  let jumlahDiubah = 0;
  const dirapikan = daftar.map((item) => {
    const res = rapikanSatuDraftSoal(item);
    if (res.berubah) jumlahDiubah += 1;
    return res.sesudah;
  });
  return {
    daftarBaru: validasiDaftarDraftSoal(dirapikan, peringatanUmum, {
      ...(jenisDokumen ? { jenisDokumen } : {}),
    }).daftar,
    jumlahDiubah,
  };
}

export function terimaSemuaKunciOtomatis(
  daftar: readonly DraftSoal[],
  peringatanUmum: string[] = [],
  jenisDokumen?: SumberImpor
): { daftarBaru: DraftSoal[]; jumlahDiterima: number } {
  let jumlahDiterima = 0;
  const diperbarui = daftar.map((item) => {
    if (
      item.kunci !== null &&
      item.kunci >= 0 &&
      item.kunci < item.pilihan.length &&
      !(item.kunciBertentangan && item.kunciBertentangan.length >= 2) &&
      (item.sumberKunci === 'bagian_kunci' ||
        item.sumberKunci === 'baris_jawaban' ||
        item.sumberKunci === 'penanda_pilihan')
    ) {
      jumlahDiterima += 1;
      return {
        ...item,
        kunciTerdeteksiOtomatis: true,
        kunciDiterima: true,
      };
    }
    return item;
  });

  return {
    daftarBaru: validasiDaftarDraftSoal(diperbarui, peringatanUmum, {
      ...(jenisDokumen ? { jenisDokumen } : {}),
    }).daftar,
    jumlahDiterima,
  };
}

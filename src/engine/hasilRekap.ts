import { Pengaturan, Soal, TimSisi } from '../data/types';
import { RekapPemain, RiwayatTarikanMatch } from './match';

export const NAMA_TIM_STANDAR = ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Kuning'] as const;

/**
 * Satu sumber kebenaran untuk nama tim di Arena, Pengaturan, dan Hasil.
 */
export function ambilNamaTimResmi(
  pengaturan: Pick<Pengaturan, 'namaTim'> | undefined | null,
  indeks: 0 | 1 | 2 | 3
): string {
  const kandidat = pengaturan?.namaTim?.[indeks]?.trim();
  return kandidat && kandidat.length > 0 ? kandidat : NAMA_TIM_STANDAR[indeks];
}

export function ambilPasanganNamaTimResmi(
  pengaturan: Pick<Pengaturan, 'namaTim'> | undefined | null
): [string, string] {
  return [ambilNamaTimResmi(pengaturan, 0), ambilNamaTimResmi(pengaturan, 1)];
}

export function normalisasiNamaPemainTampil(nama: string | undefined | null, fallbackIndex = 1): string {
  const bersih = (nama ?? '').trim();
  return bersih.length > 0 ? bersih : `Pemain ${Math.max(1, fallbackIndex)}`;
}

export interface RekapPemainLengkap extends RekapPemain {
  akurasi: number; // 0..100 (bulat)
  tercepatMs: number | null;
}

export interface JawabanTercepatInfo {
  pemain: string;
  tim: TimSisi;
  waktuMs: number;
  benar: boolean;
}

export interface RingkasanLogPertandingan {
  skorMerah: number;
  skorSalahMerah: number;
  totalMerah: number;
  skorBiru: number;
  skorSalahBiru: number;
  totalBiru: number;
  totalSoalTerjawab: number;
  akurasiMerah: number;
  akurasiBiru: number;
  akurasiTotal: number;
  posisiTaliAkhir: number;
  jawabanTercepat: JawabanTercepatInfo | null;
  rekapPemain: RekapPemainLengkap[];
}

export interface OpsiHitungRingkasan {
  rosterKiri?: readonly string[];
  rosterKanan?: readonly string[];
}

interface AkumulatorPemain {
  nama: string;
  tim: TimSisi;
  soal: number;
  benar: number;
  salah: number;
  tercepatMs: number | null;
}

/**
 * Menghitung seluruh angka ringkasan (header skor tim, rekap per pemain,
 * total soal terjawab, akurasi %, jawaban tercepat, dan posisi tali)
 * dari SATU sumber kebenaran: log riwayat tarikan pertandingan.
 *
 * Menjamin:
 * - skorMerah === sum(rekapPemain[merah].benar)
 * - skorSalahMerah === sum(rekapPemain[merah].salah)
 * - skorBiru === sum(rekapPemain[biru].benar)
 * - skorSalahBiru === sum(rekapPemain[biru].salah)
 * - totalSoalTerjawab === skorMerah + skorSalahMerah + skorBiru + skorSalahBiru
 */
export function hitungRingkasanDariLog(
  riwayat: readonly RiwayatTarikanMatch[],
  opsi?: OpsiHitungRingkasan
): RingkasanLogPertandingan {
  const peta = new Map<string, AkumulatorPemain>();

  const daftarkanJikaBelum = (tim: TimSisi, namaRaw: string, fallbackIdx: number): AkumulatorPemain => {
    const nama = normalisasiNamaPemainTampil(namaRaw, fallbackIdx);
    const kunci = `${tim}::${nama}`;
    const ada = peta.get(kunci);
    if (ada) return ada;
    const baru: AkumulatorPemain = {
      nama,
      tim,
      soal: 0,
      benar: 0,
      salah: 0,
      tercepatMs: null,
    };
    peta.set(kunci, baru);
    return baru;
  };

  if (opsi?.rosterKiri) {
    opsi.rosterKiri.forEach((nama, idx) => {
      daftarkanJikaBelum('merah', nama, idx + 1);
    });
  }
  if (opsi?.rosterKanan) {
    opsi.rosterKanan.forEach((nama, idx) => {
      daftarkanJikaBelum('biru', nama, idx + 1);
    });
  }

  let posisiTaliAkhir = 0;
  let skorMerah = 0;
  let skorSalahMerah = 0;
  let skorBiru = 0;
  let skorSalahBiru = 0;
  let tercepatBenar: JawabanTercepatInfo | null = null;
  let tercepatUmum: JawabanTercepatInfo | null = null;

  for (const item of riwayat) {
    posisiTaliAkhir += item.perubahanLangkah;

    if (item.jenis === 'manual') {
      continue;
    }

    const pemain = daftarkanJikaBelum(item.tim, item.pemain, 1);
    pemain.soal += 1;
    if (item.benar) {
      pemain.benar += 1;
      if (item.tim === 'merah') skorMerah += 1;
      else skorBiru += 1;
    } else {
      pemain.salah += 1;
      if (item.tim === 'merah') skorSalahMerah += 1;
      else skorSalahBiru += 1;
    }

    const responsMs =
      typeof item.waktuResponsMs === 'number' && Number.isFinite(item.waktuResponsMs) && item.waktuResponsMs > 0
        ? Math.round(item.waktuResponsMs)
        : null;

    if (responsMs !== null && item.jenis !== 'waktuHabis') {
      if (item.benar && (pemain.tercepatMs === null || responsMs < pemain.tercepatMs)) {
        pemain.tercepatMs = responsMs;
      }
      if (item.benar) {
        if (!tercepatBenar || responsMs < tercepatBenar.waktuMs) {
          tercepatBenar = {
            pemain: pemain.nama,
            tim: item.tim,
            waktuMs: responsMs,
            benar: true,
          };
        }
      }
      if (!tercepatUmum || responsMs < tercepatUmum.waktuMs) {
        tercepatUmum = {
          pemain: pemain.nama,
          tim: item.tim,
          waktuMs: responsMs,
          benar: item.benar,
        };
      }
    }
  }

  const rekapPemain: RekapPemainLengkap[] = Array.from(peta.values()).map((p) => ({
    nama: p.nama,
    tim: p.tim,
    soal: p.soal,
    benar: p.benar,
    salah: p.salah,
    akurasi: p.soal > 0 ? Math.round((p.benar / p.soal) * 100) : 0,
    tercepatMs: p.tercepatMs,
  }));

  const totalMerah = skorMerah + skorSalahMerah;
  const totalBiru = skorBiru + skorSalahBiru;
  const totalSoalTerjawab = totalMerah + totalBiru;
  const totalBenar = skorMerah + skorBiru;

  return {
    skorMerah,
    skorSalahMerah,
    totalMerah,
    skorBiru,
    skorSalahBiru,
    totalBiru,
    totalSoalTerjawab,
    akurasiMerah: totalMerah > 0 ? Math.round((skorMerah / totalMerah) * 100) : 0,
    akurasiBiru: totalBiru > 0 ? Math.round((skorBiru / totalBiru) * 100) : 0,
    akurasiTotal: totalSoalTerjawab > 0 ? Math.round((totalBenar / totalSoalTerjawab) * 100) : 0,
    posisiTaliAkhir,
    jawabanTercepat: tercepatBenar ?? tercepatUmum,
    rekapPemain,
  };
}

export interface SoalReferensiAnalisis {
  id: string;
  pertanyaan: string;
  pilihan: string[];
  kunci: number;
  penjelasan?: string;
}

export interface ItemAnalisisSoal {
  soalId: string;
  pertanyaan: string;
  pilihan: string[];
  kunciIndeks: number;
  jawabanBenarHuruf: string;
  jawabanBenarTeks: string;
  penjelasan?: string;
  totalDijawab: number;
  jumlahBenar: number;
  jumlahSalah: number;
  persenBenar: number;
  perluDiulas: boolean;
  rataWaktuMs: number | null;
}

/**
 * Menganalisis soal dari log jawaban pertandingan.
 * Diurutkan dari persentase benar paling rendah (paling sering salah di atas).
 * Soal dengan persentase benar < 50% ditandai `perluDiulas = true`.
 */
export function analisisSoalDariLog(
  riwayat: readonly RiwayatTarikanMatch[],
  daftarSoal: readonly SoalReferensiAnalisis[]
): ItemAnalisisSoal[] {
  const petaSoal = new Map<string, SoalReferensiAnalisis>();
  for (const s of daftarSoal) {
    petaSoal.set(s.id, s);
  }

  const kelompok = new Map<
    string,
    {
      soalId: string;
      benar: number;
      salah: number;
      totalWaktuMs: number;
      hitungWaktu: number;
    }
  >();

  for (const r of riwayat) {
    if (r.jenis === 'manual' || !r.soalId || r.soalId === '-') continue;
    const lama = kelompok.get(r.soalId) ?? {
      soalId: r.soalId,
      benar: 0,
      salah: 0,
      totalWaktuMs: 0,
      hitungWaktu: 0,
    };
    if (r.benar) lama.benar += 1;
    else lama.salah += 1;

    if (typeof r.waktuResponsMs === 'number' && Number.isFinite(r.waktuResponsMs) && r.waktuResponsMs > 0) {
      lama.totalWaktuMs += r.waktuResponsMs;
      lama.hitungWaktu += 1;
    }
    kelompok.set(r.soalId, lama);
  }

  const hasil: ItemAnalisisSoal[] = [];
  for (const item of kelompok.values()) {
    const totalDijawab = item.benar + item.salah;
    if (totalDijawab === 0) continue;
    const persenBenar = Math.round((item.benar / totalDijawab) * 100);
    const ref = petaSoal.get(item.soalId);
    const kunciIndeks = ref ? Math.max(0, Math.min(ref.pilihan.length - 1, ref.kunci)) : 0;
    const huruf = ref ? String.fromCharCode(65 + kunciIndeks) : '-';
    const teksKunci = ref?.pilihan?.[kunciIndeks] ?? 'Data soal tidak lagi tersedia';

    hasil.push({
      soalId: item.soalId,
      pertanyaan: ref?.pertanyaan ?? `Soal (${item.soalId})`,
      pilihan: ref?.pilihan ? [...ref.pilihan] : [],
      kunciIndeks,
      jawabanBenarHuruf: huruf,
      jawabanBenarTeks: teksKunci,
      penjelasan: ref?.penjelasan,
      totalDijawab,
      jumlahBenar: item.benar,
      jumlahSalah: item.salah,
      persenBenar,
      perluDiulas: persenBenar < 50,
      rataWaktuMs: item.hitungWaktu > 0 ? Math.round(item.totalWaktuMs / item.hitungWaktu) : null,
    });
  }

  return hasil.sort((a, b) => {
    if (a.persenBenar !== b.persenBenar) return a.persenBenar - b.persenBenar;
    if (b.jumlahSalah !== a.jumlahSalah) return b.jumlahSalah - a.jumlahSalah;
    return b.totalDijawab - a.totalDijawab;
  });
}

export function formatDetikSingkat(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '-';
  return `${(ms / 1000).toFixed(1).replace('.', ',')} dtk`;
}

export function ringkasSoalSnapshot(soal: readonly Soal[]): SoalReferensiAnalisis[] {
  return soal.map((s) => ({
    id: s.id,
    pertanyaan: s.pertanyaan,
    pilihan: [...s.pilihan],
    kunci: s.kunci,
    ...(s.penjelasan ? { penjelasan: s.penjelasan } : {}),
  }));
}

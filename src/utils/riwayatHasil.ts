import { Game, ModePermainan, Soal, TimSisi } from '../data/types';
import {
  hitungRingkasanDariLog,
  RingkasanLogPertandingan,
  ringkasSoalSnapshot,
  SoalReferensiAnalisis,
} from '../engine/hasilRekap';
import { AlasanAkhirMatch, CaraMenangMatch, RiwayatTarikanMatch } from '../engine/match';
import { RekapDuelPemain } from '../engine/session';
import { STORAGE_KEYS } from './constants';
import { buatId } from './id';
import { bacaStorage, bacaStorageRaw, tulisStorage } from './storage';

export interface InfoPodiumTurnamenSnapshot {
  juara1: string;
  juara2: string;
  juara3Bersama: [string, string];
  laga: {
    judul: string;
    namaTimKiri: string;
    namaTimKanan: string;
    skorMerah: number;
    skorBiru: number;
    namaPemenang: string;
    posisiTaliAkhir: number;
  }[];
}

export interface EntriRiwayatHasil {
  id: string;
  dibuatPada: number;
  gameId: string;
  judulGame: string;
  mapel: string;
  namaSekolah: string;
  mode: ModePermainan;
  labelLaga: string;
  namaTimKiri: string;
  namaTimKanan: string;
  rosterKiri: string[];
  rosterKanan: string[];
  posisiTaliAkhir: number;
  langkahKeGaris: number;
  pemenang: TimSisi | 'seri';
  alasanAkhir: AlasanAkhirMatch;
  caraMenang: CaraMenangMatch | null;
  keteranganMenang: string | null;
  durasiDetik: number;
  jumlahPenarik: 3 | 4 | 5;
  riwayat: RiwayatTarikanMatch[];
  soalSnapshot: SoalReferensiAnalisis[];
  turnamenSnapshot?: InfoPodiumTurnamenSnapshot;
  duelSnapshot?: RekapDuelPemain[];
}

export interface InputBuatEntriRiwayatHasil {
  id?: string;
  dibuatPada?: number;
  gameId: string;
  judulGame: string;
  mapel?: string;
  namaSekolah?: string;
  mode: ModePermainan;
  labelLaga: string;
  namaTimKiri: string;
  namaTimKanan: string;
  rosterKiri?: readonly string[];
  rosterKanan?: readonly string[];
  posisiTaliAkhir: number;
  langkahKeGaris: number;
  pemenang: TimSisi | 'seri';
  alasanAkhir: AlasanAkhirMatch;
  caraMenang?: CaraMenangMatch | null;
  keteranganMenang?: string | null;
  durasiDetik: number;
  jumlahPenarik?: 3 | 4 | 5;
  riwayat: readonly RiwayatTarikanMatch[];
  bankSoal?: readonly Soal[];
  soalSnapshot?: readonly SoalReferensiAnalisis[];
  turnamenSnapshot?: InfoPodiumTurnamenSnapshot;
  duelSnapshot?: RekapDuelPemain[];
}

export function urutkanRiwayatHasilTerbaru(daftar: readonly EntriRiwayatHasil[]): EntriRiwayatHasil[] {
  return [...daftar].sort((a, b) => (b.dibuatPada ?? 0) - (a.dibuatPada ?? 0));
}

export function buatEntriRiwayatHasil(input: InputBuatEntriRiwayatHasil): EntriRiwayatHasil {
  const snapshot: SoalReferensiAnalisis[] = input.soalSnapshot
    ? input.soalSnapshot.map((s) => ({ ...s, pilihan: [...s.pilihan] }))
    : input.bankSoal
      ? ringkasSoalSnapshot(input.bankSoal)
      : [];

  return {
    id: input.id ?? buatId('hasil'),
    dibuatPada: input.dibuatPada ?? Date.now(),
    gameId: input.gameId,
    judulGame: (input.judulGame || '').trim() || 'Duel Otak',
    mapel: (input.mapel || '').trim(),
    namaSekolah: (input.namaSekolah || '').trim(),
    mode: input.mode,
    labelLaga: input.labelLaga || 'Pertandingan',
    namaTimKiri: (input.namaTimKiri || '').trim() || 'Tim Merah',
    namaTimKanan: (input.namaTimKanan || '').trim() || 'Tim Biru',
    rosterKiri: [...(input.rosterKiri ?? [])],
    rosterKanan: [...(input.rosterKanan ?? [])],
    posisiTaliAkhir: input.posisiTaliAkhir,
    langkahKeGaris: Math.max(3, Math.min(10, input.langkahKeGaris || 6)),
    pemenang: input.pemenang,
    alasanAkhir: input.alasanAkhir,
    caraMenang: input.caraMenang ?? null,
    keteranganMenang: input.keteranganMenang ?? null,
    durasiDetik: Math.max(0, Math.round(input.durasiDetik || 0)),
    jumlahPenarik: input.jumlahPenarik ?? 3,
    riwayat: input.riwayat.map((r) => ({ ...r })),
    soalSnapshot: snapshot,
    ...(input.turnamenSnapshot ? { turnamenSnapshot: input.turnamenSnapshot } : {}),
    ...(input.duelSnapshot ? { duelSnapshot: input.duelSnapshot } : {}),
  };
}

export function hitungRingkasanEntriHasil(entri: EntriRiwayatHasil): RingkasanLogPertandingan {
  return hitungRingkasanDariLog(entri.riwayat, {
    rosterKiri: entri.rosterKiri,
    rosterKanan: entri.rosterKanan,
  });
}

export function formatSkorRingkasEntri(entri: EntriRiwayatHasil): string {
  const ringkas = hitungRingkasanEntriHasil(entri);
  if (entri.pemenang === 'seri') {
    return `SERI ${ringkas.skorMerah}–${ringkas.skorBiru}`;
  }
  const namaMenang = entri.pemenang === 'merah' ? entri.namaTimKiri : entri.namaTimKanan;
  return `${namaMenang} MENANG ${ringkas.skorMerah}–${ringkas.skorBiru}`;
}

export function formatTanggalJamHasil(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

export function formatDurasiPertandingan(durasiDetik: number): string {
  const total = Math.max(0, Math.round(durasiDetik));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} dtk`;
  return `${m} mnt ${String(s).padStart(2, '0')} dtk`;
}

/**
 * Membaca daftar riwayat hasil dari localStorage.
 * Tidak pernah membuat ulang data contoh saat kosong.
 */
export function bacaDaftarRiwayatHasil(): EntriRiwayatHasil[] {
  const mentah = bacaStorageRaw(STORAGE_KEYS.RESULTS_HISTORY);
  if (mentah === null) {
    return [];
  }
  const tersimpan = bacaStorage<EntriRiwayatHasil[]>(STORAGE_KEYS.RESULTS_HISTORY, []);
  if (!Array.isArray(tersimpan)) return [];
  return urutkanRiwayatHasilTerbaru(tersimpan);
}

/**
 * Menyimpan daftar riwayat hasil ke localStorage (termasuk array kosong '[]').
 */
export function simpanDaftarRiwayatHasil(daftar: readonly EntriRiwayatHasil[]): boolean {
  const terurut = urutkanRiwayatHasilTerbaru(daftar);
  return tulisStorage(STORAGE_KEYS.RESULTS_HISTORY, terurut);
}

export function cariSoalUntukEntriHasil(
  entri: EntriRiwayatHasil,
  daftarGame: readonly Game[]
): SoalReferensiAnalisis[] {
  if (entri.soalSnapshot && entri.soalSnapshot.length > 0) {
    return entri.soalSnapshot;
  }
  const gameCocok = daftarGame.find((g) => g.id === entri.gameId);
  if (gameCocok) {
    return ringkasSoalSnapshot(gameCocok.soal);
  }
  return [];
}

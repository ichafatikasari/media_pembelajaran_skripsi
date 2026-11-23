import { Game } from '../data/types';
import { STORAGE_KEYS } from './constants';
import { bacaStorage, tulisStorage } from './storage';

export const BATAS_SIMPAN_SAMPAH_GAME_MS = 7 * 24 * 60 * 60 * 1000;

export interface ItemSampahGame {
  id: string;
  game: Game;
  dihapusPada: number;
  kedaluwarsaPada: number;
  batchHapusId: string;
  kodeOnline?: string | null;
  sebelumnyaAktif?: boolean;
}

export function kloningGameUtuh(game: Game): Game {
  return {
    ...game,
    soal: game.soal.map((s) => ({
      ...s,
      pilihan: [...s.pilihan],
    })),
    pengaturan: {
      ...game.pengaturan,
      namaTim: [...game.pengaturan.namaTim],
      anggota: game.pengaturan.anggota.map((tim) => [...tim]),
    },
  };
}

export function bersihkanSampahGameKedaluwarsa(
  items: readonly ItemSampahGame[],
  sekarangMs = Date.now()
): ItemSampahGame[] {
  return items.filter((item) => {
    if (!item || !item.game || typeof item.id !== 'string') return false;
    const kedaluwarsa =
      typeof item.kedaluwarsaPada === 'number' && Number.isFinite(item.kedaluwarsaPada)
        ? item.kedaluwarsaPada
        : (item.dihapusPada || sekarangMs) + BATAS_SIMPAN_SAMPAH_GAME_MS;
    return sekarangMs < kedaluwarsa;
  });
}

export function bacaDaftarSampahGame(sekarangMs = Date.now()): {
  daftar: ItemSampahGame[];
  idKedaluwarsa: string[];
} {
  const mentah = bacaStorage<ItemSampahGame[]>(STORAGE_KEYS.GAME_TRASH, []);
  if (!Array.isArray(mentah)) {
    return { daftar: [], idKedaluwarsa: [] };
  }
  const masihBerlaku = bersihkanSampahGameKedaluwarsa(mentah, sekarangMs);
  const idValidSet = new Set(masihBerlaku.map((it) => it.id));
  const idKedaluwarsa = mentah
    .filter((it) => it && typeof it.id === 'string' && !idValidSet.has(it.id))
    .map((it) => it.id);

  if (masihBerlaku.length !== mentah.length) {
    tulisStorage(STORAGE_KEYS.GAME_TRASH, masihBerlaku);
  }
  return { daftar: masihBerlaku, idKedaluwarsa };
}

export function simpanDaftarSampahGame(items: readonly ItemSampahGame[]): boolean {
  return tulisStorage(STORAGE_KEYS.GAME_TRASH, items);
}

let penghitungBatchHapusGame = 0;

export function buatBatchHapusGameId(sekarangMs = Date.now()): string {
  penghitungBatchHapusGame += 1;
  return `hapus_game_${sekarangMs}_${penghitungBatchHapusGame}`;
}

export function masukkanGameKeSampah(
  daftarSampah: readonly ItemSampahGame[],
  games: readonly Game[],
  opsi?: {
    sekarangMs?: number;
    batchHapusId?: string;
    gameAktifId?: string;
    ambilKodeOnline?: (gameId: string) => string | null;
  }
): {
  daftarSampahBaru: ItemSampahGame[];
  itemBaru: ItemSampahGame[];
  batchHapusId: string;
} {
  const sekarangMs = opsi?.sekarangMs ?? Date.now();
  const batchHapusId = opsi?.batchHapusId ?? buatBatchHapusGameId(sekarangMs);
  const kedaluwarsaPada = sekarangMs + BATAS_SIMPAN_SAMPAH_GAME_MS;

  const itemBaru: ItemSampahGame[] = games.map((game) => ({
    id: game.id,
    game: kloningGameUtuh(game),
    dihapusPada: sekarangMs,
    kedaluwarsaPada,
    batchHapusId,
    kodeOnline: opsi?.ambilKodeOnline ? opsi.ambilKodeOnline(game.id) : null,
    sebelumnyaAktif: opsi?.gameAktifId ? game.id === opsi.gameAktifId : false,
  }));

  const idBaruSet = new Set(itemBaru.map((it) => it.id));
  const sisaLama = bersihkanSampahGameKedaluwarsa(
    daftarSampah.filter((it) => !idBaruSet.has(it.id)),
    sekarangMs
  );

  return {
    daftarSampahBaru: [...itemBaru, ...sisaLama],
    itemBaru,
    batchHapusId,
  };
}

export function pulihkanGameDariSampah(
  daftarGame: readonly Game[],
  daftarSampah: readonly ItemSampahGame[],
  targetIds: readonly string[]
): {
  daftarGameBaru: Game[];
  daftarSampahBaru: ItemSampahGame[];
  dipulihkan: ItemSampahGame[];
} {
  const targetSet = new Set(targetIds);
  const dipulihkan = daftarSampah.filter((it) => targetSet.has(it.id));
  if (dipulihkan.length === 0) {
    return {
      daftarGameBaru: [...daftarGame],
      daftarSampahBaru: [...daftarSampah],
      dipulihkan: [],
    };
  }

  const idDipulihkanSet = new Set(dipulihkan.map((it) => it.id));
  const gameAdaTanpaDuplikat = daftarGame.filter((g) => !idDipulihkanSet.has(g.id));
  const gameDipulihkan = dipulihkan.map((it) => kloningGameUtuh(it.game));
  const daftarGameBaru = [...gameDipulihkan, ...gameAdaTanpaDuplikat].sort(
    (a, b) => (b.diubahPada ?? 0) - (a.diubahPada ?? 0)
  );
  const daftarSampahBaru = daftarSampah.filter((it) => !targetSet.has(it.id));

  return {
    daftarGameBaru,
    daftarSampahBaru,
    dipulihkan,
  };
}

export function hitungSisaHariSampahGame(
  kedaluwarsaPada: number,
  sekarangMs = Date.now()
): number {
  const sisaMs = Math.max(0, kedaluwarsaPada - sekarangMs);
  return Math.max(1, Math.ceil(sisaMs / (24 * 60 * 60 * 1000)));
}

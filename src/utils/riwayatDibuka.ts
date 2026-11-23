import { bacaStorage, tulisStorage } from './storage';

export const KEY_RIWAYAT_DIBUKA = 'duel_otak_terakhir_dibuka_v1';
export const BATAS_MAKS_RIWAYAT_DIBUKA = 10;

export interface ItemRiwayatDibuka {
  id: string;
  judul: string;
  kode?: string;
  mapel?: string;
  jumlahSoal?: number;
  lokalGameId?: string;
  dibukaPada: number;
}

export interface InputCatatRiwayatDibuka {
  judul: string;
  kode?: string;
  mapel?: string;
  jumlahSoal?: number;
  lokalGameId?: string;
  dibukaPada?: number;
}

function normalisasiKode(kode?: string): string | undefined {
  if (!kode) return undefined;
  const bersih = kode.replace(/[\s-]+/g, '').trim().toUpperCase();
  return bersih || undefined;
}

export function gabungEntriRiwayat(
  daftarLama: ItemRiwayatDibuka[],
  input: InputCatatRiwayatDibuka,
  batas = BATAS_MAKS_RIWAYAT_DIBUKA
): ItemRiwayatDibuka[] {
  const kodeBersih = normalisasiKode(input.kode);
  const lokalId = input.lokalGameId?.trim() || undefined;
  const judulBersih = input.judul.trim() || 'Game Duel Otak';
  const waktu = typeof input.dibukaPada === 'number' && Number.isFinite(input.dibukaPada)
    ? input.dibukaPada
    : Date.now();

  const entriLamaCocok = daftarLama.find((item) => {
    if (kodeBersih && item.kode && item.kode === kodeBersih) return true;
    if (lokalId && item.lokalGameId && item.lokalGameId === lokalId) return true;
    return false;
  });

  const itemBaru: ItemRiwayatDibuka = {
    id: kodeBersih ? `kode_${kodeBersih}` : `lokal_${lokalId ?? waktu}`,
    judul: judulBersih,
    kode: kodeBersih ?? entriLamaCocok?.kode,
    mapel: input.mapel?.trim() || entriLamaCocok?.mapel,
    jumlahSoal:
      typeof input.jumlahSoal === 'number' ? input.jumlahSoal : entriLamaCocok?.jumlahSoal,
    lokalGameId: lokalId ?? entriLamaCocok?.lokalGameId,
    dibukaPada: waktu,
  };

  const sisa = daftarLama.filter((item) => {
    if (kodeBersih && item.kode === kodeBersih) return false;
    if (lokalId && item.lokalGameId === lokalId) return false;
    if (item.id === itemBaru.id) return false;
    return true;
  });

  return [itemBaru, ...sisa].slice(0, batas);
}

export function bacaRiwayatDibuka(): ItemRiwayatDibuka[] {
  const mentah = bacaStorage<unknown[]>(KEY_RIWAYAT_DIBUKA, []);
  if (!Array.isArray(mentah)) return [];
  const valid: ItemRiwayatDibuka[] = [];
  for (const x of mentah) {
    if (!x || typeof x !== 'object') continue;
    const obj = x as Record<string, unknown>;
    if (typeof obj.judul !== 'string' || !obj.judul.trim()) continue;
    const kode = typeof obj.kode === 'string' ? normalisasiKode(obj.kode) : undefined;
    const lokalGameId =
      typeof obj.lokalGameId === 'string' && obj.lokalGameId.trim()
        ? obj.lokalGameId.trim()
        : undefined;
    if (!kode && !lokalGameId) continue;
    valid.push({
      id: typeof obj.id === 'string' && obj.id ? obj.id : kode ? `kode_${kode}` : `lokal_${lokalGameId}`,
      judul: obj.judul.trim(),
      kode,
      mapel: typeof obj.mapel === 'string' ? obj.mapel : undefined,
      jumlahSoal: typeof obj.jumlahSoal === 'number' ? obj.jumlahSoal : undefined,
      lokalGameId,
      dibukaPada:
        typeof obj.dibukaPada === 'number' && Number.isFinite(obj.dibukaPada)
          ? obj.dibukaPada
          : Date.now(),
    });
  }
  return valid.slice(0, BATAS_MAKS_RIWAYAT_DIBUKA);
}

export function catatRiwayatDibuka(input: InputCatatRiwayatDibuka): ItemRiwayatDibuka[] {
  const lama = bacaRiwayatDibuka();
  const baru = gabungEntriRiwayat(lama, input);
  tulisStorage(KEY_RIWAYAT_DIBUKA, baru);
  return baru;
}

export function hapusSemuaRiwayatDibuka(): void {
  tulisStorage<ItemRiwayatDibuka[]>(KEY_RIWAYAT_DIBUKA, []);
}

export function formatTanggalRiwayat(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString('id-ID');
  }
}

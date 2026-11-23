import { DraftSoal, InfoKolomPdf, SumberImpor } from '../parsers/validator';
import { STORAGE_KEYS } from './constants';
import { bacaStorage, tulisStorage } from './storage';

export type LangkahWizard = 1 | 2 | 3 | 4 | 5;
export type ModeMasukWizard = 'baru' | 'edit' | 'lanjut_draf';

export const BATAS_SIMPAN_SAMPAH_MS = 7 * 24 * 60 * 60 * 1000;

export interface ItemSampahSoal {
  id: string;
  soal: DraftSoal;
  posisiSemula: number;
  dihapusPada: number;
  urutanHapus: number;
  grupHapusId: string;
}

export interface CatatanSampahPerGame {
  gameId: string;
  items: ItemSampahSoal[];
  disimpanFinalPada?: number;
  diubahPada: number;
}

export interface DiagnostikImporTersimpan {
  jenisDokumen: SumberImpor;
  namaFile?: string;
  teksMentah: string;
  barisMentah: string[];
  infoKolomPdf?: InfoKolomPdf;
}

export interface InfoImporWizard {
  sumber: SumberImpor;
  namaFile?: string;
  totalTerbaca: number;
  siap: number;
  perluDiperiksa: number;
  catatanBagian?: string[];
}

export interface DrafWizardPerGame {
  gameId: string;
  langkahAktif: LangkahWizard;
  langkahSelesaiMaks: number;
  draftPratinjau: DraftSoal[];
  peringatanPratinjau: string[];
  diagnostikImpor: DiagnostikImporTersimpan | null;
  teksTempel: string;
  infoImporTerakhir: InfoImporWizard | null;
  tempatSampah?: ItemSampahSoal[];
  tersimpanPada: number;
}

export interface SesiMasukWizard {
  mode: ModeMasukWizard;
  gameId: string | null;
}

export function formatWaktuSingkatHHMM(timestamp: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '--:--';
  const d = new Date(timestamp);
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${jam}:${menit}`;
}

export function formatWaktuLengkapHHMMSS(timestamp: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '--:--:--';
  const d = new Date(timestamp);
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  const detik = String(d.getSeconds()).padStart(2, '0');
  return `${jam}:${menit}:${detik}`;
}

export function bacaSemuaDrafWizard(): Record<string, DrafWizardPerGame> {
  const data = bacaStorage<Record<string, DrafWizardPerGame>>(STORAGE_KEYS.WIZARD_DRAFTS, {});
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }
  return data;
}

export function bacaDrafWizardGame(gameId: string): DrafWizardPerGame | null {
  if (!gameId) return null;
  const semua = bacaSemuaDrafWizard();
  const draf = semua[gameId];
  if (!draf || typeof draf !== 'object') return null;
  const langkah = draf.langkahAktif;
  const langkahValid: LangkahWizard =
    langkah === 1 || langkah === 2 || langkah === 3 || langkah === 4 || langkah === 5
      ? langkah
      : 2;
  return {
    ...draf,
    gameId,
    langkahAktif: langkahValid,
    langkahSelesaiMaks: Math.max(
      langkahValid - 1,
      Math.min(5, Number(draf.langkahSelesaiMaks) || 1)
    ),
    draftPratinjau: Array.isArray(draf.draftPratinjau) ? draf.draftPratinjau : [],
    peringatanPratinjau: Array.isArray(draf.peringatanPratinjau)
      ? draf.peringatanPratinjau
      : [],
    diagnostikImpor: draf.diagnostikImpor ?? null,
    teksTempel: typeof draf.teksTempel === 'string' ? draf.teksTempel : '',
    infoImporTerakhir: draf.infoImporTerakhir ?? null,
    tempatSampah: Array.isArray(draf.tempatSampah) ? draf.tempatSampah : [],
    tersimpanPada: Number(draf.tersimpanPada) || Date.now(),
  };
}

export function simpanDrafWizardGame(draf: DrafWizardPerGame): boolean {
  if (!draf.gameId) return false;
  const semua = bacaSemuaDrafWizard();
  const entri = Object.entries(semua).filter(([id]) => id !== draf.gameId);
  entri.sort((a, b) => (b[1]?.tersimpanPada ?? 0) - (a[1]?.tersimpanPada ?? 0));
  const dibatasi = Object.fromEntries(entri.slice(0, 14));
  dibatasi[draf.gameId] = {
    ...draf,
    tersimpanPada: draf.tersimpanPada || Date.now(),
  };
  if (Array.isArray(draf.tempatSampah)) {
    simpanSampahGame(draf.gameId, draf.tempatSampah);
  }
  return tulisStorage(STORAGE_KEYS.WIZARD_DRAFTS, dibatasi);
}

export function hapusDrafWizardGame(gameId: string): void {
  if (!gameId) return;
  const semua = bacaSemuaDrafWizard();
  if (!(gameId in semua)) return;
  const salinan = { ...semua };
  delete salinan[gameId];
  tulisStorage(STORAGE_KEYS.WIZARD_DRAFTS, salinan);
}

// ============================================================================
// TEMPAT SAMPAH SOAL PER GAME (disimpan bersama draf, kadaluwarsa 7 hari pasca simpan final)
// ============================================================================

export function bersihkanSampahKedaluwarsa(
  semua: Record<string, CatatanSampahPerGame>,
  sekarangMs = Date.now()
): Record<string, CatatanSampahPerGame> {
  const hasil: Record<string, CatatanSampahPerGame> = {};
  for (const [id, entri] of Object.entries(semua)) {
    if (!entri || !Array.isArray(entri.items) || entri.items.length === 0) continue;
    if (
      typeof entri.disimpanFinalPada === 'number' &&
      sekarangMs - entri.disimpanFinalPada > BATAS_SIMPAN_SAMPAH_MS
    ) {
      continue;
    }
    hasil[id] = entri;
  }
  return hasil;
}

export function bacaSemuaSampahGame(sekarangMs = Date.now()): Record<string, CatatanSampahPerGame> {
  const mentah = bacaStorage<Record<string, CatatanSampahPerGame>>(STORAGE_KEYS.WIZARD_TRASH, {});
  if (!mentah || typeof mentah !== 'object' || Array.isArray(mentah)) {
    return {};
  }
  const dibersihkan = bersihkanSampahKedaluwarsa(mentah, sekarangMs);
  if (Object.keys(dibersihkan).length !== Object.keys(mentah).length) {
    tulisStorage(STORAGE_KEYS.WIZARD_TRASH, dibersihkan);
  }
  return dibersihkan;
}

export function bacaSampahGame(gameId: string, sekarangMs = Date.now()): ItemSampahSoal[] {
  if (!gameId) return [];
  const semua = bacaSemuaSampahGame(sekarangMs);
  const entri = semua[gameId];
  if (entri && Array.isArray(entri.items)) {
    return entri.items;
  }
  const draf = bacaDrafWizardGame(gameId);
  return Array.isArray(draf?.tempatSampah) ? draf.tempatSampah : [];
}

export function simpanSampahGame(
  gameId: string,
  items: ItemSampahSoal[],
  opsi?: { disimpanFinalPada?: number }
): boolean {
  if (!gameId) return false;
  const semua = bacaSemuaSampahGame();
  const salinan = { ...semua };
  if (items.length === 0) {
    delete salinan[gameId];
  } else {
    const lama = salinan[gameId];
    salinan[gameId] = {
      gameId,
      items: items.map((it) => ({
        ...it,
        soal: { ...it.soal, pilihan: [...it.soal.pilihan] },
      })),
      ...(opsi?.disimpanFinalPada !== undefined
        ? { disimpanFinalPada: opsi.disimpanFinalPada }
        : lama?.disimpanFinalPada !== undefined
          ? { disimpanFinalPada: lama.disimpanFinalPada }
          : {}),
      diubahPada: Date.now(),
    };
  }
  return tulisStorage(STORAGE_KEYS.WIZARD_TRASH, salinan);
}

export function tandaiSampahGameDisimpanFinal(gameId: string, sekarangMs = Date.now()): void {
  if (!gameId) return;
  const semua = bacaSemuaSampahGame(sekarangMs);
  const entri = semua[gameId];
  if (!entri || entri.items.length === 0) {
    if (entri) {
      const salinan = { ...semua };
      delete salinan[gameId];
      tulisStorage(STORAGE_KEYS.WIZARD_TRASH, salinan);
    }
    return;
  }
  simpanSampahGame(gameId, entri.items, { disimpanFinalPada: sekarangMs });
}

export function hapusSampahGame(gameId: string): void {
  if (!gameId) return;
  const semua = bacaSemuaSampahGame();
  if (!(gameId in semua)) return;
  const salinan = { ...semua };
  delete salinan[gameId];
  tulisStorage(STORAGE_KEYS.WIZARD_TRASH, salinan);
}

let penghitungUrutanHapus = 0;

export function buatEntriSampahBatch(
  terhapusDenganPosisi: { soal: DraftSoal; posisiSemula: number }[],
  waktuMs = Date.now()
): ItemSampahSoal[] {
  penghitungUrutanHapus += 1;
  const urutan = penghitungUrutanHapus;
  const grupHapusId = `hapus_${waktuMs}_${urutan}`;
  return terhapusDenganPosisi.map(({ soal, posisiSemula }) => ({
    id: soal.id,
    soal: {
      ...soal,
      pilihan: [...soal.pilihan],
    },
    posisiSemula: Math.max(0, posisiSemula),
    dihapusPada: waktuMs,
    urutanHapus: urutan,
    grupHapusId,
  }));
}

/**
 * Mengembalikan daftar soal baru dengan item yang dipulihkan disisipkan ke posisi semula
 * (atau posisi terdekat yang tersedia jika panjang daftar berubah), sambil mempertahankan
 * urutan asli ketika beberapa soal dikembalikan bersamaan.
 */
export function pulihkanItemKeDaftar(
  daftarSaatIni: readonly DraftSoal[],
  itemDipulihkan: readonly ItemSampahSoal[]
): { daftarBaru: DraftSoal[]; idDipulihkan: string[] } {
  const hasil: DraftSoal[] = daftarSaatIni.map((d) => ({
    ...d,
    pilihan: [...d.pilihan],
  }));
  const idSudahAda = new Set(hasil.map((d) => d.id));
  const idDipulihkan: string[] = [];

  // Kelompokkan berdasarkan grupHapusId / urutanHapus terbaru lebih dulu,
  // dan di dalam satu batch urutkan posisiSemula menaik agar posisi indeks tetap presisi.
  const grupUrut = new Map<string, { urutan: number; waktu: number; items: ItemSampahSoal[] }>();
  for (const item of itemDipulihkan) {
    const kunciGrup = item.grupHapusId || `${item.dihapusPada}:${item.urutanHapus ?? 0}`;
    const existing = grupUrut.get(kunciGrup);
    if (existing) {
      existing.items.push(item);
    } else {
      grupUrut.set(kunciGrup, {
        urutan: item.urutanHapus ?? 0,
        waktu: item.dihapusPada ?? 0,
        items: [item],
      });
    }
  }

  const daftarGrup = Array.from(grupUrut.values()).sort((a, b) => {
    if (b.waktu !== a.waktu) return b.waktu - a.waktu;
    return b.urutan - a.urutan;
  });

  for (const grup of daftarGrup) {
    const sortedBatch = [...grup.items].sort((a, b) => a.posisiSemula - b.posisiSemula);
    for (const entry of sortedBatch) {
      if (idSudahAda.has(entry.soal.id)) continue;
      const targetIdx = Math.max(0, Math.min(entry.posisiSemula, hasil.length));
      hasil.splice(targetIdx, 0, {
        ...entry.soal,
        pilihan: [...entry.soal.pilihan],
      });
      idSudahAda.add(entry.soal.id);
      idDipulihkan.push(entry.soal.id);
    }
  }

  return { daftarBaru: hasil, idDipulihkan };
}

export function bacaSesiMasukWizard(): SesiMasukWizard | null {
  const data = bacaStorage<SesiMasukWizard | null>(STORAGE_KEYS.WIZARD_SESSION, null);
  if (!data || typeof data !== 'object') return null;
  if (data.mode !== 'baru' && data.mode !== 'edit' && data.mode !== 'lanjut_draf') {
    return null;
  }
  return {
    mode: data.mode,
    gameId: typeof data.gameId === 'string' ? data.gameId : null,
  };
}

export function simpanSesiMasukWizard(sesi: SesiMasukWizard | null): void {
  tulisStorage(STORAGE_KEYS.WIZARD_SESSION, sesi);
}

export function bolehBukaLangkahWizard(
  target: LangkahWizard,
  langkahSelesaiMaks: number,
  sudahAdaGame: boolean
): boolean {
  if (target === 1) return true;
  if (!sudahAdaGame) return false;
  return target <= langkahSelesaiMaks + 1;
}

/**
 * Peringatan merah "Dokumen kemungkinan tidak terbaca..." hanya muncul bila
 * hasil baca sangat sedikit dibanding isi dokumen atau masalah menyebar luas.
 * Untuk 1-2 soal bermasalah di antara banyak soal, cukup label kuning pada soalnya.
 */
export function apakahPeringatanGagalBacaLuas(
  totalSoal: number,
  jumlahBermasalah: number,
  indikasiGagalBacaBesar?: boolean,
  jumlahBarisMentah = 0
): boolean {
  if (totalSoal === 0) {
    return jumlahBarisMentah >= 3;
  }
  if (!indikasiGagalBacaBesar) {
    return false;
  }
  if (totalSoal <= 2) {
    return true;
  }
  if (jumlahBermasalah <= 2) {
    return false;
  }
  return jumlahBermasalah >= Math.max(3, Math.ceil(totalSoal * 0.35));
}

export interface ItemDraftTerurut {
  item: DraftSoal;
  indeksAsli: number;
}

/**
 * Mengurutkan soal bermasalah & perlu dicek ke paling atas tanpa mengubah indeks asli array.
 */
export function urutkanDraftBermasalahDiAtas(
  daftar: readonly DraftSoal[]
): ItemDraftTerurut[] {
  const bobot = (d: DraftSoal): number => {
    const keyakinan = d.keyakinan ?? (d.masalah.length > 0 ? 'bermasalah' : 'yakin');
    if (keyakinan === 'bermasalah') return 0;
    if (keyakinan === 'perlu_dicek') return 1;
    return 2;
  };
  return daftar
    .map((item, indeksAsli) => ({ item, indeksAsli }))
    .sort((a, b) => {
      const diff = bobot(a.item) - bobot(b.item);
      return diff !== 0 ? diff : a.indeksAsli - b.indeksAsli;
    });
}

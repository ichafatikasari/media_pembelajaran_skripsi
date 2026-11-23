import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Game } from '../data/types';
import {
  ambilKodeErrorFirebase,
  apakahPerangkatOnline,
  firebaseTersedia,
  firestoreDb,
  handleFirestoreError,
  OperationType,
  terjemahkanErrorFirebase,
} from '../lib/firebase';
import { ambilAlamatAplikasiDasar } from '../utils/alamatAplikasi';
import {
  dekompresPayloadKeGame,
  kompresGameKePayloadV2,
  VERSI_SKEMA_RINGKAS_V2,
} from '../utils/paketGame';
import { bacaStorage, tulisStorage } from '../utils/storage';

export const KOLEKSI_GAME_ONLINE = 'game_online';
export const ALFABET_KODE_ONLINE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PANJANG_KODE_ONLINE = 8;
export const BATAS_MAKS_GAME_ONLINE_GURU = 20;
export const BATAS_PAYLOAD_FIRESTORE = 900_000;
export const PILIHAN_MASA_BERLAKU_HARI = [7, 30, 90] as const;
export type MasaBerlakuHari = (typeof PILIHAN_MASA_BERLAKU_HARI)[number];

const KEY_PETA_KODE_LOKAL = 'duel_otak_kode_online_map_v1';

export interface RingkasanGameOnline {
  kode: string;
  ownerUid: string;
  judul: string;
  mapel: string;
  jumlahSoal: number;
  skema: number;
  dibuatPadaMs: number;
  diubahPadaMs: number;
  kedaluwarsaPadaMs: number;
  sudahKedaluwarsa: boolean;
}

export type HasilTerbitOnline =
  | { ok: true; item: RingkasanGameOnline; url: string }
  | { ok: false; pesanError: string };

export type HasilDaftarOnline =
  | { ok: true; daftar: RingkasanGameOnline[] }
  | { ok: false; pesanError: string };

export type HasilBukaOnline =
  | { ok: true; game: Game; info: RingkasanGameOnline }
  | {
      ok: false;
      alasan: 'tidak_ditemukan' | 'kedaluwarsa' | 'offline' | 'rusak' | 'kuota' | 'kode_tidak_valid';
      pesanError: string;
    };

export type HasilAksiOnline =
  | { ok: true; item?: RingkasanGameOnline }
  | { ok: false; pesanError: string };

export function buatKodeGameAcak(panjang = PANJANG_KODE_ONLINE): string {
  const n = ALFABET_KODE_ONLINE.length;
  let hasil = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(panjang);
    crypto.getRandomValues(buf);
    for (let i = 0; i < panjang; i += 1) {
      hasil += ALFABET_KODE_ONLINE[buf[i] % n];
    }
    return hasil;
  }
  for (let i = 0; i < panjang; i += 1) {
    hasil += ALFABET_KODE_ONLINE[Math.floor(Math.random() * n)];
  }
  return hasil;
}

export function normalisasiKodeOnline(input: string): string {
  return input.replace(/[\s-]+/g, '').trim().toUpperCase();
}

export function validasiFormatKodeOnline(kode: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(normalisasiKodeOnline(kode));
}

export function formatKodeKelompok(kode: string): string {
  const bersih = normalisasiKodeOnline(kode).slice(0, PANJANG_KODE_ONLINE);
  if (bersih.length <= 4) return bersih;
  return `${bersih.slice(0, 4)} ${bersih.slice(4)}`;
}

export interface HasilProsesInputKode {
  kodeBersih: string;
  adaKarakterTerlarang: boolean;
  pesanPeringatan: string | null;
  dariLinkPenuh: boolean;
}

export function prosesInputKodeKetik(input: string): HasilProsesInputKode {
  const mentah = input.trim();
  const cocokLink = mentah.match(/#?\/g\/([^?#/\s]+)/i);
  const dariLinkPenuh = Boolean(cocokLink);
  const sumber = cocokLink ? cocokLink[1] : mentah;
  const kapitalTanpaPemisah = sumber.toUpperCase().replace(/[\s-]+/g, '');
  const adaKarakterTerlarang = /[IO01]/.test(kapitalTanpaPemisah);
  const kodeBersih = kapitalTanpaPemisah
    .replace(/[^A-HJ-NP-Z2-9]/g, '')
    .slice(0, PANJANG_KODE_ONLINE);

  return {
    kodeBersih,
    adaKarakterTerlarang,
    pesanPeringatan: adaKarakterTerlarang
      ? 'Kode tidak memakai huruf I, O dan angka 0, 1'
      : null,
    dariLinkPenuh,
  };
}

export function ekstrakKodeOnlineDariHash(hash: string): string {
  const bersih = hash.replace(/^#/, '');
  const prefix = '/g/';
  const idx = bersih.indexOf(prefix);
  if (idx === -1) return '';
  const sisa = bersih.slice(idx + prefix.length).split('?')[0].split('/')[0];
  return normalisasiKodeOnline(sisa);
}

export function buatUrlGameOnline(kode: string, baseUrl?: string): string {
  const dasar = baseUrl ?? ambilAlamatAplikasiDasar();
  return `${dasar}#/g/${normalisasiKodeOnline(kode)}`;
}

function hitungTimestampKedaluwarsa(hari: MasaBerlakuHari): Timestamp {
  // Kurangi 2 menit (120.000 ms) agar perbedaan jam perangkat vs server tidak menolak pilihan 90 hari
  const msMasaBerlaku = hari * 86_400_000 - 120_000;
  return Timestamp.fromMillis(Date.now() + msMasaBerlaku);
}

function konversiTimestampKeMs(nilai: unknown): number {
  if (nilai && typeof nilai === 'object' && 'toMillis' in nilai) {
    const fn = (nilai as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') {
      return fn.call(nilai);
    }
  }
  if (typeof nilai === 'number' && Number.isFinite(nilai)) return nilai;
  return 0;
}

export function ambilKodeOnlineTersimpanUntukGame(gameId: string): string | null {
  const peta = bacaStorage<Record<string, string>>(KEY_PETA_KODE_LOKAL, {});
  const kode = peta[gameId];
  return kode && validasiFormatKodeOnline(kode) ? kode : null;
}

export function simpanKodeOnlineUntukGame(gameId: string, kode: string): void {
  const peta = bacaStorage<Record<string, string>>(KEY_PETA_KODE_LOKAL, {});
  peta[gameId] = normalisasiKodeOnline(kode);
  tulisStorage(KEY_PETA_KODE_LOKAL, peta);
}

export function hapusPetaKodeOnlineUntukGame(gameId: string): void {
  const peta = bacaStorage<Record<string, string>>(KEY_PETA_KODE_LOKAL, {});
  if (gameId in peta) {
    delete peta[gameId];
    tulisStorage(KEY_PETA_KODE_LOKAL, peta);
  }
}

export function hapusPetaKodeOnlineBerdasarkanKode(kode: string): void {
  const kodeBersih = normalisasiKodeOnline(kode);
  const peta = bacaStorage<Record<string, string>>(KEY_PETA_KODE_LOKAL, {});
  let berubah = false;
  for (const [id, val] of Object.entries(peta)) {
    if (val === kodeBersih) {
      delete peta[id];
      berubah = true;
    }
  }
  if (berubah) {
    tulisStorage(KEY_PETA_KODE_LOKAL, peta);
  }
}

function pastikanFirestoreSiap(): { ok: true; db: NonNullable<typeof firestoreDb> } | { ok: false; pesanError: string } {
  if (!firebaseTersedia || !firestoreDb || !apakahPerangkatOnline()) {
    return {
      ok: false,
      pesanError: 'Fitur online belum tersedia, gunakan paket berkas.',
    };
  }
  return { ok: true, db: firestoreDb };
}

function siapkanDataPayloadGame(game: Game):
  | {
      ok: true;
      judul: string;
      mapel: string;
      jumlahSoal: number;
      payload: string;
    }
  | { ok: false; pesanError: string } {
  if (game.soal.length === 0) {
    return { ok: false, pesanError: 'Game belum memiliki soal untuk diterbitkan online.' };
  }

  const judul = game.judul.trim().slice(0, 120) || 'Game Duel Otak';
  const mapel = (game.mapel || 'Umum').trim().slice(0, 80) || 'Umum';
  const payload = kompresGameKePayloadV2(game, { sertakanPenjelasan: true });

  if (payload.length > BATAS_PAYLOAD_FIRESTORE) {
    return {
      ok: false,
      pesanError:
        'Ukuran data game terlalu besar untuk penyimpanan online (batas ~900 KB). Kurangi teks yang terlalu panjang atau gunakan Unduh Paket (.json).',
    };
  }

  return {
    ok: true,
    judul,
    mapel,
    jumlahSoal: game.soal.length,
    payload,
  };
}

export async function ambilDaftarGameOnlineGuru(uid: string): Promise<HasilDaftarOnline> {
  const siap = pastikanFirestoreSiap();
  if (!siap.ok) return siap;

  try {
    const q = query(collection(siap.db, KOLEKSI_GAME_ONLINE), where('ownerUid', '==', uid));
    const snapshot = await getDocs(q);
    const sekarang = Date.now();
    const daftar: RingkasanGameOnline[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      const kedaluwarsaPadaMs = konversiTimestampKeMs(d.kedaluwarsaPada);
      return {
        kode: docSnap.id,
        ownerUid: String(d.ownerUid ?? uid),
        judul: String(d.judul ?? 'Tanpa Judul'),
        mapel: String(d.mapel ?? 'Umum'),
        jumlahSoal: typeof d.jumlahSoal === 'number' ? d.jumlahSoal : 0,
        skema: typeof d.skema === 'number' ? d.skema : VERSI_SKEMA_RINGKAS_V2,
        dibuatPadaMs: konversiTimestampKeMs(d.dibuatPada),
        diubahPadaMs: konversiTimestampKeMs(d.diubahPada),
        kedaluwarsaPadaMs,
        sudahKedaluwarsa: kedaluwarsaPadaMs > 0 && kedaluwarsaPadaMs <= sekarang,
      };
    });

    daftar.sort((a, b) => b.diubahPadaMs - a.diubahPadaMs);
    return { ok: true, daftar };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'permission-denied') {
      try {
        handleFirestoreError(error, OperationType.LIST, KOLEKSI_GAME_ONLINE);
      } catch (errTerbungkus) {
        return { ok: false, pesanError: terjemahkanErrorFirebase(errTerbungkus, 'kelola') };
      }
    }
    return { ok: false, pesanError: terjemahkanErrorFirebase(error, 'kelola') };
  }
}

export async function terbitkanGameOnline({
  game,
  uid,
  masaBerlakuHari = 30,
}: {
  game: Game;
  uid: string;
  masaBerlakuHari?: MasaBerlakuHari;
}): Promise<HasilTerbitOnline> {
  const siap = pastikanFirestoreSiap();
  if (!siap.ok) return siap;

  const dataSiap = siapkanDataPayloadGame(game);
  if (!dataSiap.ok) return dataSiap;

  // Cek batas maksimal 20 game online per guru (sekali baca getDocs)
  const daftarSaatIni = await ambilDaftarGameOnlineGuru(uid);
  if (!daftarSaatIni.ok) {
    return { ok: false, pesanError: daftarSaatIni.pesanError };
  }
  if (daftarSaatIni.daftar.length >= BATAS_MAKS_GAME_ONLINE_GURU) {
    return {
      ok: false,
      pesanError: `Anda sudah mencapai batas ${BATAS_MAKS_GAME_ONLINE_GURU} game online aktif. Hapus game online lama di halaman "Game Online Saya" terlebih dahulu.`,
    };
  }

  // Cari kode unik 8 karakter yang belum terpakai
  let kodeTerpilih = '';
  for (let percobaan = 0; percobaan < 5; percobaan += 1) {
    const kandidat = buatKodeGameAcak();
    const pathDoc = `${KOLEKSI_GAME_ONLINE}/${kandidat}`;
    try {
      const cekSnap = await getDoc(doc(siap.db, KOLEKSI_GAME_ONLINE, kandidat));
      if (!cekSnap.exists()) {
        kodeTerpilih = kandidat;
        break;
      }
    } catch (error) {
      const code = ambilKodeErrorFirebase(error);
      if (code === 'permission-denied') {
        // Kode sudah ada milik orang lain dan kedaluwarsa -> coba kode lain
        continue;
      }
      return { ok: false, pesanError: terjemahkanErrorFirebase(error, 'terbit') };
    }
    if (percobaan === 4) {
      return {
        ok: false,
        pesanError: `Gagal menemukan kode kosong pada ${pathDoc}. Silakan coba klik Terbitkan lagi.`,
      };
    }
  }

  if (!kodeTerpilih) {
    return { ok: false, pesanError: 'Gagal membuat kode unik game online. Silakan coba lagi.' };
  }

  const tsKedaluwarsa = hitungTimestampKedaluwarsa(masaBerlakuHari);
  const pathTarget = `${KOLEKSI_GAME_ONLINE}/${kodeTerpilih}`;

  try {
    await setDoc(doc(siap.db, KOLEKSI_GAME_ONLINE, kodeTerpilih), {
      ownerUid: uid,
      judul: dataSiap.judul,
      mapel: dataSiap.mapel,
      jumlahSoal: dataSiap.jumlahSoal,
      skema: VERSI_SKEMA_RINGKAS_V2,
      payload: dataSiap.payload,
      dibuatPada: serverTimestamp(),
      diubahPada: serverTimestamp(),
      kedaluwarsaPada: tsKedaluwarsa,
    });

    simpanKodeOnlineUntukGame(game.id, kodeTerpilih);

    const sekarang = Date.now();
    const item: RingkasanGameOnline = {
      kode: kodeTerpilih,
      ownerUid: uid,
      judul: dataSiap.judul,
      mapel: dataSiap.mapel,
      jumlahSoal: dataSiap.jumlahSoal,
      skema: VERSI_SKEMA_RINGKAS_V2,
      dibuatPadaMs: sekarang,
      diubahPadaMs: sekarang,
      kedaluwarsaPadaMs: tsKedaluwarsa.toMillis(),
      sudahKedaluwarsa: false,
    };

    return {
      ok: true,
      item,
      url: buatUrlGameOnline(kodeTerpilih),
    };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'permission-denied') {
      try {
        handleFirestoreError(error, OperationType.CREATE, pathTarget);
      } catch (errTerbungkus) {
        return { ok: false, pesanError: terjemahkanErrorFirebase(errTerbungkus, 'terbit') };
      }
    }
    return { ok: false, pesanError: terjemahkanErrorFirebase(error, 'terbit') };
  }
}

export async function perpanjangGameOnline(
  kode: string,
  masaBerlakuHari: MasaBerlakuHari
): Promise<HasilAksiOnline> {
  const siap = pastikanFirestoreSiap();
  if (!siap.ok) return siap;

  const kodeBersih = normalisasiKodeOnline(kode);
  if (!validasiFormatKodeOnline(kodeBersih)) {
    return { ok: false, pesanError: 'Format kode game online tidak valid.' };
  }

  const tsBaru = hitungTimestampKedaluwarsa(masaBerlakuHari);
  const pathTarget = `${KOLEKSI_GAME_ONLINE}/${kodeBersih}`;

  try {
    await updateDoc(doc(siap.db, KOLEKSI_GAME_ONLINE, kodeBersih), {
      kedaluwarsaPada: tsBaru,
      diubahPada: serverTimestamp(),
    });
    return { ok: true };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'permission-denied') {
      try {
        handleFirestoreError(error, OperationType.UPDATE, pathTarget);
      } catch (errTerbungkus) {
        return { ok: false, pesanError: terjemahkanErrorFirebase(errTerbungkus, 'kelola') };
      }
    }
    return { ok: false, pesanError: terjemahkanErrorFirebase(error, 'kelola') };
  }
}

export async function perbaruiIsiGameOnline(
  kode: string,
  game: Game,
  perpanjangHariOpsional?: MasaBerlakuHari
): Promise<HasilAksiOnline> {
  const siap = pastikanFirestoreSiap();
  if (!siap.ok) return siap;

  const kodeBersih = normalisasiKodeOnline(kode);
  if (!validasiFormatKodeOnline(kodeBersih)) {
    return { ok: false, pesanError: 'Format kode game online tidak valid.' };
  }

  const dataSiap = siapkanDataPayloadGame(game);
  if (!dataSiap.ok) return dataSiap;

  const pathTarget = `${KOLEKSI_GAME_ONLINE}/${kodeBersih}`;
  const pembaruan: Record<string, unknown> = {
    judul: dataSiap.judul,
    mapel: dataSiap.mapel,
    jumlahSoal: dataSiap.jumlahSoal,
    skema: VERSI_SKEMA_RINGKAS_V2,
    payload: dataSiap.payload,
    diubahPada: serverTimestamp(),
  };

  if (perpanjangHariOpsional) {
    pembaruan.kedaluwarsaPada = hitungTimestampKedaluwarsa(perpanjangHariOpsional);
  }

  try {
    await updateDoc(doc(siap.db, KOLEKSI_GAME_ONLINE, kodeBersih), pembaruan);
    simpanKodeOnlineUntukGame(game.id, kodeBersih);
    return { ok: true };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'permission-denied') {
      try {
        handleFirestoreError(error, OperationType.UPDATE, pathTarget);
      } catch (errTerbungkus) {
        return { ok: false, pesanError: terjemahkanErrorFirebase(errTerbungkus, 'kelola') };
      }
    }
    return { ok: false, pesanError: terjemahkanErrorFirebase(error, 'kelola') };
  }
}

export async function hapusGameOnline(kode: string): Promise<HasilAksiOnline> {
  const siap = pastikanFirestoreSiap();
  if (!siap.ok) return siap;

  const kodeBersih = normalisasiKodeOnline(kode);
  if (!validasiFormatKodeOnline(kodeBersih)) {
    return { ok: false, pesanError: 'Format kode game online tidak valid.' };
  }

  const pathTarget = `${KOLEKSI_GAME_ONLINE}/${kodeBersih}`;

  try {
    await deleteDoc(doc(siap.db, KOLEKSI_GAME_ONLINE, kodeBersih));
    hapusPetaKodeOnlineBerdasarkanKode(kodeBersih);
    return { ok: true };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'permission-denied') {
      try {
        handleFirestoreError(error, OperationType.DELETE, pathTarget);
      } catch (errTerbungkus) {
        return { ok: false, pesanError: terjemahkanErrorFirebase(errTerbungkus, 'kelola') };
      }
    }
    return { ok: false, pesanError: terjemahkanErrorFirebase(error, 'kelola') };
  }
}

export async function ambilGameOnlineDariKode(kodeInput: string): Promise<HasilBukaOnline> {
  const kodeBersih = normalisasiKodeOnline(kodeInput);
  if (!validasiFormatKodeOnline(kodeBersih)) {
    return {
      ok: false,
      alasan: 'kode_tidak_valid',
      pesanError:
        'Kode link game tidak valid. Kode harus terdiri dari 8 huruf/angka (tanpa huruf I, O, atau angka 0, 1).',
    };
  }

  if (!firebaseTersedia || !firestoreDb || !apakahPerangkatOnline()) {
    return {
      ok: false,
      alasan: 'offline',
      pesanError: 'Fitur online belum tersedia, gunakan paket berkas.',
    };
  }

  try {
    const docSnap = await getDoc(doc(firestoreDb, KOLEKSI_GAME_ONLINE, kodeBersih));
    if (!docSnap.exists()) {
      return {
        ok: false,
        alasan: 'tidak_ditemukan',
        pesanError: 'Kode game tidak ditemukan atau sudah dihapus oleh pembuatnya.',
      };
    }

    const d = docSnap.data();
    const kedaluwarsaPadaMs = konversiTimestampKeMs(d.kedaluwarsaPada);
    if (kedaluwarsaPadaMs > 0 && kedaluwarsaPadaMs <= Date.now()) {
      return {
        ok: false,
        alasan: 'kedaluwarsa',
        pesanError: 'Masa berlaku game online ini sudah kedaluwarsa.',
      };
    }

    const payload = typeof d.payload === 'string' ? d.payload : '';
    const hasilParse = dekompresPayloadKeGame(payload);
    if (!hasilParse.ok) {
      return {
        ok: false,
        alasan: 'rusak',
        pesanError: `Data game online rusak atau tidak dapat dibaca (${hasilParse.pesanError}).`,
      };
    }

    const info: RingkasanGameOnline = {
      kode: kodeBersih,
      ownerUid: String(d.ownerUid ?? ''),
      judul: String(d.judul ?? hasilParse.game.judul),
      mapel: String(d.mapel ?? hasilParse.game.mapel),
      jumlahSoal:
        typeof d.jumlahSoal === 'number' ? d.jumlahSoal : hasilParse.game.soal.length,
      skema: typeof d.skema === 'number' ? d.skema : hasilParse.versiSkema,
      dibuatPadaMs: konversiTimestampKeMs(d.dibuatPada),
      diubahPadaMs: konversiTimestampKeMs(d.diubahPada),
      kedaluwarsaPadaMs,
      sudahKedaluwarsa: false,
    };

    return {
      ok: true,
      game: hasilParse.game,
      info,
    };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'resource-exhausted') {
      return {
        ok: false,
        alasan: 'kuota',
        pesanError: 'Layanan sedang penuh, coba lagi nanti atau gunakan paket berkas.',
      };
    }
    if (code === 'permission-denied') {
      return {
        ok: false,
        alasan: 'kedaluwarsa',
        pesanError: 'Game online ini sudah kedaluwarsa atau aksesnya sudah ditutup.',
      };
    }
    if (code === 'unavailable') {
      return {
        ok: false,
        alasan: 'offline',
        pesanError: 'Fitur online belum tersedia, gunakan paket berkas.',
      };
    }
    return {
      ok: false,
      alasan: 'offline',
      pesanError: terjemahkanErrorFirebase(error, 'buka'),
    };
  }
}

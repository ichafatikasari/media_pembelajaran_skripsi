import assert from 'node:assert/strict';
import { muatDaftarGameDariStorage, muatGameAktifIdAwal } from '../app/store';
import { Game } from '../data/types';
import { STORAGE_KEYS } from '../utils/constants';
import {
  bacaDaftarSampahGame,
  BATAS_SIMPAN_SAMPAH_GAME_MS,
  bersihkanSampahGameKedaluwarsa,
  masukkanGameKeSampah,
  pulihkanGameDariSampah,
  simpanDaftarSampahGame,
} from '../utils/sampahGame';
import { bacaStorageRaw, hapusStorage, tulisStorage } from '../utils/storage';
import { buatPengaturanDefault } from './gameEngine';

// Pasang mock window.localStorage untuk menyimulasikan penyimpanan browser & muat ulang halaman
const penyimpananMock = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => (penyimpananMock.has(k) ? penyimpananMock.get(k)! : null),
    setItem: (k: string, v: string) => {
      penyimpananMock.set(k, String(v));
    },
    removeItem: (k: string) => {
      penyimpananMock.delete(k);
    },
  },
};

function resetSemuaStorage(): void {
  penyimpananMock.clear();
  hapusStorage(STORAGE_KEYS.GAMES);
  hapusStorage(STORAGE_KEYS.ACTIVE_GAME_ID);
  hapusStorage(STORAGE_KEYS.GAME_TRASH);
}

function buatGameUji(id: string, judul: string, jumlahSoal = 4): Game {
  const pengaturan = buatPengaturanDefault();
  pengaturan.durasiWaktu = 5;
  pengaturan.namaTim = ['Tim Elang', 'Tim Harimau', 'Tim Rajawali', 'Tim Singa'];
  return {
    id,
    judul,
    mapel: 'Umum',
    namaSekolah: 'SMP Uji',
    status: 'siap',
    dibuatPada: 1000,
    diubahPada: 2000,
    pengaturan,
    soal: Array.from({ length: jumlahSoal }, (_, idx) => ({
      id: `${id}_s${idx + 1}`,
      pertanyaan: `Pertanyaan ${idx + 1} dari ${judul}?`,
      pilihan: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
      kunci: idx % 4,
    })),
  };
}

// 1. Kunjungan pertama (kunci belum pernah ada) mengisi contoh bawaan
resetSemuaStorage();
const awalPertama = muatDaftarGameDariStorage();
assert.equal(awalPertama.length, 1, 'Kunjungan pertama harus mengisi 1 game contoh bawaan');
const aktifAwal = muatGameAktifIdAwal(awalPertama);
assert.equal(aktifAwal, awalPertama[0].id, 'Game contoh menjadi aktif di kunjungan pertama');

// 2. Dengan 3 game: hapus satu per satu sampai 0, semuanya berhasil & penyimpanan menulis []
resetSemuaStorage();
const g1 = buatGameUji('g1', 'ms word', 10);
const g2 = buatGameUji('g2', 'Matematika Dasar', 6);
const g3 = buatGameUji('g3', 'IPA Kelas 7', 8);
tulisStorage(STORAGE_KEYS.GAMES, [g1, g2, g3]);
tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, 'g1');

let daftar = muatDaftarGameDariStorage();
let aktifId = muatGameAktifIdAwal(daftar);
let sampah = bacaDaftarSampahGame().daftar;
assert.equal(daftar.length, 3);
assert.equal(aktifId, 'g1');

// Hapus g3 (non-aktif) -> sisa 2
({ daftarSampahBaru: sampah } = masukkanGameKeSampah(sampah, [g3], { gameAktifId: aktifId }));
daftar = daftar.filter((g) => g.id !== 'g3');
tulisStorage(STORAGE_KEYS.GAMES, daftar);
simpanDaftarSampahGame(sampah);
assert.equal(daftar.length, 2);

// Hapus g2 -> sisa 1
({ daftarSampahBaru: sampah } = masukkanGameKeSampah(sampah, [g2], { gameAktifId: aktifId }));
daftar = daftar.filter((g) => g.id !== 'g2');
tulisStorage(STORAGE_KEYS.GAMES, daftar);
simpanDaftarSampahGame(sampah);
assert.equal(daftar.length, 1);

// Hapus game terakhir (g1 yang juga aktif) -> sisa 0 dan pilihan aktif kosong
({ daftarSampahBaru: sampah } = masukkanGameKeSampah(sampah, [g1], { gameAktifId: aktifId }));
daftar = daftar.filter((g) => g.id !== 'g1');
tulisStorage(STORAGE_KEYS.GAMES, daftar);
simpanDaftarSampahGame(sampah);
if (daftar.length === 0 || !daftar.some((g) => g.id === aktifId)) {
  aktifId = '';
  tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, '');
}
assert.equal(daftar.length, 0, 'Game terakhir harus bisa dihapus hingga 0');
assert.equal(aktifId, '', 'Pilihan game aktif harus kosong saat game aktif dihapus');
assert.equal(
  bacaStorageRaw(STORAGE_KEYS.GAMES),
  '[]',
  'Penyimpanan harus benar-benar menulis array kosong []'
);
console.log('LULUS: (1) Hapus 3 game satu per satu hingga 0 dan kosongkan game aktif');

// 3. Simulasi muat ulang halaman saat daftar kosong: tetap kosong, tidak membuat ulang game contoh
const setelahReload = muatDaftarGameDariStorage();
const aktifSetelahReload = muatGameAktifIdAwal(setelahReload);
assert.equal(setelahReload.length, 0, 'Setelah reload, daftar game harus tetap kosong (0)');
assert.equal(aktifSetelahReload, '', 'Setelah reload, gameAktifId tetap kosong');
console.log('LULUS: (2) Muat ulang halaman mempertahankan daftar kosong tanpa membuat ulang contoh');

// 4. Dengan tepat 1 game: hapus berhasil -> 0, lalu URUNGKAN mengembalikan game utuh + aktif
resetSemuaStorage();
const tunggal = buatGameUji('tunggal', 'ms word', 15);
tulisStorage(STORAGE_KEYS.GAMES, [tunggal]);
tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, tunggal.id);

const resMasuk = masukkanGameKeSampah([], [tunggal], {
  gameAktifId: tunggal.id,
  ambilKodeOnline: () => 'ABCD2345',
});
tulisStorage(STORAGE_KEYS.GAMES, []);
tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, '');
simpanDaftarSampahGame(resMasuk.daftarSampahBaru);
assert.equal(muatDaftarGameDariStorage().length, 0, 'Tepat 1 game berhasil dihapus sampai 0');

// Urungkan hapus berdasarkan batchHapusId
const batchIds = resMasuk.daftarSampahBaru
  .filter((it) => it.batchHapusId === resMasuk.batchHapusId)
  .map((it) => it.id);
const hasilPulih = pulihkanGameDariSampah([], resMasuk.daftarSampahBaru, batchIds);
assert.equal(hasilPulih.dipulihkan.length, 1);
assert.equal(hasilPulih.daftarGameBaru.length, 1, 'URUNGKAN mengembalikan game terakhir');
assert.equal(hasilPulih.daftarGameBaru[0].judul, 'ms word');
assert.equal(hasilPulih.daftarGameBaru[0].soal.length, 15, 'Seluruh soal kembali utuh');
assert.equal(
  hasilPulih.daftarGameBaru[0].pengaturan.durasiWaktu,
  5,
  'Seluruh pengaturan kembali utuh'
);
assert.equal(hasilPulih.dipulihkan[0].sebelumnyaAktif, true, 'Status aktif sebelumnya tercatat');
assert.equal(hasilPulih.dipulihkan[0].kodeOnline, 'ABCD2345', 'Kode online lokal ikut tercatat');
console.log('LULUS: (3) Hapus tepat 1 game & URUNGKAN mengembalikan utuh (soal, pengaturan, status aktif)');

// 5. Hapus massal & kedaluwarsa Sampah Game > 7 hari
const sekarang = 1_700_000_000_000;
const masal = masukkanGameKeSampah([], [g1, g2], { sekarangMs: sekarang });
assert.equal(masal.daftarSampahBaru.length, 2);
const masihDalam7Hari = bersihkanSampahGameKedaluwarsa(
  masal.daftarSampahBaru,
  sekarang + BATAS_SIMPAN_SAMPAH_GAME_MS - 1000
);
assert.equal(masihDalam7Hari.length, 2, 'Sampah Game bertahan selama < 7 hari');
const lewat7Hari = bersihkanSampahGameKedaluwarsa(
  masal.daftarSampahBaru,
  sekarang + BATAS_SIMPAN_SAMPAH_GAME_MS + 1000
);
assert.equal(lewat7Hari.length, 0, 'Sampah Game kedaluwarsa otomatis setelah 7 hari');
console.log('LULUS: (4) Hapus massal & retensi Sampah Game 7 hari');

console.log('Total lulus: 4/4 skenario uji penghapusan game terakhir & Sampah Game.');

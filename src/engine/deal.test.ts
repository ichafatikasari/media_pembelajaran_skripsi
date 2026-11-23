import { Soal } from '../data/types';
import {
  ambilPemainGiliran,
  bagiSoalPertandingan,
  buatUrutanEstafet,
  parseDaftarNama,
  undiPasanganDuel,
} from './deal';

function buatBankSoalUji(jumlah: number, jumlahCadangan = 0): Soal[] {
  const tingkatList: Soal['tingkat'][] = ['Mudah', 'Sedang', 'Sulit'];
  const topikList = ['Matematika', 'IPA', 'Bahasa'];

  const utama = Array.from({ length: jumlah }, (_, i) => ({
    id: `uji_${i + 1}`,
    pertanyaan: `Pertanyaan uji nomor ${i + 1}?`,
    pilihan: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
    kunci: i % 4,
    tingkat: tingkatList[i % tingkatList.length],
    topik: topikList[Math.floor(i / 3) % topikList.length],
  }));

  const cad = Array.from({ length: jumlahCadangan }, (_, i) => ({
    id: `cad_${i + 1}`,
    pertanyaan: `Pertanyaan cadangan nomor ${i + 1}?`,
    pilihan: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
    kunci: i % 4,
    tingkat: 'Sedang' as const,
    topik: 'Cadangan',
    cadangan: true,
  }));

  return [...utama, ...cad];
}

export function jalankanPengujianDeal(): void {
  const bank = buatBankSoalUji(36, 5);

  // 1. Tidak ada soal dobel antar dek kiri & kanan, dan soal cadangan tidak masuk permainan biasa
  const laga1 = bagiSoalPertandingan(bank, [], 8, 5);
  const idKiri1 = new Set(laga1.dekKiri.map((s) => s.id));
  const idKanan1 = new Set(laga1.dekKanan.map((s) => s.id));
  for (const id of idKiri1) {
    if (idKanan1.has(id)) {
      throw new Error(`Soal ganda antar dek pada laga 1: ${id}`);
    }
  }
  if ([...laga1.dekKiri, ...laga1.dekKanan].some((s) => s.cadangan)) {
    throw new Error('Soal cadangan tidak boleh ikut masuk dek permainan biasa');
  }
  if (laga1.dekKiri.length !== 8 || laga1.dekKanan.length !== 8) {
    throw new Error('Jumlah soal per dek tidak sesuai');
  }
  if (laga1.cadangan.length !== 5 || laga1.cadangan.some((s) => !s.cadangan)) {
    throw new Error('Jumlah soal cadangan harus 5 dan seluruhnya berstatus cadangan');
  }
  const lagaTanpaCadangan = bagiSoalPertandingan(buatBankSoalUji(10, 0), [], 5, 5);
  if (lagaTanpaCadangan.cadangan.length !== 0) {
    throw new Error('Bank tanpa soal cadangan tidak boleh mengisi cadangan dengan soal biasa');
  }
  if (laga1.dekKiriSiswa.some((s) => 'kunci' in s || 'penjelasan' in s)) {
    throw new Error('Dek siswa masih mengandung kunci!');
  }

  // 2. Keseimbangan per tingkat (selisih maksimal 1 per tingkat)
  for (const tingkat of ['Mudah', 'Sedang', 'Sulit']) {
    const jumlahKiri = laga1.ringkasanKiri[tingkat] ?? 0;
    const jumlahKanan = laga1.ringkasanKanan[tingkat] ?? 0;
    if (Math.abs(jumlahKiri - jumlahKanan) > 1) {
      throw new Error(`Pembagian tingkat ${tingkat} tidak seimbang: ${jumlahKiri} vs ${jumlahKanan}`);
    }
  }

  // 3. Tidak berulang antar pertandingan selama bank masih cukup
  const laga2 = bagiSoalPertandingan(bank, laga1.terpakaiIdsSesudah, 7, 5);
  if (laga2.bankDiacakUlang) {
    throw new Error('Seharusnya bank belum diacak ulang karena masih cukup');
  }
  const terpakaiLaga1 = new Set([
    ...laga1.dekKiri.map((s) => s.id),
    ...laga1.dekKanan.map((s) => s.id),
  ]);
  for (const s of [...laga2.dekKiri, ...laga2.dekKanan]) {
    if (terpakaiLaga1.has(s.id)) {
      throw new Error(`Soal ${s.id} berulang di laga 2 padahal bank masih cukup`);
    }
  }

  // 4. Pengacakan ulang otomatis ketika bank habis
  const laga3 = bagiSoalPertandingan(bank, laga2.terpakaiIdsSesudah, 10, 5);
  if (!laga3.bankDiacakUlang) {
    throw new Error('Seharusnya bankDiacakUlang bernilai true saat bank habis');
  }

  // 5. Daftar nama & urutan estafet berputar
  const namaBersih = parseDaftarNama('  Rani  \n\n  Budi   Santoso \n  \n Citra ');
  if (namaBersih.join('|') !== 'Rani|Budi Santoso|Citra') {
    throw new Error('parseDaftarNama gagal membersihkan spasi/baris kosong');
  }
  const estafet = buatUrutanEstafet(namaBersih, 4, 6);
  if (estafet.join('|') !== 'Rani|Budi Santoso|Citra|Rani|Budi Santoso|Citra') {
    throw new Error('Urutan estafet berputar tidak sesuai');
  }
  if (ambilPemainGiliran([], 4, 2) !== 'Pemain 3') {
    throw new Error('Fallback pemain default gagal');
  }

  // 6. Undi pasangan 1 lawan 1
  const pasangan = undiPasanganDuel(['Andi', 'Budi', 'Citra', 'Dewi']);
  if (pasangan.length !== 2) {
    throw new Error('Jumlah pasangan duel salah');
  }
}

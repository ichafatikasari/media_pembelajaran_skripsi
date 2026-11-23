import { strict as assert } from 'node:assert';
import { Game } from '../data/types';
import { terjemahkanErrorFirebase } from '../lib/firebase';
import {
  ALFABET_KODE_ONLINE,
  ambilGameOnlineDariKode,
  BATAS_MAKS_GAME_ONLINE_GURU,
  BATAS_PAYLOAD_FIRESTORE,
  buatKodeGameAcak,
  buatUrlGameOnline,
  ekstrakKodeOnlineDariHash,
  formatKodeKelompok,
  prosesInputKodeKetik,
  validasiFormatKodeOnline,
} from '../services/gameOnlineService';
import {
  ambilAlamatAplikasiDasar,
  resetAlamatAplikasiDasar,
  simpanAlamatAplikasiDasar,
} from '../utils/alamatAplikasi';
import {
  BATAS_KARAKTER_LINK_DATA,
  BATAS_KARAKTER_QR_DATA,
  BATAS_PERINGATAN_LINK_DATA,
  buatLinkBerbagiGame,
  buatPaketGameJson,
  buatPaketRingkasV2,
  buatQrDataUrl,
  dekompresPayloadKeGame,
  kompresGameKePayloadV2,
  validasiDanParsePaketGame,
} from '../utils/paketGame';
import {
  bacaRiwayatDibuka,
  BATAS_MAKS_RIWAYAT_DIBUKA,
  catatRiwayatDibuka,
  hapusSemuaRiwayatDibuka,
} from '../utils/riwayatDibuka';
import { buatPengaturanDefault } from './gameEngine';

function buatGameUji(jumlahSoal: number, panjangKalimat = 1): Game {
  const ekstra = panjangKalimat > 1 ? ` ${'kalimat panjang tambahan untuk menguji kompresi '.repeat(panjangKalimat)}` : '';
  return {
    id: `game_uji_${jumlahSoal}`,
    judul: `Kuis Uji ${jumlahSoal} Soal`,
    mapel: 'Matematika Dasar',
    namaSekolah: 'SD Nusantara',
    status: 'siap',
    dibuatPada: 1700000000000,
    diubahPada: 1700000000000,
    pengaturan: {
      ...buatPengaturanDefault(),
      namaTim: ['Elang Merah', 'Harimau Biru', 'Tim Hijau', 'Tim Kuning'],
      durasiSoal: 15,
    },
    soal: Array.from({ length: jumlahSoal }, (_, idx) => ({
      id: `s_${idx + 1}`,
      pertanyaan: `Berapakah hasil dari (${idx + 2} x ${idx + 3}) + ${idx + 1}${ekstra}?`,
      pilihan: [
        `${(idx + 2) * (idx + 3) + idx + 1}`,
        `${(idx + 2) * (idx + 3) + idx + 2}`,
        `${(idx + 2) * (idx + 3) + idx + 3}`,
        `${(idx + 2) * (idx + 3) + idx + 4}`,
      ],
      kunci: 0,
      tingkat: idx % 2 === 0 ? 'Mudah' : 'Sedang',
      topik: 'Aritmetika',
    })),
  };
}

async function jalankanSemuaUjiTahap8() {
  // 1. Uji generator & validasi kode acak 8 karakter (tanpa I, O, 0, 1)
  assert.equal(BATAS_MAKS_GAME_ONLINE_GURU, 20);
  for (let i = 0; i < 100; i += 1) {
    const kode = buatKodeGameAcak();
    assert.equal(kode.length, 8);
    assert.equal(validasiFormatKodeOnline(kode), true);
    assert.equal(/[IO01]/.test(kode), false, `Kode ${kode} mengandung huruf/angka membingungkan`);
    for (const ch of kode) {
      assert.equal(ALFABET_KODE_ONLINE.includes(ch), true);
    }
  }
  assert.equal(validasiFormatKodeOnline('AB0DEFGH'), false);
  assert.equal(validasiFormatKodeOnline('ABIDEFGH'), false);
  assert.equal(validasiFormatKodeOnline('ABODEFGH'), false);
  assert.equal(validasiFormatKodeOnline('AB1DEFGH'), false);
  assert.equal(ekstrakKodeOnlineDariHash('#/g/ab3defgh?ref=1'), 'AB3DEFGH');

  // 2. Uji alamat aplikasi tersimpan di storage (fallback memori di Node)
  resetAlamatAplikasiDasar();
  const simpan = simpanAlamatAplikasiDasar('https://sekolah-ku.web.app/kuis/#/lama');
  assert.equal(simpan.ok, true);
  assert.equal(simpan.alamatFinal, 'https://sekolah-ku.web.app/kuis/');
  assert.equal(ambilAlamatAplikasiDasar(), 'https://sekolah-ku.web.app/kuis/');
  assert.equal(
    buatUrlGameOnline('AB3DEFGH'),
    'https://sekolah-ku.web.app/kuis/#/g/AB3DEFGH'
  );
  const tolak = simpanAlamatAplikasiDasar('ftp://tidak-valid.com');
  assert.equal(tolak.ok, false);
  resetAlamatAplikasiDasar();

  // 3. Uji format ringkas v2 & kompatibilitas mundur v1
  const game5 = buatGameUji(5);
  const ringkasV2 = buatPaketRingkasV2(game5);
  assert.equal(ringkasV2.v, 2);
  assert.equal('id' in ringkasV2, false);
  assert.equal('id' in ringkasV2.q[0], false);
  assert.equal(ringkasV2.q[0].e, undefined);

  const payloadV2 = kompresGameKePayloadV2(game5);
  const hasilV2 = dekompresPayloadKeGame(payloadV2);
  assert.equal(hasilV2.ok, true);
  if (hasilV2.ok) {
    assert.equal(hasilV2.versiSkema, 2);
    assert.equal(hasilV2.game.soal.length, 5);
    assert.equal(hasilV2.game.judul, game5.judul);
    assert.equal(hasilV2.game.pengaturan.durasiSoal, 15);
  }

  // Uji format v1 (.json lama) tetap terbaca
  const paketV1 = buatPaketGameJson(game5);
  const hasilV1 = validasiDanParsePaketGame(paketV1);
  assert.equal(hasilV1.ok, true);
  if (hasilV1.ok) {
    assert.equal(hasilV1.versiSkema, 1);
    assert.equal(hasilV1.game.soal.length, 5);
  }

  // Uji tolak paket rusak
  const hasilRusak = validasiDanParsePaketGame('{"bukan":"paket"}');
  assert.equal(hasilRusak.ok, false);

  // 3b. Uji penjelasan opsional (default mati, dan nyala jika dicentang)
  const gameDenganPenjelasan = buatGameUji(5);
  gameDenganPenjelasan.soal = gameDenganPenjelasan.soal.map((s, idx) => ({
    ...s,
    penjelasan: `Penjelasan lengkap soal ke-${idx + 1}.`,
  }));
  const ringkasTanpaPenjelasan = buatPaketRingkasV2(gameDenganPenjelasan);
  assert.equal(ringkasTanpaPenjelasan.q[0].e, undefined);
  const ringkasDenganPenjelasan = buatPaketRingkasV2(gameDenganPenjelasan, {
    sertakanPenjelasan: true,
  });
  assert.equal(ringkasDenganPenjelasan.q[0].e, 'Penjelasan lengkap soal ke-1.');
  const payloadDenganPenjelasan = kompresGameKePayloadV2(gameDenganPenjelasan, {
    sertakanPenjelasan: true,
  });
  const hasilDenganPenjelasan = dekompresPayloadKeGame(payloadDenganPenjelasan);
  assert.equal(hasilDenganPenjelasan.ok, true);
  if (hasilDenganPenjelasan.ok) {
    assert.equal(
      hasilDenganPenjelasan.game.soal[0].penjelasan,
      'Penjelasan lengkap soal ke-1.'
    );
  }

  // 4. Uji batas link data (8000 / warning 4000) vs QR data (<2000) + uji 15, 25, dan 40 soal + 120 soal online
  const linkKecil = buatLinkBerbagiGame(game5, 'https://contoh.web.app/');
  assert.equal(linkKecil.ok, true);
  if (linkKecil.ok) {
    assert.equal(linkKecil.panjangUrl < BATAS_KARAKTER_QR_DATA, true);
    assert.equal(linkKecil.qrDiizinkan, true);
    assert.equal(linkKecil.peringatanPanjang, undefined);
    const qrSmall = await buatQrDataUrl(linkKecil.url);
    assert.equal(qrSmall.startsWith('data:image/png;base64,'), true);
  }

  for (const jumlahUji of [15, 25, 40]) {
    const gameN = buatGameUji(jumlahUji, 1);
    gameN.soal = gameN.soal.map((s, idx) => ({
      ...s,
      pertanyaan: `Soal ${jumlahUji}-${idx + 1}: Berapa hasil operasi (${idx + 11} * ${idx + 7}) + ${(idx % 9) + 2}?`,
      penjelasan: `Pembahasan rinci nomor ${idx + 1} yang tidak ikut kecuali dicentang.`,
    }));
    const linkN = buatLinkBerbagiGame(gameN, 'https://contoh.web.app/');
    assert.equal(linkN.ok, true, `Game ${jumlahUji} soal harus muat di link (<=8000), dapat ${linkN.panjangUrl}`);
    if (linkN.ok) {
      assert.equal(linkN.panjangUrl <= BATAS_KARAKTER_LINK_DATA, true);
      assert.equal(linkN.qrDiizinkan, linkN.panjangUrl < BATAS_KARAKTER_QR_DATA);
      const parseBalik = dekompresPayloadKeGame(linkN.kodeTerkompresi);
      assert.equal(parseBalik.ok, true);
      if (parseBalik.ok) {
        assert.equal(parseBalik.game.soal.length, jumlahUji);
        assert.equal(parseBalik.game.soal[0].penjelasan, undefined);
      }
    }
    // Pastikan paket .json v1 untuk 15/25/40 soal juga tetap bisa diekspor & diimpor utuh
    const jsonV1 = buatPaketGameJson(gameN);
    const hasilJsonV1 = validasiDanParsePaketGame(JSON.stringify(jsonV1));
    assert.equal(hasilJsonV1.ok, true);
    if (hasilJsonV1.ok) {
      assert.equal(hasilJsonV1.game.soal.length, jumlahUji);
      assert.equal(
        hasilJsonV1.game.soal[0].penjelasan,
        'Pembahasan rinci nomor 1 yang tidak ikut kecuali dicentang.'
      );
    }
  }

  // Game menengah dengan teks bervariasi per soal agar panjang URL di antara 4.000 dan 8.000 karakter
  const gameSedang = buatGameUji(65, 1);
  gameSedang.soal = gameSedang.soal.map((s, idx) => ({
    ...s,
    pertanyaan: `Babak ${idx + 1}: Berapa sisa pembagian (${(idx + 17) * 131} + ${(idx + 53) * 19}) oleh ${(idx % 11) + 3} pada kasus nomor ${String.fromCharCode(65 + (idx % 26))}${idx * 37}?`,
    penjelasan: `Langkah hitung unik #${idx + 1}: jumlahkan dulu lalu modulo ${(idx % 11) + 3}.`,
  }));
  const linkSedang = buatLinkBerbagiGame(gameSedang, 'https://contoh.web.app/', {
    sertakanPenjelasan: true,
  });
  assert.equal(linkSedang.ok, true);
  if (linkSedang.ok) {
    assert.equal(linkSedang.panjangUrl > BATAS_PERINGATAN_LINK_DATA, true, `panjangUrl=${linkSedang.panjangUrl}`);
    assert.equal(linkSedang.panjangUrl <= BATAS_KARAKTER_LINK_DATA, true, `panjangUrl=${linkSedang.panjangUrl}`);
    assert.equal(linkSedang.qrDiizinkan, false);
    assert.equal(typeof linkSedang.peringatanPanjang, 'string');
  }

  // Game besar 120 soal bervariasi: link data offline ditolak (>8000), tapi payload v2 jauh di bawah 900.000 + QR online <100 char selalu berhasil!
  const game120 = buatGameUji(120, 1);
  game120.soal = game120.soal.map((s, idx) => ({
    ...s,
    pertanyaan: `Soal ke-${idx + 1}: Hitung nilai fungsi f(${idx * 17}) = ${(idx + 9) * 43} mod ${(idx % 13) + 5} dan jelaskan singkat alasannya!`,
    penjelasan: `Pembahasan soal #${idx + 1} dengan konstanta unik ${idx * 97 + 11}.`,
  }));
  const link120 = buatLinkBerbagiGame(game120, 'https://contoh.web.app/', {
    sertakanPenjelasan: true,
  });
  assert.equal(link120.ok, false);
  const payload120 = kompresGameKePayloadV2(game120, { sertakanPenjelasan: true });
  assert.equal(payload120.length < BATAS_PAYLOAD_FIRESTORE, true);
  const urlPendek120 = buatUrlGameOnline('K7M9P2Q4', 'https://contoh.web.app/');
  assert.equal(urlPendek120.length < 100, true);
  const qrPendek120 = await buatQrDataUrl(urlPendek120);
  assert.equal(qrPendek120.startsWith('data:image/png;base64,'), true);

  // 5. Uji pesan error bahasa Indonesia & validasi kode tidak valid
  const bukaKodeSalah = await ambilGameOnlineDariKode('0000IIII');
  assert.equal(bukaKodeSalah.ok, false);
  if (!bukaKodeSalah.ok) {
    assert.equal(bukaKodeSalah.alasan, 'kode_tidak_valid');
  }
  const pesanKuota = terjemahkanErrorFirebase({ code: 'resource-exhausted' }, 'buka');
  assert.equal(
    pesanKuota,
    'Layanan sedang penuh, coba lagi nanti atau gunakan paket berkas.'
  );
  const pesanOffline = terjemahkanErrorFirebase({ code: 'unavailable' }, 'umum');
  assert.equal(pesanOffline, 'Fitur online belum tersedia, gunakan paket berkas.');

  // 6. Uji normalisasi ketik kode, deteksi I/O/0/1, tempel link penuh, dan format kelompok 4-4
  const resSpasi = prosesInputKodeKetik('  jev6 - 57wr  ');
  assert.equal(resSpasi.kodeBersih, 'JEV657WR');
  assert.equal(resSpasi.adaKarakterTerlarang, false);
  assert.equal(formatKodeKelompok(resSpasi.kodeBersih), 'JEV6 57WR');

  const resTerlarang = prosesInputKodeKetik('abI0O1cd');
  assert.equal(resTerlarang.kodeBersih, 'ABCD');
  assert.equal(resTerlarang.adaKarakterTerlarang, true);
  assert.equal(resTerlarang.pesanPeringatan, 'Kode tidak memakai huruf I, O dan angka 0, 1');

  const resLink = prosesInputKodeKetik('https://kuis.web.app/#/g/jev6-57wr?sumber=wa');
  assert.equal(resLink.dariLinkPenuh, true);
  assert.equal(resLink.kodeBersih, 'JEV657WR');

  // 7. Uji Terakhir Dibuka: batas maksimal 10, deduplikasi kode + tautan lokalGameId, dan hapus semua
  hapusSemuaRiwayatDibuka();
  assert.equal(bacaRiwayatDibuka().length, 0);
  for (let i = 1; i <= 12; i += 1) {
    const k = `AB23CD4${String.fromCharCode(65 + i)}`;
    catatRiwayatDibuka({
      judul: `Game Ke-${i}`,
      kode: k,
      dibukaPada: 1700000000000 + i * 1000,
    });
  }
  let riwayat = bacaRiwayatDibuka();
  assert.equal(riwayat.length, BATAS_MAKS_RIWAYAT_DIBUKA);
  assert.equal(riwayat[0].judul, 'Game Ke-12');
  // Buka ulang kode lama sambil menautkan lokalGameId -> naik ke posisi teratas tanpa duplikat
  const kodeLama = riwayat[4].kode!;
  catatRiwayatDibuka({
    judul: 'Game Disimpan Offline',
    kode: kodeLama,
    lokalGameId: 'game_lokal_simpan_1',
    dibukaPada: 1700000999000,
  });
  riwayat = bacaRiwayatDibuka();
  assert.equal(riwayat.length, BATAS_MAKS_RIWAYAT_DIBUKA);
  assert.equal(riwayat[0].kode, kodeLama);
  assert.equal(riwayat[0].lokalGameId, 'game_lokal_simpan_1');
  hapusSemuaRiwayatDibuka();
  assert.equal(bacaRiwayatDibuka().length, 0);

  console.log('Semua uji Tahap 8 & Tambahan (kode acak, alamat, v1/v2, input kode, format 4-4, Terakhir Dibuka, batas 2000/4000/8000, QR 120 soal, error offline/kuota) LULUS.');
}

void jalankanSemuaUjiTahap8();

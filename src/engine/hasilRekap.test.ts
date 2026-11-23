import assert from 'node:assert/strict';
import { Pengaturan, Soal, TimSisi } from '../data/types';
import { STORAGE_KEYS } from '../utils/constants';
import { buatCsvAnalisisSoal, buatCsvRekapPemain } from '../utils/csvRekap';
import {
  bacaDaftarRiwayatHasil,
  buatEntriRiwayatHasil,
  simpanDaftarRiwayatHasil,
} from '../utils/riwayatHasil';
import { bacaStorageRaw, hapusStorage } from '../utils/storage';
import { ambilRosterEfektif } from './deal';
import { ambilDaftarSoalUntukSiswa, buatPengaturanDefault } from './gameEngine';
import {
  ambilNamaTimResmi,
  ambilPasanganNamaTimResmi,
  analisisSoalDariLog,
  hitungRingkasanDariLog,
  normalisasiNamaPemainTampil,
  ringkasSoalSnapshot,
} from './hasilRekap';
import { buatMatchState, matchReducer } from './match';

const penyimpananMock = new Map<string, string>();
if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
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
}

function buatPrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buatBankSoalAcak(jumlahUtama: number, jumlahCadangan: number, rng: () => number): Soal[] {
  const daftar: Soal[] = [];
  for (let i = 0; i < jumlahUtama + jumlahCadangan; i += 1) {
    const kunci = Math.floor(rng() * 4);
    daftar.push({
      id: `s_uji_${i + 1}`,
      pertanyaan: `Pertanyaan uji ke-${i + 1}?`,
      pilihan: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      kunci,
      bonus: i % 5 === 0,
      cadangan: i >= jumlahUtama,
    });
  }
  return daftar;
}

export function jalankanPengujianHasilRekap(): void {
  // 1. Uji 100 pertandingan acak: header === jumlah rekap pemain & selisih tali sinkron
  const rng = buatPrng(20250523);
  for (let laga = 0; laga < 100; laga += 1) {
    const jumlahSoalUtama = 6 + Math.floor(rng() * 14); // 6..19 soal utama
    const jumlahCadangan = Math.floor(rng() * 4);
    const bank = buatBankSoalAcak(jumlahSoalUtama, jumlahCadangan, rng);
    const utamaSiswa = ambilDaftarSoalUntukSiswa(bank.filter((s) => !s.cadangan));
    const tengah = Math.ceil(utamaSiswa.length / 2);
    const dekKiri = utamaSiswa.slice(0, tengah);
    const dekKanan = utamaSiswa.slice(tengah);
    const cadanganSiswa = ambilDaftarSoalUntukSiswa(bank.filter((s) => Boolean(s.cadangan)));

    const pakaiRosterKustom = laga % 2 === 0;
    const jumlahPenarik = ([3, 4, 5] as const)[laga % 3];
    const rosterKiri = pakaiRosterKustom
      ? Array.from({ length: jumlahPenarik }, (_, idx) => `SiswaM${idx + 1}`)
      : ambilRosterEfektif([], jumlahPenarik);
    const rosterKanan = pakaiRosterKustom
      ? Array.from({ length: jumlahPenarik }, (_, idx) => `SiswaB${idx + 1}`)
      : ambilRosterEfektif([], jumlahPenarik);

    const pengaturan: Pengaturan = {
      ...buatPengaturanDefault(),
      jumlahPenarik,
      durasiSoal: ([10, 15, 20] as const)[laga % 3],
      akhirPermainan: (['waktu', 'soalHabis', 'keduanya'] as const)[laga % 3],
      durasiWaktu: 1,
      salahMenarikLawan: laga % 2 === 1,
      bonus: laga % 4 === 0,
      penjelasan: false,
      jikaImbang: (['otomatis', 'kecepatan', 'seri'] as const)[laga % 3],
    };

    let t = 1_000_000 + laga * 100_000;
    let state = buatMatchState({
      gameId: `g_acak_${laga}`,
      labelLaga: `Laga Acak ${laga + 1}`,
      namaTimKiri: ambilNamaTimResmi(pengaturan, 0),
      namaTimKanan: ambilNamaTimResmi(pengaturan, 1),
      rosterKiri,
      rosterKanan,
      dekKiriSiswa: dekKiri,
      dekKananSiswa: dekKanan,
      cadanganSiswa,
      pengaturan,
      lewatiCountdown: true,
    });

    let langkahLoop = 0;
    while (state.fase !== 'selesai' && langkahLoop < 140) {
      langkahLoop += 1;
      const dt = 250 + Math.floor(rng() * 550);
      t += dt;
      state = matchReducer(state, { type: 'TICK', deltaMs: dt, timestamp: t }, bank);
      if (state.fase === 'selesai') break;

      if (state.fase === 'bermain') {
        if (state.timKiri.faseTim === 'menjawab' && rng() < 0.72) {
          const pilih = Math.floor(rng() * 4);
          state = matchReducer(
            state,
            { type: 'JAWAB', tim: 'merah', indeksPilihan: pilih, timestamp: t },
            bank
          );
        }
        if (state.timKanan.faseTim === 'menjawab' && rng() < 0.72) {
          const pilih = Math.floor(rng() * 4);
          state = matchReducer(
            state,
            { type: 'JAWAB', tim: 'biru', indeksPilihan: pilih, timestamp: t },
            bank
          );
        }
        // Sesekali uji koreksi manual atau batalkan terakhir
        if (langkahLoop === 10 && rng() < 0.3) {
          const arah: TimSisi = rng() < 0.5 ? 'merah' : 'biru';
          state = matchReducer(
            state,
            { type: 'KOREKSI_TALI_MANUAL', arah, timestamp: t },
            bank
          );
        }
        if (langkahLoop === 14 && rng() < 0.25) {
          state = matchReducer(state, { type: 'BATALKAN_TERAKHIR', tim: 'merah' }, bank);
        }
        // Sesekali guru hentikan laga lebih awal
        if (langkahLoop === 25 && laga % 10 === 9) {
          state = matchReducer(state, { type: 'AKHIRI_MANUAL', timestamp: t }, bank);
          break;
        }
      } else if (state.fase === 'penentuan' && state.penentuan) {
        if (!state.penentuan.jawabanKiri?.terkunci && rng() < 0.8) {
          state = matchReducer(
            state,
            { type: 'JAWAB', tim: 'merah', indeksPilihan: Math.floor(rng() * 4), timestamp: t },
            bank
          );
        }
        if (state.fase === 'penentuan' && state.penentuan && !state.penentuan.jawabanKanan?.terkunci && rng() < 0.8) {
          state = matchReducer(
            state,
            { type: 'JAWAB', tim: 'biru', indeksPilihan: Math.floor(rng() * 4), timestamp: t },
            bank
          );
        }
      }
    }

    if (state.fase !== 'selesai') {
      state = matchReducer(state, { type: 'AKHIRI_MANUAL', timestamp: t + 100 }, bank);
    }

    const ringkas = hitungRingkasanDariLog(state.riwayat, {
      rosterKiri,
      rosterKanan,
    });

    const sumMerahBenar = ringkas.rekapPemain
      .filter((p) => p.tim === 'merah')
      .reduce((acc, p) => acc + p.benar, 0);
    const sumMerahSalah = ringkas.rekapPemain
      .filter((p) => p.tim === 'merah')
      .reduce((acc, p) => acc + p.salah, 0);
    const sumBiruBenar = ringkas.rekapPemain
      .filter((p) => p.tim === 'biru')
      .reduce((acc, p) => acc + p.benar, 0);
    const sumBiruSalah = ringkas.rekapPemain
      .filter((p) => p.tim === 'biru')
      .reduce((acc, p) => acc + p.salah, 0);

    assert.equal(
      ringkas.skorMerah,
      sumMerahBenar,
      `Laga ${laga}: skorMerah (${ringkas.skorMerah}) != sum rekap (${sumMerahBenar})`
    );
    assert.equal(
      ringkas.skorSalahMerah,
      sumMerahSalah,
      `Laga ${laga}: skorSalahMerah != sum rekap`
    );
    assert.equal(
      ringkas.skorBiru,
      sumBiruBenar,
      `Laga ${laga}: skorBiru != sum rekap`
    );
    assert.equal(
      ringkas.skorSalahBiru,
      sumBiruSalah,
      `Laga ${laga}: skorSalahBiru != sum rekap`
    );
    assert.equal(
      ringkas.totalSoalTerjawab,
      sumMerahBenar + sumMerahSalah + sumBiruBenar + sumBiruSalah,
      `Laga ${laga}: totalSoalTerjawab tidak sinkron`
    );
    assert.equal(
      ringkas.posisiTaliAkhir,
      state.posisiTali,
      `Laga ${laga}: posisiTaliAkhir tidak sama dengan posisiTali match`
    );
    assert.equal(
      state.timKiri.skorBenar,
      sumMerahBenar,
      `Laga ${laga}: timKiri.skorBenar tidak sinkron dengan riwayat`
    );
    assert.equal(
      state.timKanan.skorBenar,
      sumBiruBenar,
      `Laga ${laga}: timKanan.skorBenar tidak sinkron dengan riwayat`
    );

    for (const p of ringkas.rekapPemain) {
      assert.ok(p.nama.trim().length > 0, 'Nama pemain tidak boleh kosong');
    }
  }

  // 2. Nama tim konsisten & nama pemain default
  const def = buatPengaturanDefault();
  assert.deepEqual(def.anggota, [[], [], [], []], 'Default anggota seharusnya kosong (opsional)');
  assert.deepEqual(ambilPasanganNamaTimResmi(def), ['Tim Merah', 'Tim Biru']);
  assert.equal(
    ambilNamaTimResmi({ namaTim: ['   ', 'Biru Sakti', 'Hijau', 'Kuning'] }, 0),
    'Tim Merah'
  );
  assert.equal(
    ambilNamaTimResmi({ namaTim: ['Merah Jaya', 'Biru Sakti', 'Hijau', 'Kuning'] }, 1),
    'Biru Sakti'
  );
  assert.equal(normalisasiNamaPemainTampil('', 1), 'Pemain 1');
  assert.equal(normalisasiNamaPemainTampil('   ', 3), 'Pemain 3');
  assert.equal(normalisasiNamaPemainTampil('Siti Aminah', 1), 'Siti Aminah');

  // 3. Riwayat Hasil: simpan, baca, hapus, tetap kosong setelah reload
  hapusStorage(STORAGE_KEYS.RESULTS_HISTORY);
  assert.deepEqual(
    bacaDaftarRiwayatHasil(),
    [],
    'Riwayat hasil awal harus kosong tanpa data contoh palsu'
  );

  const bankAnalisis = buatBankSoalAcak(3, 0, buatPrng(99));
  // Pastikan soal_1 paling sering salah (1/4 = 25% < 50%), soal_2 sedang (1/2 = 50%), soal_3 benar (2/2 = 100%)
  const logAnalisis = [
    {
      id: 't1',
      urutan: 1,
      waktuDetik: 2,
      waktuResponsMs: 1200,
      tim: 'merah' as const,
      pemain: 'Pemain 1',
      soalId: bankAnalisis[0].id,
      jenis: 'salah' as const,
      pilihanDipilih: (bankAnalisis[0].kunci + 1) % 4,
      benar: false,
      perubahanLangkah: 1,
      posisiTaliSesudah: 1,
    },
    {
      id: 't2',
      urutan: 2,
      waktuDetik: 3,
      waktuResponsMs: 950,
      tim: 'biru' as const,
      pemain: 'Rani',
      soalId: bankAnalisis[0].id,
      jenis: 'salah' as const,
      pilihanDipilih: (bankAnalisis[0].kunci + 2) % 4,
      benar: false,
      perubahanLangkah: -1,
      posisiTaliSesudah: 0,
    },
    {
      id: 't3',
      urutan: 3,
      waktuDetik: 4,
      waktuResponsMs: 1500,
      tim: 'merah' as const,
      pemain: 'Pemain 1',
      soalId: bankAnalisis[0].id,
      jenis: 'salah' as const,
      pilihanDipilih: (bankAnalisis[0].kunci + 1) % 4,
      benar: false,
      perubahanLangkah: 1,
      posisiTaliSesudah: 1,
    },
    {
      id: 't4',
      urutan: 4,
      waktuDetik: 5,
      waktuResponsMs: 1100,
      tim: 'biru' as const,
      pemain: 'Rani',
      soalId: bankAnalisis[0].id,
      jenis: 'benar' as const,
      pilihanDipilih: bankAnalisis[0].kunci,
      benar: true,
      perubahanLangkah: 1,
      posisiTaliSesudah: 2,
    },
    {
      id: 't5',
      urutan: 5,
      waktuDetik: 6,
      waktuResponsMs: 800,
      tim: 'merah' as const,
      pemain: 'Budi',
      soalId: bankAnalisis[1].id,
      jenis: 'benar' as const,
      pilihanDipilih: bankAnalisis[1].kunci,
      benar: true,
      perubahanLangkah: -1,
      posisiTaliSesudah: 1,
    },
    {
      id: 't6',
      urutan: 6,
      waktuDetik: 7,
      waktuResponsMs: 1800,
      tim: 'biru' as const,
      pemain: 'Rani',
      soalId: bankAnalisis[1].id,
      jenis: 'salah' as const,
      pilihanDipilih: (bankAnalisis[1].kunci + 1) % 4,
      benar: false,
      perubahanLangkah: -1,
      posisiTaliSesudah: 0,
    },
    {
      id: 't7',
      urutan: 7,
      waktuDetik: 8,
      waktuResponsMs: 650,
      tim: 'merah' as const,
      pemain: 'Budi',
      soalId: bankAnalisis[2].id,
      jenis: 'benar' as const,
      pilihanDipilih: bankAnalisis[2].kunci,
      benar: true,
      perubahanLangkah: -1,
      posisiTaliSesudah: -1,
    },
  ];

  const ringkas3 = hitungRingkasanDariLog(logAnalisis);
  assert.equal(ringkas3.skorMerah, 2);
  assert.equal(ringkas3.skorSalahMerah, 2);
  assert.equal(ringkas3.skorBiru, 1);
  assert.equal(ringkas3.skorSalahBiru, 2);
  assert.equal(ringkas3.totalSoalTerjawab, 7);
  assert.equal(ringkas3.akurasiTotal, 43); // 3/7 = 42.85 -> 43%
  assert.equal(ringkas3.jawabanTercepat?.pemain, 'Budi');
  assert.equal(ringkas3.jawabanTercepat?.waktuMs, 650);

  const analisis = analisisSoalDariLog(logAnalisis, ringkasSoalSnapshot(bankAnalisis));
  assert.equal(analisis.length, 3);
  assert.equal(analisis[0].soalId, bankAnalisis[0].id, 'Soal paling sering salah harus di urutan #1');
  assert.equal(analisis[0].persenBenar, 25);
  assert.equal(analisis[0].perluDiulas, true, '< 50% wajib ditandai Perlu diulas');
  assert.equal(
    analisis[0].jawabanBenarHuruf,
    String.fromCharCode(65 + bankAnalisis[0].kunci)
  );
  assert.equal(analisis[1].persenBenar, 50);
  assert.equal(analisis[1].perluDiulas, false, '50% tepat tidak < 50%');
  assert.equal(analisis[2].persenBenar, 100);
  assert.equal(analisis[2].perluDiulas, false);

  const entri1 = buatEntriRiwayatHasil({
    id: 'hasil_uji_1',
    dibuatPada: 1700000001000,
    gameId: 'g1',
    judulGame: 'Kuis IPA Bab 1',
    mapel: 'IPA',
    mode: '2tim',
    labelLaga: 'Laga 1',
    namaTimKiri: 'Tim Merah',
    namaTimKanan: 'Tim Biru',
    posisiTaliAkhir: -1,
    langkahKeGaris: 6,
    pemenang: 'merah',
    alasanAkhir: 'waktu',
    durasiDetik: 60,
    riwayat: logAnalisis,
    bankSoal: bankAnalisis,
  });
  const entri2 = buatEntriRiwayatHasil({
    id: 'hasil_uji_2',
    dibuatPada: 1700000002000,
    gameId: 'g2',
    judulGame: 'Kuis Matematika',
    mapel: 'Matematika',
    mode: '2tim',
    labelLaga: 'Laga 2',
    namaTimKiri: 'Tim Merah',
    namaTimKanan: 'Tim Biru',
    posisiTaliAkhir: 2,
    langkahKeGaris: 6,
    pemenang: 'biru',
    alasanAkhir: 'soalHabis',
    durasiDetik: 45,
    riwayat: logAnalisis,
    bankSoal: bankAnalisis,
  });

  simpanDaftarRiwayatHasil([entri1, entri2]);
  const terbaca = bacaDaftarRiwayatHasil();
  assert.equal(terbaca.length, 2);
  assert.equal(terbaca[0].id, 'hasil_uji_2', 'Hasil terbaru harus paling atas');

  // Hapus satu lalu hapus semua -> harus benar-benar '[]' dan tetap kosong saat muat ulang
  simpanDaftarRiwayatHasil(terbaca.filter((x) => x.id !== 'hasil_uji_1'));
  assert.equal(bacaDaftarRiwayatHasil().length, 1);

  simpanDaftarRiwayatHasil([]);
  assert.equal(bacaStorageRaw(STORAGE_KEYS.RESULTS_HISTORY), '[]');
  assert.deepEqual(
    bacaDaftarRiwayatHasil(),
    [],
    'Setelah hapus semua dan muat ulang, riwayat hasil harus tetap kosong'
  );

  // 4. CSV UTF-8 BOM Rekap Pemain & Analisis Soal
  const csvPemain = buatCsvRekapPemain(entri1);
  assert.ok(csvPemain.startsWith('\uFEFF'), 'CSV rekap pemain wajib UTF-8 BOM');
  assert.ok(csvPemain.includes('Pemain,Tim,Giliran,Benar,Salah,Akurasi (%)'));
  assert.ok(csvPemain.includes('Budi'));

  const csvAnalisis = buatCsvAnalisisSoal(entri1, ringkasSoalSnapshot(bankAnalisis));
  assert.ok(csvAnalisis.startsWith('\uFEFF'), 'CSV analisis soal wajib UTF-8 BOM');
  assert.ok(csvAnalisis.includes('Perlu diulas'));
  assert.ok(csvAnalisis.includes('Jawaban Benar'));
}

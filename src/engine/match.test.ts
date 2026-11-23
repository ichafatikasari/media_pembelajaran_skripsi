import { Pengaturan, Soal } from '../data/types';
import { buatPengaturanDefault, ambilDaftarSoalUntukSiswa } from './gameEngine';
import {
  ambilInfoCountdown,
  ambilPemainAktifTim,
  ambilPutaranTim,
  buatMatchState,
  matchReducer,
  TOTAL_DURASI_COUNTDOWN_MS,
} from './match';

function buatBankTest(): Soal[] {
  return Array.from({ length: 14 }, (_, i) => ({
    id: `m_${i + 1}`,
    pertanyaan: `Soal uji nomor ${i + 1}?`,
    pilihan: ['Salah A', 'Benar B', 'Salah C', 'Salah D'],
    kunci: 1,
    penjelasan: i === 0 ? 'Penjelasan soal 1.' : undefined,
    bonus: i === 1,
    tingkat: 'Mudah',
    topik: 'Umum',
  }));
}

function buatConfigUji(
  bank: Soal[],
  overridePengaturan: Partial<Pengaturan> = {},
  rosterKiri = Array.from({ length: 11 }, (_, i) => `Merah-${i + 1}`),
  rosterKanan = Array.from({ length: 12 }, (_, i) => `Biru-${i + 1}`)
) {
  const pengaturan: Pengaturan = {
    ...buatPengaturanDefault(),
    durasiSoal: 10,
    durasiWaktu: 1,
    akhirPermainan: 'keduanya',
    salahMenarikLawan: true,
    bonus: false,
    penjelasan: false,
    ...overridePengaturan,
  };
  const dekKiri = ambilDaftarSoalUntukSiswa(bank.slice(0, 5));
  const dekKanan = ambilDaftarSoalUntukSiswa(bank.slice(5, 10));
  const cadangan = ambilDaftarSoalUntukSiswa(bank.slice(10, 14));

  return {
    gameId: 'uji_match',
    labelLaga: 'Laga Uji',
    namaTimKiri: 'Tim Merah',
    namaTimKanan: 'Tim Biru',
    rosterKiri,
    rosterKanan,
    dekKiriSiswa: dekKiri,
    dekKananSiswa: dekKanan,
    cadanganSiswa: cadangan,
    pengaturan,
    lewatiCountdown: true,
  };
}

export function jalankanPengujianMatch(): void {
  const bank = buatBankTest();

  // 1. Klik benar -> tali tertarik ke tim itu, klik ganda diabaikan, soal berikutnya muncul otomatis
  let st = buatMatchState(buatConfigUji(bank, { bonus: true }));
  st = matchReducer(st, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: 100 }, bank);
  if (st.posisiTali !== -1 || st.timKiri.skorBenar !== 1 || !st.timKiri.klikTerkunci) {
    throw new Error('Klik benar kiri gagal');
  }
  // Klik ganda saat terkunci harus diabaikan
  const stDouble = matchReducer(
    st,
    { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: 120 },
    bank
  );
  if (stDouble !== st) {
    throw new Error('Klik ganda tidak diabaikan');
  }
  // Tim kanan menjawab bersamaan saat tim kiri sedang umpan balik tanpa mengganggu tim kiri
  st = matchReducer(st, { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: 130 }, bank); // salah -> tarik ke merah (-1)
  if (st.posisiTali !== -2 || st.timKanan.skorSalah !== 1) {
    throw new Error('Salah tarik lawan gagal');
  }
  // Tick melewati umpan balik -> soal berikutnya muncul otomatis & estafet maju
  st = matchReducer(st, { type: 'TICK', deltaMs: 1000, timestamp: 1130 }, bank);
  if (st.timKiri.indeksSoal !== 1 || st.timKanan.indeksSoal !== 1) {
    throw new Error('Soal berikutnya tidak muncul otomatis setelah umpan balik');
  }

  // 2. Bonus x2 aktif hanya jika opsi bonus ON & soal bonus=true
  // m_2 (indeks 1 di dekKiri) punya bonus: true
  st = matchReducer(st, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: 1200 }, bank);
  if (st.posisiTali !== -4) {
    throw new Error(`Bonus x2 seharusnya menggeser -2 menjadi -4, hasil: ${st.posisiTali}`);
  }
  // Cek selisih tali === jumlah riwayat
  const sumRiwayat = st.riwayat.reduce((a, b) => a + b.perubahanLangkah, 0);
  if (sumRiwayat !== st.posisiTali) {
    throw new Error('Selisih tali tidak sama dengan jumlah riwayat');
  }

  // 3. Salah menarik lawan OFF -> tali diam
  let stOff = buatMatchState(buatConfigUji(bank, { salahMenarikLawan: false }));
  stOff = matchReducer(stOff, { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: 100 }, bank);
  if (stOff.posisiTali !== 0 || stOff.timKiri.skorSalah !== 1) {
    throw new Error('Salah tarik lawan OFF seharusnya membuat tali diam');
  }

  // 4. Waktu soal habis -> dihitung salah
  let stTimeout = buatMatchState(buatConfigUji(bank, { durasiSoal: 10, salahMenarikLawan: true }));
  stTimeout = matchReducer(stTimeout, { type: 'TICK', deltaMs: 10100, timestamp: 10100 }, bank);
  if (stTimeout.timKiri.skorSalah !== 1 || stTimeout.timKanan.skorSalah !== 1) {
    throw new Error('Waktu soal habis tidak terhitung salah');
  }

  // 5. Estafet berputar tanpa lompat & tanpa ganda untuk 11 dan 12 anggota
  let stEstafet = buatMatchState(buatConfigUji(bank, { akhirPermainan: 'waktu', durasiWaktu: 5 }));
  const urutanKiri: string[] = [];
  const urutanKanan: string[] = [];
  for (let i = 0; i < 13; i += 1) {
    urutanKiri.push(ambilPemainAktifTim(stEstafet.timKiri));
    urutanKanan.push(ambilPemainAktifTim(stEstafet.timKanan));
    stEstafet = matchReducer(stEstafet, { type: 'LEWATI_SOAL', tim: 'merah', timestamp: 100 + i }, bank);
    stEstafet = matchReducer(stEstafet, { type: 'LEWATI_SOAL', tim: 'biru', timestamp: 100 + i }, bank);
  }
  if (urutanKiri[10] !== 'Merah-11' || urutanKiri[11] !== 'Merah-1' || ambilPutaranTim(stEstafet.timKiri) !== 2) {
    throw new Error('Estafet tim 11 anggota melompat/ganda');
  }
  if (urutanKanan[11] !== 'Biru-12' || urutanKanan[12] !== 'Biru-1') {
    throw new Error('Estafet tim 12 anggota melompat/ganda');
  }

  // 6. Jeda menghentikan timer dan klik
  let stJeda = buatMatchState(buatConfigUji(bank));
  stJeda = matchReducer(stJeda, { type: 'JEDA' }, bank);
  const sebelumTickJeda = stJeda;
  stJeda = matchReducer(stJeda, { type: 'TICK', deltaMs: 5000, timestamp: 5000 }, bank);
  stJeda = matchReducer(stJeda, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: 5100 }, bank);
  if (stJeda !== sebelumTickJeda) {
    throw new Error('Jeda tidak menghentikan tick atau klik');
  }
  stJeda = matchReducer(stJeda, { type: 'LANJUT' }, bank);
  if (stJeda.fase !== 'bermain') {
    throw new Error('Lanjut gagal mengembalikan fase bermain');
  }

  // 7. Akhir WAKTU membatalkan soal berjalan + memicu RONDE PENENTUAN jika seri 0
  let stWaktu = buatMatchState(buatConfigUji(bank, { akhirPermainan: 'waktu', durasiWaktu: 1 }));
  stWaktu = matchReducer(stWaktu, { type: 'TICK', deltaMs: 60100, timestamp: 60100 }, bank);
  if (stWaktu.fase !== 'penentuan' || !stWaktu.penentuan?.soalAktif) {
    throw new Error('Seri saat waktu habis seharusnya memicu Ronde Penentuan');
  }
  // Wakil penentuan kiri benar, kanan salah -> kiri menang
  stWaktu = matchReducer(stWaktu, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: 60200 }, bank);
  stWaktu = matchReducer(stWaktu, { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: 60300 }, bank);
  if (stWaktu.fase !== 'selesai' || stWaktu.pemenang !== 'merah' || stWaktu.alasanAkhir !== 'penentuan') {
    throw new Error('Ronde penentuan gagal menentukan pemenang');
  }

  // 8. Akhir SOAL HABIS: tim kiri selesai dulu menunggu lawan
  const bankMini = bank.slice(0, 2);
  let stHabis = buatMatchState({
    ...buatConfigUji(bank, { akhirPermainan: 'soalHabis' }),
    dekKiriSiswa: ambilDaftarSoalUntukSiswa([bankMini[0]]),
    dekKananSiswa: ambilDaftarSoalUntukSiswa([bankMini[1]]),
  });
  stHabis = matchReducer(stHabis, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: 100 }, bank);
  stHabis = matchReducer(stHabis, { type: 'TICK', deltaMs: 1000, timestamp: 1100 }, bank);
  if (stHabis.timKiri.faseTim !== 'selesai' || stHabis.fase !== 'bermain') {
    throw new Error('Tim yang selesai lebih dulu seharusnya menunggu lawan');
  }
  stHabis = matchReducer(stHabis, { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: 1200 }, bank);
  stHabis = matchReducer(stHabis, { type: 'TICK', deltaMs: 1000, timestamp: 2200 }, bank);
  if (stHabis.fase !== 'selesai' || stHabis.alasanAkhir !== 'soalHabis') {
    throw new Error('Mode SOAL HABIS seharusnya selesai setelah kedua tim selesai');
  }

  // 9. Koreksi guru (manual + batalkan terakhir) menjaga selisih === jumlah riwayat
  let stKoreksi = buatMatchState(buatConfigUji(bank));
  stKoreksi = matchReducer(stKoreksi, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: 100 }, bank);
  stKoreksi = matchReducer(stKoreksi, { type: 'KOREKSI_TALI_MANUAL', arah: 'biru', timestamp: 200 }, bank);
  if (stKoreksi.posisiTali !== 0) throw new Error('Koreksi manual gagal');
  stKoreksi = matchReducer(stKoreksi, { type: 'BATALKAN_TERAKHIR', tim: 'merah' }, bank);
  const sumKoreksi = stKoreksi.riwayat.reduce((a, b) => a + b.perubahanLangkah, 0);
  if (stKoreksi.posisiTali !== 1 || sumKoreksi !== stKoreksi.posisiTali || stKoreksi.timKiri.skorBenar !== 0) {
    throw new Error('Batalkan jawaban terakhir gagal menjaga konsistensi riwayat & skor');
  }

  // 10. Urutan countdown 6700ms: SIAP-SIAP -> peluitAwal -> 3 -> 2 -> 1 -> TARIK! -> timer mulai
  let stCd = buatMatchState({ ...buatConfigUji(bank), lewatiCountdown: false });
  if (stCd.fase !== 'countdown' || stCd.countdownMs !== TOTAL_DURASI_COUNTDOWN_MS) {
    throw new Error('Countdown awal harus dimulai pada 6700ms');
  }
  if (ambilInfoCountdown(stCd.countdownMs).tahap !== 'siap') {
    throw new Error('Tahap awal countdown harus siap');
  }
  stCd = matchReducer(stCd, { type: 'TICK', deltaMs: 2100, timestamp: 2100 }, bank);
  if (ambilInfoCountdown(stCd.countdownMs).tahap !== 'peluitAwal') {
    throw new Error('Setelah 2.1 detik harus masuk tahap peluitAwal');
  }
  stCd = matchReducer(stCd, { type: 'TICK', deltaMs: 800, timestamp: 2900 }, bank);
  if (ambilInfoCountdown(stCd.countdownMs).teksUtama !== '3') {
    throw new Error('Setelah 2.9 detik harus tampil angka 3');
  }
  stCd = matchReducer(stCd, { type: 'TICK', deltaMs: 1000, timestamp: 3900 }, bank);
  if (ambilInfoCountdown(stCd.countdownMs).teksUtama !== '2') {
    throw new Error('Setelah 3.9 detik harus tampil angka 2');
  }
  stCd = matchReducer(stCd, { type: 'TICK', deltaMs: 1000, timestamp: 4900 }, bank);
  if (ambilInfoCountdown(stCd.countdownMs).teksUtama !== '1') {
    throw new Error('Setelah 4.9 detik harus tampil angka 1');
  }
  stCd = matchReducer(stCd, { type: 'TICK', deltaMs: 1000, timestamp: 5900 }, bank);
  if (ambilInfoCountdown(stCd.countdownMs).teksUtama !== 'TARIK!' || stCd.fase !== 'countdown') {
    throw new Error('Saat 5.9 detik harus tampil TARIK! dan timer belum jalan');
  }
  if (stCd.sisaWaktuTotalMs !== 60000 || stCd.timKiri.sisaWaktuSoalMs !== 10000) {
    throw new Error('Timer tidak boleh berkurang sebelum peluit TARIK selesai');
  }
  stCd = matchReducer(stCd, { type: 'TICK', deltaMs: 850, timestamp: 6750 }, bank);
  if (stCd.fase !== 'bermain') {
    throw new Error('Setelah peluit TARIK selesai (6.7 detik), fase harus menjadi bermain');
  }

  // 11. JEDA saat countdown lalu LANJUT harus mengulang countdown dari awal (6700ms)
  let stCdJeda = buatMatchState({ ...buatConfigUji(bank), lewatiCountdown: false });
  stCdJeda = matchReducer(stCdJeda, { type: 'TICK', deltaMs: 3200, timestamp: 3200 }, bank);
  stCdJeda = matchReducer(stCdJeda, { type: 'JEDA' }, bank);
  if (stCdJeda.fase !== 'jeda' || stCdJeda.faseSebelumJeda !== 'countdown') {
    throw new Error('JEDA saat countdown harus menyimpan faseSebelumJeda countdown');
  }
  stCdJeda = matchReducer(stCdJeda, { type: 'LANJUT' }, bank);
  if (stCdJeda.fase !== 'countdown' || stCdJeda.countdownMs !== TOTAL_DURASI_COUNTDOWN_MS) {
    throw new Error('LANJUT setelah jeda countdown harus mengulang dari 6700ms');
  }

  // =========================================================================
  // PENGUJIAN BARU RONDE PENENTUAN (6 SKENARIO WAJIB)
  // =========================================================================
  const buatBankUtama = (jumlah: number): Soal[] =>
    Array.from({ length: jumlah }, (_, i) => ({
      id: `u_${i + 1}`,
      pertanyaan: `Soal utama ${i + 1}?`,
      pilihan: ['Salah A', 'Benar B', 'Salah C', 'Salah D'],
      kunci: 1,
      tingkat: 'Mudah',
      topik: 'Umum',
    }));

  const buatBankCadangan = (jumlah: number): Soal[] =>
    Array.from({ length: jumlah }, (_, i) => ({
      id: `cad_${i + 1}`,
      pertanyaan: `Soal cadangan ${i + 1}?`,
      pilihan: ['Salah A', 'Benar B', 'Salah C', 'Salah D'],
      kunci: 1,
      cadangan: true,
      tingkat: 'Sedang',
      topik: 'Penentu',
    }));

  // Helper: selesaikan 1 ronde soal biasa berpasangan dengan waktu jawab tepat per tim
  const selesaikanSemuaSoalBiasaImbang = (
    bankSoal: Soal[],
    dekKiri: Soal[],
    dekKanan: Soal[],
    cadangan: Soal[],
    waktuKiriMs: number,
    waktuKananMs: number,
    overridePengaturan: Partial<Pengaturan> = {}
  ) => {
    const pengaturan: Pengaturan = {
      ...buatPengaturanDefault(),
      durasiSoal: 10,
      durasiWaktu: 3,
      akhirPermainan: 'soalHabis',
      salahMenarikLawan: true,
      bonus: false,
      penjelasan: false,
      ...overridePengaturan,
    };
    let s = buatMatchState({
      gameId: 'uji_penentuan',
      labelLaga: 'Laga Penentuan',
      namaTimKiri: 'Tim Merah',
      namaTimKanan: 'Tim Biru',
      rosterKiri: ['Ani', 'Budi'],
      rosterKanan: ['Cici', 'Dedi'],
      dekKiriSiswa: ambilDaftarSoalUntukSiswa(dekKiri),
      dekKananSiswa: ambilDaftarSoalUntukSiswa(dekKanan),
      cadanganSiswa: ambilDaftarSoalUntukSiswa(cadangan),
      pengaturan,
      lewatiCountdown: true,
    });
    let t = 1000;
    s = matchReducer(s, { type: 'TICK', deltaMs: 50, timestamp: t }, bankSoal);

    for (let i = 0; i < dekKiri.length; i += 1) {
      const lebihCepatKiri = waktuKiriMs <= waktuKananMs;
      const t1 = t + Math.min(waktuKiriMs, waktuKananMs);
      const t2 = t + Math.max(waktuKiriMs, waktuKananMs);
      if (lebihCepatKiri) {
        s = matchReducer(s, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: t1 }, bankSoal);
        s = matchReducer(s, { type: 'JAWAB', tim: 'biru', indeksPilihan: 1, timestamp: t2 }, bankSoal);
      } else {
        s = matchReducer(s, { type: 'JAWAB', tim: 'biru', indeksPilihan: 1, timestamp: t1 }, bankSoal);
        s = matchReducer(s, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: t2 }, bankSoal);
      }
      t = t2 + 1100;
      s = matchReducer(s, { type: 'TICK', deltaMs: 1100, timestamp: t }, bankSoal);
    }
    return { st: s, t };
  };

  // 12. 5 soal per tim, semua benar, tanpa cadangan -> masuk TUKAR SOAL; tidak ada soal berulang untuk tim yang sama
  {
    const bank10 = buatBankUtama(10);
    const dekKiri = bank10.slice(0, 5);
    const dekKanan = bank10.slice(5, 10);
    const idsKiri = new Set(dekKiri.map((s) => s.id));
    const idsKanan = new Set(dekKanan.map((s) => s.id));

    let { st: stTukar, t } = selesaikanSemuaSoalBiasaImbang(
      bank10,
      dekKiri,
      dekKanan,
      [],
      500,
      500
    );

    if (stTukar.fase !== 'penentuan' || stTukar.penentuan?.jenisSoal !== 'tukar') {
      throw new Error('5 soal per tim tanpa cadangan saat imbang harus masuk ke ronde Tukar Soal');
    }
    const soalTukarDilihatKiri = new Set<string>();
    const soalTukarDilihatKanan = new Set<string>();

    for (let r = 1; r <= 3; r += 1) {
      if (stTukar.fase !== 'penentuan' || !stTukar.penentuan) {
        throw new Error(`Ronde tukar ke-${r} seharusnya aktif`);
      }
      const sk = stTukar.penentuan.soalKiri!;
      const sb = stTukar.penentuan.soalKanan!;
      if (!idsKanan.has(sk.id) || idsKiri.has(sk.id)) {
        throw new Error('Soal tukar tim kiri harus berasal dari soal yang dijawab lawan dan belum pernah dilihat kiri');
      }
      if (!idsKiri.has(sb.id) || idsKanan.has(sb.id)) {
        throw new Error('Soal tukar tim kanan harus berasal dari soal yang dijawab lawan dan belum pernah dilihat kanan');
      }
      if (soalTukarDilihatKiri.has(sk.id) || soalTukarDilihatKanan.has(sb.id)) {
        throw new Error('Soal tukar tidak boleh terulang untuk tim yang sama');
      }
      soalTukarDilihatKiri.add(sk.id);
      soalTukarDilihatKanan.add(sb.id);

      // Keduanya salah agar lanjut ke ronde berikutnya
      t += 300;
      stTukar = matchReducer(stTukar, { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: t }, bank10);
      stTukar = matchReducer(stTukar, { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: t + 100 }, bank10);
      t += 1300;
      stTukar = matchReducer(stTukar, { type: 'TICK', deltaMs: 1300, timestamp: t }, bank10);
    }
  }

  // 13. Dengan 3 soal cadangan -> ronde penentuan memakai cadangan berurutan tanpa pengulangan
  {
    const utama10 = buatBankUtama(10);
    const cad3 = buatBankCadangan(3);
    const semua = [...utama10, ...cad3];
    let { st: stCad, t } = selesaikanSemuaSoalBiasaImbang(
      semua,
      utama10.slice(0, 5),
      utama10.slice(5, 10),
      cad3,
      500,
      500
    );

    const idCadDipakai: string[] = [];
    for (let r = 1; r <= 3; r += 1) {
      if (
        stCad.fase !== 'penentuan' ||
        stCad.penentuan?.jenisSoal !== 'cadangan' ||
        stCad.penentuan.rondeKe !== r
      ) {
        throw new Error(`Seharusnya berada di ronde penentuan cadangan ${r}/3`);
      }
      const soalId = stCad.penentuan.soalKiri?.id ?? '';
      if (!soalId.startsWith('cad_') || idCadDipakai.includes(soalId)) {
        throw new Error(`Soal cadangan ronde ${r} tidak valid atau terulang: ${soalId}`);
      }
      idCadDipakai.push(soalId);

      // Keduanya menjawab salah -> tidak ada pemenang -> lanjut ronde cadangan berikutnya
      t += 200;
      stCad = matchReducer(stCad, { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: t }, semua);
      stCad = matchReducer(stCad, { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: t + 50 }, semua);
      t += 1300;
      stCad = matchReducer(stCad, { type: 'TICK', deltaMs: 1300, timestamp: t }, semua);
    }
    if (idCadDipakai.length !== 3 || new Set(idCadDipakai).size !== 3) {
      throw new Error('3 soal cadangan harus terpakai berurutan tanpa pengulangan');
    }
  }

  // 14. Semua ronde penentuan seri -> kemenangan ditentukan total kecepatan jawaban benar
  {
    const utama10 = buatBankUtama(10);
    const cad3 = buatBankCadangan(3);
    const semua = [...utama10, ...cad3];
    // Tim Merah menjawab setiap soal benar dalam 400ms (total 2000ms), Tim Biru 900ms (total 4500ms) -> selisih 2,5 detik
    let { st: stCepat, t } = selesaikanSemuaSoalBiasaImbang(
      semua,
      utama10.slice(0, 5),
      utama10.slice(5, 10),
      cad3,
      400,
      900
    );

    for (let r = 1; r <= 3; r += 1) {
      t += 300;
      // Keduanya menjawab benar pada milidetik yang sama -> ronde ini seri
      stCepat = matchReducer(stCepat, { type: 'JAWAB', tim: 'merah', indeksPilihan: 1, timestamp: t }, semua);
      stCepat = matchReducer(stCepat, { type: 'JAWAB', tim: 'biru', indeksPilihan: 1, timestamp: t }, semua);
      t += 1300;
      stCepat = matchReducer(stCepat, { type: 'TICK', deltaMs: 1300, timestamp: t }, semua);
    }

    if (
      stCepat.fase !== 'selesai' ||
      stCepat.pemenang !== 'merah' ||
      stCepat.alasanAkhir !== 'kecepatan' ||
      stCepat.caraMenang !== 'kecepatan' ||
      !stCepat.keteranganMenang?.includes('2,5 detik lebih cepat')
    ) {
      throw new Error(
        `Seharusnya Merah menang kecepatan (2,5 detik lebih cepat), hasil: ${JSON.stringify({
          fase: stCepat.fase,
          pemenang: stCepat.pemenang,
          alasanAkhir: stCepat.alasanAkhir,
          keteranganMenang: stCepat.keteranganMenang,
        })}`
      );
    }
  }

  // 15. Waktu total sama -> SERI resmi, game berakhir tanpa perulangan
  {
    const utama10 = buatBankUtama(10);
    // Kedua tim menjawab semua 5 soal benar dalam 600ms yang sama persis
    let { st: stSeri, t } = selesaikanSemuaSoalBiasaImbang(
      utama10,
      utama10.slice(0, 5),
      utama10.slice(5, 10),
      [],
      600,
      600
    );

    for (let r = 1; r <= 3; r += 1) {
      t += 250;
      stSeri = matchReducer(stSeri, { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: t }, utama10);
      stSeri = matchReducer(stSeri, { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: t }, utama10);
      t += 1300;
      stSeri = matchReducer(stSeri, { type: 'TICK', deltaMs: 1300, timestamp: t }, utama10);
    }

    const sumRiwayatSeri = stSeri.riwayat.reduce((a, b) => a + b.perubahanLangkah, 0);
    if (
      stSeri.fase !== 'selesai' ||
      stSeri.pemenang !== 'seri' ||
      stSeri.alasanAkhir !== 'seri' ||
      stSeri.caraMenang !== 'seri' ||
      sumRiwayatSeri !== stSeri.posisiTali
    ) {
      throw new Error('Waktu total sama setelah 3 ronde penentuan harus berakhir SERI resmi');
    }
  }

  // 16. Skenario "keduanya salah" berulang selalu berakhir maksimal di ronde ke-3
  {
    const utama10 = buatBankUtama(10);
    const cad5 = buatBankCadangan(5);
    const semua = [...utama10, ...cad5];
    let { st: stSalahTerus, t } = selesaikanSemuaSoalBiasaImbang(
      semua,
      utama10.slice(0, 5),
      utama10.slice(5, 10),
      cad5,
      500,
      500
    );

    let rondeMaksTerlihat = 0;
    for (let r = 1; r <= 5; r += 1) {
      if (stSalahTerus.fase !== 'penentuan' || !stSalahTerus.penentuan) break;
      rondeMaksTerlihat = Math.max(rondeMaksTerlihat, stSalahTerus.penentuan.rondeKe);
      t += 200;
      stSalahTerus = matchReducer(
        stSalahTerus,
        { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: t },
        semua
      );
      stSalahTerus = matchReducer(
        stSalahTerus,
        { type: 'JAWAB', tim: 'biru', indeksPilihan: 2, timestamp: t + 10 },
        semua
      );
      t += 1300;
      stSalahTerus = matchReducer(stSalahTerus, { type: 'TICK', deltaMs: 1300, timestamp: t }, semua);
    }

    if (rondeMaksTerlihat !== 3 || stSalahTerus.fase !== 'selesai') {
      throw new Error(
        `Skenario keduanya salah berulang harus berhenti maksimal di ronde 3 (terlihat: ${rondeMaksTerlihat}, fase: ${stSalahTerus.fase})`
      );
    }
  }

  // 17. Bank 1 soal per tim -> tidak error, langsung ke kecepatan/seri
  {
    // Kasus A: 2 soal berbeda (1 per tim) -> maks 1 ronde tukar, lalu kecepatan/seri tanpa error
    const bank2 = buatBankUtama(2);
    let { st: stSatuPerTim, t } = selesaikanSemuaSoalBiasaImbang(
      bank2,
      [bank2[0]],
      [bank2[1]],
      [],
      300,
      800
    );
    if (stSatuPerTim.fase === 'penentuan') {
      t += 200;
      stSatuPerTim = matchReducer(
        stSatuPerTim,
        { type: 'JAWAB', tim: 'merah', indeksPilihan: 0, timestamp: t },
        bank2
      );
      stSatuPerTim = matchReducer(
        stSatuPerTim,
        { type: 'JAWAB', tim: 'biru', indeksPilihan: 0, timestamp: t },
        bank2
      );
      t += 1300;
      stSatuPerTim = matchReducer(stSatuPerTim, { type: 'TICK', deltaMs: 1300, timestamp: t }, bank2);
    }
    if (stSatuPerTim.fase !== 'selesai' || stSatuPerTim.pemenang !== 'merah' || stSatuPerTim.alasanAkhir !== 'kecepatan') {
      throw new Error('Bank 1 soal per tim seharusnya berakhir bersih lewat kecepatan tanpa error');
    }

    // Kasus B: Hanya 1 soal di seluruh bank (kedua tim mendapat ID soal yang sama) -> tidak bisa tukar, langsung ke kecepatan/seri
    const bank1 = buatBankUtama(1);
    const { st: stBankTunggal } = selesaikanSemuaSoalBiasaImbang(
      bank1,
      [bank1[0]],
      [bank1[0]],
      [],
      500,
      500
    );
    if (stBankTunggal.fase !== 'selesai' || stBankTunggal.pemenang !== 'seri' || stBankTunggal.alasanAkhir !== 'seri') {
      throw new Error('Bank 1 soal tunggal harus langsung selesai seri tanpa error atau pengulangan soal');
    }
  }
}

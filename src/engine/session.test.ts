import { Game, Soal } from '../data/types';
import { buatContohGameBawaan } from '../data/contohGame';
import { buatCsvRekap } from '../utils/csvRekap';
import { buatPasanganDuelDenganTanda } from './deal';
import { buatMatchState, matchReducer } from './match';
import {
  ambilPeringkatTurnamen,
  buatSesiDuel,
  buatSesiTurnamen,
  catatHasilLagaKeSesi,
  siapkanDekLagaBerikutnya,
} from './session';

function buatBankBesar(jumlah: number): Soal[] {
  const dasar = buatContohGameBawaan().soal;
  const hasil: Soal[] = [];
  for (let i = 0; i < jumlah; i += 1) {
    const sumber = dasar[i % dasar.length];
    hasil.push({
      ...sumber,
      id: `uji_t5_${i + 1}`,
      pertanyaan: `Soal Uji #${i + 1}: ${sumber.pertanyaan}`,
    });
  }
  return hasil;
}

function jalankanLagaCepat(
  game: Game,
  pembagian: ReturnType<typeof siapkanDekLagaBerikutnya>['pembagian'],
  pemenangTarget: 'merah' | 'biru'
) {
  let st = buatMatchState({
    gameId: game.id,
    labelLaga: pembagian.labelLaga,
    namaTimKiri: pembagian.namaTimKiri,
    namaTimKanan: pembagian.namaTimKanan,
    rosterKiri: pembagian.urutanPemainKiri,
    rosterKanan: pembagian.urutanPemainKanan,
    dekKiriSiswa: pembagian.dekKiriSiswa,
    dekKananSiswa: pembagian.dekKananSiswa,
    cadanganSiswa: pembagian.cadanganSiswa,
    pengaturan: { ...game.pengaturan, akhirPermainan: 'waktu', durasiWaktu: 1 },
    lewatiCountdown: true,
  });

  const soalSiswaKiri = st.timKiri.dek[0];
  const soalAsliKiri = game.soal.find((s) => s.id === soalSiswaKiri.id)!;
  const soalSiswaKanan = st.timKanan.dek[0];
  const soalAsliKanan = game.soal.find((s) => s.id === soalSiswaKanan.id)!;

  if (pemenangTarget === 'merah') {
    st = matchReducer(
      st,
      { type: 'JAWAB', tim: 'merah', indeksPilihan: soalAsliKiri.kunci, timestamp: 100 },
      game.soal
    );
  } else {
    st = matchReducer(
      st,
      { type: 'JAWAB', tim: 'biru', indeksPilihan: soalAsliKanan.kunci, timestamp: 100 },
      game.soal
    );
  }

  st = matchReducer(st, { type: 'TICK', deltaMs: 65000, timestamp: 65100 }, game.soal);
  if (st.fase !== 'selesai') {
    throw new Error(`Laga ${pembagian.labelLaga} seharusnya selesai setelah waktu habis`);
  }
  return st;
}

export function jalankanPengujianTahap5(): void {
  const bankBesar = buatBankBesar(60);
  const contoh = buatContohGameBawaan();

  // 1. Turnamen 4 Tim penuh: Semifinal 1 -> Semifinal 2 -> Final -> Podium
  const gameTurnamen: Game = {
    ...contoh,
    soal: bankBesar,
    pengaturan: {
      ...contoh.pengaturan,
      mode: '4tim',
      namaTim: ['Garuda', 'Elang', 'Harimau', 'Rajawali'],
      anggota: [['Ani', 'Budi'], ['Cici', 'Dedi'], ['Eka', 'Fajar'], ['Gita', 'Hadi']],
      durasiWaktu: 0.5, // ~7 soal per tim per laga -> 3 laga * 19 = 57 <= 60 soal!
    },
  };

  let sesiT = buatSesiTurnamen(gameTurnamen);

  // Semifinal 1 (Garuda vs Elang -> Garuda menang)
  const sf1Prep = siapkanDekLagaBerikutnya(sesiT, gameTurnamen);
  sesiT = sf1Prep.sesiTerbaru;
  const idsSF1 = new Set([
    ...sf1Prep.pembagian.dekKiriSiswa.map((s) => s.id),
    ...sf1Prep.pembagian.dekKananSiswa.map((s) => s.id),
  ]);
  const stSF1 = jalankanLagaCepat(gameTurnamen, sf1Prep.pembagian, 'merah');
  sesiT = catatHasilLagaKeSesi(sesiT, stSF1);
  if (sesiT.turnamen?.tahapSaatIni !== 'semifinal2') {
    throw new Error('Setelah SF1 harus ke semifinal2');
  }

  // Semifinal 2 (Harimau vs Rajawali -> Rajawali menang)
  const sf2Prep = siapkanDekLagaBerikutnya(sesiT, gameTurnamen);
  sesiT = sf2Prep.sesiTerbaru;
  for (const s of [...sf2Prep.pembagian.dekKiriSiswa, ...sf2Prep.pembagian.dekKananSiswa]) {
    if (idsSF1.has(s.id)) {
      throw new Error('Soal SF2 mengulang soal SF1 padahal bank cukup');
    }
  }
  const idsSF1dan2 = new Set([
    ...idsSF1,
    ...sf2Prep.pembagian.dekKiriSiswa.map((s) => s.id),
    ...sf2Prep.pembagian.dekKananSiswa.map((s) => s.id),
  ]);
  const stSF2 = jalankanLagaCepat(gameTurnamen, sf2Prep.pembagian, 'biru');
  sesiT = catatHasilLagaKeSesi(sesiT, stSF2);
  if (sesiT.turnamen?.tahapSaatIni !== 'final') {
    throw new Error('Setelah SF2 harus ke final');
  }

  // Final (Garuda vs Rajawali -> Rajawali menang)
  const finalPrep = siapkanDekLagaBerikutnya(sesiT, gameTurnamen);
  sesiT = finalPrep.sesiTerbaru;
  if (
    finalPrep.pembagian.namaTimKiri !== 'Garuda' ||
    finalPrep.pembagian.namaTimKanan !== 'Rajawali'
  ) {
    throw new Error('Finalis turnamen salah');
  }
  for (const s of [...finalPrep.pembagian.dekKiriSiswa, ...finalPrep.pembagian.dekKananSiswa]) {
    if (idsSF1dan2.has(s.id)) {
      throw new Error('Soal Final mengulang soal semifinal padahal bank cukup');
    }
  }
  const stFinal = jalankanLagaCepat(gameTurnamen, finalPrep.pembagian, 'biru');
  sesiT = catatHasilLagaKeSesi(sesiT, stFinal);
  if (sesiT.turnamen?.tahapSaatIni !== 'selesai') {
    throw new Error('Turnamen seharusnya selesai setelah Final');
  }

  const podium = ambilPeringkatTurnamen(sesiT.turnamen);
  if (
    podium.juara1 !== 'Rajawali' ||
    podium.juara2 !== 'Garuda' ||
    !podium.juara3Bersama.includes('Elang') ||
    !podium.juara3Bersama.includes('Harimau')
  ) {
    throw new Error('Peringkat podium turnamen 4 tim tidak sesuai');
  }

  // 2. Duel 1 Lawan 1 jumlah siswa ganjil (5 siswa -> 3 partai, partai ke-3 ada penanda main 2x)
  const daftarGanjil = ['Rani', 'Budi', 'Citra', 'Dewi', 'Eko'];
  const pasanganGanjil = buatPasanganDuelDenganTanda(daftarGanjil);
  if (pasanganGanjil.length !== 3 || !pasanganGanjil[2].siswaMainDuaKali) {
    throw new Error('Undian ganjil 1 lawan 1 gagal menandai siswa main 2x');
  }
  if (pasanganGanjil[2].kanan === 'Pemain Cadangan') {
    throw new Error('Siswa ganjil seharusnya mendapat lawan acak teman sekelas, bukan dummy');
  }

  const gameDuel: Game = {
    ...contoh,
    soal: bankBesar,
    pengaturan: {
      ...contoh.pengaturan,
      mode: '1lawan1',
      durasiWaktu: 0.5,
    },
  };
  let sesiD = buatSesiDuel(gameDuel, pasanganGanjil);
  for (let i = 0; i < pasanganGanjil.length; i += 1) {
    const prep = siapkanDekLagaBerikutnya(sesiD, gameDuel);
    if (prep.pembagian.urutanPemainKiri.length !== 1 || prep.pembagian.urutanPemainKanan.length !== 1) {
      throw new Error('Duel 1 lawan 1 harus beranggota 1 orang per sisi');
    }
    sesiD = prep.sesiTerbaru;
    const stDuel = jalankanLagaCepat(gameDuel, prep.pembagian, 'merah');
    sesiD = catatHasilLagaKeSesi(sesiD, stDuel);
  }
  if (!sesiD.duel?.selesaiSemua || sesiD.duel.papanKemenangan.length !== 5) {
    throw new Error('Papan kemenangan duel 1 lawan 1 tidak lengkap');
  }

  // 3. Rekap CSV UTF-8 BOM
  const csv = buatCsvRekap(
    gameTurnamen.judul,
    '4tim',
    sesiT.riwayatLaga.map((l) => ({
      labelLaga: l.labelLaga,
      namaTimKiri: l.namaTimKiri,
      namaTimKanan: l.namaTimKanan,
      riwayat: l.riwayat,
    })),
    gameTurnamen.soal
  );
  if (!csv.startsWith('\uFEFF')) {
    throw new Error('CSV tidak diawali UTF-8 BOM');
  }
  if (!csv.includes('Semifinal 1') || !csv.includes('Final Turnamen') || !csv.includes('Garuda')) {
    throw new Error('Isi CSV tidak mencerminkan laga turnamen');
  }
}

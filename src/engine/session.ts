import { Game, ModePermainan, SoalSiswa, TimSisi } from '../data/types';
import { buatId } from '../utils/id';
import {
  ambilRosterEfektif,
  bagiSoalPertandingan,
  buatPasanganDuelDenganTanda,
  buatUrutanEstafet,
  hitungPerkiraanKebutuhanSoal,
  PasanganDuelTerundi,
} from './deal';
import {
  AlasanAkhirMatch,
  CaraMenangMatch,
  MatchState,
  RekapPemain,
  RiwayatTarikanMatch,
} from './match';

export interface HasilLagaRekap {
  nomorLaga: number;
  labelLaga: string;
  indeksTimKiri: number;
  indeksTimKanan: number;
  namaTimKiri: string;
  namaTimKanan: string;
  skorMerah: number;
  skorSalahMerah: number;
  skorBiru: number;
  skorSalahBiru: number;
  posisiTaliAkhir: number;
  pemenangSisi: TimSisi;
  namaPemenang: string;
  namaKalah: string;
  alasanAkhir: AlasanAkhirMatch;
  caraMenang?: CaraMenangMatch | null;
  keteranganMenang?: string | null;
  hasilSeri?: boolean;
  totalSoalTerjawab: number;
  rekapPemain: RekapPemain[];
  riwayat: RiwayatTarikanMatch[];
  siswaMainDuaKali?: string;
}

export interface TimTurnamenInfo {
  indeks: 0 | 1 | 2 | 3;
  nama: string;
  anggota: string[];
}

export interface LagaTurnamenSlot {
  timKiriIdx?: number;
  timKananIdx?: number;
  selesai: boolean;
  hasil?: HasilLagaRekap;
  pemenangIdx?: number;
  kalahIdx?: number;
}

export interface SesiTurnamen4Tim {
  tim: TimTurnamenInfo[];
  semifinal1: LagaTurnamenSlot;
  semifinal2: LagaTurnamenSlot;
  final: LagaTurnamenSlot;
  tahapSaatIni: 'semifinal1' | 'semifinal2' | 'final' | 'selesai';
}

export interface PartaiDuelSlot {
  nomorPartai: number;
  kiri: string;
  kanan: string;
  siswaMainDuaKali?: string;
  selesai: boolean;
  hasil?: HasilLagaRekap;
}

export interface RekapDuelPemain {
  nama: string;
  menang: number;
  kalah: number;
  seri?: number;
  totalBenar: number;
  totalSalah: number;
  mainDuaKali: boolean;
}

export interface SesiDuel1Lawan1 {
  daftarDuel: PartaiDuelSlot[];
  indeksPartaiAktif: number;
  selesaiSemua: boolean;
  papanKemenangan: RekapDuelPemain[];
}

export interface SesiModeAktif {
  idSesi: string;
  gameId: string;
  mode: ModePermainan;
  terpakaiIds: string[];
  bankDiacakUlangPernah: boolean;
  turnamen?: SesiTurnamen4Tim;
  duel?: SesiDuel1Lawan1;
  riwayatLaga: HasilLagaRekap[];
}

export interface PembagianLagaSiapMain {
  gameId: string;
  nomorLaga: number;
  labelLaga: string;
  namaTimKiri: string;
  namaTimKanan: string;
  urutanPemainKiri: string[];
  urutanPemainKanan: string[];
  dekKiriSiswa: SoalSiswa[];
  dekKananSiswa: SoalSiswa[];
  cadanganSiswa: SoalSiswa[];
  ringkasanKiri: Record<string, number>;
  ringkasanKanan: Record<string, number>;
  terpakaiIds: string[];
  bankDiacakUlang: boolean;
  siswaMainDuaKali?: string;
}

const SESSION_KEY_MODE = 'duel_otak_mode_session_v1';
const DEFAULT_NAMA_4TIM = ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Kuning'];

export function buatSesiTurnamen(game: Game): SesiModeAktif {
  const tim: TimTurnamenInfo[] = ([0, 1, 2, 3] as const).map((idx) => ({
    indeks: idx,
    nama: (game.pengaturan.namaTim[idx] ?? '').trim() || DEFAULT_NAMA_4TIM[idx],
    anggota: ambilRosterEfektif(
      game.pengaturan.anggota[idx] ?? [],
      game.pengaturan.jumlahPenarik
    ),
  }));

  return {
    idSesi: buatId('turnamen'),
    gameId: game.id,
    mode: '4tim',
    terpakaiIds: [],
    bankDiacakUlangPernah: false,
    turnamen: {
      tim,
      semifinal1: { timKiriIdx: 0, timKananIdx: 1, selesai: false },
      semifinal2: { timKiriIdx: 2, timKananIdx: 3, selesai: false },
      final: { selesai: false },
      tahapSaatIni: 'semifinal1',
    },
    riwayatLaga: [],
  };
}

export function buatSesiDuel(
  game: Game,
  pasanganInput?: readonly PasanganDuelTerundi[]
): SesiModeAktif {
  let daftarPasangan: PasanganDuelTerundi[];
  if (pasanganInput && pasanganInput.length > 0) {
    daftarPasangan = [...pasanganInput];
  } else {
    const semuaSiswa = [
      ...(game.pengaturan.anggota[0] ?? []),
      ...(game.pengaturan.anggota[1] ?? []),
    ]
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (semuaSiswa.length >= 2) {
      daftarPasangan = buatPasanganDuelDenganTanda(semuaSiswa);
    } else {
      daftarPasangan = [
        {
          kiri: (game.pengaturan.namaTim[0] ?? '').trim() || 'Pemain 1',
          kanan: (game.pengaturan.namaTim[1] ?? '').trim() || 'Pemain 2',
        },
      ];
    }
  }

  const daftarDuel: PartaiDuelSlot[] = daftarPasangan.map((p, idx) => ({
    nomorPartai: idx + 1,
    kiri: p.kiri,
    kanan: p.kanan,
    ...(p.siswaMainDuaKali ? { siswaMainDuaKali: p.siswaMainDuaKali } : {}),
    selesai: false,
  }));

  const papanAwal = hitungPapanKemenanganDuel(daftarDuel);

  return {
    idSesi: buatId('duel'),
    gameId: game.id,
    mode: '1lawan1',
    terpakaiIds: [],
    bankDiacakUlangPernah: false,
    duel: {
      daftarDuel,
      indeksPartaiAktif: 0,
      selesaiSemua: false,
      papanKemenangan: papanAwal,
    },
    riwayatLaga: [],
  };
}

function hitungSoalPerTimUntukLaga(game: Game): number {
  const jumlahSoalUtama = game.soal.filter((s) => !s.cadangan).length;
  const perkiraan = hitungPerkiraanKebutuhanSoal(game.pengaturan, jumlahSoalUtama);
  if (game.pengaturan.akhirPermainan === 'soalHabis') {
    if (game.pengaturan.mode === '4tim') {
      return Math.max(1, Math.floor(jumlahSoalUtama / 6));
    }
    return Math.max(1, Math.floor(jumlahSoalUtama / 2));
  }
  return Math.min(
    Math.max(1, Math.floor(jumlahSoalUtama / 2)),
    perkiraan.soalPerTimPerLaga
  );
}

/**
 * Menyiapkan dek soal baru (yang belum terpakai pada sesi ini) serta tim/pemain
 * untuk pertandingan berikutnya pada Mode 4 Tim atau 1 Lawan 1.
 */
export function siapkanDekLagaBerikutnya(
  sesi: SesiModeAktif,
  game: Game
): { sesiTerbaru: SesiModeAktif; pembagian: PembagianLagaSiapMain } {
  const jumlahPerTim = hitungSoalPerTimUntukLaga(game);
  const hasilBagi = bagiSoalPertandingan(game.soal, sesi.terpakaiIds, jumlahPerTim, 5);

  const sesiTerbaru: SesiModeAktif = {
    ...sesi,
    terpakaiIds: hasilBagi.terpakaiIdsSesudah,
    bankDiacakUlangPernah: sesi.bankDiacakUlangPernah || hasilBagi.bankDiacakUlang,
  };

  if (sesi.mode === '4tim' && sesi.turnamen) {
    const t = sesi.turnamen;
    let labelLaga = 'Semifinal 1';
    let nomorLaga = 1;
    let idxKiri = 0;
    let idxKanan = 1;

    if (t.tahapSaatIni === 'semifinal1') {
      labelLaga = 'Semifinal 1';
      nomorLaga = 1;
      idxKiri = t.semifinal1.timKiriIdx ?? 0;
      idxKanan = t.semifinal1.timKananIdx ?? 1;
    } else if (t.tahapSaatIni === 'semifinal2') {
      labelLaga = 'Semifinal 2';
      nomorLaga = 2;
      idxKiri = t.semifinal2.timKiriIdx ?? 2;
      idxKanan = t.semifinal2.timKananIdx ?? 3;
    } else {
      labelLaga = 'Final Turnamen';
      nomorLaga = 3;
      idxKiri = t.final.timKiriIdx ?? 0;
      idxKanan = t.final.timKananIdx ?? 2;
    }

    const timKiri = t.tim[idxKiri] ?? t.tim[0];
    const timKanan = t.tim[idxKanan] ?? t.tim[1];
    const jumlahGiliran = Math.max(8, hasilBagi.dekKiriSiswa.length);

    return {
      sesiTerbaru,
      pembagian: {
        gameId: game.id,
        nomorLaga,
        labelLaga,
        namaTimKiri: timKiri.nama,
        namaTimKanan: timKanan.nama,
        urutanPemainKiri: buatUrutanEstafet(
          timKiri.anggota,
          game.pengaturan.jumlahPenarik,
          jumlahGiliran
        ),
        urutanPemainKanan: buatUrutanEstafet(
          timKanan.anggota,
          game.pengaturan.jumlahPenarik,
          jumlahGiliran
        ),
        dekKiriSiswa: hasilBagi.dekKiriSiswa,
        dekKananSiswa: hasilBagi.dekKananSiswa,
        cadanganSiswa: hasilBagi.cadanganSiswa,
        ringkasanKiri: hasilBagi.ringkasanKiri,
        ringkasanKanan: hasilBagi.ringkasanKanan,
        terpakaiIds: hasilBagi.terpakaiIdsSesudah,
        bankDiacakUlang: hasilBagi.bankDiacakUlang,
      },
    };
  }

  // Mode 1 Lawan 1 (Duel): satu orang per sisi, tanpa estafet
  const duel = sesi.duel;
  const partai =
    duel?.daftarDuel[duel.indeksPartaiAktif] ?? {
      nomorPartai: 1,
      kiri: (game.pengaturan.namaTim[0] ?? '').trim() || 'Pemain 1',
      kanan: (game.pengaturan.namaTim[1] ?? '').trim() || 'Pemain 2',
      selesai: false,
    };

  return {
    sesiTerbaru,
    pembagian: {
      gameId: game.id,
      nomorLaga: partai.nomorPartai,
      labelLaga: `Duel Partai ${partai.nomorPartai}${
        partai.siswaMainDuaKali ? ` (${partai.siswaMainDuaKali} main 2x)` : ''
      }`,
      namaTimKiri: partai.kiri,
      namaTimKanan: partai.kanan,
      urutanPemainKiri: [partai.kiri],
      urutanPemainKanan: [partai.kanan],
      dekKiriSiswa: hasilBagi.dekKiriSiswa,
      dekKananSiswa: hasilBagi.dekKananSiswa,
      cadanganSiswa: hasilBagi.cadanganSiswa,
      ringkasanKiri: hasilBagi.ringkasanKiri,
      ringkasanKanan: hasilBagi.ringkasanKanan,
      terpakaiIds: hasilBagi.terpakaiIdsSesudah,
      bankDiacakUlang: hasilBagi.bankDiacakUlang,
      siswaMainDuaKali: partai.siswaMainDuaKali,
    },
  };
}

export function hitungPapanKemenanganDuel(
  daftarDuel: readonly PartaiDuelSlot[]
): RekapDuelPemain[] {
  const peta = new Map<string, RekapDuelPemain>();

  const ambilAtauBuat = (nama: string): RekapDuelPemain => {
    const ada = peta.get(nama);
    if (ada) return ada;
    const baru: RekapDuelPemain = {
      nama,
      menang: 0,
      kalah: 0,
      totalBenar: 0,
      totalSalah: 0,
      mainDuaKali: false,
    };
    peta.set(nama, baru);
    return baru;
  };

  for (const partai of daftarDuel) {
    const recKiri = ambilAtauBuat(partai.kiri);
    const recKanan = ambilAtauBuat(partai.kanan);
    if (partai.siswaMainDuaKali === partai.kiri) recKiri.mainDuaKali = true;
    if (partai.siswaMainDuaKali === partai.kanan) recKanan.mainDuaKali = true;

    if (partai.selesai && partai.hasil) {
      const h = partai.hasil;
      recKiri.totalBenar += h.skorMerah;
      recKiri.totalSalah += h.skorSalahMerah;
      recKanan.totalBenar += h.skorBiru;
      recKanan.totalSalah += h.skorSalahBiru;

      if (h.hasilSeri) {
        recKiri.seri = (recKiri.seri ?? 0) + 1;
        recKanan.seri = (recKanan.seri ?? 0) + 1;
      } else if (h.pemenangSisi === 'merah') {
        recKiri.menang += 1;
        recKanan.kalah += 1;
      } else {
        recKanan.menang += 1;
        recKiri.kalah += 1;
      }
    }
  }

  return Array.from(peta.values()).sort((a, b) => {
    if (b.menang !== a.menang) return b.menang - a.menang;
    if (b.totalBenar !== a.totalBenar) return b.totalBenar - a.totalBenar;
    return a.totalSalah - b.totalSalah;
  });
}

function tentukanSisiPemenang(match: MatchState): TimSisi {
  if (match.pemenang === 'merah' || match.pemenang === 'biru') {
    return match.pemenang;
  }
  if (match.posisiTali !== 0) {
    return match.posisiTali < 0 ? 'merah' : 'biru';
  }
  return match.timKiri.skorBenar >= match.timKanan.skorBenar ? 'merah' : 'biru';
}

export function catatHasilLagaKeSesi(
  sesi: SesiModeAktif,
  match: MatchState
): SesiModeAktif {
  const pemenangSisi = tentukanSisiPemenang(match);
  const namaPemenang =
    pemenangSisi === 'merah' ? match.timKiri.namaTim : match.timKanan.namaTim;
  const namaKalah =
    pemenangSisi === 'merah' ? match.timKanan.namaTim : match.timKiri.namaTim;

  const hasilSeri = match.pemenang === 'seri';

  if (sesi.mode === '4tim' && sesi.turnamen) {
    const t = sesi.turnamen;
    const buatHasilSlot = (
      nomorLaga: number,
      idxKiri: number,
      idxKanan: number
    ): HasilLagaRekap => ({
      nomorLaga,
      labelLaga: match.labelLaga,
      indeksTimKiri: idxKiri,
      indeksTimKanan: idxKanan,
      namaTimKiri: match.timKiri.namaTim,
      namaTimKanan: match.timKanan.namaTim,
      skorMerah: match.timKiri.skorBenar,
      skorSalahMerah: match.timKiri.skorSalah,
      skorBiru: match.timKanan.skorBenar,
      skorSalahBiru: match.timKanan.skorSalah,
      posisiTaliAkhir: match.posisiTali,
      pemenangSisi,
      namaPemenang,
      namaKalah,
      alasanAkhir: match.alasanAkhir,
      caraMenang: match.caraMenang ?? null,
      keteranganMenang: match.keteranganMenang ?? null,
      ...(hasilSeri ? { hasilSeri: true } : {}),
      totalSoalTerjawab:
        match.timKiri.soalTerjawabCount + match.timKanan.soalTerjawabCount,
      rekapPemain: Object.values(match.rekapPemain),
      riwayat: [...match.riwayat],
    });

    if (t.tahapSaatIni === 'semifinal1') {
      const idxKiri = t.semifinal1.timKiriIdx ?? 0;
      const idxKanan = t.semifinal1.timKananIdx ?? 1;
      const hasil = buatHasilSlot(1, idxKiri, idxKanan);
      const pemenangIdx = pemenangSisi === 'merah' ? idxKiri : idxKanan;
      const kalahIdx = pemenangSisi === 'merah' ? idxKanan : idxKiri;
      return {
        ...sesi,
        riwayatLaga: [...sesi.riwayatLaga, hasil],
        turnamen: {
          ...t,
          semifinal1: {
            ...t.semifinal1,
            selesai: true,
            hasil,
            pemenangIdx,
            kalahIdx,
          },
          final: {
            ...t.final,
            timKiriIdx: pemenangIdx,
          },
          tahapSaatIni: 'semifinal2',
        },
      };
    }

    if (t.tahapSaatIni === 'semifinal2') {
      const idxKiri = t.semifinal2.timKiriIdx ?? 2;
      const idxKanan = t.semifinal2.timKananIdx ?? 3;
      const hasil = buatHasilSlot(2, idxKiri, idxKanan);
      const pemenangIdx = pemenangSisi === 'merah' ? idxKiri : idxKanan;
      const kalahIdx = pemenangSisi === 'merah' ? idxKanan : idxKiri;
      return {
        ...sesi,
        riwayatLaga: [...sesi.riwayatLaga, hasil],
        turnamen: {
          ...t,
          semifinal2: {
            ...t.semifinal2,
            selesai: true,
            hasil,
            pemenangIdx,
            kalahIdx,
          },
          final: {
            ...t.final,
            timKananIdx: pemenangIdx,
          },
          tahapSaatIni: 'final',
        },
      };
    }

    if (t.tahapSaatIni === 'final') {
      const idxKiri = t.final.timKiriIdx ?? 0;
      const idxKanan = t.final.timKananIdx ?? 2;
      const hasil = buatHasilSlot(3, idxKiri, idxKanan);
      const pemenangIdx = pemenangSisi === 'merah' ? idxKiri : idxKanan;
      const kalahIdx = pemenangSisi === 'merah' ? idxKanan : idxKiri;
      return {
        ...sesi,
        riwayatLaga: [...sesi.riwayatLaga, hasil],
        turnamen: {
          ...t,
          final: {
            ...t.final,
            selesai: true,
            hasil,
            pemenangIdx,
            kalahIdx,
          },
          tahapSaatIni: 'selesai',
        },
      };
    }

    return sesi;
  }

  // Mode 1 Lawan 1
  if (sesi.mode === '1lawan1' && sesi.duel) {
    const d = sesi.duel;
    const idxAktif = d.indeksPartaiAktif;
    const partaiAktif = d.daftarDuel[idxAktif];
    if (!partaiAktif || partaiAktif.selesai) return sesi;

    const hasil: HasilLagaRekap = {
      nomorLaga: partaiAktif.nomorPartai,
      labelLaga: match.labelLaga,
      indeksTimKiri: -1,
      indeksTimKanan: -1,
      namaTimKiri: match.timKiri.namaTim,
      namaTimKanan: match.timKanan.namaTim,
      skorMerah: match.timKiri.skorBenar,
      skorSalahMerah: match.timKiri.skorSalah,
      skorBiru: match.timKanan.skorBenar,
      skorSalahBiru: match.timKanan.skorSalah,
      posisiTaliAkhir: match.posisiTali,
      pemenangSisi,
      namaPemenang,
      namaKalah,
      alasanAkhir: match.alasanAkhir,
      caraMenang: match.caraMenang ?? null,
      keteranganMenang: match.keteranganMenang ?? null,
      ...(hasilSeri ? { hasilSeri: true } : {}),
      totalSoalTerjawab:
        match.timKiri.soalTerjawabCount + match.timKanan.soalTerjawabCount,
      rekapPemain: Object.values(match.rekapPemain),
      riwayat: [...match.riwayat],
      ...(partaiAktif.siswaMainDuaKali
        ? { siswaMainDuaKali: partaiAktif.siswaMainDuaKali }
        : {}),
    };

    const daftarBaru = d.daftarDuel.map((p, i) =>
      i === idxAktif ? { ...p, selesai: true, hasil } : p
    );
    const berikutnya = idxAktif + 1;
    const selesaiSemua = berikutnya >= daftarBaru.length;

    return {
      ...sesi,
      riwayatLaga: [...sesi.riwayatLaga, hasil],
      duel: {
        daftarDuel: daftarBaru,
        indeksPartaiAktif: selesaiSemua ? idxAktif : berikutnya,
        selesaiSemua,
        papanKemenangan: hitungPapanKemenanganDuel(daftarBaru),
      },
    };
  }

  return sesi;
}

export function akhiriSesiDuelManual(sesi: SesiModeAktif): SesiModeAktif {
  if (!sesi.duel) return sesi;
  return {
    ...sesi,
    duel: {
      ...sesi.duel,
      selesaiSemua: true,
    },
  };
}

export function ambilPeringkatTurnamen(turnamen: SesiTurnamen4Tim): {
  juara1: string;
  juara2: string;
  juara3Bersama: [string, string];
} {
  const j1Idx = turnamen.final.pemenangIdx ?? 0;
  const j2Idx = turnamen.final.kalahIdx ?? 1;
  const j3aIdx = turnamen.semifinal1.kalahIdx ?? 1;
  const j3bIdx = turnamen.semifinal2.kalahIdx ?? 3;

  return {
    juara1: turnamen.tim[j1Idx]?.nama ?? 'Juara 1',
    juara2: turnamen.tim[j2Idx]?.nama ?? 'Juara 2',
    juara3Bersama: [
      turnamen.tim[j3aIdx]?.nama ?? 'Semifinalis 1',
      turnamen.tim[j3bIdx]?.nama ?? 'Semifinalis 2',
    ],
  };
}

export function gabungRekapPemainSesi(
  riwayatLaga: readonly HasilLagaRekap[]
): RekapPemain[] {
  const peta = new Map<string, RekapPemain>();
  for (const laga of riwayatLaga) {
    for (const p of laga.rekapPemain) {
      const kunci = `${p.tim}::${p.nama}`;
      const lama = peta.get(kunci);
      if (!lama) {
        peta.set(kunci, { ...p });
      } else {
        lama.soal += p.soal;
        lama.benar += p.benar;
        lama.salah += p.salah;
      }
    }
  }
  return Array.from(peta.values());
}

export function simpanSesiModeSessionStorage(sesi: SesiModeAktif): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_KEY_MODE, JSON.stringify(sesi));
    }
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
}

export function bacaSesiModeSessionStorage(): SesiModeAktif | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const mentah = window.sessionStorage.getItem(SESSION_KEY_MODE);
    if (!mentah) return null;
    return JSON.parse(mentah) as SesiModeAktif;
  } catch {
    return null;
  }
}

export function hapusSesiModeSessionStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_KEY_MODE);
    }
  } catch {
    // Abaikan
  }
}

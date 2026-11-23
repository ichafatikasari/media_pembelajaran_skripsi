import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { buatContohGameBawaan } from '../data/contohGame';
import { Game, Pengaturan, Soal, SoalSiswa, TimSisi } from '../data/types';
import {
  ambilRosterEfektif,
  bagiSoalPertandingan,
  buatPasanganDuelDenganTanda,
  buatUrutanEstafet,
  hitungPerkiraanKebutuhanSoal,
  PasanganDuelTerundi,
  undiPasanganDuel,
} from '../engine/deal';
import {
  ambilNamaTimResmi,
  hitungRingkasanDariLog,
  SoalReferensiAnalisis,
} from '../engine/hasilRekap';
import { buatPengaturanDefault } from '../engine/gameEngine';
import { AlasanAkhirMatch, bacaSesiMatchSessionStorage, CaraMenangMatch, hapusSesiMatchSessionStorage, MatchState, RiwayatTarikanMatch } from '../engine/match';
import {
  akhiriSesiDuelManual,
  bacaSesiModeSessionStorage,
  buatSesiDuel,
  buatSesiTurnamen,
  catatHasilLagaKeSesi,
  hapusSesiModeSessionStorage,
  RekapDuelPemain,
  SesiModeAktif,
  simpanSesiModeSessionStorage,
  siapkanDekLagaBerikutnya,
} from '../engine/session';
import { ItemToast, JenisToast } from '../components/Toast';
import {
  ambilKodeOnlineTersimpanUntukGame,
  hapusPetaKodeOnlineUntukGame,
  simpanKodeOnlineUntukGame,
} from '../services/gameOnlineService';
import { STORAGE_KEYS } from '../utils/constants';
import { buatId } from '../utils/id';
import { catatRiwayatDibuka } from '../utils/riwayatDibuka';
import {
  bacaDaftarRiwayatHasil,
  buatEntriRiwayatHasil,
  EntriRiwayatHasil,
  InfoPodiumTurnamenSnapshot,
  InputBuatEntriRiwayatHasil,
  simpanDaftarRiwayatHasil,
  urutkanRiwayatHasilTerbaru,
} from '../utils/riwayatHasil';
import {
  bacaDaftarSampahGame,
  ItemSampahGame,
  masukkanGameKeSampah,
  pulihkanGameDariSampah,
  simpanDaftarSampahGame,
} from '../utils/sampahGame';
import {
  apakahLocalStorageTersedia,
  bacaStorage,
  bacaStorageRaw,
  tulisStorage,
} from '../utils/storage';
import {
  bacaSesiMasukWizard,
  hapusDrafWizardGame,
  hapusSampahGame,
  ModeMasukWizard,
  simpanSesiMasukWizard,
  tandaiSampahGameDisimpanFinal,
} from '../utils/wizardDraft';

export interface RingkasanHasilSesi {
  riwayatHasilId?: string;
  gameId?: string;
  judulGame?: string;
  mapel?: string;
  namaSekolah?: string;
  dibuatPada?: number;
  durasiDetik?: number;
  langkahKeGaris?: number;
  jumlahPenarik?: 3 | 4 | 5;
  mode?: Game['pengaturan']['mode'];
  labelLaga?: string;
  pemenang: TimSisi | 'seri';
  namaTimKiri: string;
  namaTimKanan: string;
  rosterKiri?: string[];
  rosterKanan?: string[];
  skorMerah: number;
  skorSalahMerah: number;
  skorBiru: number;
  skorSalahBiru: number;
  posisiTaliAkhir: number;
  totalSoalTerjawab: number;
  alasanAkhir: AlasanAkhirMatch;
  caraMenang?: CaraMenangMatch | null;
  keteranganMenang?: string | null;
  rekapPemain: {
    nama: string;
    tim: TimSisi;
    soal: number;
    benar: number;
    salah: number;
  }[];
  riwayat?: RiwayatTarikanMatch[];
  soalSnapshot?: SoalReferensiAnalisis[];
  turnamenSnapshot?: InfoPodiumTurnamenSnapshot;
  duelSnapshot?: RekapDuelPemain[];
}

export interface IdentitasGameInput {
  judul: string;
  mapel: string;
  namaSekolah: string;
}

export interface SesiPembagianPertandingan {
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
  pasanganDuel: [string, string][];
}

export interface StateMasukWizard {
  mode: ModeMasukWizard;
  gameId: string | null;
  nonce: number;
}

interface AppStoreValue {
  daftarGame: Game[];
  daftarSampahGame: ItemSampahGame[];
  riwayatHasil: EntriRiwayatHasil[];
  hasilAktifId: string | null;
  tampilanHasil: 'daftar' | 'detail';
  entriCetakHasil: EntriRiwayatHasil | null;
  gameAktif: Game | null;
  penyimpananTersedia: boolean;
  daftarToast: ItemToast[];
  hasilSesi: RingkasanHasilSesi;
  sesiPembagian: SesiPembagianPertandingan | null;
  sesiMode: SesiModeAktif | null;
  pinEditTerbukaId: string | null;
  gameBaruDisorotId: string | null;
  modeMasukWizard: StateMasukWizard;
  bukaWizardBuatGame: (mode: ModeMasukWizard, gameId?: string | null) => void;
  bukaIzinEditDenganPin: (gameId: string) => void;
  tutupIzinEditPin: () => void;
  pilihGameAktif: (id: string, tanpaToast?: boolean) => void;
  tambahGameBaru: (
    judul: string,
    mapel: string,
    namaSekolah: string,
    tanpaToast?: boolean
  ) => Game;
  simpanDrafGameOtomatis: (
    gameId: string,
    patch: {
      judul?: string;
      mapel?: string;
      namaSekolah?: string;
      soal?: Soal[];
      pengaturan?: Pengaturan;
      status?: 'draf' | 'siap';
    }
  ) => Game | null;
  tandaiGameTersimpan: (
    gameId: string,
    opsi?: { sorot?: boolean; pesanToast?: string; pengaturan?: Pengaturan }
  ) => Game | null;
  simpanSoalKeGameAktif: (
    identitas: IdentitasGameInput,
    soalList: Soal[],
    mode: 'ganti' | 'tambah',
    status?: 'draf' | 'siap'
  ) => Game;
  buatGameDenganSoal: (
    identitas: IdentitasGameInput,
    soalList: Soal[],
    status?: 'draf' | 'siap'
  ) => Game;
  duplikasiGame: (id: string) => Game | null;
  ubahNamaGame: (
    id: string,
    judulBaru: string,
    mapelBaru?: string,
    namaSekolahBaru?: string
  ) => Game | null;
  imporGameDariPaket: (
    gamePaket: Game,
    strategi: 'simpan_baru' | 'timpa',
    targetTimpaId?: string
  ) => Game;
  hapusGame: (id: string, opsi?: { hapusOnlineDihapus?: boolean }) => void;
  hapusBanyakGame: (ids: string[], opsi?: { hapusOnlineDihapus?: boolean }) => void;
  pulihkanDariSampahGame: (ids: string[]) => void;
  hapusPermanenDariSampahGame: (ids: string[]) => void;
  kosongkanSemuaSampahGame: () => void;
  perbaruiPengaturanGameAktif: (
    pengaturan: Pengaturan,
    identitas?: Partial<IdentitasGameInput>
  ) => Game | null;
  mulaiSesiPembagian: (
    gameSumber?: Game,
    pasanganDuel?: [string, string][]
  ) => SesiPembagianPertandingan | null;
  mulaiSesiTurnamenBaru: (gameSumber?: Game) => SesiModeAktif | null;
  mulaiSesiDuelBaru: (
    gameSumber?: Game,
    pasanganInput?: PasanganDuelTerundi[]
  ) => SesiModeAktif | null;
  siapkanLagaDariSesiMode: () => SesiPembagianPertandingan | null;
  catatLagaSelesaiKeSesiMode: (match: MatchState) => SesiModeAktif | null;
  akhiriDuelSekarang: () => SesiModeAktif | null;
  resetSesiMode: () => void;
  siapkanLagaBerikutnya: () => void;
  pulihkanContohGame: () => void;
  setHasilSesi: (hasil: RingkasanHasilSesi) => void;
  simpanHasilPertandinganKeRiwayat: (
    input: InputBuatEntriRiwayatHasil,
    opsi?: { bukaDetail?: boolean; updateHasilSesi?: boolean }
  ) => EntriRiwayatHasil;
  bukaDetailRiwayatHasil: (id: string) => void;
  bukaDaftarRiwayatHasil: () => void;
  hapusRiwayatHasil: (ids: string[], opsi?: { kembaliKeDaftar?: boolean }) => void;
  hapusSemuaRiwayatHasil: () => void;
  siapkanCetakHasil: (entri: EntriRiwayatHasil | null) => void;
  tampilkanToast: (
    pesan: string,
    jenis?: JenisToast,
    opsi?: { durasiMs?: number; aksiLabel?: string; onAksi?: () => void }
  ) => void;
  hapusToast: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function urutkanGameTerbaru(daftar: Game[]): Game[] {
  return [...daftar].sort((a, b) => (b.diubahPada ?? 0) - (a.diubahPada ?? 0));
}

export function muatDaftarGameDariStorage(): Game[] {
  const mentah = bacaStorageRaw(STORAGE_KEYS.GAMES);
  if (mentah === null) {
    // Hanya pada kunjungan pertama kali (kunci belum pernah dibuat): isi 1 contoh game bawaan
    const contoh = buatContohGameBawaan();
    tulisStorage(STORAGE_KEYS.GAMES, [contoh]);
    return [contoh];
  }
  const tersimpan = bacaStorage<Game[]>(STORAGE_KEYS.GAMES, []);
  if (Array.isArray(tersimpan)) {
    return urutkanGameTerbaru(tersimpan);
  }
  return [];
}

export function muatGameAktifIdAwal(daftarAwal: Game[]): string {
  const mentah = bacaStorageRaw(STORAGE_KEYS.ACTIVE_GAME_ID);
  if (mentah === null) {
    if (daftarAwal.length > 0) {
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, daftarAwal[0].id);
      return daftarAwal[0].id;
    }
    return '';
  }
  const tersimpan = bacaStorage<string>(STORAGE_KEYS.ACTIVE_GAME_ID, '');
  if (typeof tersimpan === 'string' && tersimpan && daftarAwal.some((g) => g.id === tersimpan)) {
    return tersimpan;
  }
  return '';
}

function tentukanDetailLaga(
  pengaturan: Pengaturan,
  nomorLaga: number,
  pasanganDuel: [string, string][]
): {
  labelLaga: string;
  namaTimKiri: string;
  namaTimKanan: string;
  anggotaKiri: string[];
  anggotaKanan: string[];
} {
  if (pengaturan.mode === '4tim') {
    const indeksLaga = (nomorLaga - 1) % 3;
    if (indeksLaga === 0) {
      return {
        labelLaga: `Semifinal 1 (${ambilNamaTimResmi(pengaturan, 0)} vs ${ambilNamaTimResmi(pengaturan, 1)})`,
        namaTimKiri: ambilNamaTimResmi(pengaturan, 0),
        namaTimKanan: ambilNamaTimResmi(pengaturan, 1),
        anggotaKiri: ambilRosterEfektif(pengaturan.anggota[0] ?? [], pengaturan.jumlahPenarik),
        anggotaKanan: ambilRosterEfektif(pengaturan.anggota[1] ?? [], pengaturan.jumlahPenarik),
      };
    }
    if (indeksLaga === 1) {
      return {
        labelLaga: `Semifinal 2 (${ambilNamaTimResmi(pengaturan, 2)} vs ${ambilNamaTimResmi(pengaturan, 3)})`,
        namaTimKiri: ambilNamaTimResmi(pengaturan, 2),
        namaTimKanan: ambilNamaTimResmi(pengaturan, 3),
        anggotaKiri: ambilRosterEfektif(pengaturan.anggota[2] ?? [], pengaturan.jumlahPenarik),
        anggotaKanan: ambilRosterEfektif(pengaturan.anggota[3] ?? [], pengaturan.jumlahPenarik),
      };
    }
    return {
      labelLaga: 'Final Juara (Pemenang Semifinal 1 vs Semifinal 2)',
      namaTimKiri: `Juara ${ambilNamaTimResmi(pengaturan, 0)}`,
      namaTimKanan: `Juara ${ambilNamaTimResmi(pengaturan, 2)}`,
      anggotaKiri: ambilRosterEfektif(pengaturan.anggota[0] ?? [], pengaturan.jumlahPenarik),
      anggotaKanan: ambilRosterEfektif(pengaturan.anggota[2] ?? [], pengaturan.jumlahPenarik),
    };
  }

  if (pengaturan.mode === '1lawan1') {
    const daftarPasangan =
      pasanganDuel.length > 0
        ? pasanganDuel
        : undiPasanganDuel([...(pengaturan.anggota[0] ?? []), ...(pengaturan.anggota[1] ?? [])]);
    const pasangan = daftarPasangan[(nomorLaga - 1) % daftarPasangan.length] ?? [
      'Pemain 1',
      'Pemain 2',
    ];
    return {
      labelLaga: `Duel 1 Lawan 1 · Partai ${((nomorLaga - 1) % daftarPasangan.length) + 1}`,
      namaTimKiri: pasangan[0],
      namaTimKanan: pasangan[1],
      anggotaKiri: [pasangan[0]],
      anggotaKanan: [pasangan[1]],
    };
  }

  return {
    labelLaga: nomorLaga === 1 ? 'Pertandingan Utama (2 Tim)' : `Pertandingan Ke-${nomorLaga}`,
    namaTimKiri: ambilNamaTimResmi(pengaturan, 0),
    namaTimKanan: ambilNamaTimResmi(pengaturan, 1),
    anggotaKiri: ambilRosterEfektif(pengaturan.anggota[0] ?? [], pengaturan.jumlahPenarik),
    anggotaKanan: ambilRosterEfektif(pengaturan.anggota[1] ?? [], pengaturan.jumlahPenarik),
  };
}

export function buatSesiPembagianMurni(
  gameSumber: Game,
  nomorLaga = 1,
  terpakaiSebelumnya: string[] = [],
  pasanganDuelInput: [string, string][] = []
): SesiPembagianPertandingan {
  const pasanganDuel =
    pasanganDuelInput.length > 0
      ? pasanganDuelInput
      : gameSumber.pengaturan.mode === '1lawan1'
        ? undiPasanganDuel([
            ...(gameSumber.pengaturan.anggota[0] ?? []),
            ...(gameSumber.pengaturan.anggota[1] ?? []),
          ])
        : [];

  const jumlahSoalUtama = gameSumber.soal.filter((s) => !s.cadangan).length;
  const perkiraan = hitungPerkiraanKebutuhanSoal(gameSumber.pengaturan, jumlahSoalUtama);
  const jumlahPerTim =
    gameSumber.pengaturan.akhirPermainan === 'soalHabis'
      ? Math.max(1, Math.floor(jumlahSoalUtama / 2))
      : Math.min(Math.max(1, Math.floor(jumlahSoalUtama / 2)), perkiraan.soalPerTimPerLaga);

  const hasilBagi = bagiSoalPertandingan(
    gameSumber.soal,
    terpakaiSebelumnya,
    jumlahPerTim,
    5
  );

  const detail = tentukanDetailLaga(gameSumber.pengaturan, nomorLaga, pasanganDuel);
  const jumlahGiliran = Math.max(8, hasilBagi.dekKiriSiswa.length);

  return {
    gameId: gameSumber.id,
    nomorLaga,
    labelLaga: detail.labelLaga,
    namaTimKiri: detail.namaTimKiri,
    namaTimKanan: detail.namaTimKanan,
    urutanPemainKiri: buatUrutanEstafet(
      detail.anggotaKiri,
      gameSumber.pengaturan.jumlahPenarik,
      jumlahGiliran
    ),
    urutanPemainKanan: buatUrutanEstafet(
      detail.anggotaKanan,
      gameSumber.pengaturan.jumlahPenarik,
      jumlahGiliran
    ),
    dekKiriSiswa: hasilBagi.dekKiriSiswa,
    dekKananSiswa: hasilBagi.dekKananSiswa,
    cadanganSiswa: hasilBagi.cadanganSiswa,
    ringkasanKiri: hasilBagi.ringkasanKiri,
    ringkasanKanan: hasilBagi.ringkasanKanan,
    terpakaiIds: hasilBagi.terpakaiIdsSesudah,
    bankDiacakUlang: hasilBagi.bankDiacakUlang,
    pasanganDuel,
  };
}

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [daftarGame, setDaftarGame] = useState<Game[]>(() => muatDaftarGameDariStorage());
  const [gameAktifId, setGameAktifId] = useState<string>(() => {
    const awal = muatDaftarGameDariStorage();
    return muatGameAktifIdAwal(awal);
  });
  const [daftarSampahGame, setDaftarSampahGame] = useState<ItemSampahGame[]>(() => {
    const { daftar, idKedaluwarsa } = bacaDaftarSampahGame();
    for (const id of idKedaluwarsa) {
      hapusDrafWizardGame(id);
      hapusSampahGame(id);
      hapusPetaKodeOnlineUntukGame(id);
    }
    return daftar;
  });
  const [penyimpananTersedia, setPenyimpananTersedia] = useState<boolean>(() =>
    apakahLocalStorageTersedia()
  );
  const [pinEditTerbukaId, setPinEditTerbukaId] = useState<string | null>(null);
  const [gameBaruDisorotId, setGameBaruDisorotId] = useState<string | null>(null);
  const [modeMasukWizard, setModeMasukWizard] = useState<StateMasukWizard>(() => {
    const sesi = bacaSesiMasukWizard();
    return {
      mode: sesi?.mode ?? 'baru',
      gameId: sesi?.gameId ?? null,
      nonce: 0,
    };
  });
  const [daftarToast, setDaftarToast] = useState<ItemToast[]>([]);
  const [sesiPembagian, setSesiPembagian] = useState<SesiPembagianPertandingan | null>(null);
  const [sesiMode, setSesiMode] = useState<SesiModeAktif | null>(() =>
    bacaSesiModeSessionStorage()
  );
  const [riwayatHasil, setRiwayatHasil] = useState<EntriRiwayatHasil[]>(() =>
    bacaDaftarRiwayatHasil()
  );
  const [hasilAktifId, setHasilAktifId] = useState<string | null>(null);
  const [tampilanHasil, setTampilanHasil] = useState<'daftar' | 'detail'>('daftar');
  const [entriCetakHasil, setEntriCetakHasil] = useState<EntriRiwayatHasil | null>(null);
  const [hasilSesi, setHasilSesi] = useState<RingkasanHasilSesi>({
    mode: '2tim',
    pemenang: 'merah',
    namaTimKiri: 'Tim Merah',
    namaTimKanan: 'Tim Biru',
    skorMerah: 0,
    skorSalahMerah: 0,
    skorBiru: 0,
    skorSalahBiru: 0,
    posisiTaliAkhir: 0,
    totalSoalTerjawab: 0,
    alasanAkhir: null,
    rekapPemain: [],
    riwayat: [],
  });

  const timerToastRef = useRef<Map<string, number>>(new Map());
  const timerSorotRef = useRef<number | null>(null);
  const daftarGameRef = useRef<Game[]>(daftarGame);
  daftarGameRef.current = daftarGame;
  const daftarSampahRef = useRef<ItemSampahGame[]>(daftarSampahGame);
  daftarSampahRef.current = daftarSampahGame;
  const gameAktifIdRef = useRef<string>(gameAktifId);
  gameAktifIdRef.current = gameAktifId;
  const riwayatHasilRef = useRef<EntriRiwayatHasil[]>(riwayatHasil);
  riwayatHasilRef.current = riwayatHasil;

  const gameAktif = useMemo<Game | null>(() => {
    if (daftarGame.length === 0 || !gameAktifId) return null;
    return daftarGame.find((g) => g.id === gameAktifId) ?? null;
  }, [daftarGame, gameAktifId]);

  const hapusToast = useCallback((id: string) => {
    const timer = timerToastRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timerToastRef.current.delete(id);
    }
    setDaftarToast((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const tampilkanToast = useCallback(
    (
      pesan: string,
      jenis: JenisToast = 'info',
      opsi?: { durasiMs?: number; aksiLabel?: string; onAksi?: () => void }
    ) => {
      const id = buatId('toast');
      setDaftarToast((prev) => [
        ...prev.slice(-2),
        {
          id,
          pesan,
          jenis,
          ...(opsi?.aksiLabel ? { aksiLabel: opsi.aksiLabel } : {}),
          ...(opsi?.onAksi ? { onAksi: opsi.onAksi } : {}),
        },
      ]);
      const durasi = opsi?.durasiMs ?? 3800;
      const timer = window.setTimeout(() => {
        hapusToast(id);
      }, durasi);
      timerToastRef.current.set(id, timer);
    },
    [hapusToast]
  );

  const simpanDaftarKeStorage = useCallback((daftar: Game[]) => {
    const terurut = urutkanGameTerbaru(daftar);
    const berhasil = tulisStorage(STORAGE_KEYS.GAMES, terurut);
    setPenyimpananTersedia(berhasil);
    return terurut;
  }, []);

  const bukaIzinEditDenganPin = useCallback((gameId: string) => {
    setPinEditTerbukaId(gameId);
  }, []);

  const tutupIzinEditPin = useCallback(() => {
    setPinEditTerbukaId(null);
  }, []);

  const pilihGameAktif = useCallback(
    (id: string, tanpaToast = false) => {
      setGameAktifId(id);
      const berhasil = tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, id);
      if (!berhasil) setPenyimpananTersedia(false);
      setSesiPembagian(null);
      if (!tanpaToast) {
        const target = daftarGame.find((g) => g.id === id);
        if (target) {
          tampilkanToast(`Game aktif diganti ke "${target.judul}".`, 'sukses');
        }
      }
    },
    [daftarGame, tampilkanToast]
  );

  const bukaWizardBuatGame = useCallback(
    (mode: ModeMasukWizard, gameId: string | null = null) => {
      if ((mode === 'edit' || mode === 'lanjut_draf') && gameId) {
        setGameAktifId(gameId);
        tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, gameId);
        setSesiPembagian(null);
      }
      simpanSesiMasukWizard({ mode, gameId });
      setModeMasukWizard({ mode, gameId, nonce: Date.now() });
    },
    []
  );

  const tambahGameBaru = useCallback(
    (judul: string, mapel: string, namaSekolah: string, tanpaToast = false): Game => {
      const sekarang = Date.now();
      const gameBaru: Game = {
        id: buatId('game'),
        judul: judul.trim() || 'Game Kuis Baru',
        mapel: mapel.trim() || 'Umum',
        namaSekolah: namaSekolah.trim(),
        soal: [],
        pengaturan: buatPengaturanDefault(),
        status: 'draf',
        dibuatPada: sekarang,
        diubahPada: sekarang,
      };
      setDaftarGame((prev) => simpanDaftarKeStorage([gameBaru, ...prev]));
      setGameAktifId(gameBaru.id);
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, gameBaru.id);
      setSesiPembagian(null);
      simpanSesiMasukWizard({ mode: 'lanjut_draf', gameId: gameBaru.id });
      if (!tanpaToast) {
        tampilkanToast(`Game "${gameBaru.judul}" berhasil dibuat.`, 'sukses');
      }
      return gameBaru;
    },
    [simpanDaftarKeStorage, tampilkanToast]
  );

  const simpanDrafGameOtomatis = useCallback(
    (
      gameId: string,
      patch: {
        judul?: string;
        mapel?: string;
        namaSekolah?: string;
        soal?: Soal[];
        pengaturan?: Pengaturan;
        status?: 'draf' | 'siap';
      }
    ): Game | null => {
      const target = daftarGame.find((g) => g.id === gameId);
      if (!target) return null;
      const terbarui: Game = {
        ...target,
        ...(patch.judul !== undefined
          ? { judul: patch.judul.trim() || target.judul }
          : {}),
        ...(patch.mapel !== undefined
          ? { mapel: patch.mapel.trim() || 'Umum' }
          : {}),
        ...(patch.namaSekolah !== undefined
          ? { namaSekolah: patch.namaSekolah.trim() }
          : {}),
        ...(patch.soal !== undefined ? { soal: [...patch.soal] } : {}),
        ...(patch.pengaturan !== undefined ? { pengaturan: patch.pengaturan } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        diubahPada: Date.now(),
      };
      setDaftarGame((prev) =>
        simpanDaftarKeStorage(prev.map((g) => (g.id === gameId ? terbarui : g)))
      );
      return terbarui;
    },
    [daftarGame, simpanDaftarKeStorage]
  );

  const tandaiGameTersimpan = useCallback(
    (
      gameId: string,
      opsi?: { sorot?: boolean; pesanToast?: string; pengaturan?: Pengaturan }
    ): Game | null => {
      const target = daftarGame.find((g) => g.id === gameId);
      if (!target) return null;
      const terbarui: Game = {
        ...target,
        ...(opsi?.pengaturan ? { pengaturan: opsi.pengaturan } : {}),
        status: 'siap',
        diubahPada: Date.now(),
      };
      setDaftarGame((prev) =>
        simpanDaftarKeStorage(prev.map((g) => (g.id === gameId ? terbarui : g)))
      );
      setGameAktifId(gameId);
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, gameId);
      tandaiSampahGameDisimpanFinal(gameId);
      hapusDrafWizardGame(gameId);
      simpanSesiMasukWizard(null);

      if (opsi?.sorot) {
        if (timerSorotRef.current !== null) {
          window.clearTimeout(timerSorotRef.current);
        }
        setGameBaruDisorotId(gameId);
        timerSorotRef.current = window.setTimeout(() => {
          setGameBaruDisorotId(null);
          timerSorotRef.current = null;
        }, 5000);
      }
      if (opsi?.pesanToast) {
        tampilkanToast(opsi.pesanToast, 'sukses');
      }
      return terbarui;
    },
    [daftarGame, simpanDaftarKeStorage, tampilkanToast]
  );

  const buatGameDenganSoal = useCallback(
    (
      identitas: IdentitasGameInput,
      soalList: Soal[],
      status: 'draf' | 'siap' = 'draf'
    ): Game => {
      const sekarang = Date.now();
      const gameBaru: Game = {
        id: buatId('game'),
        judul: identitas.judul.trim() || 'Game Kuis Baru',
        mapel: identitas.mapel.trim() || 'Umum',
        namaSekolah: identitas.namaSekolah.trim(),
        soal: [...soalList],
        pengaturan: buatPengaturanDefault(),
        status,
        dibuatPada: sekarang,
        diubahPada: sekarang,
      };
      setDaftarGame((prev) => simpanDaftarKeStorage([gameBaru, ...prev]));
      setGameAktifId(gameBaru.id);
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, gameBaru.id);
      return gameBaru;
    },
    [simpanDaftarKeStorage]
  );

  const simpanSoalKeGameAktif = useCallback(
    (
      identitas: IdentitasGameInput,
      soalList: Soal[],
      mode: 'ganti' | 'tambah',
      status: 'draf' | 'siap' = 'siap'
    ): Game => {
      if (!gameAktif) {
        return buatGameDenganSoal(identitas, soalList, status);
      }
      const targetId = gameAktif.id;
      const soalGabungan = mode === 'tambah' ? [...gameAktif.soal, ...soalList] : [...soalList];
      const gameTerbaru: Game = {
        ...gameAktif,
        judul: identitas.judul.trim() || gameAktif.judul,
        mapel: identitas.mapel.trim() || gameAktif.mapel,
        namaSekolah: identitas.namaSekolah.trim(),
        soal: soalGabungan,
        status,
        diubahPada: Date.now(),
      };

      setDaftarGame((prev) => {
        const ada = prev.some((g) => g.id === targetId);
        const berikutnya = ada
          ? prev.map((g) => (g.id === targetId ? gameTerbaru : g))
          : [gameTerbaru, ...prev];
        return simpanDaftarKeStorage(berikutnya);
      });

      setGameAktifId(targetId);
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, targetId);
      return gameTerbaru;
    },
    [buatGameDenganSoal, gameAktif, simpanDaftarKeStorage]
  );

  const duplikasiGame = useCallback(
    (id: string): Game | null => {
      const sumber = daftarGame.find((g) => g.id === id);
      if (!sumber) return null;
      const sekarang = Date.now();
      const salinan: Game = {
        ...sumber,
        id: buatId('game'),
        judul: `${sumber.judul} (Salinan)`,
        soal: sumber.soal.map((s) => ({ ...s, id: buatId('soal'), pilihan: [...s.pilihan] })),
        pengaturan: {
          ...sumber.pengaturan,
          namaTim: [...sumber.pengaturan.namaTim],
          anggota: sumber.pengaturan.anggota.map((a) => [...a]),
        },
        dibuatPada: sekarang,
        diubahPada: sekarang,
      };
      setDaftarGame((prev) => simpanDaftarKeStorage([salinan, ...prev]));
      setGameAktifId(salinan.id);
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, salinan.id);
      setSesiPembagian(null);
      tampilkanToast(`Game "${sumber.judul}" berhasil diduplikasi.`, 'sukses');
      return salinan;
    },
    [daftarGame, simpanDaftarKeStorage, tampilkanToast]
  );

  const ubahNamaGame = useCallback(
    (
      id: string,
      judulBaru: string,
      mapelBaru?: string,
      namaSekolahBaru?: string
    ): Game | null => {
      const target = daftarGame.find((g) => g.id === id);
      if (!target) return null;
      const judulBersih = judulBaru.trim() || target.judul;
      const terbarui: Game = {
        ...target,
        judul: judulBersih,
        mapel: mapelBaru !== undefined ? mapelBaru.trim() || target.mapel : target.mapel,
        namaSekolah:
          namaSekolahBaru !== undefined ? namaSekolahBaru.trim() : target.namaSekolah,
        diubahPada: Date.now(),
      };
      setDaftarGame((prev) =>
        simpanDaftarKeStorage(prev.map((g) => (g.id === id ? terbarui : g)))
      );
      tampilkanToast(`Nama game diubah menjadi "${terbarui.judul}".`, 'sukses');
      return terbarui;
    },
    [daftarGame, simpanDaftarKeStorage, tampilkanToast]
  );

  const imporGameDariPaket = useCallback(
    (
      gamePaket: Game,
      strategi: 'simpan_baru' | 'timpa',
      targetTimpaId?: string
    ): Game => {
      const sekarang = Date.now();
      const idTarget =
        strategi === 'timpa' && targetTimpaId
          ? targetTimpaId
          : strategi === 'timpa'
            ? gamePaket.id
            : buatId('game');

      const gameFinal: Game = {
        ...gamePaket,
        id: idTarget,
        soal: gamePaket.soal.map((s) => ({ ...s, pilihan: [...s.pilihan] })),
        pengaturan: {
          ...gamePaket.pengaturan,
          namaTim: [...gamePaket.pengaturan.namaTim],
          anggota: gamePaket.pengaturan.anggota.map((a) => [...a]),
        },
        dibuatPada: strategi === 'simpan_baru' ? sekarang : gamePaket.dibuatPada || sekarang,
        diubahPada: sekarang,
      };

      setDaftarGame((prev) => {
        const adaTarget = strategi === 'timpa' && prev.some((g) => g.id === idTarget);
        const berikutnya = adaTarget
          ? prev.map((g) => (g.id === idTarget ? gameFinal : g))
          : [gameFinal, ...prev];
        return simpanDaftarKeStorage(berikutnya);
      });

      setGameAktifId(gameFinal.id);
      tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, gameFinal.id);
      setSesiPembagian(null);
      setSesiMode(null);
      hapusSesiModeSessionStorage();
      tampilkanToast(`Game "${gameFinal.judul}" berhasil diimpor ke Game Saya.`, 'sukses');
      return gameFinal;
    },
    [simpanDaftarKeStorage, tampilkanToast]
  );

  const pulihkanGameByIds = useCallback(
    (targetIds: string[], opsi?: { pesanKhusus?: string }) => {
      if (targetIds.length === 0) return;
      const { daftarGameBaru, daftarSampahBaru, dipulihkan } = pulihkanGameDariSampah(
        daftarGameRef.current,
        daftarSampahRef.current,
        targetIds
      );
      if (dipulihkan.length === 0) return;

      for (const item of dipulihkan) {
        if (item.kodeOnline) {
          simpanKodeOnlineUntukGame(item.id, item.kodeOnline);
        }
      }

      const terurut = simpanDaftarKeStorage(daftarGameBaru);
      daftarGameRef.current = terurut;
      setDaftarGame(terurut);

      simpanDaftarSampahGame(daftarSampahBaru);
      daftarSampahRef.current = daftarSampahBaru;
      setDaftarSampahGame(daftarSampahBaru);

      if (!gameAktifIdRef.current || dipulihkan.some((it) => it.sebelumnyaAktif)) {
        const kandidatAktif = dipulihkan.find((it) => it.sebelumnyaAktif) ?? dipulihkan[0];
        if (kandidatAktif) {
          gameAktifIdRef.current = kandidatAktif.id;
          setGameAktifId(kandidatAktif.id);
          tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, kandidatAktif.id);
        }
      }

      const pesan =
        opsi?.pesanKhusus ??
        (dipulihkan.length === 1
          ? `Game "${dipulihkan[0].game.judul}" dikembalikan utuh.`
          : `${dipulihkan.length} game dikembalikan utuh.`);
      tampilkanToast(pesan, 'sukses');
    },
    [simpanDaftarKeStorage, tampilkanToast]
  );

  const urungkanHapusGameBatch = useCallback(
    (batchHapusId: string) => {
      const idsBatch = daftarSampahRef.current
        .filter((it) => it.batchHapusId === batchHapusId)
        .map((it) => it.id);
      if (idsBatch.length === 0) return;
      pulihkanGameByIds(idsBatch);
    },
    [pulihkanGameByIds]
  );

  const hapusBanyakGame = useCallback(
    (ids: string[], opsi?: { hapusOnlineDihapus?: boolean }) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const daftarSaatIni = daftarGameRef.current;
      const targetGames = daftarSaatIni.filter((g) => idSet.has(g.id));
      if (targetGames.length === 0) return;

      const { daftarSampahBaru, batchHapusId } = masukkanGameKeSampah(
        daftarSampahRef.current,
        targetGames,
        {
          gameAktifId: gameAktifIdRef.current,
          ambilKodeOnline: (gId) =>
            opsi?.hapusOnlineDihapus ? null : ambilKodeOnlineTersimpanUntukGame(gId),
        }
      );

      simpanDaftarSampahGame(daftarSampahBaru);
      daftarSampahRef.current = daftarSampahBaru;
      setDaftarSampahGame(daftarSampahBaru);

      const sisa = daftarSaatIni.filter((g) => !idSet.has(g.id));
      const terurut = simpanDaftarKeStorage(sisa);
      daftarGameRef.current = terurut;
      setDaftarGame(terurut);

      if (idSet.has(gameAktifIdRef.current) || !terurut.some((g) => g.id === gameAktifIdRef.current)) {
        gameAktifIdRef.current = '';
        setGameAktifId('');
        tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, '');
      }

      const matchSesi = bacaSesiMatchSessionStorage();
      if (matchSesi && idSet.has(matchSesi.gameId)) {
        hapusSesiMatchSessionStorage();
      }
      const modeSesi = bacaSesiModeSessionStorage();
      if (modeSesi && idSet.has(modeSesi.gameId)) {
        hapusSesiModeSessionStorage();
        setSesiMode(null);
      }
      setSesiPembagian((prev) => (prev && idSet.has(prev.gameId) ? null : prev));

      const wizardSesi = bacaSesiMasukWizard();
      if (wizardSesi?.gameId && idSet.has(wizardSesi.gameId)) {
        simpanSesiMasukWizard(null);
      }

      const pesanToast =
        targetGames.length === 1
          ? `Game "${targetGames[0].judul}" dipindahkan ke Sampah Game.`
          : `${targetGames.length} game dipindahkan ke Sampah Game.`;

      tampilkanToast(pesanToast, 'info', {
        durasiMs: 10000,
        aksiLabel: 'URUNGKAN',
        onAksi: () => urungkanHapusGameBatch(batchHapusId),
      });
    },
    [simpanDaftarKeStorage, tampilkanToast, urungkanHapusGameBatch]
  );

  const hapusGame = useCallback(
    (id: string, opsi?: { hapusOnlineDihapus?: boolean }) => {
      hapusBanyakGame([id], opsi);
    },
    [hapusBanyakGame]
  );

  const pulihkanDariSampahGame = useCallback(
    (ids: string[]) => {
      pulihkanGameByIds(ids);
    },
    [pulihkanGameByIds]
  );

  const hapusPermanenDariSampahGame = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const sisa = daftarSampahRef.current.filter((it) => !idSet.has(it.id));
      simpanDaftarSampahGame(sisa);
      daftarSampahRef.current = sisa;
      setDaftarSampahGame(sisa);

      for (const id of idSet) {
        hapusDrafWizardGame(id);
        hapusSampahGame(id);
        hapusPetaKodeOnlineUntukGame(id);
      }
      tampilkanToast(
        ids.length === 1
          ? 'Game dihapus permanen dari Sampah Game.'
          : `${ids.length} game dihapus permanen dari Sampah Game.`,
        'info'
      );
    },
    [tampilkanToast]
  );

  const kosongkanSemuaSampahGame = useCallback(() => {
    const semuaId = daftarSampahRef.current.map((it) => it.id);
    if (semuaId.length === 0) return;
    simpanDaftarSampahGame([]);
    daftarSampahRef.current = [];
    setDaftarSampahGame([]);
    for (const id of semuaId) {
      hapusDrafWizardGame(id);
      hapusSampahGame(id);
      hapusPetaKodeOnlineUntukGame(id);
    }
    tampilkanToast('Sampah Game berhasil dikosongkan.', 'info');
  }, [tampilkanToast]);

  const perbaruiPengaturanGameAktif = useCallback(
    (pengaturanBaru: Pengaturan, identitas?: Partial<IdentitasGameInput>): Game | null => {
      if (!gameAktif) return null;
      const gameTerbaru: Game = {
        ...gameAktif,
        judul: identitas?.judul !== undefined ? identitas.judul.trim() || gameAktif.judul : gameAktif.judul,
        mapel: identitas?.mapel !== undefined ? identitas.mapel.trim() || gameAktif.mapel : gameAktif.mapel,
        namaSekolah:
          identitas?.namaSekolah !== undefined ? identitas.namaSekolah.trim() : gameAktif.namaSekolah,
        pengaturan: pengaturanBaru,
        status: 'siap',
        diubahPada: Date.now(),
      };

      setDaftarGame((prev) =>
        simpanDaftarKeStorage(prev.map((g) => (g.id === gameAktif.id ? gameTerbaru : g)))
      );
      tampilkanToast('Pengaturan pertandingan berhasil disimpan.', 'sukses');
      return gameTerbaru;
    },
    [gameAktif, simpanDaftarKeStorage, tampilkanToast]
  );

  const bangunSesiLaga = useCallback(
    (
      gameSumber: Game,
      nomorLaga: number,
      terpakaiSebelumnya: string[],
      pasanganDuel: [string, string][]
    ): SesiPembagianPertandingan => {
      const jumlahSoalUtama = gameSumber.soal.filter((s) => !s.cadangan).length;
      const perkiraan = hitungPerkiraanKebutuhanSoal(gameSumber.pengaturan, jumlahSoalUtama);
      const jumlahPerTim =
        gameSumber.pengaturan.akhirPermainan === 'soalHabis'
          ? Math.max(1, Math.floor(jumlahSoalUtama / 2))
          : Math.min(Math.max(1, Math.floor(jumlahSoalUtama / 2)), perkiraan.soalPerTimPerLaga);

      const hasilBagi = bagiSoalPertandingan(
        gameSumber.soal,
        terpakaiSebelumnya,
        jumlahPerTim,
        5
      );

      if (hasilBagi.bankDiacakUlang) {
        tampilkanToast(
          'Soal di bank sudah habis terpakai. Sistem mengacak ulang soal dari awal.',
          'peringatan'
        );
      }

      const detail = tentukanDetailLaga(gameSumber.pengaturan, nomorLaga, pasanganDuel);
      const jumlahGiliran = Math.max(8, hasilBagi.dekKiriSiswa.length);

      return {
        gameId: gameSumber.id,
        nomorLaga,
        labelLaga: detail.labelLaga,
        namaTimKiri: detail.namaTimKiri,
        namaTimKanan: detail.namaTimKanan,
        urutanPemainKiri: buatUrutanEstafet(
          detail.anggotaKiri,
          gameSumber.pengaturan.jumlahPenarik,
          jumlahGiliran
        ),
        urutanPemainKanan: buatUrutanEstafet(
          detail.anggotaKanan,
          gameSumber.pengaturan.jumlahPenarik,
          jumlahGiliran
        ),
        dekKiriSiswa: hasilBagi.dekKiriSiswa,
        dekKananSiswa: hasilBagi.dekKananSiswa,
        cadanganSiswa: hasilBagi.cadanganSiswa,
        ringkasanKiri: hasilBagi.ringkasanKiri,
        ringkasanKanan: hasilBagi.ringkasanKanan,
        terpakaiIds: hasilBagi.terpakaiIdsSesudah,
        bankDiacakUlang: hasilBagi.bankDiacakUlang,
        pasanganDuel,
      };
    },
    [tampilkanToast]
  );

  const mulaiSesiPembagian = useCallback(
    (gameSumber?: Game, pasanganDuelInput?: [string, string][]): SesiPembagianPertandingan | null => {
      const target = gameSumber ?? gameAktif;
      if (!target) return null;
      const pasangan =
        pasanganDuelInput && pasanganDuelInput.length > 0
          ? pasanganDuelInput
          : target.pengaturan.mode === '1lawan1'
            ? undiPasanganDuel([
                ...(target.pengaturan.anggota[0] ?? []),
                ...(target.pengaturan.anggota[1] ?? []),
              ])
            : [];

      const sesiBaru = bangunSesiLaga(target, 1, [], pasangan);
      setSesiPembagian(sesiBaru);
      catatRiwayatDibuka({
        judul: target.judul,
        kode: ambilKodeOnlineTersimpanUntukGame(target.id) ?? undefined,
        mapel: target.mapel,
        jumlahSoal: target.soal.length,
        lokalGameId: target.id,
      });
      return sesiBaru;
    },
    [bangunSesiLaga, gameAktif]
  );

  const siapkanLagaBerikutnya = useCallback(() => {
    if (!gameAktif) return;
    const nomorBerikutnya = (sesiPembagian?.nomorLaga ?? 0) + 1;
    const terpakai = sesiPembagian?.terpakaiIds ?? [];
    const pasangan = sesiPembagian?.pasanganDuel ?? [];
    const sesiBaru = bangunSesiLaga(gameAktif, nomorBerikutnya, terpakai, pasangan);
    setSesiPembagian(sesiBaru);
  }, [bangunSesiLaga, gameAktif, sesiPembagian]);

  const mulaiSesiTurnamenBaru = useCallback(
    (gameSumber?: Game): SesiModeAktif | null => {
      const target = gameSumber ?? gameAktif;
      if (!target) return null;
      const sesiBaru = buatSesiTurnamen(target);
      setSesiMode(sesiBaru);
      simpanSesiModeSessionStorage(sesiBaru);
      catatRiwayatDibuka({
        judul: target.judul,
        kode: ambilKodeOnlineTersimpanUntukGame(target.id) ?? undefined,
        mapel: target.mapel,
        jumlahSoal: target.soal.length,
        lokalGameId: target.id,
      });
      return sesiBaru;
    },
    [gameAktif]
  );

  const mulaiSesiDuelBaru = useCallback(
    (gameSumber?: Game, pasanganInput?: PasanganDuelTerundi[]): SesiModeAktif | null => {
      const target = gameSumber ?? gameAktif;
      if (!target) return null;
      const pasanganPakai =
        pasanganInput && pasanganInput.length > 0
          ? pasanganInput
          : buatPasanganDuelDenganTanda(
              [...(target.pengaturan.anggota[0] ?? []), ...(target.pengaturan.anggota[1] ?? [])].length >= 2
                ? [...(target.pengaturan.anggota[0] ?? []), ...(target.pengaturan.anggota[1] ?? [])]
                : [target.pengaturan.namaTim[0] || 'Pemain 1', target.pengaturan.namaTim[1] || 'Pemain 2']
            );
      const sesiBaru = buatSesiDuel(target, pasanganPakai);
      setSesiMode(sesiBaru);
      simpanSesiModeSessionStorage(sesiBaru);
      catatRiwayatDibuka({
        judul: target.judul,
        kode: ambilKodeOnlineTersimpanUntukGame(target.id) ?? undefined,
        mapel: target.mapel,
        jumlahSoal: target.soal.length,
        lokalGameId: target.id,
      });
      return sesiBaru;
    },
    [gameAktif]
  );

  const siapkanLagaDariSesiMode = useCallback((): SesiPembagianPertandingan | null => {
    if (!sesiMode) return null;
    const targetGame =
      daftarGame.find((g) => g.id === sesiMode.gameId) ?? gameAktif;
    if (!targetGame) return null;
    const { sesiTerbaru, pembagian } = siapkanDekLagaBerikutnya(sesiMode, targetGame);

    if (pembagian.bankDiacakUlang) {
      tampilkanToast(
        'Soal di bank sudah habis terpakai. Sistem mengacak ulang soal dari awal.',
        'peringatan'
      );
    }

    setSesiMode(sesiTerbaru);
    simpanSesiModeSessionStorage(sesiTerbaru);

    const sesiUntukMain: SesiPembagianPertandingan = {
      ...pembagian,
      pasanganDuel:
        sesiTerbaru.duel?.daftarDuel.map((p) => [p.kiri, p.kanan] as [string, string]) ?? [],
    };
    setSesiPembagian(sesiUntukMain);
    return sesiUntukMain;
  }, [daftarGame, gameAktif, sesiMode, tampilkanToast]);

  const catatLagaSelesaiKeSesiMode = useCallback(
    (match: MatchState): SesiModeAktif | null => {
      if (!sesiMode || sesiMode.gameId !== match.gameId) {
        return null;
      }
      const sesiBaru = catatHasilLagaKeSesi(sesiMode, match);
      setSesiMode(sesiBaru);
      simpanSesiModeSessionStorage(sesiBaru);
      return sesiBaru;
    },
    [sesiMode]
  );

  const akhiriDuelSekarang = useCallback((): SesiModeAktif | null => {
    if (!sesiMode) return null;
    const sesiBaru = akhiriSesiDuelManual(sesiMode);
    setSesiMode(sesiBaru);
    simpanSesiModeSessionStorage(sesiBaru);
    return sesiBaru;
  }, [sesiMode]);

  const resetSesiMode = useCallback(() => {
    setSesiMode(null);
    hapusSesiModeSessionStorage();
  }, []);

  const konversiEntriKeHasilSesi = useCallback((entri: EntriRiwayatHasil): RingkasanHasilSesi => {
    const ringkas = hitungRingkasanDariLog(entri.riwayat, {
      rosterKiri: entri.rosterKiri,
      rosterKanan: entri.rosterKanan,
    });
    return {
      riwayatHasilId: entri.id,
      gameId: entri.gameId,
      judulGame: entri.judulGame,
      mapel: entri.mapel,
      namaSekolah: entri.namaSekolah,
      dibuatPada: entri.dibuatPada,
      durasiDetik: entri.durasiDetik,
      langkahKeGaris: entri.langkahKeGaris,
      jumlahPenarik: entri.jumlahPenarik,
      mode: entri.mode,
      labelLaga: entri.labelLaga,
      pemenang: entri.pemenang,
      namaTimKiri: entri.namaTimKiri,
      namaTimKanan: entri.namaTimKanan,
      rosterKiri: entri.rosterKiri,
      rosterKanan: entri.rosterKanan,
      skorMerah: ringkas.skorMerah,
      skorSalahMerah: ringkas.skorSalahMerah,
      skorBiru: ringkas.skorBiru,
      skorSalahBiru: ringkas.skorSalahBiru,
      posisiTaliAkhir: ringkas.posisiTaliAkhir,
      totalSoalTerjawab: ringkas.totalSoalTerjawab,
      alasanAkhir: entri.alasanAkhir,
      caraMenang: entri.caraMenang,
      keteranganMenang: entri.keteranganMenang,
      rekapPemain: ringkas.rekapPemain,
      riwayat: entri.riwayat,
      soalSnapshot: entri.soalSnapshot,
      ...(entri.turnamenSnapshot ? { turnamenSnapshot: entri.turnamenSnapshot } : {}),
      ...(entri.duelSnapshot ? { duelSnapshot: entri.duelSnapshot } : {}),
    };
  }, []);

  const simpanHasilPertandinganKeRiwayat = useCallback(
    (
      input: InputBuatEntriRiwayatHasil,
      opsi?: { bukaDetail?: boolean; updateHasilSesi?: boolean }
    ): EntriRiwayatHasil => {
      const entriBaru = buatEntriRiwayatHasil(input);
      const daftarBaru = urutkanRiwayatHasilTerbaru([
        entriBaru,
        ...riwayatHasilRef.current.filter((item) => item.id !== entriBaru.id),
      ]);
      const berhasil = simpanDaftarRiwayatHasil(daftarBaru);
      setPenyimpananTersedia(berhasil);
      riwayatHasilRef.current = daftarBaru;
      setRiwayatHasil(daftarBaru);

      if (opsi?.updateHasilSesi !== false) {
        setHasilSesi(konversiEntriKeHasilSesi(entriBaru));
      }
      if (opsi?.bukaDetail) {
        setHasilAktifId(entriBaru.id);
        setTampilanHasil('detail');
      }
      return entriBaru;
    },
    [konversiEntriKeHasilSesi]
  );

  const bukaDetailRiwayatHasil = useCallback(
    (id: string) => {
      const target = riwayatHasilRef.current.find((item) => item.id === id);
      if (!target) return;
      setHasilAktifId(target.id);
      setTampilanHasil('detail');
      setHasilSesi(konversiEntriKeHasilSesi(target));
    },
    [konversiEntriKeHasilSesi]
  );

  const bukaDaftarRiwayatHasil = useCallback(() => {
    setTampilanHasil('daftar');
  }, []);

  const pulihkanRiwayatSnapshot = useCallback(
    (snapshotSebelumHapus: EntriRiwayatHasil[], jumlahPulih: number) => {
      const petaAda = new Set(riwayatHasilRef.current.map((it) => it.id));
      const pulih = urutkanRiwayatHasilTerbaru([
        ...riwayatHasilRef.current,
        ...snapshotSebelumHapus.filter((it) => !petaAda.has(it.id)),
      ]);
      const berhasil = simpanDaftarRiwayatHasil(pulih);
      setPenyimpananTersedia(berhasil);
      riwayatHasilRef.current = pulih;
      setRiwayatHasil(pulih);
      tampilkanToast(
        jumlahPulih === 1
          ? '1 riwayat hasil dikembalikan.'
          : `${jumlahPulih} riwayat hasil dikembalikan utuh.`,
        'sukses'
      );
    },
    [tampilkanToast]
  );

  const hapusRiwayatHasil = useCallback(
    (ids: string[], opsi?: { kembaliKeDaftar?: boolean }) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      const snapshotSebelum = [...riwayatHasilRef.current];
      const terhapus = snapshotSebelum.filter((item) => idSet.has(item.id));
      if (terhapus.length === 0) return;

      const sisa = snapshotSebelum.filter((item) => !idSet.has(item.id));
      const berhasil = simpanDaftarRiwayatHasil(sisa);
      setPenyimpananTersedia(berhasil);
      riwayatHasilRef.current = sisa;
      setRiwayatHasil(sisa);

      if (hasilAktifId && idSet.has(hasilAktifId)) {
        setHasilAktifId(null);
      }
      if (opsi?.kembaliKeDaftar) {
        setTampilanHasil('daftar');
      }

      const pesan =
        terhapus.length === 1
          ? `Hasil "${terhapus[0].judulGame}" dihapus dari riwayat.`
          : `${terhapus.length} riwayat hasil dihapus.`;

      tampilkanToast(pesan, 'info', {
        durasiMs: 10000,
        aksiLabel: 'URUNGKAN',
        onAksi: () => pulihkanRiwayatSnapshot(snapshotSebelum, terhapus.length),
      });
    },
    [hasilAktifId, pulihkanRiwayatSnapshot, tampilkanToast]
  );

  const hapusSemuaRiwayatHasil = useCallback(() => {
    const snapshotSebelum = [...riwayatHasilRef.current];
    if (snapshotSebelum.length === 0) return;

    const berhasil = simpanDaftarRiwayatHasil([]);
    setPenyimpananTersedia(berhasil);
    riwayatHasilRef.current = [];
    setRiwayatHasil([]);
    setHasilAktifId(null);
    setTampilanHasil('daftar');

    tampilkanToast(`Seluruh ${snapshotSebelum.length} riwayat hasil dihapus.`, 'info', {
      durasiMs: 10000,
      aksiLabel: 'URUNGKAN',
      onAksi: () => pulihkanRiwayatSnapshot(snapshotSebelum, snapshotSebelum.length),
    });
  }, [pulihkanRiwayatSnapshot, tampilkanToast]);

  const siapkanCetakHasil = useCallback((entri: EntriRiwayatHasil | null) => {
    setEntriCetakHasil(entri);
  }, []);

  const pulihkanContohGame = useCallback(() => {
    const contoh = buatContohGameBawaan();
    setDaftarGame((prev) => {
      const tanpaContoh = prev.filter((g) => g.id !== contoh.id);
      return simpanDaftarKeStorage([contoh, ...tanpaContoh]);
    });
    setGameAktifId(contoh.id);
    tulisStorage(STORAGE_KEYS.ACTIVE_GAME_ID, contoh.id);
    setSesiPembagian(null);
    tampilkanToast('Contoh Game bawaan (16 soal) dipulihkan.', 'sukses');
  }, [simpanDaftarKeStorage, tampilkanToast]);

  const value = useMemo<AppStoreValue>(
    () => ({
      daftarGame,
      daftarSampahGame,
      riwayatHasil,
      hasilAktifId,
      tampilanHasil,
      entriCetakHasil,
      gameAktif,
      penyimpananTersedia,
      daftarToast,
      hasilSesi,
      sesiPembagian,
      sesiMode,
      pinEditTerbukaId,
      gameBaruDisorotId,
      modeMasukWizard,
      bukaWizardBuatGame,
      bukaIzinEditDenganPin,
      tutupIzinEditPin,
      pilihGameAktif,
      tambahGameBaru,
      simpanDrafGameOtomatis,
      tandaiGameTersimpan,
      simpanSoalKeGameAktif,
      buatGameDenganSoal,
      duplikasiGame,
      ubahNamaGame,
      imporGameDariPaket,
      hapusGame,
      hapusBanyakGame,
      pulihkanDariSampahGame,
      hapusPermanenDariSampahGame,
      kosongkanSemuaSampahGame,
      perbaruiPengaturanGameAktif,
      mulaiSesiPembagian,
      mulaiSesiTurnamenBaru,
      mulaiSesiDuelBaru,
      siapkanLagaDariSesiMode,
      catatLagaSelesaiKeSesiMode,
      akhiriDuelSekarang,
      resetSesiMode,
      siapkanLagaBerikutnya,
      pulihkanContohGame,
      setHasilSesi,
      simpanHasilPertandinganKeRiwayat,
      bukaDetailRiwayatHasil,
      bukaDaftarRiwayatHasil,
      hapusRiwayatHasil,
      hapusSemuaRiwayatHasil,
      siapkanCetakHasil,
      tampilkanToast,
      hapusToast,
    }),
    [
      daftarGame,
      daftarSampahGame,
      riwayatHasil,
      hasilAktifId,
      tampilanHasil,
      entriCetakHasil,
      gameAktif,
      penyimpananTersedia,
      daftarToast,
      hasilSesi,
      sesiPembagian,
      sesiMode,
      pinEditTerbukaId,
      gameBaruDisorotId,
      modeMasukWizard,
      bukaWizardBuatGame,
      bukaIzinEditDenganPin,
      tutupIzinEditPin,
      pilihGameAktif,
      tambahGameBaru,
      simpanDrafGameOtomatis,
      tandaiGameTersimpan,
      simpanSoalKeGameAktif,
      buatGameDenganSoal,
      duplikasiGame,
      ubahNamaGame,
      imporGameDariPaket,
      hapusGame,
      hapusBanyakGame,
      pulihkanDariSampahGame,
      hapusPermanenDariSampahGame,
      kosongkanSemuaSampahGame,
      perbaruiPengaturanGameAktif,
      mulaiSesiPembagian,
      mulaiSesiTurnamenBaru,
      mulaiSesiDuelBaru,
      siapkanLagaDariSesiMode,
      catatLagaSelesaiKeSesiMode,
      akhiriDuelSekarang,
      resetSesiMode,
      siapkanLagaBerikutnya,
      pulihkanContohGame,
      simpanHasilPertandinganKeRiwayat,
      bukaDetailRiwayatHasil,
      bukaDaftarRiwayatHasil,
      hapusRiwayatHasil,
      hapusSemuaRiwayatHasil,
      siapkanCetakHasil,
      tampilkanToast,
      hapusToast,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
};

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore harus digunakan di dalam AppStoreProvider');
  }
  return ctx;
}

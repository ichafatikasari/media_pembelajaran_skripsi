import { Pengaturan, Soal, SoalSiswa, TimSisi } from '../data/types';
import { buatId } from '../utils/id';
import { acakFisherYates } from '../utils/shuffle';
import { ambilDaftarSoalUntukSiswa, cekJawaban } from './gameEngine';

export type FaseMatch = 'countdown' | 'bermain' | 'jeda' | 'penentuan' | 'selesai';

export type FaseTim = 'menjawab' | 'umpanBalik' | 'selesai';

export type AlasanAkhirMatch =
  | 'waktu'
  | 'soalHabis'
  | 'keduanya'
  | 'penentuan'
  | 'kecepatan'
  | 'seri'
  | null;

export type CaraMenangMatch = 'skor' | 'penentuan' | 'kecepatan' | 'seri';

export type JenisSoalPenentuan = 'cadangan' | 'tukar';

export const MAKS_RONDE_PENENTUAN = 3;

export type JenisRiwayat =
  | 'benar'
  | 'salah'
  | 'waktuHabis'
  | 'bonus'
  | 'manual'
  | 'penentuan';

export interface RekapPemain {
  nama: string;
  tim: TimSisi;
  soal: number;
  benar: number;
  salah: number;
}

export interface RiwayatTarikanMatch {
  id: string;
  urutan: number;
  waktuDetik: number;
  waktuResponsMs?: number;
  tim: TimSisi;
  pemain: string;
  soalId: string;
  jenis: JenisRiwayat;
  pilihanDipilih: number | null;
  benar: boolean;
  perubahanLangkah: number; // negatif ke merah (kiri), positif ke biru (kanan)
  posisiTaliSesudah: number;
  penjelasan?: string;
}

export interface UmpanBalikTim {
  jenis: 'benar' | 'salah' | 'waktuHabis';
  pilihanDipilih: number | null;
  kunciBenar: number;
  penjelasan?: string;
  bonusDipakai: boolean;
}

export interface TimMatchState {
  sisi: TimSisi;
  namaTim: string;
  roster: string[];
  dek: SoalSiswa[];
  indeksSoal: number;
  indeksGiliran: number;
  soalTerjawabCount: number;
  skorBenar: number;
  skorSalah: number;
  faseTim: FaseTim;
  sisaWaktuSoalMs: number;
  sisaUmpanBalikMs: number;
  umpanBalik: UmpanBalikTim | null;
  klikTerkunci: boolean;
  pemainTerakhir: string | null;
  totalWaktuBenarMs: number;
  jumlahBenarKecepatan: number;
  waktuSoalBerjalanMs: number;
  tickTimestampTerakhir: number | null;
}

export interface JawabanPenentuan {
  pilihan: number | null;
  benar: boolean;
  terkunci: boolean;
  waktuJawabMs: number;
}

export interface PenentuanState {
  rondeKe: number;
  maksRonde: number;
  jenisSoal: JenisSoalPenentuan;
  indeksCadangan: number;
  soalAktif: SoalSiswa | null;
  soalKiri: SoalSiswa | null;
  soalKanan: SoalSiswa | null;
  wakilKiri: string;
  wakilKanan: string;
  jawabanKiri: JawabanPenentuan | null;
  jawabanKanan: JawabanPenentuan | null;
  sisaWaktuSoalMs: number;
  waktuBerjalanSoalMs: number;
  tickTimestampTerakhir: number | null;
  sisaUmpanBalikMs: number;
  statusHasil: string | null;
}

export interface MatchState {
  gameId: string;
  labelLaga: string;
  fase: FaseMatch;
  faseSebelumJeda: 'countdown' | 'bermain' | 'penentuan';
  countdownMs: number;
  waktuBerjalanMs: number;
  sisaWaktuTotalMs: number | null;
  posisiTali: number; // negatif ke Tim A (kiri/merah), positif ke Tim B (kanan/biru)
  langkahKeGaris: number;
  timKiri: TimMatchState;
  timKanan: TimMatchState;
  cadanganSiswa: SoalSiswa[];
  riwayat: RiwayatTarikanMatch[];
  rekapPemain: Record<string, RekapPemain>;
  penentuan: PenentuanState | null;
  pemenang: TimSisi | 'seri' | null;
  alasanAkhir: AlasanAkhirMatch;
  caraMenang: CaraMenangMatch | null;
  keteranganMenang: string | null;
  selisihKecepatanMs: number | null;
  soalPernahDilihatKiri: string[];
  soalPernahDilihatKanan: string[];
  soalDijawabKiri: string[];
  soalDijawabKanan: string[];
  cadanganTerpakaiIds: string[];
  pengaturan: Pengaturan;
  timestampTerakhir: number;
}

export type MatchAction =
  | { type: 'TICK'; deltaMs: number; timestamp: number }
  | { type: 'JAWAB'; tim: TimSisi; indeksPilihan: number; timestamp: number }
  | { type: 'JEDA' }
  | { type: 'LANJUT' }
  | { type: 'LEWATI_SOAL'; tim: TimSisi; timestamp: number }
  | { type: 'BATALKAN_TERAKHIR'; tim: TimSisi }
  | { type: 'KOREKSI_TALI_MANUAL'; arah: TimSisi; timestamp: number }
  | { type: 'ULANGI_SOAL'; tim: TimSisi }
  | { type: 'AKHIRI_MANUAL'; timestamp: number };

export interface BuatMatchConfig {
  gameId: string;
  labelLaga: string;
  namaTimKiri: string;
  namaTimKanan: string;
  rosterKiri: string[];
  rosterKanan: string[];
  dekKiriSiswa: SoalSiswa[];
  dekKananSiswa: SoalSiswa[];
  cadanganSiswa: SoalSiswa[];
  pengaturan: Pengaturan;
  lewatiCountdown?: boolean;
}

const SESSION_KEY_MATCH = 'duel_otak_match_session_v1';

export const DURASI_COUNTDOWN_SIAP_MS = 2000;
export const DURASI_COUNTDOWN_PELUIT_AWAL_MS = 800;
export const DURASI_COUNTDOWN_ANGKA_MS = 1000;
export const DURASI_COUNTDOWN_TARIK_MS = 900;
export const TOTAL_DURASI_COUNTDOWN_MS =
  DURASI_COUNTDOWN_SIAP_MS +
  DURASI_COUNTDOWN_PELUIT_AWAL_MS +
  DURASI_COUNTDOWN_ANGKA_MS * 3 +
  DURASI_COUNTDOWN_TARIK_MS;

export type TahapCountdown = 'siap' | 'peluitAwal' | '3' | '2' | '1' | 'tarik';

export function ambilInfoCountdown(countdownMs: number): {
  tahap: TahapCountdown;
  teksUtama: string;
  subteks: string;
} {
  const sudahMs = Math.max(0, TOTAL_DURASI_COUNTDOWN_MS - Math.max(0, countdownMs));
  if (sudahMs < DURASI_COUNTDOWN_SIAP_MS) {
    return {
      tahap: 'siap',
      teksUtama: 'SIAP-SIAP!',
      subteks: 'Pegang tali erat-erat, fokus ke soal...',
    };
  }
  const batasPeluit = DURASI_COUNTDOWN_SIAP_MS + DURASI_COUNTDOWN_PELUIT_AWAL_MS;
  if (sudahMs < batasPeluit) {
    return {
      tahap: 'peluitAwal',
      teksUtama: 'SIAP-SIAP!',
      subteks: 'Peluit wasit pembuka berbunyi...',
    };
  }
  const batas3 = batasPeluit + DURASI_COUNTDOWN_ANGKA_MS;
  if (sudahMs < batas3) {
    return {
      tahap: '3',
      teksUtama: '3',
      subteks: 'Bersiap menjawab...',
    };
  }
  const batas2 = batas3 + DURASI_COUNTDOWN_ANGKA_MS;
  if (sudahMs < batas2) {
    return {
      tahap: '2',
      teksUtama: '2',
      subteks: 'Konsentrasi penuh...',
    };
  }
  const batas1 = batas2 + DURASI_COUNTDOWN_ANGKA_MS;
  if (sudahMs < batas1) {
    return {
      tahap: '1',
      teksUtama: '1',
      subteks: 'Sebentar lagi...',
    };
  }
  return {
    tahap: 'tarik',
    teksUtama: 'TARIK!',
    subteks: 'Ayo jawab cepat dan tepat!',
  };
}

function buatTimState(
  sisi: TimSisi,
  namaTim: string,
  roster: string[],
  dek: SoalSiswa[],
  durasiSoalDetik: number
): TimMatchState {
  const rosterBersih = roster.length > 0 ? [...roster] : ['Pemain 1', 'Pemain 2', 'Pemain 3'];
  return {
    sisi,
    namaTim,
    roster: rosterBersih,
    dek: [...dek],
    indeksSoal: 0,
    indeksGiliran: 0,
    soalTerjawabCount: 0,
    skorBenar: 0,
    skorSalah: 0,
    faseTim: dek.length > 0 ? 'menjawab' : 'selesai',
    sisaWaktuSoalMs: durasiSoalDetik * 1000,
    sisaUmpanBalikMs: 0,
    umpanBalik: null,
    klikTerkunci: false,
    pemainTerakhir: null,
    totalWaktuBenarMs: 0,
    jumlahBenarKecepatan: 0,
    waktuSoalBerjalanMs: 0,
    tickTimestampTerakhir: null,
  };
}

function tambahIdUnik(daftar: readonly string[], id?: string | null): string[] {
  if (!id || daftar.includes(id)) return [...daftar];
  return [...daftar, id];
}

function cariSoalSiswaDariMatch(state: MatchState, id: string): SoalSiswa | null {
  return (
    state.timKiri.dek.find((s) => s.id === id) ??
    state.timKanan.dek.find((s) => s.id === id) ??
    state.cadanganSiswa.find((s) => s.id === id) ??
    null
  );
}

function formatDetikIndonesia(ms: number): string {
  return (ms / 1000).toFixed(1).replace('.', ',');
}

function kunciRekapPemain(tim: TimSisi, nama: string): string {
  return `${tim}::${nama}`;
}

function catatRekapPemain(
  rekap: Record<string, RekapPemain>,
  tim: TimSisi,
  nama: string,
  deltaSoal: number,
  deltaBenar: number,
  deltaSalah: number
): Record<string, RekapPemain> {
  const kunci = kunciRekapPemain(tim, nama);
  const lama = rekap[kunci] ?? { nama, tim, soal: 0, benar: 0, salah: 0 };
  return {
    ...rekap,
    [kunci]: {
      nama,
      tim,
      soal: Math.max(0, lama.soal + deltaSoal),
      benar: Math.max(0, lama.benar + deltaBenar),
      salah: Math.max(0, lama.salah + deltaSalah),
    },
  };
}

export function ambilPemainAktifTim(timState: TimMatchState): string {
  return timState.roster[timState.indeksGiliran % timState.roster.length] ?? 'Pemain 1';
}

export function ambilPutaranTim(timState: TimMatchState): number {
  const jumlah = Math.max(1, timState.roster.length);
  return 1 + Math.floor(timState.indeksGiliran / jumlah);
}

function pilihWakilAcakBukanTerakhir(roster: string[], terakhir: string | null): string {
  if (roster.length === 0) return 'Pemain 1';
  if (roster.length === 1) return roster[0];
  const kandidat = roster.filter((n) => n !== terakhir);
  const kolam = kandidat.length > 0 ? kandidat : roster;
  const idx = Math.floor(Math.random() * kolam.length);
  return kolam[idx];
}

function akhiriSeriResmi(state: MatchState): MatchState {
  return {
    ...state,
    fase: 'selesai',
    pemenang: 'seri',
    alasanAkhir: 'seri',
    caraMenang: 'seri',
    keteranganMenang: 'Seri',
    selisihKecepatanMs: null,
    penentuan: state.penentuan
      ? {
          ...state.penentuan,
          sisaUmpanBalikMs: 0,
          statusHasil: 'SERI! Kedua tim sama kuat.',
        }
      : null,
  };
}

function evaluasiKecepatanTotalAtauSeri(state: MatchState): MatchState {
  const benarKiri = state.timKiri.jumlahBenarKecepatan;
  const benarKanan = state.timKanan.jumlahBenarKecepatan;
  const totalKiriMs = state.timKiri.totalWaktuBenarMs;
  const totalKananMs = state.timKanan.totalWaktuBenarMs;

  if (benarKiri === 0 && benarKanan === 0) {
    return akhiriSeriResmi(state);
  }

  if (benarKiri > 0 && benarKanan === 0) {
    return {
      ...state,
      fase: 'selesai',
      pemenang: 'merah',
      alasanAkhir: 'kecepatan',
      caraMenang: 'kecepatan',
      selisihKecepatanMs: null,
      keteranganMenang: 'Menang karena lebih cepat',
      penentuan: state.penentuan
        ? {
            ...state.penentuan,
            sisaUmpanBalikMs: 0,
            statusHasil: `${state.timKiri.namaTim} MENANG KARENA LEBIH CEPAT!`,
          }
        : null,
    };
  }

  if (benarKanan > 0 && benarKiri === 0) {
    return {
      ...state,
      fase: 'selesai',
      pemenang: 'biru',
      alasanAkhir: 'kecepatan',
      caraMenang: 'kecepatan',
      selisihKecepatanMs: null,
      keteranganMenang: 'Menang karena lebih cepat',
      penentuan: state.penentuan
        ? {
            ...state.penentuan,
            sisaUmpanBalikMs: 0,
            statusHasil: `${state.timKanan.namaTim} MENANG KARENA LEBIH CEPAT!`,
          }
        : null,
    };
  }

  const selisihMs = Math.abs(totalKiriMs - totalKananMs);
  if (selisihMs < 100) {
    return akhiriSeriResmi(state);
  }

  const pemenang: TimSisi = totalKiriMs < totalKananMs ? 'merah' : 'biru';
  const detikTeks = formatDetikIndonesia(selisihMs);
  const namaPemenang = pemenang === 'merah' ? state.timKiri.namaTim : state.timKanan.namaTim;
  return {
    ...state,
    fase: 'selesai',
    pemenang,
    alasanAkhir: 'kecepatan',
    caraMenang: 'kecepatan',
    selisihKecepatanMs: selisihMs,
    keteranganMenang: `Menang karena lebih cepat (${detikTeks} detik lebih cepat)`,
    penentuan: state.penentuan
      ? {
          ...state.penentuan,
          sisaUmpanBalikMs: 0,
          statusHasil: `${namaPemenang} MENANG KARENA LEBIH CEPAT (${detikTeks} detik lebih cepat)`,
        }
      : null,
  };
}

function lanjutKeRondePenentuanBerikutnya(state: MatchState, timestamp: number): MatchState {
  const rondeKe = (state.penentuan?.rondeKe ?? 0) + 1;
  if (rondeKe > MAKS_RONDE_PENENTUAN) {
    return evaluasiKecepatanTotalAtauSeri(state);
  }

  const setCadanganTerpakai = new Set(state.cadanganTerpakaiIds);
  const setDilihatKiri = new Set(state.soalPernahDilihatKiri);
  const setDilihatKanan = new Set(state.soalPernahDilihatKanan);

  // LANGKAH 1: SOAL CADANGAN yang belum pernah muncul
  const indeksCadanganTersedia = state.cadanganSiswa.findIndex(
    (s) =>
      !setCadanganTerpakai.has(s.id) &&
      !setDilihatKiri.has(s.id) &&
      !setDilihatKanan.has(s.id)
  );

  if (indeksCadanganTersedia >= 0) {
    const soalCad = state.cadanganSiswa[indeksCadanganTersedia];
    return {
      ...state,
      fase: 'penentuan',
      faseSebelumJeda: 'penentuan',
      cadanganTerpakaiIds: tambahIdUnik(state.cadanganTerpakaiIds, soalCad.id),
      soalPernahDilihatKiri: tambahIdUnik(state.soalPernahDilihatKiri, soalCad.id),
      soalPernahDilihatKanan: tambahIdUnik(state.soalPernahDilihatKanan, soalCad.id),
      penentuan: {
        rondeKe,
        maksRonde: MAKS_RONDE_PENENTUAN,
        jenisSoal: 'cadangan',
        indeksCadangan: indeksCadanganTersedia,
        soalAktif: soalCad,
        soalKiri: soalCad,
        soalKanan: soalCad,
        wakilKiri: pilihWakilAcakBukanTerakhir(state.timKiri.roster, state.timKiri.pemainTerakhir),
        wakilKanan: pilihWakilAcakBukanTerakhir(state.timKanan.roster, state.timKanan.pemainTerakhir),
        jawabanKiri: null,
        jawabanKanan: null,
        sisaWaktuSoalMs: state.pengaturan.durasiSoal * 1000,
        waktuBerjalanSoalMs: 0,
        tickTimestampTerakhir: timestamp,
        sisaUmpanBalikMs: 0,
        statusHasil: null,
      },
      timestampTerakhir: timestamp,
    };
  }

  // LANGKAH 2: TUKAR SOAL (Kiri dapat soal yang pernah dijawab Kanan & belum pernah dilihat Kiri, dan sebaliknya)
  const idUntukKiri = state.soalDijawabKanan.find((id) => !setDilihatKiri.has(id));
  const idUntukKanan = state.soalDijawabKiri.find((id) => !setDilihatKanan.has(id));
  const soalUntukKiri = idUntukKiri ? cariSoalSiswaDariMatch(state, idUntukKiri) : null;
  const soalUntukKanan = idUntukKanan ? cariSoalSiswaDariMatch(state, idUntukKanan) : null;

  if (soalUntukKiri && soalUntukKanan) {
    return {
      ...state,
      fase: 'penentuan',
      faseSebelumJeda: 'penentuan',
      soalPernahDilihatKiri: tambahIdUnik(state.soalPernahDilihatKiri, soalUntukKiri.id),
      soalPernahDilihatKanan: tambahIdUnik(state.soalPernahDilihatKanan, soalUntukKanan.id),
      penentuan: {
        rondeKe,
        maksRonde: MAKS_RONDE_PENENTUAN,
        jenisSoal: 'tukar',
        indeksCadangan: -1,
        soalAktif: soalUntukKiri,
        soalKiri: soalUntukKiri,
        soalKanan: soalUntukKanan,
        wakilKiri: pilihWakilAcakBukanTerakhir(state.timKiri.roster, state.timKiri.pemainTerakhir),
        wakilKanan: pilihWakilAcakBukanTerakhir(state.timKanan.roster, state.timKanan.pemainTerakhir),
        jawabanKiri: null,
        jawabanKanan: null,
        sisaWaktuSoalMs: state.pengaturan.durasiSoal * 1000,
        waktuBerjalanSoalMs: 0,
        tickTimestampTerakhir: timestamp,
        sisaUmpanBalikMs: 0,
        statusHasil: null,
      },
      timestampTerakhir: timestamp,
    };
  }

  // LANGKAH 3 & 4: KECEPATAN TOTAL atau SERI RESMI
  return evaluasiKecepatanTotalAtauSeri(state);
}

export function buatMatchState(config: BuatMatchConfig): MatchState {
  const durasiTotalMs =
    config.pengaturan.akhirPermainan === 'soalHabis'
      ? null
      : Math.max(0.5, config.pengaturan.durasiWaktu) * 60 * 1000;

  const rekapAwal: Record<string, RekapPemain> = {};
  for (const nama of config.rosterKiri) {
    rekapAwal[kunciRekapPemain('merah', nama)] = { nama, tim: 'merah', soal: 0, benar: 0, salah: 0 };
  }
  for (const nama of config.rosterKanan) {
    rekapAwal[kunciRekapPemain('biru', nama)] = { nama, tim: 'biru', soal: 0, benar: 0, salah: 0 };
  }

  return {
    gameId: config.gameId,
    labelLaga: config.labelLaga,
    fase: config.lewatiCountdown ? 'bermain' : 'countdown',
    faseSebelumJeda: config.lewatiCountdown ? 'bermain' : 'countdown',
    countdownMs: config.lewatiCountdown ? 0 : TOTAL_DURASI_COUNTDOWN_MS,
    waktuBerjalanMs: 0,
    sisaWaktuTotalMs: durasiTotalMs,
    posisiTali: 0,
    langkahKeGaris: Math.min(10, Math.max(3, config.pengaturan.langkahKeGaris || 6)),
    timKiri: buatTimState(
      'merah',
      config.namaTimKiri,
      config.rosterKiri,
      config.dekKiriSiswa,
      config.pengaturan.durasiSoal
    ),
    timKanan: buatTimState(
      'biru',
      config.namaTimKanan,
      config.rosterKanan,
      config.dekKananSiswa,
      config.pengaturan.durasiSoal
    ),
    cadanganSiswa: [...config.cadanganSiswa],
    riwayat: [],
    rekapPemain: rekapAwal,
    penentuan: null,
    pemenang: null,
    alasanAkhir: null,
    caraMenang: null,
    keteranganMenang: null,
    selisihKecepatanMs: null,
    soalPernahDilihatKiri: config.dekKiriSiswa.length > 0 ? [config.dekKiriSiswa[0].id] : [],
    soalPernahDilihatKanan: config.dekKananSiswa.length > 0 ? [config.dekKananSiswa[0].id] : [],
    soalDijawabKiri: [],
    soalDijawabKanan: [],
    cadanganTerpakaiIds: [],
    pengaturan: config.pengaturan,
    timestampTerakhir: Date.now(),
  };
}

function selesaikanAtauPenentuan(
  state: MatchState,
  alasan: AlasanAkhirMatch,
  timestamp: number
): MatchState {
  if (state.posisiTali !== 0) {
    const pemenang: TimSisi = state.posisiTali < 0 ? 'merah' : 'biru';
    return {
      ...state,
      fase: 'selesai',
      pemenang,
      alasanAkhir: alasan,
      caraMenang: 'skor',
      keteranganMenang: `${pemenang === 'merah' ? state.timKiri.namaTim : state.timKanan.namaTim} unggul selisih tali`,
      selisihKecepatanMs: null,
      penentuan: null,
    };
  }

  const modeImbang = state.pengaturan.jikaImbang ?? 'otomatis';
  const dasar = { ...state, alasanAkhir: alasan };

  if (modeImbang === 'seri') {
    return akhiriSeriResmi(dasar);
  }
  if (modeImbang === 'kecepatan') {
    return evaluasiKecepatanTotalAtauSeri(dasar);
  }
  return lanjutKeRondePenentuanBerikutnya(dasar, timestamp);
}

function majukanSoalTim(
  tim: TimMatchState,
  pengaturan: Pengaturan,
  timestamp: number
): { timBaru: TimMatchState; soalBaruId: string | null } {
  const indeksBerikutnya = tim.indeksSoal + 1;
  const giliranBerikutnya = tim.indeksGiliran + 1;

  if (indeksBerikutnya < tim.dek.length) {
    const soalBerikutnya = tim.dek[indeksBerikutnya];
    return {
      soalBaruId: soalBerikutnya?.id ?? null,
      timBaru: {
        ...tim,
        indeksSoal: indeksBerikutnya,
        indeksGiliran: giliranBerikutnya,
        faseTim: 'menjawab',
        sisaWaktuSoalMs: pengaturan.durasiSoal * 1000,
        sisaUmpanBalikMs: 0,
        umpanBalik: null,
        klikTerkunci: false,
        waktuSoalBerjalanMs: 0,
        tickTimestampTerakhir: timestamp,
      },
    };
  }

  // Jika mode berakhir karena WAKTU saja dan dek tim habis sebelum waktu habis: acak ulang dek tim
  if (pengaturan.akhirPermainan === 'waktu' && tim.dek.length > 0) {
    const dekAcak = acakFisherYates(tim.dek);
    return {
      soalBaruId: dekAcak[0]?.id ?? null,
      timBaru: {
        ...tim,
        dek: dekAcak,
        indeksSoal: 0,
        indeksGiliran: giliranBerikutnya,
        faseTim: 'menjawab',
        sisaWaktuSoalMs: pengaturan.durasiSoal * 1000,
        sisaUmpanBalikMs: 0,
        umpanBalik: null,
        klikTerkunci: false,
        waktuSoalBerjalanMs: 0,
        tickTimestampTerakhir: timestamp,
      },
    };
  }

  return {
    soalBaruId: null,
    timBaru: {
      ...tim,
      indeksSoal: indeksBerikutnya,
      indeksGiliran: giliranBerikutnya,
      faseTim: 'selesai',
      sisaWaktuSoalMs: 0,
      sisaUmpanBalikMs: 0,
      umpanBalik: null,
      klikTerkunci: true,
      waktuSoalBerjalanMs: 0,
      tickTimestampTerakhir: null,
    },
  };
}

function hitungWaktuJawabSoalMs(
  durasiSoalDetik: number,
  waktuBerjalanMs: number,
  tickTimestampTerakhir: number | null,
  timestampAksi: number,
  fallbackTimestampAwal: number
): number {
  const durasiSoalMs = durasiSoalDetik * 1000;
  let total = waktuBerjalanMs;
  if (tickTimestampTerakhir !== null) {
    if (timestampAksi >= tickTimestampTerakhir) {
      total += timestampAksi - tickTimestampTerakhir;
    }
  } else if (waktuBerjalanMs === 0) {
    if (timestampAksi > 0 && timestampAksi < 1_000_000_000) {
      total = timestampAksi;
    } else if (timestampAksi >= fallbackTimestampAwal) {
      total = timestampAksi - fallbackTimestampAwal;
    }
  }
  return Math.max(1, Math.min(durasiSoalMs, total));
}

function prosesJawabanTim(
  state: MatchState,
  sisi: TimSisi,
  indeksPilihan: number | null,
  bankSoal: readonly Soal[],
  timestamp: number
): MatchState {
  const tim = sisi === 'merah' ? state.timKiri : state.timKanan;
  if (tim.faseTim !== 'menjawab' || tim.klikTerkunci) {
    return state;
  }

  const soalSiswa = tim.dek[tim.indeksSoal];
  if (!soalSiswa) {
    return state;
  }

  const hasilCek = cekJawaban(
    bankSoal,
    soalSiswa.id,
    indeksPilihan,
    state.pengaturan.penjelasan,
    state.pengaturan.bonus
  );

  const pemainAktif = ambilPemainAktifTim(tim);
  const apakahWaktuHabis = indeksPilihan === null;
  const bonusDipakai = Boolean(hasilCek.benar && state.pengaturan.bonus && soalSiswa.bonus);
  const waktuJawabMs = apakahWaktuHabis
    ? state.pengaturan.durasiSoal * 1000
    : hitungWaktuJawabSoalMs(
        state.pengaturan.durasiSoal,
        tim.waktuSoalBerjalanMs,
        tim.tickTimestampTerakhir,
        timestamp,
        state.timestampTerakhir
      );

  let perubahanLangkah = 0;
  let jenisRiwayat: JenisRiwayat = 'salah';

  if (hasilCek.benar) {
    const besar = bonusDipakai ? 2 : 1;
    perubahanLangkah = sisi === 'merah' ? -besar : besar;
    jenisRiwayat = bonusDipakai ? 'bonus' : 'benar';
  } else {
    jenisRiwayat = apakahWaktuHabis ? 'waktuHabis' : 'salah';
    if (state.pengaturan.salahMenarikLawan) {
      // Menarik tali 1 langkah ke arah LAWAN
      perubahanLangkah = sisi === 'merah' ? 1 : -1;
    }
  }

  const posisiBaru = state.posisiTali + perubahanLangkah;
  const entriRiwayat: RiwayatTarikanMatch = {
    id: buatId('tarik'),
    urutan: state.riwayat.length + 1,
    waktuDetik: Math.floor(state.waktuBerjalanMs / 1000),
    waktuResponsMs: waktuJawabMs,
    tim: sisi,
    pemain: pemainAktif,
    soalId: soalSiswa.id,
    jenis: jenisRiwayat,
    pilihanDipilih: indeksPilihan,
    benar: hasilCek.benar,
    perubahanLangkah,
    posisiTaliSesudah: posisiBaru,
    penjelasan: hasilCek.penjelasan,
  };

  const adaPenjelasan = Boolean(state.pengaturan.penjelasan && hasilCek.penjelasan);
  const durasiUmpanBalik = adaPenjelasan ? 3900 : 900;

  const timBaru: TimMatchState = {
    ...tim,
    skorBenar: tim.skorBenar + (hasilCek.benar ? 1 : 0),
    skorSalah: tim.skorSalah + (hasilCek.benar ? 0 : 1),
    soalTerjawabCount: tim.soalTerjawabCount + 1,
    faseTim: 'umpanBalik',
    sisaUmpanBalikMs: durasiUmpanBalik,
    klikTerkunci: true,
    pemainTerakhir: pemainAktif,
    totalWaktuBenarMs: tim.totalWaktuBenarMs + (hasilCek.benar ? waktuJawabMs : 0),
    jumlahBenarKecepatan: tim.jumlahBenarKecepatan + (hasilCek.benar ? 1 : 0),
    tickTimestampTerakhir: null,
    umpanBalik: {
      jenis: hasilCek.benar ? 'benar' : apakahWaktuHabis ? 'waktuHabis' : 'salah',
      pilihanDipilih: indeksPilihan,
      kunciBenar: hasilCek.kunciIndeks,
      penjelasan: hasilCek.penjelasan,
      bonusDipakai,
    },
  };

  const rekapBaru = catatRekapPemain(
    state.rekapPemain,
    sisi,
    pemainAktif,
    1,
    hasilCek.benar ? 1 : 0,
    hasilCek.benar ? 0 : 1
  );

  return {
    ...state,
    posisiTali: posisiBaru,
    timKiri: sisi === 'merah' ? timBaru : state.timKiri,
    timKanan: sisi === 'biru' ? timBaru : state.timKanan,
    soalPernahDilihatKiri:
      sisi === 'merah'
        ? tambahIdUnik(state.soalPernahDilihatKiri, soalSiswa.id)
        : state.soalPernahDilihatKiri,
    soalPernahDilihatKanan:
      sisi === 'biru'
        ? tambahIdUnik(state.soalPernahDilihatKanan, soalSiswa.id)
        : state.soalPernahDilihatKanan,
    soalDijawabKiri:
      sisi === 'merah'
        ? tambahIdUnik(state.soalDijawabKiri, soalSiswa.id)
        : state.soalDijawabKiri,
    soalDijawabKanan:
      sisi === 'biru'
        ? tambahIdUnik(state.soalDijawabKanan, soalSiswa.id)
        : state.soalDijawabKanan,
    riwayat: [...state.riwayat, entriRiwayat],
    rekapPemain: rekapBaru,
    timestampTerakhir: timestamp,
  };
}

function prosesPenentuanJawab(
  state: MatchState,
  sisi: TimSisi,
  indeksPilihan: number | null,
  bankSoal: readonly Soal[],
  timestamp: number
): MatchState {
  const pen = state.penentuan;
  if (!pen || pen.sisaUmpanBalikMs > 0) {
    return state;
  }

  const soalTim = sisi === 'merah' ? pen.soalKiri : pen.soalKanan;
  if (!soalTim) return state;

  if (sisi === 'merah' && pen.jawabanKiri?.terkunci) return state;
  if (sisi === 'biru' && pen.jawabanKanan?.terkunci) return state;

  const cek = cekJawaban(bankSoal, soalTim.id, indeksPilihan, false, false);
  const waktuJawabMs =
    indeksPilihan === null
      ? state.pengaturan.durasiSoal * 1000
      : hitungWaktuJawabSoalMs(
          state.pengaturan.durasiSoal,
          pen.waktuBerjalanSoalMs,
          pen.tickTimestampTerakhir,
          timestamp,
          state.timestampTerakhir
        );

  const jawabanObj: JawabanPenentuan = {
    pilihan: indeksPilihan,
    benar: cek.benar,
    terkunci: true,
    waktuJawabMs,
  };

  const penBaru: PenentuanState = {
    ...pen,
    jawabanKiri: sisi === 'merah' ? jawabanObj : pen.jawabanKiri,
    jawabanKanan: sisi === 'biru' ? jawabanObj : pen.jawabanKanan,
  };

  // Evaluasi hanya jika KEDUA tim sudah menjawab
  if (!penBaru.jawabanKiri || !penBaru.jawabanKanan) {
    return { ...state, penentuan: penBaru, timestampTerakhir: timestamp };
  }

  return evaluasiHasilPenentuan({ ...state, penentuan: penBaru, timestampTerakhir: timestamp });
}

function evaluasiHasilPenentuan(state: MatchState): MatchState {
  const pen = state.penentuan;
  if (!pen || !pen.soalKiri || !pen.soalKanan) return state;

  const kiriBenar = Boolean(pen.jawabanKiri?.benar);
  const kananBenar = Boolean(pen.jawabanKanan?.benar);
  const waktuKiriMs = pen.jawabanKiri?.waktuJawabMs ?? state.pengaturan.durasiSoal * 1000;
  const waktuKananMs = pen.jawabanKanan?.waktuJawabMs ?? state.pengaturan.durasiSoal * 1000;

  let rekap = catatRekapPemain(
    state.rekapPemain,
    'merah',
    pen.wakilKiri,
    1,
    kiriBenar ? 1 : 0,
    kiriBenar ? 0 : 1
  );
  rekap = catatRekapPemain(
    rekap,
    'biru',
    pen.wakilKanan,
    1,
    kananBenar ? 1 : 0,
    kananBenar ? 0 : 1
  );

  const timKiriUpdate: TimMatchState = {
    ...state.timKiri,
    skorBenar: state.timKiri.skorBenar + (kiriBenar ? 1 : 0),
    skorSalah: state.timKiri.skorSalah + (kiriBenar ? 0 : 1),
    soalTerjawabCount: state.timKiri.soalTerjawabCount + 1,
    totalWaktuBenarMs: state.timKiri.totalWaktuBenarMs + (kiriBenar ? waktuKiriMs : 0),
    jumlahBenarKecepatan: state.timKiri.jumlahBenarKecepatan + (kiriBenar ? 1 : 0),
  };
  const timKananUpdate: TimMatchState = {
    ...state.timKanan,
    skorBenar: state.timKanan.skorBenar + (kananBenar ? 1 : 0),
    skorSalah: state.timKanan.skorSalah + (kananBenar ? 0 : 1),
    soalTerjawabCount: state.timKanan.soalTerjawabCount + 1,
    totalWaktuBenarMs: state.timKanan.totalWaktuBenarMs + (kananBenar ? waktuKananMs : 0),
    jumlahBenarKecepatan: state.timKanan.jumlahBenarKecepatan + (kananBenar ? 1 : 0),
  };

  let pemenangRonde: TimSisi | null = null;
  let keduaBenarLebihCepat = false;

  if (kiriBenar !== kananBenar) {
    pemenangRonde = kiriBenar ? 'merah' : 'biru';
  } else if (kiriBenar && kananBenar && waktuKiriMs !== waktuKananMs) {
    pemenangRonde = waktuKiriMs < waktuKananMs ? 'merah' : 'biru';
    keduaBenarLebihCepat = true;
  }

  if (pemenangRonde) {
    const delta = pemenangRonde === 'merah' ? -1 : 1;
    const posisiBaru = state.posisiTali + delta;
    const sisiKalah: TimSisi = pemenangRonde === 'merah' ? 'biru' : 'merah';

    const entriKalah: RiwayatTarikanMatch = {
      id: buatId('tarik'),
      urutan: state.riwayat.length + 1,
      waktuDetik: Math.floor(state.waktuBerjalanMs / 1000),
      waktuResponsMs: sisiKalah === 'merah' ? waktuKiriMs : waktuKananMs,
      tim: sisiKalah,
      pemain: sisiKalah === 'merah' ? pen.wakilKiri : pen.wakilKanan,
      soalId: sisiKalah === 'merah' ? pen.soalKiri.id : pen.soalKanan.id,
      jenis: 'penentuan',
      pilihanDipilih:
        sisiKalah === 'merah'
          ? (pen.jawabanKiri?.pilihan ?? null)
          : (pen.jawabanKanan?.pilihan ?? null),
      benar: sisiKalah === 'merah' ? kiriBenar : kananBenar,
      perubahanLangkah: 0,
      posisiTaliSesudah: state.posisiTali,
    };

    const entriMenang: RiwayatTarikanMatch = {
      id: buatId('tarik'),
      urutan: state.riwayat.length + 2,
      waktuDetik: Math.floor(state.waktuBerjalanMs / 1000),
      waktuResponsMs: pemenangRonde === 'merah' ? waktuKiriMs : waktuKananMs,
      tim: pemenangRonde,
      pemain: pemenangRonde === 'merah' ? pen.wakilKiri : pen.wakilKanan,
      soalId: pemenangRonde === 'merah' ? pen.soalKiri.id : pen.soalKanan.id,
      jenis: 'penentuan',
      pilihanDipilih:
        pemenangRonde === 'merah'
          ? (pen.jawabanKiri?.pilihan ?? null)
          : (pen.jawabanKanan?.pilihan ?? null),
      benar: true,
      perubahanLangkah: delta,
      posisiTaliSesudah: posisiBaru,
    };

    const namaPemenang =
      pemenangRonde === 'merah' ? state.timKiri.namaTim : state.timKanan.namaTim;
    const selisihRondeMs = Math.abs(waktuKiriMs - waktuKananMs);

    return {
      ...state,
      fase: 'selesai',
      posisiTali: posisiBaru,
      timKiri: timKiriUpdate,
      timKanan: timKananUpdate,
      riwayat: [...state.riwayat, entriKalah, entriMenang],
      rekapPemain: rekap,
      pemenang: pemenangRonde,
      alasanAkhir: 'penentuan',
      caraMenang: 'penentuan',
      selisihKecepatanMs: keduaBenarLebihCepat ? selisihRondeMs : null,
      keteranganMenang: keduaBenarLebihCepat
        ? `Menang di ronde penentuan (lebih cepat ${formatDetikIndonesia(selisihRondeMs)} detik)`
        : 'Menang di ronde penentuan',
      penentuan: {
        ...pen,
        sisaUmpanBalikMs: 0,
        statusHasil: keduaBenarLebihCepat
          ? `${namaPemenang} benar dan lebih cepat (${formatDetikIndonesia(selisihRondeMs)} dtk) di Ronde Penentuan!`
          : `${namaPemenang} menang Ronde Penentuan!`,
      },
    };
  }

  // Masih imbang di ronde ini -> catat riwayat netral lalu jeda singkat sebelum ronde berikutnya / Step 3
  const entriKiriNetral: RiwayatTarikanMatch = {
    id: buatId('tarik'),
    urutan: state.riwayat.length + 1,
    waktuDetik: Math.floor(state.waktuBerjalanMs / 1000),
    waktuResponsMs: waktuKiriMs,
    tim: 'merah',
    pemain: pen.wakilKiri,
    soalId: pen.soalKiri.id,
    jenis: 'penentuan',
    pilihanDipilih: pen.jawabanKiri?.pilihan ?? null,
    benar: kiriBenar,
    perubahanLangkah: 0,
    posisiTaliSesudah: state.posisiTali,
  };
  const entriKananNetral: RiwayatTarikanMatch = {
    id: buatId('tarik'),
    urutan: state.riwayat.length + 2,
    waktuDetik: Math.floor(state.waktuBerjalanMs / 1000),
    waktuResponsMs: waktuKananMs,
    tim: 'biru',
    pemain: pen.wakilKanan,
    soalId: pen.soalKanan.id,
    jenis: 'penentuan',
    pilihanDipilih: pen.jawabanKanan?.pilihan ?? null,
    benar: kananBenar,
    perubahanLangkah: 0,
    posisiTaliSesudah: state.posisiTali,
  };

  const masihAdaRondeBerikut = pen.rondeKe < pen.maksRonde;
  return {
    ...state,
    timKiri: timKiriUpdate,
    timKanan: timKananUpdate,
    riwayat: [...state.riwayat, entriKiriNetral, entriKananNetral],
    rekapPemain: rekap,
    penentuan: {
      ...pen,
      sisaUmpanBalikMs: 1200,
      statusHasil:
        kiriBenar && kananBenar
          ? masihAdaRondeBerikut
            ? 'Keduanya benar di waktu yang sama! Lanjut ronde berikutnya...'
            : 'Keduanya benar di waktu yang sama! Menghitung kecepatan total...'
          : masihAdaRondeBerikut
            ? 'Belum ada pemenang di ronde ini! Lanjut ronde berikutnya...'
            : 'Ronde penentuan ke-3 selesai imbang! Menghitung kecepatan total...',
    },
  };
}

function hitungTotalSelisihRiwayat(riwayat: readonly RiwayatTarikanMatch[]): number {
  return riwayat.reduce((acc, item) => acc + item.perubahanLangkah, 0);
}

/**
 * Reducer murni mesin permainan tarik tambang.
 */
export function matchReducer(
  state: MatchState,
  action: MatchAction,
  bankSoal: readonly Soal[]
): MatchState {
  switch (action.type) {
    case 'JEDA': {
      if (state.fase !== 'countdown' && state.fase !== 'bermain' && state.fase !== 'penentuan') {
        return state;
      }
      return {
        ...state,
        fase: 'jeda',
        faseSebelumJeda: state.fase,
        timKiri: { ...state.timKiri, tickTimestampTerakhir: null },
        timKanan: { ...state.timKanan, tickTimestampTerakhir: null },
        penentuan: state.penentuan
          ? { ...state.penentuan, tickTimestampTerakhir: null }
          : null,
      };
    }

    case 'LANJUT': {
      if (state.fase !== 'jeda') {
        return state;
      }
      const ulangCountdown = state.faseSebelumJeda === 'countdown';
      return {
        ...state,
        fase: state.faseSebelumJeda,
        countdownMs: ulangCountdown ? TOTAL_DURASI_COUNTDOWN_MS : state.countdownMs,
        timKiri: { ...state.timKiri, tickTimestampTerakhir: null },
        timKanan: { ...state.timKanan, tickTimestampTerakhir: null },
        penentuan: state.penentuan
          ? { ...state.penentuan, tickTimestampTerakhir: null }
          : null,
        timestampTerakhir: Date.now(),
      };
    }

    case 'JAWAB': {
      if (state.fase === 'bermain') {
        return prosesJawabanTim(state, action.tim, action.indeksPilihan, bankSoal, action.timestamp);
      }
      if (state.fase === 'penentuan') {
        return prosesPenentuanJawab(
          state,
          action.tim,
          action.indeksPilihan,
          bankSoal,
          action.timestamp
        );
      }
      return state;
    }

    case 'TICK': {
      const delta = Math.max(0, action.deltaMs);
      if (delta === 0 || state.fase === 'jeda' || state.fase === 'selesai') {
        return state;
      }

      if (state.fase === 'countdown') {
        const sisa = state.countdownMs - delta;
        if (sisa <= 0) {
          return {
            ...state,
            fase: 'bermain',
            faseSebelumJeda: 'bermain',
            countdownMs: 0,
            timKiri: { ...state.timKiri, tickTimestampTerakhir: action.timestamp },
            timKanan: { ...state.timKanan, tickTimestampTerakhir: action.timestamp },
            timestampTerakhir: action.timestamp,
          };
        }
        return { ...state, countdownMs: sisa, timestampTerakhir: action.timestamp };
      }

      if (state.fase === 'penentuan' && state.penentuan) {
        const pen = state.penentuan;
        if (pen.sisaUmpanBalikMs > 0) {
          const sisaFb = pen.sisaUmpanBalikMs - delta;
          if (sisaFb <= 0) {
            return lanjutKeRondePenentuanBerikutnya(state, action.timestamp);
          }
          return {
            ...state,
            penentuan: { ...pen, sisaUmpanBalikMs: sisaFb },
            timestampTerakhir: action.timestamp,
          };
        }

        const sisaSoalPen = pen.sisaWaktuSoalMs - delta;
        const waktuBerjalanSoalBaru = pen.waktuBerjalanSoalMs + delta;
        if (sisaSoalPen <= 0) {
          const durasiMaxMs = state.pengaturan.durasiSoal * 1000;
          const jawabanKiri = pen.jawabanKiri ?? {
            pilihan: null,
            benar: false,
            terkunci: true,
            waktuJawabMs: durasiMaxMs,
          };
          const jawabanKanan = pen.jawabanKanan ?? {
            pilihan: null,
            benar: false,
            terkunci: true,
            waktuJawabMs: durasiMaxMs,
          };
          return evaluasiHasilPenentuan({
            ...state,
            penentuan: {
              ...pen,
              sisaWaktuSoalMs: 0,
              waktuBerjalanSoalMs: durasiMaxMs,
              tickTimestampTerakhir: null,
              jawabanKiri,
              jawabanKanan,
            },
            timestampTerakhir: action.timestamp,
          });
        }

        return {
          ...state,
          penentuan: {
            ...pen,
            sisaWaktuSoalMs: sisaSoalPen,
            waktuBerjalanSoalMs: waktuBerjalanSoalBaru,
            tickTimestampTerakhir: action.timestamp,
          },
          timestampTerakhir: action.timestamp,
        };
      }

      // Fase 'bermain'
      let berikut: MatchState = {
        ...state,
        waktuBerjalanMs: state.waktuBerjalanMs + delta,
        timestampTerakhir: action.timestamp,
      };

      // Cek waktu total habis terlebih dahulu (soal yang sedang berjalan dibatalkan, tidak dihitung)
      if (berikut.sisaWaktuTotalMs !== null) {
        const sisaTotal = berikut.sisaWaktuTotalMs - delta;
        if (sisaTotal <= 0) {
          return selesaikanAtauPenentuan(
            { ...berikut, sisaWaktuTotalMs: 0 },
            state.pengaturan.akhirPermainan === 'keduanya' ? 'keduanya' : 'waktu',
            action.timestamp
          );
        }
        berikut.sisaWaktuTotalMs = sisaTotal;
      }

      // Update timer masing-masing tim secara mandiri
      const prosesTickTim = (sisi: TimSisi, st: MatchState): MatchState => {
        const tim = sisi === 'merah' ? st.timKiri : st.timKanan;
        if (tim.faseTim === 'selesai') return st;

        if (tim.faseTim === 'umpanBalik') {
          const sisaFb = tim.sisaUmpanBalikMs - delta;
          if (sisaFb <= 0) {
            const { timBaru: timMaju, soalBaruId } = majukanSoalTim(
              tim,
              st.pengaturan,
              action.timestamp
            );
            return {
              ...st,
              timKiri: sisi === 'merah' ? timMaju : st.timKiri,
              timKanan: sisi === 'biru' ? timMaju : st.timKanan,
              soalPernahDilihatKiri:
                sisi === 'merah'
                  ? tambahIdUnik(st.soalPernahDilihatKiri, soalBaruId)
                  : st.soalPernahDilihatKiri,
              soalPernahDilihatKanan:
                sisi === 'biru'
                  ? tambahIdUnik(st.soalPernahDilihatKanan, soalBaruId)
                  : st.soalPernahDilihatKanan,
            };
          }
          const timFb: TimMatchState = { ...tim, sisaUmpanBalikMs: sisaFb };
          return {
            ...st,
            timKiri: sisi === 'merah' ? timFb : st.timKiri,
            timKanan: sisi === 'biru' ? timFb : st.timKanan,
          };
        }

        // tim.faseTim === 'menjawab'
        const sisaSoal = tim.sisaWaktuSoalMs - delta;
        if (sisaSoal <= 0) {
          return prosesJawabanTim(st, sisi, null, bankSoal, action.timestamp);
        }

        const timTimer: TimMatchState = {
          ...tim,
          sisaWaktuSoalMs: sisaSoal,
          waktuSoalBerjalanMs: tim.waktuSoalBerjalanMs + delta,
          tickTimestampTerakhir: action.timestamp,
        };
        return {
          ...st,
          timKiri: sisi === 'merah' ? timTimer : st.timKiri,
          timKanan: sisi === 'biru' ? timTimer : st.timKanan,
        };
      };

      berikut = prosesTickTim('merah', berikut);
      berikut = prosesTickTim('biru', berikut);

      // Cek jika kedua tim sudah menyelesaikan dek-nya (SOAL HABIS atau KEDUANYA)
      if (
        berikut.timKiri.faseTim === 'selesai' &&
        berikut.timKanan.faseTim === 'selesai' &&
        berikut.pengaturan.akhirPermainan !== 'waktu'
      ) {
        return selesaikanAtauPenentuan(
          berikut,
          berikut.pengaturan.akhirPermainan === 'keduanya' ? 'keduanya' : 'soalHabis',
          action.timestamp
        );
      }

      return berikut;
    }

    case 'LEWATI_SOAL': {
      if (state.fase !== 'bermain' && state.fase !== 'jeda') return state;
      const targetTim = action.tim === 'merah' ? state.timKiri : state.timKanan;
      if (targetTim.faseTim === 'selesai') return state;
      const { timBaru: maju, soalBaruId } = majukanSoalTim(
        targetTim,
        state.pengaturan,
        action.timestamp
      );
      return {
        ...state,
        timKiri: action.tim === 'merah' ? maju : state.timKiri,
        timKanan: action.tim === 'biru' ? maju : state.timKanan,
        soalPernahDilihatKiri:
          action.tim === 'merah'
            ? tambahIdUnik(state.soalPernahDilihatKiri, soalBaruId)
            : state.soalPernahDilihatKiri,
        soalPernahDilihatKanan:
          action.tim === 'biru'
            ? tambahIdUnik(state.soalPernahDilihatKanan, soalBaruId)
            : state.soalPernahDilihatKanan,
      };
    }

    case 'KOREKSI_TALI_MANUAL': {
      const delta = action.arah === 'merah' ? -1 : 1;
      const posisiBaru = state.posisiTali + delta;
      const entri: RiwayatTarikanMatch = {
        id: buatId('tarik'),
        urutan: state.riwayat.length + 1,
        waktuDetik: Math.floor(state.waktuBerjalanMs / 1000),
        tim: action.arah,
        pemain: 'Koreksi Guru',
        soalId: '-',
        jenis: 'manual',
        pilihanDipilih: null,
        benar: true,
        perubahanLangkah: delta,
        posisiTaliSesudah: posisiBaru,
      };
      return {
        ...state,
        posisiTali: posisiBaru,
        riwayat: [...state.riwayat, entri],
        timestampTerakhir: action.timestamp,
      };
    }

    case 'BATALKAN_TERAKHIR': {
      // Cari entri non-manual/non-penentuan terakhir milik tim yang dipilih
      let idxHapus = -1;
      for (let i = state.riwayat.length - 1; i >= 0; i -= 1) {
        const item = state.riwayat[i];
        if (item.tim === action.tim && item.jenis !== 'manual' && item.jenis !== 'penentuan') {
          idxHapus = i;
          break;
        }
      }
      if (idxHapus === -1) return state;

      const dihapus = state.riwayat[idxHapus];
      const riwayatSisa = state.riwayat.filter((_, idx) => idx !== idxHapus);

      // Hitung ulang posisiTaliSesudah seluruh riwayat agar selisih layar === jumlah riwayat
      let akumulasi = 0;
      const riwayatBaru = riwayatSisa.map((item, idx) => {
        akumulasi += item.perubahanLangkah;
        return {
          ...item,
          urutan: idx + 1,
          posisiTaliSesudah: akumulasi,
        };
      });

      const timLama = action.tim === 'merah' ? state.timKiri : state.timKanan;
      const timBaru: TimMatchState = {
        ...timLama,
        skorBenar: Math.max(0, timLama.skorBenar - (dihapus.benar ? 1 : 0)),
        skorSalah: Math.max(0, timLama.skorSalah - (dihapus.benar ? 0 : 1)),
        soalTerjawabCount: Math.max(0, timLama.soalTerjawabCount - 1),
      };

      const rekapBaru = catatRekapPemain(
        state.rekapPemain,
        action.tim,
        dihapus.pemain,
        -1,
        dihapus.benar ? -1 : 0,
        dihapus.benar ? 0 : -1
      );

      return {
        ...state,
        posisiTali: hitungTotalSelisihRiwayat(riwayatBaru),
        riwayat: riwayatBaru,
        rekapPemain: rekapBaru,
        timKiri: action.tim === 'merah' ? timBaru : state.timKiri,
        timKanan: action.tim === 'biru' ? timBaru : state.timKanan,
      };
    }

    case 'ULANGI_SOAL': {
      if (!state.pengaturan.ulangiSoal) return state;
      const target = action.tim === 'merah' ? state.timKiri : state.timKanan;
      if (target.faseTim === 'selesai') return state;
      const resetSoal: TimMatchState = {
        ...target,
        faseTim: 'menjawab',
        sisaWaktuSoalMs: state.pengaturan.durasiSoal * 1000,
        sisaUmpanBalikMs: 0,
        umpanBalik: null,
        klikTerkunci: false,
        waktuSoalBerjalanMs: 0,
        tickTimestampTerakhir: null,
      };
      return {
        ...state,
        timKiri: action.tim === 'merah' ? resetSoal : state.timKiri,
        timKanan: action.tim === 'biru' ? resetSoal : state.timKanan,
      };
    }

    case 'AKHIRI_MANUAL': {
      if (state.fase === 'selesai') return state;
      const pemenang: TimSisi | 'seri' =
        state.posisiTali < 0 ? 'merah' : state.posisiTali > 0 ? 'biru' : 'seri';
      return {
        ...state,
        fase: 'selesai',
        pemenang,
        alasanAkhir: pemenang === 'seri' ? 'seri' : state.pengaturan.akhirPermainan,
        caraMenang: pemenang === 'seri' ? 'seri' : 'skor',
        keteranganMenang:
          pemenang === 'seri'
            ? 'Pertandingan dihentikan guru dalam posisi imbang'
            : `${pemenang === 'merah' ? state.timKiri.namaTim : state.timKanan.namaTim} unggul saat dihentikan guru`,
        timKiri: { ...state.timKiri, tickTimestampTerakhir: null },
        timKanan: { ...state.timKanan, tickTimestampTerakhir: null },
        penentuan: null,
        timestampTerakhir: action.timestamp,
      };
    }

    default:
      return state;
  }
}

export function simpanSesiMatchSessionStorage(state: MatchState): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(SESSION_KEY_MATCH, JSON.stringify(state));
    }
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
}

export function bacaSesiMatchSessionStorage(): MatchState | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }
    const mentah = window.sessionStorage.getItem(SESSION_KEY_MATCH);
    if (!mentah) return null;
    return JSON.parse(mentah) as MatchState;
  } catch {
    return null;
  }
}

export function hapusSesiMatchSessionStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_KEY_MATCH);
    }
  } catch {
    // Abaikan jika sessionStorage gagal diakses
  }
}

/**
 * Mengambil kunci jawaban khusus untuk Panel Guru (terpisah dari data tampilan siswa).
 */
export function ambilKunciUntukPanelGuru(
  bankSoal: readonly Soal[],
  soalId: string
): { huruf: string; teks: string } | null {
  const s = bankSoal.find((item) => item.id === soalId);
  if (!s) return null;
  return {
    huruf: String.fromCharCode(65 + s.kunci),
    teks: s.pilihan[s.kunci] ?? '',
  };
}

export function buatDekSiswaDariBank(bankSoal: readonly Soal[]): SoalSiswa[] {
  return ambilDaftarSoalUntukSiswa(bankSoal);
}

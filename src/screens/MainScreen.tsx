import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Flame,
  Home,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { buatSesiPembagianMurni, useAppStore } from '../app/store';
import { ArenaTarikTambang } from '../components/ArenaTarikTambang';
import { AutoFitText } from '../components/AutoFitText';
import { BelumAdaGameCard } from '../components/BelumAdaGameCard';
import { Button3D } from '../components/Button3D';
import { Modal } from '../components/Modal';
import { PanelGuruMainModal } from '../components/PanelGuruMainModal';
import { useStage } from '../components/Stage';
import { RuteHash, SoalSiswa, TimSisi } from '../data/types';
import { buatPengaturanDefault } from '../engine/gameEngine';
import {
  ambilPasanganNamaTimResmi,
  ringkasSoalSnapshot,
} from '../engine/hasilRekap';
import {
  ambilInfoCountdown,
  ambilPemainAktifTim,
  ambilPutaranTim,
  bacaSesiMatchSessionStorage,
  buatMatchState,
  hapusSesiMatchSessionStorage,
  MatchAction,
  MatchState,
  matchReducer,
  simpanSesiMatchSessionStorage,
  TimMatchState,
} from '../engine/match';
import { ambilPeringkatTurnamen } from '../engine/session';
import {
  ambilVolumeAudio,
  aturVolumeAudio,
  hentikanMusikLatar,
  hentikanSemuaEfekTerjadwal,
  hentikanUrutanMulai,
  mainkanBuzz,
  mainkanDing,
  mainkanKlikJeda,
  mainkanPeluitAkhirSelesai,
  mainkanPeluitPenentuan,
  mainkanPipLanjut,
  mainkanTikTimer,
  mulaiUrutanAudioMulai,
  sinkronPengaturanAudio,
  tandaiInteraksiAudio,
} from '../utils/audio';

interface MainScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

function formatWaktuMMSS(ms: number): string {
  const totalDetik = Math.max(0, Math.ceil(ms / 1000));
  const menit = Math.floor(totalDetik / 60);
  const detik = totalDetik % 60;
  return `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
}

interface TimerLingkaranProps {
  sisaMs: number;
  durasiTotalDetik: number;
  modeRekam: boolean;
}

const TimerLingkaran: React.FC<TimerLingkaranProps> = ({
  sisaMs,
  durasiTotalDetik,
  modeRekam,
}) => {
  const detikTampil = Math.max(0, Math.ceil(sisaMs / 1000));
  const rasio = Math.max(0, Math.min(1, sisaMs / Math.max(1000, durasiTotalDetik * 1000)));
  const radius = 26;
  const keliling = 2 * Math.PI * radius;
  const offset = keliling * (1 - rasio);

  // Cincin Hijau -> Kuning -> Merah saat 3 detik terakhir
  const warnaCincin =
    detikTampil <= 3 ? '#FF1744' : rasio <= 0.5 ? '#FFD400' : '#00C853';
  const denyutAkhir = detikTampil > 0 && detikTampil <= 3 && !modeRekam;

  return (
    <div
      className={`relative flex h-[64px] w-[64px] shrink-0 items-center justify-center transition-transform duration-200 ${
        denyutAkhir ? 'scale-105' : ''
      }`}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={radius} stroke="#071236" strokeWidth="8" fill="#0B1B4D" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke={warnaCincin}
          strokeWidth="7"
          strokeDasharray={keliling}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span
        className={`font-display tabular-angka teks-outline-tebal absolute text-2xl font-bold ${
          detikTampil <= 3 ? 'text-[#FFD400]' : 'text-white'
        }`}
      >
        {detikTampil}
      </span>
    </div>
  );
};

const PARTIKEL_KONFETI = [
  { left: '10%', warna: '#FFD400', delay: '0ms' },
  { left: '24%', warna: '#00C853', delay: '80ms' },
  { left: '40%', warna: '#FF9100', delay: '40ms' },
  { left: '58%', warna: '#29B6FF', delay: '100ms' },
  { left: '74%', warna: '#FFD400', delay: '20ms' },
  { left: '88%', warna: '#57E893', delay: '90ms' },
];

interface PanelSoalTimProps {
  timState: TimMatchState;
  durasiSoal: number;
  faseMatch: MatchState['fase'];
  comboBeruntun: number;
  penentuanSoal: SoalSiswa | null;
  penentuanWakil: string | null;
  penentuanTerkunci: boolean;
  penentuanPilihan: number | null;
  penentuanSisaMs: number;
  penentuanRondeLabel?: string | null;
  penentuanStatus?: string | null;
  modeRekam: boolean;
  efekRingan: boolean;
  onJawab: (indeksPilihan: number) => void;
}

const PanelSoalTim: React.FC<PanelSoalTimProps> = ({
  timState,
  durasiSoal,
  faseMatch,
  comboBeruntun,
  penentuanSoal,
  penentuanWakil,
  penentuanTerkunci,
  penentuanPilihan,
  penentuanSisaMs,
  penentuanRondeLabel = null,
  penentuanStatus = null,
  modeRekam,
  efekRingan,
  onJawab,
}) => {
  const adalahMerah = timState.sisi === 'merah';
  const sedangPenentuan = faseMatch === 'penentuan';

  const soalAktif = sedangPenentuan
    ? penentuanSoal
    : timState.dek[timState.indeksSoal];
  const pemainAktif = sedangPenentuan
    ? (penentuanWakil ?? ambilPemainAktifTim(timState))
    : ambilPemainAktifTim(timState);
  const putaran = ambilPutaranTim(timState);
  const sisaWaktuMs = sedangPenentuan ? penentuanSisaMs : timState.sisaWaktuSoalMs;
  const terkunci =
    faseMatch === 'countdown' ||
    faseMatch === 'jeda' ||
    faseMatch === 'selesai' ||
    (sedangPenentuan ? penentuanTerkunci : timState.klikTerkunci || timState.faseTim !== 'menjawab');

  const umpan = timState.umpanBalik;
  const sedangUmpanBalik = !sedangPenentuan && timState.faseTim === 'umpanBalik' && Boolean(umpan);
  const adalahBenar = Boolean(sedangUmpanBalik && umpan?.jenis === 'benar');
  const adalahSalah = Boolean(
    sedangUmpanBalik && (umpan?.jenis === 'salah' || umpan?.jenis === 'waktuHabis')
  );

  return (
    <section
      aria-label={`Panel Soal ${timState.namaTim}`}
      className={`kartu-3d relative flex h-[480px] flex-col gap-2 overflow-hidden rounded-3xl border-[5px] p-3 transition-colors duration-200 ${
        adalahBenar
          ? 'border-[#00C853] bg-[#005724]'
          : adalahSalah
            ? 'anim-goyang-panel border-[#FF1744] bg-[#7A0018]'
            : adalahMerah
              ? 'border-[#FF1744] bg-[#7A0018]'
              : 'border-[#1E6BFF] bg-[#071F70]'
      }`}
    >
      {/* Efek Konfeti & Bintang Kuning saat BENAR (berkurang di mode efekRingan) */}
      {adalahBenar && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {(efekRingan ? PARTIKEL_KONFETI.slice(0, 3) : PARTIKEL_KONFETI).map((p, i) => (
            <div
              key={i}
              style={{ left: p.left, top: '12px', animationDelay: p.delay, backgroundColor: p.warna }}
              className="anim-konfeti absolute h-4 w-4 rounded-sm border-2 border-[#071236]"
            />
          ))}
          <Star
            size={36}
            fill="#FFD400"
            className="anim-pop-skor absolute top-4 right-5 text-[#071236]"
          />
        </div>
      )}

      {/* Header Panel Soal */}
      <div className="flex h-[74px] shrink-0 items-center justify-between gap-3 rounded-2xl border-3 border-[#071236] bg-[#0B1B4D] px-4 shadow-[0_4px_0_#071236]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-[#FFD400]">
              {adalahMerah ? '▲' : '●'}
            </span>
            <div className="h-[30px] min-w-0 flex-1">
              <AutoFitText
                maxFontSize={24}
                minFontSize={15}
                className="font-display teks-outline-tebal font-bold text-[#FFD400]"
              >
                {timState.namaTim}
              </AutoFitText>
            </div>
            {comboBeruntun >= 3 && (
              <span className="font-display flex shrink-0 items-center gap-1 rounded-lg border-2 border-[#071236] bg-[#FF9100] px-2 py-0.5 text-xs font-bold text-[#071236]">
                <Flame size={14} fill="#FF1744" className="text-[#FF1744]" />
                COMBO ×{comboBeruntun}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm font-bold text-white">
            <span className="truncate text-[#57E893]">Giliran: {pemainAktif}</span>
            <span className="text-[#DCE7FF]">· Putaran {putaran}</span>
            <span className="tabular-angka text-[#FFD400]">
              ·{' '}
              {sedangPenentuan
                ? (penentuanRondeLabel ?? 'Penentuan')
                : `Soal ${Math.min(timState.indeksSoal + 1, Math.max(1, timState.dek.length))}/${timState.dek.length}`}
            </span>
          </div>
        </div>

        <TimerLingkaran
          sisaMs={sisaWaktuMs}
          durasiTotalDetik={durasiSoal}
          modeRekam={modeRekam}
        />
      </div>

      {/* Kartu Soal Navy Pekat (Tanpa Kunci) */}
      <div className="kartu-3d flex h-[132px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border-3 border-[#071236] bg-[#071236] px-4 py-2.5">
        {!sedangPenentuan && timState.faseTim === 'selesai' ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-display teks-outline-tebal text-3xl font-bold text-[#57E893]">
              SELESAI ✔ Menunggu lawan
            </p>
            <p className="text-sm font-semibold text-[#DCE7FF]">
              Semua soal untuk tim ini telah diselesaikan.
            </p>
          </div>
        ) : soalAktif ? (
          soalAktif.kode ? (
            <div className="grid h-full w-full grid-cols-12 items-center gap-3 overflow-hidden">
              <div className="col-span-6 h-full overflow-hidden">
                <AutoFitText maxFontSize={24} minFontSize={16} className="font-body font-bold text-white">
                  {soalAktif.pertanyaan}
                </AutoFitText>
              </div>
              <div className="col-span-6 h-full overflow-hidden rounded-xl border-2 border-[#3C62D4] bg-[#040B24] p-2">
                <AutoFitText
                  maxFontSize={20}
                  minFontSize={14}
                  lineHeight={1.25}
                  className="font-mono whitespace-pre-wrap text-[#57E893]"
                >
                  {soalAktif.kode}
                </AutoFitText>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-hidden">
              <AutoFitText maxFontSize={30} minFontSize={18} className="font-body font-bold text-white">
                {soalAktif.pertanyaan}
              </AutoFitText>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center text-lg font-bold text-[#DCE7FF]">
            Menyiapkan soal...
          </div>
        )}
      </div>

      {/* Bar Umpan Balik Arcade */}
      <div className="flex h-[32px] shrink-0 items-center justify-center overflow-hidden">
        {sedangPenentuan ? (
          <div className="font-display truncate rounded-xl border-2 border-[#071236] bg-[#FFD400] px-4 py-0.5 text-sm font-bold text-[#071236]">
            {penentuanStatus
              ? penentuanStatus
              : penentuanTerkunci
                ? 'Jawaban terkunci! Menunggu lawan...'
                : penentuanRondeLabel
                  ? `${penentuanRondeLabel}: Jawab cepat dan tepat!`
                  : 'RONDE PENENTUAN: Jawab cepat dan tepat!'}
          </div>
        ) : sedangUmpanBalik && umpan ? (
          <div
            className={`flex h-full w-full items-center justify-center gap-2 rounded-xl border-2 border-[#071236] px-3 font-bold text-white ${
              umpan.jenis === 'benar'
                ? 'bg-[#00C853]'
                : umpan.jenis === 'waktuHabis'
                  ? 'bg-[#FF9100] text-[#071236]'
                  : 'bg-[#FF1744]'
            }`}
          >
            <span className="font-display teks-outline-tebal shrink-0 text-lg text-white">
              {umpan.jenis === 'benar'
                ? umpan.bonusDipakai
                  ? 'BENAR! BONUS ×2!'
                  : 'BENAR!'
                : umpan.jenis === 'waktuHabis'
                  ? 'WAKTU HABIS!'
                  : 'SALAH!'}
            </span>
            {umpan.penjelasan && (
              <div className="h-full min-w-0 flex-1 overflow-hidden">
                <AutoFitText maxFontSize={15} minFontSize={11} className="font-body font-semibold text-white">
                  {umpan.penjelasan}
                </AutoFitText>
              </div>
            )}
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#FFD400]">
            {soalAktif?.bonus && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#071236] bg-[#FF9100] px-2 py-0.5 text-[#071236]">
                <Sparkles size={12} /> BONUS ×2
              </span>
            )}
            <span>Klik atau sentuh langsung 1 pilihan jawaban (final)</span>
          </span>
        )}
      </div>

      {/* 4 Tombol Pilihan Grid 2x2 (18-26px AutoFitText, min-h >= 84px) */}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2.5">
        {(soalAktif?.pilihan ?? []).map((opsi, idx) => {
          const huruf = String.fromCharCode(65 + idx);
          const adalahDipilih = sedangPenentuan
            ? penentuanPilihan === idx
            : Boolean(sedangUmpanBalik && umpan?.pilihanDipilih === idx);
          const adalahKunciBenar = Boolean(sedangUmpanBalik && umpan?.kunciBenar === idx);

          let varianTombol: 'merah' | 'biru' | 'hijau' | 'kuning' | 'navy' = adalahMerah
            ? 'merah'
            : 'biru';
          if (sedangUmpanBalik) {
            if (adalahKunciBenar) varianTombol = 'hijau';
            else if (adalahDipilih && !umpan?.jenis.includes('benar')) varianTombol = 'kuning';
            else varianTombol = 'navy';
          } else if (sedangPenentuan && adalahDipilih) {
            varianTombol = 'kuning';
          }

          return (
            <Button3D
              key={`${soalAktif?.id ?? 'kosong'}_${idx}`}
              variant={varianTombol}
              size="lg"
              fullWidth
              disabled={terkunci && !sedangUmpanBalik}
              onPointerDown={(e) => {
                e.preventDefault();
                tandaiInteraksiAudio();
                if (!terkunci) {
                  onJawab(idx);
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !terkunci) {
                  e.preventDefault();
                  tandaiInteraksiAudio();
                  onJawab(idx);
                }
              }}
              className="!h-full !min-h-[84px] !justify-start !border-[3px] !px-3 !py-1.5 !whitespace-normal"
            >
              <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#071236] bg-[#FFD400] text-lg font-bold text-[#071236]">
                {huruf}
              </span>
              <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden text-left">
                <AutoFitText maxFontSize={24} minFontSize={14} className="font-body font-bold text-white">
                  {opsi}
                </AutoFitText>
              </div>
            </Button3D>
          );
        })}
      </div>
    </section>
  );
};

const TINGKAT_VOLUME = [0.7, 1.0, 0.3, 0];

export const MainScreen: React.FC<MainScreenProps> = ({ onNavigasi }) => {
  const {
    daftarGame,
    gameAktif,
    sesiPembagian,
    sesiMode,
    mulaiSesiPembagian,
    siapkanLagaDariSesiMode,
    catatLagaSelesaiKeSesiMode,
    perbaruiPengaturanGameAktif,
    simpanHasilPertandinganKeRiwayat,
    tampilkanToast,
  } = useAppStore();
  const { isFullscreen, toggleFullscreen } = useStage();

  const [panelGuruTerbuka, setPanelGuruTerbuka] = useState(false);
  const [modalKeluarTerbuka, setModalKeluarTerbuka] = useState(false);
  const [volumeAktif, setVolumeAktif] = useState<number>(() => ambilVolumeAudio());
  const [comboKiri, setComboKiri] = useState(0);
  const [comboKanan, setComboKanan] = useState(0);
  const [ruteSetelahSelesai, setRuteSetelahSelesai] = useState<RuteHash>('/hasil');

  const inisialisasiState = (): MatchState => {
    const tersimpan = bacaSesiMatchSessionStorage();
    if (
      tersimpan &&
      gameAktif &&
      tersimpan.gameId === gameAktif.id &&
      tersimpan.fase !== 'selesai' &&
      daftarGame.some((g) => g.id === tersimpan.gameId)
    ) {
      return tersimpan;
    }
    if (!gameAktif) {
      const def = buatPengaturanDefault();
      const [defKiri, defKanan] = ambilPasanganNamaTimResmi(def);
      const kosong = buatMatchState({
        gameId: '',
        labelLaga: 'Belum Ada Game',
        namaTimKiri: defKiri,
        namaTimKanan: defKanan,
        rosterKiri: ['Pemain 1'],
        rosterKanan: ['Pemain 1'],
        dekKiriSiswa: [],
        dekKananSiswa: [],
        cadanganSiswa: [],
        pengaturan: def,
      });
      return { ...kosong, fase: 'jeda' };
    }
    const sesi =
      sesiPembagian && sesiPembagian.gameId === gameAktif.id
        ? sesiPembagian
        : buatSesiPembagianMurni(gameAktif);

    return buatMatchState({
      gameId: gameAktif.id,
      labelLaga: sesi.labelLaga,
      namaTimKiri: sesi.namaTimKiri,
      namaTimKanan: sesi.namaTimKanan,
      rosterKiri: sesi.urutanPemainKiri,
      rosterKanan: sesi.urutanPemainKanan,
      dekKiriSiswa: sesi.dekKiriSiswa,
      dekKananSiswa: sesi.dekKananSiswa,
      cadanganSiswa: sesi.cadanganSiswa,
      pengaturan: gameAktif.pengaturan,
    });
  };

  const [match, setMatch] = useState<MatchState>(() => inisialisasiState());
  const [urutanMulaiKey, setUrutanMulaiKey] = useState(0);
  const bankSoalRef = useRef(gameAktif?.soal ?? []);
  bankSoalRef.current = gameAktif?.soal ?? [];
  const efekRinganRef = useRef(match.pengaturan.efekRingan);
  efekRinganRef.current = match.pengaturan.efekRingan;

  const dispatch = useCallback((aksi: MatchAction) => {
    tandaiInteraksiAudio();
    setMatch((prev) => matchReducer(prev, aksi, bankSoalRef.current));
  }, []);

  // Simpan progres pertandingan ke sessionStorage
  useEffect(() => {
    if (!gameAktif) return;
    simpanSesiMatchSessionStorage(match);
  }, [gameAktif, match]);

  // Sinkronisasi musik latar dengan status jeda & pengaturan (tetap aktif & ducked saat countdown)
  useEffect(() => {
    if (!gameAktif) return;
    const sedangJedaAtauSelesai = match.fase === 'jeda' || match.fase === 'selesai';
    sinkronPengaturanAudio(match.pengaturan.suara, match.pengaturan.musik, sedangJedaAtauSelesai);
  }, [gameAktif, match.fase, match.pengaturan.musik, match.pengaturan.suara]);

  useEffect(() => {
    return () => {
      hentikanMusikLatar();
      hentikanUrutanMulai();
    };
  }, []);

  // Urutan bunyi pembuka (drum roll + pip-pip + beep 3-2-1 + peluit panjang TARIK), jeda/lanjut, penentuan & akhir
  const prevFaseRef = useRef<MatchState['fase'] | null>(null);
  const prevUmpanKiriRef = useRef<string | null>(null);
  const prevUmpanKananRef = useRef<string | null>(null);
  const prevDetikKiriRef = useRef<number>(Math.ceil(match.timKiri.sisaWaktuSoalMs / 1000));
  const prevDetikKananRef = useRef<number>(Math.ceil(match.timKanan.sisaWaktuSoalMs / 1000));

  useEffect(() => {
    if (match.fase !== 'countdown') {
      hentikanUrutanMulai();
      return;
    }
    const dariJeda = prevFaseRef.current === 'jeda';
    mulaiUrutanAudioMulai(efekRinganRef.current, dariJeda ? 0.14 : 0);
    return () => {
      hentikanUrutanMulai();
    };
  }, [match.fase, urutanMulaiKey]);

  useEffect(() => {
    const prev = prevFaseRef.current;
    if (prev !== null && prev !== match.fase) {
      if (match.fase === 'jeda') {
        mainkanKlikJeda();
      } else if (
        prev === 'jeda' &&
        (match.fase === 'countdown' || match.fase === 'bermain' || match.fase === 'penentuan')
      ) {
        mainkanPipLanjut();
      } else if (match.fase === 'penentuan') {
        mainkanPeluitPenentuan();
      } else if (match.fase === 'selesai') {
        mainkanPeluitAkhirSelesai(efekRinganRef.current);
      }
    }
    prevFaseRef.current = match.fase;
  }, [match.fase]);

  useEffect(() => {
    const kunciKiri =
      match.timKiri.faseTim === 'umpanBalik'
        ? `${match.timKiri.soalTerjawabCount}_${match.timKiri.umpanBalik?.jenis}`
        : null;
    if (kunciKiri && kunciKiri !== prevUmpanKiriRef.current) {
      if (match.timKiri.umpanBalik?.jenis === 'benar') {
        mainkanDing();
        setComboKiri((c) => c + 1);
      } else {
        mainkanBuzz();
        setComboKiri(0);
      }
    }
    prevUmpanKiriRef.current = kunciKiri;
  }, [match.timKiri.faseTim, match.timKiri.soalTerjawabCount, match.timKiri.umpanBalik]);

  useEffect(() => {
    const kunciKanan =
      match.timKanan.faseTim === 'umpanBalik'
        ? `${match.timKanan.soalTerjawabCount}_${match.timKanan.umpanBalik?.jenis}`
        : null;
    if (kunciKanan && kunciKanan !== prevUmpanKananRef.current) {
      if (match.timKanan.umpanBalik?.jenis === 'benar') {
        mainkanDing();
        setComboKanan((c) => c + 1);
      } else {
        mainkanBuzz();
        setComboKanan(0);
      }
    }
    prevUmpanKananRef.current = kunciKanan;
  }, [match.timKanan.faseTim, match.timKanan.soalTerjawabCount, match.timKanan.umpanBalik]);

  useEffect(() => {
    if (match.fase !== 'bermain') return;
    const dKiri = Math.ceil(match.timKiri.sisaWaktuSoalMs / 1000);
    const dKanan = Math.ceil(match.timKanan.sisaWaktuSoalMs / 1000);
    if (
      match.timKiri.faseTim === 'menjawab' &&
      dKiri !== prevDetikKiriRef.current &&
      dKiri >= 1 &&
      dKiri <= 3
    ) {
      mainkanTikTimer();
    }
    if (
      match.timKanan.faseTim === 'menjawab' &&
      dKanan !== prevDetikKananRef.current &&
      dKanan >= 1 &&
      dKanan <= 3
    ) {
      mainkanTikTimer();
    }
    prevDetikKiriRef.current = dKiri;
    prevDetikKananRef.current = dKanan;
  }, [
    match.fase,
    match.timKiri.faseTim,
    match.timKiri.sisaWaktuSoalMs,
    match.timKanan.faseTim,
    match.timKanan.sisaWaktuSoalMs,
  ]);

  // Satu loop waktu 100ms berbasis selisih waktu nyata
  const lastTickRef = useRef<number>(Date.now());
  useEffect(() => {
    if (match.fase !== 'countdown' && match.fase !== 'bermain' && match.fase !== 'penentuan') {
      return;
    }
    lastTickRef.current = Date.now();
    const intervalId = window.setInterval(() => {
      const sekarang = Date.now();
      const deltaMs = Math.min(300, Math.max(0, sekarang - lastTickRef.current));
      lastTickRef.current = sekarang;
      dispatch({ type: 'TICK', deltaMs, timestamp: sekarang });
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [dispatch, match.fase]);

  // Simpan hasil dan pindah ke Bagan Turnamen / Duel / Hasil saat selesai
  const sudahNavigasiHasilRef = useRef(false);
  const navigasiTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (navigasiTimeoutRef.current !== null) {
        window.clearTimeout(navigasiTimeoutRef.current);
        navigasiTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (match.fase !== 'selesai' || sudahNavigasiHasilRef.current) {
      return;
    }
    sudahNavigasiHasilRef.current = true;

    let ruteTujuan: RuteHash = '/hasil';
    const judulGameSimpan = gameAktif?.judul ?? 'Duel Otak';
    const mapelSimpan = gameAktif?.mapel ?? '';
    const sekolahSimpan = gameAktif?.namaSekolah ?? '';
    const soalSnap = ringkasSoalSnapshot(bankSoalRef.current);
    const jumlahPenarikSimpan = match.pengaturan.jumlahPenarik;

    if (
      sesiMode &&
      sesiMode.gameId === match.gameId &&
      (sesiMode.mode === '4tim' || sesiMode.mode === '1lawan1')
    ) {
      const sesiBaru = catatLagaSelesaiKeSesiMode(match);
      if (sesiBaru?.mode === '4tim' && sesiBaru.turnamen) {
        if (sesiBaru.turnamen.tahapSaatIni !== 'selesai') {
          ruteTujuan = '/turnamen';
        } else {
          const finalHasil = sesiBaru.turnamen.final.hasil;
          const t = sesiBaru.turnamen;
          const peringkat = ambilPeringkatTurnamen(t);
          const semuaRiwayat = sesiBaru.riwayatLaga.flatMap((l) => l.riwayat);
          const totalDurasi = Math.round(match.waktuBerjalanMs / 1000);
          simpanHasilPertandinganKeRiwayat(
            {
              gameId: match.gameId,
              judulGame: judulGameSimpan,
              mapel: mapelSimpan,
              namaSekolah: sekolahSimpan,
              mode: '4tim',
              labelLaga: 'Final Turnamen 4 Tim',
              namaTimKiri: match.timKiri.namaTim,
              namaTimKanan: match.timKanan.namaTim,
              posisiTaliAkhir: match.posisiTali,
              langkahKeGaris: match.langkahKeGaris,
              pemenang: finalHasil?.pemenangSisi ?? (match.pemenang ?? 'merah'),
              alasanAkhir: match.alasanAkhir,
              caraMenang: match.caraMenang ?? null,
              keteranganMenang: match.keteranganMenang ?? null,
              durasiDetik: totalDurasi,
              jumlahPenarik: jumlahPenarikSimpan,
              riwayat: semuaRiwayat,
              soalSnapshot: soalSnap,
              turnamenSnapshot: {
                juara1: peringkat.juara1,
                juara2: peringkat.juara2,
                juara3Bersama: peringkat.juara3Bersama,
                laga: [
                  { judul: 'Semifinal 1', slot: t.semifinal1 },
                  { judul: 'Semifinal 2', slot: t.semifinal2 },
                  { judul: 'Final Turnamen', slot: t.final },
                ]
                  .filter((x) => Boolean(x.slot.hasil))
                  .map((x) => ({
                    judul: x.judul,
                    namaTimKiri: x.slot.hasil!.namaTimKiri,
                    namaTimKanan: x.slot.hasil!.namaTimKanan,
                    skorMerah: x.slot.hasil!.skorMerah,
                    skorBiru: x.slot.hasil!.skorBiru,
                    namaPemenang: x.slot.hasil!.namaPemenang,
                    posisiTaliAkhir: x.slot.hasil!.posisiTaliAkhir,
                  })),
              },
            },
            { bukaDetail: true }
          );
          ruteTujuan = '/hasil';
        }
      } else if (sesiBaru?.mode === '1lawan1' && sesiBaru.duel) {
        if (!sesiBaru.duel.selesaiSemua) {
          ruteTujuan = '/duel';
        } else {
          const semuaRiwayat = sesiBaru.riwayatLaga.flatMap((l) => l.riwayat);
          const totalDurasi = Math.round(match.waktuBerjalanMs / 1000);
          const [namaDefKiri, namaDefKanan] = ambilPasanganNamaTimResmi(match.pengaturan);
          simpanHasilPertandinganKeRiwayat(
            {
              gameId: match.gameId,
              judulGame: judulGameSimpan,
              mapel: mapelSimpan,
              namaSekolah: sekolahSimpan,
              mode: '1lawan1',
              labelLaga: 'Rekap Duel 1 Lawan 1',
              namaTimKiri: namaDefKiri,
              namaTimKanan: namaDefKanan,
              posisiTaliAkhir: match.posisiTali,
              langkahKeGaris: match.langkahKeGaris,
              pemenang: match.pemenang ?? 'seri',
              alasanAkhir: match.alasanAkhir,
              caraMenang: match.caraMenang ?? null,
              keteranganMenang: match.keteranganMenang ?? null,
              durasiDetik: totalDurasi,
              jumlahPenarik: 3,
              riwayat: semuaRiwayat,
              soalSnapshot: soalSnap,
              duelSnapshot: sesiBaru.duel.papanKemenangan,
            },
            { bukaDetail: true }
          );
          ruteTujuan = '/hasil';
        }
      }
    } else {
      simpanHasilPertandinganKeRiwayat(
        {
          gameId: match.gameId,
          judulGame: judulGameSimpan,
          mapel: mapelSimpan,
          namaSekolah: sekolahSimpan,
          mode: '2tim',
          labelLaga: match.labelLaga,
          namaTimKiri: match.timKiri.namaTim,
          namaTimKanan: match.timKanan.namaTim,
          rosterKiri: match.timKiri.roster,
          rosterKanan: match.timKanan.roster,
          posisiTaliAkhir: match.posisiTali,
          langkahKeGaris: match.langkahKeGaris,
          pemenang: match.pemenang ?? 'seri',
          alasanAkhir: match.alasanAkhir,
          caraMenang: match.caraMenang ?? null,
          keteranganMenang: match.keteranganMenang ?? null,
          durasiDetik: Math.round(match.waktuBerjalanMs / 1000),
          jumlahPenarik: jumlahPenarikSimpan,
          riwayat: match.riwayat,
          soalSnapshot: soalSnap,
        },
        { bukaDetail: true }
      );
      ruteTujuan = '/hasil';
    }

    setRuteSetelahSelesai(ruteTujuan);
    if (navigasiTimeoutRef.current !== null) {
      window.clearTimeout(navigasiTimeoutRef.current);
    }
    navigasiTimeoutRef.current = window.setTimeout(() => {
      navigasiTimeoutRef.current = null;
      hapusSesiMatchSessionStorage();
      onNavigasi(ruteTujuan);
    }, 2200);
  }, [
    catatLagaSelesaiKeSesiMode,
    gameAktif?.judul,
    gameAktif?.mapel,
    gameAktif?.namaSekolah,
    match,
    onNavigasi,
    sesiMode,
    simpanHasilPertandinganKeRiwayat,
  ]);

  const handleResetPertandingan = () => {
    if (!gameAktif) return;
    tandaiInteraksiAudio();
    hentikanSemuaEfekTerjadwal();
    if (navigasiTimeoutRef.current !== null) {
      window.clearTimeout(navigasiTimeoutRef.current);
      navigasiTimeoutRef.current = null;
    }
    hapusSesiMatchSessionStorage();
    sudahNavigasiHasilRef.current = false;
    setComboKiri(0);
    setComboKanan(0);
    const sesiAktifMode =
      sesiMode &&
      sesiMode.gameId === gameAktif.id &&
      (sesiMode.mode === '4tim' || sesiMode.mode === '1lawan1')
        ? siapkanLagaDariSesiMode()
        : null;
    const sesiBaru = sesiAktifMode ?? mulaiSesiPembagian(gameAktif);
    if (!sesiBaru) return;
    setUrutanMulaiKey((k) => k + 1);
    setMatch(
      buatMatchState({
        gameId: gameAktif.id,
        labelLaga: sesiBaru.labelLaga,
        namaTimKiri: sesiBaru.namaTimKiri,
        namaTimKanan: sesiBaru.namaTimKanan,
        rosterKiri: sesiBaru.urutanPemainKiri,
        rosterKanan: sesiBaru.urutanPemainKanan,
        dekKiriSiswa: sesiBaru.dekKiriSiswa,
        dekKananSiswa: sesiBaru.dekKananSiswa,
        cadanganSiswa: sesiBaru.cadanganSiswa,
        pengaturan: gameAktif.pengaturan,
      })
    );
    tampilkanToast('Pertandingan direset dengan dek soal baru.', 'info');
  };

  const toggleSuara = () => {
    if (!gameAktif) return;
    tandaiInteraksiAudio();
    const suaraBaru = !match.pengaturan.suara;
    setMatch((prev) => ({
      ...prev,
      pengaturan: { ...prev.pengaturan, suara: suaraBaru },
    }));
    perbaruiPengaturanGameAktif({ ...gameAktif.pengaturan, suara: suaraBaru });
  };

  const toggleMusik = () => {
    if (!gameAktif) return;
    tandaiInteraksiAudio();
    const musikBaru = !match.pengaturan.musik;
    setMatch((prev) => ({
      ...prev,
      pengaturan: { ...prev.pengaturan, musik: musikBaru },
    }));
    perbaruiPengaturanGameAktif({ ...gameAktif.pengaturan, musik: musikBaru });
  };

  const putarVolume = () => {
    tandaiInteraksiAudio();
    const idxSaatIni = TINGKAT_VOLUME.findIndex((v) => Math.abs(v - volumeAktif) < 0.08);
    const berikut = TINGKAT_VOLUME[(idxSaatIni + 1) % TINGKAT_VOLUME.length];
    const tersimpan = aturVolumeAudio(berikut);
    setVolumeAktif(tersimpan);
  };

  if (!gameAktif) {
    return (
      <BelumAdaGameCard
        judul="Belum ada game untuk dimainkan"
        keterangan="Buat game baru terlebih dahulu, pilih game di Game Saya, atau masuk menggunakan kode 8 karakter."
        onNavigasi={onNavigasi}
        tampilkanBeranda
      />
    );
  }

  const batas = match.langkahKeGaris;
  const posisiVisual = Math.max(-batas, Math.min(batas, match.posisiTali));
  const infoCountdown = ambilInfoCountdown(match.countdownMs);

  const daftarBulatanPosisi = Array.from({ length: batas * 2 + 1 }, (_, i) => i - batas);

  const warnaBannerSelisih =
    match.posisiTali < 0
      ? 'border-[#FF6B86] bg-[#B80023]'
      : match.posisiTali > 0
        ? 'border-[#669BFF] bg-[#0A2FA8]'
        : 'border-[#FFE875] bg-[#173287]';

  return (
    <div
      onPointerDown={() => tandaiInteraksiAudio()}
      className={`relative flex h-[900px] w-[1600px] flex-col justify-between overflow-hidden bg-[#0B1B4D] px-4 py-2 ${
        match.pengaturan.modeRekam ? 'mode-rekam-aktif' : ''
      } ${match.pengaturan.efekRingan ? 'efek-ringan-aktif' : ''}`}
    >
      {/* 1. BAR HUD ARCADE (64px) */}
      <header className="flex h-[64px] shrink-0 items-center justify-between gap-2 rounded-2xl border-[3px] border-[#2A4CB8] bg-[#071236] px-3 shadow-[0_5px_0_#040B24]">
        {/* Lencana Skor Tim Merah (BENAR >= 40px, SALAH kecil) */}
        <div className="flex items-center gap-2 rounded-xl border-3 border-[#FF6B86] bg-[#7A0018] px-3 py-0.5 shadow-[0_4px_0_#4A000E]">
          <span className="font-display max-w-[140px] truncate text-base font-bold text-[#FFD400]">
            ▲ {match.timKiri.namaTim}
          </span>
          <span
            key={`skor_m_${match.timKiri.skorBenar}`}
            className="font-display tabular-angka anim-pop-skor teks-outline-tebal text-[40px] leading-none font-bold text-white"
          >
            {match.timKiri.skorBenar}
          </span>
          <span className="tabular-angka rounded-md bg-[#4A000E] px-1.5 py-0.5 text-xs font-bold text-[#FFD400]">
            S:{match.timKiri.skorSalah}
          </span>
        </div>

        {/* Banner Selisih & Waktu Total di Tengah */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-2.5 rounded-xl border-3 px-4 py-0.5 shadow-[0_4px_0_#040B24] ${warnaBannerSelisih}`}
          >
            <div className="text-left leading-tight">
              <div className="font-display text-[11px] font-bold text-[#FFD400]">
                {match.fase === 'penentuan' && match.penentuan
                  ? `RONDE PENENTUAN ${match.penentuan.rondeKe}/${match.penentuan.maksRonde}`
                  : match.sisaWaktuTotalMs !== null
                    ? 'SISA WAKTU'
                    : 'MODE SOAL'}
              </div>
              <div className="font-display tabular-angka teks-outline-tebal text-xl leading-none font-bold text-white">
                {match.fase === 'penentuan' && match.penentuan
                  ? match.penentuan.jenisSoal === 'cadangan'
                    ? 'Soal Cadangan'
                    : 'Soal Tukar'
                  : match.sisaWaktuTotalMs !== null
                    ? formatWaktuMMSS(match.sisaWaktuTotalMs)
                    : 'HABIS'}
              </div>
            </div>
            <div className="h-8 w-[2px] bg-white/25" />
            <div className="text-right leading-tight">
              <div className="font-display text-[11px] font-bold text-[#FFD400]">SELISIH TALI</div>
              <div className="font-display tabular-angka teks-outline-tebal text-xl leading-none font-bold text-white">
                {match.posisiTali === 0
                  ? 'IMBANG'
                  : match.posisiTali < 0
                    ? `▲ +${Math.abs(match.posisiTali)}`
                    : `● +${match.posisiTali}`}
              </div>
            </div>
          </div>

          {/* Lencana Skor Tim Biru (BENAR >= 40px, SALAH kecil) */}
          <div className="flex items-center gap-2 rounded-xl border-3 border-[#669BFF] bg-[#071F70] px-3 py-0.5 shadow-[0_4px_0_#041242]">
            <span className="font-display max-w-[140px] truncate text-base font-bold text-[#FFD400]">
              ● {match.timKanan.namaTim}
            </span>
            <span
              key={`skor_b_${match.timKanan.skorBenar}`}
              className="font-display tabular-angka anim-pop-skor teks-outline-tebal text-[40px] leading-none font-bold text-white"
            >
              {match.timKanan.skorBenar}
            </span>
            <span className="tabular-angka rounded-md bg-[#041242] px-1.5 py-0.5 text-xs font-bold text-[#FFD400]">
              S:{match.timKanan.skorSalah}
            </span>
          </div>
        </div>

        {/* Tombol Kontrol HUD (min >= 44px dengan label pendek) */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button3D
            variant={match.fase === 'jeda' ? 'hijau' : 'kuning'}
            size="sm"
            className="!min-h-[46px] !px-2.5 !text-xs"
            onClick={() => dispatch({ type: match.fase === 'jeda' ? 'LANJUT' : 'JEDA' })}
          >
            {match.fase === 'jeda' ? <Play size={16} fill="currentColor" /> : <Pause size={16} />}
            <span>{match.fase === 'jeda' ? 'Lanjut' : 'Jeda'}</span>
          </Button3D>

          <Button3D
            variant="ungu"
            size="sm"
            className="!min-h-[46px] !px-2.5 !text-xs"
            onClick={() => {
              if (
                match.fase === 'countdown' ||
                match.fase === 'bermain' ||
                match.fase === 'penentuan'
              ) {
                dispatch({ type: 'JEDA' });
              }
              setPanelGuruTerbuka(true);
            }}
          >
            <Shield size={16} />
            <span>Guru</span>
          </Button3D>

          <Button3D
            variant={match.pengaturan.suara ? 'hijau' : 'navy'}
            size="sm"
            className="!min-h-[46px] !px-2.5 !text-xs"
            onClick={toggleSuara}
            aria-label={match.pengaturan.suara ? 'Matikan efek suara' : 'Nyalakan efek suara'}
          >
            {match.pengaturan.suara ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>SFX</span>
          </Button3D>

          <Button3D
            variant={match.pengaturan.musik ? 'biru' : 'navy'}
            size="sm"
            className="!min-h-[46px] !px-2.5 !text-xs"
            onClick={toggleMusik}
            aria-label={match.pengaturan.musik ? 'Matikan musik latar' : 'Nyalakan musik latar'}
          >
            <Music size={16} />
            <span>Musik</span>
          </Button3D>

          <Button3D
            variant="navy"
            size="sm"
            className="!min-h-[46px] !px-2.5 !text-xs"
            onClick={putarVolume}
            aria-label="Atur volume suara"
          >
            <Volume1 size={16} />
            <span className="tabular-angka">{Math.round(volumeAktif * 100)}%</span>
          </Button3D>

          <Button3D
            variant="navy"
            size="sm"
            className="!min-h-[46px] !px-2.5"
            onClick={toggleFullscreen}
            aria-label="Layar penuh"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button3D>

          <Button3D
            variant="oranye"
            size="sm"
            className="!min-h-[46px] !px-2.5"
            onClick={handleResetPertandingan}
            aria-label="Reset pertandingan"
          >
            <RotateCcw size={16} />
          </Button3D>

          <Button3D
            variant="merah"
            size="sm"
            className="!min-h-[46px] !px-2.5 !text-xs"
            onClick={() => {
              if (match.riwayat.length > 0 && match.fase !== 'selesai') {
                if (
                  match.fase === 'countdown' ||
                  match.fase === 'bermain' ||
                  match.fase === 'penentuan'
                ) {
                  dispatch({ type: 'JEDA' });
                }
                setModalKeluarTerbuka(true);
                return;
              }
              hentikanSemuaEfekTerjadwal();
              onNavigasi('/');
            }}
          >
            <Home size={16} />
            <span>Menu</span>
          </Button3D>
        </div>
      </header>

      {/* 2. ARENA LAPANGAN SEKOLAH 3D + KARAKTER + TALI (270px) */}
      <div className="relative h-[270px] w-full shrink-0">
        <ArenaTarikTambang
          namaTimKiri={match.timKiri.namaTim}
          namaTimKanan={match.timKanan.namaTim}
          namaSekolah={gameAktif.namaSekolah}
          mapel={gameAktif.mapel}
          jumlahPenarik={
            match.pengaturan.mode === '1lawan1' ? 1 : match.pengaturan.jumlahPenarik
          }
          posisiTali={match.posisiTali}
          langkahKeGaris={match.langkahKeGaris}
          indeksGiliranKiri={match.timKiri.indeksGiliran}
          indeksGiliranKanan={match.timKanan.indeksGiliran}
          faseTimKiri={match.timKiri.faseTim}
          faseTimKanan={match.timKanan.faseTim}
          umpanKiri={match.timKiri.umpanBalik?.jenis ?? null}
          umpanKanan={match.timKanan.umpanBalik?.jenis ?? null}
          pemenang={match.pemenang}
          modeRekam={match.pengaturan.modeRekam}
          efekRingan={match.pengaturan.efekRingan}
        />

        {/* Overlay Countdown SIAP-SIAP -> 3 -> 2 -> 1 -> TARIK! */}
        {match.fase === 'countdown' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl bg-[#071236]/80">
            <div className="rounded-3xl border-4 border-[#FFD400] bg-[#173287] px-16 py-4 text-center shadow-[0_10px_0_#071236]">
              <p className="font-display text-base font-bold text-[#DCE7FF]">
                {infoCountdown.subteks}
              </p>
              <p
                key={infoCountdown.tahap}
                className={`font-display teks-outline-raksasa anim-countdown-mantul font-bold ${
                  infoCountdown.tahap === 'tarik'
                    ? 'text-7xl text-[#57E893]'
                    : infoCountdown.tahap === 'siap' || infoCountdown.tahap === 'peluitAwal'
                      ? 'text-6xl text-[#FFD400]'
                      : 'text-8xl text-[#FFD400]'
                }`}
              >
                {infoCountdown.teksUtama}
              </p>
            </div>
          </div>
        )}

        {/* Overlay Jeda */}
        {match.fase === 'jeda' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center gap-6 rounded-3xl bg-[#071236]/85">
            <span className="font-display teks-outline-raksasa text-4xl font-bold text-[#FFD400]">
              PERMAINAN DIJEDA
            </span>
            <Button3D variant="hijau" size="lg" onClick={() => dispatch({ type: 'LANJUT' })}>
              <Play size={22} fill="currentColor" />
              <span>Lanjutkan</span>
            </Button3D>
          </div>
        )}
      </div>

      {/* 3. BAR POSISI TALI DI BAWAH LAPANGAN (44px, tidak menimpa kaki penarik) */}
      <div className="flex h-[44px] shrink-0 items-center justify-between gap-4 rounded-2xl border-3 border-[#2A4CB8] bg-[#071236] px-6">
        <span className="font-display text-xs font-bold text-[#FF6B86]">
          ▲ BATAS {match.timKiri.namaTim} (-{batas})
        </span>
        <div className="flex items-center gap-2">
          {daftarBulatanPosisi.map((angka) => {
            const aktif = angka === posisiVisual;
            const adalahTengah = angka === 0;
            return (
              <div
                key={angka}
                className={`font-display tabular-angka flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  aktif
                    ? 'scale-115 border-white bg-[#FFD400] text-[#071236] shadow-md'
                    : adalahTengah
                      ? 'border-[#FFD400] bg-[#173287] text-[#FFD400]'
                      : angka < 0
                        ? 'border-[#FF1744] bg-[#7A0018] text-white'
                        : 'border-[#1E6BFF] bg-[#071F70] text-white'
                }`}
              >
                {angka > 0 ? `+${angka}` : angka}
              </div>
            );
          })}
        </div>
        <span className="font-display text-xs font-bold text-[#669BFF]">
          ● BATAS {match.timKanan.namaTim} (+{batas})
        </span>
      </div>

      {/* 4. DUA PANEL SOAL (480px) */}
      <div className="grid h-[480px] shrink-0 grid-cols-2 gap-4 overflow-hidden">
        <PanelSoalTim
          timState={match.timKiri}
          durasiSoal={match.pengaturan.durasiSoal}
          faseMatch={match.fase}
          comboBeruntun={comboKiri}
          penentuanSoal={match.penentuan?.soalKiri ?? match.penentuan?.soalAktif ?? null}
          penentuanWakil={match.penentuan?.wakilKiri ?? null}
          penentuanTerkunci={Boolean(match.penentuan?.jawabanKiri?.terkunci)}
          penentuanPilihan={match.penentuan?.jawabanKiri?.pilihan ?? null}
          penentuanSisaMs={match.penentuan?.sisaWaktuSoalMs ?? 0}
          penentuanRondeLabel={
            match.penentuan
              ? `Ronde ${match.penentuan.rondeKe}/${match.penentuan.maksRonde} · ${
                  match.penentuan.jenisSoal === 'cadangan' ? 'Soal Cadangan' : 'Soal Tukar'
                }`
              : null
          }
          penentuanStatus={match.penentuan?.statusHasil ?? null}
          modeRekam={match.pengaturan.modeRekam}
          efekRingan={match.pengaturan.efekRingan}
          onJawab={(idx) =>
            dispatch({
              type: 'JAWAB',
              tim: 'merah',
              indeksPilihan: idx,
              timestamp: Date.now(),
            })
          }
        />

        <PanelSoalTim
          timState={match.timKanan}
          durasiSoal={match.pengaturan.durasiSoal}
          faseMatch={match.fase}
          comboBeruntun={comboKanan}
          penentuanSoal={match.penentuan?.soalKanan ?? match.penentuan?.soalAktif ?? null}
          penentuanWakil={match.penentuan?.wakilKanan ?? null}
          penentuanTerkunci={Boolean(match.penentuan?.jawabanKanan?.terkunci)}
          penentuanPilihan={match.penentuan?.jawabanKanan?.pilihan ?? null}
          penentuanSisaMs={match.penentuan?.sisaWaktuSoalMs ?? 0}
          penentuanRondeLabel={
            match.penentuan
              ? `Ronde ${match.penentuan.rondeKe}/${match.penentuan.maksRonde} · ${
                  match.penentuan.jenisSoal === 'cadangan' ? 'Soal Cadangan' : 'Soal Tukar'
                }`
              : null
          }
          penentuanStatus={match.penentuan?.statusHasil ?? null}
          modeRekam={match.pengaturan.modeRekam}
          efekRingan={match.pengaturan.efekRingan}
          onJawab={(idx) =>
            dispatch({
              type: 'JAWAB',
              tim: 'biru',
              indeksPilihan: idx,
              timestamp: Date.now(),
            })
          }
        />
      </div>

      {/* Banner Selesai Cepat */}
      {match.fase === 'selesai' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#040B24]/85">
          <div className="rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-14 py-8 text-center shadow-[0_12px_0_#071236]">
            <p className="font-display text-lg font-bold text-[#57E893]">PERTANDINGAN SELESAI!</p>
            <h2 className="font-display teks-outline-raksasa my-2 text-5xl font-bold text-[#FFD400]">
              {match.pemenang === 'merah'
                ? `▲ ${match.timKiri.namaTim} MENANG!`
                : match.pemenang === 'biru'
                  ? `● ${match.timKanan.namaTim} MENANG!`
                  : 'SERI!'}
            </h2>
            {match.keteranganMenang && (
              <p className="font-display mb-5 text-lg font-bold text-white">
                {match.keteranganMenang}
              </p>
            )}
            <Button3D
              variant="hijau"
              size="lg"
              onClick={() => {
                if (navigasiTimeoutRef.current !== null) {
                  window.clearTimeout(navigasiTimeoutRef.current);
                  navigasiTimeoutRef.current = null;
                }
                hapusSesiMatchSessionStorage();
                onNavigasi(ruteSetelahSelesai);
              }}
            >
              {ruteSetelahSelesai === '/turnamen'
                ? 'Kembali ke Bagan Turnamen'
                : ruteSetelahSelesai === '/duel'
                  ? 'Lanjut ke Duel Berikutnya'
                  : 'Lihat Hasil Lengkap'}
            </Button3D>
          </div>
        </div>
      )}

      {/* Modal Panel Guru */}
      <PanelGuruMainModal
        terbuka={panelGuruTerbuka}
        match={match}
        bankSoal={gameAktif.soal}
        onTutup={() => setPanelGuruTerbuka(false)}
        onDispatch={dispatch}
        onResetPertandingan={handleResetPertandingan}
      />

      {/* Modal Keluar saat Pertandingan Sudah Berjalan */}
      <Modal
        terbuka={modalKeluarTerbuka}
        judul="Pertandingan Masih Berlangsung"
        onTutup={() => setModalKeluarTerbuka(false)}
        lebarMaks="md"
        footer={
          <>
            <Button3D variant="navy" size="md" onClick={() => setModalKeluarTerbuka(false)}>
              Lanjutkan Main
            </Button3D>
            <Button3D
              variant="merah"
              size="md"
              onClick={() => {
                setModalKeluarTerbuka(false);
                hentikanSemuaEfekTerjadwal();
                onNavigasi('/');
              }}
            >
              Keluar Tanpa Simpan
            </Button3D>
            <Button3D
              variant="hijau"
              size="md"
              onClick={() => {
                setModalKeluarTerbuka(false);
                sudahNavigasiHasilRef.current = true;
                hentikanSemuaEfekTerjadwal();
                const pemenang: TimSisi | 'seri' =
                  match.posisiTali < 0 ? 'merah' : match.posisiTali > 0 ? 'biru' : 'seri';
                simpanHasilPertandinganKeRiwayat(
                  {
                    gameId: match.gameId,
                    judulGame: gameAktif.judul,
                    mapel: gameAktif.mapel,
                    namaSekolah: gameAktif.namaSekolah,
                    mode: match.pengaturan.mode,
                    labelLaga: `${match.labelLaga} (Dihentikan Guru)`,
                    namaTimKiri: match.timKiri.namaTim,
                    namaTimKanan: match.timKanan.namaTim,
                    rosterKiri: match.timKiri.roster,
                    rosterKanan: match.timKanan.roster,
                    posisiTaliAkhir: match.posisiTali,
                    langkahKeGaris: match.langkahKeGaris,
                    pemenang,
                    alasanAkhir: pemenang === 'seri' ? 'seri' : match.pengaturan.akhirPermainan,
                    caraMenang: pemenang === 'seri' ? 'seri' : 'skor',
                    keteranganMenang: 'Pertandingan dihentikan guru & disimpan ke Riwayat Hasil',
                    durasiDetik: Math.round(match.waktuBerjalanMs / 1000),
                    jumlahPenarik: match.pengaturan.jumlahPenarik,
                    riwayat: match.riwayat,
                    soalSnapshot: ringkasSoalSnapshot(bankSoalRef.current),
                  },
                  { bukaDetail: true }
                );
                hapusSesiMatchSessionStorage();
                onNavigasi('/hasil');
              }}
            >
              Akhiri &amp; Simpan Hasil
            </Button3D>
          </>
        }
      >
        <p className="text-base font-bold text-white">
          Sudah ada <span className="text-[#FFD400]">{match.riwayat.length} catatan tarikan</span> pada pertandingan ini.
        </p>
        <p className="mt-2 text-sm font-semibold text-[#DCE7FF]">
          Anda dapat mengakhiri laga sekarang dan menyimpan skor otomatis ke <strong>Riwayat Hasil</strong>, atau keluar tanpa menyimpan.
        </p>
      </Modal>
    </div>
  );
};

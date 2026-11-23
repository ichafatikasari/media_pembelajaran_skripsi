import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  FolderPlus,
  Home,
  KeyRound,
  Play,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../app/store';
import { AutoFitText } from '../components/AutoFitText';
import { Button3D } from '../components/Button3D';
import { Game, RuteHash } from '../data/types';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import { hapusSesiModeSessionStorage } from '../engine/session';
import {
  ambilGameOnlineDariKode,
  ekstrakKodeOnlineDariHash,
  HasilBukaOnline,
  RingkasanGameOnline,
  simpanKodeOnlineUntukGame,
} from '../services/gameOnlineService';
import { tandaiInteraksiAudio } from '../utils/audio';
import { catatRiwayatDibuka } from '../utils/riwayatDibuka';

interface BukaOnlineScreenProps {
  hashMentah: string;
  onNavigasi: (rute: RuteHash) => void;
}

export const BukaOnlineScreen: React.FC<BukaOnlineScreenProps> = ({
  hashMentah,
  onNavigasi,
}) => {
  const {
    daftarGame,
    imporGameDariPaket,
    mulaiSesiPembagian,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    resetSesiMode,
  } = useAppStore();

  const kode = ekstrakKodeOnlineDariHash(hashMentah);
  const [sedangMemuat, setSedangMemuat] = useState<boolean>(true);
  const [hasil, setHasil] = useState<HasilBukaOnline | null>(null);
  const [konfirmasiTimpa, setKonfirmasiTimpa] = useState<boolean>(false);

  const muatGame = useCallback(async () => {
    setSedangMemuat(true);
    setKonfirmasiTimpa(false);
    try {
      const res = await ambilGameOnlineDariKode(kode);
      setHasil(res);
      if (res.ok) {
        catatRiwayatDibuka({
          judul: res.info.judul,
          kode: res.info.kode,
          mapel: res.info.mapel,
          jumlahSoal: res.info.jumlahSoal,
        });
      }
    } finally {
      setSedangMemuat(false);
    }
  }, [kode]);

  useEffect(() => {
    void muatGame();
  }, [muatGame]);

  if (sedangMemuat || !hasil) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] px-10 py-8">
        <div className="kartu-3d flex max-w-[600px] flex-col items-center gap-4 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            <Cloud size={34} strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#FFD400]">
            Memuat Game Online...
          </h1>
          <p className="text-base font-bold text-[#DCE7FF]">
            Mengambil paket soal untuk kode{' '}
            <span className="font-mono text-[#57E893]">{kode || '-'}</span> tanpa perlu login.
          </p>
        </div>
      </div>
    );
  }

  if (!hasil.ok) {
    const adalahOffline = hasil.alasan === 'offline';
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] px-10 py-8">
        <div className="kartu-3d flex max-w-[700px] flex-col items-center gap-5 rounded-3xl border-4 border-[#FF6B86] bg-[#450B1C] p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            {adalahOffline ? (
              <WifiOff size={36} strokeWidth={2.5} />
            ) : (
              <AlertTriangle size={36} strokeWidth={2.5} />
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-[#FFD400]">
            {hasil.alasan === 'kedaluwarsa'
              ? 'Game Online Kedaluwarsa'
              : hasil.alasan === 'kuota'
                ? 'Layanan Online Sedang Penuh'
                : adalahOffline
                  ? 'Koneksi Online Tidak Tersedia'
                  : 'Game Online Tidak Dapat Dibuka'}
          </h1>
          <p className="text-bacaan text-lg font-bold text-white">{hasil.pesanError}</p>
          <p className="text-sm font-semibold text-[#FFE8B3]">
            Alternatif offline: minta guru membagikan file Paket (.json) atau Link Data (#/impor/...) agar tetap bisa bermain tanpa internet.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button3D variant="biru" size="lg" onClick={() => void muatGame()}>
              <RefreshCw size={20} />
              <span>Coba Muat Ulang</span>
            </Button3D>
            <Button3D variant="ungu" size="lg" onClick={() => onNavigasi('/kode')}>
              <KeyRound size={20} />
              <span>Masukkan Kode Lain</span>
            </Button3D>
            <Button3D variant="kuning" size="lg" onClick={() => onNavigasi('/')}>
              <Home size={20} />
              <span>Kembali ke Beranda</span>
            </Button3D>
            <Button3D variant="navy" size="lg" onClick={() => onNavigasi('/game-saya')}>
              <span>Buka Game Saya</span>
            </Button3D>
          </div>
        </div>
      </div>
    );
  }

  const game: Game = hasil.game;
  const info: RingkasanGameOnline = hasil.info;
  const duplikat = daftarGame.find(
    (g) => g.judul.trim().toLowerCase() === game.judul.trim().toLowerCase()
  );

  const jalankanMainLangsung = () => {
    tandaiInteraksiAudio();
    hapusSesiMatchSessionStorage();
    hapusSesiModeSessionStorage();
    resetSesiMode();

    const gameTersimpan = imporGameDariPaket(game, 'simpan_baru');
    simpanKodeOnlineUntukGame(gameTersimpan.id, info.kode);
    catatRiwayatDibuka({
      judul: gameTersimpan.judul,
      kode: info.kode,
      mapel: gameTersimpan.mapel,
      jumlahSoal: gameTersimpan.soal.length,
      lokalGameId: gameTersimpan.id,
    });
    if (gameTersimpan.pengaturan.mode === '4tim') {
      mulaiSesiTurnamenBaru(gameTersimpan);
      onNavigasi('/turnamen');
      return;
    }
    if (gameTersimpan.pengaturan.mode === '1lawan1') {
      mulaiSesiDuelBaru(gameTersimpan);
      onNavigasi('/duel');
      return;
    }
    mulaiSesiPembagian(gameTersimpan);
    onNavigasi('/main');
  };

  const handleSimpanKeGameSaya = (strategi: 'simpan_baru' | 'timpa') => {
    tandaiInteraksiAudio();
    const gameTersimpan = imporGameDariPaket(game, strategi, duplikat?.id);
    simpanKodeOnlineUntukGame(gameTersimpan.id, info.kode);
    catatRiwayatDibuka({
      judul: gameTersimpan.judul,
      kode: info.kode,
      mapel: gameTersimpan.mapel,
      jumlahSoal: gameTersimpan.soal.length,
      lokalGameId: gameTersimpan.id,
    });
    onNavigasi('/game-saya');
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] px-10 py-6">
      <div className="kartu-3d flex w-full max-w-[920px] flex-col gap-5 rounded-3xl border-4 border-[#00C853] bg-[#12276B] p-7">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#2A4CB8] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#00C853] text-white">
              <CheckCircle2 size={28} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xs font-bold text-[#57E893]">
                  GAME ONLINE SIAP DIMAINKAN
                </span>
                <span className="rounded bg-[#071236] px-2 py-0.5 font-mono text-xs font-bold text-[#FFD400]">
                  KODE: {info.kode}
                </span>
              </div>
              <div className="h-[42px] max-w-[680px]">
                <AutoFitText
                  maxFontSize={30}
                  minFontSize={18}
                  className="font-display teks-outline-tebal font-bold text-[#FFD400]"
                >
                  {info.judul}
                </AutoFitText>
              </div>
            </div>
          </div>

          <Button3D variant="navy" size="sm" onClick={() => onNavigasi('/')}>
            <Home size={18} />
            <span>Beranda</span>
          </Button3D>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
            <div className="text-xs font-bold text-[#FFD400]">MATA PELAJARAN</div>
            <div className="mt-1 truncate font-display text-lg font-bold text-white">
              {info.mapel}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
            <div className="text-xs font-bold text-[#FFD400]">JUMLAH SOAL</div>
            <div className="tabular-angka mt-1 font-display text-lg font-bold text-[#57E893]">
              {info.jumlahSoal} Soal
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
            <div className="text-xs font-bold text-[#FFD400]">MODE BAWAAN</div>
            <div className="mt-1 font-display text-lg font-bold uppercase text-white">
              {game.pengaturan.mode}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
            <div className="text-xs font-bold text-[#FFD400]">DURASI SOAL</div>
            <div className="tabular-angka mt-1 font-display text-lg font-bold text-white">
              {game.pengaturan.durasiSoal} Detik
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border-2 border-[#FF9100] bg-[#4D2400] px-4 py-3 text-sm font-bold text-[#FFE8B3]">
          <ShieldAlert size={20} className="mt-0.5 shrink-0 text-[#FFD400]" />
          <span>
            Game ini dimuat dari link pendek online tanpa perlu login. Setelah disimpan atau dimainkan, game tetap tersimpan lokal di browser ini dan dapat dimainkan offline.
            {game.pengaturan.pinGuru ? ' Game ini dilindungi PIN Guru 4 angka untuk menu edit & kunci.' : ''}
          </span>
        </div>

        {duplikat && (
          <div className="rounded-2xl border-2 border-[#FFD400] bg-[#173287] px-4 py-3 text-sm font-bold text-white">
            Catatan: Di Game Saya sudah ada game berjudul &quot;{duplikat.judul}&quot;. Klik &quot;SIMPAN KE GAME SAYA&quot; akan membuat salinan baru agar game lama tidak tertimpa tanpa konfirmasi.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button3D variant="hijau" size="xl" onClick={jalankanMainLangsung}>
            <Play size={24} fill="currentColor" />
            <span>MAIN</span>
          </Button3D>

          <div className="flex flex-wrap items-center gap-3">
            <Button3D
              variant="biru"
              size="lg"
              onClick={() => handleSimpanKeGameSaya('simpan_baru')}
            >
              <FolderPlus size={20} />
              <span>SIMPAN KE GAME SAYA</span>
            </Button3D>

            {duplikat && !konfirmasiTimpa && (
              <Button3D variant="oranye" size="lg" onClick={() => setKonfirmasiTimpa(true)}>
                <span>Timpa Game Lama?</span>
              </Button3D>
            )}

            {duplikat && konfirmasiTimpa && (
              <Button3D
                variant="merah"
                size="lg"
                onClick={() => handleSimpanKeGameSaya('timpa')}
              >
                <span>Konfirmasi Timpa</span>
              </Button3D>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

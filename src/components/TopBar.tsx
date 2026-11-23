import React from 'react';
import {
  BookOpen,
  FolderKanban,
  Home,
  Maximize2,
  Minimize2,
  Play,
  PlusSquare,
  Settings,
  Trophy,
} from 'lucide-react';
import { useAppStore } from '../app/store';
import { RuteHash } from '../data/types';
import { bacaSesiMatchSessionStorage } from '../engine/match';
import { APP_SHORT_NAME } from '../utils/constants';
import { Button3D } from './Button3D';
import { LencanaModeOffline } from './PwaUi';
import { useStage } from './Stage';

interface TopBarProps {
  ruteAktif: RuteHash;
  onNavigasi: (rute: RuteHash) => void;
}

const MENU_NAVIGASI: { rute: RuteHash; label: string; ikon: React.ReactNode }[] = [
  { rute: '/', label: 'Beranda', ikon: <Home size={20} /> },
  { rute: '/game-saya', label: 'Game Saya', ikon: <FolderKanban size={20} /> },
  { rute: '/buat-game', label: 'Buat Game', ikon: <PlusSquare size={20} /> },
  { rute: '/pengaturan', label: 'Pengaturan', ikon: <Settings size={20} /> },
  { rute: '/hasil', label: 'Hasil', ikon: <Trophy size={20} /> },
  { rute: '/panduan', label: 'Panduan', ikon: <BookOpen size={20} /> },
];

export const TopBar: React.FC<TopBarProps> = ({ ruteAktif, onNavigasi }) => {
  const { isFullscreen, toggleFullscreen } = useStage();
  const {
    daftarGame,
    gameAktif,
    sesiMode,
    bukaWizardBuatGame,
    bukaDaftarRiwayatHasil,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    tampilkanToast,
  } = useAppStore();

  const handleKlikMainTopBar = () => {
    const matchTersimpan = bacaSesiMatchSessionStorage();
    if (
      matchTersimpan &&
      matchTersimpan.fase !== 'selesai' &&
      daftarGame.some((g) => g.id === matchTersimpan.gameId)
    ) {
      onNavigasi('/main');
      return;
    }
    if (!gameAktif) {
      tampilkanToast(
        daftarGame.length === 0
          ? 'Belum ada game. Buat game baru atau masuk dengan kode.'
          : 'Belum ada game aktif dipilih. Pilih game di Game Saya.',
        'info'
      );
      onNavigasi('/game-saya');
      return;
    }
    if (gameAktif.pengaturan.mode === '4tim') {
      if (!sesiMode || sesiMode.mode !== '4tim' || sesiMode.gameId !== gameAktif.id) {
        mulaiSesiTurnamenBaru(gameAktif);
      }
      onNavigasi('/turnamen');
      return;
    }
    if (gameAktif.pengaturan.mode === '1lawan1') {
      if (!sesiMode || sesiMode.mode !== '1lawan1' || sesiMode.gameId !== gameAktif.id) {
        mulaiSesiDuelBaru(gameAktif);
      }
      onNavigasi('/duel');
      return;
    }
    onNavigasi('/main');
  };

  return (
    <header className="flex h-[84px] w-full shrink-0 items-center justify-between gap-6 border-b-4 border-[#223F9C] bg-[#071236] px-7">
      {/* Zona 1: Nama Aplikasi */}
      <button
        type="button"
        onClick={() => onNavigasi('/')}
        className="flex min-h-[48px] shrink-0 cursor-pointer items-center gap-3 rounded-xl px-2 text-left focus-visible:outline-4 focus-visible:outline-[#FFD400]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#FFE875] bg-[#FFD400] font-display text-2xl font-bold text-[#0B1B4D] shadow-[0_4px_0_#C79A00]">
          DO
        </span>
        <span className="font-display text-2xl font-bold tracking-normal whitespace-nowrap text-[#FFD400]">
          {APP_SHORT_NAME}
        </span>
      </button>

      {/* Zona 2: Navigasi Layar */}
      <nav aria-label="Navigasi utama" className="flex items-center gap-2">
        {MENU_NAVIGASI.map((item) => {
          const aktif = ruteAktif === item.rute;
          return (
            <button
              key={item.rute}
              type="button"
              onClick={() => {
                if (item.rute === '/buat-game') {
                  bukaWizardBuatGame('baru', null);
                } else if (item.rute === '/hasil') {
                  bukaDaftarRiwayatHasil();
                }
                onNavigasi(item.rute);
              }}
              className={`font-display flex min-h-[48px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-bold whitespace-nowrap transition-colors focus-visible:outline-4 focus-visible:outline-[#FFD400] ${
                aktif
                  ? 'border-[#FFE875] bg-[#1E6BFF] text-white shadow-[0_4px_0_#0A2FA8]'
                  : 'border-transparent bg-[#12276B] text-[#DCE7FF] hover:border-[#3C62D4] hover:bg-[#173287] hover:text-white'
              }`}
            >
              {item.ikon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zona 3: Status Offline, Aksi Utama & Layar Penuh */}
      <div className="flex shrink-0 items-center gap-2.5">
        <LencanaModeOffline />
        <Button3D
          variant="hijau"
          size="sm"
          onClick={handleKlikMainTopBar}
          aria-label="Buka layar Main"
        >
          <Play size={20} fill="currentColor" />
          <span>Main</span>
        </Button3D>
        <Button3D
          variant="navy"
          size="sm"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Keluar layar penuh' : 'Masuk layar penuh'}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          <span>{isFullscreen ? 'Normal' : 'Layar Penuh'}</span>
        </Button3D>
      </div>
    </header>
  );
};

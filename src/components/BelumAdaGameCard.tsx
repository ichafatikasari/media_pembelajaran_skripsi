import React from 'react';
import { FolderKanban, FolderOpen, Home, KeyRound, PlusSquare } from 'lucide-react';
import { useAppStore } from '../app/store';
import { RuteHash } from '../data/types';
import { Button3D } from './Button3D';

interface BelumAdaGameCardProps {
  judul?: string;
  keterangan?: string;
  onNavigasi: (rute: RuteHash) => void;
  tampilkanBeranda?: boolean;
}

export const BelumAdaGameCard: React.FC<BelumAdaGameCardProps> = ({
  judul = 'Belum ada game aktif',
  keterangan = 'Buat game kuis baru, pilih game di Game Saya, atau masukkan kode 8 karakter untuk langsung bermain.',
  onNavigasi,
  tampilkanBeranda = false,
}) => {
  const { daftarGame, bukaWizardBuatGame } = useAppStore();

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] px-8 py-6">
      <div className="kartu-3d flex max-w-[680px] flex-col items-center gap-5 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] px-10 py-10 text-center shadow-[0_10px_0_#071236]">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-[#071236] bg-[#FFD400] text-[#071236] shadow-[0_6px_0_#C79A00]">
          <FolderOpen size={40} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-display teks-outline-tebal text-3xl font-bold text-white">
            {judul}
          </h1>
          <p className="text-bacaan mt-2 text-base font-bold text-[#DCE7FF]">{keterangan}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button3D
            variant="hijau"
            size="lg"
            onClick={() => {
              bukaWizardBuatGame('baru', null);
              onNavigasi('/buat-game');
            }}
          >
            <PlusSquare size={22} />
            <span>+ Buat Game Baru</span>
          </Button3D>
          <Button3D variant="ungu" size="lg" onClick={() => onNavigasi('/kode')}>
            <KeyRound size={22} />
            <span>Masuk dengan Kode</span>
          </Button3D>
          {daftarGame.length > 0 && (
            <Button3D variant="biru" size="lg" onClick={() => onNavigasi('/game-saya')}>
              <FolderKanban size={22} />
              <span>Pilih di Game Saya</span>
            </Button3D>
          )}
          {tampilkanBeranda && (
            <Button3D variant="navy" size="lg" onClick={() => onNavigasi('/')}>
              <Home size={22} />
              <span>Beranda</span>
            </Button3D>
          )}
        </div>
      </div>
    </div>
  );
};

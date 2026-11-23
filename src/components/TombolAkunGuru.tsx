import React, { useState } from 'react';
import { Cloud, LogIn, LogOut, WifiOff } from 'lucide-react';
import { useAuthGuru } from '../app/AuthContext';
import { RuteHash } from '../data/types';
import { Button3D } from './Button3D';

interface TombolAkunGuruProps {
  onBukaGameOnlineSaya?: () => void;
  onNavigasi?: (rute: RuteHash) => void;
  kompak?: boolean;
}

export const TombolAkunGuru: React.FC<TombolAkunGuruProps> = ({
  onBukaGameOnlineSaya,
  onNavigasi,
  kompak = false,
}) => {
  const {
    profilGuru,
    sedangMemuatAuth,
    sedangProsesLogin,
    layananOnlineSiap,
    masukGuru,
    keluarGuru,
  } = useAuthGuru();
  const [gagalFoto, setGagalFoto] = useState(false);

  const bukaHalamanOnline = () => {
    if (onBukaGameOnlineSaya) {
      onBukaGameOnlineSaya();
    } else if (onNavigasi) {
      onNavigasi('/online');
    }
  };

  if (!layananOnlineSiap) {
    return (
      <div
        title="Fitur online belum tersedia, gunakan paket berkas"
        className="flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-3.5 py-1.5 text-xs font-bold text-[#FFE8B3]"
      >
        <WifiOff size={16} className="shrink-0 text-[#FF9100]" />
        <span>Mode Offline (Pakai Paket .json)</span>
      </div>
    );
  }

  if (sedangMemuatAuth) {
    return (
      <div className="flex min-h-[48px] items-center rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-1.5 text-xs font-bold text-[#DCE7FF]">
        Memeriksa akun guru...
      </div>
    );
  }

  if (!profilGuru) {
    return (
      <Button3D
        variant="biru"
        size={kompak ? 'sm' : 'md'}
        disabled={sedangProsesLogin}
        onClick={() => void masukGuru()}
      >
        <LogIn size={18} />
        <span>{sedangProsesLogin ? 'Membuka Google...' : 'Masuk dengan Google'}</span>
      </Button3D>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-[#00C853] bg-[#071236] px-3 py-1.5">
      {profilGuru.fotoUrl && !gagalFoto ? (
        <img
          src={profilGuru.fotoUrl}
          alt={profilGuru.nama}
          referrerPolicy="no-referrer"
          onError={() => setGagalFoto(true)}
          className="h-8 w-8 rounded-full border-2 border-[#FFD400] object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#FFD400] bg-[#1E6BFF] font-display text-sm font-bold text-white">
          {profilGuru.nama.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="max-w-[160px] pr-1">
        <div className="text-[10px] font-bold uppercase text-[#57E893]">Guru Terhubung</div>
        <div className="truncate font-display text-sm font-bold text-white">
          {profilGuru.nama}
        </div>
      </div>

      {(onBukaGameOnlineSaya || onNavigasi) && (
        <Button3D variant="ungu" size="sm" onClick={bukaHalamanOnline}>
          <Cloud size={16} />
          <span>Game Online Saya</span>
        </Button3D>
      )}

      <Button3D
        variant="navy"
        size="sm"
        onClick={() => void keluarGuru()}
        aria-label="Keluar dari akun Google"
      >
        <LogOut size={16} />
        <span>Keluar</span>
      </Button3D>
    </div>
  );
};

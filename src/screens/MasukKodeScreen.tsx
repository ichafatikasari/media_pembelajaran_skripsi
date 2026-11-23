import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
  Delete,
  Home,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { pergiKeKodeOnline } from '../app/router';
import { useAppStore } from '../app/store';
import { Button3D } from '../components/Button3D';
import { RuteHash } from '../data/types';
import {
  PANJANG_KODE_ONLINE,
  prosesInputKodeKetik,
  validasiFormatKodeOnline,
} from '../services/gameOnlineService';
import { tandaiInteraksiAudio } from '../utils/audio';

interface MasukKodeScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

const BARIS_ANGKA = ['2', '3', '4', '5', '6', '7', '8', '9'];
// A-Z tanpa I dan O (24 huruf) dibagi menjadi 3 baris simetris @8 tombol
const BARIS_HURUF_1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const BARIS_HURUF_2 = ['J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R'];
const BARIS_HURUF_3 = ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export const MasukKodeScreen: React.FC<MasukKodeScreenProps> = ({ onNavigasi }) => {
  const { tampilkanToast } = useAppStore();
  const [kode, setKode] = useState<string>('');
  const [pesanPeringatan, setPesanPeringatan] = useState<string>('');
  const [teksTempel, setTeksTempel] = useState<string>('');
  const inputTempelRef = useRef<HTMLInputElement | null>(null);

  const terapkanInputTeks = useCallback(
    (mentah: string, modeGantiPenuh: boolean) => {
      const hasil = prosesInputKodeKetik(mentah);
      if (hasil.adaKarakterTerlarang && hasil.pesanPeringatan) {
        setPesanPeringatan(hasil.pesanPeringatan);
      } else {
        setPesanPeringatan('');
      }

      if (hasil.dariLinkPenuh || modeGantiPenuh) {
        if (hasil.kodeBersih) {
          setKode(hasil.kodeBersih);
          if (hasil.dariLinkPenuh) {
            tampilkanToast(`Kode ${hasil.kodeBersih} diambil dari link game.`, 'info');
          }
        }
        return;
      }

      if (hasil.kodeBersih) {
        setKode((prev) => (prev + hasil.kodeBersih).slice(0, PANJANG_KODE_ONLINE));
      }
    },
    [tampilkanToast]
  );

  const handleHapusSatu = useCallback(() => {
    tandaiInteraksiAudio();
    setPesanPeringatan('');
    setKode((prev) => prev.slice(0, -1));
  }, []);

  const handleBersihkan = useCallback(() => {
    tandaiInteraksiAudio();
    setPesanPeringatan('');
    setKode('');
    setTeksTempel('');
  }, []);

  const handleMasuk = useCallback(() => {
    tandaiInteraksiAudio();
    if (!validasiFormatKodeOnline(kode)) {
      setPesanPeringatan('Masukkan lengkap 8 huruf/angka kode game (tanpa I, O, 0, 1).');
      return;
    }
    pergiKeKodeOnline(kode);
  }, [kode]);

  // Dukungan keyboard fisik + Ctrl+V / paste di mana saja pada layar ini
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputTempelRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleMasuk();
        }
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleHapusSatu();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleMasuk();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onNavigasi('/');
        return;
      }

      if (e.key.length === 1) {
        if (e.key === ' ' || e.key === '-') {
          e.preventDefault();
          return;
        }
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          e.preventDefault();
          terapkanInputTeks(e.key, false);
        }
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (document.activeElement === inputTempelRef.current) {
        return;
      }
      const teks = e.clipboardData?.getData('text') ?? '';
      if (teks) {
        e.preventDefault();
        terapkanInputTeks(teks, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [handleHapusSatu, handleMasuk, onNavigasi, terapkanInputTeks]);

  const handleTempelDariTombol = async () => {
    tandaiInteraksiAudio();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const teks = await navigator.clipboard.readText();
        if (teks.trim()) {
          terapkanInputTeks(teks, true);
          return;
        }
      }
    } catch {
      // Browser membatasi izin baca clipboard -> arahkan fokus ke kotak tempel
    }
    inputTempelRef.current?.focus();
    tampilkanToast('Tempel kode atau link game ke kotak tempel (Ctrl+V).', 'info');
  };

  const siapMasuk = validasiFormatKodeOnline(kode);

  const renderTombolKey = (karakter: string, tipe: 'angka' | 'huruf') => (
    <button
      key={karakter}
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        tandaiInteraksiAudio();
        terapkanInputTeks(karakter, false);
      }}
      className={`font-mono flex min-h-[68px] cursor-pointer items-center justify-center rounded-2xl border-3 text-2xl font-black transition-transform select-none active:translate-y-1 ${
        tipe === 'angka'
          ? 'border-[#FFE875] bg-[#FFD400] text-[#071236] shadow-[0_5px_0_#C79A00] hover:bg-[#FFE047]'
          : 'border-[#5F8BFF] bg-[#173287] text-white shadow-[0_5px_0_#071236] hover:bg-[#1E6BFF]'
      }`}
    >
      {karakter}
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col justify-between gap-3.5 bg-[#0B1B4D] px-8 py-4">
      {/* Header Atas */}
      <div className="kartu-3d flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            <KeyRound size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display teks-outline-tebal text-2xl font-bold text-[#FFD400]">
              MASUK DENGAN KODE GAME (TANPA LOGIN)
            </h1>
            <p className="text-sm font-bold text-[#DCE7FF]">
              Ketuk kode 8 huruf/angka pada layar sentuh, ketik dari keyboard, atau tempel link game dari WhatsApp/email.
            </p>
          </div>
        </div>

        <Button3D variant="navy" size="md" onClick={() => onNavigasi('/')}>
          <Home size={20} />
          <span>Kembali ke Beranda</span>
        </Button3D>
      </div>

      {/* 8 Kotak Karakter Besar (4-4) + Kotak Tempel Link */}
      <div className="kartu-3d flex shrink-0 flex-col items-center gap-3 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] px-6 py-4">
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2, 3].map((idx) => {
            const huruf = kode[idx] ?? '';
            const aktif = kode.length === idx;
            return (
              <div
                key={idx}
                className={`font-mono flex h-[86px] w-[86px] items-center justify-center rounded-2xl border-4 text-5xl font-black shadow-[0_6px_0_#040B24] ${
                  huruf
                    ? 'border-[#57E893] bg-[#071236] text-[#FFD400]'
                    : aktif
                      ? 'border-[#FFD400] bg-[#173287] text-white'
                      : 'border-[#3C62D4] bg-[#071236] text-[#5F8BFF]'
                }`}
              >
                {huruf || (aktif ? '_' : '')}
              </div>
            );
          })}

          <div className="mx-2 h-2 w-6 rounded-full bg-[#FFD400]" aria-hidden="true" />

          {[4, 5, 6, 7].map((idx) => {
            const huruf = kode[idx] ?? '';
            const aktif = kode.length === idx;
            return (
              <div
                key={idx}
                className={`font-mono flex h-[86px] w-[86px] items-center justify-center rounded-2xl border-4 text-5xl font-black shadow-[0_6px_0_#040B24] ${
                  huruf
                    ? 'border-[#57E893] bg-[#071236] text-[#FFD400]'
                    : aktif
                      ? 'border-[#FFD400] bg-[#173287] text-white'
                      : 'border-[#3C62D4] bg-[#071236] text-[#5F8BFF]'
                }`}
              >
                {huruf || (aktif ? '_' : '')}
              </div>
            );
          })}
        </div>

        {/* Bar Peringatan / Tempel Link */}
        <div className="flex w-full max-w-[1120px] items-center justify-between gap-4">
          <div className="flex min-h-[48px] flex-1 items-center gap-2 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-4">
            {pesanPeringatan ? (
              <>
                <AlertTriangle size={20} className="shrink-0 text-[#FFD400]" />
                <span className="text-sm font-extrabold text-[#FFD400]">{pesanPeringatan}</span>
              </>
            ) : (
              <span className="text-sm font-bold text-[#DCE7FF]">
                {siapMasuk ? (
                  <span className="text-[#57E893]">
                    Kode 8 karakter siap! Tekan tombol <strong>MASUK</strong> di kanan bawah.
                  </span>
                ) : (
                  <>
                    Terisi <strong className="tabular-angka text-[#FFD400]">{kode.length}/8</strong>{' '}
                    karakter · Spasi &amp; strip diabaikan otomatis.
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={inputTempelRef}
              type="text"
              value={teksTempel}
              onChange={(e) => {
                const v = e.target.value;
                setTeksTempel(v);
                if (v.trim()) {
                  terapkanInputTeks(v, true);
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted) {
                  e.preventDefault();
                  setTeksTempel(pasted);
                  terapkanInputTeks(pasted, true);
                }
              }}
              placeholder="Tempel link (#/g/KODE) atau ketik..."
              aria-label="Kotak tempel kode atau link game"
              className="min-h-[48px] w-[300px] rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-3.5 text-sm font-bold text-white placeholder-[#8FB1FF] focus:border-[#FFD400] focus:outline-none"
            />
            <Button3D variant="biru" size="sm" onClick={() => void handleTempelDariTombol()}>
              <ClipboardPaste size={18} />
              <span>Tempel</span>
            </Button3D>
          </div>
        </div>
      </div>

      {/* Keyboard Virtual Sentuh Besar (minimal 64px) */}
      <div className="kartu-3d grid min-h-0 flex-1 grid-cols-12 gap-4 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-4">
        {/* Kiri: 8 kolom x 4 baris (Angka 2-9 + Huruf A-Z tanpa I & O) */}
        <div className="col-span-9 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-8 gap-2.5">
            {BARIS_ANGKA.map((k) => renderTombolKey(k, 'angka'))}
          </div>
          <div className="grid grid-cols-8 gap-2.5">
            {BARIS_HURUF_1.map((k) => renderTombolKey(k, 'huruf'))}
          </div>
          <div className="grid grid-cols-8 gap-2.5">
            {BARIS_HURUF_2.map((k) => renderTombolKey(k, 'huruf'))}
          </div>
          <div className="grid grid-cols-8 gap-2.5">
            {BARIS_HURUF_3.map((k) => renderTombolKey(k, 'huruf'))}
          </div>
        </div>

        {/* Kanan: Tombol Hapus, Bersihkan, dan MASUK Besar */}
        <div className="col-span-3 flex flex-col justify-between gap-3">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleHapusSatu();
            }}
            className="font-display flex min-h-[72px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-3 border-[#FFB566] bg-[#FF9100] px-4 text-xl font-bold text-[#071236] shadow-[0_6px_0_#C56200] active:translate-y-1"
          >
            <Delete size={24} strokeWidth={2.7} />
            <span>HAPUS</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleBersihkan();
            }}
            className="font-display flex min-h-[68px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-3 border-[#3C62D4] bg-[#071236] px-4 text-lg font-bold text-[#DCE7FF] shadow-[0_6px_0_#040B24] hover:border-[#FFD400] hover:text-white active:translate-y-1"
          >
            <RotateCcw size={20} />
            <span>KOSONGKAN</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              handleMasuk();
            }}
            className={`font-display flex min-h-[120px] flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl border-4 px-5 text-3xl font-bold transition-transform active:translate-y-1 ${
              siapMasuk
                ? 'border-[#57E893] bg-[#00C853] text-white shadow-[0_8px_0_#007A33] hover:bg-[#00DB5B]'
                : 'border-[#3C62D4] bg-[#173287] text-[#8FB1FF] shadow-[0_8px_0_#071236]'
            }`}
          >
            <span>MASUK</span>
            <ArrowRight size={30} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

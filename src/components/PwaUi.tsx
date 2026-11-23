import React from 'react';
import {
  Download,
  Monitor,
  RefreshCw,
  Share,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { usePwa } from '../app/PwaContext';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

export const BannerPasangPwa: React.FC = () => {
  const { isInstalled, isDeferred, canPromptInstall, pasangAplikasi, tundaBanner } = usePwa();

  if (isInstalled || isDeferred || !canPromptInstall) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Banner pasang aplikasi Duel Otak"
      className="flex shrink-0 justify-center border-t-2 border-[#223F9C] bg-[#071236] px-6 py-2.5"
    >
      <div className="flex w-full max-w-[1140px] items-center justify-between gap-4 rounded-2xl border-3 border-[#FFD400] bg-[#12276B] px-5 py-2 shadow-[0_6px_0_#040B24]">
        <div className="flex min-w-0 items-center gap-3.5">
          <img
            src="./icon-192.png"
            alt="Logo Duel Otak"
            className="h-12 w-12 shrink-0 rounded-xl border-2 border-[#FFD400]"
          />
          <div className="min-w-0">
            <div className="font-display text-lg font-bold text-[#FFD400]">
              Pasang Duel Otak
            </div>
            <p className="truncate text-sm font-bold text-[#DCE7FF]">
              Pasang aplikasi ini di perangkat Anda untuk akses lebih cepat dan bisa dipakai tanpa internet
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Button3D variant="hijau" size="sm" onClick={() => void pasangAplikasi()}>
            <Download size={17} />
            <span>PASANG</span>
          </Button3D>
          <Button3D variant="navy" size="sm" onClick={tundaBanner}>
            <span>NANTI</span>
          </Button3D>
        </div>
      </div>
    </div>
  );
};

export const ModalCaraPasangPwa: React.FC = () => {
  const { panduanManualTerbuka, tutupPanduanManual, tipePerangkat } = usePwa();

  return (
    <Modal
      terbuka={panduanManualTerbuka}
      judul="Cara Memasang Aplikasi Duel Otak"
      onTutup={tutupPanduanManual}
      lebarMaks="lg"
      footer={
        <Button3D variant="kuning" size="md" onClick={tutupPanduanManual}>
          Mengerti
        </Button3D>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-base font-bold text-[#DCE7FF]">
          Browser Anda tidak menampilkan tombol pasang otomatis. Ikuti langkah pemasangan manual sesuai perangkat Anda di bawah ini:
        </p>

        <div className="grid grid-cols-3 gap-4">
          <div
            className={`flex flex-col gap-2 rounded-2xl border-3 p-4 ${
              tipePerangkat === 'ios'
                ? 'border-[#FFD400] bg-[#173287]'
                : 'border-[#3C62D4] bg-[#071236]'
            }`}
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold text-[#FFD400]">
              <Share size={20} />
              <span>iPhone / iPad (Safari)</span>
            </div>
            {tipePerangkat === 'ios' && (
              <span className="inline-block w-fit rounded bg-[#00C853] px-2 py-0.5 text-[11px] font-bold text-white">
                PERANGKAT ANDA
              </span>
            )}
            <ol className="list-decimal space-y-1.5 pl-4 text-sm font-semibold text-[#DCE7FF]">
              <li>
                Ketuk tombol <strong className="text-white">Bagikan</strong> (ikon kotak berpanah ke atas) di bilah Safari.
              </li>
              <li>
                Gulir lalu pilih <strong className="text-[#57E893]">Tambah ke Layar Utama</strong>.
              </li>
              <li>
                Ketuk <strong className="text-white">Tambah</strong> di pojok kanan atas.
              </li>
            </ol>
          </div>

          <div
            className={`flex flex-col gap-2 rounded-2xl border-3 p-4 ${
              tipePerangkat === 'android'
                ? 'border-[#FFD400] bg-[#173287]'
                : 'border-[#3C62D4] bg-[#071236]'
            }`}
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold text-[#FFD400]">
              <Smartphone size={20} />
              <span>HP Android</span>
            </div>
            {tipePerangkat === 'android' && (
              <span className="inline-block w-fit rounded bg-[#00C853] px-2 py-0.5 text-[11px] font-bold text-white">
                PERANGKAT ANDA
              </span>
            )}
            <ol className="list-decimal space-y-1.5 pl-4 text-sm font-semibold text-[#DCE7FF]">
              <li>
                Buka halaman ini di <strong className="text-white">Google Chrome</strong> atau <strong className="text-white">Edge</strong>.
              </li>
              <li>
                Ketuk menu <strong className="text-[#57E893]">⋮</strong> di pojok kanan atas browser.
              </li>
              <li>
                Pilih <strong className="text-[#57E893]">Pasang aplikasi</strong> / <strong className="text-white">Tambahkan ke layar utama</strong>.
              </li>
            </ol>
          </div>

          <div
            className={`flex flex-col gap-2 rounded-2xl border-3 p-4 ${
              tipePerangkat === 'desktop' || tipePerangkat === 'firefox'
                ? 'border-[#FFD400] bg-[#173287]'
                : 'border-[#3C62D4] bg-[#071236]'
            }`}
          >
            <div className="flex items-center gap-2 font-display text-lg font-bold text-[#FFD400]">
              <Monitor size={20} />
              <span>Smartboard &amp; Laptop</span>
            </div>
            {(tipePerangkat === 'desktop' || tipePerangkat === 'firefox') && (
              <span className="inline-block w-fit rounded bg-[#00C853] px-2 py-0.5 text-[11px] font-bold text-white">
                PERANGKAT ANDA
              </span>
            )}
            <ol className="list-decimal space-y-1.5 pl-4 text-sm font-semibold text-[#DCE7FF]">
              <li>
                Di <strong className="text-white">Chrome / Edge</strong>, klik ikon <strong className="text-[#57E893]">Pasang</strong> di bilah alamat atas.
              </li>
              <li>
                Atau buka menu browser (⋮) &rarr; <strong className="text-[#57E893]">Pasang Duel Otak</strong>.
              </li>
              {tipePerangkat === 'firefox' && (
                <li className="text-[#FFE8B3]">
                  Di Firefox desktop, gunakan Chrome/Edge jika ingin memasang sebagai aplikasi jendela terpisah.
                </li>
              )}
            </ol>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-[#57E893] bg-[#005724] px-4 py-3 text-sm font-bold text-white">
          Catatan Offline: Setelah dipasang dan dibuka minimal satu kali saat terhubung internet, game yang Anda simpan di <strong>Game Saya</strong> dapat dimainkan kapan saja tanpa internet.
        </div>
      </div>
    </Modal>
  );
};

export const ToastPembaruanPwa: React.FC = () => {
  const { tampilkanToastUpdate, muatUlangPembaruan, tutupToastUpdateSementara } = usePwa();

  if (!tampilkanToastUpdate) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-6 bottom-6 z-[85] flex items-center gap-3 rounded-2xl border-3 border-[#FFD400] bg-[#12276B] px-5 py-3 text-white shadow-[0_10px_0_#040B24]"
    >
      <Sparkles size={22} className="shrink-0 text-[#FFD400]" />
      <div className="pr-2">
        <div className="font-display text-base font-bold text-[#FFD400]">
          Versi baru tersedia
        </div>
        <div className="text-xs font-semibold text-[#DCE7FF]">
          Muat ulang saat sedang tidak bertanding.
        </div>
      </div>
      <Button3D variant="kuning" size="sm" onClick={muatUlangPembaruan}>
        <RefreshCw size={16} />
        <span>MUAT ULANG</span>
      </Button3D>
      <button
        type="button"
        onClick={tutupToastUpdateSementara}
        aria-label="Tutup pemberitahuan versi baru"
        className="flex min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center rounded-xl bg-[#071236] text-[#DCE7FF] hover:text-white"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export const LencanaModeOffline: React.FC = () => {
  const { isOnline } = usePwa();
  if (isOnline) return null;

  return (
    <div
      role="status"
      title="Tidak ada koneksi internet. Game lokal & fitur inti tetap berjalan normal."
      className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border-2 border-[#FF9100] bg-[#4D2400] px-3 py-1 font-display text-xs font-bold whitespace-nowrap text-[#FFD400]"
    >
      <WifiOff size={15} className="shrink-0" />
      <span>Mode Offline</span>
    </div>
  );
};

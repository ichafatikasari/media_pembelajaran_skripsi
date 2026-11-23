import React from 'react';
import { AlertCircle, CheckCircle2, Info, RotateCcw, X } from 'lucide-react';

export type JenisToast = 'sukses' | 'info' | 'peringatan' | 'error';

export interface ItemToast {
  id: string;
  pesan: string;
  jenis: JenisToast;
  aksiLabel?: string;
  onAksi?: () => void;
}

interface ToastContainerProps {
  daftarToast: ItemToast[];
  onTutup: (id: string) => void;
}

const GAYA_TOAST: Record<JenisToast, { bg: string; border: string; icon: React.ReactNode }> = {
  sukses: {
    bg: 'bg-[#008E3A]',
    border: 'border-[#57E893]',
    icon: <CheckCircle2 size={24} className="shrink-0 text-[#FFD400]" />,
  },
  info: {
    bg: 'bg-[#173287]',
    border: 'border-[#669BFF]',
    icon: <Info size={24} className="shrink-0 text-[#FFD400]" />,
  },
  peringatan: {
    bg: 'bg-[#C56200]',
    border: 'border-[#FFD400]',
    icon: <AlertCircle size={24} className="shrink-0 text-[#FFD400]" />,
  },
  error: {
    bg: 'bg-[#B80023]',
    border: 'border-[#FF6B86]',
    icon: <AlertCircle size={24} className="shrink-0 text-white" />,
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ daftarToast, onTutup }) => {
  if (daftarToast.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute top-24 right-8 z-[80] flex w-[500px] flex-col gap-3">
      {daftarToast.map((item) => {
        const gaya = GAYA_TOAST[item.jenis];
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border-3 px-5 py-3.5 text-white shadow-[0_8px_0_rgba(0,0,0,0.4)] ${gaya.bg} ${gaya.border}`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {gaya.icon}
              <p className="text-bacaan text-base font-bold">{item.pesan}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.aksiLabel && item.onAksi && (
                <button
                  type="button"
                  onClick={() => {
                    item.onAksi?.();
                    onTutup(item.id);
                  }}
                  className="font-display flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border-2 border-[#FFE875] bg-[#FFD400] px-3.5 text-sm font-bold text-[#0B1B4D] hover:bg-[#FFE875]"
                >
                  <RotateCcw size={15} />
                  <span>{item.aksiLabel}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onTutup(item.id)}
                aria-label="Tutup notifikasi"
                className="flex min-h-[48px] min-w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-black/25 text-white hover:bg-black/40"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button3D } from './Button3D';

interface ModalProps {
  terbuka: boolean;
  judul: string;
  onTutup: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  lebarMaks?: 'md' | 'lg' | 'xl';
}

const LEBAR_MODAL: Record<NonNullable<ModalProps['lebarMaks']>, string> = {
  md: 'max-w-[620px]',
  lg: 'max-w-[880px]',
  xl: 'max-w-[1160px]',
};

export const Modal: React.FC<ModalProps> = ({
  terbuka,
  judul,
  onTutup,
  children,
  footer,
  lebarMaks = 'lg',
}) => {
  useEffect(() => {
    if (!terbuka) {
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onTutup();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [terbuka, onTutup]);

  if (!terbuka) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={judul}
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#040B24]/85 p-8"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onTutup();
        }
      }}
    >
      <div
        className={`flex max-h-[820px] w-full flex-col overflow-hidden rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] shadow-[0_14px_0_#071236,0_24px_50px_rgba(0,0,0,0.65)] ${LEBAR_MODAL[lebarMaks]}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b-4 border-[#223F9C] bg-[#173287] px-7 py-4">
          <h2 className="font-display text-2xl font-bold text-[#FFD400]">{judul}</h2>
          <Button3D variant="merah" size="sm" onClick={onTutup} aria-label="Tutup jendela">
            <X size={22} strokeWidth={3} />
          </Button3D>
        </div>
        <div className="scroll-guru flex-1 p-7 text-white">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-4 border-t-4 border-[#223F9C] bg-[#0D1E54] px-7 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

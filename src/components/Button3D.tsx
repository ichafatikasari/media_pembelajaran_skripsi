import React, { useState } from 'react';

export type Button3DVariant =
  | 'merah'
  | 'biru'
  | 'kuning'
  | 'hijau'
  | 'oranye'
  | 'ungu'
  | 'navy';

interface Button3DProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Button3DVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const GAYA_WARNA: Record<
  Button3DVariant,
  { bg: string; hover: string; shadow: string; text: string; border: string }
> = {
  merah: {
    bg: '#FF1744',
    hover: '#FF2E57',
    shadow: '#B80023',
    text: '#FFFFFF',
    border: '#FF6B86',
  },
  biru: {
    bg: '#1E6BFF',
    hover: '#387EFF',
    shadow: '#0A2FA8',
    text: '#FFFFFF',
    border: '#669BFF',
  },
  kuning: {
    bg: '#FFD400',
    hover: '#FFDD33',
    shadow: '#C79A00',
    text: '#0B1B4D',
    border: '#FFE875',
  },
  hijau: {
    bg: '#00C853',
    hover: '#12D865',
    shadow: '#008E3A',
    text: '#FFFFFF',
    border: '#57E893',
  },
  oranye: {
    bg: '#FF9100',
    hover: '#FFA126',
    shadow: '#C56200',
    text: '#FFFFFF',
    border: '#FFBA5C',
  },
  ungu: {
    bg: '#7C4DFF',
    hover: '#8E66FF',
    shadow: '#4A1FD1',
    text: '#FFFFFF',
    border: '#AB8EFF',
  },
  navy: {
    bg: '#173287',
    hover: '#2042AD',
    shadow: '#091540',
    text: '#FFFFFF',
    border: '#3C62D4',
  },
};

const UKURAN_TOMBOL: Record<NonNullable<Button3DProps['size']>, string> = {
  sm: 'min-h-[48px] min-w-[48px] px-4 py-2 text-base rounded-xl',
  md: 'min-h-[52px] min-w-[52px] px-6 py-2.5 text-lg rounded-2xl',
  lg: 'min-h-[60px] min-w-[60px] px-7 py-3 text-xl rounded-2xl',
  xl: 'min-h-[68px] min-w-[68px] px-8 py-4 text-2xl rounded-2xl',
};

export const Button3D: React.FC<Button3DProps> = ({
  variant = 'biru',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...rest
}) => {
  const [ditekan, setDitekan] = useState(false);
  const palet = GAYA_WARNA[variant];
  const tinggiBayangan = size === 'xl' || size === 'lg' ? 7 : 5;
  const jarakTekan = ditekan && !disabled ? tinggiBayangan - 2 : 0;
  const sisaBayangan = ditekan && !disabled ? 2 : tinggiBayangan;

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (!disabled) {
          setDitekan(true);
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setDitekan(false);
        onPointerUp?.(e);
      }}
      onPointerLeave={(e) => {
        setDitekan(false);
        onPointerLeave?.(e);
      }}
      onPointerCancel={(e) => {
        setDitekan(false);
        onPointerCancel?.(e);
      }}
      style={{
        backgroundColor: palet.bg,
        color: palet.text,
        borderColor: palet.border,
        boxShadow: disabled
          ? `0 2px 0 ${palet.shadow}`
          : `0 ${sisaBayangan}px 0 ${palet.shadow}, 0 ${sisaBayangan + 4}px 14px rgba(0, 0, 0, 0.35)`,
        transform: `translateY(${jarakTekan}px)`,
      }}
      className={`font-display relative inline-flex cursor-pointer items-center justify-center gap-2.5 border-2 font-bold whitespace-nowrap transition-[transform,box-shadow,filter] duration-100 select-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400] disabled:cursor-not-allowed disabled:opacity-50 ${
        UKURAN_TOMBOL[size]
      } ${fullWidth ? 'w-full' : 'shrink-0'} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

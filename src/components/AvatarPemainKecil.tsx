import React from 'react';
import { TimSisi } from '../data/types';

interface AvatarPemainKecilProps {
  tim: TimSisi;
  indeks: number;
  ukuran?: number;
}

/**
 * Avatar chibi sekolah kecil untuk kartu pemain di Rekap Hasil
 * (konsisten seragam olahraga kuning-hijau dan bandana/hijab tim Merah/Biru).
 */
export const AvatarPemainKecil: React.FC<AvatarPemainKecilProps> = ({
  tim,
  indeks,
  ukuran = 36,
}) => {
  const adalahMerah = tim === 'merah';
  const pakaiHijab = indeks % 2 === 0;
  const warnaTim = adalahMerah ? '#FF1744' : '#1E6BFF';
  const warnaLatar = adalahMerah ? '#7A0018' : '#071F70';

  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="20" cy="20" r="18.5" fill={warnaLatar} stroke={warnaTim} strokeWidth="2.5" />
      {/* Baju seragam kuning berlengan hijau */}
      <path d="M9 36 C10 27, 30 27, 31 36 Z" fill="#FFD400" stroke="#071236" strokeWidth="2" />
      <path d="M9 36 C9.5 30, 12.5 28.5, 14 29 L13 36 Z" fill="#00C853" />
      <path d="M31 36 C30.5 30, 27.5 28.5, 26 29 L27 36 Z" fill="#00C853" />

      {pakaiHijab ? (
        <>
          {/* Hijab putih */}
          <path
            d="M10.5 18 C10.5 9.5, 29.5 9.5, 29.5 18 C29.5 25.5, 26 29.5, 20 29.5 C14 29.5, 10.5 25.5, 10.5 18 Z"
            fill="#FFFFFF"
            stroke="#071236"
            strokeWidth="2"
          />
          <circle cx="20" cy="18.5" r="7" fill="#F8D2B0" stroke="#071236" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <circle cx="20" cy="18" r="8.2" fill="#F8D2B0" stroke="#071236" strokeWidth="2" />
          {/* Rambut gelap */}
          <path
            d="M11.8 16 C12.5 9, 27.5 9, 28.2 16 C25.5 13.5, 14.5 13.5, 11.8 16 Z"
            fill="#1D2238"
            stroke="#071236"
            strokeWidth="1.6"
          />
          {/* Bandana tim */}
          <rect x="12" y="12.5" width="16" height="3" rx="1.5" fill={warnaTim} stroke="#071236" strokeWidth="1.2" />
        </>
      )}

      {/* Mata & senyum */}
      <circle cx="17.5" cy="18.5" r="1.3" fill="#071236" />
      <circle cx="22.5" cy="18.5" r="1.3" fill="#071236" />
      <path d="M17.5 21.8 Q20 23.6 22.5 21.8" stroke="#071236" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
};

import React from 'react';
import { TimSisi } from '../data/types';

export type PoseMaskot = 'diam' | 'tarik' | 'oleng' | 'panik' | 'menang' | 'kalah' | 'lucu';

export type BagianMaskot = 'semua' | 'belakang' | 'tangan';

interface MascotChibiProps {
  varian: 'hijab' | 'putra';
  tim: TimSisi;
  ukuran?: number;
  menghadap?: 'kanan' | 'kiri';
  pegangTali?: boolean;
  indeksKarakter?: number;
  pose?: PoseMaskot;
  bagian?: BagianMaskot;
  disorot?: boolean;
  onKetuk?: () => void;
}

const PALET_KULIT = [
  { dasar: '#F8D2B0', bayangan: '#DFAD84', kilau: '#FFE6CE' },
  { dasar: '#EDBA91', bayangan: '#CF9365', kilau: '#FAD1B0' },
  { dasar: '#FCDCC0', bayangan: '#E4B791', kilau: '#FFEDE0' },
  { dasar: '#E2A97B', bayangan: '#C28252', kilau: '#F4C59D' },
  { dasar: '#F4C79F', bayangan: '#D6A073', kilau: '#FFE0C4' },
];

const PALET_RAMBUT = [
  { dasar: '#1C2333', bayangan: '#0D121C', kilau: '#3B4763' },
  { dasar: '#36231C', bayangan: '#20130E', kilau: '#593C32' },
  { dasar: '#171C28', bayangan: '#0A0D14', kilau: '#333E57' },
];

/**
 * Maskot kartun chibi anak sekolah berseragam olahraga kuning berlengan hijau,
 * pewarnaan 3 tingkat (dasar, bayangan, kilau), dan lapisan tangan terpisah agar
 * tali tambang benar-benar berada di antara badan (belakang) dan genggaman tangan (depan).
 * Tinggi tali konsisten di Y = 74 pada viewBox 0 0 120 132.
 */
export const MascotChibi: React.FC<MascotChibiProps> = ({
  varian,
  tim,
  ukuran = 150,
  menghadap = 'kanan',
  pegangTali = true,
  indeksKarakter = 0,
  pose = 'diam',
  bagian = 'semua',
  disorot = false,
  onKetuk,
}) => {
  const adalahMerah = tim === 'merah';
  const warnaTim = adalahMerah ? '#FF1744' : '#1E6BFF';
  const warnaTimBayangan = adalahMerah ? '#B80023' : '#0A2FA8';
  const warnaTimKilau = adalahMerah ? '#FF6B86' : '#669BFF';

  const kulit = PALET_KULIT[Math.abs(indeksKarakter) % PALET_KULIT.length];
  const rambut = PALET_RAMBUT[Math.abs(indeksKarakter) % PALET_RAMBUT.length];

  const condongBadan =
    pose === 'kalah'
      ? 'translate(0, 14) rotate(-26 56 96)'
      : pose === 'tarik'
        ? 'rotate(-11 56 96)'
        : pose === 'oleng'
          ? 'rotate(7 56 96)'
          : pegangTali
            ? 'rotate(-7 56 96)'
            : undefined;

  const flipTransform = menghadap === 'kiri' ? 'translate(120, 0) scale(-1, 1)' : undefined;

  const tampilBelakang = bagian === 'semua' || bagian === 'belakang';
  const tampilTangan = bagian === 'semua' || bagian === 'tangan';

  // Koordinat genggaman tali terkunci di Y = 74 (tinggi tali seragam di semua penarik)
  const tanganBelakangX = pegangTali ? 90 : 81;
  const tanganBelakangY = pegangTali ? 74 : 76;
  const tanganDepanX = pegangTali ? 68 : 34;
  const tanganDepanY = pegangTali ? 74 : 74;

  const kelasAnimasi =
    pose === 'tarik'
      ? 'anim-tarik'
      : pose === 'oleng'
        ? 'anim-oleng'
        : pose === 'panik'
          ? 'anim-panik'
          : pose === 'menang' || pose === 'lucu'
            ? 'anim-sorak'
            : pose === 'kalah'
              ? ''
              : 'anim-napas';

  return (
    <svg
      width={Math.round((ukuran * 120) / 132)}
      height={ukuran}
      viewBox="0 0 120 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onPointerDown={onKetuk ? (e) => { e.stopPropagation(); onKetuk(); } : undefined}
      className={`${kelasAnimasi} ${onKetuk ? 'cursor-pointer' : ''} select-none`}
      aria-label={varian === 'hijab' ? 'Maskot siswi berhijab putih' : 'Maskot siswa putra'}
    >
      <g transform={flipTransform}>
        {tampilBelakang && (
          <>
            {/* Sorot kecil pemain aktif */}
            {disorot && (
              <ellipse
                cx="56"
                cy="122"
                rx="38"
                ry="8"
                fill="#FFD400"
                opacity="0.55"
              />
            )}

            {/* Bayangan elips di bawah kaki */}
            <ellipse cx="56" cy="122" rx="31" ry="6.5" fill="rgba(7,18,54,0.58)" />

            {/* Kaki Belakang (menahan posisi tetap di tanah) */}
            <rect
              x="35"
              y="94"
              width="12"
              height="20"
              rx="5"
              fill={kulit.bayangan}
              stroke="#071236"
              strokeWidth="3"
            />
            <path
              d="M29 110 H49 C51 110 52 119 48 120 H29 C26 120 26 111 29 110 Z"
              fill={warnaTimBayangan}
              stroke="#071236"
              strokeWidth="3"
            />
            <path d="M31 112 H45" stroke={warnaTimKilau} strokeWidth="2.5" strokeLinecap="round" />

            {/* Kaki Depan (menekuk ke depan saat menarik) */}
            <path
              d="M62 93 L74 103 L70 115 L58 113 L61 103 L54 96 Z"
              fill={kulit.dasar}
              stroke="#071236"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M57 111 H77 C80 111 81 120 76 120 H57 C54 120 54 111 57 111 Z"
              fill={warnaTim}
              stroke="#071236"
              strokeWidth="3"
            />
            <path d="M59 113 H73" stroke={warnaTimKilau} strokeWidth="2.5" strokeLinecap="round" />

            {/* Celana Olahraga Tim (3 tingkat warna) */}
            <path
              d="M36 77 H74 L78 97 H61 L56 86 L50 97 H32 Z"
              fill={warnaTimBayangan}
              stroke="#071236"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <path d="M39 80 H69 L72 90 H61 L55 83 L49 90 H37 Z" fill={warnaTim} />

            {/* Bagian Atas Badan + Kepala condong ke belakang */}
            <g transform={condongBadan}>
              {/* Badan Kaos Olahraga Kuning (dasar + bayangan + kilau) */}
              <rect
                x="35"
                y="50"
                width="38"
                height="30"
                rx="11"
                fill="#FFD400"
                stroke="#071236"
                strokeWidth="3.2"
              />
              <path d="M38 69 H70 C70 76 66 78 54 78 C42 78 38 76 38 69 Z" fill="#E6B200" />
              <path d="M42 54 H64" stroke="#FFF275" strokeWidth="3" strokeLinecap="round" />
              <path
                d="M46 50 H64 L59 58 H51 Z"
                fill="#00C853"
                stroke="#071236"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="55" cy="66" r="6.5" fill={warnaTim} stroke="#071236" strokeWidth="2.2" />

              {/* KEPALA */}
              {varian === 'hijab' ? (
                <>
                  <path
                    d="M27 36 C27 12, 83 12, 83 36 C85 52, 75 60, 55 60 C34 60, 25 52, 27 36 Z"
                    fill="#FFFFFF"
                    stroke="#071236"
                    strokeWidth="3.4"
                  />
                  <path
                    d="M31 44 C35 55, 72 56, 79 44 C73 51, 38 51, 31 44 Z"
                    fill="#B3C7E6"
                  />
                  <path
                    d="M32 34 C33 21, 43 17, 51 17 C40 20, 35 27, 34 38 Z"
                    fill="#D4E2F7"
                  />
                  <ellipse
                    cx="59"
                    cy="37"
                    rx="18"
                    ry="15.5"
                    fill={kulit.dasar}
                    stroke="#071236"
                    strokeWidth="2.8"
                  />
                  <path
                    d="M44 42 C48 49, 68 50, 74 42 C68 47, 50 47, 44 42 Z"
                    fill={kulit.bayangan}
                  />
                  <ellipse cx="53" cy="29" rx="5" ry="2.2" fill={kulit.kilau} />
                  <path
                    d="M31 23 Q56 14 79 23"
                    stroke={warnaTim}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M35 22 Q56 16 74 22"
                    stroke={warnaTimKilau}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <ellipse
                    cx="56"
                    cy="36"
                    rx="22"
                    ry="20"
                    fill={kulit.dasar}
                    stroke="#071236"
                    strokeWidth="3.4"
                  />
                  <path
                    d="M38 42 C43 52, 69 52, 74 42 C67 49, 45 49, 38 42 Z"
                    fill={kulit.bayangan}
                  />
                  {indeksKarakter % 2 === 0 ? (
                    <path
                      d="M33 32 C34 11, 80 11, 79 31 C71 23, 63 26, 56 21 C48 26, 40 23, 33 32 Z"
                      fill={rambut.dasar}
                      stroke="#071236"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M33 32 C34 12, 79 10, 79 30 C74 24, 67 19, 59 23 C53 16, 44 21, 33 32 Z"
                      fill={rambut.dasar}
                      stroke="#071236"
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                  )}
                  <path d="M44 19 Q56 15 68 19" stroke={rambut.kilau} strokeWidth="2.5" strokeLinecap="round" />
                  <path
                    d="M35 25 Q56 18 77 25"
                    stroke={warnaTim}
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M39 24 Q56 19 72 24"
                    stroke={warnaTimKilau}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Ekspresi Wajah */}
              {pose === 'kalah' ? (
                <>
                  <path d="M49 34 L55 39 M55 34 L49 39" stroke="#071236" strokeWidth="2.6" strokeLinecap="round" />
                  <path d="M63 34 L69 39 M69 34 L63 39" stroke="#071236" strokeWidth="2.6" strokeLinecap="round" />
                  <circle cx="60" cy="46" r="3" fill="#071236" />
                </>
              ) : pose === 'menang' || pose === 'lucu' ? (
                <>
                  <path d="M48 37 Q52 32 56 37" stroke="#071236" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M62 37 Q66 32 70 37" stroke="#071236" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M53 43 Q60 51 67 43 Z" fill="#FF1744" stroke="#071236" strokeWidth="2.2" />
                </>
              ) : (
                <>
                  <ellipse cx="52" cy="36" rx="3.4" ry={pose === 'panik' || pose === 'oleng' ? 4.4 : 3.6} fill="#071236" />
                  <ellipse cx="67" cy="36" rx="3.4" ry={pose === 'panik' || pose === 'oleng' ? 4.4 : 3.6} fill="#071236" />
                  <circle cx="53.2" cy="34.5" r="1.3" fill="#FFFFFF" />
                  <circle cx="68.2" cy="34.5" r="1.3" fill="#FFFFFF" />
                  {pose === 'tarik' ? (
                    <path d="M54 44 H66 C66 48 54 48 54 44 Z" fill="#FFFFFF" stroke="#071236" strokeWidth="2.2" />
                  ) : pose === 'panik' || pose === 'oleng' ? (
                    <>
                      <ellipse cx="60" cy="45" rx="3.5" ry="4" fill="#071236" />
                      <path d="M76 26 C79 30 78 34 75 34 C72 34 73 30 76 26 Z" fill="#29B6FF" stroke="#071236" strokeWidth="1.5" />
                    </>
                  ) : (
                    <path d="M54 43 Q60 48 66 43" stroke="#071236" strokeWidth="2.8" strokeLinecap="round" fill="none" />
                  )}
                </>
              )}

              <ellipse cx="45" cy="41" rx="3.2" ry="1.8" fill="#FF6B86" opacity="0.55" />
              <ellipse cx="73" cy="41" rx="3.2" ry="1.8" fill="#FF6B86" opacity="0.55" />
            </g>

            {/* Lengan Belakang & Lengan Depan Hijau Lurus ke Genggaman Tali (Y=74) */}
            <path
              d={pegangTali ? 'M60 56 L92 69 L88 79 L56 66 Z' : 'M60 56 L82 71 L77 79 L56 66 Z'}
              fill="#008E3A"
              stroke="#071236"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d={pegangTali ? 'M38 57 L69 69 L66 79 L34 66 Z' : 'M38 56 L31 71 L39 76 L46 62 Z'}
              fill="#00C853"
              stroke="#071236"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <path
              d={pegangTali ? 'M41 60 L64 69' : 'M39 59 L35 69'}
              stroke="#57E893"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </>
        )}

        {/* LAPISAN DEPAN: TANGAN MENGGENGGAM TALI + GELANG TIM (Terkunci di Y=74) */}
        {tampilTangan && (
          <g transform={pose === 'kalah' ? 'translate(0, 12)' : undefined}>
            <circle
              cx={tanganBelakangX - 5}
              cy={tanganBelakangY}
              r="4.2"
              fill={warnaTim}
              stroke="#071236"
              strokeWidth="2.4"
            />
            <circle
              cx={tanganBelakangX}
              cy={tanganBelakangY}
              r="6.2"
              fill={kulit.dasar}
              stroke="#071236"
              strokeWidth="2.8"
            />
            <path
              d={`M ${tanganBelakangX - 2} ${tanganBelakangY - 2} H ${tanganBelakangX + 2}`}
              stroke={kulit.bayangan}
              strokeWidth="2"
              strokeLinecap="round"
            />

            <circle
              cx={tanganDepanX - 5}
              cy={tanganDepanY}
              r="4.2"
              fill={warnaTim}
              stroke="#071236"
              strokeWidth="2.4"
            />
            <circle
              cx={tanganDepanX}
              cy={tanganDepanY}
              r="6.5"
              fill={kulit.dasar}
              stroke="#071236"
              strokeWidth="2.8"
            />
            <path
              d={`M ${tanganDepanX - 2} ${tanganDepanY - 2} H ${tanganDepanX + 2}`}
              stroke={kulit.bayangan}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    </svg>
  );
};

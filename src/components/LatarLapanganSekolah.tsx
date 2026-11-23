import React from 'react';

interface LatarLapanganSekolahProps {
  namaSekolah?: string;
  mapel?: string;
  efekRingan?: boolean;
  tinggiRumputPx?: number;
}

/**
 * Latar kartun lapangan sekolah siang hari dengan warna jenuh & kontras tinggi (ramah kamera).
 * Bersifat statis (tanpa parallax), kecuali awan bergerak sangat pelan saat Efek Ringan OFF.
 * Tiang bendera Merah Putih STATIS berada di sisi gedung sekolah (bukan di tengah lapangan).
 */
export const LatarLapanganSekolah: React.FC<LatarLapanganSekolahProps> = ({
  namaSekolah = '',
  mapel = '',
  efekRingan = false,
  tinggiRumputPx = 114,
}) => {
  const sekolahBersih = namaSekolah.trim();
  const mapelBersih = mapel.trim();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Langit gradien siang pekat */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #29B6FF 0%, #0E96F5 55%, #0077E6 100%)',
        }}
      />

      {/* Awan berbayangan biru (bergerak sangat pelan jika efekRingan OFF) */}
      <div className={`absolute inset-x-0 top-2 ${efekRingan ? '' : 'anim-awan-lambat'}`}>
        <svg viewBox="0 0 1600 90" className="h-[72px] w-full" preserveAspectRatio="none">
          {/* Awan 1 */}
          <g transform="translate(170, 14)">
            <ellipse cx="48" cy="30" rx="40" ry="16" fill="#7CC9FF" />
            <circle cx="32" cy="24" r="17" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <circle cx="56" cy="19" r="22" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <circle cx="78" cy="26" r="15" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <rect x="20" y="25" width="70" height="14" rx="7" fill="#BEE9FF" />
          </g>
          {/* Awan 2 */}
          <g transform="translate(740, 8)">
            <ellipse cx="52" cy="30" rx="44" ry="15" fill="#7CC9FF" />
            <circle cx="32" cy="23" r="16" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <circle cx="58" cy="17" r="21" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <circle cx="84" cy="25" r="15" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <rect x="20" y="24" width="74" height="14" rx="7" fill="#BEE9FF" />
          </g>
          {/* Awan 3 */}
          <g transform="translate(1280, 16)">
            <ellipse cx="44" cy="28" rx="38" ry="14" fill="#7CC9FF" />
            <circle cx="28" cy="22" r="15" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <circle cx="52" cy="16" r="19" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <circle cx="74" cy="23" r="14" fill="#E3F5FF" stroke="#071236" strokeWidth="2.5" />
            <rect x="18" y="23" width="64" height="13" rx="6" fill="#BEE9FF" />
          </g>
        </svg>
      </div>

      {/* Lapangan Rumput Bergaris Berselang di bagian bawah */}
      <div
        style={{ height: `${tinggiRumputPx}px` }}
        className="absolute inset-x-0 bottom-0 border-t-4 border-[#071236] bg-[#14A83A]"
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #3DDC4F 0px, #3DDC4F 80px, #14A83A 80px, #14A83A 160px)',
          }}
        />
        {/* Bayangan rumput atas untuk efek kedalaman */}
        <div className="absolute inset-x-0 top-0 h-2.5 bg-[#0C7A28]/55" />
      </div>

      {/* Pagar Sekolah + Pohon + Gedung + Tiang Bendera Statis di Sisi Gedung + Ring Basket */}
      <svg
        viewBox="0 0 1600 270"
        style={{ bottom: `${Math.max(0, tinggiRumputPx - 156)}px` }}
        className="absolute inset-x-0 h-[270px] w-full"
        preserveAspectRatio="none"
      >
        {/* Pagar kayu hangat di sepanjang tepi belakang lapangan */}
        <g transform="translate(0, 126)">
          <rect x="0" y="8" width="1600" height="8" fill="#8D5524" stroke="#071236" strokeWidth="2.5" />
          <rect x="0" y="21" width="1600" height="7" fill="#6D3F18" stroke="#071236" strokeWidth="2.5" />
          {Array.from({ length: 32 }, (_, idx) => (
            <rect
              key={idx}
              x={idx * 50 + 14}
              y="2"
              width="12"
              height="30"
              rx="3"
              fill="#A66A33"
              stroke="#071236"
              strokeWidth="2.5"
            />
          ))}
        </g>

        {/* Pohon Hijau Rindang Kiri */}
        <g transform="translate(36, 48)">
          <rect x="26" y="64" width="16" height="48" rx="4" fill="#7D491D" stroke="#071236" strokeWidth="3" />
          <circle cx="34" cy="48" r="30" fill="#14A83A" stroke="#071236" strokeWidth="3" />
          <circle cx="20" cy="54" r="20" fill="#3DDC4F" stroke="#071236" strokeWidth="3" />
          <circle cx="48" cy="54" r="20" fill="#14A83A" stroke="#071236" strokeWidth="3" />
        </g>

        {/* Gedung Sekolah Kiri (Oranye Terakota Jenuh - BUKAN Putih) */}
        <g transform="translate(110, 34)">
          {/* Atap Limas Navy-Merah Bata */}
          <path
            d="M-12 36 L135 2 L282 36 Z"
            fill="#B80023"
            stroke="#071236"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d="M10 32 L135 8 L260 32" stroke="#FF6B86" strokeWidth="3" fill="none" />
          {/* Dinding Gedung */}
          <rect x="6" y="36" width="258" height="86" fill="#E65100" stroke="#071236" strokeWidth="3.5" />
          <rect x="6" y="106" width="258" height="16" fill="#BF360C" stroke="#071236" strokeWidth="3" />
          {/* Jendela Kelas Gelap Berkilau Biru */}
          {[22, 68, 174, 220].map((jx) => (
            <g key={jx} transform={`translate(${jx}, 52)`}>
              <rect width="30" height="36" rx="4" fill="#0B1B4D" stroke="#071236" strokeWidth="3" />
              <rect x="4" y="4" width="10" height="28" rx="2" fill="#29B6FF" />
              <rect x="16" y="4" width="10" height="28" rx="2" fill="#0077E6" />
            </g>
          ))}
          {/* Pintu Utama Gedung */}
          <rect x="114" y="64" width="42" height="58" rx="4" fill="#7D3D00" stroke="#071236" strokeWidth="3" />
          <rect x="120" y="70" width="30" height="22" rx="2" fill="#FFD400" stroke="#071236" strokeWidth="2" />
        </g>

        {/* Tiang Bendera STATIS di Sisi Kanan Gedung Kiri (Bukan di Tengah Lapangan) */}
        <g transform="translate(402, 14)">
          {/* Alas Tiang */}
          <rect x="-10" y="128" width="28" height="14" rx="3" fill="#173287" stroke="#071236" strokeWidth="3" />
          {/* Tiang Logam */}
          <rect x="1" y="12" width="6" height="118" fill="#FFD400" stroke="#071236" strokeWidth="2.5" />
          <circle cx="4" cy="10" r="6" fill="#FFD400" stroke="#071236" strokeWidth="2.5" />
          {/* Bendera Merah Putih STATIS (Diam, tidak berkibar) */}
          <rect x="7" y="16" width="54" height="18" fill="#FF1744" stroke="#071236" strokeWidth="2.5" />
          <rect x="7" y="34" width="54" height="18" fill="#FFFFFF" stroke="#071236" strokeWidth="2.5" />
        </g>

        {/* Pohon Tengah Kiri & Kanan */}
        <g transform="translate(520, 62)">
          <rect x="20" y="54" width="14" height="40" rx="4" fill="#7D491D" stroke="#071236" strokeWidth="2.5" />
          <circle cx="27" cy="42" r="24" fill="#3DDC4F" stroke="#071236" strokeWidth="3" />
        </g>
        <g transform="translate(1030, 62)">
          <rect x="20" y="54" width="14" height="40" rx="4" fill="#7D491D" stroke="#071236" strokeWidth="2.5" />
          <circle cx="27" cy="42" r="24" fill="#14A83A" stroke="#071236" strokeWidth="3" />
        </g>

        {/* Gedung Kedua Kanan (Teal / Biru Kehijauan Jenuh untuk Papan Mapel) */}
        <g transform="translate(1150, 38)">
          <path
            d="M-10 34 L125 4 L260 34 Z"
            fill="#0A2FA8"
            stroke="#071236"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <rect x="6" y="34" width="238" height="84" fill="#00897B" stroke="#071236" strokeWidth="3.5" />
          <rect x="6" y="104" width="238" height="14" fill="#005B52" stroke="#071236" strokeWidth="3" />
          {[22, 68, 152, 198].map((jx) => (
            <g key={jx} transform={`translate(${jx}, 52)`}>
              <rect width="28" height="34" rx="4" fill="#0B1B4D" stroke="#071236" strokeWidth="3" />
              <rect x="4" y="4" width="20" height="26" rx="2" fill="#29B6FF" />
            </g>
          ))}
          <rect x="108" y="66" width="34" height="52" rx="4" fill="#FF9100" stroke="#071236" strokeWidth="3" />
        </g>

        {/* Ring Basket di Sisi Kanan Lapangan */}
        <g transform="translate(1458, 40)">
          <rect x="42" y="24" width="10" height="94" fill="#173287" stroke="#071236" strokeWidth="3" />
          <rect x="16" y="6" width="44" height="30" rx="4" fill="#FFD400" stroke="#071236" strokeWidth="3" />
          <rect x="24" y="13" width="28" height="16" rx="2" fill="#0B1B4D" stroke="#FF1744" strokeWidth="2.5" />
          <rect x="10" y="30" width="22" height="5" rx="2" fill="#FF1744" stroke="#071236" strokeWidth="2" />
          <path
            d="M12 35 L16 49 H26 L30 35"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            fill="none"
          />
        </g>
      </svg>

      {/* Papan Nama Sekolah (Tampil hanya jika tidak kosong) */}
      {sekolahBersih && (
        <div
          style={{ left: '118px', top: '8px' }}
          className="absolute max-w-[260px] truncate rounded-xl border-3 border-[#FFD400] bg-[#0B1B4D] px-3 py-1 font-display text-xs font-bold text-[#FFD400] shadow-[0_4px_0_#071236]"
        >
          🏫 {sekolahBersih}
        </div>
      )}

      {/* Papan Nama Mata Pelajaran / Kelas (Tampil hanya jika tidak kosong) */}
      {mapelBersih && (
        <div
          style={{ right: '148px', top: '8px' }}
          className="absolute max-w-[250px] truncate rounded-xl border-3 border-[#57E893] bg-[#0B1B4D] px-3 py-1 font-display text-xs font-bold text-[#57E893] shadow-[0_4px_0_#071236]"
        >
          📚 {mapelBersih}
        </div>
      )}
    </div>
  );
};

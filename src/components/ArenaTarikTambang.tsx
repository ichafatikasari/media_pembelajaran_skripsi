import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { TimSisi } from '../data/types';
import { mainkanTawaKarakter } from '../utils/audio';
import { LatarLapanganSekolah } from './LatarLapanganSekolah';
import { MascotChibi, PoseMaskot } from './MascotChibi';

interface ArenaTarikTambangProps {
  namaTimKiri: string;
  namaTimKanan: string;
  namaSekolah?: string;
  mapel?: string;
  jumlahPenarik: 1 | 3 | 4 | 5;
  posisiTali: number;
  langkahKeGaris: number;
  indeksGiliranKiri: number;
  indeksGiliranKanan: number;
  faseTimKiri: 'menjawab' | 'umpanBalik' | 'selesai';
  faseTimKanan: 'menjawab' | 'umpanBalik' | 'selesai';
  umpanKiri?: 'benar' | 'salah' | 'waktuHabis' | null;
  umpanKanan?: 'benar' | 'salah' | 'waktuHabis' | null;
  pemenang?: TimSisi | 'seri' | null;
  modeRekam?: boolean;
  efekRingan?: boolean;
}

const KOMENTAR_LUCU = [
  'Ayo tarik!',
  'Tahan kuat!',
  'Semangat!',
  'Hampir menang!',
  'Waduh!',
  'Jangan lepas!',
];

interface PenontonProps {
  tim: TimSisi;
  bersorak: boolean;
  onKetuk: () => void;
}

const PenontonKartun: React.FC<PenontonProps> = ({ tim, bersorak, onKetuk }) => {
  const warnaBaju = tim === 'merah' ? '#FF1744' : '#1E6BFF';
  const warnaTopi = tim === 'merah' ? '#FFD400' : '#57E893';

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onKetuk();
      }}
      className={`flex cursor-pointer items-end gap-1 focus:outline-none ${
        bersorak ? 'anim-sorak' : ''
      }`}
      aria-label={`Penonton tim ${tim}`}
    >
      {[0, 1].map((idx) => (
        <svg key={idx} width="38" height="48" viewBox="0 0 40 50" fill="none">
          <ellipse cx="20" cy="46" rx="12" ry="3" fill="rgba(7,18,54,0.45)" />
          <rect
            x="10"
            y="24"
            width="20"
            height="19"
            rx="6"
            fill={idx === 0 ? warnaBaju : '#FF9100'}
            stroke="#071236"
            strokeWidth="2.5"
          />
          <circle
            cx="20"
            cy="15"
            r="9.5"
            fill={idx === 0 ? '#F8D2B0' : '#EAB68B'}
            stroke="#071236"
            strokeWidth="2.5"
          />
          <path d="M11 12 C12 4, 28 4, 29 12 Z" fill={warnaTopi} stroke="#071236" strokeWidth="2.2" />
          <circle cx="17" cy="15" r="1.5" fill="#071236" />
          <circle cx="23" cy="15" r="1.5" fill="#071236" />
          <path d="M16 19 Q20 22 24 19" stroke="#071236" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Bendera sorak kecil */}
          {bersorak && (
            <g>
              <line x1="33" y1="8" x2="33" y2="30" stroke="#FFD400" strokeWidth="2.5" />
              <rect x="33" y="8" width="6" height="8" fill={warnaBaju} stroke="#071236" strokeWidth="1.5" />
            </g>
          )}
        </svg>
      ))}
    </button>
  );
};

export const ArenaTarikTambang: React.FC<ArenaTarikTambangProps> = ({
  namaTimKiri,
  namaTimKanan,
  namaSekolah = '',
  mapel = '',
  jumlahPenarik,
  posisiTali,
  langkahKeGaris,
  indeksGiliranKiri,
  indeksGiliranKanan,
  faseTimKiri,
  faseTimKanan,
  umpanKiri = null,
  umpanKanan = null,
  pemenang = null,
  modeRekam = true,
  efekRingan = false,
}) => {
  const [komentarAktif, setKomentarAktif] = useState<{
    id: string;
    teks: string;
    posisiX: number;
  } | null>(null);

  const [ketukanLucuId, setKetukanLucuId] = useState<string | null>(null);

  // Hapus komentar lucu otomatis setelah 2 detik
  useEffect(() => {
    if (!komentarAktif) return;
    const t = window.setTimeout(() => setKomentarAktif(null), 2000);
    return () => window.clearTimeout(t);
  }, [komentarAktif]);

  useEffect(() => {
    if (!ketukanLucuId) return;
    const t = window.setTimeout(() => setKetukanLucuId(null), 900);
    return () => window.clearTimeout(t);
  }, [ketukanLucuId]);

  const batas = Math.max(3, Math.min(10, langkahKeGaris || 6));
  const posisiVisual = Math.max(-batas, Math.min(batas, posisiTali));
  // Pergeseran minimal 3.5% lebar arena per langkah
  const persenPerLangkah = Math.max(3.6, Math.min(5.2, 22 / batas));
  const geserPersen = posisiVisual * persenPerLangkah;

  const dekatGarisMerahTerancam = posisiTali >= batas - 1 && pemenang === null;
  const dekatGarisBiruTerancam = posisiTali <= -(batas - 1) && pemenang === null;
  const unggulBatas: TimSisi | null =
    posisiTali <= -batas ? 'merah' : posisiTali >= batas ? 'biru' : null;

  // Trigger komentar otomatis saat mendekati garis batas
  useEffect(() => {
    if (dekatGarisMerahTerancam) {
      setKomentarAktif({ id: 'auto_m', teks: 'Hampir kalah!', posisiX: -170 });
    } else if (dekatGarisBiruTerancam) {
      setKomentarAktif({ id: 'auto_b', teks: 'Hampir kalah!', posisiX: 170 });
    }
  }, [dekatGarisMerahTerancam, dekatGarisBiruTerancam]);

  const tentukanPoseTim = (sisi: TimSisi): PoseMaskot => {
    if (pemenang === 'merah') return sisi === 'merah' ? 'menang' : 'kalah';
    if (pemenang === 'biru') return sisi === 'biru' ? 'menang' : 'kalah';

    const faseTim = sisi === 'merah' ? faseTimKiri : faseTimKanan;
    const umpan = sisi === 'merah' ? umpanKiri : umpanKanan;
    const umpanLawan = sisi === 'merah' ? umpanKanan : umpanKiri;

    if (faseTim === 'umpanBalik' && umpan === 'benar') return 'tarik';
    if (faseTim === 'umpanBalik' && (umpan === 'salah' || umpan === 'waktuHabis')) return 'oleng';
    if (umpanLawan === 'benar') return 'oleng';

    if (sisi === 'merah' && dekatGarisMerahTerancam) return 'panik';
    if (sisi === 'biru' && dekatGarisBiruTerancam) return 'panik';
    return 'diam';
  };

  const poseKiri = tentukanPoseTim('merah');
  const poseKanan = tentukanPoseTim('biru');

  const stepPx = jumlahPenarik === 3 ? 92 : jumlahPenarik === 4 ? 80 : 68;
  const lebarKarakterPx = 136; // ukuran=150 -> width 136px
  const tinggiKarakterPx = 150;
  const jarakTepiDepan = 165;

  // Koordinat kiri tiap penarik relatif terhadap tengah kelompok (0px)
  const daftarPenarikKiri = Array.from({ length: jumlahPenarik }, (_, idx) => {
    // idx 0 paling belakang (kiri), idx terakhir paling depan (dekat garis tengah)
    const urutanDariDepan = jumlahPenarik - 1 - idx;
    const leftPx = -jarakTepiDepan - urutanDariDepan * stepPx;
    return {
      idx,
      varian: (idx % 2 === 0 ? 'hijab' : 'putra') as 'hijab' | 'putra',
      leftPx,
      pusatX: leftPx + lebarKarakterPx / 2,
      aktif: idx === indeksGiliranKiri % jumlahPenarik,
    };
  });

  const daftarPenarikKanan = Array.from({ length: jumlahPenarik }, (_, idx) => {
    // idx 0 paling depan (dekat garis tengah), idx terakhir paling belakang (kanan)
    const leftPx = jarakTepiDepan - lebarKarakterPx + idx * stepPx;
    return {
      idx,
      varian: (idx % 2 === 0 ? 'putra' : 'hijab') as 'hijab' | 'putra',
      leftPx,
      pusatX: leftPx + lebarKarakterPx / 2,
      aktif: idx === indeksGiliranKanan % jumlahPenarik,
    };
  });

  const setengahRentangTaliPx = jarakTepiDepan + (jumlahPenarik - 1) * stepPx - 46;

  const picuKomentarLucu = (id: string, posisiX: number, teksKhusus?: string) => {
    mainkanTawaKarakter();
    setKetukanLucuId(id);
    const teks =
      teksKhusus ?? KOMENTAR_LUCU[Math.floor(Math.random() * KOMENTAR_LUCU.length)];
    setKomentarAktif({ id, teks, posisiX });
  };

  const labelStatusTali =
    posisiTali === 0
      ? 'TENGAH (0)'
      : posisiTali < 0
        ? `▲ ${namaTimKiri} +${Math.abs(posisiTali)}`
        : `● ${namaTimKanan} +${posisiTali}`;

  return (
    <section
      aria-label="Arena Lapangan Sekolah Tarik Tambang"
      className={`relative h-[270px] w-full shrink-0 overflow-hidden rounded-3xl border-4 border-[#071236] shadow-[0_8px_0_#071236] ${
        poseKiri === 'tarik' || poseKanan === 'tarik' ? 'anim-getar-layar' : ''
      }`}
    >
      {/* 1. LATAR LAPANGAN SEKOLAH STATIS */}
      <LatarLapanganSekolah
        namaSekolah={namaSekolah}
        mapel={mapel}
        efekRingan={efekRingan}
        tinggiRumputPx={116}
      />

      {/* 2. GARIS BATAS TENGAH & GARIS ZONA MENANG */}
      <div className="pointer-events-none absolute top-[154px] bottom-0 left-1/2 z-[5] -translate-x-1/2 flex flex-col items-center">
        <div className="h-full w-2 border-x-2 border-[#071236] bg-[#FFD400]" />
        <div className="absolute bottom-1 whitespace-nowrap rounded-md border-2 border-[#071236] bg-[#FFD400] px-2 py-0.5 font-display text-[10px] font-bold text-[#071236]">
          GARIS BATAS
        </div>
      </div>

      {/* Garis Batas Kiri & Kanan */}
      <div className="pointer-events-none absolute top-[158px] bottom-0 left-[19%] z-[5] w-2 border-x border-[#071236] bg-[#FF1744]" />
      <div className="pointer-events-none absolute top-[158px] bottom-0 right-[19%] z-[5] w-2 border-x border-[#071236] bg-[#1E6BFF]" />

      {/* 3. ZONA KEMENANGAN KIRI (MERAH) + PENONTON */}
      <div className="absolute top-[116px] bottom-2 left-2 z-20 flex w-[144px] flex-col items-center justify-between rounded-2xl border-4 border-[#071236] bg-[#B80023]/95 p-1.5 shadow-[0_5px_0_#071236]">
        <div className="w-full truncate rounded-lg border-2 border-[#071236] bg-[#FF1744] px-2 py-0.5 text-center font-display text-[11px] font-bold text-white">
          ▲ MENANG {namaTimKiri}
        </div>
        <PenontonKartun
          tim="merah"
          bersorak={posisiTali < 0 || pemenang === 'merah'}
          onKetuk={() => picuKomentarLucu('penonton_merah', -640, `Ayo ${namaTimKiri}!`)}
        />
      </div>

      {/* 4. ZONA KEMENANGAN KANAN (BIRU) + PENONTON */}
      <div className="absolute top-[116px] right-2 bottom-2 z-20 flex w-[144px] flex-col items-center justify-between rounded-2xl border-4 border-[#071236] bg-[#0A2FA8]/95 p-1.5 shadow-[0_5px_0_#071236]">
        <div className="w-full truncate rounded-lg border-2 border-[#071236] bg-[#1E6BFF] px-2 py-0.5 text-center font-display text-[11px] font-bold text-white">
          ● MENANG {namaTimKanan}
        </div>
        <PenontonKartun
          tim="biru"
          bersorak={posisiTali > 0 || pemenang === 'biru'}
          onKetuk={() => picuKomentarLucu('penonton_biru', 640, `Ayo ${namaTimKanan}!`)}
        />
      </div>

      {/* 5. KELOMPOK TUNGGAL BERGERAK SERENTAK: PENARIK + TALI + TANGAN + PENANDA */}
      <div
        style={{ transform: `translateX(${geserPersen}%)` }}
        className="pointer-events-none absolute inset-x-0 bottom-[6px] z-30 h-[215px] transition-transform duration-300 ease-out"
      >
        {/* Bayangan tali di rumput */}
        <div
          style={{
            left: `calc(50% - ${setengahRentangTaliPx}px)`,
            width: `${setengahRentangTaliPx * 2}px`,
          }}
          className="absolute bottom-[10px] z-[5] h-2 rounded-full bg-[#071236]/40"
        />

        {/* LAPISAN A (z-10): BADAN SELURUH PENARIK */}
        {daftarPenarikKiri.map((p) => {
          const sedangLucu = ketukanLucuId === `kiri_${p.idx}`;
          return (
            <div
              key={`body_kiri_${p.idx}`}
              style={{ left: `calc(50% + ${p.leftPx}px)`, bottom: '0px' }}
              className="pointer-events-auto absolute z-10"
            >
              <MascotChibi
                varian={p.varian}
                tim="merah"
                ukuran={tinggiKarakterPx}
                menghadap="kanan"
                pegangTali
                indeksKarakter={p.idx}
                pose={sedangLucu ? 'lucu' : poseKiri}
                bagian="belakang"
                disorot={p.aktif}
                onKetuk={() => picuKomentarLucu(`kiri_${p.idx}`, p.pusatX)}
              />
              {/* Debu kaki berwarna saat menarik */}
              {poseKiri === 'tarik' && !efekRingan && (
                <div className="anim-debu pointer-events-none absolute bottom-1 left-4 h-5 w-7 rounded-full border-2 border-[#071236] bg-[#FFD400]" />
              )}
            </div>
          );
        })}

        {daftarPenarikKanan.map((p) => {
          const sedangLucu = ketukanLucuId === `kanan_${p.idx}`;
          return (
            <div
              key={`body_kanan_${p.idx}`}
              style={{ left: `calc(50% + ${p.leftPx}px)`, bottom: '0px' }}
              className="pointer-events-auto absolute z-10"
            >
              <MascotChibi
                varian={p.varian}
                tim="biru"
                ukuran={tinggiKarakterPx}
                menghadap="kiri"
                pegangTali
                indeksKarakter={p.idx + 1}
                pose={sedangLucu ? 'lucu' : poseKanan}
                bagian="belakang"
                disorot={p.aktif}
                onKetuk={() => picuKomentarLucu(`kanan_${p.idx}`, p.pusatX)}
              />
              {poseKanan === 'tarik' && !efekRingan && (
                <div className="anim-debu pointer-events-none absolute right-4 bottom-1 h-5 w-7 rounded-full border-2 border-[#071236] bg-[#29B6FF]" />
              )}
            </div>
          );
        })}

        {/* LAPISAN B (z-20): TALI TABUNG 3D ORANYE BERANYAMAN TEPAT DI TINGGI TANGAN (bottom=59px, tengah=66px) */}
        <div
          style={{
            left: `calc(50% - ${setengahRentangTaliPx}px)`,
            width: `${setengahRentangTaliPx * 2}px`,
            bottom: '59px',
          }}
          className="absolute z-20 flex h-[14px] items-center rounded-full border-3 border-[#071236] bg-[#FF9100] shadow-[0_3px_0_#C56200]"
        >
          {/* Tekstur anyaman diagonal ramah kamera */}
          <div
            className="h-full w-full rounded-full opacity-55"
            style={{
              backgroundImage:
                'repeating-linear-gradient(125deg, #FFBA5C 0px, #FFBA5C 7px, #C56200 7px, #C56200 13px)',
            }}
          />
          {/* Simpul ikatan tali pada penarik terdepan kiri & kanan */}
          <div
            style={{ left: `${setengahRentangTaliPx - 76}px` }}
            className="absolute -top-1.5 h-5 w-4 rounded-md border-2 border-[#071236] bg-[#FF9100]"
          />
          <div
            style={{ right: `${setengahRentangTaliPx - 76}px` }}
            className="absolute -top-1.5 h-5 w-4 rounded-md border-2 border-[#071236] bg-[#FF9100]"
          />
          {/* Pita penanda tengah pada tali */}
          <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-3 border-[#071236] bg-[#FFD400]">
            <Flag size={13} className="text-[#B80023]" fill="#B80023" />
          </div>
        </div>

        {/* LAPISAN C (z-30): TANGAN MENGGENGGAM TALI DI DEPAN */}
        {daftarPenarikKiri.map((p) => (
          <div
            key={`hand_kiri_${p.idx}`}
            style={{ left: `calc(50% + ${p.leftPx}px)`, bottom: '0px' }}
            className="pointer-events-none absolute z-30"
          >
            <MascotChibi
              varian={p.varian}
              tim="merah"
              ukuran={tinggiKarakterPx}
              menghadap="kanan"
              pegangTali
              indeksKarakter={p.idx}
              pose={poseKiri}
              bagian="tangan"
            />
          </div>
        ))}

        {daftarPenarikKanan.map((p) => (
          <div
            key={`hand_kanan_${p.idx}`}
            style={{ left: `calc(50% + ${p.leftPx}px)`, bottom: '0px' }}
            className="pointer-events-none absolute z-30"
          >
            <MascotChibi
              varian={p.varian}
              tim="biru"
              ukuran={tinggiKarakterPx}
              menghadap="kiri"
              pegangTali
              indeksKarakter={p.idx + 1}
              pose={poseKanan}
              bagian="tangan"
            />
          </div>
        ))}

        {/* LAPISAN D (z-40): PENANDA & LABEL SELISIH TALI DI ATAS KEPALA PENARIK */}
        <div
          style={{ left: '50%', bottom: '166px' }}
          className="absolute z-40 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap"
        >
          <div
            className={`rounded-xl border-3 border-[#071236] px-4 py-1 font-display text-sm font-bold shadow-[0_4px_0_#071236] ${
              posisiTali < 0
                ? 'bg-[#FF1744] text-white'
                : posisiTali > 0
                  ? 'bg-[#1E6BFF] text-white'
                  : 'bg-[#FFD400] text-[#071236]'
            }`}
          >
            {labelStatusTali}
          </div>
          {unggulBatas && (
            <div
              className={`rounded-xl border-3 border-[#071236] px-3 py-1 font-display text-xs font-bold shadow-[0_4px_0_#071236] ${
                unggulBatas === 'merah' ? 'bg-[#FFD400] text-[#B80023]' : 'bg-[#FFD400] text-[#0A2FA8]'
              }`}
            >
              UNGGUL DI GARIS!
            </div>
          )}
        </div>

        {/* Komentar lucu singkat di atas karakter (hilang 2 detik) */}
        {komentarAktif && (
          <div
            key={komentarAktif.id + komentarAktif.teks}
            style={{ left: `calc(50% + ${komentarAktif.posisiX}px)`, bottom: '154px' }}
            className="anim-komentar absolute z-40 -translate-x-1/2 whitespace-nowrap rounded-xl border-3 border-[#071236] bg-[#FFD400] px-3 py-1 font-display text-xs font-bold text-[#071236] shadow-[0_4px_0_#071236]"
          >
            {komentarAktif.teks}
          </div>
        )}
      </div>

      {/* Kedip/garis peringatan halus dekat garis (tanpa strobe cepat bila modeRekam aktif) */}
      {(dekatGarisMerahTerancam || dekatGarisBiruTerancam) && !modeRekam && (
        <div
          className={`pointer-events-none absolute inset-y-0 z-10 w-3 opacity-75 ${
            dekatGarisMerahTerancam ? 'left-0 bg-[#FF1744]' : 'right-0 bg-[#1E6BFF]'
          }`}
        />
      )}
    </section>
  );
};

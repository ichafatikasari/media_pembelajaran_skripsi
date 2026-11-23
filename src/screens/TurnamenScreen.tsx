import React, { useEffect } from 'react';
import { Award, Play, RotateCcw, Trophy, Users } from 'lucide-react';
import { useAppStore } from '../app/store';
import { AutoFitText } from '../components/AutoFitText';
import { BelumAdaGameCard } from '../components/BelumAdaGameCard';
import { Button3D } from '../components/Button3D';
import { RuteHash } from '../data/types';
import { ringkasSoalSnapshot } from '../engine/hasilRekap';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import { ambilPeringkatTurnamen, LagaTurnamenSlot, SesiTurnamen4Tim } from '../engine/session';
import { tandaiInteraksiAudio } from '../utils/audio';

interface TurnamenScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

interface KartuLagaBaganProps {
  judul: string;
  slot: LagaTurnamenSlot;
  turnamen: SesiTurnamen4Tim;
  sedangGiliran: boolean;
  labelDefaultKiri: string;
  labelDefaultKanan: string;
}

const KartuLagaBagan: React.FC<KartuLagaBaganProps> = ({
  judul,
  slot,
  turnamen,
  sedangGiliran,
  labelDefaultKiri,
  labelDefaultKanan,
}) => {
  const timKiri = slot.timKiriIdx !== undefined ? turnamen.tim[slot.timKiriIdx] : null;
  const timKanan = slot.timKananIdx !== undefined ? turnamen.tim[slot.timKananIdx] : null;
  const namaKiri = timKiri?.nama ?? labelDefaultKiri;
  const namaKanan = timKanan?.nama ?? labelDefaultKanan;

  const kiriMenang = slot.selesai && slot.pemenangIdx === slot.timKiriIdx;
  const kananMenang = slot.selesai && slot.pemenangIdx === slot.timKananIdx;

  return (
    <div
      className={`kartu-3d flex flex-col justify-between rounded-3xl border-4 p-4 ${
        sedangGiliran
          ? 'border-[#FFD400] bg-[#173287]'
          : slot.selesai
            ? 'border-[#00C853] bg-[#12276B]'
            : 'border-[#3C62D4] bg-[#0B1B4D]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-display text-sm font-bold text-[#FFD400]">{judul}</span>
        <span
          className={`font-display rounded-lg border-2 border-[#071236] px-2.5 py-0.5 text-xs font-bold ${
            slot.selesai
              ? 'bg-[#00C853] text-[#071236]'
              : sedangGiliran
                ? 'bg-[#FFD400] text-[#071236]'
                : 'bg-[#071236] text-[#DCE7FF]'
          }`}
        >
          {slot.selesai ? 'SELESAI' : sedangGiliran ? 'SIAP MAIN' : 'MENUNGGU'}
        </span>
      </div>

      <div className="space-y-2">
        {/* Tim Kiri (tampil Merah saat bertanding) */}
        <div
          className={`flex items-center justify-between rounded-2xl border-2 px-3 py-2 ${
            kiriMenang
              ? 'border-[#FFD400] bg-[#B80023]'
              : 'border-[#FF6B86] bg-[#7A0018]'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-display text-base font-bold text-white">
              <span>▲</span>
              <span className="truncate">{namaKiri}</span>
              {kiriMenang && (
                <span className="rounded bg-[#FFD400] px-1.5 py-0.5 text-[10px] text-[#071236]">
                  LOLOS
                </span>
              )}
            </div>
            {timKiri && (
              <div className="truncate text-[11px] font-semibold text-[#FFD400]">
                {timKiri.anggota.slice(0, 4).join(', ')}
                {timKiri.anggota.length > 4 ? ` (+${timKiri.anggota.length - 4})` : ''}
              </div>
            )}
          </div>
          <span className="font-display tabular-angka ml-2 text-2xl font-bold text-white">
            {slot.hasil ? slot.hasil.skorMerah : '-'}
          </span>
        </div>

        {/* Tim Kanan (tampil Biru saat bertanding) */}
        <div
          className={`flex items-center justify-between rounded-2xl border-2 px-3 py-2 ${
            kananMenang
              ? 'border-[#FFD400] bg-[#0A2FA8]'
              : 'border-[#669BFF] bg-[#071F70]'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-display text-base font-bold text-white">
              <span>●</span>
              <span className="truncate">{namaKanan}</span>
              {kananMenang && (
                <span className="rounded bg-[#FFD400] px-1.5 py-0.5 text-[10px] text-[#071236]">
                  LOLOS
                </span>
              )}
            </div>
            {timKanan && (
              <div className="truncate text-[11px] font-semibold text-[#DCE7FF]">
                {timKanan.anggota.slice(0, 4).join(', ')}
                {timKanan.anggota.length > 4 ? ` (+${timKanan.anggota.length - 4})` : ''}
              </div>
            )}
          </div>
          <span className="font-display tabular-angka ml-2 text-2xl font-bold text-white">
            {slot.hasil ? slot.hasil.skorBiru : '-'}
          </span>
        </div>
      </div>

      {slot.hasil && (
        <div className="mt-2 space-y-0.5 text-xs font-bold">
          <div className="flex items-center justify-between text-[#57E893]">
            <span>Pemenang: {slot.hasil.namaPemenang}</span>
            <span className="tabular-angka text-[#FFD400]">
              Selisih Tali:{' '}
              {slot.hasil.posisiTaliAkhir > 0
                ? `+${slot.hasil.posisiTaliAkhir}`
                : slot.hasil.posisiTaliAkhir}
            </span>
          </div>
          {slot.hasil.keteranganMenang && (
            <div className="text-[11px] text-[#DCE7FF]">{slot.hasil.keteranganMenang}</div>
          )}
        </div>
      )}
    </div>
  );
};

export const TurnamenScreen: React.FC<TurnamenScreenProps> = ({ onNavigasi }) => {
  const {
    gameAktif,
    sesiMode,
    hasilSesi,
    mulaiSesiTurnamenBaru,
    siapkanLagaDariSesiMode,
    simpanHasilPertandinganKeRiwayat,
    bukaDetailRiwayatHasil,
  } = useAppStore();

  useEffect(() => {
    if (!gameAktif) return;
    if (!sesiMode || sesiMode.mode !== '4tim' || sesiMode.gameId !== gameAktif.id) {
      mulaiSesiTurnamenBaru(gameAktif);
    }
  }, [gameAktif, mulaiSesiTurnamenBaru, sesiMode]);

  if (!gameAktif) {
    return (
      <BelumAdaGameCard
        judul="Belum ada game untuk turnamen"
        keterangan="Buat game baru atau pilih game di Game Saya untuk memulai mode Turnamen 4 Tim."
        onNavigasi={onNavigasi}
        tampilkanBeranda
      />
    );
  }

  const turnamen = sesiMode?.mode === '4tim' ? sesiMode.turnamen : undefined;
  if (!turnamen) {
    return null;
  }

  const tahap = turnamen.tahapSaatIni;
  const soalTerpakaiCount = sesiMode?.terpakaiIds.length ?? 0;
  const sisaSoalBelumTerpakai = Math.max(0, gameAktif.soal.length - soalTerpakaiCount);

  const labelTombolUtama =
    tahap === 'semifinal1'
      ? 'MULAI SEMIFINAL 1'
      : tahap === 'semifinal2'
        ? 'MULAI SEMIFINAL 2'
        : tahap === 'final'
          ? 'MULAI FINAL TURNAMEN'
          : 'LIHAT PODIUM JUARA & REKAP';

  const handleMulaiPertandinganBerikutnya = () => {
    tandaiInteraksiAudio();
    if (tahap === 'selesai') {
      if (hasilSesi.riwayatHasilId && hasilSesi.mode === '4tim' && hasilSesi.gameId === gameAktif.id) {
        bukaDetailRiwayatHasil(hasilSesi.riwayatHasilId);
      } else {
        const finalHasil = turnamen.final.hasil;
        const semuaRiwayat = sesiMode?.riwayatLaga.flatMap((l) => l.riwayat) ?? [];
        const p = ambilPeringkatTurnamen(turnamen);
        if (finalHasil) {
          simpanHasilPertandinganKeRiwayat(
            {
              gameId: gameAktif.id,
              judulGame: gameAktif.judul,
              mapel: gameAktif.mapel,
              namaSekolah: gameAktif.namaSekolah,
              mode: '4tim',
              labelLaga: 'Final Turnamen 4 Tim',
              namaTimKiri: finalHasil.namaTimKiri,
              namaTimKanan: finalHasil.namaTimKanan,
              posisiTaliAkhir: finalHasil.posisiTaliAkhir,
              langkahKeGaris: gameAktif.pengaturan.langkahKeGaris,
              pemenang: finalHasil.pemenangSisi,
              alasanAkhir: finalHasil.alasanAkhir,
              caraMenang: finalHasil.caraMenang ?? null,
              keteranganMenang: finalHasil.keteranganMenang ?? null,
              durasiDetik: 0,
              jumlahPenarik: gameAktif.pengaturan.jumlahPenarik,
              riwayat: semuaRiwayat,
              soalSnapshot: ringkasSoalSnapshot(gameAktif.soal),
              turnamenSnapshot: {
                juara1: p.juara1,
                juara2: p.juara2,
                juara3Bersama: p.juara3Bersama,
                laga: [
                  { judul: 'Semifinal 1', slot: turnamen.semifinal1 },
                  { judul: 'Semifinal 2', slot: turnamen.semifinal2 },
                  { judul: 'Final Turnamen', slot: turnamen.final },
                ]
                  .filter((x) => Boolean(x.slot.hasil))
                  .map((x) => ({
                    judul: x.judul,
                    namaTimKiri: x.slot.hasil!.namaTimKiri,
                    namaTimKanan: x.slot.hasil!.namaTimKanan,
                    skorMerah: x.slot.hasil!.skorMerah,
                    skorBiru: x.slot.hasil!.skorBiru,
                    namaPemenang: x.slot.hasil!.namaPemenang,
                    posisiTaliAkhir: x.slot.hasil!.posisiTaliAkhir,
                  })),
              },
            },
            { bukaDetail: true }
          );
        }
      }
      onNavigasi('/hasil');
      return;
    }

    hapusSesiMatchSessionStorage();
    const disiapkan = siapkanLagaDariSesiMode();
    if (disiapkan) {
      onNavigasi('/main');
    }
  };

  const handleResetTurnamen = () => {
    tandaiInteraksiAudio();
    hapusSesiMatchSessionStorage();
    mulaiSesiTurnamenBaru(gameAktif);
  };

  const peringkat = tahap === 'selesai' ? ambilPeringkatTurnamen(turnamen) : null;

  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 bg-[#0B1B4D] px-8 py-4">
      {/* Header Bagan Turnamen */}
      <div className="kartu-3d flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            <Trophy size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display teks-outline-tebal text-2xl font-bold text-[#FFD400]">
              BAGAN TURNAMEN 4 TIM · {gameAktif.judul}
            </h1>
            <p className="text-sm font-bold text-[#DCE7FF]">
              Guru mengendalikan kapan pertandingan dimulai · Setiap pertandingan tampil Merah (kiri) vs Biru (kanan) dengan soal baru.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-1.5 text-right text-xs font-bold">
            <div className="text-[#FFD400]">SISA SOAL BELUM TERPAKAI</div>
            <div className="tabular-angka text-base text-[#57E893]">
              {sisaSoalBelumTerpakai} / {gameAktif.soal.length} Soal
            </div>
          </div>
          <Button3D variant="oranye" size="md" onClick={handleResetTurnamen}>
            <RotateCcw size={18} />
            <span>Reset Turnamen</span>
          </Button3D>
        </div>
      </div>

      {/* Bagan Visual 4 Tim -> 2 Semifinal -> 1 Final */}
      <div className="grid min-h-0 flex-1 grid-cols-12 items-center gap-3">
        {/* Kolom Semifinal */}
        <div className="col-span-5 flex h-full flex-col justify-center gap-4">
          <KartuLagaBagan
            judul="SEMIFINAL 1 (Tim 1 vs Tim 2)"
            slot={turnamen.semifinal1}
            turnamen={turnamen}
            sedangGiliran={tahap === 'semifinal1'}
            labelDefaultKiri="Tim 1"
            labelDefaultKanan="Tim 2"
          />
          <KartuLagaBagan
            judul="SEMIFINAL 2 (Tim 3 vs Tim 4)"
            slot={turnamen.semifinal2}
            turnamen={turnamen}
            sedangGiliran={tahap === 'semifinal2'}
            labelDefaultKiri="Tim 3"
            labelDefaultKanan="Tim 4"
          />
        </div>

        {/* Garis Penghubung Bagan */}
        <div className="col-span-2 flex h-full items-center justify-center">
          <svg viewBox="0 0 180 340" className="h-[320px] w-full">
            <path
              d="M 8 85 H 88 V 170 H 172"
              stroke={turnamen.semifinal1.selesai ? '#00C853' : '#FFD400'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M 8 255 H 88 V 170 H 172"
              stroke={turnamen.semifinal2.selesai ? '#00C853' : '#FFD400'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="172" cy="170" r="10" fill="#FFD400" stroke="#071236" strokeWidth="4" />
          </svg>
        </div>

        {/* Kolom Final & Peringkat */}
        <div className="col-span-5 flex h-full flex-col justify-center gap-4">
          <KartuLagaBagan
            judul="FINAL JUARA TURNAMEN"
            slot={turnamen.final}
            turnamen={turnamen}
            sedangGiliran={tahap === 'final'}
            labelDefaultKiri="Pemenang Semifinal 1"
            labelDefaultKanan="Pemenang Semifinal 2"
          />

          <div className="kartu-3d rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-4">
            <div className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-[#FFD400]">
              <Award size={18} />
              <span>STATUS PERINGKAT TURNAMEN</span>
            </div>
            {peringkat ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border-2 border-[#FFD400] bg-[#7D3D00] p-2">
                  <div className="text-[11px] font-bold text-[#FFD400]">JUARA 1</div>
                  <div className="h-[28px]">
                    <AutoFitText maxFontSize={18} minFontSize={12} align="center" className="font-display font-bold text-white">
                      {peringkat.juara1}
                    </AutoFitText>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[#669BFF] bg-[#071F70] p-2">
                  <div className="text-[11px] font-bold text-[#DCE7FF]">JUARA 2</div>
                  <div className="h-[28px]">
                    <AutoFitText maxFontSize={18} minFontSize={12} align="center" className="font-display font-bold text-white">
                      {peringkat.juara2}
                    </AutoFitText>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[#57E893] bg-[#005724] p-2">
                  <div className="text-[11px] font-bold text-[#57E893]">JUARA 3 BERSAMA</div>
                  <div className="truncate font-display text-xs font-bold text-white">
                    {peringkat.juara3Bersama[0]} & {peringkat.juara3Bersama[1]}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-semibold text-[#DCE7FF]">
                <Users size={18} className="shrink-0 text-[#57E893]" />
                <span>
                  {tahap === 'semifinal1'
                    ? 'Laga ke-1 siap: Semifinal 1 antara Tim 1 dan Tim 2.'
                    : tahap === 'semifinal2'
                      ? `${turnamen.semifinal1.hasil?.namaPemenang} lolos ke Final! Selanjutnya Semifinal 2.`
                      : `Final siap: ${turnamen.semifinal1.hasil?.namaPemenang} vs ${turnamen.semifinal2.hasil?.namaPemenang}!`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tombol Kontrol Guru di Bawah */}
      <div className="flex shrink-0 items-center justify-between rounded-2xl border-3 border-[#2A4CB8] bg-[#071236] px-6 py-3">
        <Button3D variant="navy" size="md" onClick={() => onNavigasi('/pengaturan')}>
          Ubah Pengaturan Tim
        </Button3D>

        <Button3D variant="hijau" size="xl" onClick={handleMulaiPertandinganBerikutnya}>
          <Play size={26} fill="currentColor" />
          <span>{labelTombolUtama}</span>
        </Button3D>
      </div>
    </div>
  );
};

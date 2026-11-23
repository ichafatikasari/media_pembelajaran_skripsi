import React, { useEffect } from 'react';
import { Dices, Flag, Play, Swords, Trophy } from 'lucide-react';
import { useAppStore } from '../app/store';
import { AutoFitText } from '../components/AutoFitText';
import { BelumAdaGameCard } from '../components/BelumAdaGameCard';
import { Button3D } from '../components/Button3D';
import { MascotChibi } from '../components/MascotChibi';
import { RuteHash } from '../data/types';
import { ambilPasanganNamaTimResmi, ringkasSoalSnapshot } from '../engine/hasilRekap';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import { tandaiInteraksiAudio } from '../utils/audio';

interface DuelScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

export const DuelScreen: React.FC<DuelScreenProps> = ({ onNavigasi }) => {
  const {
    gameAktif,
    sesiMode,
    hasilSesi,
    mulaiSesiDuelBaru,
    siapkanLagaDariSesiMode,
    akhiriDuelSekarang,
    simpanHasilPertandinganKeRiwayat,
    bukaDetailRiwayatHasil,
  } = useAppStore();

  useEffect(() => {
    if (!gameAktif) return;
    if (!sesiMode || sesiMode.mode !== '1lawan1' || sesiMode.gameId !== gameAktif.id) {
      mulaiSesiDuelBaru(gameAktif);
    }
  }, [gameAktif, mulaiSesiDuelBaru, sesiMode]);

  if (!gameAktif) {
    return (
      <BelumAdaGameCard
        judul="Belum ada game untuk duel"
        keterangan="Buat game baru atau pilih game di Game Saya untuk memulai mode 1 Lawan 1."
        onNavigasi={onNavigasi}
        tampilkanBeranda
      />
    );
  }

  const duel = sesiMode?.mode === '1lawan1' ? sesiMode.duel : undefined;
  if (!duel) {
    return null;
  }

  const partaiAktif = duel.daftarDuel[duel.indeksPartaiAktif];
  const semuaSelesai = duel.selesaiSemua;
  const adaMinimalSatuSelesai = duel.daftarDuel.some((p) => p.selesai);

  const handleMulaiDuelBerikutnya = () => {
    tandaiInteraksiAudio();
    if (semuaSelesai) return;
    hapusSesiMatchSessionStorage();
    const siap = siapkanLagaDariSesiMode();
    if (siap) {
      onNavigasi('/main');
    }
  };

  const handleSelesaiDanLihatJuara = () => {
    tandaiInteraksiAudio();
    const finalSesi = akhiriDuelSekarang() ?? sesiMode;
    if (hasilSesi.riwayatHasilId && hasilSesi.mode === '1lawan1' && hasilSesi.gameId === gameAktif.id) {
      bukaDetailRiwayatHasil(hasilSesi.riwayatHasilId);
      onNavigasi('/hasil');
      return;
    }
    const lagaTerakhir = finalSesi?.riwayatLaga[finalSesi.riwayatLaga.length - 1];
    const [namaDefKiri, namaDefKanan] = ambilPasanganNamaTimResmi(gameAktif.pengaturan);
    const semuaRiwayat = finalSesi?.riwayatLaga.flatMap((l) => l.riwayat) ?? [];

    simpanHasilPertandinganKeRiwayat(
      {
        gameId: gameAktif.id,
        judulGame: gameAktif.judul,
        mapel: gameAktif.mapel,
        namaSekolah: gameAktif.namaSekolah,
        mode: '1lawan1',
        labelLaga: 'Rekap Duel 1 Lawan 1',
        namaTimKiri: namaDefKiri,
        namaTimKanan: namaDefKanan,
        posisiTaliAkhir: lagaTerakhir?.posisiTaliAkhir ?? 0,
        langkahKeGaris: gameAktif.pengaturan.langkahKeGaris,
        pemenang: lagaTerakhir?.hasilSeri ? 'seri' : (lagaTerakhir?.pemenangSisi ?? 'seri'),
        alasanAkhir: lagaTerakhir?.alasanAkhir ?? 'waktu',
        caraMenang: lagaTerakhir?.caraMenang ?? null,
        keteranganMenang: lagaTerakhir?.keteranganMenang ?? null,
        durasiDetik: 0,
        jumlahPenarik: 3,
        riwayat: semuaRiwayat,
        soalSnapshot: ringkasSoalSnapshot(gameAktif.soal),
        duelSnapshot: finalSesi?.duel?.papanKemenangan,
      },
      { bukaDetail: true }
    );
    onNavigasi('/hasil');
  };

  const handleUndiUlang = () => {
    tandaiInteraksiAudio();
    hapusSesiMatchSessionStorage();
    mulaiSesiDuelBaru(gameAktif);
  };

  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 bg-[#0B1B4D] px-8 py-4">
      {/* Header Duel 1 Lawan 1 */}
      <div className="kartu-3d flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FF9100] text-[#071236]">
            <Swords size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display teks-outline-tebal text-2xl font-bold text-[#FFD400]">
              MODE 1 LAWAN 1 (DUEL) · {gameAktif.judul}
            </h1>
            <p className="text-sm font-bold text-[#DCE7FF]">
              Satu siswa di kiri (Merah ▲) melawan satu siswa di kanan (Biru ●), tanpa estafet · Durasi{' '}
              {gameAktif.pengaturan.akhirPermainan === 'soalHabis'
                ? 'Soal Habis'
                : `${Math.round(gameAktif.pengaturan.durasiWaktu * 60)} detik`}.
            </p>
          </div>
        </div>

        <Button3D variant="ungu" size="md" onClick={handleUndiUlang}>
          <Dices size={20} />
          <span>Acak Ulang Pasangan</span>
        </Button3D>
      </div>

      {/* Konten Utama: Duel Berikutnya + Antrean Partai & Papan Kemenangan Sesi */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        {/* Kolom Kiri (7 col): Kartu Duel Berikutnya + Daftar Partai */}
        <div className="col-span-7 flex min-h-0 flex-col gap-3">
          {/* Kartu Duel Berikutnya */}
          <div className="kartu-3d flex shrink-0 flex-col items-center rounded-3xl border-4 border-[#00C853] bg-[#173287] p-5">
            {semuaSelesai ? (
              <div className="py-4 text-center">
                <p className="font-display text-3xl font-bold text-[#FFD400]">
                  SEMUA PARTAI DUEL SELESAI!
                </p>
                <p className="mt-1 text-base font-bold text-[#DCE7FF]">
                  Klik tombol &quot;Selesai &amp; Lihat Papan Juara&quot; untuk melihat podium dan mengunduh rekap CSV.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-display rounded-xl border-2 border-[#071236] bg-[#FFD400] px-3 py-0.5 text-sm font-bold text-[#071236]">
                    DUEL BERIKUTNYA · PARTAI {partaiAktif.nomorPartai} / {duel.daftarDuel.length}
                  </span>
                  {partaiAktif.siswaMainDuaKali && (
                    <span className="font-display rounded-xl border-2 border-[#071236] bg-[#FF9100] px-3 py-0.5 text-xs font-bold text-[#071236]">
                      Peserta ganjil: {partaiAktif.siswaMainDuaKali} mendapat giliran ke-2 acak
                    </span>
                  )}
                </div>

                <div className="grid w-full grid-cols-11 items-center gap-3">
                  <div className="col-span-5 flex items-center gap-3 rounded-2xl border-3 border-[#FF6B86] bg-[#7A0018] px-4 py-2.5">
                    <MascotChibi varian="hijab" tim="merah" ukuran={76} menghadap="kanan" pegangTali={false} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#FFD400]">▲ SISI MERAH</div>
                      <div className="h-[34px]">
                        <AutoFitText maxFontSize={26} minFontSize={14} className="font-display font-bold text-white">
                          {partaiAktif.kiri}
                        </AutoFitText>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 text-center font-display teks-outline-tebal text-3xl font-bold text-[#FFD400]">
                    VS
                  </div>

                  <div className="col-span-5 flex items-center justify-end gap-3 rounded-2xl border-3 border-[#669BFF] bg-[#071F70] px-4 py-2.5 text-right">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#FFD400]">● SISI BIRU</div>
                      <div className="h-[34px]">
                        <AutoFitText maxFontSize={26} minFontSize={14} align="right" className="font-display font-bold text-white">
                          {partaiAktif.kanan}
                        </AutoFitText>
                      </div>
                    </div>
                    <MascotChibi varian="putra" tim="biru" ukuran={76} menghadap="kiri" pegangTali={false} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Daftar Partai Duel */}
          <div className="kartu-3d flex min-h-0 flex-1 flex-col rounded-3xl border-3 border-[#3C62D4] bg-[#12276B] p-4">
            <h2 className="font-display mb-2 shrink-0 text-base font-bold text-[#FFD400]">
              Daftar Pasangan Duel ({duel.daftarDuel.length} Partai)
            </h2>
            <div className="scroll-guru flex-1 space-y-2 pr-1">
              {duel.daftarDuel.map((p, idx) => {
                const aktif = !semuaSelesai && idx === duel.indeksPartaiAktif;
                return (
                  <div
                    key={p.nomorPartai}
                    className={`flex items-center justify-between rounded-2xl border-2 px-4 py-2 text-sm font-bold ${
                      p.selesai
                        ? 'border-[#00C853] bg-[#005724]/70 text-white'
                        : aktif
                          ? 'border-[#FFD400] bg-[#173287] text-white'
                          : 'border-[#2A4CB8] bg-[#071236] text-[#DCE7FF]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="tabular-angka rounded-lg bg-[#071236] px-2 py-0.5 text-xs text-[#FFD400]">
                        #{p.nomorPartai}
                      </span>
                      <span>
                        ▲ {p.kiri} <span className="text-[#FFD400]">vs</span> ● {p.kanan}
                      </span>
                      {p.siswaMainDuaKali && (
                        <span className="rounded bg-[#FF9100] px-2 py-0.5 text-[11px] text-[#071236]">
                          {p.siswaMainDuaKali} (2x)
                        </span>
                      )}
                    </div>
                    <span className="tabular-angka text-xs">
                      {p.selesai && p.hasil
                        ? p.hasil.hasilSeri
                          ? `Seri (${p.hasil.skorMerah}-${p.hasil.skorBiru})`
                          : `Menang: ${p.hasil.namaPemenang} (${p.hasil.skorMerah}-${p.hasil.skorBiru})`
                        : aktif
                          ? 'SIAP MAIN'
                          : 'Menunggu'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolom Kanan (5 col): Papan Kemenangan Sesi */}
        <div className="kartu-3d col-span-5 flex min-h-0 flex-col rounded-3xl border-3 border-[#3C62D4] bg-[#12276B] p-4">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[#FFD400]">
              <Trophy size={20} />
              <span>Papan Kemenangan Sesi</span>
            </h2>
            <span className="text-xs font-bold text-[#57E893]">
              {duel.daftarDuel.filter((p) => p.selesai).length}/{duel.daftarDuel.length} Duel Selesai
            </span>
          </div>

          <div className="scroll-guru flex-1 space-y-1.5 pr-1">
            {duel.papanKemenangan.map((p, idx) => (
              <div
                key={p.nama}
                className="flex items-center justify-between rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-3.5 py-2"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={`font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      idx === 0 ? 'bg-[#FFD400] text-[#071236]' : 'bg-[#173287] text-white'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="truncate font-display text-sm font-bold text-white">
                    {p.nama}
                  </span>
                  {p.mainDuaKali && (
                    <span className="rounded bg-[#FF9100] px-1.5 py-0.5 text-[10px] font-bold text-[#071236]">
                      2x
                    </span>
                  )}
                </div>
                <div className="tabular-angka flex shrink-0 items-center gap-3 text-xs font-bold">
                  <span className="text-[#57E893]">M:{p.menang}</span>
                  {(p.seri ?? 0) > 0 && <span className="text-[#DCE7FF]">S:{p.seri}</span>}
                  <span className="text-[#FF6B86]">K:{p.kalah}</span>
                  <span className="text-[#FFD400]">Benar:{p.totalBenar}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tombol Kontrol Bawah */}
      <div className="flex shrink-0 items-center justify-between rounded-2xl border-3 border-[#2A4CB8] bg-[#071236] px-6 py-3">
        <Button3D variant="navy" size="md" onClick={() => onNavigasi('/pengaturan')}>
          Ubah Daftar Siswa
        </Button3D>

        <div className="flex items-center gap-3">
          {(adaMinimalSatuSelesai || semuaSelesai) && (
            <Button3D variant="kuning" size="lg" onClick={handleSelesaiDanLihatJuara}>
              <Flag size={22} />
              <span>SELESAI &amp; LIHAT PAPAN JUARA</span>
            </Button3D>
          )}
          {!semuaSelesai && (
            <Button3D variant="hijau" size="xl" onClick={handleMulaiDuelBerikutnya}>
              <Play size={26} fill="currentColor" />
              <span>MULAI DUEL BERIKUTNYA</span>
            </Button3D>
          )}
        </div>
      </div>
    </div>
  );
};

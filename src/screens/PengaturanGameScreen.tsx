import React, { useEffect, useMemo, useState } from 'react';
import { Play, Save } from 'lucide-react';
import { useAppStore } from '../app/store';
import { BelumAdaGameCard } from '../components/BelumAdaGameCard';
import { Button3D } from '../components/Button3D';
import {
  bentukPengaturanFinalDariForm,
  normalisasiPengaturanAwal,
  PanelPengaturanGame,
} from '../components/PanelPengaturanGame';
import { PanelKeypadPin } from '../components/PinGuruModal';
import { Pengaturan, RuteHash } from '../data/types';
import {
  ambilPeringatanAwalDuel,
  buatPasanganDuelDenganTanda,
  hitungPerkiraanKebutuhanSoal,
  parseDaftarNama,
  PasanganDuelTerundi,
  validasiMulaiDuel,
} from '../engine/deal';
import { buatPengaturanDefault } from '../engine/gameEngine';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import { ambilVolumeAudio } from '../utils/audio';

interface PengaturanGameScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

export const PengaturanGameScreen: React.FC<PengaturanGameScreenProps> = ({ onNavigasi }) => {
  const {
    gameAktif,
    pinEditTerbukaId,
    bukaIzinEditDenganPin,
    perbaruiPengaturanGameAktif,
    mulaiSesiPembagian,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    resetSesiMode,
    tampilkanToast,
  } = useAppStore();

  const pengaturanDefault = useMemo(() => buatPengaturanDefault(), []);
  const pengaturanSumber = gameAktif?.pengaturan ?? pengaturanDefault;
  const pinAktif = (pengaturanSumber.pinGuru ?? '').trim();
  const terkunciPin = Boolean(gameAktif && pinAktif.length > 0 && pinEditTerbukaId !== gameAktif.id);

  const [judul, setJudul] = useState(gameAktif?.judul ?? '');
  const [mapel, setMapel] = useState(gameAktif?.mapel ?? '');
  const [namaSekolah, setNamaSekolah] = useState(gameAktif?.namaSekolah ?? '');
  const [form, setForm] = useState<Pengaturan>(() =>
    normalisasiPengaturanAwal(pengaturanSumber)
  );
  const [teksAnggota, setTeksAnggota] = useState<string[]>(() =>
    [0, 1, 2, 3].map((i) => (pengaturanSumber.anggota[i] ?? []).join('\n'))
  );
  const [teksDaftarDuel, setTeksDaftarDuel] = useState<string>(() =>
    [...(pengaturanSumber.anggota[0] ?? []), ...(pengaturanSumber.anggota[1] ?? [])].join('\n')
  );
  const [pasanganDuel, setPasanganDuel] = useState<PasanganDuelTerundi[]>([]);
  const [volumeSuara, setVolumeSuara] = useState<number>(() => Math.round(ambilVolumeAudio() * 100));

  useEffect(() => {
    if (!gameAktif) return;
    const norm = normalisasiPengaturanAwal(gameAktif.pengaturan);
    setJudul(gameAktif.judul);
    setMapel(gameAktif.mapel);
    setNamaSekolah(gameAktif.namaSekolah);
    setForm(norm);
    setTeksAnggota([0, 1, 2, 3].map((i) => (norm.anggota[i] ?? []).join('\n')));
    setTeksDaftarDuel([...(norm.anggota[0] ?? []), ...(norm.anggota[1] ?? [])].join('\n'));
    setPasanganDuel([]);
  }, [gameAktif]);

  const pengaturanLive = useMemo(
    () => bentukPengaturanFinalDariForm(form, teksAnggota, teksDaftarDuel),
    [form, teksAnggota, teksDaftarDuel]
  );

  const jumlahSoalUtama = useMemo(
    () => (gameAktif?.soal ?? []).filter((s) => !s.cadangan).length,
    [gameAktif?.soal]
  );
  const jumlahSoalCadangan = useMemo(
    () => (gameAktif?.soal ?? []).filter((s) => Boolean(s.cadangan)).length,
    [gameAktif?.soal]
  );
  const perkiraanSoal = useMemo(
    () => hitungPerkiraanKebutuhanSoal(pengaturanLive, jumlahSoalUtama),
    [pengaturanLive, jumlahSoalUtama]
  );
  const peringatanAwal = useMemo(
    () =>
      gameAktif
        ? ambilPeringatanAwalDuel({ ...gameAktif, pengaturan: pengaturanLive })
        : [],
    [gameAktif, pengaturanLive]
  );

  if (!gameAktif) {
    return (
      <BelumAdaGameCard
        judul="Belum ada game untuk diatur"
        keterangan="Buat game baru terlebih dahulu, pilih game dari Game Saya, atau masuk menggunakan kode 8 karakter."
        onNavigasi={onNavigasi}
        tampilkanBeranda
      />
    );
  }

  const handleSimpan = () => {
    const final = bentukPengaturanFinalDariForm(form, teksAnggota, teksDaftarDuel);
    perbaruiPengaturanGameAktif(final, { judul, mapel, namaSekolah });
  };

  const handleMulaiDuel = () => {
    const final = bentukPengaturanFinalDariForm(form, teksAnggota, teksDaftarDuel);
    const gameDisiapkan = perbaruiPengaturanGameAktif(final, { judul, mapel, namaSekolah });
    if (!gameDisiapkan) return;
    const cek = validasiMulaiDuel(gameDisiapkan);
    if (!cek.valid) {
      tampilkanToast(cek.pesanError[0], 'error');
      return;
    }

    hapusSesiMatchSessionStorage();

    if (final.mode === '4tim') {
      mulaiSesiTurnamenBaru(gameDisiapkan);
      onNavigasi('/turnamen');
      return;
    }

    if (final.mode === '1lawan1') {
      let pasanganUntukMain = pasanganDuel;
      if (pasanganUntukMain.length === 0) {
        const daftar = parseDaftarNama(teksDaftarDuel);
        pasanganUntukMain =
          daftar.length >= 2
            ? buatPasanganDuelDenganTanda(daftar)
            : [{ kiri: final.namaTim[0] || 'Pemain 1', kanan: final.namaTim[1] || 'Pemain 2' }];
      }
      mulaiSesiDuelBaru(gameDisiapkan, pasanganUntukMain);
      onNavigasi('/duel');
      return;
    }

    resetSesiMode();
    mulaiSesiPembagian(gameDisiapkan, []);
    onNavigasi('/main');
  };

  if (terkunciPin) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] px-8 py-6">
        <div className="kartu-3d w-full max-w-[540px] rounded-3xl border-4 border-[#FFD400] bg-[#12276B] p-7">
          <h1 className="font-display mb-2 text-center text-2xl font-bold text-[#FFD400]">
            Pengaturan Game Dilindungi PIN Guru
          </h1>
          <PanelKeypadPin
            judulKeterangan={`Masukkan PIN Guru (4 angka) untuk mengubah pengaturan game "${gameAktif.judul}".`}
            pinBenar={pinAktif}
            labelTombolBuka="Buka Pengaturan"
            onBerhasil={() => bukaIzinEditDenganPin(gameAktif.id)}
            onBatal={() => onNavigasi('/game-saya')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[#0B1B4D] px-8 py-5">
      {/* Header Aksi */}
      <div className="flex shrink-0 items-center justify-between rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-6 py-3 shadow-[0_6px_0_#071236]">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#FFD400]">Pengaturan Game</h1>
          <p className="text-sm text-[#DCE7FF]">
            Bank soal saat ini:{' '}
            <strong className="tabular-angka text-white">{gameAktif.soal.length} soal</strong>{' '}
            <span className="text-[#57E893]">
              ({jumlahSoalUtama} utama · {jumlahSoalCadangan} cadangan)
            </span>{' '}
            · Sesuaikan tim, waktu, dan aturan tarik tambang sebelum duel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button3D variant="biru" size="md" onClick={handleSimpan}>
            <Save size={20} />
            <span>SIMPAN</span>
          </Button3D>
          <Button3D variant="hijau" size="md" onClick={handleMulaiDuel}>
            <Play size={20} fill="currentColor" />
            <span>MULAI DUEL</span>
          </Button3D>
        </div>
      </div>

      <PanelPengaturanGame
        tampilkanIdentitas
        judul={judul}
        mapel={mapel}
        namaSekolah={namaSekolah}
        onChangeJudul={setJudul}
        onChangeMapel={setMapel}
        onChangeNamaSekolah={setNamaSekolah}
        form={form}
        setForm={setForm}
        teksAnggota={teksAnggota}
        setTeksAnggota={setTeksAnggota}
        teksDaftarDuel={teksDaftarDuel}
        setTeksDaftarDuel={setTeksDaftarDuel}
        pasanganDuel={pasanganDuel}
        setPasanganDuel={setPasanganDuel}
        jumlahSoalUtama={jumlahSoalUtama}
        perkiraanSoal={perkiraanSoal}
        peringatanAwal={peringatanAwal}
        volumeSuara={volumeSuara}
        setVolumeSuara={setVolumeSuara}
        onToast={tampilkanToast}
      />
    </div>
  );
};

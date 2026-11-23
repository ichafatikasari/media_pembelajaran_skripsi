import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Cloud,
  CopyPlus,
  Edit3,
  Eye,
  FileUp,
  FolderOpen,
  KeyRound,
  Lock,
  Pencil,
  Play,
  PlusSquare,
  RotateCcw,
  Settings,
  Share2,
  Square,
  Trash2,
} from 'lucide-react';
import { useAuthGuru } from '../app/AuthContext';
import { useAppStore } from '../app/store';
import { AutoFitText } from '../components/AutoFitText';
import { BagikanGameModal } from '../components/BagikanGameModal';
import { Button3D } from '../components/Button3D';
import { ImporPaketModal } from '../components/ImporPaketModal';
import { Modal } from '../components/Modal';
import { PinGuruModal } from '../components/PinGuruModal';
import { SampahGameModal } from '../components/SampahGameModal';
import { Game, RuteHash } from '../data/types';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import { hapusSesiModeSessionStorage } from '../engine/session';
import {
  ambilKodeOnlineTersimpanUntukGame,
  formatKodeKelompok,
  hapusGameOnline,
} from '../services/gameOnlineService';
import { tandaiInteraksiAudio } from '../utils/audio';

interface GameSayaScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

type AksiTertundaPin =
  | { jenis: 'panel_guru'; game: Game }
  | { jenis: 'ubah_soal'; game: Game }
  | { jenis: 'atur'; game: Game }
  | { jenis: 'ubah_nama'; game: Game }
  | { jenis: 'bagikan'; game: Game }
  | { jenis: 'hapus'; game: Game }
  | { jenis: 'hapus_massal'; game: Game; daftarTarget: Game[] };

type ModeHapusOnline = 'perangkat_saja' | 'perangkat_dan_online';

function formatTanggalIndonesia(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleDateString('id-ID');
  }
}

export const GameSayaScreen: React.FC<GameSayaScreenProps> = ({ onNavigasi }) => {
  const {
    daftarGame,
    daftarSampahGame,
    gameAktif,
    penyimpananTersedia,
    gameBaruDisorotId,
    bukaWizardBuatGame,
    pilihGameAktif,
    duplikasiGame,
    ubahNamaGame,
    imporGameDariPaket,
    hapusBanyakGame,
    pulihkanDariSampahGame,
    hapusPermanenDariSampahGame,
    kosongkanSemuaSampahGame,
    pulihkanContohGame,
    bukaIzinEditDenganPin,
    mulaiSesiPembagian,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    resetSesiMode,
    tampilkanToast,
  } = useAppStore();
  const { profilGuru } = useAuthGuru();

  const [gameDitinjau, setGameDitinjau] = useState<Game | null>(null);
  const [gameDibagikan, setGameDibagikan] = useState<Game | null>(null);
  const [gameDiubahNama, setGameDiubahNama] = useState<Game | null>(null);
  const [targetHapusList, setTargetHapusList] = useState<Game[]>([]);
  const [modeHapusOnline, setModeHapusOnline] = useState<ModeHapusOnline>('perangkat_saja');
  const [sedangHapusOnline, setSedangHapusOnline] = useState(false);
  const [modalImporTerbuka, setModalImporTerbuka] = useState(false);
  const [modalSampahTerbuka, setModalSampahTerbuka] = useState(false);
  const [idTerpilih, setIdTerpilih] = useState<string[]>([]);

  const [judulEdit, setJudulEdit] = useState('');
  const [mapelEdit, setMapelEdit] = useState('');
  const [sekolahEdit, setSekolahEdit] = useState('');

  const [aksiPinTertunda, setAksiPinTertunda] = useState<AksiTertundaPin | null>(null);

  useEffect(() => {
    const validIdSet = new Set(daftarGame.map((g) => g.id));
    setIdTerpilih((prev) => {
      const tersaring = prev.filter((id) => validIdSet.has(id));
      return tersaring.length === prev.length ? prev : tersaring;
    });
    if (gameDitinjau && !validIdSet.has(gameDitinjau.id)) {
      setGameDitinjau(null);
    }
  }, [daftarGame, gameDitinjau]);

  const semuaDipilih = daftarGame.length > 0 && idTerpilih.length === daftarGame.length;

  const infoOnlineTargetHapus = useMemo(() => {
    const pasangan: { game: Game; kode: string }[] = [];
    for (const g of targetHapusList) {
      const kode = ambilKodeOnlineTersimpanUntukGame(g.id);
      if (kode) {
        pasangan.push({ game: g, kode });
      }
    }
    return pasangan;
  }, [targetHapusList]);

  const bukaKonfirmasiHapus = (games: Game[]) => {
    if (games.length === 0) return;
    setTargetHapusList(games);
    setModeHapusOnline('perangkat_saja');
  };

  const eksekusiAksiSetelahPin = (aksi: AksiTertundaPin) => {
    const target = aksi.game;
    if (aksi.jenis === 'panel_guru') {
      setGameDitinjau(target);
    } else if (aksi.jenis === 'ubah_soal') {
      bukaIzinEditDenganPin(target.id);
      bukaWizardBuatGame(target.status === 'draf' ? 'lanjut_draf' : 'edit', target.id);
      onNavigasi('/buat-game');
    } else if (aksi.jenis === 'atur') {
      bukaIzinEditDenganPin(target.id);
      pilihGameAktif(target.id, true);
      onNavigasi('/pengaturan');
    } else if (aksi.jenis === 'ubah_nama') {
      setJudulEdit(target.judul);
      setMapelEdit(target.mapel);
      setSekolahEdit(target.namaSekolah);
      setGameDiubahNama(target);
    } else if (aksi.jenis === 'bagikan') {
      setGameDibagikan(target);
    } else if (aksi.jenis === 'hapus') {
      bukaKonfirmasiHapus([target]);
    } else if (aksi.jenis === 'hapus_massal') {
      bukaKonfirmasiHapus(aksi.daftarTarget);
    }
  };

  const jalankanDenganCekPin = (aksi: AksiTertundaPin) => {
    const pin = (aksi.game.pengaturan.pinGuru ?? '').trim();
    if (pin.length > 0) {
      setAksiPinTertunda(aksi);
    } else {
      eksekusiAksiSetelahPin(aksi);
    }
  };

  const handleTogglePilihGame = (id: string) => {
    setIdTerpilih((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleTogglePilihSemua = () => {
    if (semuaDipilih) {
      setIdTerpilih([]);
    } else {
      setIdTerpilih(daftarGame.map((g) => g.id));
    }
  };

  const handleKlikHapusTerpilih = () => {
    const idSet = new Set(idTerpilih);
    const daftarTarget = daftarGame.filter((g) => idSet.has(g.id));
    if (daftarTarget.length === 0) return;

    const gameBerpin = daftarTarget.find((g) => (g.pengaturan.pinGuru ?? '').trim().length > 0);
    if (gameBerpin) {
      setAksiPinTertunda({ jenis: 'hapus_massal', game: gameBerpin, daftarTarget });
      return;
    }
    bukaKonfirmasiHapus(daftarTarget);
  };

  const handleKonfirmasiHapusFinal = async () => {
    if (targetHapusList.length === 0 || sedangHapusOnline) return;
    const targetIds = targetHapusList.map((g) => g.id);
    const perluHapusOnline =
      Boolean(profilGuru) &&
      infoOnlineTargetHapus.length > 0 &&
      modeHapusOnline === 'perangkat_dan_online';

    let adaGagalOnline = false;
    if (perluHapusOnline) {
      setSedangHapusOnline(true);
      try {
        for (const { game, kode } of infoOnlineTargetHapus) {
          const hasil = await hapusGameOnline(kode);
          if (!hasil.ok) {
            adaGagalOnline = true;
            tampilkanToast(
              `Gagal menghapus versi online "${game.judul}" (${kode}): ${hasil.pesanError}`,
              'peringatan'
            );
          }
        }
      } finally {
        setSedangHapusOnline(false);
      }
    }

    hapusBanyakGame(targetIds, {
      hapusOnlineDihapus: perluHapusOnline && !adaGagalOnline,
    });
    setTargetHapusList([]);
    setIdTerpilih((prev) => prev.filter((id) => !targetIds.includes(id)));
  };

  const handleMainkanGame = (game: Game) => {
    tandaiInteraksiAudio();
    pilihGameAktif(game.id);
    hapusSesiMatchSessionStorage();
    hapusSesiModeSessionStorage();
    resetSesiMode();
    if (game.pengaturan.mode === '4tim') {
      mulaiSesiTurnamenBaru(game);
      onNavigasi('/turnamen');
      return;
    }
    if (game.pengaturan.mode === '1lawan1') {
      mulaiSesiDuelBaru(game);
      onNavigasi('/duel');
      return;
    }
    mulaiSesiPembagian(game);
    onNavigasi('/main');
  };

  const handleSimpanUbahNama = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameDiubahNama) return;
    ubahNamaGame(gameDiubahNama.id, judulEdit, mapelEdit, sekolahEdit);
    setGameDiubahNama(null);
  };

  const labelKeteranganPin = aksiPinTertunda
    ? aksiPinTertunda.jenis === 'panel_guru'
      ? 'Masukkan PIN Guru (4 angka) untuk membuka Panel Guru & kunci jawaban.'
      : aksiPinTertunda.jenis === 'bagikan'
        ? 'Masukkan PIN Guru (4 angka) untuk membagikan game, link, dan QR Code.'
        : aksiPinTertunda.jenis === 'hapus' || aksiPinTertunda.jenis === 'hapus_massal'
          ? 'Masukkan PIN Guru (4 angka) sebelum menghapus game ini.'
          : 'Masukkan PIN Guru (4 angka) untuk mengubah soal atau identitas game.'
    : '';

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[#0B1B4D] px-8 py-5">
      {/* Header Layar */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#2A4CB8] bg-[#12276B] px-6 py-4 shadow-[0_8px_0_#071236]">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#FFD400]">Game Saya</h1>
          <p className="text-bacaan text-base font-bold text-[#DCE7FF]">
            Urut berdasarkan terakhir diubah · Kelola, duplikasi, ubah nama, bagikan (.json / link / QR), atau tinjau kunci di Panel Guru.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Button3D variant="navy" size="md" onClick={() => setModalSampahTerbuka(true)}>
            <Trash2 size={18} />
            <span>Game Terhapus ({daftarSampahGame.length})</span>
          </Button3D>
          <Button3D variant="ungu" size="md" onClick={() => onNavigasi('/online')}>
            <Cloud size={18} />
            <span>Game Online</span>
          </Button3D>
          <Button3D variant="biru" size="md" onClick={() => setModalImporTerbuka(true)}>
            <FileUp size={18} />
            <span>Impor Paket (.json)</span>
          </Button3D>
          <Button3D variant="ungu" size="md" onClick={pulihkanContohGame}>
            <RotateCcw size={18} />
            <span>Pulihkan Contoh</span>
          </Button3D>
          <Button3D
            variant="oranye"
            size="md"
            onClick={() => {
              bukaWizardBuatGame('baru', null);
              onNavigasi('/buat-game');
            }}
          >
            <PlusSquare size={18} />
            <span>Buat Game</span>
          </Button3D>
        </div>
      </div>

      {/* Peringatan jika localStorage tidak tersedia */}
      {!penyimpananTersedia && (
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border-3 border-[#FF9100] bg-[#4D2400] px-5 py-2.5 text-sm font-bold text-[#FFE8B3]">
          <AlertTriangle size={22} className="shrink-0 text-[#FFD400]" />
          <span>
            Penyimpanan browser tidak tersedia atau penuh (misalnya mode privat/incognito). Perubahan sementara hanya tersimpan di memori — gunakan tombol <strong>Bagikan → Unduh Paket (.json)</strong> agar soal Anda aman!
          </span>
        </div>
      )}

      {/* Bilah Pilih Massal saat ada game */}
      {daftarGame.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-2.5">
          <div className="flex items-center gap-3">
            <Button3D
              variant={semuaDipilih ? 'kuning' : 'navy'}
              size="sm"
              onClick={handleTogglePilihSemua}
            >
              {semuaDipilih ? <CheckSquare size={18} /> : <Square size={18} />}
              <span>{semuaDipilih ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
            </Button3D>
            <span className="text-sm font-bold text-[#DCE7FF]">
              {idTerpilih.length > 0
                ? `${idTerpilih.length} dari ${daftarGame.length} game dipilih`
                : `Total ${daftarGame.length} game tersimpan`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {idTerpilih.length > 0 && (
              <Button3D
                variant="merah"
                size="sm"
                onClick={handleKlikHapusTerpilih}
              >
                <Trash2 size={18} />
                <span>Hapus yang Dipilih ({idTerpilih.length})</span>
              </Button3D>
            )}
          </div>
        </div>
      )}

      {/* Layar Kosong Ramah atau Daftar Game */}
      {daftarGame.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="kartu-3d flex max-w-[660px] flex-col items-center gap-5 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] px-10 py-10 text-center shadow-[0_10px_0_#071236]">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-[#071236] bg-[#FFD400] text-[#071236] shadow-[0_6px_0_#C79A00]">
              <FolderOpen size={42} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-display teks-outline-tebal text-4xl font-bold text-white">
                Belum ada game
              </h2>
              <p className="text-bacaan mt-2 text-lg font-bold text-[#DCE7FF]">
                Daftar game Anda kosong. Buat game kuis baru atau masukkan kode game 8 karakter untuk langsung bermain!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              <Button3D
                variant="hijau"
                size="lg"
                onClick={() => {
                  bukaWizardBuatGame('baru', null);
                  onNavigasi('/buat-game');
                }}
              >
                <PlusSquare size={22} />
                <span>+ Buat Game Baru</span>
              </Button3D>
              <Button3D
                variant="ungu"
                size="lg"
                onClick={() => onNavigasi('/kode')}
              >
                <KeyRound size={22} />
                <span>Masuk dengan Kode</span>
              </Button3D>
            </div>
            {daftarSampahGame.length > 0 && (
              <button
                type="button"
                onClick={() => setModalSampahTerbuka(true)}
                className="font-display cursor-pointer rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-2 text-sm font-bold text-[#FFD400] hover:border-[#FFD400]"
              >
                Ada {daftarSampahGame.length} game di Sampah Game — Klik untuk mengembalikan
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="scroll-guru grid flex-1 grid-cols-2 gap-5 pr-2 pb-2">
          {daftarGame.map((game) => {
            const aktif = Boolean(gameAktif && game.id === gameAktif.id);
            const adalahDraf = game.status === 'draf';
            const disorotBaru = game.id === gameBaruDisorotId;
            const adaPin = Boolean((game.pengaturan.pinGuru ?? '').trim());
            const terpilih = idTerpilih.includes(game.id);
            const kodeOnline = ambilKodeOnlineTersimpanUntukGame(game.id);

            return (
              <div
                key={game.id}
                className={`flex flex-col justify-between rounded-3xl border-4 p-5 shadow-[0_8px_0_#071236] transition-all ${
                  terpilih
                    ? 'border-[#FFD400] bg-[#1C3E9B] ring-3 ring-[#FFD400]'
                    : disorotBaru
                      ? 'border-[#57E893] bg-[#1C3E9B] ring-4 ring-[#FFD400]'
                      : aktif
                        ? 'border-[#FFD400] bg-[#173287]'
                        : 'border-[#2A4CB8] bg-[#12276B]'
                }`}
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePilihGame(game.id)}
                        aria-label={terpilih ? `Batal pilih ${game.judul}` : `Pilih ${game.judul}`}
                        aria-pressed={terpilih}
                        className={`flex min-h-[48px] min-w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 transition-colors ${
                          terpilih
                            ? 'border-[#071236] bg-[#FFD400] text-[#071236]'
                            : 'border-[#3C62D4] bg-[#071236] text-[#DCE7FF] hover:border-[#FFD400]'
                        }`}
                      >
                        {terpilih ? <CheckSquare size={22} /> : <Square size={22} />}
                      </button>
                      <span className="truncate font-display text-sm font-bold text-[#FFD400]">
                        {game.mapel}
                        {game.namaSekolah ? ` · ${game.namaSekolah}` : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {disorotBaru && (
                        <span className="font-display rounded-lg bg-[#FFD400] px-2.5 py-0.5 text-xs font-bold text-[#0B1B4D]">
                          BARU DISIMPAN
                        </span>
                      )}
                      {kodeOnline && (
                        <span className="font-display flex items-center gap-1 rounded-lg bg-[#2D1463] px-2.5 py-0.5 font-mono text-xs font-bold text-[#E6D6FF]">
                          <Cloud size={12} />
                          {formatKodeKelompok(kodeOnline)}
                        </span>
                      )}
                      {adalahDraf ? (
                        <span className="font-display rounded-lg border border-[#FFE875] bg-[#FF9100] px-2.5 py-0.5 text-xs font-bold text-[#071236]">
                          Draf
                        </span>
                      ) : (
                        <span className="font-display flex items-center gap-1 rounded-lg bg-[#008E3A] px-2.5 py-0.5 text-xs font-bold text-white">
                          <Check size={13} strokeWidth={3} />
                          Tersimpan
                        </span>
                      )}
                      {adaPin && (
                        <span className="font-display flex items-center gap-1 rounded-lg border border-[#FFD400] bg-[#071236] px-2.5 py-0.5 text-xs font-bold text-[#FFD400]">
                          <Lock size={12} />
                          PIN
                        </span>
                      )}
                      {aktif && (
                        <span className="font-display flex items-center gap-1 rounded-lg bg-[#1E6BFF] px-2.5 py-0.5 text-xs font-bold text-white">
                          AKTIF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-[44px] w-full">
                    <AutoFitText maxFontSize={26} minFontSize={16} className="font-display font-bold text-white">
                      {game.judul}
                    </AutoFitText>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-[#DCE7FF]">
                    <span>
                      Soal: <strong className="tabular-angka text-[#FFD400]">{game.soal.length}</strong>
                    </span>
                    <span>·</span>
                    <span className="uppercase">{game.pengaturan.mode}</span>
                    <span>·</span>
                    <span className="text-xs text-[#A8C4FF]">
                      Diubah: {formatTanggalIndonesia(game.diubahPada)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {adalahDraf ? (
                    <Button3D
                      variant="kuning"
                      size="sm"
                      onClick={() => jalankanDenganCekPin({ jenis: 'ubah_soal', game })}
                    >
                      {adaPin ? <Lock size={15} /> : <Edit3 size={16} />}
                      <span>Lanjutkan Mengedit</span>
                    </Button3D>
                  ) : (
                    <>
                      <Button3D
                        variant="hijau"
                        size="sm"
                        disabled={game.soal.length === 0}
                        onClick={() => handleMainkanGame(game)}
                      >
                        <Play size={16} fill="currentColor" />
                        <span>Main</span>
                      </Button3D>
                      <Button3D
                        variant="oranye"
                        size="sm"
                        onClick={() => jalankanDenganCekPin({ jenis: 'ubah_soal', game })}
                      >
                        {adaPin ? <Lock size={15} /> : <Edit3 size={16} />}
                        <span>Edit</span>
                      </Button3D>
                      <Button3D
                        variant="ungu"
                        size="md"
                        onClick={() => jalankanDenganCekPin({ jenis: 'bagikan', game })}
                      >
                        {adaPin ? <Lock size={16} /> : <Share2 size={18} />}
                        <span>Bagikan</span>
                      </Button3D>
                    </>
                  )}

                  {adalahDraf && (
                    <>
                      <Button3D
                        variant="hijau"
                        size="sm"
                        disabled={game.soal.length === 0}
                        onClick={() => handleMainkanGame(game)}
                      >
                        <Play size={16} fill="currentColor" />
                        <span>Main</span>
                      </Button3D>
                      <Button3D
                        variant="ungu"
                        size="sm"
                        onClick={() => jalankanDenganCekPin({ jenis: 'bagikan', game })}
                      >
                        {adaPin ? <Lock size={15} /> : <Share2 size={16} />}
                        <span>Bagikan</span>
                      </Button3D>
                    </>
                  )}

                  {!aktif && (
                    <Button3D variant="biru" size="sm" onClick={() => pilihGameAktif(game.id)}>
                      <Check size={16} />
                      <span>Pilih</span>
                    </Button3D>
                  )}
                  {!adalahDraf && (
                    <Button3D
                      variant="navy"
                      size="sm"
                      onClick={() => jalankanDenganCekPin({ jenis: 'atur', game })}
                    >
                      <Settings size={16} />
                      <span>Pengaturan</span>
                    </Button3D>
                  )}
                  <Button3D
                    variant="navy"
                    size="sm"
                    onClick={() => jalankanDenganCekPin({ jenis: 'ubah_nama', game })}
                  >
                    <Pencil size={15} />
                    <span>Ubah Nama</span>
                  </Button3D>
                  <Button3D variant="navy" size="sm" onClick={() => duplikasiGame(game.id)}>
                    <CopyPlus size={16} />
                    <span>Duplikasi</span>
                  </Button3D>
                  {!adalahDraf && (
                    <Button3D
                      variant="navy"
                      size="sm"
                      onClick={() => jalankanDenganCekPin({ jenis: 'panel_guru', game })}
                    >
                      {adaPin ? <Lock size={15} /> : <Eye size={16} />}
                      <span>Kunci</span>
                    </Button3D>
                  )}
                  <Button3D
                    variant="merah"
                    size="sm"
                    onClick={() => jalankanDenganCekPin({ jenis: 'hapus', game })}
                    aria-label={`Hapus ${game.judul}`}
                  >
                    <Trash2 size={16} />
                    <span>Hapus</span>
                  </Button3D>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal PIN Guru Ramah Sentuh 4 Angka */}
      <PinGuruModal
        terbuka={Boolean(aksiPinTertunda)}
        judul="Verifikasi PIN Guru"
        keterangan={labelKeteranganPin}
        pinBenar={(aksiPinTertunda?.game.pengaturan.pinGuru ?? '').trim()}
        onBerhasil={() => {
          if (!aksiPinTertunda) return;
          const aksi = aksiPinTertunda;
          setAksiPinTertunda(null);
          eksekusiAksiSetelahPin(aksi);
        }}
        onTutup={() => setAksiPinTertunda(null)}
      />

      {/* Modal Ubah Nama Game */}
      <Modal
        terbuka={Boolean(gameDiubahNama)}
        judul="Ubah Nama & Identitas Game"
        onTutup={() => setGameDiubahNama(null)}
        lebarMaks="md"
      >
        <form onSubmit={handleSimpanUbahNama} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-display text-sm font-bold text-[#FFD400]">Judul Game</span>
            <input
              type="text"
              required
              autoFocus
              value={judulEdit}
              onChange={(e) => setJudulEdit(e.target.value)}
              className="min-h-[48px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-4 text-base font-bold text-white focus:border-[#FFD400] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-display text-sm font-bold text-[#FFD400]">Mata Pelajaran / Kelas</span>
            <input
              type="text"
              value={mapelEdit}
              onChange={(e) => setMapelEdit(e.target.value)}
              className="min-h-[48px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-4 text-base font-bold text-white focus:border-[#FFD400] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-display text-sm font-bold text-[#FFD400]">Nama Sekolah (Opsional)</span>
            <input
              type="text"
              value={sekolahEdit}
              onChange={(e) => setSekolahEdit(e.target.value)}
              className="min-h-[48px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-4 text-base font-bold text-white focus:border-[#FFD400] focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button3D variant="navy" size="md" onClick={() => setGameDiubahNama(null)}>
              Batal
            </Button3D>
            <Button3D type="submit" variant="hijau" size="md">
              Simpan Perubahan
            </Button3D>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus Game (Satuan & Massal + Opsi Online) */}
      <Modal
        terbuka={targetHapusList.length > 0}
        judul={
          targetHapusList.length > 1
            ? `Konfirmasi Hapus ${targetHapusList.length} Game`
            : 'Konfirmasi Hapus Game'
        }
        onTutup={() => {
          if (!sedangHapusOnline) setTargetHapusList([]);
        }}
        lebarMaks="md"
      >
        {targetHapusList.length > 0 && (
          <div className="flex flex-col gap-4">
            {targetHapusList.length === 1 ? (
              <p className="text-bacaan text-lg font-bold text-white">
                Hapus game{' '}
                <span className="text-[#FFD400]">&apos;{targetHapusList[0].judul}&apos;</span>?
                Soal di dalamnya ikut terhapus
              </p>
            ) : (
              <div>
                <p className="text-bacaan text-lg font-bold text-white">
                  Hapus{' '}
                  <span className="text-[#FFD400]">{targetHapusList.length} game</span> yang
                  dipilih? Soal di dalamnya ikut terhapus
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm font-semibold text-[#DCE7FF]">
                  {targetHapusList.slice(0, 5).map((g) => (
                    <li key={g.id}>
                      {g.judul} ({g.soal.length} soal)
                    </li>
                  ))}
                  {targetHapusList.length > 5 && (
                    <li>...dan {targetHapusList.length - 5} game lainnya</li>
                  )}
                </ul>
              </div>
            )}

            <p className="text-sm font-semibold text-[#A8C4FF]">
              Game yang dihapus masuk ke <strong>Sampah Game</strong> selama 7 hari dan bisa dikembalikan dengan tombol <strong>URUNGKAN</strong> atau <strong>Game Terhapus</strong>.
            </p>

            {/* Pilihan untuk game yang sudah dibagikan online */}
            {infoOnlineTargetHapus.length > 0 && profilGuru && (
              <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#7C4DFF] bg-[#071236] p-3.5">
                <span className="font-display text-sm font-bold text-[#FFD400]">
                  Game sudah dibagikan online ({infoOnlineTargetHapus.map((x) => formatKodeKelompok(x.kode)).join(', ')}):
                </span>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 border-[#2A4CB8] bg-[#12276B] px-3.5 py-2 text-sm font-bold text-white">
                  <input
                    type="radio"
                    name="modeHapusOnline"
                    checked={modeHapusOnline === 'perangkat_saja'}
                    onChange={() => setModeHapusOnline('perangkat_saja')}
                    className="h-5 w-5 accent-[#FFD400]"
                  />
                  <span>Hapus dari perangkat ini saja</span>
                </label>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 border-[#FF6B86] bg-[#4A000E] px-3.5 py-2 text-sm font-bold text-white">
                  <input
                    type="radio"
                    name="modeHapusOnline"
                    checked={modeHapusOnline === 'perangkat_dan_online'}
                    onChange={() => setModeHapusOnline('perangkat_dan_online')}
                    className="h-5 w-5 accent-[#FF1744]"
                  />
                  <span>Hapus juga dari online (kode tidak bisa dipakai lagi)</span>
                </label>
              </div>
            )}

            {infoOnlineTargetHapus.length > 0 && !profilGuru && (
              <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-2.5 text-xs font-bold text-[#DCE7FF]">
                Game ini terhubung dengan kode online (
                {infoOnlineTargetHapus.map((x) => formatKodeKelompok(x.kode)).join(', ')}). Saat
                belum masuk Google, penghapusan hanya menghapus salinan di perangkat ini.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button3D
                variant="navy"
                size="md"
                disabled={sedangHapusOnline}
                onClick={() => setTargetHapusList([])}
              >
                Batal
              </Button3D>
              <Button3D
                variant="merah"
                size="md"
                disabled={sedangHapusOnline}
                onClick={() => void handleKonfirmasiHapusFinal()}
              >
                <Trash2 size={18} />
                <span>
                  {sedangHapusOnline
                    ? 'Menghapus...'
                    : targetHapusList.length > 1
                      ? `Ya, Hapus ${targetHapusList.length} Game`
                      : 'Ya, Hapus Game'}
                </span>
              </Button3D>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Sampah Game (7 Hari) */}
      <SampahGameModal
        terbuka={modalSampahTerbuka}
        daftarSampahGame={daftarSampahGame}
        onTutup={() => setModalSampahTerbuka(false)}
        onPulihkan={(ids) => pulihkanDariSampahGame(ids)}
        onHapusPermanen={(ids) => hapusPermanenDariSampahGame(ids)}
        onKosongkanSemua={() => kosongkanSemuaSampahGame()}
      />

      {/* Modal Bagikan (Paket .json, Link Data, QR PNG, & Bagikan Online) */}
      <BagikanGameModal
        game={gameDibagikan}
        onTutup={() => setGameDibagikan(null)}
        onToast={tampilkanToast}
        onBukaGameOnlineSaya={() => {
          setGameDibagikan(null);
          onNavigasi('/online');
        }}
      />

      {/* Modal Impor Paket .json */}
      <ImporPaketModal
        terbuka={modalImporTerbuka}
        daftarGameAda={daftarGame}
        onImporSimpan={(game, strategi, targetTimpaId) => {
          imporGameDariPaket(game, strategi, targetTimpaId);
        }}
        onTutup={() => setModalImporTerbuka(false)}
      />

      {/* Modal Panel Guru untuk meninjau soal & kunci jawaban */}
      <Modal
        terbuka={Boolean(gameDitinjau)}
        judul={gameDitinjau ? `Panel Guru: ${gameDitinjau.judul}` : 'Panel Guru'}
        onTutup={() => setGameDitinjau(null)}
        lebarMaks="xl"
        footer={
          <Button3D variant="kuning" size="md" onClick={() => setGameDitinjau(null)}>
            Tutup Panel Guru
          </Button3D>
        }
      >
        {gameDitinjau && (
          <div className="flex flex-col gap-4">
            <p className="text-bacaan text-lg text-[#FFD400]">
              Catatan: Kunci jawaban hanya ditampilkan di Panel Guru ini, tidak pernah terlihat oleh siswa saat bermain.
            </p>
            {gameDitinjau.soal.length === 0 ? (
              <div className="rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-6 text-center text-lg text-[#DCE7FF]">
                Belum ada soal di game ini. Tambahkan soal melalui menu Buat Game.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {gameDitinjau.soal.map((soal, idx) => (
                  <div
                    key={soal.id}
                    className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4"
                  >
                    <div className="mb-1 flex items-center justify-between text-sm font-bold text-[#FFD400]">
                      <span>
                        Soal {idx + 1} · {soal.topik || 'Umum'}
                      </span>
                      <span>{soal.bonus ? 'BONUS 2×' : soal.tingkat || 'Mudah'}</span>
                    </div>
                    <p className="text-bacaan mb-2 text-base font-bold text-white">
                      {soal.pertanyaan}
                    </p>
                    {soal.kode && (
                      <pre className="mb-3 overflow-x-auto rounded-xl border border-[#2A4CB8] bg-[#040B24] p-2.5 font-mono text-xs text-[#57E893]">
                        {soal.kode}
                      </pre>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {soal.pilihan.map((opsi, opsiIdx) => {
                        const adalahKunci = opsiIdx === soal.kunci;
                        return (
                          <div
                            key={`${soal.id}_${opsiIdx}`}
                            className={`rounded-xl border-2 px-3 py-1.5 font-semibold ${
                              adalahKunci
                                ? 'border-[#57E893] bg-[#008E3A] text-white'
                                : 'border-[#2A4CB8] bg-[#12276B] text-[#DCE7FF]'
                            }`}
                          >
                            {String.fromCharCode(65 + opsiIdx)}. {opsi}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

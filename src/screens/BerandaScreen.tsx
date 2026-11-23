import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileUp,
  FolderKanban,
  History,
  KeyRound,
  Play,
  PlusSquare,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { usePwa } from '../app/PwaContext';
import { pergiKeKodeOnline } from '../app/router';
import { useAppStore } from '../app/store';
import { ArenaTarikTambang } from '../components/ArenaTarikTambang';
import { AutoFitText } from '../components/AutoFitText';
import { Button3D } from '../components/Button3D';
import { ImporPaketModal } from '../components/ImporPaketModal';
import { Modal } from '../components/Modal';
import { TombolAkunGuru } from '../components/TombolAkunGuru';
import { Game, RuteHash } from '../data/types';
import {
  bacaSesiMatchSessionStorage,
  hapusSesiMatchSessionStorage,
} from '../engine/match';
import {
  bacaSesiModeSessionStorage,
  hapusSesiModeSessionStorage,
} from '../engine/session';
import {
  ambilKodeOnlineTersimpanUntukGame,
  formatKodeKelompok,
} from '../services/gameOnlineService';
import { tandaiInteraksiAudio } from '../utils/audio';
import { APP_NAME } from '../utils/constants';
import {
  bacaRiwayatDibuka,
  formatTanggalRiwayat,
  hapusSemuaRiwayatDibuka,
  ItemRiwayatDibuka,
} from '../utils/riwayatDibuka';

interface BerandaScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

export const BerandaScreen: React.FC<BerandaScreenProps> = ({ onNavigasi }) => {
  const {
    daftarGame,
    gameAktif,
    penyimpananTersedia,
    pilihGameAktif,
    imporGameDariPaket,
    mulaiSesiPembagian,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    resetSesiMode,
    pulihkanContohGame,
    bukaWizardBuatGame,
    tampilkanToast,
  } = useAppStore();
  const { isInstalled, pasangAplikasi } = usePwa();
  const [adaSesiLanjut, setAdaSesiLanjut] = useState(false);
  const [posisiDemo, setPosisiDemo] = useState(0);
  const [modalImporTerbuka, setModalImporTerbuka] = useState(false);
  const [riwayatDibuka, setRiwayatDibuka] = useState<ItemRiwayatDibuka[]>(() =>
    bacaRiwayatDibuka()
  );
  const [modalHapusRiwayat, setModalHapusRiwayat] = useState(false);

  useEffect(() => {
    setRiwayatDibuka(bacaRiwayatDibuka());
    const matchTersimpan = bacaSesiMatchSessionStorage();
    const modeTersimpan = bacaSesiModeSessionStorage();
    const adaMatch = Boolean(
      matchTersimpan &&
        matchTersimpan.fase !== 'selesai' &&
        daftarGame.some((g) => g.id === matchTersimpan.gameId)
    );
    const adaTurnamenAktif = Boolean(
      modeTersimpan?.mode === '4tim' &&
        modeTersimpan.turnamen?.tahapSaatIni !== 'selesai' &&
        daftarGame.some((g) => g.id === modeTersimpan.gameId)
    );
    const adaDuelAktif = Boolean(
      modeTersimpan?.mode === '1lawan1' &&
        !modeTersimpan.duel?.selesaiSemua &&
        daftarGame.some((g) => g.id === modeTersimpan.gameId)
    );
    setAdaSesiLanjut(adaMatch || adaTurnamenAktif || adaDuelAktif);
  }, [daftarGame]);

  // Animasi tarikan demo pelan pada lapangan Beranda (mati jika efekRingan ON)
  const efekRinganAktif = Boolean(gameAktif?.pengaturan.efekRingan);
  useEffect(() => {
    if (efekRinganAktif) {
      setPosisiDemo(0);
      return;
    }
    const urutan = [-1, 0, 1, 0];
    let idx = 0;
    const id = window.setInterval(() => {
      idx = (idx + 1) % urutan.length;
      setPosisiDemo(urutan[idx]);
    }, 1600);
    return () => window.clearInterval(id);
  }, [efekRinganAktif]);

  const lanjutkanSesiTerakhir = () => {
    tandaiInteraksiAudio();
    const matchTersimpan = bacaSesiMatchSessionStorage();
    if (
      matchTersimpan &&
      matchTersimpan.fase !== 'selesai' &&
      daftarGame.some((g) => g.id === matchTersimpan.gameId)
    ) {
      if (matchTersimpan.gameId !== gameAktif?.id) {
        pilihGameAktif(matchTersimpan.gameId);
      }
      onNavigasi('/main');
      return;
    }

    const modeTersimpan = bacaSesiModeSessionStorage();
    if (modeTersimpan && daftarGame.some((g) => g.id === modeTersimpan.gameId)) {
      if (modeTersimpan.gameId !== gameAktif?.id) {
        pilihGameAktif(modeTersimpan.gameId);
      }
      if (modeTersimpan.mode === '4tim') {
        onNavigasi('/turnamen');
        return;
      }
      if (modeTersimpan.mode === '1lawan1') {
        onNavigasi('/duel');
        return;
      }
    }
    onNavigasi('/game-saya');
  };

  const jalankanGameLokal = (target: Game) => {
    tandaiInteraksiAudio();
    hapusSesiMatchSessionStorage();
    hapusSesiModeSessionStorage();
    resetSesiMode();
    if (target.id !== gameAktif?.id) {
      pilihGameAktif(target.id);
    }
    if (target.pengaturan.mode === '4tim') {
      mulaiSesiTurnamenBaru(target);
      onNavigasi('/turnamen');
      return;
    }
    if (target.pengaturan.mode === '1lawan1') {
      mulaiSesiDuelBaru(target);
      onNavigasi('/duel');
      return;
    }
    mulaiSesiPembagian(target);
    onNavigasi('/main');
  };

  const mulaiPertandinganBaru = () => {
    if (!gameAktif) {
      tampilkanToast(
        daftarGame.length === 0
          ? 'Belum ada game. Buat game baru atau masuk dengan kode.'
          : 'Pilih game terlebih dahulu di Game Saya.',
        'info'
      );
      onNavigasi('/game-saya');
      return;
    }
    jalankanGameLokal(gameAktif);
  };

  const cariGameLokalUntukRiwayat = (item: ItemRiwayatDibuka): Game | undefined => {
    if (item.lokalGameId) {
      const cocokId = daftarGame.find((g) => g.id === item.lokalGameId);
      if (cocokId) return cocokId;
    }
    if (item.kode) {
      const cocokKode = daftarGame.find(
        (g) => ambilKodeOnlineTersimpanUntukGame(g.id) === item.kode
      );
      if (cocokKode) return cocokKode;
    }
    return undefined;
  };

  const handleMainDariRiwayat = (item: ItemRiwayatDibuka) => {
    tandaiInteraksiAudio();
    const gameLokal = cariGameLokalUntukRiwayat(item);
    if (gameLokal) {
      jalankanGameLokal(gameLokal);
      return;
    }
    if (item.kode) {
      pergiKeKodeOnline(item.kode);
      return;
    }
    tampilkanToast(
      'Salinan game lokal sudah dihapus. Pilih game lain di menu Game Saya.',
      'peringatan'
    );
  };

  const handleKonfirmasiHapusRiwayat = () => {
    hapusSemuaRiwayatDibuka();
    setRiwayatDibuka([]);
    setModalHapusRiwayat(false);
    tampilkanToast('Riwayat "Terakhir Dibuka" berhasil dihapus.', 'info');
  };

  return (
    <div
      onPointerDown={() => tandaiInteraksiAudio()}
      className={`flex h-full w-full flex-col justify-between gap-3 bg-[#0B1B4D] px-8 py-3.5 ${
        gameAktif?.pengaturan.modeRekam ? 'mode-rekam-aktif' : ''
      } ${gameAktif?.pengaturan.efekRingan ? 'efek-ringan-aktif' : ''}`}
    >
      {/* 1. Papan Judul Arcade + Tombol Aksi Utama */}
      <div className="kartu-3d flex items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-7 py-3">
        <div className="min-w-0 flex-1">
          <div className="h-[46px] w-full">
            <AutoFitText
              maxFontSize={40}
              minFontSize={22}
              className="font-display teks-outline-raksasa font-bold text-[#FFD400]"
            >
              {APP_NAME}
            </AutoFitText>
          </div>
          <p className="text-bacaan mt-0.5 truncate text-sm font-bold text-[#DCE7FF]">
            Kuis tarik tambang satu layar untuk Smartboard &amp; laptop. Masukkan soal apa saja, lalu adu cepat &amp; tepat bersama kelas!
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button3D variant="hijau" size="lg" onClick={mulaiPertandinganBaru}>
            <Play size={22} fill="currentColor" />
            <span>MULAI BERMAIN</span>
          </Button3D>
          <Button3D variant="ungu" size="lg" onClick={() => onNavigasi('/kode')}>
            <KeyRound size={20} />
            <span>MASUK DENGAN KODE</span>
          </Button3D>
          {adaSesiLanjut && (
            <Button3D variant="oranye" size="lg" onClick={lanjutkanSesiTerakhir}>
              <RotateCcw size={20} />
              <span>LANJUTKAN</span>
            </Button3D>
          )}
          <Button3D variant="biru" size="lg" onClick={() => setModalImporTerbuka(true)}>
            <FileUp size={20} />
            <span>IMPOR PAKET</span>
          </Button3D>
          <Button3D variant="kuning" size="lg" onClick={() => onNavigasi('/pengaturan')}>
            <Settings size={20} />
            <span>PENGATURAN</span>
          </Button3D>
        </div>
      </div>

      {!penyimpananTersedia && (
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-[#FF9100] bg-[#4D2400] px-4 py-1.5 text-xs font-bold text-[#FFE8B3]">
          <AlertTriangle size={18} className="shrink-0 text-[#FFD400]" />
          <span>
            Mode privat/penyimpanan browser nonaktif: gunakan Bagikan &rarr; Unduh Paket (.json) untuk menyimpan soal Anda.
          </span>
        </div>
      )}

      {/* 2. Arena Lapangan Sekolah Live Preview */}
      <ArenaTarikTambang
        namaTimKiri={gameAktif?.pengaturan.namaTim[0] || 'Tim Merah'}
        namaTimKanan={gameAktif?.pengaturan.namaTim[1] || 'Tim Biru'}
        namaSekolah={gameAktif?.namaSekolah ?? ''}
        mapel={gameAktif?.mapel ?? ''}
        jumlahPenarik={gameAktif?.pengaturan.jumlahPenarik ?? 3}
        posisiTali={posisiDemo}
        langkahKeGaris={gameAktif?.pengaturan.langkahKeGaris ?? 4}
        indeksGiliranKiri={0}
        indeksGiliranKanan={0}
        faseTimKiri="menjawab"
        faseTimKanan="menjawab"
        modeRekam={Boolean(gameAktif?.pengaturan.modeRekam)}
        efekRingan={Boolean(gameAktif?.pengaturan.efekRingan)}
      />

      {/* 3. Info Game Aktif, Terakhir Dibuka, & 4 Tombol Utama Arcade */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        {/* Kolom 1: Kartu Game Aktif */}
        <div className="kartu-3d col-span-4 flex min-h-0 flex-col justify-between rounded-3xl border-4 border-[#3C62D4] bg-[#173287] p-4">
          {gameAktif ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-display inline-block rounded-lg border-2 border-[#071236] bg-[#FFD400] px-2.5 py-0.5 text-xs font-bold text-[#071236]">
                  GAME AKTIF SIAP MAIN
                </span>
                <span className="text-xs font-bold uppercase text-[#57E893]">
                  Mode {gameAktif.pengaturan.mode}
                </span>
              </div>
              <div className="mt-1.5 h-[36px] w-full">
                <AutoFitText
                  maxFontSize={24}
                  minFontSize={15}
                  className="font-display teks-outline-tebal font-bold text-white"
                >
                  {gameAktif.judul}
                </AutoFitText>
              </div>
              <p className="text-bacaan mt-0.5 text-sm font-bold text-[#DCE7FF]">
                Mapel: {gameAktif.mapel} · {gameAktif.soal.length} Soal
              </p>
            </div>
          ) : (
            <div>
              <span className="font-display inline-block rounded-lg border-2 border-[#071236] bg-[#FF9100] px-2.5 py-0.5 text-xs font-bold text-[#071236]">
                {daftarGame.length === 0 ? 'BELUM ADA GAME' : 'BELUM ADA GAME AKTIF'}
              </span>
              <p className="font-display mt-2 text-lg font-bold text-white">
                {daftarGame.length === 0
                  ? 'Buat game baru atau masuk dengan kode.'
                  : 'Pilih game dari menu Game Saya.'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {gameAktif ? (
                <>
                  <Button3D variant="biru" size="sm" onClick={() => onNavigasi('/game-saya')}>
                    <FolderKanban size={17} />
                    <span>Ganti Game</span>
                  </Button3D>
                  <Button3D variant="kuning" size="sm" onClick={() => onNavigasi('/pengaturan')}>
                    <Settings size={17} />
                    <span>Atur Laga</span>
                  </Button3D>
                </>
              ) : (
                <>
                  <Button3D
                    variant="hijau"
                    size="sm"
                    onClick={() => {
                      bukaWizardBuatGame('baru', null);
                      onNavigasi('/buat-game');
                    }}
                  >
                    <PlusSquare size={17} />
                    <span>+ Buat Game</span>
                  </Button3D>
                  <Button3D variant="biru" size="sm" onClick={() => onNavigasi('/game-saya')}>
                    <FolderKanban size={17} />
                    <span>Game Saya</span>
                  </Button3D>
                </>
              )}
              {isInstalled ? (
                <div className="flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-[#00C853] bg-[#005724] px-3 font-display text-xs font-bold text-[#57E893]">
                  <CheckCircle2 size={16} />
                  <span>Terpasang</span>
                </div>
              ) : (
                <Button3D
                  variant="hijau"
                  size="sm"
                  onClick={() => void pasangAplikasi()}
                  aria-label="Pasang Aplikasi Duel Otak"
                >
                  <Download size={17} />
                  <span>Pasang Aplikasi</span>
                </Button3D>
              )}
            </div>
            <TombolAkunGuru onNavigasi={onNavigasi} kompak />
          </div>
        </div>

        {/* Kolom 2: Kartu Terakhir Dibuka (maks 10 game di perangkat ini) */}
        <div className="kartu-3d col-span-4 flex min-h-0 flex-col gap-2.5 rounded-3xl border-4 border-[#7C4DFF] bg-[#12276B] p-4">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#071236] bg-[#FFD400] text-[#071236]">
                <History size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-[#FFD400]">
                  TERAKHIR DIBUKA
                </h2>
                <span className="text-[11px] font-bold text-[#A8C4FF]">
                  {riwayatDibuka.length}/10 game di perangkat ini
                </span>
              </div>
            </div>

            {riwayatDibuka.length > 0 && (
              <Button3D
                variant="merah"
                size="sm"
                onClick={() => setModalHapusRiwayat(true)}
                aria-label="Hapus riwayat terakhir dibuka"
              >
                <Trash2 size={15} />
                <span>Hapus</span>
              </Button3D>
            )}
          </div>

          {riwayatDibuka.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-4 text-center">
              <p className="text-sm font-bold text-[#DCE7FF]">
                Belum ada riwayat game yang dibuka atau dimainkan.
              </p>
              <Button3D variant="ungu" size="sm" onClick={() => onNavigasi('/kode')}>
                <KeyRound size={16} />
                <span>Masuk dengan Kode</span>
              </Button3D>
            </div>
          ) : (
            <div className="scroll-guru min-h-0 flex-1 space-y-2 pr-1">
              {riwayatDibuka.map((item) => {
                const gameLokal = cariGameLokalUntukRiwayat(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-bold text-white">
                        {item.judul}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-[#A8C4FF]">
                        {item.kode && (
                          <span className="rounded bg-[#173287] px-1.5 py-0.5 font-mono text-[#FFD400]">
                            {formatKodeKelompok(item.kode)}
                          </span>
                        )}
                        {gameLokal && (
                          <span className="rounded bg-[#005724] px-1.5 py-0.5 text-[#57E893]">
                            Offline
                          </span>
                        )}
                        <span>{formatTanggalRiwayat(item.dibukaPada)}</span>
                      </div>
                    </div>

                    <Button3D
                      variant="hijau"
                      size="sm"
                      onClick={() => handleMainDariRiwayat(item)}
                      aria-label={`Mainkan ${item.judul}`}
                    >
                      <Play size={15} fill="currentColor" />
                      <span>MAIN</span>
                    </Button3D>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom 3: 4 Tombol Besar Arcade (2x2) */}
        <div className="col-span-4 grid min-h-0 grid-cols-2 grid-rows-2 gap-3">
          <button
            type="button"
            onClick={() => {
              bukaWizardBuatGame('baru', null);
              onNavigasi('/buat-game');
            }}
            className="kartu-3d flex cursor-pointer flex-col justify-between rounded-3xl border-4 border-[#071236] bg-[#FF9100] p-4 text-left transition-transform active:translate-y-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#071236] bg-[#FFD400] text-[#071236]">
              <PlusSquare size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-display teks-outline-tebal text-lg font-bold text-white">
                BUAT GAME
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#071236]">
                Manual, tempel teks, atau Word/Excel/PDF.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigasi('/game-saya')}
            className="kartu-3d flex cursor-pointer flex-col justify-between rounded-3xl border-4 border-[#071236] bg-[#7C4DFF] p-4 text-left transition-transform active:translate-y-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#071236] bg-[#FFD400] text-[#071236]">
              <FolderKanban size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-display teks-outline-tebal text-lg font-bold text-white">
                GAME SAYA
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#EAE2FF]">
                Kelola, bagikan paket/QR, &amp; kode online.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={pulihkanContohGame}
            className="kartu-3d flex cursor-pointer flex-col justify-between rounded-3xl border-4 border-[#071236] bg-[#1E6BFF] p-4 text-left transition-transform active:translate-y-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#071236] bg-[#FFD400] text-[#071236]">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-display teks-outline-tebal text-lg font-bold text-white">
                CONTOH GAME
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#DCE7FF]">
                Aktifkan 16 soal contoh umum siap uji.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigasi('/panduan')}
            className="kartu-3d flex cursor-pointer flex-col justify-between rounded-3xl border-4 border-[#071236] bg-[#00C853] p-4 text-left transition-transform active:translate-y-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#071236] bg-[#FFD400] text-[#071236]">
              <BookOpen size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-display teks-outline-tebal text-lg font-bold text-white">
                PANDUAN
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#071236]">
                Aturan main, Smartboard, kode &amp; bagikan.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Modal Impor Paket .json dari Beranda */}
      <ImporPaketModal
        terbuka={modalImporTerbuka}
        daftarGameAda={daftarGame}
        onImporSimpan={(game, strategi, targetTimpaId) => {
          imporGameDariPaket(game, strategi, targetTimpaId);
        }}
        onTutup={() => setModalImporTerbuka(false)}
      />

      {/* Modal Konfirmasi Hapus Riwayat Terakhir Dibuka */}
      <Modal
        terbuka={modalHapusRiwayat}
        judul="Hapus Riwayat Terakhir Dibuka"
        onTutup={() => setModalHapusRiwayat(false)}
        lebarMaks="md"
        footer={
          <>
            <Button3D variant="navy" size="md" onClick={() => setModalHapusRiwayat(false)}>
              Batal
            </Button3D>
            <Button3D variant="merah" size="md" onClick={handleKonfirmasiHapusRiwayat}>
              <Trash2 size={18} />
              <span>Ya, Hapus Riwayat</span>
            </Button3D>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-base font-bold text-white">
            Yakin menghapus seluruh daftar game pada kartu{' '}
            <span className="text-[#FFD400]">&quot;Terakhir Dibuka&quot;</span> di perangkat ini?
          </p>
          <p className="text-sm font-semibold text-[#DCE7FF]">
            Game yang sudah Anda simpan di menu <strong>Game Saya</strong> tidak akan terhapus dan tetap dapat dimainkan kapan saja.
          </p>
        </div>
      </Modal>
    </div>
  );
};

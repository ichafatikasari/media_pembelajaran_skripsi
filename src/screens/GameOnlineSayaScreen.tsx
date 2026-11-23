import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Cloud,
  Copy,
  FolderKanban,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useAuthGuru } from '../app/AuthContext';
import { useAppStore } from '../app/store';
import { AlamatAplikasiControl } from '../components/AlamatAplikasiControl';
import { AutoFitText } from '../components/AutoFitText';
import { Button3D } from '../components/Button3D';
import { KodeBesarModal } from '../components/KodeBesarModal';
import { Modal } from '../components/Modal';
import { TombolAkunGuru } from '../components/TombolAkunGuru';
import { Game, RuteHash } from '../data/types';
import {
  ambilDaftarGameOnlineGuru,
  BATAS_MAKS_GAME_ONLINE_GURU,
  buatUrlGameOnline,
  hapusGameOnline,
  MasaBerlakuHari,
  perbaruiIsiGameOnline,
  perpanjangGameOnline,
  PILIHAN_MASA_BERLAKU_HARI,
  RingkasanGameOnline,
} from '../services/gameOnlineService';
import { ambilAlamatAplikasiDasar } from '../utils/alamatAplikasi';
import { buatQrDataUrl } from '../utils/paketGame';

interface GameOnlineSayaScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

function formatTanggalPendek(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleDateString('id-ID');
  }
}

export const GameOnlineSayaScreen: React.FC<GameOnlineSayaScreenProps> = ({ onNavigasi }) => {
  const { profilGuru, layananOnlineSiap, sedangMemuatAuth } = useAuthGuru();
  const { daftarGame, tampilkanToast } = useAppStore();

  const [alamatDasar, setAlamatDasar] = useState<string>(() => ambilAlamatAplikasiDasar());
  const [daftarOnline, setDaftarOnline] = useState<RingkasanGameOnline[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState<boolean>(false);
  const [pesanError, setPesanError] = useState<string>('');
  const [kodeTersalin, setKodeTersalin] = useState<string | null>(null);
  const [sedangAksiKode, setSedangAksiKode] = useState<string | null>(null);

  // Modal QR & Kode Besar
  const [itemQr, setItemQr] = useState<RingkasanGameOnline | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [itemKodeBesar, setItemKodeBesar] = useState<RingkasanGameOnline | null>(null);

  // Modal Perpanjang
  const [itemPerpanjang, setItemPerpanjang] = useState<RingkasanGameOnline | null>(null);
  const [hariPerpanjang, setHariPerpanjang] = useState<MasaBerlakuHari>(30);

  // Modal Perbarui Isi (pilih dari daftar game lokal guru)
  const [itemPerbarui, setItemPerbarui] = useState<RingkasanGameOnline | null>(null);
  const [gameLokalDipilihId, setGameLokalDipilihId] = useState<string>('');

  // Modal Hapus
  const [itemKonfirmasiHapus, setItemKonfirmasiHapus] = useState<RingkasanGameOnline | null>(null);

  const muatDaftarOnline = useCallback(async () => {
    if (!profilGuru || !layananOnlineSiap) {
      setDaftarOnline([]);
      return;
    }
    setSedangMemuat(true);
    setPesanError('');
    try {
      const hasil = await ambilDaftarGameOnlineGuru(profilGuru.uid);
      if (!hasil.ok) {
        setPesanError(hasil.pesanError);
        return;
      }
      setDaftarOnline(hasil.daftar);
    } finally {
      setSedangMemuat(false);
    }
  }, [profilGuru, layananOnlineSiap]);

  useEffect(() => {
    if (profilGuru && layananOnlineSiap) {
      void muatDaftarOnline();
    } else {
      setDaftarOnline([]);
    }
  }, [profilGuru, layananOnlineSiap, muatDaftarOnline]);

  useEffect(() => {
    let aktif = true;
    setQrDataUrl('');
    if (itemQr) {
      const url = buatUrlGameOnline(itemQr.kode, alamatDasar);
      buatQrDataUrl(url)
        .then((res) => {
          if (aktif) setQrDataUrl(res);
        })
        .catch(() => {
          if (aktif) setQrDataUrl('');
        });
    }
    return () => {
      aktif = false;
    };
  }, [itemQr, alamatDasar]);

  const handleSalinLink = async (kode: string) => {
    const url = buatUrlGameOnline(kode, alamatDasar);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setKodeTersalin(kode);
      tampilkanToast(`Link kode ${kode} berhasil disalin.`, 'sukses');
    } catch {
      tampilkanToast('Gagal menyalin otomatis. Buka modal QR untuk melihat link.', 'peringatan');
    }
  };

  const handleUnduhQrPng = () => {
    if (!qrDataUrl || !itemQr) return;
    const tautan = document.createElement('a');
    tautan.href = qrDataUrl;
    tautan.download = `qr-online-${itemQr.kode}.png`;
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
    tampilkanToast('Gambar QR Code (PNG) berhasil diunduh.', 'sukses');
  };

  const handleEksekusiPerpanjang = async () => {
    if (!itemPerpanjang) return;
    setSedangAksiKode(itemPerpanjang.kode);
    try {
      const hasil = await perpanjangGameOnline(itemPerpanjang.kode, hariPerpanjang);
      if (!hasil.ok) {
        tampilkanToast(hasil.pesanError, 'error');
        return;
      }
      tampilkanToast(
        `Masa berlaku kode ${itemPerpanjang.kode} diperpanjang ${hariPerpanjang} hari.`,
        'sukses'
      );
      setItemPerpanjang(null);
      await muatDaftarOnline();
    } finally {
      setSedangAksiKode(null);
    }
  };

  const bukaModalPerbarui = (item: RingkasanGameOnline) => {
    const cocok =
      daftarGame.find((g) => g.judul.trim().toLowerCase() === item.judul.trim().toLowerCase()) ??
      daftarGame[0];
    setGameLokalDipilihId(cocok?.id ?? '');
    setItemPerbarui(item);
  };

  const handleEksekusiPerbarui = async () => {
    if (!itemPerbarui) return;
    const sumberGame: Game | undefined = daftarGame.find((g) => g.id === gameLokalDipilihId);
    if (!sumberGame) {
      tampilkanToast('Pilih salah satu game lokal untuk memperbarui isi.', 'peringatan');
      return;
    }
    setSedangAksiKode(itemPerbarui.kode);
    try {
      const hasil = await perbaruiIsiGameOnline(
        itemPerbarui.kode,
        sumberGame,
        itemPerbarui.sudahKedaluwarsa ? 30 : undefined
      );
      if (!hasil.ok) {
        tampilkanToast(hasil.pesanError, 'error');
        return;
      }
      tampilkanToast(`Isi game online ${itemPerbarui.kode} berhasil diperbarui!`, 'sukses');
      setItemPerbarui(null);
      await muatDaftarOnline();
    } finally {
      setSedangAksiKode(null);
    }
  };

  const handleEksekusiHapus = async () => {
    if (!itemKonfirmasiHapus) return;
    setSedangAksiKode(itemKonfirmasiHapus.kode);
    try {
      const hasil = await hapusGameOnline(itemKonfirmasiHapus.kode);
      if (!hasil.ok) {
        tampilkanToast(hasil.pesanError, 'error');
        return;
      }
      tampilkanToast(`Game online ${itemKonfirmasiHapus.kode} berhasil dihapus.`, 'info');
      setItemKonfirmasiHapus(null);
      await muatDaftarOnline();
    } finally {
      setSedangAksiKode(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-3.5 bg-[#0B1B4D] px-8 py-5">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-3xl border-4 border-[#7C4DFF] bg-[#12276B] px-6 py-3.5 shadow-[0_8px_0_#071236]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            <Cloud size={26} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold text-[#FFD400]">
                Game Online Saya
              </h1>
              {profilGuru && (
                <span className="tabular-angka rounded-lg border border-[#FFD400] bg-[#071236] px-2.5 py-0.5 font-display text-xs font-bold text-[#57E893]">
                  {daftarOnline.length} / {BATAS_MAKS_GAME_ONLINE_GURU} Game
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-[#DCE7FF]">
              Kelola link pendek (#/g/KODE), QR PNG, perpanjangan masa berlaku, atau hapus game online Anda.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <TombolAkunGuru kompak />
          {profilGuru && layananOnlineSiap && (
            <Button3D
              variant="biru"
              size="sm"
              disabled={sedangMemuat}
              onClick={() => void muatDaftarOnline()}
            >
              <RefreshCw size={16} />
              <span>{sedangMemuat ? 'Memuat...' : 'Muat Ulang'}</span>
            </Button3D>
          )}
          <Button3D variant="oranye" size="sm" onClick={() => onNavigasi('/game-saya')}>
            <FolderKanban size={16} />
            <span>Game Saya (Lokal)</span>
          </Button3D>
        </div>
      </div>

      {/* Catatan Privasi & Pengaturan Alamat Aplikasi */}
      <div className="grid shrink-0 grid-cols-12 items-center gap-3">
        <div className="col-span-5 flex h-full items-center gap-2.5 rounded-2xl border-2 border-[#FF9100] bg-[#4D2400] px-4 py-2.5 text-xs font-bold text-[#FFE8B3]">
          <ShieldAlert size={20} className="shrink-0 text-[#FFD400]" />
          <span>
            Game online disimpan di server Google (Firebase). Kunci jawaban ikut tersimpan. Siapa pun yang memiliki link dapat membukanya.
          </span>
        </div>
        <div className="col-span-7">
          <AlamatAplikasiControl onBerubah={setAlamatDasar} onToast={tampilkanToast} />
        </div>
      </div>

      {/* Konten Utama */}
      {!layananOnlineSiap ? (
        <div className="kartu-3d flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-[#FF9100] bg-[#12276B] p-8 text-center">
          <WifiOff size={48} className="text-[#FFD400]" />
          <h2 className="font-display text-2xl font-bold text-[#FFD400]">
            Fitur online belum tersedia, gunakan paket berkas
          </h2>
          <p className="max-w-[620px] text-base font-bold text-[#DCE7FF]">
            Tidak ada koneksi internet atau konfigurasi online tidak tersedia. Seluruh game lokal Anda tetap dapat dimainkan dan dibagikan lewat Paket (.json).
          </p>
          <Button3D variant="hijau" size="lg" onClick={() => onNavigasi('/game-saya')}>
            <FolderKanban size={20} />
            <span>Buka Game Saya (Offline)</span>
          </Button3D>
        </div>
      ) : sedangMemuatAuth ? (
        <div className="kartu-3d flex flex-1 items-center justify-center rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] text-xl font-bold text-[#FFD400]">
          Memeriksa status login guru...
        </div>
      ) : !profilGuru ? (
        <div className="kartu-3d flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-8 text-center">
          <Cloud size={48} className="text-[#FFD400]" />
          <h2 className="font-display text-2xl font-bold text-white">
            Masuk dengan Google untuk Mengelola Game Online
          </h2>
          <p className="max-w-[640px] text-base font-bold text-[#DCE7FF]">
            Masuk hanya diperlukan guru untuk melihat daftar terbitan, memperpanjang masa berlaku, memperbarui soal, atau menghapus link pendek.
          </p>
          <TombolAkunGuru />
        </div>
      ) : pesanError ? (
        <div className="kartu-3d flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-[#FF6B86] bg-[#450B1C] p-8 text-center">
          <AlertTriangle size={44} className="text-[#FFD400]" />
          <h2 className="font-display text-2xl font-bold text-[#FFD400]">
            Gagal Memuat Daftar Game Online
          </h2>
          <p className="max-w-[640px] text-base font-bold text-white">{pesanError}</p>
          <Button3D variant="kuning" size="md" onClick={() => void muatDaftarOnline()}>
            <RefreshCw size={18} />
            <span>Coba Lagi</span>
          </Button3D>
        </div>
      ) : sedangMemuat ? (
        <div className="kartu-3d flex flex-1 items-center justify-center rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] font-display text-xl font-bold text-[#FFD400]">
          Mengambil daftar game online Anda...
        </div>
      ) : daftarOnline.length === 0 ? (
        <div className="kartu-3d flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-8 text-center">
          <Cloud size={44} className="text-[#FFD400]" />
          <h2 className="font-display text-2xl font-bold text-white">
            Belum Ada Game yang Diterbitkan Online
          </h2>
          <p className="max-w-[600px] text-base font-bold text-[#DCE7FF]">
            Buka menu <strong>Game Saya</strong> &rarr; klik <strong>Bagikan</strong> pada salah satu game &rarr; pilih tab <strong>Bagikan Online</strong> untuk membuat link pendek &amp; QR.
          </p>
          <Button3D variant="hijau" size="lg" onClick={() => onNavigasi('/game-saya')}>
            <FolderKanban size={20} />
            <span>Buka Game Saya</span>
          </Button3D>
        </div>
      ) : (
        <div className="scroll-guru grid min-h-0 flex-1 grid-cols-2 gap-4 pr-2 pb-2">
          {daftarOnline.map((item) => {
            const sibuk = sedangAksiKode === item.kode;
            return (
              <div
                key={item.kode}
                className={`flex flex-col justify-between gap-3 rounded-3xl border-4 p-4 shadow-[0_8px_0_#071236] ${
                  item.sudahKedaluwarsa
                    ? 'border-[#FF6B86] bg-[#2D0E26]'
                    : 'border-[#3C62D4] bg-[#12276B]'
                }`}
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate font-display text-sm font-bold text-[#FFD400]">
                      {item.mapel}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border-2 border-[#FFD400] bg-[#071236] px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-widest text-[#FFD400]">
                        {item.kode}
                      </span>
                      {item.sudahKedaluwarsa ? (
                        <span className="rounded-lg bg-[#FF1744] px-2 py-0.5 font-display text-xs font-bold text-white">
                          KEDALUWARSA
                        </span>
                      ) : (
                        <span className="rounded-lg bg-[#00C853] px-2 py-0.5 font-display text-xs font-bold text-white">
                          AKTIF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-[38px] w-full">
                    <AutoFitText
                      maxFontSize={24}
                      minFontSize={15}
                      className="font-display font-bold text-white"
                    >
                      {item.judul}
                    </AutoFitText>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#DCE7FF]">
                    <span>
                      Soal: <strong className="tabular-angka text-[#57E893]">{item.jumlahSoal}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Kedaluwarsa:{' '}
                      <strong className="text-[#FFD400]">
                        {formatTanggalPendek(item.kedaluwarsaPadaMs)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button3D
                    variant="hijau"
                    size="sm"
                    disabled={sibuk}
                    onClick={() => setItemKodeBesar(item)}
                  >
                    <KeyRound size={15} />
                    <span>Tampilkan Kode Besar</span>
                  </Button3D>
                  <Button3D
                    variant="biru"
                    size="sm"
                    disabled={sibuk}
                    onClick={() => void handleSalinLink(item.kode)}
                  >
                    {kodeTersalin === item.kode ? <Check size={15} /> : <Copy size={15} />}
                    <span>{kodeTersalin === item.kode ? 'Tersalin' : 'Salin Link'}</span>
                  </Button3D>
                  <Button3D
                    variant="ungu"
                    size="sm"
                    disabled={sibuk}
                    onClick={() => setItemQr(item)}
                  >
                    <QrCode size={15} />
                    <span>QR PNG</span>
                  </Button3D>
                  <Button3D
                    variant="kuning"
                    size="sm"
                    disabled={sibuk}
                    onClick={() => {
                      setHariPerpanjang(30);
                      setItemPerpanjang(item);
                    }}
                  >
                    <CalendarClock size={15} />
                    <span>Perpanjang</span>
                  </Button3D>
                  <Button3D
                    variant="oranye"
                    size="sm"
                    disabled={sibuk}
                    onClick={() => bukaModalPerbarui(item)}
                  >
                    <RefreshCw size={15} />
                    <span>Perbarui Isi</span>
                  </Button3D>
                  <Button3D
                    variant="merah"
                    size="sm"
                    disabled={sibuk}
                    onClick={() => setItemKonfirmasiHapus(item)}
                  >
                    <Trash2 size={15} />
                    <span>Hapus</span>
                  </Button3D>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal QR Code */}
      <Modal
        terbuka={Boolean(itemQr)}
        judul={itemQr ? `QR Code Link Pendek: ${itemQr.kode}` : 'QR Code'}
        onTutup={() => setItemQr(null)}
        lebarMaks="md"
        footer={
          <Button3D variant="kuning" size="md" onClick={() => setItemQr(null)}>
            Tutup
          </Button3D>
        }
      >
        {itemQr && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl border-4 border-[#FFD400] bg-white p-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${itemQr.kode}`}
                  className="h-[220px] w-[220px] object-contain"
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center text-sm font-bold text-[#071236]">
                  Membuat QR...
                </div>
              )}
            </div>
            <input
              type="text"
              readOnly
              value={buatUrlGameOnline(itemQr.kode, alamatDasar)}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-[48px] w-full rounded-xl border-2 border-[#3C62D4] bg-[#040B24] px-3 font-mono text-xs font-bold text-[#57E893]"
            />
            <div className="flex gap-3">
              <Button3D
                variant="biru"
                size="md"
                onClick={() => void handleSalinLink(itemQr.kode)}
              >
                <Copy size={18} />
                <span>Salin Link</span>
              </Button3D>
              <Button3D
                variant="ungu"
                size="md"
                disabled={!qrDataUrl}
                onClick={handleUnduhQrPng}
              >
                <QrCode size={18} />
                <span>Unduh PNG</span>
              </Button3D>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Perpanjang */}
      <Modal
        terbuka={Boolean(itemPerpanjang)}
        judul={itemPerpanjang ? `Perpanjang: ${itemPerpanjang.judul}` : 'Perpanjang'}
        onTutup={() => setItemPerpanjang(null)}
        lebarMaks="md"
      >
        {itemPerpanjang && (
          <div className="flex flex-col gap-4">
            <p className="text-base font-bold text-[#DCE7FF]">
              Pilih durasi aktif baru (dihitung dari hari ini) untuk kode{' '}
              <strong className="font-mono text-[#FFD400]">{itemPerpanjang.kode}</strong>:
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PILIHAN_MASA_BERLAKU_HARI.map((hari) => (
                <button
                  key={hari}
                  type="button"
                  onClick={() => setHariPerpanjang(hari)}
                  className={`font-display min-h-[52px] cursor-pointer rounded-2xl border-3 text-base font-bold ${
                    hariPerpanjang === hari
                      ? 'border-[#FFE875] bg-[#FFD400] text-[#071236]'
                      : 'border-[#3C62D4] bg-[#071236] text-white'
                  }`}
                >
                  {hari} Hari
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button3D variant="navy" size="md" onClick={() => setItemPerpanjang(null)}>
                Batal
              </Button3D>
              <Button3D
                variant="hijau"
                size="md"
                disabled={sedangAksiKode === itemPerpanjang.kode}
                onClick={() => void handleEksekusiPerpanjang()}
              >
                <CalendarClock size={18} />
                <span>Simpan Perpanjangan</span>
              </Button3D>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Perbarui Isi */}
      <Modal
        terbuka={Boolean(itemPerbarui)}
        judul={itemPerbarui ? `Perbarui Isi Kode ${itemPerbarui.kode}` : 'Perbarui Isi'}
        onTutup={() => setItemPerbarui(null)}
        lebarMaks="md"
      >
        {itemPerbarui && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-bold text-[#DCE7FF]">
              Pilih game dari <strong>Game Saya (Lokal)</strong> untuk menimpa isi soal &amp; pengaturan pada link pendek{' '}
              <strong className="font-mono text-[#FFD400]">{itemPerbarui.kode}</strong> (tanpa mengubah kode link):
            </p>
            <select
              value={gameLokalDipilihId}
              onChange={(e) => setGameLokalDipilihId(e.target.value)}
              aria-label="Pilih game lokal untuk memperbarui isi"
              className="min-h-[48px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-bold text-white focus:border-[#FFD400] focus:outline-none"
            >
              {daftarGame.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.judul} ({g.soal.length} soal · {g.mapel})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <Button3D variant="navy" size="md" onClick={() => setItemPerbarui(null)}>
                Batal
              </Button3D>
              <Button3D
                variant="oranye"
                size="md"
                disabled={sedangAksiKode === itemPerbarui.kode || !gameLokalDipilihId}
                onClick={() => void handleEksekusiPerbarui()}
              >
                <RefreshCw size={18} />
                <span>Perbarui Isi Sekarang</span>
              </Button3D>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        terbuka={Boolean(itemKonfirmasiHapus)}
        judul="Hapus Game dari Online"
        onTutup={() => setItemKonfirmasiHapus(null)}
        lebarMaks="md"
      >
        {itemKonfirmasiHapus && (
          <div className="flex flex-col gap-4">
            <p className="text-base font-bold text-white">
              Yakin menghapus <span className="text-[#FFD400]">&quot;{itemKonfirmasiHapus.judul}&quot;</span> (kode{' '}
              <span className="font-mono text-[#FFD400]">{itemKonfirmasiHapus.kode}</span>) dari penyimpanan online?
            </p>
            <p className="text-sm font-semibold text-[#FFE8B3]">
              Setelah dihapus, link <code className="text-[#FFD400]">#/g/{itemKonfirmasiHapus.kode}</code> tidak dapat dibuka lagi. Salinan lokal di perangkat Anda tetap aman.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button3D variant="navy" size="md" onClick={() => setItemKonfirmasiHapus(null)}>
                Batal
              </Button3D>
              <Button3D
                variant="merah"
                size="md"
                disabled={sedangAksiKode === itemKonfirmasiHapus.kode}
                onClick={() => void handleEksekusiHapus()}
              >
                <Trash2 size={18} />
                <span>Ya, Hapus dari Online</span>
              </Button3D>
            </div>
          </div>
        )}
      </Modal>

      <KodeBesarModal
        terbuka={Boolean(itemKodeBesar)}
        kode={itemKodeBesar?.kode ?? ''}
        judul={itemKodeBesar?.judul ?? ''}
        baseUrl={alamatDasar}
        onTutup={() => setItemKodeBesar(null)}
        onToast={tampilkanToast}
      />
    </div>
  );
};

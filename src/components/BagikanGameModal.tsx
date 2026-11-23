import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Cloud,
  CloudUpload,
  Copy,
  Download,
  FileJson,
  Globe,
  KeyRound,
  Link2,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useAuthGuru } from '../app/AuthContext';
import { Game } from '../data/types';
import {
  ambilKodeOnlineTersimpanUntukGame,
  buatUrlGameOnline,
  hapusGameOnline,
  hapusPetaKodeOnlineUntukGame,
  MasaBerlakuHari,
  perbaruiIsiGameOnline,
  perpanjangGameOnline,
  PILIHAN_MASA_BERLAKU_HARI,
  terbitkanGameOnline,
} from '../services/gameOnlineService';
import { ambilAlamatAplikasiDasar } from '../utils/alamatAplikasi';
import {
  BATAS_KARAKTER_LINK_DATA,
  BATAS_KARAKTER_QR_DATA,
  buatLinkBerbagiGame,
  buatQrDataUrl,
  unduhPaketGameJson,
  VERSI_SKEMA_PAKET,
} from '../utils/paketGame';
import { AlamatAplikasiControl } from './AlamatAplikasiControl';
import { Button3D } from './Button3D';
import { KodeBesarModal } from './KodeBesarModal';
import { Modal } from './Modal';
import { TombolAkunGuru } from './TombolAkunGuru';

interface BagikanGameModalProps {
  game: Game | null;
  onTutup: () => void;
  onToast: (pesan: string, jenis?: 'info' | 'sukses' | 'peringatan' | 'error') => void;
  onBukaGameOnlineSaya?: () => void;
}

export const BagikanGameModal: React.FC<BagikanGameModalProps> = ({
  game,
  onTutup,
  onToast,
  onBukaGameOnlineSaya,
}) => {
  const { profilGuru, layananOnlineSiap } = useAuthGuru();

  const [alamatDasar, setAlamatDasar] = useState<string>(() => ambilAlamatAplikasiDasar());
  const [tampilPengaturanAlamat, setTampilPengaturanAlamat] = useState<boolean>(false);

  // State Bagian 2: Salin Link & QR Code (format ringkas v2, penjelasan opsional default mati)
  const [sertakanPenjelasan, setSertakanPenjelasan] = useState<boolean>(false);
  const [qrOfflineUrl, setQrOfflineUrl] = useState<string>('');
  const [sudahSalinOffline, setSudahSalinOffline] = useState(false);

  // State Bagian 3: Bagikan Online (#/g/KODE)
  const [masaBerlakuHari, setMasaBerlakuHari] = useState<MasaBerlakuHari>(30);
  const [kodeOnlineAktif, setKodeOnlineAktif] = useState<string | null>(null);
  const [qrOnlineUrl, setQrOnlineUrl] = useState<string>('');
  const [sudahSalinOnline, setSudahSalinOnline] = useState(false);
  const [sedangProsesOnline, setSedangProsesOnline] = useState(false);
  const [pesanOnlineError, setPesanOnlineError] = useState<string>('');
  const [konfirmasiHapusOnline, setKonfirmasiHapusOnline] = useState(false);
  const [kodeBesarTerbuka, setKodeBesarTerbuka] = useState(false);

  useEffect(() => {
    if (!game) return;
    setAlamatDasar(ambilAlamatAplikasiDasar());
    setTampilPengaturanAlamat(false);
    setSertakanPenjelasan(false);
    setSudahSalinOffline(false);
    setSudahSalinOnline(false);
    setPesanOnlineError('');
    setKonfirmasiHapusOnline(false);
    setKodeBesarTerbuka(false);
    setKodeOnlineAktif(ambilKodeOnlineTersimpanUntukGame(game.id));
  }, [game]);

  const hasilLinkOffline = useMemo(() => {
    if (!game) return null;
    return buatLinkBerbagiGame(game, alamatDasar, { sertakanPenjelasan });
  }, [game, alamatDasar, sertakanPenjelasan]);

  const urlGameOnline = useMemo(() => {
    if (!kodeOnlineAktif) return '';
    return buatUrlGameOnline(kodeOnlineAktif, alamatDasar);
  }, [kodeOnlineAktif, alamatDasar]);

  useEffect(() => {
    let aktif = true;
    setSudahSalinOffline(false);
    setQrOfflineUrl('');

    if (hasilLinkOffline && hasilLinkOffline.ok && hasilLinkOffline.qrDiizinkan) {
      buatQrDataUrl(hasilLinkOffline.url)
        .then((url) => {
          if (aktif) setQrOfflineUrl(url);
        })
        .catch(() => {
          if (aktif) setQrOfflineUrl('');
        });
    }

    return () => {
      aktif = false;
    };
  }, [hasilLinkOffline]);

  useEffect(() => {
    let aktif = true;
    setSudahSalinOnline(false);
    setQrOnlineUrl('');

    if (urlGameOnline) {
      buatQrDataUrl(urlGameOnline)
        .then((url) => {
          if (aktif) setQrOnlineUrl(url);
        })
        .catch(() => {
          if (aktif) setQrOnlineUrl('');
        });
    }

    return () => {
      aktif = false;
    };
  }, [urlGameOnline]);

  if (!game) return null;

  const slug =
    game.judul
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '') || 'duel-otak';

  const salinTeks = async (teks: string, tipe: 'offline' | 'online') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(teks);
      } else {
        const el = document.createElement('textarea');
        el.value = teks;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      if (tipe === 'offline') {
        setSudahSalinOffline(true);
      } else {
        setSudahSalinOnline(true);
      }
      onToast('Link game berhasil disalin ke papan klip.', 'sukses');
    } catch {
      onToast('Gagal menyalin otomatis. Pilih teks link lalu salin manual.', 'peringatan');
    }
  };

  const unduhQrPng = (dataUrl: string, namaFile: string) => {
    if (!dataUrl) return;
    const tautan = document.createElement('a');
    tautan.href = dataUrl;
    tautan.download = namaFile;
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
    onToast('Gambar QR Code (PNG) berhasil diunduh.', 'sukses');
  };

  const handleUnduhPaket = () => {
    unduhPaketGameJson(game);
    onToast(`Paket "${game.judul}" (.json) berhasil diunduh.`, 'sukses');
  };

  const handleTerbitkanBaru = async () => {
    if (!profilGuru) return;
    setSedangProsesOnline(true);
    setPesanOnlineError('');
    setKonfirmasiHapusOnline(false);
    try {
      const hasil = await terbitkanGameOnline({
        game,
        uid: profilGuru.uid,
        masaBerlakuHari,
      });
      if (!hasil.ok) {
        setPesanOnlineError(hasil.pesanError);
        onToast(hasil.pesanError, 'error');
        return;
      }
      setKodeOnlineAktif(hasil.item.kode);
      onToast(`Game diterbitkan online dengan kode ${hasil.item.kode}!`, 'sukses');
    } finally {
      setSedangProsesOnline(false);
    }
  };

  const handlePerpanjangOnline = async () => {
    if (!kodeOnlineAktif) return;
    setSedangProsesOnline(true);
    setPesanOnlineError('');
    try {
      const hasil = await perpanjangGameOnline(kodeOnlineAktif, masaBerlakuHari);
      if (!hasil.ok) {
        setPesanOnlineError(hasil.pesanError);
        onToast(hasil.pesanError, 'error');
        return;
      }
      onToast(
        `Masa berlaku kode ${kodeOnlineAktif} diperpanjang ${masaBerlakuHari} hari dari sekarang.`,
        'sukses'
      );
    } finally {
      setSedangProsesOnline(false);
    }
  };

  const handlePerbaruiIsiOnline = async () => {
    if (!kodeOnlineAktif) return;
    setSedangProsesOnline(true);
    setPesanOnlineError('');
    try {
      const hasil = await perbaruiIsiGameOnline(kodeOnlineAktif, game, masaBerlakuHari);
      if (!hasil.ok) {
        setPesanOnlineError(hasil.pesanError);
        onToast(hasil.pesanError, 'error');
        return;
      }
      onToast(`Isi soal & pengaturan untuk kode ${kodeOnlineAktif} berhasil diperbarui!`, 'sukses');
    } finally {
      setSedangProsesOnline(false);
    }
  };

  const handleHapusDariOnline = async () => {
    if (!kodeOnlineAktif) return;
    setSedangProsesOnline(true);
    setPesanOnlineError('');
    try {
      const hasil = await hapusGameOnline(kodeOnlineAktif);
      if (!hasil.ok) {
        setPesanOnlineError(hasil.pesanError);
        onToast(hasil.pesanError, 'error');
        return;
      }
      hapusPetaKodeOnlineUntukGame(game.id);
      setKodeOnlineAktif(null);
      setKonfirmasiHapusOnline(false);
      onToast('Game berhasil dihapus dari penyimpanan online.', 'info');
    } finally {
      setSedangProsesOnline(false);
    }
  };

  const panjangUrlOffline = hasilLinkOffline ? hasilLinkOffline.panjangUrl : 0;
  const muatDiQrOffline = Boolean(hasilLinkOffline?.ok && hasilLinkOffline.qrDiizinkan);

  return (
    <>
    <Modal
      terbuka={Boolean(game)}
      judul={`Bagikan Game: ${game.judul}`}
      onTutup={onTutup}
      lebarMaks="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#A8C4FF]">
            {game.soal.length} Soal · Mapel {game.mapel} · Alamat link: {alamatDasar}
          </span>
          <div className="flex items-center gap-2.5">
            {onBukaGameOnlineSaya && (
              <Button3D variant="ungu" size="md" onClick={onBukaGameOnlineSaya}>
                <Cloud size={18} />
                <span>Game Online Saya</span>
              </Button3D>
            )}
            <Button3D variant="kuning" size="md" onClick={onTutup}>
              Tutup
            </Button3D>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Baris Pengaturan Alamat Aplikasi (opsional buka/tutup agar modal tetap ringkas) */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-4 py-2">
          <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#DCE7FF]">
            <Globe size={16} className="shrink-0 text-[#FFD400]" />
            <span className="truncate">
              Alamat aplikasi untuk link: <code className="text-[#57E893]">{alamatDasar}</code>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTampilPengaturanAlamat((prev) => !prev)}
            className="min-h-[40px] cursor-pointer rounded-xl border border-[#3C62D4] bg-[#12276B] px-3 text-xs font-bold text-[#FFD400] hover:border-[#FFD400]"
          >
            {tampilPengaturanAlamat ? 'Sembunyikan Alamat' : 'Ubah Alamat Link'}
          </button>
        </div>

        {tampilPengaturanAlamat && (
          <AlamatAplikasiControl onBerubah={setAlamatDasar} onToast={onToast} />
        )}

        {/* Baris Atas: 1. Unduh Paket (.json) & 2. Salin Link & QR Code */}
        <div className="grid grid-cols-12 gap-4">
          {/* BAGIAN 1: Unduh Paket (.json) */}
          <div className="col-span-4 flex flex-col justify-between gap-3 rounded-2xl border-3 border-[#3C62D4] bg-[#071236] p-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[#FFD400]">
                <FileJson size={22} />
                <h3 className="font-display text-lg font-bold">1. Unduh Paket (.json)</h3>
              </div>
              <p className="text-bacaan text-xs font-semibold text-[#DCE7FF]">
                Cocok untuk soal puluhan hingga ratusan, arsip sekolah, atau pindah perangkat 100% offline.
              </p>
              <div className="rounded-xl border-2 border-[#2A4CB8] bg-[#12276B] p-2.5 text-xs font-bold text-[#DCE7FF]">
                <div>Judul: {game.judul}</div>
                <div>Mapel: {game.mapel}</div>
                <div>Total Soal: {game.soal.length} soal</div>
                <div>Skema: Versi {VERSI_SKEMA_PAKET} (utuh + kunci)</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button3D variant="hijau" size="md" fullWidth onClick={handleUnduhPaket}>
                <Download size={18} />
                <span>UNDUH PAKET (.JSON)</span>
              </Button3D>
              <div className="rounded-xl border border-[#FF9100] bg-[#4D2400] p-2 text-[11px] font-bold text-[#FFE8B3]">
                Kunci jawaban ikut di berkas paket. Bagikan hanya kepada guru atau saat siap bermain.
              </div>
            </div>
          </div>

          {/* BAGIAN 2: Salin Link & QR Code (Format Ringkas v2) */}
          <div className="col-span-8 flex flex-col justify-between gap-3 rounded-2xl border-3 border-[#3C62D4] bg-[#071236] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#FFD400]">
                <Link2 size={22} />
                <h3 className="font-display text-lg font-bold">2. Salin Link &amp; QR Code</h3>
              </div>

              <label className="flex min-h-[36px] cursor-pointer items-center gap-2 rounded-xl border border-[#3C62D4] bg-[#12276B] px-3 py-1 text-xs font-bold text-[#DCE7FF]">
                <input
                  type="checkbox"
                  checked={sertakanPenjelasan}
                  onChange={(e) => setSertakanPenjelasan(e.target.checked)}
                  className="h-4 w-4 accent-[#FFD400]"
                />
                <span>Sertakan penjelasan di link</span>
              </label>
            </div>

            {/* Dua indikator wajib: Ukuran link & Muat di QR */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`tabular-angka rounded-xl border-2 px-3 py-1 text-xs font-extrabold ${
                  panjangUrlOffline > BATAS_KARAKTER_LINK_DATA
                    ? 'border-[#FF6B86] bg-[#450B1C] text-[#FF8FA3]'
                    : panjangUrlOffline > 4000
                      ? 'border-[#FF9100] bg-[#4D2400] text-[#FFD400]'
                      : 'border-[#00C853] bg-[#005724] text-white'
                }`}
              >
                Ukuran link: {panjangUrlOffline} karakter (maks {BATAS_KARAKTER_LINK_DATA})
              </span>
              <span
                className={`tabular-angka rounded-xl border-2 px-3 py-1 text-xs font-extrabold ${
                  muatDiQrOffline
                    ? 'border-[#57E893] bg-[#005724] text-white'
                    : 'border-[#FF9100] bg-[#4D2400] text-[#FFD400]'
                }`}
              >
                Muat di QR: {muatDiQrOffline ? 'Ya' : 'Tidak'} (maks {BATAS_KARAKTER_QR_DATA})
              </span>
            </div>

            {hasilLinkOffline?.ok ? (
              <div className="flex flex-col gap-2.5">
                {hasilLinkOffline.peringatanPanjang && (
                  <div className="flex items-start gap-2 rounded-xl border-2 border-[#FF9100] bg-[#4D2400] p-2.5 text-xs font-bold text-[#FFD400]">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>{hasilLinkOffline.peringatanPanjang}</span>
                  </div>
                )}

                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-7 flex flex-col gap-2.5">
                    <p className="text-xs font-semibold text-[#DCE7FF]">
                      Format ringkas v2 terkompresi (<code className="text-[#FFD400]">#/impor/...</code>), berjalan 100% tanpa server.
                    </p>

                    <input
                      type="text"
                      readOnly
                      value={hasilLinkOffline.url}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Link berbagi game offline"
                      className="min-h-[48px] w-full rounded-xl border-2 border-[#2A4CB8] bg-[#040B24] px-3 py-2 font-mono text-xs text-[#57E893] focus:border-[#FFD400] focus:outline-none"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button3D
                        variant="biru"
                        size="md"
                        onClick={() => void salinTeks(hasilLinkOffline.url, 'offline')}
                      >
                        {sudahSalinOffline ? <Check size={17} /> : <Copy size={17} />}
                        <span>{sudahSalinOffline ? 'TERSALIN!' : 'SALIN LINK'}</span>
                      </Button3D>
                      {hasilLinkOffline.qrDiizinkan && (
                        <Button3D
                          variant="ungu"
                          size="md"
                          disabled={!qrOfflineUrl}
                          onClick={() => unduhQrPng(qrOfflineUrl, `qr-${slug}.png`)}
                        >
                          <QrCode size={17} />
                          <span>UNDUH PNG</span>
                        </Button3D>
                      )}
                    </div>
                  </div>

                  <div className="col-span-5">
                    {hasilLinkOffline.qrDiizinkan ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border-3 border-[#FFD400] bg-white p-2">
                        {qrOfflineUrl ? (
                          <img
                            src={qrOfflineUrl}
                            alt={`QR Code untuk ${game.judul}`}
                            className="h-[145px] w-[145px] object-contain"
                          />
                        ) : (
                          <div className="flex h-[145px] w-[145px] items-center justify-center text-xs font-bold text-[#071236]">
                            Membuat QR...
                          </div>
                        )}
                        <span className="mt-0.5 font-display text-[11px] font-bold text-[#071236]">
                          Pindai untuk Impor Game
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-[175px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[#FF9100] bg-[#4D2400] p-3 text-center">
                        <QrCode size={28} className="text-[#FFD400]" />
                        <div className="font-display text-sm font-bold text-[#FFD400]">
                          QR tidak tersedia untuk game sebesar ini
                        </div>
                        <p className="text-[11px] font-semibold text-[#FFE8B3]">
                          Tombol Salin Link di sebelah kiri tetap aktif, atau gunakan Bagikan Online di bawah untuk QR pendek.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border-3 border-[#FF9100] bg-[#4D2400] p-4 text-center">
                <AlertTriangle size={30} className="text-[#FFD400]" />
                <h4 className="font-display text-base font-bold text-[#FFD400]">
                  Soal terlalu banyak untuk link berisi data (di atas 8.000 karakter)
                </h4>
                <p className="text-xs font-bold text-white">{hasilLinkOffline?.pesanError}</p>
                <Button3D variant="hijau" size="sm" onClick={handleUnduhPaket}>
                  <Download size={16} />
                  <span>Unduh Paket (.json) Sekarang</span>
                </Button3D>
              </div>
            )}
          </div>
        </div>

        {/* BAGIAN 3: Bagikan Online (link pendek & QR) — selalu tampil */}
        <div className="flex flex-col gap-3 rounded-2xl border-3 border-[#7C4DFF] bg-[#071236] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#FFD400]">
              <Cloud size={22} />
              <h3 className="font-display text-lg font-bold">
                3. Bagikan Online (link pendek &amp; QR)
              </h3>
            </div>

            {onBukaGameOnlineSaya && (
              <Button3D variant="navy" size="sm" onClick={onBukaGameOnlineSaya}>
                <Cloud size={15} />
                <span>Kelola di Game Online Saya</span>
              </Button3D>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-[#FF9100] bg-[#4D2400] px-3 py-2 text-xs font-bold text-[#FFE8B3]">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-[#FFD400]" />
            <span>
              Game online disimpan di server Google (Firebase). Kunci jawaban ikut tersimpan. Siapa pun yang memiliki link dapat membukanya.
            </span>
          </div>

          {!layananOnlineSiap ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#FF9100] bg-[#12276B] p-4">
              <div className="flex items-center gap-3">
                <WifiOff size={28} className="shrink-0 text-[#FFD400]" />
                <div>
                  <h4 className="font-display text-base font-bold text-[#FFD400]">
                    Fitur online belum tersedia, gunakan paket berkas
                  </h4>
                  <p className="text-xs font-semibold text-[#DCE7FF]">
                    Perangkat sedang offline atau konfigurasi Firebase belum tersedia. Fitur Bagikan Paket (.json) dan Salin Link di atas tetap berjalan penuh.
                  </p>
                </div>
              </div>
            </div>
          ) : !profilGuru ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#3C62D4] bg-[#12276B] p-4">
              <div>
                <h4 className="font-display text-base font-bold text-white">
                  Masuk dengan Google untuk Menerbitkan Link Pendek (#/g/KODE)
                </h4>
                <p className="text-xs font-semibold text-[#DCE7FF]">
                  Cocok untuk bank soal besar karena link pendek selalu muat di QR. Membuka link oleh siswa tidak memerlukan login.
                </p>
              </div>
              <TombolAkunGuru onBukaGameOnlineSaya={onBukaGameOnlineSaya} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[#2A4CB8] bg-[#12276B] px-3.5 py-2">
                <TombolAkunGuru kompak onBukaGameOnlineSaya={onBukaGameOnlineSaya} />

                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#FFD400]">
                    <CalendarClock size={15} />
                    <span>Masa Berlaku:</span>
                  </span>
                  {PILIHAN_MASA_BERLAKU_HARI.map((hari) => {
                    const terpilih = masaBerlakuHari === hari;
                    return (
                      <button
                        key={hari}
                        type="button"
                        onClick={() => setMasaBerlakuHari(hari)}
                        className={`font-display min-h-[40px] cursor-pointer rounded-xl border-2 px-3 text-xs font-bold transition-colors ${
                          terpilih
                            ? 'border-[#FFE875] bg-[#FFD400] text-[#071236]'
                            : 'border-[#3C62D4] bg-[#071236] text-[#DCE7FF] hover:border-[#FFD400]'
                        }`}
                      >
                        {hari} Hari
                      </button>
                    );
                  })}
                </div>
              </div>

              {pesanOnlineError && (
                <div className="rounded-xl border-2 border-[#FF6B86] bg-[#450B1C] px-3.5 py-2 text-xs font-bold text-white">
                  {pesanOnlineError}
                </div>
              )}

              {!kodeOnlineAktif ? (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#3C62D4] bg-[#12276B] p-4">
                  <div>
                    <h4 className="font-display text-base font-bold text-[#FFD400]">
                      Terbitkan Link Pendek &amp; QR Besar
                    </h4>
                    <p className="text-xs font-semibold text-[#DCE7FF]">
                      Menghasilkan kode acak 8 karakter (<code className="text-[#57E893]">#/g/KODE</code>) tanpa batas 2.000 karakter QR.
                    </p>
                  </div>
                  <Button3D
                    variant="hijau"
                    size="md"
                    disabled={sedangProsesOnline || game.soal.length === 0}
                    onClick={() => void handleTerbitkanBaru()}
                  >
                    <CloudUpload size={18} />
                    <span>{sedangProsesOnline ? 'MENERBITKAN...' : 'TERBITKAN'}</span>
                  </Button3D>
                </div>
              ) : (
                <div className="grid grid-cols-12 items-center gap-4 rounded-2xl border-2 border-[#00C853] bg-[#12276B] p-3.5">
                  <div className="col-span-9 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[#00C853] px-2.5 py-0.5 font-display text-xs font-bold text-white">
                          TERBIT ONLINE
                        </span>
                        <span className="rounded-lg border-2 border-[#FFD400] bg-[#071236] px-2.5 py-0.5 font-mono text-sm font-extrabold tracking-widest text-[#FFD400]">
                          {kodeOnlineAktif}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={sedangProsesOnline}
                        onClick={() => void handleTerbitkanBaru()}
                        className="min-h-[38px] cursor-pointer rounded-xl border border-[#3C62D4] bg-[#071236] px-3 text-xs font-bold text-[#DCE7FF] hover:border-[#FFD400] hover:text-white"
                      >
                        + Terbitkan Kode Baru
                      </button>
                    </div>

                    <input
                      type="text"
                      readOnly
                      value={urlGameOnline}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label="Link pendek game online"
                      className="min-h-[48px] w-full rounded-xl border-2 border-[#2A4CB8] bg-[#040B24] px-3 py-2 font-mono text-xs font-bold text-[#57E893] focus:border-[#FFD400] focus:outline-none"
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button3D
                        variant="hijau"
                        size="sm"
                        onClick={() => setKodeBesarTerbuka(true)}
                      >
                        <KeyRound size={16} />
                        <span>TAMPILKAN KODE BESAR</span>
                      </Button3D>
                      <Button3D
                        variant="biru"
                        size="sm"
                        onClick={() => void salinTeks(urlGameOnline, 'online')}
                      >
                        {sudahSalinOnline ? <Check size={16} /> : <Copy size={16} />}
                        <span>{sudahSalinOnline ? 'TERSALIN!' : 'SALIN LINK'}</span>
                      </Button3D>
                      <Button3D
                        variant="ungu"
                        size="sm"
                        disabled={!qrOnlineUrl}
                        onClick={() => unduhQrPng(qrOnlineUrl, `qr-online-${kodeOnlineAktif}.png`)}
                      >
                        <QrCode size={16} />
                        <span>UNDUH QR (PNG)</span>
                      </Button3D>
                      <Button3D
                        variant="kuning"
                        size="sm"
                        disabled={sedangProsesOnline}
                        onClick={() => void handlePerpanjangOnline()}
                      >
                        <CalendarClock size={16} />
                        <span>PERPANJANG ({masaBerlakuHari}H)</span>
                      </Button3D>
                      <Button3D
                        variant="oranye"
                        size="sm"
                        disabled={sedangProsesOnline}
                        onClick={() => void handlePerbaruiIsiOnline()}
                      >
                        <RefreshCw size={16} />
                        <span>PERBARUI ISI</span>
                      </Button3D>
                      {!konfirmasiHapusOnline ? (
                        <Button3D
                          variant="merah"
                          size="sm"
                          disabled={sedangProsesOnline}
                          onClick={() => setKonfirmasiHapusOnline(true)}
                        >
                          <Trash2 size={16} />
                          <span>HAPUS DARI ONLINE</span>
                        </Button3D>
                      ) : (
                        <Button3D
                          variant="merah"
                          size="sm"
                          disabled={sedangProsesOnline}
                          onClick={() => void handleHapusDariOnline()}
                        >
                          <Trash2 size={16} />
                          <span>KONFIRMASI HAPUS?</span>
                        </Button3D>
                      )}
                    </div>
                  </div>

                  <div className="col-span-3 flex flex-col items-center justify-center rounded-2xl border-3 border-[#FFD400] bg-white p-2">
                    {qrOnlineUrl ? (
                      <img
                        src={qrOnlineUrl}
                        alt={`QR Link Pendek ${kodeOnlineAktif}`}
                        className="h-[130px] w-[130px] object-contain"
                      />
                    ) : (
                      <div className="flex h-[130px] w-[130px] items-center justify-center text-xs font-bold text-[#071236]">
                        Membuat QR...
                      </div>
                    )}
                    <span className="mt-0.5 font-display text-[11px] font-bold text-[#071236]">
                      Kode: {kodeOnlineAktif}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
    <KodeBesarModal
      terbuka={kodeBesarTerbuka && Boolean(kodeOnlineAktif)}
      kode={kodeOnlineAktif ?? ''}
      judul={game.judul}
      baseUrl={alamatDasar}
      onTutup={() => setKodeBesarTerbuka(false)}
      onToast={onToast}
    />
    </>
  );
};

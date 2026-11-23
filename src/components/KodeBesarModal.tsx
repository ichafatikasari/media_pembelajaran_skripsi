import React, { useEffect, useState } from 'react';
import { Check, Copy, Globe, KeyRound, QrCode, X } from 'lucide-react';
import {
  buatUrlGameOnline,
  formatKodeKelompok,
  normalisasiKodeOnline,
} from '../services/gameOnlineService';
import { ambilAlamatAplikasiDasar } from '../utils/alamatAplikasi';
import { buatQrDataUrl } from '../utils/paketGame';
import { AutoFitText } from './AutoFitText';
import { Button3D } from './Button3D';

interface KodeBesarModalProps {
  terbuka: boolean;
  kode: string;
  judul: string;
  baseUrl?: string;
  onTutup: () => void;
  onToast?: (pesan: string, jenis?: 'info' | 'sukses' | 'peringatan' | 'error') => void;
}

export const KodeBesarModal: React.FC<KodeBesarModalProps> = ({
  terbuka,
  kode,
  judul,
  baseUrl,
  onTutup,
  onToast,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [statusSalin, setStatusSalin] = useState<'kode' | 'link' | null>(null);

  const kodeBersih = normalisasiKodeOnline(kode);
  const kodeKelompok = formatKodeKelompok(kodeBersih);
  const alamatPendek = baseUrl ?? ambilAlamatAplikasiDasar();
  const urlLengkap = buatUrlGameOnline(kodeBersih, alamatPendek);

  useEffect(() => {
    if (!terbuka) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onTutup();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [terbuka, onTutup]);

  useEffect(() => {
    if (!terbuka || !kodeBersih) {
      setQrUrl('');
      return;
    }
    let aktif = true;
    setStatusSalin(null);
    buatQrDataUrl(urlLengkap)
      .then((res) => {
        if (aktif) setQrUrl(res);
      })
      .catch(() => {
        if (aktif) setQrUrl('');
      });
    return () => {
      aktif = false;
    };
  }, [terbuka, kodeBersih, urlLengkap]);

  if (!terbuka) return null;

  const salinTeks = async (teks: string, jenis: 'kode' | 'link') => {
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
      setStatusSalin(jenis);
      onToast?.(
        jenis === 'kode'
          ? `Kode ${kodeBersih} berhasil disalin.`
          : 'Link game online berhasil disalin.',
        'sukses'
      );
    } catch {
      onToast?.('Gagal menyalin otomatis. Gunakan teks di layar.', 'peringatan');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tampilan Kode Besar ${kodeKelompok}`}
      className="fixed inset-0 z-[70] flex flex-col justify-between bg-[#071236] p-7"
    >
      {/* Header Atas */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-3.5 shadow-[0_8px_0_#040B24]">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            <KeyRound size={26} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xs font-bold tracking-wider text-[#57E893] uppercase">
              KODE GAME UNTUK SMARTBOARD &amp; KELAS
            </div>
            <div className="h-[38px] w-full">
              <AutoFitText
                maxFontSize={28}
                minFontSize={16}
                className="font-display teks-outline-tebal font-bold text-white"
              >
                {judul}
              </AutoFitText>
            </div>
          </div>
        </div>

        <Button3D variant="merah" size="lg" onClick={onTutup} aria-label="Tutup tampilan kode besar">
          <X size={24} strokeWidth={3} />
          <span>Tutup</span>
        </Button3D>
      </div>

      {/* Konten Tengah (Kode Raksasa 4-4 + Alamat Pendek + QR Code) */}
      <div className="my-4 grid min-h-0 flex-1 grid-cols-12 items-center gap-6">
        <div className="kartu-3d col-span-8 flex h-full flex-col items-center justify-center gap-5 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] px-8 py-6 text-center">
          <span className="font-display rounded-xl border-2 border-[#071236] bg-[#00C853] px-4 py-1 text-base font-bold text-white">
            KETIK KODE DI SMARTBOARD (TANPA LOGIN)
          </span>

          {/* Kode Raksasa 4-4 */}
          <div className="flex w-full items-center justify-center rounded-3xl border-4 border-[#FFD400] bg-[#040B24] px-6 py-5 shadow-[0_10px_0_#071236]">
            <div className="h-[130px] w-full">
              <AutoFitText
                maxFontSize={112}
                minFontSize={44}
                className="font-mono font-black tracking-[0.14em] text-[#FFD400]"
              >
                {kodeKelompok}
              </AutoFitText>
            </div>
          </div>

          {/* Alamat Aplikasi Pendek di bawah kode */}
          <div className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-5 py-3">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-[#A8C4FF]">
              <Globe size={17} className="shrink-0 text-[#57E893]" />
              <span>Buka alamat aplikasi berikut, lalu klik &quot;MASUK DENGAN KODE&quot;:</span>
            </div>
            <div className="h-[34px] w-full">
              <AutoFitText
                maxFontSize={24}
                minFontSize={12}
                className="font-mono font-bold text-[#57E893]"
              >
                {alamatPendek}
              </AutoFitText>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: QR Code untuk HP guru lain/siswa */}
        <div className="kartu-3d col-span-4 flex h-full flex-col items-center justify-center gap-4 rounded-3xl border-4 border-[#7C4DFF] bg-[#12276B] p-6 text-center">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-[#FFD400]">
            <QrCode size={22} />
            <span>PINDAI QR DENGAN HP</span>
          </div>

          <div className="rounded-3xl border-4 border-[#FFD400] bg-white p-3.5 shadow-[0_8px_0_#071236]">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR Code untuk game ${kodeKelompok}`}
                className="h-[250px] w-[250px] object-contain"
              />
            ) : (
              <div className="flex h-[250px] w-[250px] items-center justify-center font-display text-base font-bold text-[#071236]">
                Membuat QR...
              </div>
            )}
          </div>

          <p className="text-xs font-bold text-[#DCE7FF]">
            QR dipindai menggunakan kamera HP guru lain atau siswa, bukan oleh Smartboard.
          </p>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#2A4CB8] bg-[#12276B] px-6 py-3.5">
        <div className="text-sm font-bold text-[#DCE7FF]">
          Catatan: Kode tidak memakai huruf <strong className="text-[#FFD400]">I, O</strong> dan angka{' '}
          <strong className="text-[#FFD400]">0, 1</strong> agar mudah dibaca dari jauh.
        </div>

        <div className="flex items-center gap-3">
          <Button3D
            variant="kuning"
            size="lg"
            onClick={() => void salinTeks(kodeBersih, 'kode')}
          >
            {statusSalin === 'kode' ? <Check size={20} /> : <Copy size={20} />}
            <span>{statusSalin === 'kode' ? 'KODE TERSALIN' : 'Salin Kode'}</span>
          </Button3D>
          <Button3D
            variant="biru"
            size="lg"
            onClick={() => void salinTeks(urlLengkap, 'link')}
          >
            {statusSalin === 'link' ? <Check size={20} /> : <Copy size={20} />}
            <span>{statusSalin === 'link' ? 'LINK TERSALIN' : 'Salin Link'}</span>
          </Button3D>
          <Button3D variant="navy" size="lg" onClick={onTutup}>
            <span>Tutup</span>
          </Button3D>
        </div>
      </div>
    </div>
  );
};

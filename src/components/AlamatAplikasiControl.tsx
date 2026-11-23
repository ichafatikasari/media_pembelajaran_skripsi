import React, { useState } from 'react';
import { Check, Copy, Globe, RotateCcw, Save } from 'lucide-react';
import {
  ambilAlamatAplikasiDasar,
  apakahAlamatAplikasiKustom,
  resetAlamatAplikasiDasar,
  simpanAlamatAplikasiDasar,
} from '../utils/alamatAplikasi';
import { Button3D } from './Button3D';

interface AlamatAplikasiControlProps {
  onBerubah?: (alamatBaru: string) => void;
  onToast?: (pesan: string, jenis?: 'info' | 'sukses' | 'peringatan' | 'error') => void;
}

export const AlamatAplikasiControl: React.FC<AlamatAplikasiControlProps> = ({
  onBerubah,
  onToast,
}) => {
  const [inputAlamat, setInputAlamat] = useState<string>(() => ambilAlamatAplikasiDasar());
  const [kustomAktif, setKustomAktif] = useState<boolean>(() => apakahAlamatAplikasiKustom());
  const [pesanError, setPesanError] = useState<string>('');
  const [sudahSalin, setSudahSalin] = useState<boolean>(false);

  const handleSimpan = () => {
    const hasil = simpanAlamatAplikasiDasar(inputAlamat);
    if (!hasil.ok) {
      setPesanError(hasil.pesanError ?? 'Alamat aplikasi tidak valid.');
      return;
    }
    setPesanError('');
    setInputAlamat(hasil.alamatFinal);
    setKustomAktif(apakahAlamatAplikasiKustom());
    onBerubah?.(hasil.alamatFinal);
    onToast?.('Alamat aplikasi untuk link berhasil disimpan.', 'sukses');
  };

  const handleReset = () => {
    const bawaan = resetAlamatAplikasiDasar();
    setPesanError('');
    setInputAlamat(bawaan);
    setKustomAktif(false);
    onBerubah?.(bawaan);
    onToast?.('Alamat aplikasi dikembalikan ke URL browser saat ini.', 'info');
  };

  const handleSalinAlamat = async () => {
    const alamatUntukSalin = ambilAlamatAplikasiDasar();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(alamatUntukSalin);
      } else {
        const el = document.createElement('textarea');
        el.value = alamatUntukSalin;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setSudahSalin(true);
      onToast?.('Alamat aplikasi (tanpa #/g/KODE) berhasil disalin.', 'sukses');
    } catch {
      onToast?.('Gagal menyalin otomatis. Pilih teks alamat di atas lalu salin manual.', 'peringatan');
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#2A4CB8] bg-[#040B24] p-3.5">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FFD400]">
          <Globe size={15} />
          <span>Alamat aplikasi untuk link (disimpan di browser ini)</span>
        </div>
        {kustomAktif && (
          <span className="rounded bg-[#1E6BFF] px-2 py-0.5 text-[11px] font-bold text-white">
            Alamat Kustom Aktif
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="url"
          value={inputAlamat}
          onChange={(e) => {
            setInputAlamat(e.target.value);
            setSudahSalin(false);
          }}
          placeholder="https://nama-aplikasi.web.app/"
          aria-label="Alamat aplikasi untuk link"
          className="min-h-[48px] min-w-[200px] flex-1 rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 font-mono text-xs text-white focus:border-[#FFD400] focus:outline-none"
        />
        <Button3D variant="biru" size="sm" onClick={handleSimpan}>
          <Save size={15} />
          <span>Simpan</span>
        </Button3D>
        <Button3D variant="hijau" size="sm" onClick={() => void handleSalinAlamat()}>
          {sudahSalin ? <Check size={15} /> : <Copy size={15} />}
          <span>{sudahSalin ? 'Tersalin' : 'Salin Alamat Aplikasi'}</span>
        </Button3D>
        <Button3D variant="navy" size="sm" onClick={handleReset}>
          <RotateCcw size={15} />
          <span>Bawaan</span>
        </Button3D>
      </div>

      {pesanError ? (
        <p className="mt-1.5 text-xs font-bold text-[#FF6B86]">{pesanError}</p>
      ) : (
        <p className="mt-1.5 text-[11px] font-semibold text-[#A8C4FF]">
          Disarankan memakai alamat aplikasi yang sudah dipublikasikan (Published URL), bukan URL pengembangan, agar lebih pendek dan mudah dibuka di Smartboard.
        </p>
      )}
    </div>
  );
};

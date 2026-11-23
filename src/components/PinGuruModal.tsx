import React, { useEffect, useState } from 'react';
import { Delete, Lock, Unlock } from 'lucide-react';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

interface PanelKeypadPinProps {
  judulKeterangan: string;
  pinBenar: string;
  labelTombolBuka?: string;
  onBerhasil: () => void;
  onBatal?: () => void;
  aksiTambahanLabel?: string;
  onAksiTambahan?: () => void;
}

const BARIS_ANGKA = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['BERSIH', '0', 'HAPUS'],
];

export const PanelKeypadPin: React.FC<PanelKeypadPinProps> = ({
  judulKeterangan,
  pinBenar,
  labelTombolBuka = 'Buka Kunci',
  onBerhasil,
  onBatal,
  aksiTambahanLabel,
  onAksiTambahan,
}) => {
  const [inputPin, setInputPin] = useState('');
  const [pesanError, setPesanError] = useState('');

  const cobaVerifikasi = (kandidat: string) => {
    if (kandidat === pinBenar) {
      setPesanError('');
      setInputPin('');
      onBerhasil();
      return;
    }
    setPesanError('PIN Guru salah. Periksa kembali 4 angka PIN Anda.');
    setInputPin('');
  };

  const tekanAngka = (digit: string) => {
    setPesanError('');
    setInputPin((prev) => {
      if (prev.length >= 4) return prev;
      const berikutnya = prev + digit;
      if (berikutnya.length === 4) {
        window.setTimeout(() => {
          cobaVerifikasi(berikutnya);
        }, 80);
      }
      return berikutnya;
    });
  };

  const tekanHapus = () => {
    setPesanError('');
    setInputPin((prev) => prev.slice(0, -1));
  };

  const tekanBersih = () => {
    setPesanError('');
    setInputPin('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        tekanAngka(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        tekanHapus();
      } else if (e.key === 'Enter' && inputPin.length === 4) {
        e.preventDefault();
        cobaVerifikasi(inputPin);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4 py-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
        <Lock size={30} strokeWidth={2.5} />
      </div>

      <p className="text-bacaan text-base font-bold text-[#DCE7FF]">{judulKeterangan}</p>

      {/* Indikator 4 digit besar */}
      <div className="grid w-full grid-cols-4 gap-3 px-4" aria-label="Tampilan digit PIN">
        {[0, 1, 2, 3].map((idx) => {
          const terisi = idx < inputPin.length;
          return (
            <div
              key={idx}
              className={`flex h-16 items-center justify-center rounded-2xl border-3 font-display text-3xl font-bold ${
                terisi
                  ? 'border-[#FFD400] bg-[#173287] text-[#FFD400]'
                  : 'border-[#3C62D4] bg-[#071236] text-[#7FA0E8]'
              }`}
            >
              {terisi ? '●' : '–'}
            </div>
          );
        })}
      </div>

      {pesanError && (
        <p className="rounded-xl border-2 border-[#FF6B86] bg-[#450B1C] px-4 py-1.5 text-sm font-bold text-[#FFD400]">
          {pesanError}
        </p>
      )}

      {/* Layar angka besar ramah sentuh */}
      <div className="grid w-full grid-cols-3 gap-2.5 px-2">
        {BARIS_ANGKA.flat().map((tombol) => {
          if (tombol === 'BERSIH') {
            return (
              <Button3D key={tombol} variant="navy" size="md" onClick={tekanBersih}>
                <span className="text-sm">Bersih</span>
              </Button3D>
            );
          }
          if (tombol === 'HAPUS') {
            return (
              <Button3D
                key={tombol}
                variant="oranye"
                size="md"
                onClick={tekanHapus}
                aria-label="Hapus digit"
              >
                <Delete size={22} />
              </Button3D>
            );
          }
          return (
            <Button3D
              key={tombol}
              variant="biru"
              size="lg"
              onClick={() => tekanAngka(tombol)}
              className="!min-h-[60px] !text-2xl"
            >
              <span className="tabular-angka">{tombol}</span>
            </Button3D>
          );
        })}
      </div>

      <div className="mt-1 flex w-full items-center justify-between gap-3 px-2">
        {onBatal ? (
          <Button3D variant="navy" size="md" onClick={onBatal}>
            Batal
          </Button3D>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          {aksiTambahanLabel && onAksiTambahan && (
            <Button3D variant="ungu" size="md" onClick={onAksiTambahan}>
              {aksiTambahanLabel}
            </Button3D>
          )}
          <Button3D
            variant="hijau"
            size="md"
            disabled={inputPin.length < 4}
            onClick={() => cobaVerifikasi(inputPin)}
          >
            <Unlock size={18} />
            <span>{labelTombolBuka}</span>
          </Button3D>
        </div>
      </div>
    </div>
  );
};

interface PinGuruModalProps {
  terbuka: boolean;
  judul: string;
  keterangan: string;
  pinBenar: string;
  onBerhasil: () => void;
  onTutup: () => void;
}

export const PinGuruModal: React.FC<PinGuruModalProps> = ({
  terbuka,
  judul,
  keterangan,
  pinBenar,
  onBerhasil,
  onTutup,
}) => {
  return (
    <Modal terbuka={terbuka} judul={judul} onTutup={onTutup} lebarMaks="md">
      {terbuka && (
        <PanelKeypadPin
          judulKeterangan={keterangan}
          pinBenar={pinBenar}
          onBerhasil={onBerhasil}
          onBatal={onTutup}
        />
      )}
    </Modal>
  );
};

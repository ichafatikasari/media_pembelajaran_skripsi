import React, { useMemo, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { formatWaktuLengkapHHMMSS, ItemSampahSoal } from '../utils/wizardDraft';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

interface TempatSampahModalProps {
  terbuka: boolean;
  daftarSampah: ItemSampahSoal[];
  onTutup: () => void;
  onKembalikanSatu: (itemId: string) => void;
  onKembalikanSemua: () => void;
  onKosongkanSemua: () => void;
}

export const TempatSampahModal: React.FC<TempatSampahModalProps> = ({
  terbuka,
  daftarSampah,
  onTutup,
  onKembalikanSatu,
  onKembalikanSemua,
  onKosongkanSemua,
}) => {
  const [konfirmasiKosongkan, setKonfirmasiKosongkan] = useState(false);

  const daftarUrut = useMemo(
    () =>
      [...daftarSampah].sort((a, b) => {
        if (b.dihapusPada !== a.dihapusPada) return b.dihapusPada - a.dihapusPada;
        if (b.urutanHapus !== a.urutanHapus) return b.urutanHapus - a.urutanHapus;
        return a.posisiSemula - b.posisiSemula;
      }),
    [daftarSampah]
  );

  return (
    <>
      <Modal
        terbuka={terbuka}
        judul={`Tempat Sampah Soal (${daftarSampah.length})`}
        lebarMaks="xl"
        onTutup={onTutup}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#DCE7FF]">
              Soal terhapus tetap tersimpan bersama draf dan otomatis bersih 7 hari setelah game disimpan final.
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button3D
                variant="merah"
                size="sm"
                disabled={daftarSampah.length === 0}
                onClick={() => setKonfirmasiKosongkan(true)}
              >
                <Trash2 size={16} />
                <span>Kosongkan Tempat Sampah</span>
              </Button3D>
              <Button3D
                variant="hijau"
                size="sm"
                disabled={daftarSampah.length === 0}
                onClick={onKembalikanSemua}
              >
                <RotateCcw size={16} />
                <span>Kembalikan Semua ({daftarSampah.length})</span>
              </Button3D>
              <Button3D variant="navy" size="sm" onClick={onTutup}>
                <span>Tutup</span>
              </Button3D>
            </div>
          </div>
        }
      >
        {daftarUrut.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#3C62D4] bg-[#071236] p-8 text-center">
            <p className="font-display text-lg font-bold text-[#FFD400]">
              Tempat Sampah Kosong
            </p>
            <p className="mt-1 text-sm font-semibold text-[#DCE7FF]">
              Setiap soal yang Anda hapus dari layar Periksa Soal atau Koreksi Cepat akan ditampung di sini agar bisa dikembalikan kapan saja.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {daftarUrut.map((entri) => {
              const hurufKunci =
                entri.soal.kunci !== null &&
                entri.soal.kunci >= 0 &&
                entri.soal.kunci < entri.soal.pilihan.length
                  ? String.fromCharCode(65 + entri.soal.kunci)
                  : null;

              return (
                <div
                  key={entri.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-3.5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="font-display rounded-lg bg-[#FFD400] px-2.5 py-0.5 text-[#0B1B4D]">
                        Posisi semula #{entri.posisiSemula + 1}
                      </span>
                      <span className="rounded-lg bg-[#173287] px-2.5 py-0.5 text-[#DCE7FF]">
                        Dihapus {formatWaktuLengkapHHMMSS(entri.dihapusPada)}
                      </span>
                      <span
                        className={`rounded-lg px-2.5 py-0.5 ${
                          hurufKunci
                            ? 'bg-[#007A33] text-[#57E893]'
                            : 'bg-[#450B1C] text-[#FF99AD]'
                        }`}
                      >
                        {hurufKunci ? `Kunci: ${hurufKunci}` : 'Tanpa kunci'}
                      </span>
                      {entri.soal.cadangan && (
                        <span className="rounded-lg bg-[#7C4DFF] px-2.5 py-0.5 text-white">
                          Cadangan
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-white">
                      {entri.soal.pertanyaan.trim() || '(Teks pertanyaan kosong)'}
                    </p>
                    <p className="truncate text-xs font-semibold text-[#A8C4FF]">
                      {entri.soal.pilihan
                        .map((p, idx) => `${String.fromCharCode(65 + idx)}. ${p || '-'}`)
                        .join('   •   ')}
                    </p>
                  </div>

                  <Button3D
                    variant="hijau"
                    size="sm"
                    onClick={() => onKembalikanSatu(entri.id)}
                  >
                    <RotateCcw size={16} />
                    <span>Kembalikan</span>
                  </Button3D>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        terbuka={konfirmasiKosongkan}
        judul="Kosongkan Tempat Sampah?"
        lebarMaks="md"
        onTutup={() => setKonfirmasiKosongkan(false)}
        footer={
          <>
            <Button3D
              variant="navy"
              size="md"
              onClick={() => setKonfirmasiKosongkan(false)}
            >
              <span>Batal</span>
            </Button3D>
            <Button3D
              variant="merah"
              size="md"
              onClick={() => {
                setKonfirmasiKosongkan(false);
                onKosongkanSemua();
              }}
            >
              <Trash2 size={18} />
              <span>Hapus Permanen ({daftarSampah.length})</span>
            </Button3D>
          </>
        }
      >
        <p className="text-base font-bold text-white">
          Semua <span className="text-[#FFD400]">{daftarSampah.length} soal</span> di Tempat Sampah game ini akan dihapus permanen dan tidak bisa dikembalikan lagi.
        </p>
      </Modal>
    </>
  );
};

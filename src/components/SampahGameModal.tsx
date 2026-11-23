import React, { useState } from 'react';
import { Cloud, RotateCcw, Trash2 } from 'lucide-react';
import { formatKodeKelompok } from '../services/gameOnlineService';
import { hitungSisaHariSampahGame, ItemSampahGame } from '../utils/sampahGame';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

interface SampahGameModalProps {
  terbuka: boolean;
  daftarSampahGame: ItemSampahGame[];
  onTutup: () => void;
  onPulihkan: (ids: string[]) => void;
  onHapusPermanen: (ids: string[]) => void;
  onKosongkanSemua: () => void;
}

function formatWaktuHapus(timestamp: number): string {
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

export const SampahGameModal: React.FC<SampahGameModalProps> = ({
  terbuka,
  daftarSampahGame,
  onTutup,
  onPulihkan,
  onHapusPermanen,
  onKosongkanSemua,
}) => {
  const [konfirmasiKosongkan, setKonfirmasiKosongkan] = useState(false);

  const semuaId = daftarSampahGame.map((item) => item.id);

  return (
    <>
      <Modal
        terbuka={terbuka}
        judul={`Sampah Game (${daftarSampahGame.length})`}
        onTutup={onTutup}
        lebarMaks="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#A8C4FF]">
              Game yang dihapus disimpan selama 7 hari sebelum dibersihkan otomatis.
            </span>
            <div className="flex items-center gap-2.5">
              {daftarSampahGame.length > 0 && (
                <>
                  <Button3D
                    variant="hijau"
                    size="md"
                    onClick={() => onPulihkan(semuaId)}
                  >
                    <RotateCcw size={18} />
                    <span>Kembalikan Semua</span>
                  </Button3D>
                  <Button3D
                    variant="merah"
                    size="md"
                    onClick={() => setKonfirmasiKosongkan(true)}
                  >
                    <Trash2 size={18} />
                    <span>Kosongkan Sampah</span>
                  </Button3D>
                </>
              )}
              <Button3D variant="navy" size="md" onClick={onTutup}>
                Tutup
              </Button3D>
            </div>
          </div>
        }
      >
        {daftarSampahGame.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-6 py-10 text-center">
            <Trash2 size={36} className="text-[#669BFF]" />
            <p className="font-display text-xl font-bold text-[#FFD400]">
              Sampah Game kosong
            </p>
            <p className="text-sm font-semibold text-[#DCE7FF]">
              Game yang Anda hapus akan masuk ke sini selama 7 hari agar masih bisa dikembalikan kapan saja.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {daftarSampahGame.map((item) => {
              const sisaHari = hitungSisaHariSampahGame(item.kedaluwarsaPada);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold text-white">
                        {item.game.judul}
                      </span>
                      <span className="rounded-lg bg-[#173287] px-2 py-0.5 text-xs font-bold text-[#FFD400]">
                        {item.game.mapel || 'Umum'}
                      </span>
                      <span className="rounded-lg bg-[#005724] px-2 py-0.5 text-xs font-bold text-[#57E893]">
                        {item.game.soal.length} soal
                      </span>
                      <span className="rounded-lg border border-[#FF9100] bg-[#4D2400] px-2 py-0.5 text-xs font-bold text-[#FFE8B3]">
                        Tersisa {sisaHari} hari
                      </span>
                      {item.kodeOnline && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#2D1463] px-2 py-0.5 font-mono text-xs font-bold text-[#E6D6FF]">
                          <Cloud size={12} />
                          {formatKodeKelompok(item.kodeOnline)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#A8C4FF]">
                      Dihapus: {formatWaktuHapus(item.dihapusPada)} · Mode{' '}
                      <span className="uppercase">{item.game.pengaturan.mode}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button3D
                      variant="hijau"
                      size="sm"
                      onClick={() => onPulihkan([item.id])}
                    >
                      <RotateCcw size={16} />
                      <span>Kembalikan</span>
                    </Button3D>
                    <Button3D
                      variant="merah"
                      size="sm"
                      onClick={() => onHapusPermanen([item.id])}
                      aria-label={`Hapus permanen ${item.game.judul}`}
                    >
                      <Trash2 size={16} />
                      <span>Hapus Permanen</span>
                    </Button3D>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <Modal
        terbuka={konfirmasiKosongkan}
        judul="Kosongkan Sampah Game"
        onTutup={() => setKonfirmasiKosongkan(false)}
        lebarMaks="md"
        footer={
          <>
            <Button3D
              variant="navy"
              size="md"
              onClick={() => setKonfirmasiKosongkan(false)}
            >
              Batal
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
              <span>Ya, Kosongkan Permanen</span>
            </Button3D>
          </>
        }
      >
        <p className="text-bacaan text-base font-bold text-white">
          Yakin ingin menghapus permanen seluruh{' '}
          <span className="text-[#FFD400]">{daftarSampahGame.length} game</span> di
          Sampah Game? Setelah dikosongkan, game beserta soal di dalamnya tidak dapat
          dikembalikan lagi.
        </p>
      </Modal>
    </>
  );
};

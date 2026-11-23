import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Upload } from 'lucide-react';
import { Game } from '../data/types';
import { validasiDanParsePaketGame } from '../utils/paketGame';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

interface ImporPaketModalProps {
  terbuka: boolean;
  daftarGameAda: readonly Game[];
  onImporSimpan: (game: Game, strategi: 'simpan_baru' | 'timpa', targetTimpaId?: string) => void;
  onTutup: () => void;
}

export const ImporPaketModal: React.FC<ImporPaketModalProps> = ({
  terbuka,
  daftarGameAda,
  onImporSimpan,
  onTutup,
}) => {
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const [namaFile, setNamaFile] = useState('');
  const [pesanError, setPesanError] = useState('');
  const [gameValid, setGameValid] = useState<Game | null>(null);
  const [versiSkema, setVersiSkema] = useState<number>(1);
  const [konfirmasiTimpa, setKonfirmasiTimpa] = useState(false);

  const resetModal = () => {
    setNamaFile('');
    setPesanError('');
    setGameValid(null);
    setKonfirmasiTimpa(false);
    if (inputFileRef.current) {
      inputFileRef.current.value = '';
    }
  };

  const handleTutup = () => {
    resetModal();
    onTutup();
  };

  const handlePilihBerkas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNamaFile(file.name);
    setPesanError('');
    setGameValid(null);
    setKonfirmasiTimpa(false);

    try {
      const isi = await file.text();
      const hasil = validasiDanParsePaketGame(isi);
      if (!hasil.ok) {
        setPesanError(hasil.pesanError);
        return;
      }
      setGameValid(hasil.game);
      setVersiSkema(hasil.versiSkema);
    } catch {
      setPesanError('Berkas gagal dibaca. Pastikan berkas berformat .json yang tidak rusak.');
    }
  };

  const gameDuplikat = gameValid
    ? daftarGameAda.find(
        (g) =>
          g.id === gameValid.id ||
          g.judul.trim().toLowerCase() === gameValid.judul.trim().toLowerCase()
      )
    : undefined;

  return (
    <Modal
      terbuka={terbuka}
      judul="Impor Paket Game (.json)"
      onTutup={handleTutup}
      lebarMaks="lg"
      footer={
        <Button3D variant="navy" size="md" onClick={handleTutup}>
          Tutup
        </Button3D>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 rounded-2xl border-3 border-dashed border-[#3C62D4] bg-[#071236] p-5">
          <div>
            <p className="font-display text-lg font-bold text-[#FFD400]">
              Pilih Berkas Paket Duel Otak (.json)
            </p>
            <p className="text-sm font-semibold text-[#DCE7FF]">
              Sistem akan memeriksa versi skema, format soal, dan keabsahan kunci jawaban sebelum menyimpan.
            </p>
            {namaFile && (
              <p className="mt-1 text-xs font-bold text-[#57E893]">Berkas dipilih: {namaFile}</p>
            )}
          </div>

          <input
            ref={inputFileRef}
            type="file"
            accept=".json,application/json"
            onChange={handlePilihBerkas}
            className="hidden"
          />
          <Button3D variant="biru" size="md" onClick={() => inputFileRef.current?.click()}>
            <FileUp size={20} />
            <span>Pilih Berkas .json</span>
          </Button3D>
        </div>

        {pesanError && (
          <div className="flex items-start gap-3 rounded-2xl border-3 border-[#FF6B86] bg-[#450B1C] p-4">
            <AlertTriangle size={24} className="mt-0.5 shrink-0 text-[#FFD400]" />
            <div>
              <h4 className="font-display text-base font-bold text-[#FFD400]">
                Paket Ditolak
              </h4>
              <p className="text-sm font-bold text-white">{pesanError}</p>
            </div>
          </div>
        )}

        {gameValid && (
          <div className="flex flex-col gap-4 rounded-2xl border-3 border-[#00C853] bg-[#005724]/50 p-5">
            <div className="flex items-center gap-2 text-[#57E893]">
              <CheckCircle2 size={24} />
              <h4 className="font-display text-xl font-bold text-white">
                Paket Valid & Siap Diimpor (Skema v{versiSkema})
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border-2 border-[#2A4CB8] bg-[#071236] p-4 text-sm font-bold text-[#DCE7FF]">
              <div>
                Judul Game: <span className="text-[#FFD400]">{gameValid.judul}</span>
              </div>
              <div>
                Mapel / Kelas: <span className="text-white">{gameValid.mapel}</span>
              </div>
              <div>
                Jumlah Soal: <span className="tabular-angka text-[#57E893]">{gameValid.soal.length} Soal</span>
              </div>
              <div>
                Mode Bawaan: <span className="uppercase text-white">{gameValid.pengaturan.mode}</span>
              </div>
              {gameValid.pengaturan.pinGuru && (
                <div className="col-span-2 text-[#FFD400]">
                  PIN Guru aktif pada paket ini (kunci & edit tetap dilindungi PIN).
                </div>
              )}
            </div>

            {gameDuplikat && (
              <div className="rounded-xl border-2 border-[#FF9100] bg-[#4D2400] p-3 text-sm font-bold text-[#FFE8B3]">
                Ditemukan game serupa di Game Saya: &quot;{gameDuplikat.judul}&quot;. Sistem tidak akan menimpanya secara otomatis kecuali Anda memilih menimpa.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button3D
                variant="hijau"
                size="md"
                onClick={() => {
                  onImporSimpan(gameValid, 'simpan_baru');
                  handleTutup();
                }}
              >
                <Upload size={18} />
                <span>Simpan Sebagai Game Baru</span>
              </Button3D>

              {gameDuplikat && !konfirmasiTimpa && (
                <Button3D
                  variant="oranye"
                  size="md"
                  onClick={() => setKonfirmasiTimpa(true)}
                >
                  <span>Timpa &quot;{gameDuplikat.judul}&quot;?</span>
                </Button3D>
              )}

              {gameDuplikat && konfirmasiTimpa && (
                <Button3D
                  variant="merah"
                  size="md"
                  onClick={() => {
                    onImporSimpan(gameValid, 'timpa', gameDuplikat.id);
                    handleTutup();
                  }}
                >
                  <span>Ya, Konfirmasi Timpa Game Lama</span>
                </Button3D>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

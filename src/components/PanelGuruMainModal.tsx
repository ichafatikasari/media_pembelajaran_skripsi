import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  RotateCcw,
  SkipForward,
  Undo2,
} from 'lucide-react';
import { Soal, TimSisi } from '../data/types';
import { ambilKunciUntukPanelGuru, MatchAction, MatchState } from '../engine/match';
import { Button3D } from './Button3D';
import { Modal } from './Modal';
import { PanelKeypadPin } from './PinGuruModal';

interface PanelGuruMainModalProps {
  terbuka: boolean;
  match: MatchState;
  bankSoal: readonly Soal[];
  onTutup: () => void;
  onDispatch: (aksi: MatchAction) => void;
  onResetPertandingan: () => void;
}

export const PanelGuruMainModal: React.FC<PanelGuruMainModalProps> = ({
  terbuka,
  match,
  bankSoal,
  onTutup,
  onDispatch,
  onResetPertandingan,
}) => {
  const pinWajib = (match.pengaturan.pinGuru ?? '').trim();
  const [pinTerbuka, setPinTerbuka] = useState(false);
  const [timDipilih, setTimDipilih] = useState<TimSisi>('merah');
  const [konfirmasiAkhiri, setKonfirmasiAkhiri] = useState(false);

  const terotentikasi = pinWajib.length === 0 || pinTerbuka;

  const handleTutup = () => {
    setPinTerbuka(false);
    setKonfirmasiAkhiri(false);
    onTutup();
  };

  const soalKiri = match.timKiri.dek[match.timKiri.indeksSoal];
  const soalKanan = match.timKanan.dek[match.timKanan.indeksSoal];
  const soalPenentuanKiri = match.penentuan?.soalKiri ?? match.penentuan?.soalAktif;
  const soalPenentuanKanan = match.penentuan?.soalKanan ?? match.penentuan?.soalAktif;

  const kunciKiri = soalKiri ? ambilKunciUntukPanelGuru(bankSoal, soalKiri.id) : null;
  const kunciKanan = soalKanan ? ambilKunciUntukPanelGuru(bankSoal, soalKanan.id) : null;
  const kunciPenentuanKiri = soalPenentuanKiri
    ? ambilKunciUntukPanelGuru(bankSoal, soalPenentuanKiri.id)
    : null;
  const kunciPenentuanKanan = soalPenentuanKanan
    ? ambilKunciUntukPanelGuru(bankSoal, soalPenentuanKanan.id)
    : null;

  const totalRiwayat = match.riwayat.reduce((acc, item) => acc + item.perubahanLangkah, 0);

  return (
    <Modal
      terbuka={terbuka}
      judul="Panel Guru & Riwayat Tarikan"
      onTutup={handleTutup}
      lebarMaks="xl"
      footer={
        <Button3D variant="kuning" size="md" onClick={handleTutup}>
          Tutup Panel Guru
        </Button3D>
      }
    >
      {!terotentikasi ? (
        <PanelKeypadPin
          judulKeterangan="Masukkan PIN Guru (4 angka) untuk melihat kunci jawaban dan melakukan koreksi pertandingan."
          pinBenar={pinWajib}
          labelTombolBuka="Buka Panel Guru"
          onBerhasil={() => setPinTerbuka(true)}
          onBatal={handleTutup}
        />
      ) : (
        <div className="grid grid-cols-12 gap-5">
          {/* Kolom Kiri: Kunci Soal Aktif & Kontrol Koreksi */}
          <div className="col-span-5 flex flex-col gap-4">
            <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
              <h3 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                Kunci Jawaban Soal Aktif
              </h3>
              {match.fase === 'penentuan' && match.penentuan && kunciPenentuanKiri ? (
                match.penentuan.jenisSoal === 'tukar' ||
                soalPenentuanKiri?.id !== soalPenentuanKanan?.id ? (
                  <div className="space-y-2 text-sm">
                    <div className="font-bold text-[#FFD400]">
                      Ronde Penentuan {match.penentuan.rondeKe}/{match.penentuan.maksRonde} · Soal Tukar:
                    </div>
                    <div className="rounded-xl border-2 border-[#FF1744] bg-[#450B1C] p-3">
                      <div className="font-bold text-[#FFD400]">{match.timKiri.namaTim}:</div>
                      <div className="font-bold text-white">
                        Kunci {kunciPenentuanKiri.huruf}. {kunciPenentuanKiri.teks}
                      </div>
                    </div>
                    {kunciPenentuanKanan && (
                      <div className="rounded-xl border-2 border-[#1E6BFF] bg-[#071F70] p-3">
                        <div className="font-bold text-[#FFD400]">{match.timKanan.namaTim}:</div>
                        <div className="font-bold text-white">
                          Kunci {kunciPenentuanKanan.huruf}. {kunciPenentuanKanan.teks}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-[#FFD400] bg-[#12276B] p-3 text-sm">
                    <div className="font-bold text-[#FFD400]">
                      Ronde Penentuan {match.penentuan.rondeKe}/{match.penentuan.maksRonde} · Soal Cadangan:
                    </div>
                    <div className="font-bold text-white">
                      Kunci {kunciPenentuanKiri.huruf}. {kunciPenentuanKiri.teks}
                    </div>
                  </div>
                )
              ) : (
                <div className="space-y-2.5 text-sm">
                  <div className="rounded-xl border-2 border-[#FF1744] bg-[#450B1C] p-3">
                    <div className="font-bold text-[#FFD400]">{match.timKiri.namaTim}:</div>
                    <div className="font-bold text-white">
                      {kunciKiri
                        ? `${kunciKiri.huruf}. ${kunciKiri.teks}`
                        : 'Tim ini sudah selesai.'}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-[#1E6BFF] bg-[#071F70] p-3">
                    <div className="font-bold text-[#FFD400]">{match.timKanan.namaTim}:</div>
                    <div className="font-bold text-white">
                      {kunciKanan
                        ? `${kunciKanan.huruf}. ${kunciKanan.teks}`
                        : 'Tim ini sudah selesai.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Kontrol Koreksi Guru */}
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
              <h3 className="font-display text-lg font-bold text-[#FFD400]">Koreksi & Kontrol Guru</h3>

              <div className="grid grid-cols-2 gap-2">
                <Button3D
                  variant={timDipilih === 'merah' ? 'merah' : 'navy'}
                  size="sm"
                  onClick={() => setTimDipilih('merah')}
                >
                  Target: {match.timKiri.namaTim}
                </Button3D>
                <Button3D
                  variant={timDipilih === 'biru' ? 'biru' : 'navy'}
                  size="sm"
                  onClick={() => setTimDipilih('biru')}
                >
                  Target: {match.timKanan.namaTim}
                </Button3D>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button3D
                  variant="oranye"
                  size="sm"
                  onClick={() => onDispatch({ type: 'BATALKAN_TERAKHIR', tim: timDipilih })}
                >
                  <Undo2 size={18} />
                  <span>Batalkan Terakhir</span>
                </Button3D>
                <Button3D
                  variant="ungu"
                  size="sm"
                  onClick={() =>
                    onDispatch({ type: 'LEWATI_SOAL', tim: timDipilih, timestamp: Date.now() })
                  }
                >
                  <SkipForward size={18} />
                  <span>Lewati Soal</span>
                </Button3D>
                <Button3D
                  variant="merah"
                  size="sm"
                  onClick={() =>
                    onDispatch({
                      type: 'KOREKSI_TALI_MANUAL',
                      arah: 'merah',
                      timestamp: Date.now(),
                    })
                  }
                >
                  <ArrowLeft size={18} />
                  <span>Tali Manual Kiri</span>
                </Button3D>
                <Button3D
                  variant="biru"
                  size="sm"
                  onClick={() =>
                    onDispatch({
                      type: 'KOREKSI_TALI_MANUAL',
                      arah: 'biru',
                      timestamp: Date.now(),
                    })
                  }
                >
                  <span>Tali Manual Kanan</span>
                  <ArrowRight size={18} />
                </Button3D>
              </div>

              <div className="grid grid-cols-2 gap-2.5 border-t border-[#2A4CB8] pt-2.5">
                <Button3D
                  variant="navy"
                  size="sm"
                  disabled={!match.pengaturan.ulangiSoal}
                  onClick={() => onDispatch({ type: 'ULANGI_SOAL', tim: timDipilih })}
                >
                  <RotateCcw size={16} />
                  <span>Ulangi Soal ({match.pengaturan.ulangiSoal ? 'ON' : 'OFF'})</span>
                </Button3D>
                <Button3D
                  variant="merah"
                  size="sm"
                  onClick={() => {
                    onResetPertandingan();
                    handleTutup();
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Reset Laga</span>
                </Button3D>
              </div>

              {match.fase !== 'selesai' && (
                <div className="border-t border-[#2A4CB8] pt-2.5">
                  {!konfirmasiAkhiri ? (
                    <Button3D
                      variant="hijau"
                      size="sm"
                      fullWidth
                      onClick={() => setKonfirmasiAkhiri(true)}
                    >
                      <Flag size={16} />
                      <span>Akhiri Laga &amp; Simpan Hasil</span>
                    </Button3D>
                  ) : (
                    <div className="rounded-xl border-2 border-[#FFD400] bg-[#12276B] p-2.5">
                      <p className="mb-2 text-xs font-bold text-[#FFD400]">
                        Hentikan pertandingan sekarang dan simpan skor ke Riwayat Hasil?
                      </p>
                      <div className="flex items-center gap-2">
                        <Button3D
                          variant="navy"
                          size="sm"
                          fullWidth
                          onClick={() => setKonfirmasiAkhiri(false)}
                        >
                          Batal
                        </Button3D>
                        <Button3D
                          variant="hijau"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            onDispatch({ type: 'AKHIRI_MANUAL', timestamp: Date.now() });
                            handleTutup();
                          }}
                        >
                          Ya, Akhiri &amp; Simpan
                        </Button3D>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Riwayat Tarikan */}
          <div className="col-span-7 flex flex-col rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#FFD400]">
                Riwayat Tarikan ({match.riwayat.length})
              </h3>
              <span className="font-display tabular-angka rounded-xl bg-[#173287] px-3 py-1 text-sm font-bold text-[#57E893]">
                Jumlah Riwayat: {totalRiwayat} · Selisih Layar: {match.posisiTali}
              </span>
            </div>

            {match.riwayat.length === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-base text-[#DCE7FF]">
                Belum ada tarikan tercatat pada pertandingan ini.
              </div>
            ) : (
              <div className="scroll-guru max-h-[340px] space-y-1.5 pr-1 text-sm">
                {[...match.riwayat].reverse().map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-[#2A4CB8] bg-[#12276B] px-3 py-2 font-semibold"
                  >
                    <span className="tabular-angka col-span-2 text-xs text-[#DCE7FF]">
                      #{r.urutan} · {r.waktuDetik}s
                    </span>
                    <span
                      className={`col-span-3 truncate font-bold ${
                        r.tim === 'merah' ? 'text-[#FF6B86]' : 'text-[#669BFF]'
                      }`}
                    >
                      {r.tim === 'merah' ? match.timKiri.namaTim : match.timKanan.namaTim}
                    </span>
                    <span className="col-span-3 truncate text-xs text-white">{r.pemain}</span>
                    <span className="col-span-2 text-xs uppercase text-[#FFD400]">{r.jenis}</span>
                    <span className="tabular-angka col-span-2 text-right font-bold text-white">
                      {r.perubahanLangkah > 0 ? `+${r.perubahanLangkah}` : r.perubahanLangkah} →{' '}
                      <span className="text-[#FFD400]">{r.posisiTaliSesudah}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

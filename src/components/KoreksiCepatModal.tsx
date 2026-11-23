import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Edit3,
  SkipForward,
  Trash2,
} from 'lucide-react';
import {
  DraftSoal,
  LABEL_SUMBER_KUNCI,
  StatusKoreksiItem,
} from '../parsers';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

interface KoreksiCepatModalProps {
  terbuka: boolean;
  daftar: DraftSoal[];
  statusKoreksi: Record<string, StatusKoreksiItem>;
  tempatSampahCount: number;
  jumlahValidUntukSimpan: number;
  onTutup: () => void;
  onUpdateSoal: (soalId: string, pengubah: (lama: DraftSoal) => DraftSoal) => void;
  onHapusSoal: (soalId: string) => void;
  onSimpanSoalDanLanjut: () => void;
}

export const KoreksiCepatModal: React.FC<KoreksiCepatModalProps> = ({
  terbuka,
  daftar,
  statusKoreksi,
  tempatSampahCount,
  jumlahValidUntukSimpan,
  onTutup,
  onUpdateSoal,
  onHapusSoal,
  onSimpanSoalDanLanjut,
}) => {
  const [indeksAktif, setIndeksAktif] = useState(0);
  const [sudahDiperiksaIds, setSudahDiperiksaIds] = useState<string[]>([]);
  const [sedangEdit, setSedangEdit] = useState(false);
  const [modeRingkasanAkhir, setModeRingkasanAkhir] = useState(false);

  const setSudahDiperiksa = useMemo(
    () => new Set(sudahDiperiksaIds),
    [sudahDiperiksaIds]
  );

  // Reset navigasi modal setiap kali dibuka ulang
  useEffect(() => {
    if (terbuka) {
      setIndeksAktif(0);
      setSedangEdit(false);
      setModeRingkasanAkhir(false);
    }
  }, [terbuka]);

  // Jaga agar indeksAktif tetap dalam rentang bila soal dihapus
  useEffect(() => {
    if (!terbuka) return;
    if (daftar.length === 0) {
      setModeRingkasanAkhir(true);
      setIndeksAktif(0);
      return;
    }
    if (indeksAktif >= daftar.length) {
      setIndeksAktif(daftar.length - 1);
    }
  }, [daftar.length, indeksAktif, terbuka]);

  const soalAktif = daftar[indeksAktif];
  const statusAktif = soalAktif ? statusKoreksi[soalAktif.id] : undefined;

  const jumlahDiperiksaAktif = useMemo(
    () => daftar.filter((d) => setSudahDiperiksa.has(d.id)).length,
    [daftar, setSudahDiperiksa]
  );

  const ringkasanLevel = useMemo(() => {
    let merah = 0;
    let kuning = 0;
    let hijau = 0;
    for (const d of daftar) {
      const lv = statusKoreksi[d.id]?.level ?? 'hijau';
      if (lv === 'merah') merah += 1;
      else if (lv === 'kuning') kuning += 1;
      else hijau += 1;
    }
    return { merah, kuning, hijau };
  }, [daftar, statusKoreksi]);

  const tandaiDiperiksa = (id: string) => {
    setSudahDiperiksaIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const pilihKunciSoalAktif = (kunciIdx: number) => {
    if (!soalAktif || kunciIdx < 0 || kunciIdx >= soalAktif.pilihan.length) return;
    onUpdateSoal(soalAktif.id, (lama) => ({
      ...lama,
      kunci: kunciIdx,
      sumberKunci: 'manual',
      detailSumberKunci: LABEL_SUMBER_KUNCI.manual,
      kunciBertentangan: undefined,
      kunciTerdeteksiOtomatis: false,
      kunciDiterima: true,
    }));
  };

  const selesaikanKonflikKunci = (kunciIdx: number, sumber: DraftSoal['sumberKunci']) => {
    if (!soalAktif) return;
    const sumberFinal = sumber ?? 'manual';
    onUpdateSoal(soalAktif.id, (lama) => ({
      ...lama,
      kunci: kunciIdx,
      sumberKunci: sumberFinal,
      detailSumberKunci: LABEL_SUMBER_KUNCI[sumberFinal],
      kunciBertentangan: undefined,
      kunciTerdeteksiOtomatis: sumberFinal !== 'manual',
      kunciDiterima: true,
    }));
  };

  const lanjutBenarDanBerikutnya = () => {
    if (!soalAktif) {
      setModeRingkasanAkhir(true);
      return;
    }
    tandaiDiperiksa(soalAktif.id);
    if (soalAktif.kunciTerdeteksiOtomatis && !soalAktif.kunciDiterima) {
      onUpdateSoal(soalAktif.id, (lama) => ({
        ...lama,
        kunciDiterima: true,
      }));
    }
    setSedangEdit(false);
    if (indeksAktif < daftar.length - 1) {
      setIndeksAktif((idx) => idx + 1);
    } else {
      setModeRingkasanAkhir(true);
    }
  };

  const lewatiBerikutnya = () => {
    setSedangEdit(false);
    if (indeksAktif < daftar.length - 1) {
      setIndeksAktif((idx) => idx + 1);
    } else {
      setModeRingkasanAkhir(true);
    }
  };

  const mundurSebelumnya = () => {
    setSedangEdit(false);
    if (modeRingkasanAkhir) {
      setModeRingkasanAkhir(false);
      setIndeksAktif(Math.max(0, daftar.length - 1));
      return;
    }
    if (indeksAktif > 0) {
      setIndeksAktif((idx) => idx - 1);
    }
  };

  const hapusSoalAktif = () => {
    if (!soalAktif) return;
    setSedangEdit(false);
    const idTarget = soalAktif.id;
    onHapusSoal(idTarget);
  };

  // Pintasan keyboard (A-D pilih kunci, Panah Kanan lanjut benar, Panah Kiri mundur, Delete hapus)
  useEffect(() => {
    if (!terbuka || modeRingkasanAkhir) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const keyUpper = e.key.toUpperCase();
      if (keyUpper === 'A' || keyUpper === 'B' || keyUpper === 'C' || keyUpper === 'D') {
        const kunciIdx = keyUpper.charCodeAt(0) - 65;
        if (soalAktif && kunciIdx < soalAktif.pilihan.length) {
          e.preventDefault();
          pilihKunciSoalAktif(kunciIdx);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        lanjutBenarDanBerikutnya();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        mundurSebelumnya();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        hapusSoalAktif();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const persentaseProgres =
    daftar.length > 0 ? Math.round((jumlahDiperiksaAktif / daftar.length) * 100) : 0;

  return (
    <Modal
      terbuka={terbuka}
      judul="Mode Koreksi Cepat (Satu per Satu)"
      lebarMaks="xl"
      onTutup={onTutup}
    >
      <div className="flex flex-col gap-4">
        {/* Papan Kemajuan & Tombol Ringkasan */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display tabular-angka rounded-xl bg-[#FFD400] px-3.5 py-1.5 text-base font-bold text-[#0B1B4D]">
              {jumlahDiperiksaAktif}/{daftar.length} diperiksa
            </span>
            <div className="h-3 w-48 overflow-hidden rounded-full border border-[#3C62D4] bg-[#12276B]">
              <div
                className="h-full bg-[#00C853] transition-[width] duration-200"
                style={{ width: `${persentaseProgres}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#DCE7FF]">
              Pintasan keyboard: <strong>A–D</strong> pilih kunci · <strong>→</strong> benar ·{' '}
              <strong>←</strong> sebelumnya · <strong>Del</strong> hapus
            </span>
          </div>

          <Button3D
            variant={modeRingkasanAkhir ? 'kuning' : 'navy'}
            size="sm"
            onClick={() => setModeRingkasanAkhir((v) => !v)}
          >
            <CheckCircle2 size={16} />
            <span>{modeRingkasanAkhir ? 'Kembali ke Soal' : 'Ringkasan Akhir'}</span>
          </Button3D>
        </div>

        {/* Navigasi Mini Nomor Soal (1..N dengan centang ✓ dan status) */}
        {daftar.length > 0 && !modeRingkasanAkhir && (
          <div className="flex max-h-[84px] flex-wrap gap-1.5 overflow-y-auto rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-2.5">
            {daftar.map((item, idx) => {
              const aktif = idx === indeksAktif;
              const sudah = setSudahDiperiksa.has(item.id);
              const lv = statusKoreksi[item.id]?.level ?? 'hijau';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSedangEdit(false);
                    setIndeksAktif(idx);
                  }}
                  title={`Soal #${idx + 1} (${lv === 'merah' ? 'Harus diperbaiki' : lv === 'kuning' ? 'Sebaiknya dicek' : 'Lancar'})`}
                  className={`font-display flex min-h-[38px] min-w-[44px] cursor-pointer items-center justify-center gap-1 rounded-xl border-2 px-2 text-xs font-bold transition ${
                    aktif
                      ? 'border-[#FFE875] bg-[#1E6BFF] text-white ring-2 ring-[#FFD400]'
                      : lv === 'merah'
                        ? 'border-[#FF1744] bg-[#450B1C] text-[#FF99AD]'
                        : lv === 'kuning'
                          ? 'border-[#FF9100] bg-[#3D2000] text-[#FFD400]'
                          : 'border-[#00C853] bg-[#06381D] text-[#57E893]'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {sudah && <Check size={12} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        )}

        {/* RINGKASAN AKHIR */}
        {modeRingkasanAkhir || !soalAktif ? (
          <div className="space-y-4 rounded-3xl border-3 border-[#57E893] bg-[#071236] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#FFD400]">
                  Ringkasan Pemeriksaan Soal
                </h3>
                <p className="text-sm font-semibold text-[#DCE7FF]">
                  {daftar.length === 0
                    ? 'Tidak ada soal tersisa di daftar pratinjau. Anda dapat memulihkan dari Tempat Sampah.'
                    : `${jumlahDiperiksaAktif} dari ${daftar.length} soal sudah ditandai diperiksa (✓).`}
                </p>
              </div>
              <span className="font-display rounded-xl bg-[#007A33] px-4 py-2 text-base font-bold text-[#57E893]">
                {jumlahValidUntukSimpan} soal siap masuk game
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-2xl border-2 border-[#00C853] bg-[#06381D] p-3.5 text-center">
                <div className="font-display tabular-angka text-3xl font-bold text-[#57E893]">
                  {ringkasanLevel.hijau}
                </div>
                <div className="text-xs font-bold text-white">Lancar</div>
              </div>
              <div className="rounded-2xl border-2 border-[#FF9100] bg-[#3D2000] p-3.5 text-center">
                <div className="font-display tabular-angka text-3xl font-bold text-[#FFD400]">
                  {ringkasanLevel.kuning}
                </div>
                <div className="text-xs font-bold text-white">Sebaiknya dicek</div>
              </div>
              <div className="rounded-2xl border-2 border-[#FF1744] bg-[#450B1C] p-3.5 text-center">
                <div className="font-display tabular-angka text-3xl font-bold text-[#FF99AD]">
                  {ringkasanLevel.merah}
                </div>
                <div className="text-xs font-bold text-white">Harus diperbaiki</div>
              </div>
              <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#12276B] p-3.5 text-center">
                <div className="font-display tabular-angka text-3xl font-bold text-[#DCE7FF]">
                  {tempatSampahCount}
                </div>
                <div className="text-xs font-bold text-white">Di Tempat Sampah</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1C388A] pt-4">
              <div className="flex items-center gap-2">
                {daftar.length > 0 && (
                  <Button3D
                    variant="navy"
                    size="md"
                    onClick={() => setModeRingkasanAkhir(false)}
                  >
                    <ArrowLeft size={18} />
                    <span>Kembali ke Soal</span>
                  </Button3D>
                )}
                <Button3D variant="biru" size="md" onClick={onTutup}>
                  <span>Tutup ke Pratinjau</span>
                </Button3D>
              </div>

              <Button3D
                variant="hijau"
                size="lg"
                disabled={jumlahValidUntukSimpan === 0}
                onClick={() => {
                  onTutup();
                  onSimpanSoalDanLanjut();
                }}
              >
                <Check size={22} strokeWidth={3} />
                <span>Simpan Soal &amp; Lanjut</span>
                <ArrowRight size={20} />
              </Button3D>
            </div>
          </div>
        ) : (
          /* TAMPILAN SATU SOAL BESAR */
          <div className="space-y-4 rounded-3xl border-3 border-[#3C62D4] bg-[#071236] p-5">
            {/* Header Soal Aktif */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display rounded-xl bg-[#FFD400] px-3 py-1 text-base font-bold text-[#0B1B4D]">
                  Soal #{indeksAktif + 1} dari {daftar.length}
                </span>

                {statusAktif?.level === 'merah' ? (
                  <span className="font-display rounded-xl bg-[#FF1744] px-3 py-1 text-xs font-bold text-white">
                    Harus diperbaiki
                  </span>
                ) : statusAktif?.level === 'kuning' ? (
                  <span className="font-display rounded-xl bg-[#FF9100] px-3 py-1 text-xs font-bold text-[#0B1B4D]">
                    Sebaiknya dicek
                  </span>
                ) : (
                  <span className="font-display rounded-xl bg-[#00C853] px-3 py-1 text-xs font-bold text-white">
                    Lancar
                  </span>
                )}

                {statusAktif?.cekManualMedia && (
                  <span className="font-display rounded-xl border border-[#FFE875] bg-[#7D3D00] px-3 py-1 text-xs font-bold text-[#FFD400]">
                    Cek manual
                  </span>
                )}

                {soalAktif.cadangan && (
                  <span className="font-display rounded-xl bg-[#7C4DFF] px-3 py-1 text-xs font-bold text-white">
                    Cadangan
                  </span>
                )}

                {setSudahDiperiksa.has(soalAktif.id) && (
                  <span className="font-display flex items-center gap-1 rounded-xl bg-[#007A33] px-3 py-1 text-xs font-bold text-[#57E893]">
                    <Check size={14} strokeWidth={3} />
                    <span>Diperiksa</span>
                  </span>
                )}
              </div>

              <div className="text-xs font-bold text-[#A8C4FF]">
                {soalAktif.sumberKunci
                  ? `Sumber kunci: ${LABEL_SUMBER_KUNCI[soalAktif.sumberKunci]}`
                  : 'Kunci belum ada'}
              </div>
            </div>

            {/* Daftar Alasan Merah / Kuning */}
            {statusAktif &&
              (statusAktif.alasanMerah.length > 0 || statusAktif.alasanKuning.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {statusAktif.alasanMerah.map((alasan, i) => (
                    <span
                      key={`m-${i}`}
                      className="flex items-center gap-1.5 rounded-xl border border-[#FF6B86] bg-[#5C0015] px-3 py-1 text-xs font-bold text-white"
                    >
                      <AlertTriangle size={14} className="text-[#FFD400]" />
                      <span>{alasan}</span>
                    </span>
                  ))}
                  {statusAktif.alasanKuning.map((alasan, i) => (
                    <span
                      key={`k-${i}`}
                      className="flex items-center gap-1.5 rounded-xl border border-[#FFBA5C] bg-[#5C3100] px-3 py-1 text-xs font-bold text-[#FFE8B3]"
                    >
                      <AlertTriangle size={14} className="text-[#FFD400]" />
                      <span>{alasan}</span>
                    </span>
                  ))}
                </div>
              )}

            {/* Konflik Kunci jika ada */}
            {soalAktif.kunciBertentangan && soalAktif.kunciBertentangan.length >= 2 && (
              <div className="rounded-2xl border-2 border-[#FF1744] bg-[#450B1C] p-3.5">
                <div className="mb-2 text-sm font-bold text-[#FFD400]">
                  Kunci bertentangan antar sumber — pilih salah satu yang benar:
                </div>
                <div className="flex flex-wrap gap-2">
                  {soalAktif.kunciBertentangan.map((kand, kIdx) => (
                    <Button3D
                      key={`${kand.sumber}-${kIdx}`}
                      variant="kuning"
                      size="sm"
                      onClick={() => selesaikanKonflikKunci(kand.kunci, kand.sumber)}
                    >
                      <span>{kand.keterangan}</span>
                    </Button3D>
                  ))}
                </div>
              </div>
            )}

            {/* Konten Soal + Pilihan (Mode Baca vs Mode Edit Inline) */}
            {sedangEdit ? (
              <div className="space-y-3 rounded-2xl border-2 border-[#FFD400] bg-[#12276B] p-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#FFD400]">
                    Teks Pertanyaan
                  </label>
                  <textarea
                    rows={3}
                    value={soalAktif.pertanyaan}
                    onChange={(e) =>
                      onUpdateSoal(soalAktif.id, (lama) => ({
                        ...lama,
                        pertanyaan: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border-2 border-[#3C62D4] bg-[#071236] p-3 text-base font-bold text-white focus:border-[#FFD400] focus:outline-none"
                  />
                </div>

                {soalAktif.kode !== undefined && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#57E893]">
                      Blok Kode
                    </label>
                    <textarea
                      rows={3}
                      value={soalAktif.kode}
                      onChange={(e) =>
                        onUpdateSoal(soalAktif.id, (lama) => ({
                          ...lama,
                          kode: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border-2 border-[#3C62D4] bg-[#040B24] p-2.5 font-mono text-xs text-[#57E893] focus:border-[#FFD400] focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  {soalAktif.pilihan.map((op, opIdx) => {
                    const huruf = String.fromCharCode(65 + opIdx);
                    const terpilih = soalAktif.kunci === opIdx;
                    return (
                      <div key={opIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => pilihKunciSoalAktif(opIdx)}
                          className={`font-display flex min-h-[48px] min-w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 text-base font-bold ${
                            terpilih
                              ? 'border-[#57E893] bg-[#00C853] text-white'
                              : 'border-[#3C62D4] bg-[#071236] text-[#FFD400]'
                          }`}
                        >
                          {huruf}
                        </button>
                        <input
                          type="text"
                          value={op}
                          onChange={(e) =>
                            onUpdateSoal(soalAktif.id, (lama) => {
                              const baru = [...lama.pilihan];
                              baru[opIdx] = e.target.value;
                              return { ...lama, pilihan: baru };
                            })
                          }
                          className="min-h-[48px] flex-1 rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-semibold text-white focus:border-[#FFD400] focus:outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border-2 border-[#2A4CB8] bg-[#12276B] p-4">
                  <p className="text-lg leading-[1.35] font-bold text-white">
                    {soalAktif.pertanyaan.trim() || '(Teks pertanyaan masih kosong)'}
                  </p>
                  {soalAktif.kode && (
                    <pre className="mt-2.5 overflow-x-auto rounded-xl border border-[#3C62D4] bg-[#040B24] p-3 font-mono text-xs text-[#57E893]">
                      {soalAktif.kode}
                    </pre>
                  )}
                </div>

                {/* Tombol Pilihan Besar A-D (1 klik pilih kunci) */}
                <div className="grid grid-cols-2 gap-3">
                  {soalAktif.pilihan.map((op, opIdx) => {
                    const huruf = String.fromCharCode(65 + opIdx);
                    const adalahKunci = soalAktif.kunci === opIdx;
                    return (
                      <button
                        key={opIdx}
                        type="button"
                        onClick={() => pilihKunciSoalAktif(opIdx)}
                        className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-2xl border-3 px-4 py-2.5 text-left transition active:translate-y-0.5 ${
                          adalahKunci
                            ? 'border-[#57E893] bg-[#006B2D] shadow-[0_4px_0_#00421B]'
                            : 'border-[#3C62D4] bg-[#12276B] hover:border-[#FFD400]'
                        }`}
                      >
                        <span
                          className={`font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-lg font-bold ${
                            adalahKunci
                              ? 'border-[#57E893] bg-[#00C853] text-white'
                              : 'border-[#3C62D4] bg-[#071236] text-[#FFD400]'
                          }`}
                        >
                          {adalahKunci ? <Check size={20} strokeWidth={3} /> : huruf}
                        </span>
                        <span className="min-w-0 flex-1 text-base font-bold text-white">
                          {op.trim() || `(Pilihan ${huruf} kosong)`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Baris Tombol Aksi Bawah */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#1C388A] pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button3D
                  variant="navy"
                  size="sm"
                  disabled={indeksAktif === 0}
                  onClick={mundurSebelumnya}
                >
                  <ArrowLeft size={16} />
                  <span>Sebelumnya</span>
                </Button3D>

                <Button3D variant="navy" size="sm" onClick={lewatiBerikutnya}>
                  <SkipForward size={16} />
                  <span>Lewati</span>
                </Button3D>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button3D
                  variant={sedangEdit ? 'kuning' : 'biru'}
                  size="sm"
                  onClick={() => setSedangEdit((v) => !v)}
                >
                  <Edit3 size={16} />
                  <span>{sedangEdit ? 'Selesai Edit' : 'Edit'}</span>
                </Button3D>

                <Button3D variant="merah" size="sm" onClick={hapusSoalAktif}>
                  <Trash2 size={16} />
                  <span>Hapus</span>
                </Button3D>

                <Button3D variant="hijau" size="md" onClick={lanjutBenarDanBerikutnya}>
                  <Check size={18} strokeWidth={3} />
                  <span>
                    {indeksAktif === daftar.length - 1
                      ? 'Benar, Lihat Ringkasan'
                      : 'Benar, Berikutnya'}
                  </span>
                  <ArrowRight size={18} />
                </Button3D>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

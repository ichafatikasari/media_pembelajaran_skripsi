import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  CheckCircle2,
  Coins,
  Download,
  FileSpreadsheet,
  Home,
  Medal,
  Play,
  Printer,
  Save,
  Search,
  Square,
  CheckSquare,
  Star,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../app/store';
import { ArenaTarikTambang } from '../components/ArenaTarikTambang';
import { AvatarPemainKecil } from '../components/AvatarPemainKecil';
import { Button3D } from '../components/Button3D';
import { MascotChibi } from '../components/MascotChibi';
import { Modal } from '../components/Modal';
import { RuteHash, TimSisi } from '../data/types';
import {
  analisisSoalDariLog,
  formatDetikSingkat,
  hitungRingkasanDariLog,
  ringkasSoalSnapshot,
} from '../engine/hasilRekap';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import { ambilPeringkatTurnamen, hapusSesiModeSessionStorage } from '../engine/session';
import { mainkanSorakMenang, tandaiInteraksiAudio } from '../utils/audio';
import {
  buatCsvAnalisisSoal,
  buatCsvRekapPemain,
  unduhCsvRekap,
} from '../utils/csvRekap';
import {
  buatEntriRiwayatHasil,
  cariSoalUntukEntriHasil,
  EntriRiwayatHasil,
  formatDurasiPertandingan,
  formatSkorRingkasEntri,
  formatTanggalJamHasil,
} from '../utils/riwayatHasil';

interface HasilScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

const LABEL_ALASAN: Record<string, string> = {
  waktu: 'Waktu Permainan Habis',
  soalHabis: 'Semua Soal Selesai',
  keduanya: 'Waktu / Soal Tercapai',
  penentuan: 'Ronde Penentuan',
  kecepatan: 'Kecepatan Total Menjawab',
  seri: 'Pertandingan Berakhir Seri',
};

const KONFETI_HASIL = [
  { left: '8%', warna: '#FFD400', delay: '0ms' },
  { left: '20%', warna: '#00C853', delay: '140ms' },
  { left: '34%', warna: '#FF1744', delay: '60ms' },
  { left: '50%', warna: '#29B6FF', delay: '220ms' },
  { left: '66%', warna: '#FF9100', delay: '100ms' },
  { left: '80%', warna: '#FFD400', delay: '180ms' },
  { left: '92%', warna: '#57E893', delay: '40ms' },
];

type ModeKonfirmasiHapus =
  | { jenis: 'satu'; id: string; judul: string }
  | { jenis: 'terpilih'; ids: string[] }
  | { jenis: 'semua'; total: number }
  | { jenis: 'detailAktif'; id: string; judul: string }
  | null;

export const HasilScreen: React.FC<HasilScreenProps> = ({ onNavigasi }) => {
  const {
    daftarGame,
    gameAktif,
    hasilSesi,
    sesiMode,
    riwayatHasil,
    hasilAktifId,
    tampilanHasil,
    mulaiSesiPembagian,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    resetSesiMode,
    simpanHasilPertandinganKeRiwayat,
    bukaDetailRiwayatHasil,
    bukaDaftarRiwayatHasil,
    hapusRiwayatHasil,
    hapusSemuaRiwayatHasil,
    siapkanCetakHasil,
    tampilkanToast,
  } = useAppStore();

  // State daftar riwayat
  const [kataCari, setKataCari] = useState('');
  const [filterGame, setFilterGame] = useState<string>('semua');
  const [terpilihIds, setTerpilihIds] = useState<string[]>([]);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<ModeKonfirmasiHapus>(null);

  // State detail hasil
  const [tabDetail, setTabDetail] = useState<'ringkasan' | 'soal'>('ringkasan');
  const [sedangUndiKoin, setSedangUndiKoin] = useState(false);
  const [hasilKoin, setHasilKoin] = useState<TimSisi | null>(null);
  const [seriDiterima, setSeriDiterima] = useState(false);
  const koinTimerRef = useRef<number | null>(null);
  const printTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (koinTimerRef.current !== null) window.clearTimeout(koinTimerRef.current);
      if (printTimerRef.current !== null) window.clearTimeout(printTimerRef.current);
    };
  }, []);

  // Bersihkan ID terpilih yang tidak lagi ada
  useEffect(() => {
    const idSet = new Set(riwayatHasil.map((r) => r.id));
    setTerpilihIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [riwayatHasil]);

  useEffect(() => {
    setSedangUndiKoin(false);
    setHasilKoin(null);
    setSeriDiterima(false);
    setTabDetail('ringkasan');
  }, [hasilAktifId, tampilanHasil]);

  const entriDetailAktif: EntriRiwayatHasil | null = useMemo(() => {
    if (tampilanHasil !== 'detail') return null;
    if (hasilAktifId) {
      const ditemukan = riwayatHasil.find((r) => r.id === hasilAktifId);
      if (ditemukan) return ditemukan;
    }
    if (hasilSesi.riwayatHasilId) {
      const ditemukan = riwayatHasil.find((r) => r.id === hasilSesi.riwayatHasilId);
      if (ditemukan) return ditemukan;
    }
    if ((hasilSesi.riwayat?.length ?? 0) > 0 || hasilSesi.totalSoalTerjawab > 0) {
      return buatEntriRiwayatHasil({
        id: hasilSesi.riwayatHasilId ?? 'sementara',
        dibuatPada: hasilSesi.dibuatPada ?? Date.now(),
        gameId: hasilSesi.gameId ?? gameAktif?.id ?? '',
        judulGame: hasilSesi.judulGame ?? gameAktif?.judul ?? 'Duel Otak',
        mapel: hasilSesi.mapel ?? gameAktif?.mapel ?? '',
        namaSekolah: hasilSesi.namaSekolah ?? gameAktif?.namaSekolah ?? '',
        mode: hasilSesi.mode ?? '2tim',
        labelLaga: hasilSesi.labelLaga ?? 'Pertandingan',
        namaTimKiri: hasilSesi.namaTimKiri || 'Tim Merah',
        namaTimKanan: hasilSesi.namaTimKanan || 'Tim Biru',
        rosterKiri: hasilSesi.rosterKiri ?? [],
        rosterKanan: hasilSesi.rosterKanan ?? [],
        posisiTaliAkhir: hasilSesi.posisiTaliAkhir,
        langkahKeGaris: hasilSesi.langkahKeGaris ?? gameAktif?.pengaturan.langkahKeGaris ?? 6,
        pemenang: hasilSesi.pemenang,
        alasanAkhir: hasilSesi.alasanAkhir,
        caraMenang: hasilSesi.caraMenang ?? null,
        keteranganMenang: hasilSesi.keteranganMenang ?? null,
        durasiDetik: hasilSesi.durasiDetik ?? 0,
        jumlahPenarik: hasilSesi.jumlahPenarik ?? gameAktif?.pengaturan.jumlahPenarik ?? 3,
        riwayat: hasilSesi.riwayat ?? [],
        soalSnapshot:
          hasilSesi.soalSnapshot ??
          (gameAktif ? ringkasSoalSnapshot(gameAktif.soal) : []),
        turnamenSnapshot: hasilSesi.turnamenSnapshot,
        duelSnapshot: hasilSesi.duelSnapshot,
      });
    }
    return null;
  }, [gameAktif, hasilAktifId, hasilSesi, riwayatHasil, tampilanHasil]);

  const ringkasDetail = useMemo(() => {
    if (!entriDetailAktif) return null;
    return hitungRingkasanDariLog(entriDetailAktif.riwayat, {
      rosterKiri: entriDetailAktif.rosterKiri,
      rosterKanan: entriDetailAktif.rosterKanan,
    });
  }, [entriDetailAktif]);

  const daftarSoalDetail = useMemo(() => {
    if (!entriDetailAktif) return [];
    return cariSoalUntukEntriHasil(entriDetailAktif, daftarGame);
  }, [daftarGame, entriDetailAktif]);

  const analisisSoal = useMemo(() => {
    if (!entriDetailAktif) return [];
    return analisisSoalDariLog(entriDetailAktif.riwayat, daftarSoalDetail);
  }, [daftarSoalDetail, entriDetailAktif]);

  const jumlahPerluDiulas = useMemo(
    () => analisisSoal.filter((s) => s.perluDiulas).length,
    [analisisSoal]
  );

  useEffect(() => {
    if (
      tampilanHasil === 'detail' &&
      ringkasDetail &&
      (ringkasDetail.totalSoalTerjawab > 0 || entriDetailAktif?.mode !== '2tim')
    ) {
      mainkanSorakMenang();
    }
  }, [entriDetailAktif?.id, entriDetailAktif?.mode, ringkasDetail, tampilanHasil]);

  // Daftar opsi filter game dari riwayat
  const daftarJudulGameFilter = useMemo(() => {
    const unik = new Set<string>();
    for (const r of riwayatHasil) {
      if (r.judulGame) unik.add(r.judulGame);
    }
    return Array.from(unik).sort((a, b) => a.localeCompare(b, 'id'));
  }, [riwayatHasil]);

  const riwayatTersaring = useMemo(() => {
    const q = kataCari.trim().toLowerCase();
    return riwayatHasil.filter((item) => {
      if (filterGame !== 'semua' && item.judulGame !== filterGame) return false;
      if (!q) return true;
      return (
        item.judulGame.toLowerCase().includes(q) ||
        item.namaTimKiri.toLowerCase().includes(q) ||
        item.namaTimKanan.toLowerCase().includes(q) ||
        item.labelLaga.toLowerCase().includes(q) ||
        item.mapel.toLowerCase().includes(q)
      );
    });
  }, [filterGame, kataCari, riwayatHasil]);

  const semuaTersaringDipilih =
    riwayatTersaring.length > 0 &&
    riwayatTersaring.every((it) => terpilihIds.includes(it.id));

  const togglePilihSatu = (id: string) => {
    setTerpilihIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePilihSemuaTersaring = () => {
    if (semuaTersaringDipilih) {
      const setSaring = new Set(riwayatTersaring.map((r) => r.id));
      setTerpilihIds((prev) => prev.filter((id) => !setSaring.has(id)));
    } else {
      const gabungan = new Set([...terpilihIds, ...riwayatTersaring.map((r) => r.id)]);
      setTerpilihIds(Array.from(gabungan));
    }
  };

  const jalankanKonfirmasiHapus = () => {
    if (!konfirmasiHapus) return;
    if (konfirmasiHapus.jenis === 'satu') {
      hapusRiwayatHasil([konfirmasiHapus.id]);
    } else if (konfirmasiHapus.jenis === 'terpilih') {
      hapusRiwayatHasil(konfirmasiHapus.ids);
      setTerpilihIds([]);
    } else if (konfirmasiHapus.jenis === 'semua') {
      hapusSemuaRiwayatHasil();
      setTerpilihIds([]);
    } else if (konfirmasiHapus.jenis === 'detailAktif') {
      hapusRiwayatHasil([konfirmasiHapus.id], { kembaliKeDaftar: true });
    }
    setKonfirmasiHapus(null);
  };

  const buatSlugFile = (judul: string): string =>
    judul
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '') || 'duel-otak';

  const handleUnduhRekapCsvEntri = (entri: EntriRiwayatHasil) => {
    tandaiInteraksiAudio();
    const konten = buatCsvRekapPemain(entri);
    unduhCsvRekap(`rekap-pemain-${buatSlugFile(entri.judulGame)}.csv`, konten);
    tampilkanToast('File Rekap Pemain (CSV UTF-8) berhasil diunduh.', 'sukses');
  };

  const handleUnduhAnalisisCsvEntri = (entri: EntriRiwayatHasil) => {
    tandaiInteraksiAudio();
    const soalRef = cariSoalUntukEntriHasil(entri, daftarGame);
    const konten = buatCsvAnalisisSoal(entri, soalRef);
    unduhCsvRekap(`analisis-soal-${buatSlugFile(entri.judulGame)}.csv`, konten);
    tampilkanToast('File Analisis Soal (CSV UTF-8) berhasil diunduh.', 'sukses');
  };

  const handleCetakPdfHasil = (entri: EntriRiwayatHasil) => {
    tandaiInteraksiAudio();
    siapkanCetakHasil(entri);
    if (printTimerRef.current !== null) {
      window.clearTimeout(printTimerRef.current);
    }
    printTimerRef.current = window.setTimeout(() => {
      printTimerRef.current = null;
      window.print();
    }, 80);
  };

  const handleUndiDenganKoin = (namaMerah: string, namaBiru: string) => {
    if (sedangUndiKoin) return;
    tandaiInteraksiAudio();
    setSeriDiterima(false);
    setHasilKoin(null);
    setSedangUndiKoin(true);
    if (koinTimerRef.current !== null) window.clearTimeout(koinTimerRef.current);
    koinTimerRef.current = window.setTimeout(() => {
      koinTimerRef.current = null;
      const terpilih: TimSisi = Math.random() < 0.5 ? 'merah' : 'biru';
      setSedangUndiKoin(false);
      setHasilKoin(terpilih);
      mainkanSorakMenang();
      tampilkanToast(
        `Hasil Undian Koin: ${terpilih === 'merah' ? namaMerah : namaBiru} menang undian!`,
        'sukses'
      );
    }, 850);
  };

  const handleTerimaSeri = () => {
    tandaiInteraksiAudio();
    setHasilKoin(null);
    setSeriDiterima(true);
    tampilkanToast('Hasil SERI resmi diterima. Kedua tim sama kuat!', 'info');
  };

  const handleMainLagi = (entri: EntriRiwayatHasil | null) => {
    const targetGame =
      (entri?.gameId ? daftarGame.find((g) => g.id === entri.gameId) : null) ?? gameAktif;
    if (!targetGame) {
      tampilkanToast('Game tidak ditemukan di Game Saya. Pilih game lain untuk bermain.', 'info');
      onNavigasi('/game-saya');
      return;
    }
    tandaiInteraksiAudio();
    hapusSesiMatchSessionStorage();
    hapusSesiModeSessionStorage();

    if (targetGame.pengaturan.mode === '4tim') {
      mulaiSesiTurnamenBaru(targetGame);
      onNavigasi('/turnamen');
      return;
    }
    if (targetGame.pengaturan.mode === '1lawan1') {
      mulaiSesiDuelBaru(targetGame);
      onNavigasi('/duel');
      return;
    }

    resetSesiMode();
    mulaiSesiPembagian(targetGame);
    onNavigasi('/main');
  };

  const handleSimpanDanKeluarDetail = (entri: EntriRiwayatHasil) => {
    tandaiInteraksiAudio();
    const sudahAda = riwayatHasil.some((r) => r.id === entri.id);
    if (!sudahAda) {
      simpanHasilPertandinganKeRiwayat(
        {
          gameId: entri.gameId,
          judulGame: entri.judulGame,
          mapel: entri.mapel,
          namaSekolah: entri.namaSekolah,
          mode: entri.mode,
          labelLaga: entri.labelLaga,
          namaTimKiri: entri.namaTimKiri,
          namaTimKanan: entri.namaTimKanan,
          rosterKiri: entri.rosterKiri,
          rosterKanan: entri.rosterKanan,
          posisiTaliAkhir: entri.posisiTaliAkhir,
          langkahKeGaris: entri.langkahKeGaris,
          pemenang: entri.pemenang,
          alasanAkhir: entri.alasanAkhir,
          caraMenang: entri.caraMenang,
          keteranganMenang: entri.keteranganMenang,
          durasiDetik: entri.durasiDetik,
          jumlahPenarik: entri.jumlahPenarik,
          riwayat: entri.riwayat,
          soalSnapshot: entri.soalSnapshot,
          turnamenSnapshot: entri.turnamenSnapshot,
          duelSnapshot: entri.duelSnapshot,
        },
        { bukaDetail: false, updateHasilSesi: false }
      );
    }
    tampilkanToast('Hasil pertandingan tersimpan di Riwayat Hasil.', 'sukses');
    bukaDaftarRiwayatHasil();
  };

  // =========================================================================
  // TAMPILAN 1: DAFTAR RIWAYAT HASIL
  // =========================================================================
  if (tampilanHasil === 'daftar' || !entriDetailAktif || !ringkasDetail) {
    return (
      <div
        onPointerDown={() => tandaiInteraksiAudio()}
        className="flex h-full w-full flex-col gap-3 overflow-hidden bg-[#0B1B4D] px-8 py-4"
      >
        {/* Header Riwayat Hasil */}
        <div className="kartu-3d flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
              <Trophy size={26} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display teks-outline-tebal text-2xl font-bold text-[#FFD400]">
                RIWAYAT HASIL PERTANDINGAN ({riwayatHasil.length})
              </h1>
              <p className="text-sm font-bold text-[#DCE7FF]">
                Setiap pertandingan yang selesai otomatis tersimpan di perangkat ini · Urutan terbaru di atas.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {riwayatHasil.length > 0 && (
              <Button3D
                variant="merah"
                size="md"
                onClick={() =>
                  setKonfirmasiHapus({ jenis: 'semua', total: riwayatHasil.length })
                }
              >
                <Trash2 size={18} />
                <span>Hapus Semua Riwayat</span>
              </Button3D>
            )}
            <Button3D variant="kuning" size="md" onClick={() => onNavigasi('/')}>
              <Home size={18} />
              <span>Beranda</span>
            </Button3D>
          </div>
        </div>

        {/* Bilah Cari, Filter & Pilih Massal */}
        {riwayatHasil.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-2.5">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative min-w-[260px] flex-1 max-w-[420px]">
                <Search
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#A8C4FF]"
                />
                <input
                  type="text"
                  value={kataCari}
                  onChange={(e) => setKataCari(e.target.value)}
                  placeholder="Cari judul game, nama tim, atau mapel..."
                  className="min-h-[48px] w-full rounded-xl border-2 border-[#3C62D4] bg-[#071236] pr-3 pl-10 text-sm font-bold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                />
              </div>

              <select
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
                aria-label="Filter berdasarkan game"
                className="min-h-[48px] max-w-[280px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-bold text-white focus:border-[#FFD400] focus:outline-none"
              >
                <option value="semua">Semua Game ({riwayatHasil.length})</option>
                {daftarJudulGameFilter.map((judul) => (
                  <option key={judul} value={judul}>
                    {judul}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <Button3D
                variant={semuaTersaringDipilih ? 'kuning' : 'navy'}
                size="sm"
                onClick={togglePilihSemuaTersaring}
              >
                {semuaTersaringDipilih ? <CheckSquare size={18} /> : <Square size={18} />}
                <span>{semuaTersaringDipilih ? 'Batal Pilih' : 'Pilih Semua'}</span>
              </Button3D>

              {terpilihIds.length > 0 && (
                <Button3D
                  variant="merah"
                  size="sm"
                  onClick={() =>
                    setKonfirmasiHapus({ jenis: 'terpilih', ids: [...terpilihIds] })
                  }
                >
                  <Trash2 size={18} />
                  <span>Hapus yang Dipilih ({terpilihIds.length})</span>
                </Button3D>
              )}
            </div>
          </div>
        )}

        {/* Daftar Kartu atau State Kosong */}
        <div className="kartu-3d flex min-h-0 flex-1 flex-col rounded-3xl border-3 border-[#2A4CB8] bg-[#12276B] p-4">
          {riwayatHasil.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-[#3C62D4] bg-[#071236] text-[#FFD400]">
                <Trophy size={42} />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Belum ada hasil</h2>
                <p className="mt-1 max-w-[520px] text-sm font-semibold text-[#DCE7FF]">
                  Mainkan satu pertandingan sampai selesai (atau akhiri dari Panel Guru) untuk melihat skor akhir, rekap pemain, dan analisis soal di sini.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button3D
                  variant="hijau"
                  size="lg"
                  onClick={() => handleMainLagi(null)}
                >
                  <Play size={20} fill="currentColor" />
                  <span>Mulai Bermain</span>
                </Button3D>
                <Button3D
                  variant="biru"
                  size="lg"
                  onClick={() => onNavigasi('/game-saya')}
                >
                  <span>Buka Game Saya</span>
                </Button3D>
              </div>
            </div>
          ) : riwayatTersaring.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="font-display text-xl font-bold text-[#FFD400]">
                Tidak ada riwayat yang cocok dengan filter saat ini.
              </p>
              <Button3D
                variant="biru"
                size="md"
                onClick={() => {
                  setKataCari('');
                  setFilterGame('semua');
                }}
              >
                Tampilkan Semua Riwayat
              </Button3D>
            </div>
          ) : (
            <div className="scroll-guru flex-1 space-y-2.5 pr-1">
              {riwayatTersaring.map((item) => {
                const ringkas = hitungRingkasanDariLog(item.riwayat, {
                  rosterKiri: item.rosterKiri,
                  rosterKanan: item.rosterKanan,
                });
                const dipilih = terpilihIds.includes(item.id);
                const hasilTeks = formatSkorRingkasEntri(item);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-4 rounded-2xl border-3 px-4 py-3 transition-colors ${
                      dipilih
                        ? 'border-[#FFD400] bg-[#1D3C9E]'
                        : 'border-[#2A4CB8] bg-[#071236] hover:border-[#669BFF]'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => togglePilihSatu(item.id)}
                        aria-label={`Pilih hasil ${item.judulGame}`}
                        className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-[#3C62D4] bg-[#12276B] text-[#FFD400] hover:border-[#FFD400]"
                      >
                        {dipilih ? <CheckSquare size={22} /> : <Square size={22} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate font-display text-lg font-bold text-white">
                            {item.judulGame}
                          </h2>
                          <span className="rounded-lg border border-[#3C62D4] bg-[#173287] px-2 py-0.5 text-xs font-bold text-[#FFD400]">
                            {item.mode === '4tim'
                              ? '4 Tim'
                              : item.mode === '1lawan1'
                                ? '1 Lawan 1'
                                : '2 Tim'}
                          </span>
                          {item.mapel && (
                            <span className="rounded-lg bg-[#12276B] px-2 py-0.5 text-xs font-bold text-[#DCE7FF]">
                              {item.mapel}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold text-[#A8C4FF]">
                          <span>{formatTanggalJamHasil(item.dibuatPada)}</span>
                          <span>·</span>
                          <span>Durasi: {formatDurasiPertandingan(item.durasiDetik)}</span>
                          <span>·</span>
                          <span className="tabular-angka text-[#57E893]">
                            {ringkas.totalSoalTerjawab} soal dijawab (Akurasi {ringkas.akurasiTotal}%)
                          </span>
                          {ringkas.jawabanTercepat && (
                            <>
                              <span>·</span>
                              <span className="text-[#FFD400]">
                                Tercepat: {ringkas.jawabanTercepat.pemain} (
                                {formatDetikSingkat(ringkas.jawabanTercepat.waktuMs)})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge Pemenang & Skor */}
                    <div
                      className={`shrink-0 rounded-xl border-2 px-3.5 py-2 text-center font-display text-sm font-bold ${
                        item.pemenang === 'merah'
                          ? 'border-[#FF6B86] bg-[#7A0018] text-white'
                          : item.pemenang === 'biru'
                            ? 'border-[#669BFF] bg-[#071F70] text-white'
                            : 'border-[#FFD400] bg-[#7D3D00] text-[#FFD400]'
                      }`}
                    >
                      {hasilTeks}
                    </div>

                    {/* Tombol Aksi */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Button3D
                        variant="hijau"
                        size="sm"
                        onClick={() => {
                          tandaiInteraksiAudio();
                          bukaDetailRiwayatHasil(item.id);
                        }}
                      >
                        <span>Lihat</span>
                      </Button3D>
                      <Button3D
                        variant="ungu"
                        size="sm"
                        onClick={() => handleUnduhRekapCsvEntri(item)}
                      >
                        <Download size={16} />
                        <span>Unduh CSV</span>
                      </Button3D>
                      <Button3D
                        variant="merah"
                        size="sm"
                        onClick={() =>
                          setKonfirmasiHapus({
                            jenis: 'satu',
                            id: item.id,
                            judul: item.judulGame,
                          })
                        }
                        aria-label={`Hapus hasil ${item.judulGame}`}
                      >
                        <Trash2 size={16} />
                        <span>Hapus</span>
                      </Button3D>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Konfirmasi Hapus Riwayat */}
        <Modal
          terbuka={konfirmasiHapus !== null}
          judul="Konfirmasi Hapus Riwayat Hasil"
          onTutup={() => setKonfirmasiHapus(null)}
          lebarMaks="md"
          footer={
            <>
              <Button3D variant="navy" size="md" onClick={() => setKonfirmasiHapus(null)}>
                Batal
              </Button3D>
              <Button3D variant="merah" size="md" onClick={jalankanKonfirmasiHapus}>
                <Trash2 size={18} />
                <span>Ya, Hapus</span>
              </Button3D>
            </>
          }
        >
          <p className="text-base font-bold text-white">
            {konfirmasiHapus?.jenis === 'semua'
              ? `Hapus seluruh ${konfirmasiHapus.total} catatan hasil pertandingan dari Riwayat Hasil?`
              : konfirmasiHapus?.jenis === 'terpilih'
                ? `Hapus ${konfirmasiHapus.ids.length} hasil pertandingan yang dipilih?`
                : `Hapus catatan hasil "${konfirmasiHapus?.judul ?? ''}" dari Riwayat Hasil?`}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#DCE7FF]">
            Game dan soal di <strong>Game Saya</strong> tidak ikut terhapus. Anda dapat menekan{' '}
            <strong className="text-[#FFD400]">URUNGKAN</strong> dalam 10 detik setelah menghapus.
          </p>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN 2: DETAIL HASIL PERTANDINGAN
  // =========================================================================
  const namaMerah = entriDetailAktif.namaTimKiri || 'Tim Merah';
  const namaBiru = entriDetailAktif.namaTimKanan || 'Tim Biru';

  const adalahTurnamen =
    entriDetailAktif.mode === '4tim' &&
    Boolean(entriDetailAktif.turnamenSnapshot || sesiMode?.turnamen?.final.selesai);
  const peringkatTurnamen = entriDetailAktif.turnamenSnapshot
    ? entriDetailAktif.turnamenSnapshot
    : sesiMode?.turnamen
      ? ambilPeringkatTurnamen(sesiMode.turnamen)
      : null;

  const daftarDuelPapan =
    entriDetailAktif.duelSnapshot ??
    (entriDetailAktif.mode === '1lawan1' ? sesiMode?.duel?.papanKemenangan : undefined);
  const adalahDuel = entriDetailAktif.mode === '1lawan1' && Boolean(daftarDuelPapan?.length);

  const adalahSeri =
    entriDetailAktif.pemenang === 'seri' && !adalahTurnamen && !adalahDuel;
  const pemenangTampil: TimSisi | 'seri' =
    adalahSeri && hasilKoin ? hasilKoin : entriDetailAktif.pemenang;

  const judulPemenang =
    adalahTurnamen && peringkatTurnamen
      ? `JUARA 1: ${peringkatTurnamen.juara1}`
      : adalahDuel && daftarDuelPapan?.[0]
        ? `JUARA DUEL: ${daftarDuelPapan[0].nama}`
        : pemenangTampil === 'merah'
          ? `▲ ${namaMerah} MENANG!`
          : pemenangTampil === 'biru'
            ? `● ${namaBiru} MENANG!`
            : 'SERI!';

  const adaDiRiwayat = riwayatHasil.some((r) => r.id === entriDetailAktif.id);

  return (
    <div
      onPointerDown={() => tandaiInteraksiAudio()}
      className={`relative flex h-full w-full flex-col justify-between gap-2.5 overflow-hidden bg-[#0B1B4D] px-8 py-3 ${
        gameAktif?.pengaturan.modeRekam ? 'mode-rekam-aktif' : ''
      } ${gameAktif?.pengaturan.efekRingan ? 'efek-ringan-aktif' : ''}`}
    >
      {/* Konfeti Kemenangan */}
      {!gameAktif?.pengaturan.efekRingan && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[200px] overflow-hidden">
          {KONFETI_HASIL.map((k, idx) => (
            <div
              key={idx}
              style={{ left: k.left, top: '0px', animationDelay: k.delay, backgroundColor: k.warna }}
              className="anim-konfeti absolute h-4 w-4 rounded-sm border-2 border-[#071236]"
            />
          ))}
        </div>
      )}

      {/* 1. Header Pemenang / Podium (SEMUA ANGKA DARI ringkasDetail) */}
      {adalahTurnamen && peringkatTurnamen ? (
        <div className="kartu-3d grid shrink-0 grid-cols-12 items-end gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-3">
          <div className="col-span-3 flex items-center gap-3 rounded-2xl border-3 border-[#669BFF] bg-[#071F70] px-4 py-2">
            <Medal size={28} className="shrink-0 text-[#DCE7FF]" />
            <div className="min-w-0">
              <div className="font-display text-xs font-bold text-[#DCE7FF]">JUARA 2 (FINALIS)</div>
              <div className="truncate font-display text-lg font-bold text-white">
                {peringkatTurnamen.juara2}
              </div>
              <div className="tabular-angka text-xs font-bold text-[#FFD400]">
                Akurasi Sesi: {ringkasDetail.akurasiTotal}%
              </div>
            </div>
          </div>

          <div className="col-span-6 flex items-center justify-center gap-4 rounded-2xl border-4 border-[#FFD400] bg-[#7D3D00] px-5 py-2.5 shadow-[0_6px_0_#071236]">
            <MascotChibi varian="hijab" tim="merah" ukuran={74} menghadap="kanan" pegangTali={false} pose="menang" />
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFD400] px-3 py-0.5 font-display text-xs font-bold text-[#071236]">
                <Trophy size={14} /> JUARA 1 TURNAMEN 4 TIM
              </div>
              <h1 className="font-display teks-outline-raksasa mt-0.5 text-2xl font-bold text-white">
                {peringkatTurnamen.juara1}
              </h1>
              <p className="tabular-angka text-xs font-bold text-[#FFD400]">
                {entriDetailAktif.judulGame} · {ringkasDetail.skorMerah} Benar ({namaMerah}) · {ringkasDetail.skorBiru} Benar ({namaBiru})
              </p>
              <p className="tabular-angka text-[11px] font-bold text-[#FFF4DC]">
                Total Soal: {ringkasDetail.totalSoalTerjawab} · Tercepat:{' '}
                {ringkasDetail.jawabanTercepat
                  ? `${ringkasDetail.jawabanTercepat.pemain} (${formatDetikSingkat(ringkasDetail.jawabanTercepat.waktuMs)})`
                  : '-'}
              </p>
            </div>
            <MascotChibi varian="putra" tim="biru" ukuran={74} menghadap="kiri" pegangTali={false} pose="menang" />
          </div>

          <div className="col-span-3 flex items-center gap-3 rounded-2xl border-3 border-[#57E893] bg-[#005724] px-4 py-2">
            <Award size={28} className="shrink-0 text-[#57E893]" />
            <div className="min-w-0">
              <div className="font-display text-xs font-bold text-[#57E893]">JUARA 3 BERSAMA</div>
              <div className="truncate font-display text-sm font-bold text-white">
                {peringkatTurnamen.juara3Bersama[0]} &amp; {peringkatTurnamen.juara3Bersama[1]}
              </div>
              <div className="text-xs font-bold text-[#DCE7FF]">
                Durasi: {formatDurasiPertandingan(entriDetailAktif.durasiDetik)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="kartu-3d flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-5 py-3">
          {/* Kartu Skor Tim Merah */}
          <div className="flex items-center gap-3 rounded-2xl border-3 border-[#FF6B86] bg-[#7A0018] px-4 py-2">
            <MascotChibi
              varian="hijab"
              tim="merah"
              ukuran={68}
              menghadap="kanan"
              pegangTali={false}
              pose={pemenangTampil === 'merah' || pemenangTampil === 'seri' ? 'menang' : 'kalah'}
            />
            <div>
              <h2 className="font-display text-base font-bold text-[#FFD400]">▲ {namaMerah}</h2>
              <p className="font-display tabular-angka teks-outline-tebal text-2xl font-bold text-white">
                {ringkasDetail.skorMerah} Benar · {ringkasDetail.skorSalahMerah} Salah
              </p>
              <p className="tabular-angka text-xs font-bold text-[#FFD400]">
                Akurasi: {ringkasDetail.akurasiMerah}%
              </p>
            </div>
          </div>

          {/* Banner Tengah */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <div className="anim-pop-skor relative flex h-12 w-12 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236] shadow-[0_4px_0_#C79A00]">
                <Trophy size={28} strokeWidth={2.5} />
                <Star size={12} fill="#FFFFFF" className="absolute -top-1.5 -right-1.5 text-[#071236]" />
              </div>
              <div className="text-left">
                <p className="font-display text-xs font-bold text-[#57E893]">
                  {entriDetailAktif.judulGame} · {LABEL_ALASAN[entriDetailAktif.alasanAkhir ?? ''] ?? entriDetailAktif.labelLaga}
                </p>
                <h1 className="font-display teks-outline-raksasa text-3xl font-bold text-[#FFD400]">
                  {judulPemenang}
                </h1>
                {(entriDetailAktif.keteranganMenang || hasilKoin || seriDiterima) && (
                  <p className="font-display text-xs font-bold text-white">
                    {hasilKoin
                      ? `Menang undian koin (${hasilKoin === 'merah' ? namaMerah : namaBiru})`
                      : seriDiterima
                        ? 'Seri resmi diterima — kedua tim sama kuat'
                        : entriDetailAktif.keteranganMenang}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[#DCE7FF]">
              <span className="tabular-angka">
                Selisih Tali:{' '}
                <strong className="text-[#FFD400]">
                  {ringkasDetail.posisiTaliAkhir > 0
                    ? `+${ringkasDetail.posisiTaliAkhir}`
                    : ringkasDetail.posisiTaliAkhir}
                </strong>
              </span>
              <span>·</span>
              <span className="tabular-angka">
                Total Soal Terjawab: <strong className="text-white">{ringkasDetail.totalSoalTerjawab}</strong>
              </span>
              <span>·</span>
              <span className="tabular-angka">
                Akurasi %: <strong className="text-[#57E893]">{ringkasDetail.akurasiTotal}%</strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 tabular-angka">
                <Zap size={13} className="text-[#FFD400]" />
                <span>
                  Jawaban tercepat:{' '}
                  <strong className="text-[#FFD400]">
                    {ringkasDetail.jawabanTercepat
                      ? `${ringkasDetail.jawabanTercepat.pemain} (${formatDetikSingkat(
                          ringkasDetail.jawabanTercepat.waktuMs
                        )})`
                      : '-'}
                  </strong>
                </span>
              </span>
            </div>

            {adalahSeri && (
              <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2">
                <Button3D
                  variant="kuning"
                  size="sm"
                  disabled={sedangUndiKoin}
                  onClick={() => handleUndiDenganKoin(namaMerah, namaBiru)}
                >
                  <Coins size={16} className={sedangUndiKoin ? 'animate-spin' : ''} />
                  <span>{sedangUndiKoin ? 'Mengundi Koin...' : 'Undi dengan Koin'}</span>
                </Button3D>
                <Button3D
                  variant={seriDiterima ? 'hijau' : 'navy'}
                  size="sm"
                  disabled={sedangUndiKoin}
                  onClick={handleTerimaSeri}
                >
                  <CheckCircle2 size={16} />
                  <span>{seriDiterima ? 'Seri Diterima ✓' : 'Terima Seri'}</span>
                </Button3D>
              </div>
            )}
          </div>

          {/* Kartu Skor Tim Biru */}
          <div className="flex items-center gap-3 rounded-2xl border-3 border-[#669BFF] bg-[#071F70] px-4 py-2">
            <div className="text-right">
              <h2 className="font-display text-base font-bold text-[#FFD400]">● {namaBiru}</h2>
              <p className="font-display tabular-angka teks-outline-tebal text-2xl font-bold text-white">
                {ringkasDetail.skorBiru} Benar · {ringkasDetail.skorSalahBiru} Salah
              </p>
              <p className="tabular-angka text-xs font-bold text-[#FFD400]">
                Akurasi: {ringkasDetail.akurasiBiru}%
              </p>
            </div>
            <MascotChibi
              varian="putra"
              tim="biru"
              ukuran={68}
              menghadap="kiri"
              pegangTali={false}
              pose={pemenangTampil === 'biru' || pemenangTampil === 'seri' ? 'menang' : 'kalah'}
            />
          </div>
        </div>
      )}

      {/* 2. Bar Tab + Tombol Aksi */}
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border-3 border-[#2A4CB8] bg-[#071236] px-4 py-2">
        <div className="flex items-center gap-2">
          <Button3D
            variant="navy"
            size="sm"
            onClick={() => bukaDaftarRiwayatHasil()}
          >
            <ArrowLeft size={16} />
            <span>Daftar Riwayat</span>
          </Button3D>
          <Button3D
            variant={tabDetail === 'ringkasan' ? 'kuning' : 'navy'}
            size="sm"
            onClick={() => setTabDetail('ringkasan')}
          >
            <Trophy size={16} />
            <span>Ringkasan &amp; Pemain</span>
          </Button3D>
          <Button3D
            variant={tabDetail === 'soal' ? 'kuning' : 'navy'}
            size="sm"
            onClick={() => setTabDetail('soal')}
          >
            <BarChart3 size={16} />
            <span>Soal ({analisisSoal.length})</span>
            {jumlahPerluDiulas > 0 && (
              <span className="rounded-md bg-[#FF1744] px-1.5 py-0.5 text-[11px] font-bold text-white">
                {jumlahPerluDiulas} perlu diulas
              </span>
            )}
          </Button3D>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button3D
            variant="ungu"
            size="sm"
            onClick={() => handleUnduhRekapCsvEntri(entriDetailAktif)}
          >
            <Download size={16} />
            <span>Unduh Rekap (CSV)</span>
          </Button3D>
          <Button3D
            variant="biru"
            size="sm"
            onClick={() => handleUnduhAnalisisCsvEntri(entriDetailAktif)}
          >
            <FileSpreadsheet size={16} />
            <span>Unduh Analisis (CSV)</span>
          </Button3D>
          <Button3D
            variant="navy"
            size="sm"
            onClick={() => handleCetakPdfHasil(entriDetailAktif)}
          >
            <Printer size={16} />
            <span>Cetak / PDF Hasil</span>
          </Button3D>
          <Button3D
            variant="hijau"
            size="sm"
            onClick={() => handleSimpanDanKeluarDetail(entriDetailAktif)}
          >
            <Save size={16} />
            <span>Simpan &amp; Keluar</span>
          </Button3D>
          <Button3D
            variant="oranye"
            size="sm"
            onClick={() => handleMainLagi(entriDetailAktif)}
          >
            <Play size={16} fill="currentColor" />
            <span>Main Lagi</span>
          </Button3D>
          {adaDiRiwayat && (
            <Button3D
              variant="merah"
              size="sm"
              onClick={() =>
                setKonfirmasiHapus({
                  jenis: 'detailAktif',
                  id: entriDetailAktif.id,
                  judul: entriDetailAktif.judulGame,
                })
              }
            >
              <Trash2 size={16} />
              <span>Hapus Hasil Ini</span>
            </Button3D>
          )}
          <Button3D variant="kuning" size="sm" onClick={() => onNavigasi('/')}>
            <Home size={16} />
            <span>Menu</span>
          </Button3D>
        </div>
      </div>

      {/* 3. Konten Tab Aktif */}
      {tabDetail === 'soal' ? (
        <div className="kartu-3d flex min-h-0 flex-1 flex-col rounded-3xl border-3 border-[#2A4CB8] bg-[#12276B] p-4">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#FFD400]">
                Analisis Soal — Diurutkan dari yang Paling Sering Salah
              </h2>
              <p className="text-xs font-semibold text-[#DCE7FF]">
                Soal dengan persentase benar di bawah 50% ditandai{' '}
                <strong className="text-[#FFD400]">Perlu diulas</strong> agar mudah dibahas kembali bersama kelas.
              </p>
            </div>
            <Button3D
              variant="biru"
              size="sm"
              onClick={() => handleUnduhAnalisisCsvEntri(entriDetailAktif)}
            >
              <Download size={16} />
              <span>Unduh Analisis (CSV)</span>
            </Button3D>
          </div>

          {analisisSoal.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-base font-bold text-[#DCE7FF]">
              Belum ada soal yang terjawab pada pertandingan ini.
            </div>
          ) : (
            <div className="scroll-guru flex-1 space-y-2.5 pr-1">
              {analisisSoal.map((s, idx) => (
                <div
                  key={s.soalId}
                  className={`flex items-center justify-between gap-4 rounded-2xl border-2 px-4 py-3 ${
                    s.perluDiulas
                      ? 'border-[#FF9100] bg-[#3B1707]'
                      : 'border-[#2A4CB8] bg-[#071236]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display rounded-lg bg-[#173287] px-2.5 py-0.5 text-xs font-bold text-[#FFD400]">
                        #{idx + 1}
                      </span>
                      {s.perluDiulas ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-[#071236] bg-[#FF9100] px-2.5 py-0.5 text-xs font-bold text-[#071236]">
                          <AlertTriangle size={13} />
                          <span>Perlu diulas</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#005724] px-2.5 py-0.5 text-xs font-bold text-[#57E893]">
                          <CheckCircle2 size={13} />
                          <span>Dikuasai</span>
                        </span>
                      )}
                      <span className="tabular-angka text-xs font-bold text-[#A8C4FF]">
                        Dijawab {s.totalDijawab}× · Benar {s.jumlahBenar} · Salah {s.jumlahSalah}
                        {s.rataWaktuMs !== null ? ` · Rata-rata ${formatDetikSingkat(s.rataWaktuMs)}` : ''}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm font-bold text-white">{s.pertanyaan}</p>
                    <p className="mt-1 text-xs font-bold text-[#57E893]">
                      Kunci Benar:{' '}
                      <span className="text-[#FFD400]">
                        {s.jawabanBenarHuruf}. {s.jawabanBenarTeks}
                      </span>
                    </p>
                  </div>

                  {/* Meter Persentase Benar */}
                  <div className="w-[140px] shrink-0 text-right">
                    <div
                      className={`font-display tabular-angka text-2xl font-bold ${
                        s.perluDiulas ? 'text-[#FF9100]' : 'text-[#57E893]'
                      }`}
                    >
                      {s.persenBenar}%
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full border border-[#071236] bg-[#0B1B4D]">
                      <div
                        style={{ width: `${s.persenBenar}%` }}
                        className={`h-full ${
                          s.perluDiulas ? 'bg-[#FF9100]' : 'bg-[#00C853]'
                        }`}
                      />
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold text-[#DCE7FF]">Benar</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {/* Ringkasan Arena / Bagan / Duel */}
          {adalahTurnamen && entriDetailAktif.turnamenSnapshot ? (
            <div className="kartu-3d grid shrink-0 grid-cols-3 gap-4 rounded-3xl border-3 border-[#3C62D4] bg-[#173287] p-3.5">
              {entriDetailAktif.turnamenSnapshot.laga.map((item) => (
                <div
                  key={item.judul}
                  className="rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-4 py-2.5"
                >
                  <div className="font-display text-xs font-bold text-[#FFD400]">{item.judul}</div>
                  <div className="mt-1 font-display text-base font-bold text-white">
                    ▲ {item.namaTimKiri} ({item.skorMerah}) vs ● {item.namaTimKanan} ({item.skorBiru})
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs font-bold text-[#57E893]">
                    <span>Pemenang: {item.namaPemenang}</span>
                    <span className="tabular-angka text-[#FFD400]">
                      Selisih: {item.posisiTaliAkhir}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : adalahDuel && daftarDuelPapan ? (
            <div className="kartu-3d flex h-[195px] shrink-0 flex-col rounded-3xl border-3 border-[#3C62D4] bg-[#173287] p-3.5">
              <h3 className="font-display mb-2 shrink-0 text-sm font-bold text-[#FFD400]">
                Papan Kemenangan Sesi Duel 1 Lawan 1
              </h3>
              <div className="scroll-guru grid flex-1 grid-cols-4 gap-2 pr-1">
                {daftarDuelPapan.map((p, idx) => (
                  <div
                    key={p.nama}
                    className="flex flex-col justify-between rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-sm font-bold text-white">
                        #{idx + 1} {p.nama}
                      </span>
                      {p.mainDuaKali && (
                        <span className="rounded bg-[#FF9100] px-1.5 py-0.5 text-[10px] font-bold text-[#071236]">
                          2x
                        </span>
                      )}
                    </div>
                    <div className="tabular-angka mt-1 flex items-center justify-between text-xs font-bold">
                      <span className="text-[#57E893]">Menang: {p.menang}</span>
                      <span className="text-[#FF6B86]">Kalah: {p.kalah}</span>
                      <span className="text-[#FFD400]">Benar: {p.totalBenar}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ArenaTarikTambang
              namaTimKiri={namaMerah}
              namaTimKanan={namaBiru}
              namaSekolah={entriDetailAktif.namaSekolah}
              mapel={entriDetailAktif.mapel}
              jumlahPenarik={entriDetailAktif.jumlahPenarik}
              posisiTali={ringkasDetail.posisiTaliAkhir}
              langkahKeGaris={entriDetailAktif.langkahKeGaris}
              indeksGiliranKiri={0}
              indeksGiliranKanan={0}
              faseTimKiri="selesai"
              faseTimKanan="selesai"
              pemenang={
                ringkasDetail.totalSoalTerjawab > 0 || adalahSeri ? pemenangTampil : null
              }
              modeRekam={Boolean(gameAktif?.pengaturan.modeRekam)}
              efekRingan={Boolean(gameAktif?.pengaturan.efekRingan)}
            />
          )}

          {/* Rekap Per Pemain dengan Avatar Kecil + Nama */}
          <div className="kartu-3d flex min-h-0 flex-1 flex-col rounded-3xl border-3 border-[#2A4CB8] bg-[#12276B] p-3.5">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#FFD400]">
                Rekap Per Pemain ({ringkasDetail.rekapPemain.length} Pemain)
              </h3>
              <span className="tabular-angka text-xs font-bold text-[#DCE7FF]">
                Total {namaMerah}: {ringkasDetail.skorMerah} Benar · {ringkasDetail.skorSalahMerah} Salah |{' '}
                {namaBiru}: {ringkasDetail.skorBiru} Benar · {ringkasDetail.skorSalahBiru} Salah
              </span>
            </div>
            {ringkasDetail.rekapPemain.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-base font-bold text-[#DCE7FF]">
                Belum ada statistik pemain untuk pertandingan ini.
              </div>
            ) : (
              <div className="scroll-guru grid flex-1 grid-cols-4 gap-2.5 pr-1">
                {ringkasDetail.rekapPemain.map((p, idx) => (
                  <div
                    key={`${p.tim}_${p.nama}_${idx}`}
                    className={`flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2 ${
                      p.tim === 'merah'
                        ? 'border-[#FF6B86] bg-[#450B1C]'
                        : 'border-[#669BFF] bg-[#071F70]'
                    }`}
                  >
                    <AvatarPemainKecil tim={p.tim} indeks={idx} ukuran={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display truncate text-sm font-bold text-white">
                          {p.nama}
                        </span>
                        <span className="tabular-angka shrink-0 rounded bg-[#071236] px-1.5 py-0.5 text-[11px] font-bold text-[#FFD400]">
                          {p.akurasi}%
                        </span>
                      </div>
                      <div className="tabular-angka mt-0.5 flex items-center justify-between text-[11px] font-bold text-[#DCE7FF]">
                        <span>Giliran: {p.soal}</span>
                        <span className="text-[#57E893]">Benar: {p.benar}</span>
                        <span className="text-[#FF6B86]">Salah: {p.salah}</span>
                      </div>
                      <div className="tabular-angka text-[10px] font-semibold text-[#A8C4FF]">
                        Tercepat: {formatDetikSingkat(p.tercepatMs)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Hasil Ini */}
      <Modal
        terbuka={konfirmasiHapus !== null}
        judul="Hapus Catatan Hasil Ini"
        onTutup={() => setKonfirmasiHapus(null)}
        lebarMaks="md"
        footer={
          <>
            <Button3D variant="navy" size="md" onClick={() => setKonfirmasiHapus(null)}>
              Batal
            </Button3D>
            <Button3D variant="merah" size="md" onClick={jalankanKonfirmasiHapus}>
              <Trash2 size={18} />
              <span>Ya, Hapus Hasil Ini</span>
            </Button3D>
          </>
        }
      >
        <p className="text-base font-bold text-white">
          Hapus catatan hasil <span className="text-[#FFD400]">&quot;{entriDetailAktif.judulGame}&quot;</span> dari Riwayat Hasil?
        </p>
        <p className="mt-2 text-sm font-semibold text-[#DCE7FF]">
          Game dan bank soal Anda di <strong>Game Saya</strong> tetap aman dan tidak akan terhapus.
        </p>
      </Modal>
    </div>
  );
};

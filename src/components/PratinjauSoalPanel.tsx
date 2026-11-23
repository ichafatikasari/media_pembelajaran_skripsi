import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  ClipboardCopy,
  Columns2,
  Eye,
  EyeOff,
  FileCode2,
  FileUp,
  Filter,
  Highlighter,
  Info,
  KeyRound,
  List,
  ListChecks,
  Plus,
  Shuffle,
  Sparkles,
  Square,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import { Pengaturan } from '../data/types';
import {
  acakUrutanPilihanDraft,
  analisisKoreksiDaftarSoal,
  buatLaporanDiagnosaTeks,
  buatPratinjauRapikanOtomatis,
  DraftSoal,
  HasilParseKunci,
  InfoKolomPdf,
  konversiDraftValidKeSoal,
  konversiPenandaBarisKeDraft,
  LABEL_SUMBER_KUNCI,
  LevelLencanaKoreksi,
  ModeKolomPdf,
  parseFileKunciDokumen,
  parseTeksKunci,
  PeranBaris,
  PESAN_PERINGATAN_GAGAL_BACA_BESAR,
  PetaPeranBaris,
  SumberImpor,
  terapkanPetaKunciKeDraft,
  terapkanRapikanOtomatis,
  terapkanTandaiCepat,
  terimaSemuaKunciOtomatis,
  validasiDaftarDraftSoal,
} from '../parsers';
import {
  apakahPeringatanGagalBacaLuas,
  buatEntriSampahBatch,
  ItemSampahSoal,
  pulihkanItemKeDaftar,
} from '../utils/wizardDraft';
import { Button3D } from './Button3D';
import { KoreksiCepatModal } from './KoreksiCepatModal';
import { Modal } from './Modal';
import { RapikanOtomatisModal } from './RapikanOtomatisModal';
import { TempatSampahModal } from './TempatSampahModal';
import { JenisToast } from './Toast';

export interface DiagnostikImporInfo {
  jenisDokumen: SumberImpor;
  namaFile?: string;
  teksMentah: string;
  barisMentah: string[];
  infoKolomPdf?: InfoKolomPdf;
}

interface PratinjauSoalPanelProps {
  draftList: DraftSoal[];
  peringatanUmum: string[];
  diagnostikImpor?: DiagnostikImporInfo | null;
  jumlahSoalDiBankGame: number;
  modeKolomPdf?: ModeKolomPdf;
  sedangMemprosesUlangPdf?: boolean;
  modeWizard?: boolean;
  pengaturan?: Pengaturan;
  tempatSampah?: ItemSampahSoal[];
  onUpdateTempatSampah?: (items: ItemSampahSoal[]) => void;
  onKembali?: () => void;
  onUbahModeKolomPdf?: (mode: ModeKolomPdf) => void;
  onUpdateDraftList: (berikutnya: DraftSoal[]) => void;
  onGabungKeGame: (draftList: DraftSoal[]) => void;
  onLanjutPengaturan: (draftList: DraftSoal[]) => void;
  onSalinNotifikasi?: (pesan: string) => void;
  onTampilkanToast?: (
    pesan: string,
    jenis?: JenisToast,
    opsi?: { durasiMs?: number; aksiLabel?: string; onAksi?: () => void }
  ) => void;
}

type JenisHapusMassal = 'semua' | 'bermasalah' | 'dipilih';
type TabIsiKunci = 'ketuk' | 'tempel' | 'unggah';

const LABEL_PERAN_BARIS: Record<PeranBaris, { singkat: string; warna: string }> = {
  soal: { singkat: 'MULAI SOAL', warna: 'bg-[#FFD400] text-[#0B1B4D] border-[#FFE875]' },
  opsi_a: { singkat: 'PILIHAN A', warna: 'bg-[#1E6BFF] text-white border-[#669BFF]' },
  opsi_b: { singkat: 'PILIHAN B', warna: 'bg-[#1E6BFF] text-white border-[#669BFF]' },
  opsi_c: { singkat: 'PILIHAN C', warna: 'bg-[#1E6BFF] text-white border-[#669BFF]' },
  opsi_d: { singkat: 'PILIHAN D', warna: 'bg-[#1E6BFF] text-white border-[#669BFF]' },
  kunci_a: { singkat: 'KUNCI A', warna: 'bg-[#00C853] text-white border-[#57E893]' },
  kunci_b: { singkat: 'KUNCI B', warna: 'bg-[#00C853] text-white border-[#57E893]' },
  kunci_c: { singkat: 'KUNCI C', warna: 'bg-[#00C853] text-white border-[#57E893]' },
  kunci_d: { singkat: 'KUNCI D', warna: 'bg-[#00C853] text-white border-[#57E893]' },
  abaikan: { singkat: 'ABAIKAN', warna: 'bg-[#450B1C] text-[#FF99AD] border-[#FF1744]' },
};

const LABEL_LEVEL_KOREKSI: Record<
  LevelLencanaKoreksi,
  { teks: string; kelas: string }
> = {
  hijau: { teks: 'Lancar', kelas: 'bg-[#00C853] text-white' },
  kuning: { teks: 'Sebaiknya dicek', kelas: 'bg-[#FF9100] text-[#0B1B4D]' },
  merah: { teks: 'Harus diperbaiki', kelas: 'bg-[#FF1744] text-white' },
};

function potongTeks70(teks: string): string {
  const bersih = teks.trim();
  if (bersih.length <= 70) return bersih;
  return `${bersih.slice(0, 70)}…`;
}

export const PratinjauSoalPanel: React.FC<PratinjauSoalPanelProps> = ({
  draftList,
  peringatanUmum,
  diagnostikImpor,
  jumlahSoalDiBankGame,
  modeKolomPdf = 'otomatis',
  sedangMemprosesUlangPdf = false,
  modeWizard = false,
  pengaturan,
  tempatSampah,
  onUpdateTempatSampah,
  onKembali,
  onUbahModeKolomPdf,
  onUpdateDraftList,
  onGabungKeGame,
  onLanjutPengaturan,
  onSalinNotifikasi,
  onTampilkanToast,
}) => {
  const [tampilkanKunci, setTampilkanKunci] = useState(modeWizard);
  const [lihatTeksMentah, setLihatTeksMentah] = useState(false);
  const [modeTandaiManual, setModeTandaiManual] = useState(false);
  const [filterBermasalah, setFilterBermasalah] = useState(false);
  const [tampilanRingkas, setTampilanRingkas] = useState(false);
  const [alatLanjutanTerbuka, setAlatLanjutanTerbuka] = useState(false);
  const [idTerbukaDiRingkas, setIdTerbukaDiRingkas] = useState<string | null>(null);
  const [idDisorotPerbaiki, setIdDisorotPerbaiki] = useState<string | null>(null);
  const [idBaruDipulihkan, setIdBaruDipulihkan] = useState<string[]>([]);
  const [idTerpilihList, setIdTerpilihList] = useState<string[]>([]);
  const kartuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputPertanyaanRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [sampahInternal, setSampahInternal] = useState<ItemSampahSoal[]>([]);
  const daftarSampah = tempatSampah ?? sampahInternal;
  const perbaruiSampah = onUpdateTempatSampah ?? setSampahInternal;
  const sampahTerkiniRef = useRef<ItemSampahSoal[]>(daftarSampah);
  sampahTerkiniRef.current = daftarSampah;

  const [modalSampahTerbuka, setModalSampahTerbuka] = useState(false);
  const [modalRapikanTerbuka, setModalRapikanTerbuka] = useState(false);
  const [modalKoreksiCepatTerbuka, setModalKoreksiCepatTerbuka] = useState(false);

  const [barisTerpilihIdx, setBarisTerpilihIdx] = useState<number>(0);
  const [peranPerBaris, setPeranPerBaris] = useState<PetaPeranBaris>({});
  const [modeTandaiCepatAktif, setModeTandaiCepatAktif] = useState(false);
  const [panelKunciPenandaTerbuka, setPanelKunciPenandaTerbuka] = useState(false);

  // Modal Konfirmasi Hapus Massal
  const [konfirmasiHapusJenis, setKonfirmasiHapusJenis] =
    useState<JenisHapusMassal | null>(null);

  // Modal Isi Kunci Cepat
  const [modalKunciTerbuka, setModalKunciTerbuka] = useState(false);
  const [tabIsiKunci, setTabIsiKunci] = useState<TabIsiKunci>('ketuk');
  const [hanyaBelumTerisi, setHanyaBelumTerisi] = useState(false);
  const [indeksSorotKunci, setIndeksSorotKunci] = useState(0);
  const [teksTempelKunci, setTeksTempelKunci] = useState('');
  const [hasilUnggahKunci, setHasilUnggahKunci] = useState<HasilParseKunci | null>(null);
  const [namaFileKunci, setNamaFileKunci] = useState('');
  const [sedangBacaFileKunci, setSedangBacaFileKunci] = useState(false);
  const fileKunciInputRef = useRef<HTMLInputElement | null>(null);

  const hasilValidasi = useMemo(
    () =>
      validasiDaftarDraftSoal(draftList, peringatanUmum, {
        ...(diagnostikImpor
          ? {
              teksMentah: diagnostikImpor.teksMentah,
              barisMentah: diagnostikImpor.barisMentah,
              jenisDokumen: diagnostikImpor.jenisDokumen,
            }
          : {}),
      }),
    [diagnostikImpor, draftList, peringatanUmum]
  );

  const daftar = hasilValidasi.daftar;
  const analisisKoreksi = useMemo(
    () => analisisKoreksiDaftarSoal(daftar, pengaturan),
    [daftar, pengaturan]
  );
  const daftarPratinjauRapikan = useMemo(
    () => buatPratinjauRapikanOtomatis(daftar),
    [daftar]
  );

  const { jumlahDilewati } = konversiDraftValidKeSoal(daftar);
  const barisMentah = useMemo(
    () => diagnostikImpor?.barisMentah ?? [],
    [diagnostikImpor]
  );
  const adaTeksMentah = barisMentah.length > 0;
  const tampilPanelKiri = lihatTeksMentah || modeTandaiManual;

  const setIdTerpilih = useMemo(() => new Set(idTerpilihList), [idTerpilihList]);
  const setIdDipulihkan = useMemo(() => new Set(idBaruDipulihkan), [idBaruDipulihkan]);
  const jumlahTerpilihAktif = useMemo(
    () => daftar.filter((d) => setIdTerpilih.has(d.id)).length,
    [daftar, setIdTerpilih]
  );
  const semuaTerpilih = daftar.length > 0 && jumlahTerpilihAktif === daftar.length;

  const jumlahPerluPerhatian = analisisKoreksi.jumlahMerah + analisisKoreksi.jumlahKuning;
  const jumlahBermasalahMurni = useMemo(
    () =>
      daftar.filter((d) => {
        const lv = analisisKoreksi.perSoal[d.id]?.level;
        return lv === 'merah' || (d.keyakinan ?? 'yakin') === 'bermasalah';
      }).length,
    [analisisKoreksi.perSoal, daftar]
  );

  const jumlahKunciTerisi = useMemo(
    () =>
      daftar.filter(
        (d) =>
          d.kunci !== null &&
          d.kunci >= 0 &&
          d.kunci < d.pilihan.length &&
          !(d.kunciBertentangan && d.kunciBertentangan.length >= 2)
      ).length,
    [daftar]
  );

  const daftarDitampilkan = useMemo(() => {
    const dasar = modeWizard
      ? daftar
          .map((item, indeksAsli) => ({ item, indeksAsli }))
          .sort((a, b) => {
            const bobot = (id: string) => {
              const lv = analisisKoreksi.perSoal[id]?.level ?? 'hijau';
              return lv === 'merah' ? 0 : lv === 'kuning' ? 1 : 2;
            };
            const diff = bobot(a.item.id) - bobot(b.item.id);
            return diff !== 0 ? diff : a.indeksAsli - b.indeksAsli;
          })
      : daftar.map((item, indeksAsli) => ({ item, indeksAsli }));
    if (!filterBermasalah) {
      return dasar;
    }
    return dasar.filter(({ item }) => {
      const lv = analisisKoreksi.perSoal[item.id]?.level ?? 'hijau';
      return lv !== 'hijau';
    });
  }, [analisisKoreksi.perSoal, daftar, filterBermasalah, modeWizard]);

  const jumlahSiap = analisisKoreksi.jumlahHijau;
  const jumlahValidUntukSimpan = Math.max(0, daftar.length - jumlahDilewati);
  const peringatanGagalBacaLuas = apakahPeringatanGagalBacaLuas(
    daftar.length,
    jumlahBermasalahMurni,
    hasilValidasi.indikasiGagalBacaBesar,
    barisMentah.length
  );

  const fokusPerbaikiSoal = (item: DraftSoal) => {
    if (tampilanRingkas) {
      setIdTerbukaDiRingkas(item.id);
    }
    if (item.kunci === null || item.kunci < 0) {
      setTampilkanKunci(true);
    }
    setIdDisorotPerbaiki(item.id);
    window.setTimeout(() => {
      const kartuEl = kartuRefs.current.get(item.id);
      kartuEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const inputEl = inputPertanyaanRefs.current.get(item.id);
      inputEl?.focus();
    }, 60);
  };

  const daftarKetukCepat = useMemo(() => {
    const semua = daftar.map((item, indeksAsli) => ({ item, indeksAsli }));
    if (!hanyaBelumTerisi) return semua;
    return semua.filter(
      ({ item }) =>
        item.kunci === null || item.kunci < 0 || item.kunci >= item.pilihan.length
    );
  }, [daftar, hanyaBelumTerisi]);

  const hasilTempelKunciLive = useMemo(
    () => parseTeksKunci(teksTempelKunci, daftar.length),
    [teksTempelKunci, daftar.length]
  );

  // Pastikan indeks sorot di Ketuk Cepat tetap valid
  useEffect(() => {
    if (daftarKetukCepat.length === 0) return;
    if (!daftarKetukCepat.some((x) => x.indeksAsli === indeksSorotKunci)) {
      setIndeksSorotKunci(daftarKetukCepat[0].indeksAsli);
    }
  }, [daftarKetukCepat, indeksSorotKunci]);

  const kirimNotifikasi = (
    pesan: string,
    jenis: JenisToast = 'info',
    opsi?: { durasiMs?: number; aksiLabel?: string; onAksi?: () => void }
  ) => {
    if (onTampilkanToast) {
      onTampilkanToast(pesan, jenis, opsi);
    } else {
      onSalinNotifikasi?.(pesan);
    }
  };

  const updateBaris = (indeks: number, pengubah: (lama: DraftSoal) => DraftSoal) => {
    const salinan = daftar.map((item, idx) => {
      if (idx !== indeks) return item;
      const diubah = pengubah(item);
      return {
        ...diubah,
        tanpaNomorJelas: false,
        dideteksiDariParagraf: false,
      };
    });
    onUpdateDraftList(
      validasiDaftarDraftSoal(salinan, peringatanUmum, {
        jenisDokumen: diagnostikImpor?.jenisDokumen,
      }).daftar
    );
  };

  const sorotKartuSementara = (ids: string[]) => {
    if (ids.length === 0) return;
    setIdBaruDipulihkan(ids);
    window.setTimeout(() => {
      const pertama = kartuRefs.current.get(ids[0]);
      pertama?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    window.setTimeout(() => {
      setIdBaruDipulihkan((prev) => prev.filter((id) => !ids.includes(id)));
    }, 3500);
  };

  const hapusBaris = (indeks: number) => {
    const cadanganSebelumHapus = daftar.map((d) => ({ ...d, pilihan: [...d.pilihan] }));
    const terhapus = daftar[indeks];
    if (!terhapus) return;

    const entriSampah = buatEntriSampahBatch([{ soal: terhapus, posisiSemula: indeks }]);
    const grupId = entriSampah[0]?.grupHapusId;
    perbaruiSampah([...sampahTerkiniRef.current, ...entriSampah]);

    const salinan = daftar.filter((_, idx) => idx !== indeks);
    onUpdateDraftList(
      validasiDaftarDraftSoal(salinan, peringatanUmum, {
        jenisDokumen: diagnostikImpor?.jenisDokumen,
      }).daftar
    );
    setIdTerpilihList((prev) => prev.filter((id) => id !== terhapus.id));

    kirimNotifikasi('1 soal dipindahkan ke Tempat Sampah.', 'info', {
      durasiMs: 10000,
      aksiLabel: 'URUNGKAN',
      onAksi: () => {
        onUpdateDraftList(cadanganSebelumHapus);
        if (grupId) {
          perbaruiSampah(
            sampahTerkiniRef.current.filter((s) => s.grupHapusId !== grupId)
          );
        }
      },
    });
  };

  const togglePilihSoal = (id: string) => {
    setIdTerpilihList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePilihSemua = () => {
    if (semuaTerpilih) {
      setIdTerpilihList([]);
    } else {
      setIdTerpilihList(daftar.map((d) => d.id));
    }
  };

  const hitungTargetHapusMassal = (jenis: JenisHapusMassal): number => {
    if (jenis === 'semua') return daftar.length;
    if (jenis === 'bermasalah') return jumlahBermasalahMurni;
    return jumlahTerpilihAktif;
  };

  const jalankanHapusMassal = () => {
    if (!konfirmasiHapusJenis) return;
    const cadanganSebelumHapus = daftar.map((d) => ({ ...d, pilihan: [...d.pilihan] }));
    const pilihanSebelumnya = [...idTerpilihList];

    const akanDihapus = (d: DraftSoal): boolean => {
      if (konfirmasiHapusJenis === 'semua') return true;
      if (konfirmasiHapusJenis === 'bermasalah') {
        const lv = analisisKoreksi.perSoal[d.id]?.level;
        return lv === 'merah' || (d.keyakinan ?? 'yakin') === 'bermasalah';
      }
      return setIdTerpilih.has(d.id);
    };

    const terhapusDenganPosisi: { soal: DraftSoal; posisiSemula: number }[] = [];
    const sisa: DraftSoal[] = [];
    daftar.forEach((item, idx) => {
      if (akanDihapus(item)) {
        terhapusDenganPosisi.push({ soal: item, posisiSemula: idx });
      } else {
        sisa.push(item);
      }
    });

    const jumlahDihapus = terhapusDenganPosisi.length;
    setKonfirmasiHapusJenis(null);

    if (jumlahDihapus <= 0) return;

    const entriSampah = buatEntriSampahBatch(terhapusDenganPosisi);
    const grupId = entriSampah[0]?.grupHapusId;
    perbaruiSampah([...sampahTerkiniRef.current, ...entriSampah]);

    const tervalidasi =
      sisa.length === 0
        ? []
        : validasiDaftarDraftSoal(sisa, peringatanUmum, {
            jenisDokumen: diagnostikImpor?.jenisDokumen,
          }).daftar;

    onUpdateDraftList(tervalidasi);
    setIdTerpilihList((prev) => prev.filter((id) => sisa.some((s) => s.id === id)));

    kirimNotifikasi(`${jumlahDihapus} soal dipindahkan ke Tempat Sampah.`, 'info', {
      durasiMs: 10000,
      aksiLabel: 'URUNGKAN',
      onAksi: () => {
        onUpdateDraftList(cadanganSebelumHapus);
        setIdTerpilihList(pilihanSebelumnya);
        if (grupId) {
          perbaruiSampah(
            sampahTerkiniRef.current.filter((s) => s.grupHapusId !== grupId)
          );
        }
      },
    });
  };

  const handleKembalikanSatuDariSampah = (itemId: string) => {
    const target = daftarSampah.find((s) => s.id === itemId);
    if (!target) return;
    const { daftarBaru, idDipulihkan } = pulihkanItemKeDaftar(daftar, [target]);
    const tervalidasi = validasiDaftarDraftSoal(daftarBaru, peringatanUmum, {
      jenisDokumen: diagnostikImpor?.jenisDokumen,
    }).daftar;
    onUpdateDraftList(tervalidasi);
    perbaruiSampah(daftarSampah.filter((s) => s.id !== itemId));
    setModalSampahTerbuka(false);
    sorotKartuSementara(idDipulihkan);
    kirimNotifikasi(
      `Soal dikembalikan ke posisi #${Math.min(target.posisiSemula + 1, tervalidasi.length)}.`,
      'sukses'
    );
  };

  const handleKembalikanSemuaDariSampah = () => {
    if (daftarSampah.length === 0) return;
    const { daftarBaru, idDipulihkan } = pulihkanItemKeDaftar(daftar, daftarSampah);
    const tervalidasi = validasiDaftarDraftSoal(daftarBaru, peringatanUmum, {
      jenisDokumen: diagnostikImpor?.jenisDokumen,
    }).daftar;
    onUpdateDraftList(tervalidasi);
    perbaruiSampah([]);
    setModalSampahTerbuka(false);
    sorotKartuSementara(idDipulihkan);
    kirimNotifikasi(`${idDipulihkan.length} soal dikembalikan ke posisi semula.`, 'sukses');
  };

  const handleKosongkanSampah = () => {
    perbaruiSampah([]);
    kirimNotifikasi('Tempat Sampah soal telah dikosongkan.', 'info');
  };

  const handleTerimaSemuaKunciOtomatis = () => {
    const { daftarBaru, jumlahDiterima } = terimaSemuaKunciOtomatis(
      daftar,
      peringatanUmum,
      diagnostikImpor?.jenisDokumen
    );
    if (jumlahDiterima === 0) {
      kirimNotifikasi('Tidak ada kunci otomatis yang perlu diterima lagi.', 'info');
      return;
    }
    onUpdateDraftList(daftarBaru);
    setTampilkanKunci(true);
    kirimNotifikasi(`${jumlahDiterima} kunci otomatis diterima dan ditandai siap.`, 'sukses');
  };

  const handleTerapkanRapikanOtomatis = () => {
    const cadanganSebelumRapikan = daftar.map((d) => ({ ...d, pilihan: [...d.pilihan] }));
    const { daftarBaru, jumlahDiubah } = terapkanRapikanOtomatis(
      daftar,
      peringatanUmum,
      diagnostikImpor?.jenisDokumen
    );
    setModalRapikanTerbuka(false);
    if (jumlahDiubah === 0) {
      kirimNotifikasi('Semua soal sudah rapi.', 'info');
      return;
    }
    onUpdateDraftList(daftarBaru);
    kirimNotifikasi(`${jumlahDiubah} soal berhasil dirapikan.`, 'sukses', {
      durasiMs: 10000,
      aksiLabel: 'URUNGKAN',
      onAksi: () => {
        onUpdateDraftList(cadanganSebelumRapikan);
      },
    });
  };

  const setKunciSatuSoal = (indeksAsli: number, kunciIdx: number) => {
    const soalTarget = daftar[indeksAsli];
    if (!soalTarget || kunciIdx < 0 || kunciIdx >= soalTarget.pilihan.length) return;

    const salinan = daftar.map((item, idx) =>
      idx === indeksAsli
        ? {
            ...item,
            kunci: kunciIdx,
            tanpaNomorJelas: false,
            dideteksiDariParagraf: false,
          }
        : item
    );

    const hasilUpdate = validasiDaftarDraftSoal(salinan, peringatanUmum, {
      jenisDokumen: diagnostikImpor?.jenisDokumen,
    }).daftar;
    onUpdateDraftList(hasilUpdate);

    // Pindahkan sorotan ke baris berikutnya dalam daftar ketuk cepat
    const posSekarang = daftarKetukCepat.findIndex((x) => x.indeksAsli === indeksAsli);
    if (posSekarang >= 0 && posSekarang < daftarKetukCepat.length - 1) {
      setIndeksSorotKunci(daftarKetukCepat[posSekarang + 1].indeksAsli);
    }
  };

  // Keyboard shortcut untuk Ketuk Cepat (A-D & ArrowUp/ArrowDown)
  useEffect(() => {
    if (!modalKunciTerbuka || tabIsiKunci !== 'ketuk') return;

    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const keyUpper = e.key.toUpperCase();
      if (keyUpper === 'A' || keyUpper === 'B' || keyUpper === 'C' || keyUpper === 'D') {
        const kunciIdx = keyUpper.charCodeAt(0) - 65;
        const soalAktif = daftar[indeksSorotKunci];
        if (soalAktif && kunciIdx < soalAktif.pilihan.length) {
          e.preventDefault();
          setKunciSatuSoal(indeksSorotKunci, kunciIdx);
        }
        return;
      }

      if (e.key === 'ArrowDown' && daftarKetukCepat.length > 0) {
        e.preventDefault();
        const pos = daftarKetukCepat.findIndex((x) => x.indeksAsli === indeksSorotKunci);
        const nextPos = pos < 0 ? 0 : Math.min(daftarKetukCepat.length - 1, pos + 1);
        setIndeksSorotKunci(daftarKetukCepat[nextPos].indeksAsli);
      } else if (e.key === 'ArrowUp' && daftarKetukCepat.length > 0) {
        e.preventDefault();
        const pos = daftarKetukCepat.findIndex((x) => x.indeksAsli === indeksSorotKunci);
        const prevPos = pos <= 0 ? 0 : pos - 1;
        setIndeksSorotKunci(daftarKetukCepat[prevPos].indeksAsli);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handlePilihFileKunci = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSedangBacaFileKunci(true);
    setNamaFileKunci(file.name);
    try {
      const hasil = await parseFileKunciDokumen(file, daftar.length);
      setHasilUnggahKunci(hasil);
    } finally {
      setSedangBacaFileKunci(false);
      e.target.value = '';
    }
  };

  const terapkanKunciMassal = (hasilKunci: HasilParseKunci) => {
    if (hasilKunci.daftarPasangan.length === 0) {
      kirimNotifikasi('Belum ada kunci jawaban valid untuk diterapkan.', 'peringatan');
      return;
    }
    const diperbarui = terapkanPetaKunciKeDraft(
      daftar,
      hasilKunci.petaKunci,
      peringatanUmum,
      diagnostikImpor?.jenisDokumen
    );
    onUpdateDraftList(diperbarui);
    const terisiSetelah = diperbarui.filter(
      (d) => d.kunci !== null && d.kunci >= 0 && d.kunci < d.pilihan.length
    ).length;
    kirimNotifikasi(
      `Kunci jawaban diterapkan! (${terisiSetelah}/${diperbarui.length} soal terisi)`,
      'sukses'
    );
    setModalKunciTerbuka(false);
  };

  const geserBaris = (indeks: number, arah: -1 | 1) => {
    const target = indeks + arah;
    if (target < 0 || target >= daftar.length) return;
    const salinan = [...daftar];
    const sementara = salinan[indeks];
    salinan[indeks] = salinan[target];
    salinan[target] = sementara;
    onUpdateDraftList(salinan);
  };

  const handleAcakSemuaPilihan = () => {
    const teracak = daftar.map(acakUrutanPilihanDraft);
    onUpdateDraftList(
      validasiDaftarDraftSoal(teracak, peringatanUmum, {
        jenisDokumen: diagnostikImpor?.jenisDokumen,
      }).daftar
    );
  };

  const terapkanPeranDanSinkron = (petaBaru: PetaPeranBaris) => {
    setPeranPerBaris(petaBaru);
    if (barisMentah.length === 0) return;
    const hasilManual = konversiPenandaBarisKeDraft(
      barisMentah,
      petaBaru,
      diagnostikImpor?.jenisDokumen ?? 'docx'
    );
    if (hasilManual.daftar.length > 0) {
      onUpdateDraftList(hasilManual.daftar);
    }
  };

  const pilihPeranPadaBarisTerpilih = (peran: PeranBaris | null) => {
    if (!adaTeksMentah) return;
    const salinan: PetaPeranBaris = { ...peranPerBaris };
    if (peran === null) {
      delete salinan[barisTerpilihIdx];
    } else {
      salinan[barisTerpilihIdx] = peran;
    }
    terapkanPeranDanSinkron(salinan);
    setPanelKunciPenandaTerbuka(false);

    if (barisTerpilihIdx < barisMentah.length - 1) {
      setBarisTerpilihIdx((idx) => Math.min(barisMentah.length - 1, idx + 1));
    }
  };

  const handleKlikBarisMentah = (idx: number) => {
    setBarisTerpilihIdx(idx);
    if (modeTandaiManual && modeTandaiCepatAktif) {
      const { peranBaru, indeksBerikutnya } = terapkanTandaiCepat(
        barisMentah,
        peranPerBaris,
        idx
      );
      terapkanPeranDanSinkron(peranBaru);
      setBarisTerpilihIdx(indeksBerikutnya);
    }
  };

  const handleJalankanTandaiCepatDiBarisIni = () => {
    if (!adaTeksMentah) return;
    const { peranBaru, indeksBerikutnya } = terapkanTandaiCepat(
      barisMentah,
      peranPerBaris,
      barisTerpilihIdx
    );
    terapkanPeranDanSinkron(peranBaru);
    setBarisTerpilihIdx(indeksBerikutnya);
  };

  const handleSalinDiagnosa = async () => {
    const teksLaporan = buatLaporanDiagnosaTeks({
      jenisDokumen: diagnostikImpor?.jenisDokumen ?? (daftar[0]?.sumber ?? 'manual'),
      namaFile: diagnostikImpor?.namaFile,
      barisMentah,
      soalTerbaca: daftar,
      peringatan: hasilValidasi.peringatanUmum,
    });
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(teksLaporan);
      } else {
        const ta = document.createElement('textarea');
        ta.value = teksLaporan;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      kirimNotifikasi('Laporan diagnosa disalin ke papan klip.', 'info');
    } catch {
      kirimNotifikasi(
        'Gagal menyalin otomatis. Gunakan browser dengan izin papan klip.',
        'peringatan'
      );
    }
  };

  const kunciTambahOtomatis = !modeWizard && peringatanGagalBacaLuas;
  const soalAktifSorot = daftar[indeksSorotKunci];

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Ringkasan & Kontrol Pratinjau */}
      {modeWizard ? (
        <div className="flex shrink-0 flex-col gap-2 rounded-2xl border-3 border-[#3C62D4] bg-[#071236] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-display text-base font-bold text-white">
                <span className="text-[#FFD400]">{hasilValidasi.totalSoal} soal</span>
                <span className="mx-1.5 text-[#669BFF]">•</span>
                <span className="text-[#57E893]">{jumlahSiap} lancar</span>
                <span className="mx-1.5 text-[#669BFF]">•</span>
                <span className="text-[#FFBA5C]">
                  {analisisKoreksi.jumlahKuning} sebaiknya dicek
                </span>
                <span className="mx-1.5 text-[#669BFF]">•</span>
                <span
                  className={
                    analisisKoreksi.jumlahMerah > 0 ? 'text-[#FF99AD]' : 'text-[#DCE7FF]'
                  }
                >
                  {analisisKoreksi.jumlahMerah} harus diperbaiki
                </span>
              </div>
              <span className="rounded-lg border border-[#3C62D4] bg-[#12276B] px-2.5 py-1 text-xs font-bold text-[#DCE7FF]">
                Kunci: <strong className="text-[#57E893]">{analisisKoreksi.ringkasanKunci.otomatis} otomatis</strong> •{' '}
                <strong className={analisisKoreksi.ringkasanKunci.bertentangan > 0 ? 'text-[#FF99AD]' : 'text-white'}>
                  {analisisKoreksi.ringkasanKunci.bertentangan} bertentangan
                </strong>{' '}
                •{' '}
                <strong className={analisisKoreksi.ringkasanKunci.belumAda > 0 ? 'text-[#FFD400]' : 'text-white'}>
                  {analisisKoreksi.ringkasanKunci.belumAda} belum ada
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button3D
                variant="biru"
                size="sm"
                disabled={daftar.length === 0}
                onClick={() => setModalKoreksiCepatTerbuka(true)}
              >
                <ListChecks size={16} />
                <span>Koreksi Soal Satu per Satu</span>
              </Button3D>

              {analisisKoreksi.ringkasanKunci.otomatisBelumDiterima > 0 && (
                <Button3D
                  variant="hijau"
                  size="sm"
                  onClick={handleTerimaSemuaKunciOtomatis}
                >
                  <CheckCheck size={16} />
                  <span>
                    Terima Semua Kunci Otomatis ({analisisKoreksi.ringkasanKunci.otomatisBelumDiterima})
                  </span>
                </Button3D>
              )}

              {analisisKoreksi.jumlahBisaDirapikan > 0 && (
                <Button3D
                  variant="ungu"
                  size="sm"
                  onClick={() => setModalRapikanTerbuka(true)}
                >
                  <Sparkles size={16} />
                  <span>Rapikan Otomatis ({analisisKoreksi.jumlahBisaDirapikan})</span>
                </Button3D>
              )}

              <Button3D
                variant={daftarSampah.length > 0 ? 'oranye' : 'navy'}
                size="sm"
                onClick={() => setModalSampahTerbuka(true)}
              >
                <Archive size={16} />
                <span>Soal Terhapus ({daftarSampah.length})</span>
              </Button3D>

              <Button3D
                variant={alatLanjutanTerbuka ? 'kuning' : 'navy'}
                size="sm"
                onClick={() => setAlatLanjutanTerbuka((v) => !v)}
              >
                <Wrench size={16} />
                <span>Alat Lanjutan</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${alatLanjutanTerbuka ? 'rotate-180' : ''}`}
                />
              </Button3D>
            </div>
          </div>

          {alatLanjutanTerbuka && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1C388A] pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button3D
                  variant="kuning"
                  size="sm"
                  disabled={daftar.length === 0}
                  onClick={() => {
                    setIndeksSorotKunci(0);
                    setModalKunciTerbuka(true);
                  }}
                >
                  <KeyRound size={15} />
                  <span>
                    Isi Kunci Cepat ({jumlahKunciTerisi}/{daftar.length})
                  </span>
                </Button3D>

                <Button3D
                  variant={tampilanRingkas ? 'biru' : 'navy'}
                  size="sm"
                  disabled={daftar.length === 0}
                  onClick={() => setTampilanRingkas((v) => !v)}
                >
                  <List size={15} />
                  <span>Tampilan Ringkas{tampilanRingkas ? ': ON' : ''}</span>
                </Button3D>

                <Button3D
                  variant={tampilkanKunci ? 'hijau' : 'navy'}
                  size="sm"
                  onClick={() => setTampilkanKunci((v) => !v)}
                >
                  {tampilkanKunci ? <Eye size={15} /> : <EyeOff size={15} />}
                  <span>Kunci: {tampilkanKunci ? 'ON' : 'OFF'}</span>
                </Button3D>

                <Button3D
                  variant="ungu"
                  size="sm"
                  disabled={daftar.length === 0}
                  onClick={handleAcakSemuaPilihan}
                >
                  <Shuffle size={15} />
                  <span>Acak Pilihan</span>
                </Button3D>

                <Button3D
                  variant={filterBermasalah ? 'oranye' : 'navy'}
                  size="sm"
                  disabled={daftar.length === 0}
                  onClick={() => setFilterBermasalah((v) => !v)}
                >
                  <Filter size={15} />
                  <span>Perlu dicek/perbaiki ({jumlahPerluPerhatian})</span>
                </Button3D>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button3D
                  variant={semuaTerpilih ? 'biru' : 'navy'}
                  size="sm"
                  disabled={daftar.length === 0}
                  onClick={togglePilihSemua}
                >
                  {semuaTerpilih ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>{semuaTerpilih ? 'Batal Pilih' : 'Pilih Semua'}</span>
                </Button3D>

                <Button3D
                  variant="merah"
                  size="sm"
                  disabled={jumlahTerpilihAktif === 0}
                  onClick={() => setKonfirmasiHapusJenis('dipilih')}
                >
                  <Trash2 size={15} />
                  <span>
                    Hapus yang Dipilih
                    {jumlahTerpilihAktif > 0 ? ` (${jumlahTerpilihAktif})` : ''}
                  </span>
                </Button3D>

                <Button3D
                  variant="merah"
                  size="sm"
                  disabled={jumlahBermasalahMurni === 0}
                  onClick={() => setKonfirmasiHapusJenis('bermasalah')}
                >
                  <Trash2 size={15} />
                  <span>Hapus Bermasalah ({jumlahBermasalahMurni})</span>
                </Button3D>

                <Button3D
                  variant="merah"
                  size="sm"
                  disabled={daftar.length === 0}
                  onClick={() => setKonfirmasiHapusJenis('semua')}
                >
                  <Trash2 size={15} />
                  <span>Hapus Semua</span>
                </Button3D>

                {adaTeksMentah && (
                  <>
                    <Button3D
                      variant={modeTandaiManual ? 'kuning' : 'oranye'}
                      size="sm"
                      onClick={() => {
                        const baru = !modeTandaiManual;
                        setModeTandaiManual(baru);
                        if (baru) setLihatTeksMentah(true);
                      }}
                    >
                      <Highlighter size={15} />
                      <span>{modeTandaiManual ? 'Tandai Manual: ON' : 'Tandai Manual'}</span>
                    </Button3D>

                    <Button3D
                      variant={lihatTeksMentah ? 'biru' : 'navy'}
                      size="sm"
                      onClick={() => setLihatTeksMentah((v) => !v)}
                    >
                      <FileCode2 size={15} />
                      <span>{lihatTeksMentah ? 'Tutup Teks Mentah' : 'Lihat Teks Mentah'}</span>
                    </Button3D>
                  </>
                )}

                <Button3D variant="navy" size="sm" onClick={() => void handleSalinDiagnosa()}>
                  <ClipboardCopy size={15} />
                  <span>Salin Diagnosa</span>
                </Button3D>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 flex-col gap-2 rounded-2xl border-3 border-[#3C62D4] bg-[#071236] px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div>
              <div className="font-display text-lg font-bold text-[#FFD400]">
                Terbaca {hasilValidasi.totalSoal} soal •{' '}
                {hasilValidasi.jumlahBermasalah > 0 ? (
                  <span className="text-[#FFD400]">
                    {hasilValidasi.jumlahBermasalah} perlu diperiksa
                  </span>
                ) : (
                  <span className="text-[#57E893]">Semua siap dipakai</span>
                )}
              </div>
              <p className="text-xs text-[#DCE7FF]">
                Bank soal game saat ini berisi{' '}
                <strong className="text-white">{jumlahSoalDiBankGame}</strong> soal.
                {jumlahDilewati > 0 && (
                  <span className="ml-2 font-bold text-[#FFD400]">
                    ({jumlahDilewati} soal bermasalah tidak ikut masuk sebelum diperbaiki)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button3D
                variant="kuning"
                size="sm"
                disabled={daftar.length === 0}
                onClick={() => {
                  setIndeksSorotKunci(0);
                  setModalKunciTerbuka(true);
                }}
              >
                <KeyRound size={16} />
                <span>
                  Isi Kunci Cepat ({jumlahKunciTerisi}/{daftar.length})
                </span>
              </Button3D>

              <Button3D
                variant={tampilanRingkas ? 'biru' : 'navy'}
                size="sm"
                disabled={daftar.length === 0}
                onClick={() => setTampilanRingkas((v) => !v)}
              >
                <List size={16} />
                <span>Tampilan Ringkas{tampilanRingkas ? ': ON' : ''}</span>
              </Button3D>

              <Button3D
                variant={tampilkanKunci ? 'hijau' : 'navy'}
                size="sm"
                onClick={() => setTampilkanKunci((v) => !v)}
              >
                {tampilkanKunci ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>Kunci: {tampilkanKunci ? 'ON' : 'OFF'}</span>
              </Button3D>

              <Button3D
                variant="ungu"
                size="sm"
                disabled={daftar.length === 0}
                onClick={handleAcakSemuaPilihan}
              >
                <Shuffle size={16} />
                <span>Acak Pilihan</span>
              </Button3D>

              <Button3D
                variant="oranye"
                size="sm"
                disabled={
                  daftar.length === 0 ||
                  daftar.length - jumlahDilewati === 0 ||
                  kunciTambahOtomatis
                }
                onClick={() => onGabungKeGame(daftar)}
              >
                <Plus size={16} />
                <span>Tambah ke Game ({Math.max(0, daftar.length - jumlahDilewati)})</span>
              </Button3D>

              <Button3D
                variant="hijau"
                size="sm"
                disabled={
                  (daftar.length === 0 || kunciTambahOtomatis) && jumlahSoalDiBankGame === 0
                }
                onClick={() => onLanjutPengaturan(kunciTambahOtomatis ? [] : daftar)}
              >
                <span>LANJUT PENGATURAN</span>
                <ArrowRight size={16} />
              </Button3D>
            </div>
          </div>

          {/* Baris Alat Kedua */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1C388A] pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button3D
                variant={semuaTerpilih ? 'biru' : 'navy'}
                size="sm"
                disabled={daftar.length === 0}
                onClick={togglePilihSemua}
              >
                {semuaTerpilih ? <CheckSquare size={15} /> : <Square size={15} />}
                <span>{semuaTerpilih ? 'Batal Pilih' : 'Pilih Semua'}</span>
              </Button3D>

              <Button3D
                variant="merah"
                size="sm"
                disabled={jumlahTerpilihAktif === 0}
                onClick={() => setKonfirmasiHapusJenis('dipilih')}
              >
                <Trash2 size={15} />
                <span>
                  Hapus yang Dipilih
                  {jumlahTerpilihAktif > 0 ? ` (Hapus ${jumlahTerpilihAktif} soal)` : ''}
                </span>
              </Button3D>

              <Button3D
                variant="merah"
                size="sm"
                disabled={jumlahBermasalahMurni === 0}
                onClick={() => setKonfirmasiHapusJenis('bermasalah')}
              >
                <Trash2 size={15} />
                <span>Hapus yang Bermasalah ({jumlahBermasalahMurni})</span>
              </Button3D>

              <Button3D
                variant="merah"
                size="sm"
                disabled={daftar.length === 0}
                onClick={() => setKonfirmasiHapusJenis('semua')}
              >
                <Trash2 size={15} />
                <span>Hapus Semua</span>
              </Button3D>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {adaTeksMentah && (
                <>
                  <Button3D
                    variant={modeTandaiManual ? 'kuning' : 'oranye'}
                    size="sm"
                    onClick={() => {
                      const baru = !modeTandaiManual;
                      setModeTandaiManual(baru);
                      if (baru) setLihatTeksMentah(true);
                    }}
                  >
                    <Highlighter size={15} />
                    <span>{modeTandaiManual ? 'Tandai Manual: ON' : 'Tandai Manual'}</span>
                  </Button3D>

                  <Button3D
                    variant={lihatTeksMentah ? 'biru' : 'navy'}
                    size="sm"
                    onClick={() => setLihatTeksMentah((v) => !v)}
                  >
                    <FileCode2 size={15} />
                    <span>{lihatTeksMentah ? 'Tutup Teks Mentah' : 'Lihat Teks Mentah'}</span>
                  </Button3D>
                </>
              )}

              <Button3D
                variant={filterBermasalah ? 'merah' : 'navy'}
                size="sm"
                disabled={daftar.length === 0}
                onClick={() => setFilterBermasalah((v) => !v)}
              >
                <Filter size={15} />
                <span>Bermasalah saja ({jumlahPerluPerhatian})</span>
              </Button3D>

              <Button3D variant="navy" size="sm" onClick={() => void handleSalinDiagnosa()}>
                <ClipboardCopy size={15} />
                <span>Salin Diagnosa</span>
              </Button3D>
            </div>
          </div>
        </div>
      )}

      {/* Info Kolom PDF (Badge Info + Pilihan Mode Kolom PDF) */}
      {(diagnostikImpor?.jenisDokumen === 'pdf' || diagnostikImpor?.infoKolomPdf) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#4AC3FF] bg-[#082A54] px-4 py-2 text-xs font-bold text-white">
          <div className="flex items-center gap-2">
            <Info size={16} className="shrink-0 text-[#4AC3FF]" />
            <span>
              {diagnostikImpor?.infoKolomPdf?.keterangan ??
                'Dokumen PDF berhasil diekstrak.'}
            </span>
          </div>

          {onUbahModeKolomPdf && (
            <div className="flex items-center gap-1.5">
              <Columns2 size={15} className="text-[#FFD400]" />
              <span className="text-[#DCE7FF]">Kolom PDF:</span>
              {(['otomatis', '1kolom', '2kolom'] as ModeKolomPdf[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={sedangMemprosesUlangPdf}
                  onClick={() => onUbahModeKolomPdf(mode)}
                  className={`font-display cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                    modeKolomPdf === mode
                      ? 'border-[#FFE875] bg-[#FFD400] text-[#0B1B4D]'
                      : 'border-[#3C62D4] bg-[#071236] text-[#DCE7FF] hover:border-[#669BFF]'
                  }`}
                >
                  {mode === 'otomatis'
                    ? 'Otomatis'
                    : mode === '1kolom'
                      ? '1 Kolom'
                      : '2 Kolom'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pengaman Anti-Kekeliruan Besar (HANYA muncul jika masalah menyebar luas atau soal terbaca sangat sedikit) */}
      {peringatanGagalBacaLuas && (
        <div
          role="alert"
          className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border-4 border-[#FF1744] bg-[#5C0015] px-5 py-3 shadow-[0_6px_0_#2D000A]"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} className="shrink-0 text-[#FFD400]" />
            <div>
              <div className="font-display text-lg font-bold text-[#FFD400]">
                Peringatan Pembacaan Dokumen
              </div>
              <p className="text-sm font-bold text-white">
                {hasilValidasi.peringatanKritis ?? PESAN_PERINGATAN_GAGAL_BACA_BESAR}
              </p>
            </div>
          </div>

          {adaTeksMentah && !modeTandaiManual && (
            <Button3D
              variant="kuning"
              size="md"
              onClick={() => {
                setModeTandaiManual(true);
                setLihatTeksMentah(true);
              }}
            >
              <Highlighter size={18} />
              <span>Buka Penanda Baris</span>
            </Button3D>
          )}
        </div>
      )}

      {/* Peringatan Umum Dokumen & Catatan Bagian (mis. Uraian dilewati) */}
      {hasilValidasi.peringatanUmum.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1 rounded-2xl border-2 border-[#FFD400] bg-[#7D3D00] px-4 py-2 text-xs font-bold text-white">
          {hasilValidasi.peringatanUmum.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-[#FFD400]" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* Peringatan Analisis Kumpulan Soal (Sebaran kunci, kunci terpanjang, kecukupan waktu) */}
      {(analisisKoreksi.peringatanUmumKoreksi.sebaranKunciTimpang ||
        analisisKoreksi.peringatanUmumKoreksi.urutanKunciBeruntun ||
        analisisKoreksi.peringatanUmumKoreksi.kunciTerpanjangDominan ||
        analisisKoreksi.peringatanUmumKoreksi.soalKurangUntukWaktu) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#FF9100] bg-[#3D2000] px-4 py-2 text-xs font-bold text-[#FFE8B3]">
          <div className="space-y-0.5">
            {analisisKoreksi.peringatanUmumKoreksi.sebaranKunciTimpang && (
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-[#FFD400]" />
                <span>{analisisKoreksi.peringatanUmumKoreksi.sebaranKunciTimpang}</span>
              </div>
            )}
            {analisisKoreksi.peringatanUmumKoreksi.urutanKunciBeruntun && (
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-[#FFD400]" />
                <span>{analisisKoreksi.peringatanUmumKoreksi.urutanKunciBeruntun}</span>
              </div>
            )}
            {analisisKoreksi.peringatanUmumKoreksi.kunciTerpanjangDominan && (
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-[#FFD400]" />
                <span>{analisisKoreksi.peringatanUmumKoreksi.kunciTerpanjangDominan}</span>
              </div>
            )}
            {analisisKoreksi.peringatanUmumKoreksi.soalKurangUntukWaktu && (
              <div className="flex items-center gap-2">
                <Info size={15} className="shrink-0 text-[#4AC3FF]" />
                <span>{analisisKoreksi.peringatanUmumKoreksi.soalKurangUntukWaktu}</span>
              </div>
            )}
          </div>

          {(analisisKoreksi.peringatanUmumKoreksi.sebaranKunciTimpang ||
            analisisKoreksi.peringatanUmumKoreksi.urutanKunciBeruntun) && (
            <Button3D variant="ungu" size="sm" onClick={handleAcakSemuaPilihan}>
              <Shuffle size={15} />
              <span>Acak Posisi Pilihan</span>
            </Button3D>
          )}
        </div>
      )}

      {/* Area Utama: Side-by-Side bila Teks Mentah / Tandai Manual aktif */}
      <div className="flex min-h-0 flex-1 gap-3">
        {tampilPanelKiri && adaTeksMentah && (
          <div className="flex w-[48%] min-h-0 flex-col gap-2 rounded-2xl border-3 border-[#FFD400] bg-[#071236] p-3">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <div>
                <div className="font-display text-base font-bold text-[#FFD400]">
                  {modeTandaiManual
                    ? 'Penanda Baris (Ketuk baris lalu pilih peran)'
                    : 'Teks Mentah Hasil Ekstraksi'}
                </div>
                <div className="text-xs font-semibold text-[#DCE7FF]">
                  {modeTandaiManual
                    ? `Baris terpilih: #${barisTerpilihIdx + 1} • ${Object.keys(peranPerBaris).length} baris ditandai`
                    : `${barisMentah.length} paragraf / baris terdeteksi`}
                </div>
              </div>

              {modeTandaiManual && (
                <div className="flex items-center gap-1.5">
                  <Button3D
                    variant={modeTandaiCepatAktif ? 'hijau' : 'ungu'}
                    size="sm"
                    onClick={() => {
                      const akanAktif = !modeTandaiCepatAktif;
                      setModeTandaiCepatAktif(akanAktif);
                      if (akanAktif) {
                        handleJalankanTandaiCepatDiBarisIni();
                      }
                    }}
                  >
                    <Zap size={15} />
                    <span>
                      Tandai Cepat{modeTandaiCepatAktif ? ': ON' : ''}
                    </span>
                  </Button3D>
                  <Button3D
                    variant="navy"
                    size="sm"
                    onClick={() => setPeranPerBaris({})}
                  >
                    <span>Reset</span>
                  </Button3D>
                </div>
              )}
            </div>

            {modeTandaiManual && (
              <div className="flex shrink-0 flex-col gap-1.5 rounded-xl border-2 border-[#2A4CB8] bg-[#12276B] p-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih('soal')}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#FFE875] bg-[#FFD400] px-3 text-sm font-bold text-[#0B1B4D] active:translate-y-0.5"
                  >
                    Mulai Soal
                  </button>
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih('opsi_a')}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#669BFF] bg-[#1E6BFF] px-3 text-sm font-bold text-white active:translate-y-0.5"
                  >
                    Pilihan A
                  </button>
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih('opsi_b')}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#669BFF] bg-[#1E6BFF] px-3 text-sm font-bold text-white active:translate-y-0.5"
                  >
                    Pilihan B
                  </button>
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih('opsi_c')}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#669BFF] bg-[#1E6BFF] px-3 text-sm font-bold text-white active:translate-y-0.5"
                  >
                    Pilihan C
                  </button>
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih('opsi_d')}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#669BFF] bg-[#1E6BFF] px-3 text-sm font-bold text-white active:translate-y-0.5"
                  >
                    Pilihan D
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelKunciPenandaTerbuka((v) => !v)}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#57E893] bg-[#00C853] px-3 text-sm font-bold text-white active:translate-y-0.5"
                  >
                    Kunci A–D
                  </button>
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih('abaikan')}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#FF6B86] bg-[#B80023] px-3 text-sm font-bold text-white active:translate-y-0.5"
                  >
                    Abaikan
                  </button>
                  <button
                    type="button"
                    onClick={() => pilihPeranPadaBarisTerpilih(null)}
                    className="font-display min-h-[48px] cursor-pointer rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-2.5 text-xs font-bold text-[#DCE7FF]"
                  >
                    Hapus Peran
                  </button>
                </div>

                {panelKunciPenandaTerbuka && (
                  <div className="flex items-center gap-2 border-t border-[#2A4CB8] pt-1.5">
                    <span className="text-xs font-bold text-[#FFD400]">
                      Set Kunci Soal Aktif:
                    </span>
                    {(['kunci_a', 'kunci_b', 'kunci_c', 'kunci_d'] as PeranBaris[]).map(
                      (k, kIdx) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => pilihPeranPadaBarisTerpilih(k)}
                          className="font-display min-h-[48px] min-w-[54px] cursor-pointer rounded-xl border-2 border-[#57E893] bg-[#007A33] px-3 text-sm font-bold text-white hover:bg-[#00C853]"
                        >
                          {String.fromCharCode(65 + kIdx)}
                        </button>
                      )
                    )}
                  </div>
                )}

                <p className="text-[11px] font-semibold text-[#DCE7FF]">
                  Baris berurutan di bawah <strong>Mulai Soal</strong> yang tidak diberi peran otomatis digabung sebagai lanjutan soal.
                </p>
              </div>
            )}

            <div className="scroll-guru flex-1 space-y-1.5 pr-1">
              {barisMentah.map((teksBaris, bIdx) => {
                const terpilih = modeTandaiManual && barisTerpilihIdx === bIdx;
                const peran = peranPerBaris[bIdx];
                const infoPeran = peran ? LABEL_PERAN_BARIS[peran] : null;
                return (
                  <button
                    key={bIdx}
                    type="button"
                    onClick={() => handleKlikBarisMentah(bIdx)}
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl border-2 px-3 py-2 text-left transition ${
                      terpilih
                        ? 'border-[#FFD400] bg-[#173287]'
                        : peran === 'abaikan'
                          ? 'border-[#3C62D4]/40 bg-[#040B24] opacity-65'
                          : 'border-[#2A4CB8] bg-[#12276B]/70 hover:border-[#669BFF]'
                    }`}
                  >
                    <span className="tabular-angka mt-0.5 w-8 shrink-0 rounded bg-[#040B24] px-1.5 py-0.5 text-center font-mono text-xs font-bold text-[#FFD400]">
                      {bIdx + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                      {teksBaris}
                    </span>
                    {infoPeran && (
                      <span
                        className={`font-display shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${infoPeran.warna}`}
                      >
                        {infoPeran.singkat}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Daftar Soal Hasil Baca di Pratinjau */}
        <div className="flex min-h-0 flex-1 flex-col">
          {daftar.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border-3 border-dashed border-[#3C62D4] bg-[#071236] p-8 text-center">
              <p className="text-bacaan text-lg text-[#DCE7FF]">
                {adaTeksMentah
                  ? 'Daftar pratinjau kosong. Gunakan tombol Tandai Manual di atas atau tekan URUNGKAN bila baru dihapus.'
                  : 'Belum ada hasil baca di pratinjau. Gunakan tab Tempel Teks atau Unggah Dokumen untuk memuat soal ke sini.'}
              </p>
            </div>
          ) : daftarDitampilkan.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border-3 border-dashed border-[#00C853] bg-[#071236] p-8 text-center">
              <p className="text-bacaan text-lg font-bold text-[#57E893]">
                Tidak ada soal yang bermasalah atau perlu dicek! Matikan filter untuk melihat semua {daftar.length} soal.
              </p>
            </div>
          ) : (
            <div
              className={`scroll-guru flex-1 pr-2 ${
                tampilanRingkas ? 'space-y-1.5' : 'space-y-3'
              }`}
            >
              {daftarDitampilkan.map(({ item, indeksAsli: idx }) => {
                const statusItem = analisisKoreksi.perSoal[item.id];
                const level: LevelLencanaKoreksi = statusItem?.level ?? 'hijau';
                const infoLevel = LABEL_LEVEL_KOREKSI[level];
                const adaMasalah = level !== 'hijau';
                const alasanKartu = [
                  ...(statusItem?.alasanMerah ?? []),
                  ...(statusItem?.alasanKuning ?? []),
                ];
                const dipilih = setIdTerpilih.has(item.id);
                const sedangExpandedRingkas =
                  tampilanRingkas && idTerbukaDiRingkas === item.id;
                const disorotPerbaiki = idDisorotPerbaiki === item.id;
                const baruDipulihkan = setIdDipulihkan.has(item.id);
                const adaKonflikKunci =
                  Array.isArray(item.kunciBertentangan) &&
                  item.kunciBertentangan.length >= 2;
                const labelSumberKunci = item.sumberKunci
                  ? LABEL_SUMBER_KUNCI[item.sumberKunci]
                  : null;
                const kunciOtomatisAktif =
                  item.sumberKunci === 'bagian_kunci' ||
                  item.sumberKunci === 'baris_jawaban' ||
                  item.sumberKunci === 'penanda_pilihan';

                if (tampilanRingkas && !sedangExpandedRingkas) {
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2 ${
                        baruDipulihkan
                          ? 'border-[#57E893] bg-[#06381D] ring-2 ring-[#57E893]'
                          : dipilih
                            ? 'border-[#FFD400] bg-[#173287]'
                            : level === 'merah'
                              ? 'border-[#FF1744] bg-[#450B1C]'
                              : level === 'kuning'
                                ? 'border-[#FF9100] bg-[#3D2000]'
                                : 'border-[#2A4CB8] bg-[#12276B]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={dipilih}
                        onChange={() => togglePilihSoal(item.id)}
                        aria-label={`Pilih soal ${idx + 1}`}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-[#FFD400]"
                      />

                      <span className="font-display w-12 shrink-0 rounded-lg bg-[#FFD400] px-2 py-0.5 text-center text-xs font-bold text-[#0B1B4D]">
                        #{idx + 1}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                        {potongTeks70(item.pertanyaan || '(Pertanyaan kosong)')}
                      </span>

                      {statusItem?.cekManualMedia && (
                        <span className="font-display shrink-0 rounded-lg bg-[#7D3D00] px-2 py-0.5 text-[11px] font-bold text-[#FFD400]">
                          Cek manual
                        </span>
                      )}

                      {item.cadangan && (
                        <span className="font-display shrink-0 rounded-lg bg-[#7C4DFF] px-2 py-0.5 text-[11px] font-bold text-white">
                          CADANGAN
                        </span>
                      )}

                      <span
                        className={`font-display shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${infoLevel.kelas}`}
                      >
                        {infoLevel.teks}
                      </span>

                      <span
                        className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${
                          adaKonflikKunci
                            ? 'bg-[#FF1744] text-white'
                            : item.kunci !== null && kunciOtomatisAktif
                              ? 'bg-[#007A33] text-[#57E893]'
                              : 'bg-[#071236] text-[#DCE7FF]'
                        }`}
                      >
                        {adaKonflikKunci
                          ? 'Kunci bertentangan'
                          : item.kunci !== null
                            ? tampilkanKunci
                              ? `Kunci: ${String.fromCharCode(65 + item.kunci)}`
                              : 'Kunci: ✓'
                            : 'Tanpa kunci'}
                      </span>

                      {adaMasalah ? (
                        <button
                          type="button"
                          onClick={() => fokusPerbaikiSoal(item)}
                          className="min-h-[36px] cursor-pointer rounded-lg border border-[#FFE875] bg-[#FFD400] px-3 py-1 text-xs font-bold text-[#0B1B4D] hover:bg-[#FFE875]"
                        >
                          Perbaiki
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIdTerbukaDiRingkas(item.id)}
                          className="cursor-pointer rounded-lg border border-[#3C62D4] bg-[#071236] px-2.5 py-1 text-xs font-bold text-[#FFD400] hover:border-[#FFD400]"
                        >
                          Rincian
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => hapusBaris(idx)}
                        aria-label={`Hapus soal ${idx + 1}`}
                        className="flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg bg-[#B80023] px-2.5 text-xs font-bold text-white hover:bg-[#FF1744]"
                      >
                        <Trash2 size={14} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) kartuRefs.current.set(item.id, el);
                      else kartuRefs.current.delete(item.id);
                    }}
                    className={`rounded-2xl border-3 p-4 transition-colors ${
                      baruDipulihkan
                        ? 'border-[#57E893] bg-[#06381D] ring-2 ring-[#57E893]'
                        : disorotPerbaiki
                          ? 'border-[#FFE875] bg-[#1E3B99] ring-2 ring-[#FFD400]'
                          : dipilih
                            ? 'border-[#FFD400] bg-[#173287]'
                            : level === 'merah'
                              ? 'border-[#FF1744] bg-[#450B1C]'
                              : level === 'kuning'
                                ? 'border-[#FF9100] bg-[#3D2000]'
                                : 'border-[#2A4CB8] bg-[#12276B]'
                    }`}
                  >
                    {/* Baris Atas: Checkbox, Nomor, Lencana Koreksi, Sumber Kunci, Alasan, Aksi */}
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={dipilih}
                          onChange={() => togglePilihSoal(item.id)}
                          aria-label={`Pilih soal ${idx + 1}`}
                          className="h-5 w-5 shrink-0 cursor-pointer accent-[#FFD400]"
                        />
                        <span className="font-display rounded-lg bg-[#FFD400] px-2.5 py-0.5 text-sm font-bold text-[#0B1B4D]">
                          Soal #{idx + 1}
                        </span>
                        <span
                          className={`font-display rounded-lg px-2.5 py-0.5 text-xs font-bold ${infoLevel.kelas}`}
                        >
                          {infoLevel.teks}
                        </span>
                        {statusItem?.cekManualMedia && (
                          <span className="font-display rounded-lg border border-[#FFE875] bg-[#7D3D00] px-2.5 py-0.5 text-xs font-bold text-[#FFD400]">
                            Cek manual
                          </span>
                        )}
                        {item.cadangan && (
                          <span className="font-display rounded-lg bg-[#7C4DFF] px-2.5 py-0.5 text-xs font-bold text-white">
                            Soal Cadangan (Penentu)
                          </span>
                        )}
                        {labelSumberKunci && !adaKonflikKunci && item.kunci !== null && (
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                              kunciOtomatisAktif
                                ? 'border border-[#57E893] bg-[#005724] text-[#57E893]'
                                : 'bg-[#071236] text-[#DCE7FF]'
                            }`}
                          >
                            {kunciOtomatisAktif ? '✓ ' : ''}Kunci: {labelSumberKunci}
                            {item.kunciDiterima ? ' (Diterima)' : ''}
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#DCE7FF]">
                          Sumber: {item.sumber.toUpperCase()}
                        </span>
                        {adaMasalah &&
                          alasanKartu.map((alasan, mIdx) => (
                            <span
                              key={mIdx}
                              className="rounded-lg bg-[#071236] px-2.5 py-0.5 text-xs font-bold text-[#FFD400]"
                            >
                              {alasan}
                            </span>
                          ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {adaMasalah && (
                          <button
                            type="button"
                            onClick={() => fokusPerbaikiSoal(item)}
                            className="flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border-2 border-[#FFE875] bg-[#FFD400] px-3 text-xs font-bold text-[#0B1B4D] hover:bg-[#FFE875]"
                          >
                            <Wrench size={14} />
                            <span>Perbaiki</span>
                          </button>
                        )}
                        {sedangExpandedRingkas && (
                          <button
                            type="button"
                            onClick={() => setIdTerbukaDiRingkas(null)}
                            className="cursor-pointer rounded-xl border border-[#3C62D4] bg-[#071236] px-3 py-2 text-xs font-bold text-[#FFD400]"
                          >
                            Ringkas
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => geserBaris(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Naikkan soal ${idx + 1}`}
                          className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-xl bg-[#071236] text-white disabled:opacity-40"
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => geserBaris(idx, 1)}
                          disabled={idx === daftar.length - 1}
                          aria-label={`Turunkan soal ${idx + 1}`}
                          className="flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-xl bg-[#071236] text-white disabled:opacity-40"
                        >
                          <ArrowDown size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => hapusBaris(idx)}
                          aria-label={`Hapus soal ${idx + 1}`}
                          className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#B80023] px-3 text-xs font-bold text-white hover:bg-[#FF1744]"
                        >
                          <Trash2 size={16} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>

                    {/* Kotak Pemilih Konflik Kunci (jika dua sumber berbeda pendapat) */}
                    {adaKonflikKunci && item.kunciBertentangan && (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[#FF1744] bg-[#2D0814] px-3.5 py-2.5">
                        <span className="text-xs font-bold text-[#FFD400]">
                          Kunci bertentangan antar sumber — pilih salah satu yang benar:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.kunciBertentangan.map((kand, kIdx) => (
                            <button
                              key={`${kand.sumber}-${kIdx}`}
                              type="button"
                              onClick={() =>
                                updateBaris(idx, (lama) => ({
                                  ...lama,
                                  kunci: kand.kunci,
                                  sumberKunci: kand.sumber,
                                  detailSumberKunci: LABEL_SUMBER_KUNCI[kand.sumber],
                                  kunciBertentangan: undefined,
                                  kunciTerdeteksiOtomatis: kand.sumber !== 'manual',
                                  kunciDiterima: true,
                                }))
                              }
                              className="font-display min-h-[38px] cursor-pointer rounded-xl border-2 border-[#FFE875] bg-[#FFD400] px-3 text-xs font-bold text-[#0B1B4D] hover:bg-[#FFE875]"
                            >
                              Pakai {kand.keterangan}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Edit Pertanyaan & Kode */}
                    <div className="mb-3 grid grid-cols-12 gap-3">
                      <div className={item.kode !== undefined ? 'col-span-7' : 'col-span-12'}>
                        <input
                          ref={(el) => {
                            if (el) inputPertanyaanRefs.current.set(item.id, el);
                            else inputPertanyaanRefs.current.delete(item.id);
                          }}
                          type="text"
                          value={item.pertanyaan}
                          onChange={(e) =>
                            updateBaris(idx, (lama) => ({
                              ...lama,
                              pertanyaan: e.target.value,
                            }))
                          }
                          placeholder="Tulis teks pertanyaan..."
                          className="min-h-[44px] w-full rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3.5 text-base font-bold text-white focus:border-[#FFD400] focus:outline-none"
                        />
                      </div>
                      {item.kode !== undefined && (
                        <div className="col-span-5">
                          <textarea
                            rows={2}
                            value={item.kode}
                            onChange={(e) =>
                              updateBaris(idx, (lama) => ({ ...lama, kode: e.target.value }))
                            }
                            placeholder="Potongan kode (monospace)..."
                            className="w-full rounded-xl border-2 border-[#3C62D4] bg-[#040B24] px-3 py-1.5 font-mono text-xs text-[#57E893] focus:border-[#FFD400] focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Edit Pilihan A-D & Kunci */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {item.pilihan.map((opsi, opsiIdx) => {
                        const huruf = String.fromCharCode(65 + opsiIdx);
                        const adalahKunci = !adaKonflikKunci && item.kunci === opsiIdx;
                        const sorotKunci = tampilkanKunci && adalahKunci;

                        return (
                          <div key={opsiIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateBaris(idx, (lama) => ({
                                  ...lama,
                                  kunci: opsiIdx,
                                  sumberKunci: 'manual',
                                  detailSumberKunci: LABEL_SUMBER_KUNCI.manual,
                                  kunciBertentangan: undefined,
                                  kunciTerdeteksiOtomatis: false,
                                  kunciDiterima: true,
                                }))
                              }
                              title={
                                tampilkanKunci
                                  ? 'Klik untuk menjadikan kunci'
                                  : 'Aktifkan Kunci: ON untuk melihat, atau klik untuk memilih kunci'
                              }
                              className={`font-display flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 text-base font-bold ${
                                sorotKunci
                                  ? 'border-[#57E893] bg-[#00C853] text-white'
                                  : 'border-[#3C62D4] bg-[#071236] text-[#FFD400]'
                              }`}
                            >
                              {sorotKunci ? <Check size={20} strokeWidth={3} /> : huruf}
                            </button>

                            <input
                              type="text"
                              value={opsi}
                              onChange={(e) =>
                                updateBaris(idx, (lama) => {
                                  const pilihanBaru = [...lama.pilihan];
                                  pilihanBaru[opsiIdx] = e.target.value;
                                  return { ...lama, pilihan: pilihanBaru };
                                })
                              }
                              placeholder={`Pilihan ${huruf}`}
                              className="min-h-[44px] flex-1 rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-semibold text-white focus:border-[#FFD400] focus:outline-none"
                            />

                            {item.pilihan.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateBaris(idx, (lama) => {
                                    const pilihanBaru = lama.pilihan.filter(
                                      (_, pIdx) => pIdx !== opsiIdx
                                    );
                                    let kunciBaru = lama.kunci;
                                    if (kunciBaru === opsiIdx) {
                                      kunciBaru = null;
                                    } else if (kunciBaru !== null && kunciBaru > opsiIdx) {
                                      kunciBaru -= 1;
                                    }
                                    return {
                                      ...lama,
                                      pilihan: pilihanBaru,
                                      kunci: kunciBaru,
                                    };
                                  })
                                }
                                aria-label={`Hapus pilihan ${huruf}`}
                                className="flex min-h-[44px] min-w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#071236] text-xs font-bold text-[#FF6B86] hover:bg-[#7A0018]"
                              >
                                −
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {item.pilihan.length < 4 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateBaris(idx, (lama) => ({
                              ...lama,
                              pilihan: [...lama.pilihan, ''],
                            }))
                          }
                          className="font-display flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#669BFF] bg-[#071236] text-sm font-bold text-[#DCE7FF] hover:border-[#FFD400] hover:text-[#FFD400]"
                        >
                          <Plus size={16} />
                          <span>
                            Tambah Pilihan {String.fromCharCode(65 + item.pilihan.length)}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      {!tampilkanKunci ? (
                        <div className="text-xs font-semibold text-[#DCE7FF]">
                          Kunci jawaban disamarkan (
                          {item.kunci !== null
                            ? 'Sudah terisi — klik Kunci: ON untuk memeriksa'
                            : 'Belum dipilih!'}
                          ).
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-[#DCE7FF]">
                          Soal cadangan hanya dipakai saat skor imbang (disarankan 3–5 soal).
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          updateBaris(idx, (lama) => ({
                            ...lama,
                            cadangan: !lama.cadangan,
                          }))
                        }
                        className={`font-display cursor-pointer rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
                          item.cadangan
                            ? 'border-[#FFE875] bg-[#7C4DFF] text-white'
                            : 'border-[#3C62D4] bg-[#071236] text-[#DCE7FF] hover:border-[#FFD400]'
                        }`}
                      >
                        {item.cadangan
                          ? 'Soal Cadangan (Penentu) ✓'
                          : 'Tandai Soal Cadangan (Penentu)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Aksi Wizard Langkah 3 */}
      {modeWizard && (
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-3 shadow-[0_6px_0_#071236]">
          <div className="flex items-center gap-3">
            {onKembali && (
              <Button3D variant="navy" size="sm" onClick={onKembali}>
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </Button3D>
            )}
            {jumlahDilewati > 0 ? (
              <span className="rounded-xl border-2 border-[#FFD400] bg-[#3D2800] px-3 py-1.5 text-sm font-bold text-[#FFD400]">
                {jumlahDilewati} soal tidak ikut (masih bermasalah / tanpa kunci)
              </span>
            ) : (
              <span className="text-sm font-bold text-[#DCE7FF]">
                {jumlahValidUntukSimpan} soal siap disimpan ke game.
              </span>
            )}
          </div>

          <Button3D
            variant="hijau"
            size="lg"
            disabled={jumlahValidUntukSimpan === 0}
            onClick={() => onLanjutPengaturan(daftar)}
          >
            <Check size={22} strokeWidth={3} />
            <span>SIMPAN SOAL & LANJUT</span>
            <ArrowRight size={20} />
          </Button3D>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Massal (Custom, tanpa window.confirm) */}
      <Modal
        terbuka={konfirmasiHapusJenis !== null}
        judul="Konfirmasi Hapus Soal Pratinjau"
        lebarMaks="md"
        onTutup={() => setKonfirmasiHapusJenis(null)}
        footer={
          <>
            <Button3D
              variant="navy"
              size="md"
              onClick={() => setKonfirmasiHapusJenis(null)}
            >
              <span>Batal</span>
            </Button3D>
            <Button3D variant="merah" size="md" onClick={jalankanHapusMassal}>
              <Trash2 size={18} />
              <span>
                Hapus{' '}
                {konfirmasiHapusJenis
                  ? `${hitungTargetHapusMassal(konfirmasiHapusJenis)} soal`
                  : ''}
              </span>
            </Button3D>
          </>
        }
      >
        {konfirmasiHapusJenis && (
          <div className="space-y-3 text-base">
            <p className="font-bold text-white">
              Anda akan menghapus{' '}
              <span className="text-[#FFD400]">
                {hitungTargetHapusMassal(konfirmasiHapusJenis)} soal
              </span>{' '}
              {konfirmasiHapusJenis === 'semua'
                ? 'dari seluruh daftar pratinjau.'
                : konfirmasiHapusJenis === 'bermasalah'
                  ? 'yang masih berstatus bermasalah atau perlu dicek.'
                  : 'yang sedang Anda pilih.'}
            </p>
            <p className="rounded-xl border-2 border-[#3C62D4] bg-[#071236] p-3 text-sm font-semibold text-[#DCE7FF]">
              Aman: Aksi ini hanya menghapus soal di daftar Pratinjau/hasil impor, tidak menghapus soal yang sudah ada di bank game ({jumlahSoalDiBankGame} soal). Anda juga masih dapat membatalkan lewat tombol <strong>URUNGKAN</strong> selama 10 detik.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Isi Kunci Cepat */}
      <Modal
        terbuka={modalKunciTerbuka}
        judul="Isi Kunci Jawaban Cepat"
        lebarMaks="xl"
        onTutup={() => setModalKunciTerbuka(false)}
      >
        <div className="flex flex-col gap-4">
          {/* Sub-header Modal: Penghitung & Sub-tab */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button3D
                variant={tabIsiKunci === 'ketuk' ? 'kuning' : 'navy'}
                size="sm"
                onClick={() => setTabIsiKunci('ketuk')}
              >
                <span>1. Ketuk Cepat</span>
              </Button3D>
              <Button3D
                variant={tabIsiKunci === 'tempel' ? 'kuning' : 'navy'}
                size="sm"
                onClick={() => setTabIsiKunci('tempel')}
              >
                <span>2. Tempel Kunci</span>
              </Button3D>
              <Button3D
                variant={tabIsiKunci === 'unggah' ? 'kuning' : 'navy'}
                size="sm"
                onClick={() => setTabIsiKunci('unggah')}
              >
                <span>3. Unggah Dokumen Kunci</span>
              </Button3D>
            </div>

            <div className="flex items-center gap-3">
              {tabIsiKunci === 'ketuk' && (
                <button
                  type="button"
                  onClick={() => setHanyaBelumTerisi((v) => !v)}
                  className={`font-display flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-xs font-bold ${
                    hanyaBelumTerisi
                      ? 'border-[#FFE875] bg-[#FF9100] text-[#0B1B4D]'
                      : 'border-[#3C62D4] bg-[#12276B] text-[#DCE7FF]'
                  }`}
                >
                  {hanyaBelumTerisi ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>Tampilkan yang belum terisi</span>
                </button>
              )}

              <span className="font-display tabular-angka rounded-xl bg-[#00C853] px-3.5 py-1.5 text-sm font-bold text-white">
                {jumlahKunciTerisi}/{daftar.length} terisi
              </span>
            </div>
          </div>

          {/* SUB-TAB 1: KETUK CEPAT */}
          {tabIsiKunci === 'ketuk' && (
            <div className="flex flex-col gap-3">
              {soalAktifSorot && (
                <div className="rounded-2xl border-2 border-[#FFD400] bg-[#071236] p-3">
                  <div className="mb-1 text-xs font-bold text-[#FFD400]">
                    Soal Aktif #{indeksSorotKunci + 1} (Tekan tombol A–D di layar atau keyboard A–D / Panah Atas-Bawah)
                  </div>
                  <div className="text-sm font-bold text-white">
                    {soalAktifSorot.pertanyaan}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#DCE7FF]">
                    {soalAktifSorot.pilihan.map((op, opIdx) => (
                      <span
                        key={opIdx}
                        className={
                          soalAktifSorot.kunci === opIdx
                            ? 'font-bold text-[#57E893]'
                            : ''
                        }
                      >
                        <strong>{String.fromCharCode(65 + opIdx)}.</strong> {op}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {daftarKetukCepat.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-[#00C853] bg-[#071236] p-6 text-center font-bold text-[#57E893]">
                  Semua {daftar.length} soal sudah memiliki kunci jawaban!
                </div>
              ) : (
                <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
                  {daftarKetukCepat.map(({ item, indeksAsli }) => {
                    const tersorot = indeksSorotKunci === indeksAsli;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setIndeksSorotKunci(indeksAsli)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 transition ${
                          tersorot
                            ? 'border-[#FFD400] bg-[#173287]'
                            : 'border-[#2A4CB8] bg-[#071236] hover:border-[#669BFF]'
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className="font-display w-11 shrink-0 rounded-lg bg-[#FFD400] px-2 py-1 text-center text-xs font-bold text-[#0B1B4D]">
                            #{indeksAsli + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                            {potongTeks70(item.pertanyaan || '(Tanpa teks)')}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {item.pilihan.map((_, opIdx) => {
                            const huruf = String.fromCharCode(65 + opIdx);
                            const terpilihKunci = item.kunci === opIdx;
                            return (
                              <button
                                key={opIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIndeksSorotKunci(indeksAsli);
                                  setKunciSatuSoal(indeksAsli, opIdx);
                                }}
                                className={`font-display flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl border-2 text-base font-bold transition ${
                                  terpilihKunci
                                    ? 'border-[#57E893] bg-[#00C853] text-white shadow-[0_3px_0_#007A33]'
                                    : 'border-[#3C62D4] bg-[#12276B] text-[#FFD400] hover:border-[#FFD400]'
                                }`}
                              >
                                {huruf}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: TEMPEL KUNCI */}
          {tabIsiKunci === 'tempel' && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 flex flex-col gap-2">
                <label className="text-sm font-bold text-[#FFD400]">
                  Tempel Daftar Kunci Jawaban
                </label>
                <p className="text-xs text-[#DCE7FF]">
                  Mendukung format: <code>1. B 2. C 3. A</code>, <code>1-B, 2-C</code>,{' '}
                  <code>1:B</code>, <code>1 B</code>, atau deretan huruf{' '}
                  <code>BCADBDA...</code>
                </p>
                <textarea
                  rows={9}
                  value={teksTempelKunci}
                  onChange={(e) => setTeksTempelKunci(e.target.value)}
                  placeholder="Contoh: 1. B 2. C 3. A 4. D ... atau BCAD..."
                  className="w-full rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5 font-mono text-sm text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                />
              </div>

              <div className="col-span-6 flex flex-col justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-base font-bold text-[#FFD400]">
                      Pratinjau Pemetaan Kunci
                    </span>
                    <span className="text-xs font-bold text-[#DCE7FF]">
                      Terbaca {hasilTempelKunciLive.daftarPasangan.length} kunci
                    </span>
                  </div>

                  {teksTempelKunci.trim() &&
                    hasilTempelKunciLive.peringatan.length > 0 && (
                      <div className="mb-3 rounded-xl border-2 border-[#FF9100] bg-[#7D3D00] p-2.5 text-xs font-bold text-white">
                        {hasilTempelKunciLive.peringatan.map((p, i) => (
                          <div key={i}>{p}</div>
                        ))}
                      </div>
                    )}

                  {hasilTempelKunciLive.daftarPasangan.length === 0 ? (
                    <p className="text-sm text-[#DCE7FF]">
                      Tempel teks kunci di sebelah kiri untuk melihat hasil pencocokan nomor soal dan huruf kunci.
                    </p>
                  ) : (
                    <div className="flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {hasilTempelKunciLive.daftarPasangan.map((p) => (
                        <span
                          key={p.nomor}
                          className="font-display rounded-lg border border-[#57E893] bg-[#007A33] px-2.5 py-1 text-xs font-bold text-white"
                        >
                          #{p.nomor} → {p.huruf}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end border-t border-[#1C388A] pt-3">
                  <Button3D
                    variant="hijau"
                    size="md"
                    disabled={hasilTempelKunciLive.daftarPasangan.length === 0}
                    onClick={() => terapkanKunciMassal(hasilTempelKunciLive)}
                  >
                    <Check size={18} />
                    <span>TERAPKAN</span>
                  </Button3D>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: UNGGAH DOKUMEN KUNCI */}
          {tabIsiKunci === 'unggah' && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 flex flex-col items-center justify-center rounded-2xl border-3 border-dashed border-[#669BFF] bg-[#071236] p-6 text-center">
                <input
                  ref={fileKunciInputRef}
                  type="file"
                  accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handlePilihFileKunci}
                  className="hidden"
                />
                <FileUp size={40} className="mb-2 text-[#FFD400]" />
                <p className="mb-2 font-display text-lg font-bold text-white">
                  {sedangBacaFileKunci
                    ? `Membaca "${namaFileKunci}"...`
                    : namaFileKunci
                      ? `Berkas kunci: ${namaFileKunci}`
                      : 'Unggah Dokumen Khusus Kunci Jawaban'}
                </p>
                <p className="mb-4 text-xs text-[#DCE7FF]">
                  Mendukung .docx, .pdf, .xlsx/.xls/.csv, dan .txt berisi daftar kunci jawaban.
                </p>
                <Button3D
                  variant="biru"
                  size="md"
                  disabled={sedangBacaFileKunci}
                  onClick={() => fileKunciInputRef.current?.click()}
                >
                  <FileUp size={18} />
                  <span>{sedangBacaFileKunci ? 'Memproses...' : 'Pilih Berkas Kunci'}</span>
                </Button3D>
              </div>

              <div className="col-span-6 flex flex-col justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-base font-bold text-[#FFD400]">
                      Hasil Pembacaan Berkas Kunci
                    </span>
                    <span className="text-xs font-bold text-[#DCE7FF]">
                      Terbaca {hasilUnggahKunci?.daftarPasangan.length ?? 0} kunci
                    </span>
                  </div>

                  {hasilUnggahKunci && hasilUnggahKunci.peringatan.length > 0 && (
                    <div className="mb-3 rounded-xl border-2 border-[#FF9100] bg-[#7D3D00] p-2.5 text-xs font-bold text-white">
                      {hasilUnggahKunci.peringatan.map((p, i) => (
                        <div key={i}>{p}</div>
                      ))}
                    </div>
                  )}

                  {!hasilUnggahKunci || hasilUnggahKunci.daftarPasangan.length === 0 ? (
                    <p className="text-sm text-[#DCE7FF]">
                      Pilih berkas kunci jawaban di sebelah kiri untuk melihat pratinjau pemetaan sebelum diterapkan.
                    </p>
                  ) : (
                    <div className="flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {hasilUnggahKunci.daftarPasangan.map((p) => (
                        <span
                          key={p.nomor}
                          className="font-display rounded-lg border border-[#57E893] bg-[#007A33] px-2.5 py-1 text-xs font-bold text-white"
                        >
                          #{p.nomor} → {p.huruf}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end border-t border-[#1C388A] pt-3">
                  <Button3D
                    variant="hijau"
                    size="md"
                    disabled={
                      !hasilUnggahKunci || hasilUnggahKunci.daftarPasangan.length === 0
                    }
                    onClick={() =>
                      hasilUnggahKunci && terapkanKunciMassal(hasilUnggahKunci)
                    }
                  >
                    <Check size={18} />
                    <span>TERAPKAN</span>
                  </Button3D>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Tempat Sampah Soal */}
      <TempatSampahModal
        terbuka={modalSampahTerbuka}
        daftarSampah={daftarSampah}
        onTutup={() => setModalSampahTerbuka(false)}
        onKembalikanSatu={handleKembalikanSatuDariSampah}
        onKembalikanSemua={handleKembalikanSemuaDariSampah}
        onKosongkanSemua={handleKosongkanSampah}
      />

      {/* Modal Pratinjau Rapikan Otomatis */}
      <RapikanOtomatisModal
        terbuka={modalRapikanTerbuka}
        daftarPratinjau={daftarPratinjauRapikan}
        onTutup={() => setModalRapikanTerbuka(false)}
        onTerapkan={handleTerapkanRapikanOtomatis}
      />

      {/* Modal Mode Koreksi Cepat (Satu per Satu) */}
      <KoreksiCepatModal
        terbuka={modalKoreksiCepatTerbuka}
        daftar={daftar}
        statusKoreksi={analisisKoreksi.perSoal}
        tempatSampahCount={daftarSampah.length}
        jumlahValidUntukSimpan={jumlahValidUntukSimpan}
        onTutup={() => setModalKoreksiCepatTerbuka(false)}
        onUpdateSoal={(soalId, pengubah) => {
          const idx = daftar.findIndex((d) => d.id === soalId);
          if (idx >= 0) updateBaris(idx, pengubah);
        }}
        onHapusSoal={(soalId) => {
          const idx = daftar.findIndex((d) => d.id === soalId);
          if (idx >= 0) hapusBaris(idx);
        }}
        onSimpanSoalDanLanjut={() => onLanjutPengaturan(daftar)}
      />
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  Columns2,
  Copy,
  Download,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Info,
  Keyboard,
  Play,
  Plus,
  PlusSquare,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../app/store';
import { Button3D } from '../components/Button3D';
import {
  bentukPengaturanFinalDariForm,
  normalisasiPengaturanAwal,
  PanelPengaturanGame,
} from '../components/PanelPengaturanGame';
import { PanelKeypadPin } from '../components/PinGuruModal';
import {
  DiagnostikImporInfo,
  PratinjauSoalPanel,
} from '../components/PratinjauSoalPanel';
import { Pengaturan, RuteHash, TingkatSoal } from '../data/types';
import {
  ambilPeringatanAwalDuel,
  buatPasanganDuelDenganTanda,
  hitungPerkiraanKebutuhanSoal,
  parseDaftarNama,
  PasanganDuelTerundi,
} from '../engine/deal';
import { buatPengaturanDefault } from '../engine/gameEngine';
import { hapusSesiMatchSessionStorage } from '../engine/match';
import {
  CONTOH_FORMAT_TEKS,
  DraftSoal,
  konversiDraftValidKeSoal,
  ModeKolomPdf,
  parseFileDokumen,
  parseTeksSoal,
  soalKeDraft,
  unduhContohFormatTeks,
  unduhTemplateExcel,
  validasiDaftarDraftSoal,
} from '../parsers';
import { ambilVolumeAudio, tandaiInteraksiAudio } from '../utils/audio';
import { buatId } from '../utils/id';
import {
  apakahPeringatanGagalBacaLuas,
  bacaDrafWizardGame,
  bacaSampahGame,
  bolehBukaLangkahWizard,
  formatWaktuSingkatHHMM,
  InfoImporWizard,
  ItemSampahSoal,
  LangkahWizard,
  simpanDrafWizardGame,
} from '../utils/wizardDraft';

interface BuatGameScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

type TabIsiSoal = 'manual' | 'tempel' | 'unggah';

interface FormManualState {
  editId: string | null;
  pertanyaan: string;
  kode: string;
  tampilkanKode: boolean;
  pilihan: string[];
  kunci: number;
  penjelasan: string;
  tingkat: '' | TingkatSoal;
  topik: string;
  bonus: boolean;
  cadangan: boolean;
}

const DAFTAR_LANGKAH: { nomor: LangkahWizard; judul: string }[] = [
  { nomor: 1, judul: 'Info Game' },
  { nomor: 2, judul: 'Isi Soal' },
  { nomor: 3, judul: 'Periksa Soal' },
  { nomor: 4, judul: 'Pengaturan' },
  { nomor: 5, judul: 'Selesai' },
];

function buatFormManualKosong(): FormManualState {
  return {
    editId: null,
    pertanyaan: '',
    kode: '',
    tampilkanKode: false,
    pilihan: ['', '', '', ''],
    kunci: 0,
    penjelasan: '',
    tingkat: '',
    topik: '',
    bonus: false,
    cadangan: false,
  };
}

export const BuatGameScreen: React.FC<BuatGameScreenProps> = ({ onNavigasi }) => {
  const {
    daftarGame,
    pinEditTerbukaId,
    modeMasukWizard,
    bukaWizardBuatGame,
    bukaIzinEditDenganPin,
    tambahGameBaru,
    simpanDrafGameOtomatis,
    tandaiGameTersimpan,
    mulaiSesiPembagian,
    mulaiSesiTurnamenBaru,
    mulaiSesiDuelBaru,
    resetSesiMode,
    tampilkanToast,
  } = useAppStore();

  // State Wizard Utama
  const [gameDraftId, setGameDraftId] = useState<string | null>(null);
  const [langkahAktif, setLangkahAktif] = useState<LangkahWizard>(1);
  const [langkahSelesaiMaks, setLangkahSelesaiMaks] = useState<number>(0);
  const [waktuSimpanTerakhir, setWaktuSimpanTerakhir] = useState<number | null>(null);

  // Langkah 1: Info Game
  const [judul, setJudul] = useState('');
  const [mapel, setMapel] = useState('');
  const [namaSekolah, setNamaSekolah] = useState('');
  const [galatJudul, setGalatJudul] = useState('');

  // Langkah 2: Isi Soal
  const [tabIsiSoal, setTabIsiSoal] = useState<TabIsiSoal>('manual');
  const [formManual, setFormManual] = useState<FormManualState>(() => buatFormManualKosong());
  const inputPertanyaanRef = useRef<HTMLTextAreaElement | null>(null);
  const [teksTempel, setTeksTempel] = useState('');
  const [teksTempelSudahDimasukkan, setTeksTempelSudahDimasukkan] = useState('');

  const [sedangMembacaFile, setSedangMembacaFile] = useState(false);
  const [namaFileTerakhir, setNamaFileTerakhir] = useState('');
  const [modeKolomPdf, setModeKolomPdf] = useState<ModeKolomPdf>('otomatis');
  const [sedangMemprosesUlangPdf, setSedangMemprosesUlangPdf] = useState(false);
  const [infoKolomDokumen, setInfoKolomDokumen] = useState('');
  const [modeGabungUnggah, setModeGabungUnggah] = useState<'ganti' | 'tambah'>('ganti');
  const [infoImporTerakhir, setInfoImporTerakhir] = useState<InfoImporWizard | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileDokumenTerakhirRef = useRef<File | null>(null);

  // Daftar kerja soal (Langkah 2 & Langkah 3)
  const [draftPratinjau, setDraftPratinjau] = useState<DraftSoal[]>([]);
  const [peringatanPratinjau, setPeringatanPratinjau] = useState<string[]>([]);
  const [diagnostikImpor, setDiagnostikImpor] = useState<DiagnostikImporInfo | null>(null);
  const [tempatSampah, setTempatSampah] = useState<ItemSampahSoal[]>([]);

  // Langkah 4: Pengaturan
  const [formPengaturan, setFormPengaturan] = useState<Pengaturan>(() =>
    normalisasiPengaturanAwal(buatPengaturanDefault())
  );
  const [teksAnggota, setTeksAnggota] = useState<string[]>(['', '', '', '']);
  const [teksDaftarDuel, setTeksDaftarDuel] = useState<string>('');
  const [pasanganDuel, setPasanganDuel] = useState<PasanganDuelTerundi[]>([]);
  const [volumeSuara, setVolumeSuara] = useState<number>(() => Math.round(ambilVolumeAudio() * 100));

  const sedangInisialisasiRef = useRef(true);

  const gameTarget = useMemo(
    () => (gameDraftId ? daftarGame.find((g) => g.id === gameDraftId) ?? null : null),
    [daftarGame, gameDraftId]
  );

  const pinAktif = (gameTarget?.pengaturan.pinGuru ?? '').trim();
  const terkunciPin = Boolean(gameTarget && pinAktif.length > 0 && pinEditTerbukaId !== gameTarget.id);

  // Inisialisasi saat layar dibuka atau modeMasukWizard berubah
  useEffect(() => {
    sedangInisialisasiRef.current = true;
    const mode = modeMasukWizard.mode;
    const targetId = modeMasukWizard.gameId;
    const targetGame = targetId ? daftarGame.find((g) => g.id === targetId) ?? null : null;

    if ((mode === 'edit' || mode === 'lanjut_draf') && targetGame) {
      setGameDraftId(targetGame.id);
      setJudul(targetGame.judul);
      setMapel(targetGame.mapel);
      setNamaSekolah(targetGame.namaSekolah);
      setGalatJudul('');

      const normPengaturan = normalisasiPengaturanAwal(targetGame.pengaturan);
      setFormPengaturan(normPengaturan);
      setTeksAnggota([0, 1, 2, 3].map((i) => (normPengaturan.anggota[i] ?? []).join('\n')));
      setTeksDaftarDuel(
        [...(normPengaturan.anggota[0] ?? []), ...(normPengaturan.anggota[1] ?? [])].join('\n')
      );
      setPasanganDuel([]);
      setFormManual(buatFormManualKosong());

      const drafTersimpan = bacaDrafWizardGame(targetGame.id);
      const sampahTersimpan = bacaSampahGame(targetGame.id);
      if (mode === 'lanjut_draf' && drafTersimpan) {
        setLangkahAktif(drafTersimpan.langkahAktif);
        setLangkahSelesaiMaks(drafTersimpan.langkahSelesaiMaks);
        setDraftPratinjau(
          drafTersimpan.draftPratinjau.length > 0
            ? drafTersimpan.draftPratinjau
            : targetGame.soal.map((s) => soalKeDraft(s, 'manual'))
        );
        setPeringatanPratinjau(drafTersimpan.peringatanPratinjau);
        setDiagnostikImpor(drafTersimpan.diagnostikImpor);
        setTeksTempel(drafTersimpan.teksTempel);
        setTeksTempelSudahDimasukkan('');
        setInfoImporTerakhir(drafTersimpan.infoImporTerakhir);
        setNamaFileTerakhir(drafTersimpan.diagnostikImpor?.namaFile ?? '');
        setTempatSampah(
          drafTersimpan.tempatSampah && drafTersimpan.tempatSampah.length > 0
            ? drafTersimpan.tempatSampah
            : sampahTersimpan
        );
        setWaktuSimpanTerakhir(drafTersimpan.tersimpanPada);
      } else {
        // Edit game tersimpan: buka langsung dari Langkah 2
        const dariBank = targetGame.soal.map((s) => soalKeDraft(s, 'manual'));
        setLangkahAktif(2);
        setLangkahSelesaiMaks(targetGame.soal.length > 0 ? 2 : 1);
        setDraftPratinjau(dariBank);
        setPeringatanPratinjau([]);
        setDiagnostikImpor(null);
        setTeksTempel('');
        setTeksTempelSudahDimasukkan('');
        setInfoImporTerakhir(null);
        setNamaFileTerakhir('');
        setTempatSampah(sampahTersimpan);
        setWaktuSimpanTerakhir(targetGame.diubahPada ?? Date.now());
      }
    } else {
      // Buat game baru: mulai bersih dari Langkah 1
      setGameDraftId(null);
      setLangkahAktif(1);
      setLangkahSelesaiMaks(0);
      setJudul('');
      setMapel('');
      setNamaSekolah('');
      setGalatJudul('');
      setTabIsiSoal('manual');
      setFormManual(buatFormManualKosong());
      setTeksTempel('');
      setTeksTempelSudahDimasukkan('');
      setDraftPratinjau([]);
      setPeringatanPratinjau([]);
      setDiagnostikImpor(null);
      setInfoImporTerakhir(null);
      setNamaFileTerakhir('');
      setInfoKolomDokumen('');
      setTempatSampah([]);
      const def = normalisasiPengaturanAwal(buatPengaturanDefault());
      setFormPengaturan(def);
      setTeksAnggota(['', '', '', '']);
      setTeksDaftarDuel('');
      setPasanganDuel([]);
      setWaktuSimpanTerakhir(null);
    }

    const timer = window.setTimeout(() => {
      sedangInisialisasiRef.current = false;
    }, 30);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeMasukWizard.mode, modeMasukWizard.gameId, modeMasukWizard.nonce]);

  const hasilTempelLive = useMemo(() => {
    if (!teksTempel.trim()) return null;
    return parseTeksSoal(teksTempel, 'teks');
  }, [teksTempel]);

  const soalValidDiKerja = useMemo(
    () => konversiDraftValidKeSoal(draftPratinjau).soalValid,
    [draftPratinjau]
  );

  const soalTervalidasiKerja = useMemo(
    () => validasiDaftarDraftSoal(draftPratinjau, peringatanPratinjau).daftar,
    [draftPratinjau, peringatanPratinjau]
  );

  const jumlahSoalTerbaca = useMemo(() => {
    if (
      tabIsiSoal === 'tempel' &&
      hasilTempelLive &&
      hasilTempelLive.totalSoal > 0 &&
      teksTempel.trim() !== teksTempelSudahDimasukkan
    ) {
      return draftPratinjau.length + hasilTempelLive.totalSoal;
    }
    return draftPratinjau.length;
  }, [draftPratinjau.length, hasilTempelLive, tabIsiSoal, teksTempel, teksTempelSudahDimasukkan]);

  const { jumlahSoalUtamaBank, jumlahSoalCadanganBank } = useMemo(() => {
    const sumber = gameTarget?.soal ?? soalValidDiKerja;
    let utama = 0;
    let cadangan = 0;
    for (const s of sumber) {
      if (s.cadangan) cadangan += 1;
      else utama += 1;
    }
    return { jumlahSoalUtamaBank: utama, jumlahSoalCadanganBank: cadangan };
  }, [gameTarget?.soal, soalValidDiKerja]);

  const pengaturanLive = useMemo(
    () => bentukPengaturanFinalDariForm(formPengaturan, teksAnggota, teksDaftarDuel),
    [formPengaturan, teksAnggota, teksDaftarDuel]
  );

  const perkiraanSoal = useMemo(
    () => hitungPerkiraanKebutuhanSoal(pengaturanLive, jumlahSoalUtamaBank),
    [pengaturanLive, jumlahSoalUtamaBank]
  );

  const peringatanAwalPengaturan = useMemo(
    () =>
      ambilPeringatanAwalDuel({
        id: gameDraftId ?? 'sementara',
        judul: judul.trim() || 'Game Baru',
        mapel: mapel.trim() || 'Umum',
        namaSekolah: namaSekolah.trim(),
        soal: gameTarget?.soal ?? soalValidDiKerja,
        pengaturan: pengaturanLive,
        dibuatPada: gameTarget?.dibuatPada ?? 0,
        diubahPada: gameTarget?.diubahPada ?? 0,
      }),
    [gameDraftId, gameTarget?.dibuatPada, gameTarget?.diubahPada, gameTarget?.soal, judul, mapel, namaSekolah, pengaturanLive, soalValidDiKerja]
  );

  // Simpan otomatis state wizard ke localStorage (debounced ringan agar responsif namun tidak boros)
  useEffect(() => {
    if (sedangInisialisasiRef.current || !gameDraftId) return;

    const timer = window.setTimeout(() => {
      const sekarang = Date.now();
      simpanDrafWizardGame({
        gameId: gameDraftId,
        langkahAktif,
        langkahSelesaiMaks,
        draftPratinjau,
        peringatanPratinjau,
        diagnostikImpor,
        teksTempel,
        infoImporTerakhir,
        tempatSampah,
        tersimpanPada: sekarang,
      });

      const pengaturanFinal = bentukPengaturanFinalDariForm(
        formPengaturan,
        teksAnggota,
        teksDaftarDuel
      );
      simpanDrafGameOtomatis(gameDraftId, {
        ...(judul.trim() ? { judul: judul.trim() } : {}),
        mapel: mapel.trim() || 'Umum',
        namaSekolah: namaSekolah.trim(),
        pengaturan: pengaturanFinal,
      });
      setWaktuSimpanTerakhir(sekarang);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [
    diagnostikImpor,
    draftPratinjau,
    formPengaturan,
    gameDraftId,
    infoImporTerakhir,
    judul,
    langkahAktif,
    langkahSelesaiMaks,
    mapel,
    namaSekolah,
    peringatanPratinjau,
    simpanDrafGameOtomatis,
    teksAnggota,
    teksDaftarDuel,
    teksTempel,
    tempatSampah,
  ]);

  const catatDrafSegera = (
    idTarget: string,
    langkahTujuan: LangkahWizard,
    selesaiMaksBaru: number,
    daftarBaru: DraftSoal[] = draftPratinjau
  ) => {
    const sekarang = Date.now();
    simpanDrafWizardGame({
      gameId: idTarget,
      langkahAktif: langkahTujuan,
      langkahSelesaiMaks: selesaiMaksBaru,
      draftPratinjau: daftarBaru,
      peringatanPratinjau,
      diagnostikImpor,
      teksTempel,
      infoImporTerakhir,
      tempatSampah,
      tersimpanPada: sekarang,
    });
    setWaktuSimpanTerakhir(sekarang);
  };

  // === LANGKAH 1: + GAME BARU / Simpan Info ===
  const handleSubmitLangkah1 = (e: React.FormEvent) => {
    e.preventDefault();
    const judulBersih = judul.trim();
    if (!judulBersih) {
      setGalatJudul('Judul Game wajib diisi terlebih dahulu.');
      tampilkanToast('Judul Game wajib diisi.', 'peringatan');
      return;
    }
    setGalatJudul('');

    if (!gameDraftId) {
      const baru = tambahGameBaru(
        judulBersih,
        mapel.trim() || 'Umum',
        namaSekolah.trim(),
        true
      );
      setGameDraftId(baru.id);
      setLangkahSelesaiMaks(1);
      setLangkahAktif(2);
      catatDrafSegera(baru.id, 2, 1, []);
      return;
    }

    simpanDrafGameOtomatis(gameDraftId, {
      judul: judulBersih,
      mapel: mapel.trim() || 'Umum',
      namaSekolah: namaSekolah.trim(),
    });
    const maksBaru = Math.max(1, langkahSelesaiMaks);
    setLangkahSelesaiMaks(maksBaru);
    setLangkahAktif(2);
    catatDrafSegera(gameDraftId, 2, maksBaru);
  };

  // === LANGKAH 2: Input Manual, Tempel Teks, Unggah Dokumen ===
  const handleSimpanFormManual = (e: React.FormEvent) => {
    e.preventDefault();
    const pertanyaanBersih = formManual.pertanyaan.trim();
    const pilihanBersih = formManual.pilihan.map((p) => p.trim());

    if (!pertanyaanBersih) {
      tampilkanToast('Pertanyaan tidak boleh kosong.', 'peringatan');
      return;
    }
    if (pilihanBersih.some((p) => !p) || pilihanBersih.length < 2) {
      tampilkanToast('Minimal 2 pilihan jawaban dan semua pilihan yang tampil harus diisi.', 'peringatan');
      return;
    }
    if (formManual.kunci < 0 || formManual.kunci >= pilihanBersih.length) {
      tampilkanToast('Pilih satu kunci jawaban yang benar.', 'peringatan');
      return;
    }

    const draftBaru: DraftSoal = {
      id: formManual.editId ?? buatId('soal'),
      pertanyaan: pertanyaanBersih,
      ...(formManual.tampilkanKode && formManual.kode.trim() ? { kode: formManual.kode } : {}),
      pilihan: pilihanBersih,
      kunci: formManual.kunci,
      ...(formManual.penjelasan.trim() ? { penjelasan: formManual.penjelasan.trim() } : {}),
      ...(formManual.tingkat ? { tingkat: formManual.tingkat } : {}),
      ...(formManual.topik.trim() ? { topik: formManual.topik.trim() } : {}),
      ...(formManual.bonus ? { bonus: true } : {}),
      ...(formManual.cadangan ? { cadangan: true } : {}),
      sumber: 'manual',
      nomorAsli: draftPratinjau.length + 1,
      masalah: [],
      peringatanDetail: [],
    };

    const berikutnya = formManual.editId
      ? draftPratinjau.map((item) => (item.id === formManual.editId ? draftBaru : item))
      : [...draftPratinjau, draftBaru];

    const tervalidasi = validasiDaftarDraftSoal(berikutnya, peringatanPratinjau).daftar;
    setDraftPratinjau(tervalidasi);
    tampilkanToast(
      formManual.editId ? 'Soal diperbarui.' : 'Soal ditambahkan ke daftar!',
      'sukses'
    );
    setFormManual(buatFormManualKosong());
    inputPertanyaanRef.current?.focus();
  };

  const editItemManual = (item: DraftSoal) => {
    setFormManual({
      editId: item.id,
      pertanyaan: item.pertanyaan,
      kode: item.kode ?? '',
      tampilkanKode: Boolean(item.kode),
      pilihan: item.pilihan.length >= 2 ? [...item.pilihan] : ['', ''],
      kunci: item.kunci !== null && item.kunci >= 0 ? item.kunci : 0,
      penjelasan: item.penjelasan ?? '',
      tingkat: item.tingkat ?? '',
      topik: item.topik ?? '',
      bonus: Boolean(item.bonus),
      cadangan: Boolean(item.cadangan),
    });
    setTabIsiSoal('manual');
  };

  const duplikasiItemKerja = (indeks: number) => {
    const asal = draftPratinjau[indeks];
    if (!asal) return;
    const salinan: DraftSoal = {
      ...asal,
      id: buatId('soal'),
      pilihan: [...asal.pilihan],
    };
    const berikutnya = [...draftPratinjau];
    berikutnya.splice(indeks + 1, 0, salinan);
    setDraftPratinjau(validasiDaftarDraftSoal(berikutnya, peringatanPratinjau).daftar);
  };

  const hapusItemKerja = (indeks: number) => {
    const berikutnya = draftPratinjau.filter((_, i) => i !== indeks);
    setDraftPratinjau(validasiDaftarDraftSoal(berikutnya, peringatanPratinjau).daftar);
  };

  const geserItemKerja = (indeks: number, arah: -1 | 1) => {
    const target = indeks + arah;
    if (target < 0 || target >= draftPratinjau.length) return;
    const berikutnya = [...draftPratinjau];
    const tmp = berikutnya[indeks];
    berikutnya[indeks] = berikutnya[target];
    berikutnya[target] = tmp;
    setDraftPratinjau(berikutnya);
  };

  const toggleCadanganItemKerja = (indeks: number) => {
    const berikutnya = draftPratinjau.map((s, i) =>
      i === indeks ? { ...s, cadangan: !s.cadangan } : s
    );
    setDraftPratinjau(berikutnya);
  };

  const masukkanTeksTempelKeDaftar = (tampilkanNotif = true): DraftSoal[] | null => {
    if (!hasilTempelLive) return null;
    const barisMentah =
      hasilTempelLive.barisMentah ??
      teksTempel
        .split(/\r?\n/)
        .map((b) => b.trim())
        .filter(Boolean);

    if (hasilTempelLive.totalSoal === 0 && barisMentah.length === 0) {
      return null;
    }

    const gabungan =
      draftPratinjau.length > 0 && modeGabungUnggah === 'tambah'
        ? [...draftPratinjau, ...hasilTempelLive.daftar]
        : hasilTempelLive.daftar;

    const tervalidasi = validasiDaftarDraftSoal(
      gabungan,
      hasilTempelLive.peringatanUmum,
      {
        teksMentah: hasilTempelLive.teksMentah ?? teksTempel,
        barisMentah,
        jenisDokumen: 'teks',
      }
    );

    setDraftPratinjau(tervalidasi.daftar);
    setPeringatanPratinjau(hasilTempelLive.peringatanUmum);
    setDiagnostikImpor({
      jenisDokumen: 'teks',
      teksMentah: hasilTempelLive.teksMentah ?? teksTempel,
      barisMentah,
    });
    setTeksTempelSudahDimasukkan(teksTempel.trim());
    setInfoImporTerakhir({
      sumber: 'teks',
      totalTerbaca: hasilTempelLive.totalSoal,
      siap: Math.max(0, hasilTempelLive.totalSoal - hasilTempelLive.jumlahBermasalah),
      perluDiperiksa: hasilTempelLive.jumlahBermasalah,
    });
    if (tampilkanNotif) {
      tampilkanToast(
        `${hasilTempelLive.totalSoal} soal dari tempel teks masuk ke daftar.`,
        'sukses'
      );
    }
    return tervalidasi.daftar;
  };

  const prosesFileDokumen = async (file: File, modePdf: ModeKolomPdf) => {
    setSedangMembacaFile(true);
    setNamaFileTerakhir(file.name);
    setInfoKolomDokumen('');
    fileDokumenTerakhirRef.current = file;

    try {
      const hasil = await parseFileDokumen(file, { modeKolomPdf: modePdf });
      const barisMentah = hasil.barisMentah ?? [];
      const jenisDok = hasil.jenisDokumen ?? hasil.daftar[0]?.sumber ?? 'docx';
      const gabungan =
        draftPratinjau.length > 0 && modeGabungUnggah === 'tambah'
          ? [...draftPratinjau, ...hasil.daftar]
          : hasil.daftar;

      const perluPeringatanLuas = apakahPeringatanGagalBacaLuas(
        hasil.totalSoal,
        hasil.jumlahBermasalah,
        hasil.indikasiGagalBacaBesar,
        barisMentah.length
      );

      setDiagnostikImpor({
        jenisDokumen: jenisDok,
        namaFile: file.name,
        teksMentah: hasil.teksMentah ?? barisMentah.join('\n'),
        barisMentah,
        ...(hasil.infoKolomPdf ? { infoKolomPdf: hasil.infoKolomPdf } : {}),
      });
      setInfoKolomDokumen(hasil.infoKolomPdf?.keterangan ?? '');
      setDraftPratinjau(gabungan);
      setPeringatanPratinjau(hasil.peringatanUmum);
      setInfoImporTerakhir({
        sumber: jenisDok,
        namaFile: file.name,
        totalTerbaca: hasil.totalSoal,
        siap: Math.max(0, hasil.totalSoal - hasil.jumlahBermasalah),
        perluDiperiksa: hasil.jumlahBermasalah,
        ...(hasil.catatanBagian ? { catatanBagian: hasil.catatanBagian } : {}),
      });

      // TIDAK lompat otomatis ke Langkah 3! Tampilkan ringkasan singkat di Langkah 2.
      if (perluPeringatanLuas) {
        tampilkanToast(
          hasil.peringatanKritis ??
            'Dokumen kemungkinan tidak terbaca dengan benar. Periksa di langkah Periksa Soal.',
          'peringatan'
        );
      } else if (hasil.totalSoal > 0) {
        tampilkanToast(
          `Terbaca ${hasil.totalSoal} soal dari "${file.name}". Klik SELESAI, PERIKSA SOAL untuk meninjau.`,
          hasil.jumlahBermasalah > 0 ? 'peringatan' : 'sukses'
        );
      } else {
        tampilkanToast(
          hasil.peringatanUmum[0] ||
            'Format otomatis belum menemukan soal. Anda tetap dapat menandainya di Periksa Soal.',
          'peringatan'
        );
      }
    } finally {
      setSedangMembacaFile(false);
    }
  };

  const handlePilihFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await prosesFileDokumen(file, modeKolomPdf);
    } finally {
      e.target.value = '';
    }
  };

  const handleUbahModeKolomPdf = async (modeBaru: ModeKolomPdf) => {
    setModeKolomPdf(modeBaru);
    const fileTerakhir = fileDokumenTerakhirRef.current;
    if (fileTerakhir && fileTerakhir.name.toLowerCase().endsWith('.pdf')) {
      setSedangMemprosesUlangPdf(true);
      try {
        await prosesFileDokumen(fileTerakhir, modeBaru);
      } finally {
        setSedangMemprosesUlangPdf(false);
      }
    }
  };

  const handleSelesaiIsiSoal = () => {
    let daftarAkhir = draftPratinjau;
    if (
      tabIsiSoal === 'tempel' &&
      hasilTempelLive &&
      hasilTempelLive.totalSoal > 0 &&
      teksTempel.trim() !== teksTempelSudahDimasukkan
    ) {
      const hasilMasuk = masukkanTeksTempelKeDaftar(false);
      if (hasilMasuk) {
        daftarAkhir = hasilMasuk;
      }
    }

    if (daftarAkhir.length === 0 && (diagnostikImpor?.barisMentah.length ?? 0) === 0) {
      tampilkanToast('Tambahkan minimal 1 soal terlebih dahulu.', 'peringatan');
      return;
    }

    const maksBaru = Math.max(2, langkahSelesaiMaks);
    setLangkahSelesaiMaks(maksBaru);
    setLangkahAktif(3);
    if (gameDraftId) {
      catatDrafSegera(gameDraftId, 3, maksBaru, daftarAkhir);
    }
  };

  // === LANGKAH 3: Simpan Soal & Lanjut ke Pengaturan ===
  const handleSimpanSoalLangkah3 = (draftTerbaru: DraftSoal[]) => {
    const { soalValid, jumlahDilewati } = konversiDraftValidKeSoal(draftTerbaru);
    if (soalValid.length === 0) {
      tampilkanToast('Minimal 1 soal valid diperlukan sebelum menyimpan soal.', 'peringatan');
      return;
    }

    setDraftPratinjau(draftTerbaru);
    if (gameDraftId) {
      simpanDrafGameOtomatis(gameDraftId, {
        judul: judul.trim() || 'Game Kuis Baru',
        mapel: mapel.trim() || 'Umum',
        namaSekolah: namaSekolah.trim(),
        soal: soalValid,
      });
    }

    const maksBaru = Math.max(3, langkahSelesaiMaks);
    setLangkahSelesaiMaks(maksBaru);
    setLangkahAktif(4);
    if (gameDraftId) {
      catatDrafSegera(gameDraftId, 4, maksBaru, draftTerbaru);
    }

    tampilkanToast(
      jumlahDilewati > 0
        ? `${soalValid.length} soal disimpan ke game (${jumlahDilewati} soal bermasalah tidak ikut).`
        : `${soalValid.length} soal disimpan ke game.`,
      jumlahDilewati > 0 ? 'peringatan' : 'sukses'
    );
  };

  // === LANGKAH 4: Simpan Pengaturan & Lanjut ke Selesai ===
  const handleSimpanPengaturanLangkah4 = () => {
    const finalPengaturan = bentukPengaturanFinalDariForm(
      formPengaturan,
      teksAnggota,
      teksDaftarDuel
    );
    if (gameDraftId) {
      simpanDrafGameOtomatis(gameDraftId, {
        pengaturan: finalPengaturan,
      });
    }
    const maksBaru = Math.max(4, langkahSelesaiMaks);
    setLangkahSelesaiMaks(maksBaru);
    setLangkahAktif(5);
    if (gameDraftId) {
      catatDrafSegera(gameDraftId, 5, maksBaru);
    }
    tampilkanToast('Pengaturan game disimpan.', 'sukses');
  };

  // === LANGKAH 5: Simpan & Selesai / Simpan & Mulai Duel ===
  const handleSimpanFinal = () => {
    if (!gameDraftId) return;
    const finalPengaturan = bentukPengaturanFinalDariForm(
      formPengaturan,
      teksAnggota,
      teksDaftarDuel
    );
    tandaiGameTersimpan(gameDraftId, {
      sorot: true,
      pesanToast: 'Game tersimpan',
      pengaturan: finalPengaturan,
    });
    onNavigasi('/game-saya');
  };

  const handleSimpanDanMulaiDuel = () => {
    if (!gameDraftId) return;
    tandaiInteraksiAudio();
    const finalPengaturan = bentukPengaturanFinalDariForm(
      formPengaturan,
      teksAnggota,
      teksDaftarDuel
    );
    const gameDisiapkan = tandaiGameTersimpan(gameDraftId, {
      pengaturan: finalPengaturan,
    });
    if (!gameDisiapkan || gameDisiapkan.soal.length === 0) {
      tampilkanToast('Minimal 1 soal valid diperlukan untuk memulai duel.', 'error');
      return;
    }

    hapusSesiMatchSessionStorage();

    if (finalPengaturan.mode === '4tim') {
      mulaiSesiTurnamenBaru(gameDisiapkan);
      onNavigasi('/turnamen');
      return;
    }

    if (finalPengaturan.mode === '1lawan1') {
      let pasanganUntukMain = pasanganDuel;
      if (pasanganUntukMain.length === 0) {
        const daftar = parseDaftarNama(teksDaftarDuel);
        pasanganUntukMain =
          daftar.length >= 2
            ? buatPasanganDuelDenganTanda(daftar)
            : [
                {
                  kiri: finalPengaturan.namaTim[0] || 'Pemain 1',
                  kanan: finalPengaturan.namaTim[1] || 'Pemain 2',
                },
              ];
      }
      mulaiSesiDuelBaru(gameDisiapkan, pasanganUntukMain);
      onNavigasi('/duel');
      return;
    }

    resetSesiMode();
    mulaiSesiPembagian(gameDisiapkan, []);
    onNavigasi('/main');
  };

  const pindahKeLangkahViaStepper = (target: LangkahWizard) => {
    if (!bolehBukaLangkahWizard(target, langkahSelesaiMaks, Boolean(gameDraftId))) {
      return;
    }
    setLangkahAktif(target);
    if (gameDraftId) {
      catatDrafSegera(gameDraftId, target, langkahSelesaiMaks);
    }
  };

  // Layar kunci PIN jika mengedit game yang ber-PIN
  if (terkunciPin && gameTarget) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] px-8 py-6">
        <div className="kartu-3d w-full max-w-[560px] rounded-3xl border-4 border-[#FFD400] bg-[#12276B] p-7">
          <h1 className="font-display mb-2 text-center text-2xl font-bold text-[#FFD400]">
            Bank Soal Dilindungi PIN Guru
          </h1>
          <PanelKeypadPin
            judulKeterangan={`Masukkan PIN Guru (4 angka) untuk mengubah soal atau melihat kunci pada "${gameTarget.judul}", atau buat game baru tanpa PIN.`}
            pinBenar={pinAktif}
            labelTombolBuka="Buka Editor"
            onBerhasil={() => bukaIzinEditDenganPin(gameTarget.id)}
            onBatal={() => onNavigasi('/game-saya')}
            aksiTambahanLabel="Buat Game Baru"
            onAksiTambahan={() => bukaWizardBuatGame('baru', null)}
          />
        </div>
      </div>
    );
  }

  const adaTeksTempelBelumMasuk =
    tabIsiSoal === 'tempel' &&
    Boolean(hasilTempelLive && hasilTempelLive.totalSoal > 0) &&
    teksTempel.trim() !== teksTempelSudahDimasukkan;

  const bolehLanjutKePeriksa =
    draftPratinjau.length > 0 ||
    adaTeksTempelBelumMasuk ||
    (diagnostikImpor?.barisMentah.length ?? 0) > 0;

  const labelModeSingkat =
    pengaturanLive.mode === '4tim'
      ? '4 Tim (Turnamen)'
      : pengaturanLive.mode === '1lawan1'
        ? '1 Lawan 1 (Duel)'
        : '2 Tim (Merah vs Biru)';

  const labelWaktuSingkat =
    pengaturanLive.akhirPermainan === 'soalHabis'
      ? `Sampai soal habis · ${pengaturanLive.durasiSoal} detik/soal`
      : pengaturanLive.akhirPermainan === 'keduanya'
        ? `${pengaturanLive.durasiWaktu} menit atau soal habis · ${pengaturanLive.durasiSoal} detik/soal`
        : `${pengaturanLive.durasiWaktu} menit · ${pengaturanLive.durasiSoal} detik/soal`;

  return (
    <div className="flex h-full w-full flex-col gap-3 bg-[#0B1B4D] px-8 py-4">
      {/* BAR LANGKAH DI ATAS (Stepper) + Status Auto-Save */}
      <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-2.5 shadow-[0_6px_0_#071236]">
        <div className="flex items-center gap-2">
          {DAFTAR_LANGKAH.map((step, idx) => {
            const aktif = langkahAktif === step.nomor;
            const selesai = step.nomor <= langkahSelesaiMaks && !aktif;
            const bisaDiklik = bolehBukaLangkahWizard(
              step.nomor,
              langkahSelesaiMaks,
              Boolean(gameDraftId)
            );
            return (
              <React.Fragment key={step.nomor}>
                <button
                  type="button"
                  disabled={!bisaDiklik}
                  onClick={() => pindahKeLangkahViaStepper(step.nomor)}
                  className={`font-display flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3.5 py-1.5 text-sm font-bold transition ${
                    aktif
                      ? 'cursor-default border-[#FFE875] bg-[#1E6BFF] text-white shadow-[0_3px_0_#0A2FA8]'
                      : selesai
                        ? 'cursor-pointer border-[#57E893] bg-[#007A33] text-white hover:bg-[#009940]'
                        : bisaDiklik
                          ? 'cursor-pointer border-[#3C62D4] bg-[#071236] text-[#DCE7FF] hover:border-[#FFD400]'
                          : 'cursor-not-allowed border-[#1C388A] bg-[#071236]/60 text-[#7FA0E8] opacity-55'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      aktif
                        ? 'bg-[#FFD400] text-[#0B1B4D]'
                        : selesai
                          ? 'bg-[#57E893] text-[#0B1B4D]'
                          : 'bg-[#173287] text-[#DCE7FF]'
                    }`}
                  >
                    {selesai ? <Check size={14} strokeWidth={3} /> : step.nomor}
                  </span>
                  <span>{step.judul}</span>
                </button>
                {idx < DAFTAR_LANGKAH.length - 1 && (
                  <span className="font-bold text-[#669BFF]">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {gameDraftId && waktuSimpanTerakhir && (
            <span className="font-display rounded-xl border-2 border-[#00C853] bg-[#004D20] px-3 py-1.5 text-xs font-bold text-[#57E893]">
              Draf tersimpan ✓ {formatWaktuSingkatHHMM(waktuSimpanTerakhir)}
            </span>
          )}
          {gameDraftId && (
            <button
              type="button"
              onClick={() => bukaWizardBuatGame('baru', null)}
              className="font-display min-h-[40px] cursor-pointer rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-xs font-bold text-[#FFD400] hover:border-[#FFD400]"
            >
              + Game Baru Lain
            </button>
          )}
        </div>
      </div>

      {/* KONTEN LANGKAH AKTIF (Satu langkah per layar) */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* ================= LANGKAH ①: INFO GAME ================= */}
        {langkahAktif === 1 && (
          <form
            onSubmit={handleSubmitLangkah1}
            className="flex min-h-0 flex-1 flex-col justify-between gap-4"
          >
            <div className="flex flex-1 items-center justify-center">
              <div className="kartu-3d w-full max-w-[780px] rounded-3xl border-4 border-[#FFD400] bg-[#12276B] p-8 shadow-[0_10px_0_#071236]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#071236] bg-[#FFD400] font-display text-2xl font-bold text-[#071236]">
                    1
                  </div>
                  <div>
                    <h1 className="font-display text-3xl font-bold text-[#FFD400]">
                      Info Game Baru
                    </h1>
                    <p className="text-sm font-semibold text-[#DCE7FF]">
                      Isi identitas kuis terlebih dahulu. Setelah dibuat, setiap perubahan otomatis tersimpan sebagai Draf.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="font-display mb-1.5 block text-sm font-bold text-[#FFD400]">
                      Judul Game <span className="text-[#FF6B86]">* (Wajib)</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={judul}
                      onChange={(e) => {
                        setJudul(e.target.value);
                        if (galatJudul) setGalatJudul('');
                      }}
                      placeholder="Contoh: Ulangan Harian Bab 3 / Kuis Campuran Kelas VII"
                      className={`min-h-[54px] w-full rounded-2xl border-3 bg-[#071236] px-4 text-lg font-bold text-white placeholder-[#7FA0E8] focus:outline-none ${
                        galatJudul
                          ? 'border-[#FF1744] focus:border-[#FF1744]'
                          : 'border-[#3C62D4] focus:border-[#FFD400]'
                      }`}
                    />
                    {galatJudul && (
                      <p className="mt-1.5 text-sm font-bold text-[#FF6B86]">{galatJudul}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-display mb-1.5 block text-sm font-bold text-[#FFD400]">
                        Mata Pelajaran
                      </label>
                      <input
                        type="text"
                        value={mapel}
                        onChange={(e) => setMapel(e.target.value)}
                        placeholder="Contoh: Matematika / IPA / Umum"
                        className="min-h-[52px] w-full rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 text-base font-bold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-display mb-1.5 block text-sm font-bold text-[#FFD400]">
                        Nama Sekolah / Kelas
                      </label>
                      <input
                        type="text"
                        value={namaSekolah}
                        onChange={(e) => setNamaSekolah(e.target.value)}
                        placeholder="Contoh: SMPN 1 Nusantara · VII-A"
                        className="min-h-[52px] w-full rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 text-base font-bold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-3 shadow-[0_6px_0_#071236]">
              <Button3D variant="navy" size="sm" onClick={() => onNavigasi('/game-saya')}>
                <ArrowLeft size={16} />
                <span>Kembali ke Game Saya</span>
              </Button3D>

              <Button3D type="submit" variant="hijau" size="lg">
                <PlusSquare size={22} />
                <span>{gameDraftId ? 'SIMPAN INFO & LANJUT' : '+ GAME BARU'}</span>
                <ArrowRight size={20} />
              </Button3D>
            </div>
          </form>
        )}

        {/* ================= LANGKAH ②: ISI SOAL ================= */}
        {langkahAktif === 2 && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {/* Sub-header Tab Isi Soal + Penghitung Soal Terbaca */}
            <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Button3D
                  variant={tabIsiSoal === 'manual' ? 'kuning' : 'navy'}
                  size="sm"
                  onClick={() => setTabIsiSoal('manual')}
                >
                  <Keyboard size={17} />
                  <span>Input Manual</span>
                </Button3D>
                <Button3D
                  variant={tabIsiSoal === 'tempel' ? 'kuning' : 'navy'}
                  size="sm"
                  onClick={() => setTabIsiSoal('tempel')}
                >
                  <FileText size={17} />
                  <span>Tempel Teks</span>
                </Button3D>
                <Button3D
                  variant={tabIsiSoal === 'unggah' ? 'kuning' : 'navy'}
                  size="sm"
                  onClick={() => setTabIsiSoal('unggah')}
                >
                  <FileUp size={17} />
                  <span>Unggah Dokumen (Word/PDF/Excel)</span>
                </Button3D>
              </div>

              <div className="flex items-center gap-3">
                <span className="truncate text-sm font-bold text-[#DCE7FF]">
                  {judul || gameTarget?.judul || 'Game Baru'}
                </span>
                <span className="font-display tabular-angka rounded-xl border-2 border-[#FFD400] bg-[#12276B] px-4 py-1.5 text-base font-bold text-[#FFD400]">
                  Soal terbaca: {jumlahSoalTerbaca}
                </span>
              </div>
            </div>

            {/* Konten Tab Langkah 2 */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {/* TAB 1: INPUT MANUAL */}
              {tabIsiSoal === 'manual' && (
                <div className="grid h-full grid-cols-12 gap-4">
                  <form
                    onSubmit={handleSimpanFormManual}
                    className="scroll-guru col-span-7 flex flex-col justify-between gap-2.5 rounded-3xl border-4 border-[#2A4CB8] bg-[#12276B] p-4 shadow-[0_8px_0_#071236]"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold text-[#FFD400]">
                          {formManual.editId ? 'Edit Soal Terpilih' : 'Tambah Soal Manual'}
                        </h2>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFormManual((f) => ({ ...f, tampilkanKode: !f.tampilkanKode }))
                            }
                            className="cursor-pointer rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 py-1 text-xs font-bold text-[#DCE7FF] hover:border-[#FFD400]"
                          >
                            {formManual.tampilkanKode ? 'Tutup Blok Kode' : '+ Blok Kode'}
                          </button>
                          {formManual.editId && (
                            <button
                              type="button"
                              onClick={() => setFormManual(buatFormManualKosong())}
                              className="cursor-pointer rounded-xl bg-[#B80023] px-3 py-1 text-xs font-bold text-white"
                            >
                              Batal Edit
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        ref={inputPertanyaanRef}
                        rows={2}
                        value={formManual.pertanyaan}
                        onChange={(e) =>
                          setFormManual({ ...formManual, pertanyaan: e.target.value })
                        }
                        placeholder="Tulis pertanyaan di sini..."
                        className="w-full rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-2 text-base font-bold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                      />

                      {formManual.tampilkanKode && (
                        <textarea
                          rows={2}
                          value={formManual.kode}
                          onChange={(e) => setFormManual({ ...formManual, kode: e.target.value })}
                          placeholder="Tempel blok kode program di sini..."
                          className="w-full rounded-2xl border-2 border-[#3C62D4] bg-[#040B24] px-4 py-2 font-mono text-sm text-[#57E893] placeholder-[#4B709E] focus:border-[#FFD400] focus:outline-none"
                        />
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {formManual.pilihan.map((opsi, idx) => {
                          const huruf = String.fromCharCode(65 + idx);
                          const adalahKunci = formManual.kunci === idx;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFormManual({ ...formManual, kunci: idx })}
                                title={`Jadikan ${huruf} sebagai kunci benar`}
                                className={`font-display flex min-h-[48px] min-w-[48px] shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 text-lg font-bold ${
                                  adalahKunci
                                    ? 'border-[#57E893] bg-[#00C853] text-white shadow-[0_3px_0_#008E3A]'
                                    : 'border-[#3C62D4] bg-[#071236] text-[#FFD400]'
                                }`}
                              >
                                {adalahKunci ? <Check size={20} strokeWidth={3} /> : huruf}
                              </button>
                              <input
                                type="text"
                                value={opsi}
                                onChange={(e) => {
                                  const salinan = [...formManual.pilihan];
                                  salinan[idx] = e.target.value;
                                  setFormManual({ ...formManual, pilihan: salinan });
                                }}
                                placeholder={`Pilihan ${huruf}`}
                                className="min-h-[48px] flex-1 rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-base font-semibold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                              />
                              {formManual.pilihan.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const salinan = formManual.pilihan.filter((_, pIdx) => pIdx !== idx);
                                    let kunciBaru = formManual.kunci;
                                    if (kunciBaru === idx) kunciBaru = 0;
                                    else if (kunciBaru > idx) kunciBaru -= 1;
                                    setFormManual({ ...formManual, pilihan: salinan, kunci: kunciBaru });
                                  }}
                                  aria-label={`Kurangi pilihan ${huruf}`}
                                  className="flex min-h-[48px] min-w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#071236] font-bold text-[#FF6B86] hover:bg-[#7A0018]"
                                >
                                  −
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {formManual.pilihan.length < 4 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormManual({
                                ...formManual,
                                pilihan: [...formManual.pilihan, ''],
                              })
                            }
                            className="font-display flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#669BFF] bg-[#071236] text-sm font-bold text-[#DCE7FF] hover:border-[#FFD400] hover:text-[#FFD400]"
                          >
                            <Plus size={16} />
                            <span>Tambah Pilihan {String.fromCharCode(65 + formManual.pilihan.length)}</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={formManual.penjelasan}
                          onChange={(e) =>
                            setFormManual({ ...formManual, penjelasan: e.target.value })
                          }
                          placeholder="Penjelasan (opsional)"
                          className="col-span-5 min-h-[44px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-semibold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                        />
                        <input
                          type="text"
                          value={formManual.topik}
                          onChange={(e) => setFormManual({ ...formManual, topik: e.target.value })}
                          placeholder="Topik (opsional)"
                          className="col-span-3 min-h-[44px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-semibold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                        />
                        <select
                          value={formManual.tingkat}
                          onChange={(e) =>
                            setFormManual({ ...formManual, tingkat: e.target.value as '' | TingkatSoal })
                          }
                          className="col-span-2 min-h-[44px] rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-2 text-sm font-bold text-white focus:border-[#FFD400] focus:outline-none"
                        >
                          <option value="">Tingkat</option>
                          <option value="Mudah">Mudah</option>
                          <option value="Sedang">Sedang</option>
                          <option value="Sulit">Sulit</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setFormManual({ ...formManual, bonus: !formManual.bonus })}
                          className={`font-display col-span-2 min-h-[44px] cursor-pointer rounded-xl border-2 text-xs font-bold ${
                            formManual.bonus
                              ? 'border-[#FFE875] bg-[#FF9100] text-white'
                              : 'border-[#3C62D4] bg-[#071236] text-[#DCE7FF]'
                          }`}
                        >
                          {formManual.bonus ? 'Bonus 2× ✓' : 'Bonus 2×'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 rounded-xl border-2 border-[#2A4CB8] bg-[#071236] px-3 py-1.5">
                        <div className="text-xs font-semibold text-[#DCE7FF]">
                          <strong className="text-[#FFD400]">Soal Cadangan (Penentu):</strong> hanya dipakai saat seri (disarankan 3–5 soal).
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormManual({ ...formManual, cadangan: !formManual.cadangan })
                          }
                          className={`font-display min-h-[38px] shrink-0 cursor-pointer rounded-xl border-2 px-3 text-xs font-bold ${
                            formManual.cadangan
                              ? 'border-[#FFE875] bg-[#7C4DFF] text-white'
                              : 'border-[#3C62D4] bg-[#12276B] text-[#DCE7FF]'
                          }`}
                        >
                          {formManual.cadangan ? 'Cadangan ✓' : 'Jadikan Cadangan'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t-2 border-[#223F9C] pt-2.5">
                      <span className="text-xs font-semibold text-[#DCE7FF]">
                        Ketuk huruf A–D untuk memilih kunci benar.
                      </span>
                      <Button3D type="submit" variant="biru" size="sm">
                        <Plus size={18} />
                        <span>
                          {formManual.editId ? 'Simpan Perubahan' : 'Tambahkan Soal ke Daftar'}
                        </span>
                      </Button3D>
                    </div>
                  </form>

                  {/* Daftar Soal Terkumpul */}
                  <div className="col-span-5 flex min-h-0 flex-col rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-4 shadow-[0_8px_0_#071236]">
                    <div className="mb-2 flex shrink-0 items-center justify-between">
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#FFD400]">
                          Daftar Soal ({draftPratinjau.length})
                        </h2>
                        <p className="text-[11px] font-semibold text-[#DCE7FF]">
                          Utama: {draftPratinjau.filter((s) => !s.cadangan).length} · Cadangan:{' '}
                          {draftPratinjau.filter((s) => Boolean(s.cadangan)).length}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#DCE7FF]">Klik Periksa Soal setelah selesai</span>
                    </div>

                    {draftPratinjau.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-[#3C62D4] bg-[#071236] p-6 text-center text-sm text-[#DCE7FF]">
                        Belum ada soal. Ketik di kiri, tempel teks, atau unggah dokumen Word/PDF/Excel.
                      </div>
                    ) : (
                      <div className="scroll-guru flex-1 space-y-2 pr-1">
                        {draftPratinjau.map((soal, idx) => (
                          <div
                            key={soal.id}
                            className={`flex items-start justify-between gap-2 rounded-2xl border-2 p-2.5 ${
                              soal.cadangan
                                ? 'border-[#A78BFA] bg-[#1E1445]'
                                : 'border-[#2A4CB8] bg-[#071236]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#FFD400]">
                                <span>#{idx + 1}</span>
                                <span>
                                  · Kunci:{' '}
                                  {soal.kunci !== null && soal.kunci >= 0
                                    ? String.fromCharCode(65 + soal.kunci)
                                    : 'Belum'}
                                </span>
                                {soal.cadangan && (
                                  <span className="rounded bg-[#7C4DFF] px-1.5 py-0.5 text-[10px] text-white">
                                    CADANGAN
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-sm font-bold text-white">
                                {soal.pertanyaan}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleCadanganItemKerja(idx)}
                                className={`min-h-[36px] cursor-pointer rounded-lg px-2 text-[11px] font-bold ${
                                  soal.cadangan
                                    ? 'bg-[#7C4DFF] text-white'
                                    : 'bg-[#173287] text-[#DCE7FF]'
                                }`}
                              >
                                {soal.cadangan ? 'Cadangan' : 'Utama'}
                              </button>
                              <button
                                type="button"
                                onClick={() => geserItemKerja(idx, -1)}
                                disabled={idx === 0}
                                aria-label={`Naikkan soal ${idx + 1}`}
                                className="flex min-h-[36px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg bg-[#173287] text-white disabled:opacity-35"
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => geserItemKerja(idx, 1)}
                                disabled={idx === draftPratinjau.length - 1}
                                aria-label={`Turunkan soal ${idx + 1}`}
                                className="flex min-h-[36px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg bg-[#173287] text-white disabled:opacity-35"
                              >
                                <ArrowDown size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => editItemManual(soal)}
                                aria-label={`Edit soal ${idx + 1}`}
                                className="flex min-h-[36px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg bg-[#1E6BFF] text-white"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplikasiItemKerja(idx)}
                                aria-label={`Duplikasi soal ${idx + 1}`}
                                className="flex min-h-[36px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg bg-[#7C4DFF] text-white"
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => hapusItemKerja(idx)}
                                aria-label={`Hapus soal ${idx + 1}`}
                                className="flex min-h-[36px] min-w-[34px] cursor-pointer items-center justify-center rounded-lg bg-[#B80023] text-white"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TEMPEL TEKS */}
              {tabIsiSoal === 'tempel' && (
                <div className="grid h-full grid-cols-12 gap-4">
                  <div className="col-span-7 flex min-h-0 flex-col gap-2.5 rounded-3xl border-4 border-[#2A4CB8] bg-[#12276B] p-4 shadow-[0_8px_0_#071236]">
                    <div className="flex shrink-0 items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#FFD400]">
                          Tempel Soal & Kunci Jawaban
                        </h2>
                        <p className="text-xs text-[#DCE7FF]">
                          Mendukung 1. / 1) / No. 1, pilihan A. / a) / (A), Kunci:, tanda *, ✓, dan daftar kunci di akhir.
                        </p>
                      </div>
                      <Button3D
                        variant="oranye"
                        size="sm"
                        onClick={() => setTeksTempel(CONTOH_FORMAT_TEKS)}
                      >
                        <span>Lihat contoh</span>
                      </Button3D>
                    </div>

                    <textarea
                      value={teksTempel}
                      onChange={(e) => setTeksTempel(e.target.value)}
                      placeholder="Tempel teks soal Anda di sini..."
                      className="scroll-guru min-h-0 flex-1 resize-none rounded-2xl border-3 border-[#3C62D4] bg-[#071236] p-4 font-mono text-sm leading-relaxed text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                    />
                  </div>

                  <div className="col-span-5 flex min-h-0 flex-col justify-between rounded-3xl border-4 border-[#3C62D4] bg-[#173287] p-4 shadow-[0_8px_0_#071236]">
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <h3 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                        Hasil Pembacaan Teks
                      </h3>
                      {!hasilTempelLive ? (
                        <p className="text-sm font-semibold text-[#DCE7FF]">
                          Tempel soal di kotak sebelah kiri. Hasil pembacaan langsung muncul di sini tanpa berpindah layar.
                        </p>
                      ) : (
                        <div className="flex h-[calc(100%-34px)] flex-col gap-2.5">
                          <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3">
                            <div className="font-display text-xl font-bold text-white">
                              Terbaca {hasilTempelLive.totalSoal} soal •{' '}
                              {hasilTempelLive.jumlahBermasalah > 0 ? (
                                <span className="text-[#FFD400]">
                                  {hasilTempelLive.jumlahBermasalah} perlu diperiksa
                                </span>
                              ) : (
                                <span className="text-[#57E893]">Semua siap</span>
                              )}
                            </div>
                          </div>

                          <div className="scroll-guru flex-1 space-y-1.5 pr-1">
                            {hasilTempelLive.daftar.map((d, idx) => (
                              <div
                                key={d.id}
                                className={`rounded-xl border-2 px-3 py-2 text-xs ${
                                  d.masalah.length > 0
                                    ? 'border-[#FFD400] bg-[#3D2800]'
                                    : 'border-[#2A4CB8] bg-[#071236]'
                                }`}
                              >
                                <div className="font-bold text-[#FFD400]">
                                  #{idx + 1} · {d.pilihan.length} pilihan ·{' '}
                                  {d.kunci !== null ? 'Kunci terbaca' : 'Tanpa kunci'}
                                </div>
                                <div className="truncate font-semibold text-white">
                                  {d.pertanyaan}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-[#2A4CB8] pt-3">
                      <span className="text-xs font-semibold text-[#DCE7FF]">
                        Atau langsung klik tombol hijau di bawah.
                      </span>
                      <Button3D
                        variant="biru"
                        size="sm"
                        disabled={!hasilTempelLive || hasilTempelLive.totalSoal === 0}
                        onClick={() => masukkanTeksTempelKeDaftar(true)}
                      >
                        <Plus size={16} />
                        <span>Masukkan ke Daftar</span>
                      </Button3D>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: UNGGAH DOKUMEN */}
              {tabIsiSoal === 'unggah' && (
                <div className="grid h-full grid-cols-12 gap-4">
                  <div className="col-span-7 flex flex-col justify-between rounded-3xl border-4 border-[#2A4CB8] bg-[#12276B] p-5 shadow-[0_8px_0_#071236]">
                    <div>
                      <h2 className="font-display mb-1 text-xl font-bold text-[#FFD400]">
                        Unggah Berkas Soal (Offline di Browser)
                      </h2>
                      <p className="mb-3 text-sm text-[#DCE7FF]">
                        Mendukung Word (.docx), Excel (.xlsx / .xls / .csv), PDF berisi teks (.pdf), dan Teks (.txt).
                      </p>

                      {draftPratinjau.length > 0 && (
                        <div className="mb-3 flex items-center justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-2 text-xs font-bold">
                          <span className="text-[#DCE7FF]">
                            Sudah ada {draftPratinjau.length} soal di daftar:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setModeGabungUnggah('ganti')}
                              className={`cursor-pointer rounded-lg border px-2.5 py-1 ${
                                modeGabungUnggah === 'ganti'
                                  ? 'border-[#FFE875] bg-[#FFD400] text-[#0B1B4D]'
                                  : 'border-[#3C62D4] bg-[#12276B] text-[#DCE7FF]'
                              }`}
                            >
                              Ganti Daftar
                            </button>
                            <button
                              type="button"
                              onClick={() => setModeGabungUnggah('tambah')}
                              className={`cursor-pointer rounded-lg border px-2.5 py-1 ${
                                modeGabungUnggah === 'tambah'
                                  ? 'border-[#FFE875] bg-[#FFD400] text-[#0B1B4D]'
                                  : 'border-[#3C62D4] bg-[#12276B] text-[#DCE7FF]'
                              }`}
                            >
                              Tambahkan ke Daftar
                            </button>
                          </div>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,.xlsx,.xls,.csv,.pdf,.txt"
                        onChange={handlePilihFile}
                        className="hidden"
                      />

                      <div className="mb-3 flex flex-col items-center justify-center rounded-3xl border-4 border-dashed border-[#669BFF] bg-[#071236] p-6 text-center">
                        <FileUp size={42} className="mb-2 text-[#FFD400]" />
                        <p className="font-display mb-3 text-lg font-bold text-white">
                          {sedangMembacaFile
                            ? `Sedang membaca "${namaFileTerakhir}"...`
                            : namaFileTerakhir
                              ? `Berkas terakhir: ${namaFileTerakhir}`
                              : 'Pilih berkas Word, Excel, atau PDF dari perangkat'}
                        </p>
                        <Button3D
                          variant="biru"
                          size="md"
                          disabled={sedangMembacaFile}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FileUp size={20} />
                          <span>{sedangMembacaFile ? 'Memproses...' : 'Pilih Berkas Soal'}</span>
                        </Button3D>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 py-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#FFD400]">
                          <Columns2 size={16} />
                          <span>Kolom PDF</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(['otomatis', '1kolom', '2kolom'] as ModeKolomPdf[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              disabled={sedangMembacaFile || sedangMemprosesUlangPdf}
                              onClick={() => void handleUbahModeKolomPdf(mode)}
                              className={`font-display min-h-[36px] cursor-pointer rounded-xl border-2 px-3 text-xs font-bold ${
                                modeKolomPdf === mode
                                  ? 'border-[#FFE875] bg-[#FFD400] text-[#0B1B4D]'
                                  : 'border-[#3C62D4] bg-[#12276B] text-[#DCE7FF]'
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
                      </div>
                    </div>

                    {infoKolomDokumen && (
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-[#4AC3FF] bg-[#082A54] px-4 py-2 text-xs font-bold text-white">
                        <Info size={16} className="shrink-0 text-[#4AC3FF]" />
                        <span>{infoKolomDokumen}</span>
                      </div>
                    )}
                  </div>

                  {/* Kolom Kanan: Ringkasan Hasil Impor (tetap di Langkah 2) + Template */}
                  <div className="col-span-5 flex flex-col justify-between gap-3 rounded-3xl border-4 border-[#3C62D4] bg-[#173287] p-5 shadow-[0_8px_0_#071236]">
                    {infoImporTerakhir ? (
                      <div className="rounded-2xl border-3 border-[#57E893] bg-[#071236] p-4">
                        <div className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-[#57E893]">
                          <FileCheck2 size={22} />
                          <span>Hasil Pembacaan Berkas</span>
                        </div>
                        {infoImporTerakhir.namaFile && (
                          <p className="mb-2 truncate text-xs font-bold text-[#DCE7FF]">
                            Berkas: <span className="text-white">{infoImporTerakhir.namaFile}</span>
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 font-display text-base font-bold">
                          <span className="rounded-lg bg-[#12276B] px-3 py-1 text-[#FFD400]">
                            {infoImporTerakhir.totalTerbaca} terbaca
                          </span>
                          <span className="rounded-lg bg-[#005724] px-3 py-1 text-[#57E893]">
                            {infoImporTerakhir.siap} siap
                          </span>
                          {infoImporTerakhir.perluDiperiksa > 0 && (
                            <span className="rounded-lg bg-[#FFD400] px-3 py-1 text-[#0B1B4D]">
                              {infoImporTerakhir.perluDiperiksa} perlu diperiksa
                            </span>
                          )}
                        </div>
                        {infoImporTerakhir.catatanBagian &&
                          infoImporTerakhir.catatanBagian.length > 0 && (
                            <p className="mt-2 text-xs font-semibold text-[#FFE8B3]">
                              {infoImporTerakhir.catatanBagian.join(' · ')}
                            </p>
                          )}
                        <p className="mt-2.5 text-xs font-bold text-[#DCE7FF]">
                          Klik tombol hijau <strong>SELESAI, PERIKSA SOAL</strong> di bawah untuk memeriksa dan menyimpan soal.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
                        <h3 className="font-display mb-1 text-lg font-bold text-[#FFD400]">
                          Menunggu Berkas
                        </h3>
                        <p className="text-xs font-semibold text-[#DCE7FF]">
                          Setelah berkas dipilih, ringkasan jumlah soal terbaca akan muncul di sini sebelum lanjut ke tahap pemeriksaan.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
                        <div className="mb-2 flex items-center gap-2 font-display text-base font-bold text-white">
                          <FileSpreadsheet size={20} className="text-[#57E893]" />
                          <span>Template Excel (.xlsx)</span>
                        </div>
                        <Button3D variant="kuning" size="sm" fullWidth onClick={unduhTemplateExcel}>
                          <Download size={17} />
                          <span>UNDUH TEMPLATE EXCEL</span>
                        </Button3D>
                      </div>

                      <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
                        <div className="mb-2 flex items-center gap-2 font-display text-base font-bold text-white">
                          <FileText size={20} className="text-[#FFD400]" />
                          <span>Contoh Format Teks (.txt)</span>
                        </div>
                        <Button3D variant="biru" size="sm" fullWidth onClick={unduhContohFormatTeks}>
                          <Download size={17} />
                          <span>UNDUH CONTOH TEKS</span>
                        </Button3D>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Langkah 2 */}
            <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-3 shadow-[0_6px_0_#071236]">
              <Button3D
                variant="navy"
                size="sm"
                onClick={() => pindahKeLangkahViaStepper(1)}
              >
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </Button3D>

              <Button3D
                variant="hijau"
                size="lg"
                disabled={!bolehLanjutKePeriksa}
                onClick={handleSelesaiIsiSoal}
              >
                <CheckCircle2 size={22} />
                <span>SELESAI, PERIKSA SOAL</span>
                <ArrowRight size={20} />
              </Button3D>
            </div>
          </div>
        )}

        {/* ================= LANGKAH ③: PERIKSA SOAL ================= */}
        {langkahAktif === 3 && (
          <PratinjauSoalPanel
            modeWizard
            draftList={soalTervalidasiKerja}
            peringatanUmum={peringatanPratinjau}
            diagnostikImpor={diagnostikImpor}
            jumlahSoalDiBankGame={gameTarget?.soal.length ?? 0}
            modeKolomPdf={modeKolomPdf}
            sedangMemprosesUlangPdf={sedangMemprosesUlangPdf}
            pengaturan={pengaturanLive}
            tempatSampah={tempatSampah}
            onUpdateTempatSampah={setTempatSampah}
            onKembali={() => pindahKeLangkahViaStepper(2)}
            onUbahModeKolomPdf={
              fileDokumenTerakhirRef.current?.name.toLowerCase().endsWith('.pdf')
                ? (mode) => void handleUbahModeKolomPdf(mode)
                : undefined
            }
            onUpdateDraftList={setDraftPratinjau}
            onGabungKeGame={handleSimpanSoalLangkah3}
            onLanjutPengaturan={handleSimpanSoalLangkah3}
            onSalinNotifikasi={(pesan) => tampilkanToast(pesan, 'info')}
            onTampilkanToast={tampilkanToast}
          />
        )}

        {/* ================= LANGKAH ④: PENGATURAN ================= */}
        {langkahAktif === 4 && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <PanelPengaturanGame
              tampilkanIdentitas={false}
              form={formPengaturan}
              setForm={setFormPengaturan}
              teksAnggota={teksAnggota}
              setTeksAnggota={setTeksAnggota}
              teksDaftarDuel={teksDaftarDuel}
              setTeksDaftarDuel={setTeksDaftarDuel}
              pasanganDuel={pasanganDuel}
              setPasanganDuel={setPasanganDuel}
              jumlahSoalUtama={jumlahSoalUtamaBank}
              perkiraanSoal={perkiraanSoal}
              peringatanAwal={peringatanAwalPengaturan}
              volumeSuara={volumeSuara}
              setVolumeSuara={setVolumeSuara}
              onToast={tampilkanToast}
            />

            <div className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-3 shadow-[0_6px_0_#071236]">
              <Button3D
                variant="navy"
                size="sm"
                onClick={() => pindahKeLangkahViaStepper(3)}
              >
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </Button3D>

              <Button3D
                variant="hijau"
                size="lg"
                onClick={handleSimpanPengaturanLangkah4}
              >
                <Save size={22} />
                <span>SIMPAN PENGATURAN</span>
                <ArrowRight size={20} />
              </Button3D>
            </div>
          </div>
        )}

        {/* ================= LANGKAH ⑤: SELESAI ================= */}
        {langkahAktif === 5 && (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
            <div className="flex flex-1 items-center justify-center">
              <div className="kartu-3d w-full max-w-[820px] rounded-3xl border-4 border-[#57E893] bg-[#12276B] p-7 shadow-[0_10px_0_#071236]">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#071236] bg-[#57E893] text-[#071236]">
                    <Sparkles size={26} />
                  </div>
                  <div>
                    <h1 className="font-display text-3xl font-bold text-[#FFD400]">
                      Game Siap Disimpan &amp; Dimainkan!
                    </h1>
                    <p className="text-sm font-semibold text-[#DCE7FF]">
                      Periksa ringkasan di bawah, lalu pilih Simpan ke Game Saya atau langsung Mulai Duel.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-5">
                  <div>
                    <div className="text-xs font-bold text-[#A8C4FF]">Judul Game</div>
                    <div className="font-display text-xl font-bold text-white">
                      {judul.trim() || gameTarget?.judul || 'Game Baru'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#A8C4FF]">Mata Pelajaran</div>
                    <div className="font-display text-lg font-bold text-[#FFD400]">
                      {mapel.trim() || gameTarget?.mapel || 'Umum'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#A8C4FF]">Nama Sekolah / Kelas</div>
                    <div className="text-base font-bold text-white">
                      {namaSekolah.trim() || gameTarget?.namaSekolah || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#A8C4FF]">Mode Pertandingan</div>
                    <div className="text-base font-bold text-[#57E893]">
                      {labelModeSingkat} · {pengaturanLive.jumlahPenarik} penarik/tim
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#A8C4FF]">Jumlah Soal</div>
                    <div className="font-display tabular-angka text-lg font-bold text-white">
                      {(gameTarget?.soal.length ?? soalValidDiKerja.length)} soal{' '}
                      <span className="text-sm text-[#57E893]">
                        ({jumlahSoalUtamaBank} utama)
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#A8C4FF]">Soal Cadangan (Penentu)</div>
                    <div className="font-display tabular-angka text-lg font-bold text-[#FFD400]">
                      {jumlahSoalCadanganBank} soal
                    </div>
                  </div>
                  <div className="col-span-2 border-t border-[#1C388A] pt-2.5">
                    <div className="text-xs font-bold text-[#A8C4FF]">Waktu &amp; Aturan</div>
                    <div className="text-base font-bold text-white">{labelWaktuSingkat}</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  <Button3D variant="hijau" size="xl" onClick={handleSimpanFinal}>
                    <Save size={24} />
                    <span>SIMPAN</span>
                  </Button3D>
                  <Button3D variant="oranye" size="xl" onClick={handleSimpanDanMulaiDuel}>
                    <Play size={24} fill="currentColor" />
                    <span>SIMPAN &amp; MULAI DUEL</span>
                  </Button3D>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between rounded-2xl border-3 border-[#2A4CB8] bg-[#12276B] px-5 py-3 shadow-[0_6px_0_#071236]">
              <Button3D
                variant="navy"
                size="sm"
                onClick={() => pindahKeLangkahViaStepper(4)}
              >
                <ArrowLeft size={16} />
                <span>Kembali ke Pengaturan</span>
              </Button3D>
              <span className="text-xs font-bold text-[#DCE7FF]">
                Menekan SIMPAN menandai game sebagai Tersimpan dan membuka Game Saya.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Peringatan inline kecil jika ada warning dokumen */}
      {langkahAktif === 2 &&
        peringatanPratinjau.length > 0 &&
        infoImporTerakhir &&
        apakahPeringatanGagalBacaLuas(
          infoImporTerakhir.totalTerbaca,
          infoImporTerakhir.perluDiperiksa,
          false,
          diagnostikImpor?.barisMentah.length ?? 0
        ) && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-[#FFD400] bg-[#7D3D00] px-4 py-1.5 text-xs font-bold text-white">
            <AlertTriangle size={16} className="shrink-0 text-[#FFD400]" />
            <span>{peringatanPratinjau[0]}</span>
          </div>
        )}
    </div>
  );
};

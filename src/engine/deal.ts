import { Game, Pengaturan, Soal, SoalSiswa } from '../data/types';
import { acakFisherYates } from '../utils/shuffle';
import { ambilDaftarSoalUntukSiswa } from './gameEngine';

export interface HasilPembagianPertandingan {
  dekKiri: Soal[];
  dekKanan: Soal[];
  dekKiriSiswa: SoalSiswa[];
  dekKananSiswa: SoalSiswa[];
  cadangan: Soal[];
  cadanganSiswa: SoalSiswa[];
  terpakaiIdsSesudah: string[];
  bankDiacakUlang: boolean;
  ringkasanKiri: Record<string, number>;
  ringkasanKanan: Record<string, number>;
}

export interface PerkiraanKebutuhanSoal {
  soalPerTimPerLaga: number;
  jumlahLaga: number;
  totalSoalDibutuhkan: number;
  bankCukup: boolean;
  pesanUtama: string;
  pesanPeringatan: string | null;
}

export interface HasilValidasiMulaiDuel {
  valid: boolean;
  pesanError: string[];
}

/**
 * Membersihkan teks tempel daftar nama siswa (satu nama per baris, hapus baris kosong & spasi berlebih).
 */
export function parseDaftarNama(teks: string): string[] {
  return teks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((baris) => baris.trim().replace(/\s{2,}/g, ' '))
    .filter((nama) => nama.length > 0);
}

/**
 * Menghasilkan daftar nama efektif tim (jika kosong otomatis "Pemain 1, 2, 3...").
 */
export function ambilRosterEfektif(
  daftarNama: readonly string[],
  jumlahPenarik: number
): string[] {
  const bersih = daftarNama.map((n) => n.trim()).filter((n) => n.length > 0);
  if (bersih.length > 0) {
    return bersih;
  }
  const jumlah = Math.max(1, jumlahPenarik);
  return Array.from({ length: jumlah }, (_, idx) => `Pemain ${idx + 1}`);
}

/**
 * Membuat urutan estafet berputar per tim tanpa melompati atau menggandakan pemain
 * sebelum seluruh anggota mendapatkan giliran.
 */
export function buatUrutanEstafet(
  daftarAnggota: readonly string[],
  jumlahPenarik: number,
  jumlahGiliran: number
): string[] {
  const roster = ambilRosterEfektif(daftarAnggota, jumlahPenarik);
  const hasil: string[] = [];
  for (let i = 0; i < jumlahGiliran; i += 1) {
    hasil.push(roster[i % roster.length]);
  }
  return hasil;
}

export function ambilPemainGiliran(
  daftarAnggota: readonly string[],
  jumlahPenarik: number,
  indeksGiliran: number
): string {
  const roster = ambilRosterEfektif(daftarAnggota, jumlahPenarik);
  return roster[Math.abs(indeksGiliran) % roster.length];
}

export interface PasanganDuelTerundi {
  kiri: string;
  kanan: string;
  siswaMainDuaKali?: string;
}

/**
 * Mengundi daftar nama siswa menjadi pasangan duel 1 lawan 1 secara acak beserta penanda siswa main dua kali (jika ganjil).
 */
export function buatPasanganDuelDenganTanda(
  daftarNama: readonly string[]
): PasanganDuelTerundi[] {
  const bersih = daftarNama.map((n) => n.trim()).filter((n) => n.length > 0);
  if (bersih.length === 0) {
    return [{ kiri: 'Pemain 1', kanan: 'Pemain 2' }];
  }
  if (bersih.length === 1) {
    return [{ kiri: bersih[0], kanan: 'Pemain 2' }];
  }
  const teracak = acakFisherYates(bersih);
  const hasil: PasanganDuelTerundi[] = [];
  const jumlahPasangGenap = teracak.length - (teracak.length % 2);
  for (let i = 0; i < jumlahPasangGenap; i += 2) {
    hasil.push({ kiri: teracak[i], kanan: teracak[i + 1] });
  }
  if (teracak.length % 2 === 1) {
    const siswaTerakhir = teracak[teracak.length - 1];
    const kandidatLawan = teracak.slice(0, teracak.length - 1);
    const indeksLawan = Math.floor(Math.random() * kandidatLawan.length);
    const lawanAcak = kandidatLawan[indeksLawan] ?? teracak[0];
    hasil.push({
      kiri: siswaTerakhir,
      kanan: lawanAcak,
      siswaMainDuaKali: lawanAcak,
    });
  }
  return hasil;
}

/**
 * Mengundi daftar nama siswa menjadi pasangan duel 1 lawan 1 secara acak.
 */
export function undiPasanganDuel(daftarNama: readonly string[]): [string, string][] {
  return buatPasanganDuelDenganTanda(daftarNama).map((p) => [p.kiri, p.kanan]);
}

/**
 * Mengelompokkan soal berdasarkan tingkat dan topik lalu menyusunnya bergantian
 * agar pembagian kiri & kanan seimbang per tingkat dan topik.
 */
function urutkanSeimbangUntukSplit(kumpulan: readonly Soal[]): Soal[] {
  const grupMap = new Map<string, Soal[]>();

  for (const soal of kumpulan) {
    const kunciGrup = `${soal.tingkat ?? 'Umum'}::${(soal.topik ?? 'Umum').trim().toLowerCase()}`;
    const isi = grupMap.get(kunciGrup) ?? [];
    isi.push(soal);
    grupMap.set(kunciGrup, isi);
  }

  const daftarGrup = acakFisherYates(Array.from(grupMap.values())).map((grup) =>
    acakFisherYates(grup)
  );

  // Gabungkan tiap grup berurutan berpasangan agar indeks genap-ganjil dari grup yang sama
  // jatuh ke tim kiri dan kanan secara merata.
  const aliranBerpasangan: Soal[] = [];
  const sisaGanjil: Soal[] = [];

  for (const grup of daftarGrup) {
    const batasGenap = grup.length - (grup.length % 2);
    for (let i = 0; i < batasGenap; i += 1) {
      aliranBerpasangan.push(grup[i]);
    }
    if (grup.length % 2 === 1) {
      sisaGanjil.push(grup[grup.length - 1]);
    }
  }

  return [...aliranBerpasangan, ...sisaGanjil];
}

function hitungRingkasanSoal(dek: readonly Soal[]): Record<string, number> {
  const ringkasan: Record<string, number> = {};
  for (const s of dek) {
    const label = s.tingkat ?? 'Umum';
    ringkasan[label] = (ringkasan[label] ?? 0) + 1;
  }
  return ringkasan;
}

/**
 * Membagi soal untuk satu pertandingan secara adil, seimbang per tingkat & topik,
 * tanpa pengulangan antar tim maupun antar pertandingan selama bank masih cukup.
 */
export function bagiSoalPertandingan(
  bankSoal: readonly Soal[],
  terpakaiIdsSebelumnya: ReadonlySet<string> | readonly string[],
  jumlahSoalPerTim: number,
  jumlahCadangan = 5
): HasilPembagianPertandingan {
  const setTerpakai = new Set<string>(
    Array.isArray(terpakaiIdsSebelumnya)
      ? terpakaiIdsSebelumnya
      : Array.from(terpakaiIdsSebelumnya)
  );

  const soalUtama = bankSoal.filter((s) => !s.cadangan);
  const soalCadanganKhusus = bankSoal.filter((s) => Boolean(s.cadangan));

  if (bankSoal.length === 0) {
    return {
      dekKiri: [],
      dekKanan: [],
      dekKiriSiswa: [],
      dekKananSiswa: [],
      cadangan: [],
      cadanganSiswa: [],
      terpakaiIdsSesudah: Array.from(setTerpakai),
      bankDiacakUlang: false,
      ringkasanKiri: {},
      ringkasanKanan: {},
    };
  }

  const targetPerTim = Math.max(1, jumlahSoalPerTim);
  let bankDiacakUlang = false;

  const dekKiriRaw: Soal[] = [];
  const dekKananRaw: Soal[] = [];

  if (soalUtama.length > 0) {
    // Kumpulkan soal utama yang belum terpakai pada sesi ini
    let kolamTersedia = soalUtama.filter((s) => !setTerpakai.has(s.id));

    const ambilDariKolam = (kolam: readonly Soal[], maksimalPasang: number): Set<string> => {
      const terurutSeimbang = urutkanSeimbangUntukSplit(kolam);
      const terambil = new Set<string>();
      let idx = 0;
      while (idx + 1 < terurutSeimbang.length && dekKiriRaw.length < maksimalPasang) {
        const soalKiri = terurutSeimbang[idx];
        const soalKanan = terurutSeimbang[idx + 1];
        dekKiriRaw.push(soalKiri);
        dekKananRaw.push(soalKanan);
        terambil.add(soalKiri.id);
        terambil.add(soalKanan.id);
        idx += 2;
      }
      return terambil;
    };

    // Putaran 1: gunakan hanya soal utama yang belum terpakai di pertandingan sebelumnya
    const terambilPutaran1 = ambilDariKolam(kolamTersedia, targetPerTim);
    terambilPutaran1.forEach((id) => setTerpakai.add(id));

    // Jika masih kurang (bank soal habis), acak ulang bank soal utama dan tandai peringatan
    let putaranPengaman = 0;
    while (dekKiriRaw.length < targetPerTim && putaranPengaman < 20) {
      bankDiacakUlang = true;
      putaranPengaman += 1;

      if (soalUtama.length >= 2) {
        const sisaPutaran = kolamTersedia.filter((s) => !terambilPutaran1.has(s.id));
        const sumberUlang = sisaPutaran.length >= 2 ? sisaPutaran : soalUtama;
        const terambil = ambilDariKolam(sumberUlang, targetPerTim);
        terambil.forEach((id) => setTerpakai.add(id));
        kolamTersedia = [];
      } else {
        dekKiriRaw.push(soalUtama[0]);
        dekKananRaw.push(soalUtama[0]);
        setTerpakai.add(soalUtama[0].id);
      }
    }
  }

  // Acak urutan di dalam masing-masing dek agar pola topik/tingkat tidak tertebak
  const dekKiri = acakFisherYates(dekKiriRaw);
  const dekKanan = acakFisherYates(dekKananRaw);

  // Soal cadangan HANYA berasal dari kategori Soal Cadangan (Penentu), tidak pernah mengulang soal biasa
  const idTerpakaiLagaIni = new Set<string>([
    ...dekKiri.map((s) => s.id),
    ...dekKanan.map((s) => s.id),
  ]);
  const kandidatCadanganUtama = acakFisherYates(
    soalCadanganKhusus.filter((s) => !setTerpakai.has(s.id) && !idTerpakaiLagaIni.has(s.id))
  );
  const kandidatCadanganSekunder = acakFisherYates(
    soalCadanganKhusus.filter((s) => !idTerpakaiLagaIni.has(s.id))
  );

  const cadangan: Soal[] = [];
  for (const s of kandidatCadanganUtama) {
    if (cadangan.length >= jumlahCadangan) break;
    cadangan.push(s);
    setTerpakai.add(s.id);
  }
  for (const s of kandidatCadanganSekunder) {
    if (cadangan.length >= jumlahCadangan) break;
    if (!cadangan.some((c) => c.id === s.id)) {
      cadangan.push(s);
    }
  }

  return {
    dekKiri,
    dekKanan,
    dekKiriSiswa: ambilDaftarSoalUntukSiswa(dekKiri),
    dekKananSiswa: ambilDaftarSoalUntukSiswa(dekKanan),
    cadangan,
    cadanganSiswa: ambilDaftarSoalUntukSiswa(cadangan),
    terpakaiIdsSesudah: Array.from(setTerpakai),
    bankDiacakUlang,
    ringkasanKiri: hitungRingkasanSoal(dekKiri),
    ringkasanKanan: hitungRingkasanSoal(dekKanan),
  };
}

/**
 * Menghitung perkiraan kebutuhan soal berdasarkan mode, akhir permainan, dan durasi.
 */
export function hitungPerkiraanKebutuhanSoal(
  pengaturan: Pengaturan,
  jumlahBankSoal: number
): PerkiraanKebutuhanSoal {
  const faktorMode = pengaturan.mode === '4tim' ? 3 : 1;
  const durasiMenit = Math.max(0.5, pengaturan.durasiWaktu || 3);

  let soalPerTimPerLaga = 15;
  if (pengaturan.akhirPermainan === 'soalHabis') {
    soalPerTimPerLaga = Math.max(5, Math.floor(jumlahBankSoal / 2));
  } else {
    // Acuan: 3 menit ≈ 40 soal per tim per pertandingan (disesuaikan halus dengan durasi per soal)
    const pengaliDurasi =
      pengaturan.durasiSoal === 10 ? 1.15 : pengaturan.durasiSoal === 20 ? 0.85 : 1;
    soalPerTimPerLaga = Math.max(5, Math.round((durasiMenit / 3) * 40 * pengaliDurasi));
  }

  const totalSoalDibutuhkan = soalPerTimPerLaga * 2 * faktorMode + 5 * faktorMode;
  const bankCukup = jumlahBankSoal >= totalSoalDibutuhkan;

  const pesanUtama =
    '3 menit ≈ 40 soal per tim per pertandingan; mode 4 tim butuh sekitar 3 kali lipat.';

  const pesanPeringatan = bankCukup
    ? null
    : `Bank soal berisi ${jumlahBankSoal} soal (perkiraan kebutuhan ±${totalSoalDibutuhkan} soal). Permainan tetap bisa dimulai—soal akan diacak ulang otomatis bila bank habis.`;

  return {
    soalPerTimPerLaga,
    jumlahLaga: faktorMode,
    totalSoalDibutuhkan,
    bankCukup,
    pesanUtama,
    pesanPeringatan,
  };
}

/**
 * Peringatan non-blokir di layar Pengaturan sebelum pertandingan dimulai.
 */
export function ambilPeringatanAwalDuel(game: Game): string[] {
  const peringatan: string[] = [];
  const soalUtama = game.soal.filter((s) => !s.cadangan);
  const soalCadangan = game.soal.filter((s) => Boolean(s.cadangan));
  const soalPerTim = Math.floor(soalUtama.length / 2);

  if (soalPerTim < 10 && game.pengaturan.akhirPermainan !== 'soalHabis') {
    peringatan.push(
      'Soal bisa habis sebelum waktu selesai, tambahkan soal atau ubah ke mode Habis Soal'
    );
  }

  if (soalCadangan.length === 0) {
    peringatan.push(
      'Tidak ada soal cadangan. Jika imbang, penentu memakai tukar soal dan kecepatan.'
    );
  }

  return peringatan;
}

/**
 * Memvalidasi kesiapan game sebelum tombol MULAI DUEL membuka arena.
 */
export function validasiMulaiDuel(game: Game): HasilValidasiMulaiDuel {
  const pesanError: string[] = [];
  const soalUtama = game.soal.filter((s) => !s.cadangan);

  if (game.soal.length < 10) {
    pesanError.push(
      `Minimal 10 soal valid diperlukan untuk memulai duel (saat ini baru ${game.soal.length} soal).`
    );
  } else if (soalUtama.length < 2) {
    pesanError.push(
      'Minimal 2 soal utama (non-cadangan) diperlukan agar kedua tim memiliki soal pertandingan.'
    );
  }

  const jumlahTimWajib = game.pengaturan.mode === '4tim' ? 4 : 2;
  for (let i = 0; i < jumlahTimWajib; i += 1) {
    const nama = (game.pengaturan.namaTim[i] ?? '').trim();
    if (!nama) {
      pesanError.push(`Nama Tim ${i + 1} tidak boleh kosong.`);
    }
  }

  return {
    valid: pesanError.length === 0,
    pesanError,
  };
}

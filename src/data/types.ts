export type TingkatSoal = 'Mudah' | 'Sedang' | 'Sulit';

export type ModePermainan = '2tim' | '4tim' | '1lawan1';

export type AkhirPermainan = 'waktu' | 'soalHabis' | 'keduanya';

export type JumlahPenarik = 3 | 4 | 5;

export type DurasiSoalDetik = 10 | 15 | 20;

export type ModeJikaImbang = 'otomatis' | 'kecepatan' | 'seri';

export interface Soal {
  id: string;
  pertanyaan: string;
  kode?: string;
  pilihan: string[]; // 2..4 pilihan jawaban
  kunci: number; // Indeks 0..pilihan.length-1 (hanya untuk guru & engine)
  penjelasan?: string;
  tingkat?: TingkatSoal;
  topik?: string;
  bonus?: boolean;
  cadangan?: boolean;
}

/**
 * Representasi soal untuk tampilan siswa: TANPA kunci dan penjelasan sebelum menjawab.
 */
export type SoalSiswa = Omit<Soal, 'kunci' | 'penjelasan'>;

export interface Pengaturan {
  mode: ModePermainan;
  namaTim: string[];
  anggota: string[][];
  jumlahPenarik: JumlahPenarik;
  durasiSoal: DurasiSoalDetik;
  akhirPermainan: AkhirPermainan;
  durasiWaktu: number; // dalam menit
  langkahKeGaris: number;
  salahMenarikLawan: boolean;
  bonus: boolean;
  penjelasan: boolean;
  ulangiSoal: boolean;
  suara: boolean;
  musik: boolean;
  pinGuru?: string;
  modeRekam: boolean;
  efekRingan: boolean;
  jikaImbang?: ModeJikaImbang;
}

export interface Game {
  id: string;
  judul: string;
  mapel: string;
  namaSekolah: string;
  soal: Soal[];
  pengaturan: Pengaturan;
  status?: 'draf' | 'siap';
  dibuatPada: number;
  diubahPada: number;
}

export type TimSisi = 'merah' | 'biru';

export interface RiwayatTarikan {
  id: string;
  urutan: number;
  tim: TimSisi;
  pemain: string;
  soalId: string;
  pilihanDipilih: number | null; // null jika waktu habis
  benar: boolean;
  arahTarikan: TimSisi | 'netral';
  besarLangkah: number;
  posisiTaliSesudah: number;
  waktuSisaDetik: number;
}

export type RuteHash =
  | '/'
  | '/game-saya'
  | '/buat-game'
  | '/pengaturan'
  | '/turnamen'
  | '/duel'
  | '/main'
  | '/hasil'
  | '/panduan'
  | '/impor'
  | '/g'
  | '/online'
  | '/kode';

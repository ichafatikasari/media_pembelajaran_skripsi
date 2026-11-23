import { ModePermainan, Soal } from '../data/types';
import {
  analisisSoalDariLog,
  hitungRingkasanDariLog,
  SoalReferensiAnalisis,
} from '../engine/hasilRekap';
import { RiwayatTarikanMatch } from '../engine/match';
import { EntriRiwayatHasil, formatTanggalJamHasil } from './riwayatHasil';

export interface DataLagaCsv {
  labelLaga: string;
  namaTimKiri: string;
  namaTimKanan: string;
  riwayat: readonly RiwayatTarikanMatch[];
}

function escapeCsvCell(nilai: string | number | boolean): string {
  const teks = String(nilai);
  if (/[",\r\n]/.test(teks)) {
    return `"${teks.replace(/"/g, '""')}"`;
  }
  return teks;
}

function labelMode(mode: ModePermainan): string {
  if (mode === '4tim') return '4 Tim (Turnamen)';
  if (mode === '1lawan1') return '1 Lawan 1 (Duel)';
  return '2 Tim';
}

/**
 * Menghasilkan konten CSV ber-UTF-8 BOM agar Excel membuka huruf Indonesia dengan benar.
 * Kolom: mode, pertandingan, tim, pemain, soal, jawaban benar/salah, waktu.
 */
export function buatCsvRekap(
  judulGame: string,
  mode: ModePermainan,
  daftarLaga: readonly DataLagaCsv[],
  bankSoal: readonly Soal[]
): string {
  const petaSoal = new Map<string, Soal>();
  for (const s of bankSoal) {
    petaSoal.set(s.id, s);
  }

  const header = [
    'Judul Game',
    'Mode',
    'Pertandingan',
    'Urutan',
    'Tim',
    'Pemain',
    'Soal',
    'Jawaban Dipilih',
    'Status (Benar/Salah)',
    'Perubahan Tali',
    'Posisi Tali Sesudah',
    'Waktu (detik)',
  ];

  const baris: string[] = [header.map(escapeCsvCell).join(',')];
  const teksMode = labelMode(mode);

  for (const laga of daftarLaga) {
    if (laga.riwayat.length === 0) {
      baris.push(
        [
          judulGame,
          teksMode,
          laga.labelLaga,
          0,
          `${laga.namaTimKiri} vs ${laga.namaTimKanan}`,
          '-',
          'Belum ada jawaban tercatat',
          '-',
          '-',
          0,
          0,
          0,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
      continue;
    }

    for (const r of laga.riwayat) {
      const soalObj = petaSoal.get(r.soalId);
      const teksSoal = soalObj?.pertanyaan ?? (r.soalId === '-' ? 'Koreksi Manual Guru' : r.soalId);
      const namaTim = r.tim === 'merah' ? laga.namaTimKiri : laga.namaTimKanan;
      const jawabanTeks =
        r.pilihanDipilih !== null && soalObj?.pilihan[r.pilihanDipilih]
          ? `${String.fromCharCode(65 + r.pilihanDipilih)}. ${soalObj.pilihan[r.pilihanDipilih]}`
          : r.jenis === 'waktuHabis'
            ? 'Waktu Habis'
            : r.jenis === 'manual'
              ? 'Manual'
              : '-';
      const statusTeks =
        r.jenis === 'manual'
          ? 'Manual'
          : r.jenis === 'waktuHabis'
            ? 'Salah (Waktu Habis)'
            : r.jenis === 'penentuan'
              ? r.benar
                ? 'Penentuan (Benar)'
                : 'Penentuan (Salah)'
              : r.benar
                ? r.jenis === 'bonus'
                  ? 'Benar (Bonus x2)'
                  : 'Benar'
                : 'Salah';

      baris.push(
        [
          judulGame,
          teksMode,
          laga.labelLaga,
          r.urutan,
          namaTim,
          r.pemain,
          teksSoal,
          jawabanTeks,
          statusTeks,
          r.perubahanLangkah,
          r.posisiTaliSesudah,
          r.waktuDetik,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
  }

  return '\uFEFF' + baris.join('\r\n');
}

/**
 * Menghasilkan CSV rekap per pemain dengan kolom standar:
 * Pemain, Tim, Giliran, Benar, Salah, Akurasi (%), Jawaban Tercepat (detik), Judul Game, Mode, Tanggal.
 */
export function buatCsvRekapPemain(entri: EntriRiwayatHasil): string {
  const ringkas = hitungRingkasanDariLog(entri.riwayat, {
    rosterKiri: entri.rosterKiri,
    rosterKanan: entri.rosterKanan,
  });

  const header = [
    'Pemain',
    'Tim',
    'Giliran',
    'Benar',
    'Salah',
    'Akurasi (%)',
    'Jawaban Tercepat (detik)',
    'Judul Game',
    'Mode',
    'Tanggal',
  ];

  const tanggal = formatTanggalJamHasil(entri.dibuatPada);
  const teksMode = labelMode(entri.mode);
  const baris: string[] = [header.map(escapeCsvCell).join(',')];

  if (ringkas.rekapPemain.length === 0) {
    baris.push(
      ['-', '-', 0, 0, 0, 0, '-', entri.judulGame, teksMode, tanggal]
        .map(escapeCsvCell)
        .join(',')
    );
  } else {
    for (const p of ringkas.rekapPemain) {
      const namaTim = p.tim === 'merah' ? entri.namaTimKiri : entri.namaTimKanan;
      const tercepatDetik =
        p.tercepatMs !== null ? (p.tercepatMs / 1000).toFixed(1) : '-';
      baris.push(
        [
          p.nama,
          namaTim,
          p.soal,
          p.benar,
          p.salah,
          p.akurasi,
          tercepatDetik,
          entri.judulGame,
          teksMode,
          tanggal,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
  }

  return '\uFEFF' + baris.join('\r\n');
}

/**
 * Menghasilkan CSV Analisis Soal, diurutkan dari yang paling sering salah (% benar terendah).
 */
export function buatCsvAnalisisSoal(
  entri: EntriRiwayatHasil,
  daftarSoal: readonly SoalReferensiAnalisis[]
): string {
  const analisis = analisisSoalDariLog(
    entri.riwayat,
    daftarSoal.length > 0 ? daftarSoal : entri.soalSnapshot
  );

  const header = [
    'Urutan',
    'Soal',
    'Jawaban Benar',
    'Dijawab',
    'Benar',
    'Salah',
    'Persentase Benar (%)',
    'Status Ulasan',
    'Judul Game',
    'Tanggal',
  ];

  const tanggal = formatTanggalJamHasil(entri.dibuatPada);
  const baris: string[] = [header.map(escapeCsvCell).join(',')];

  if (analisis.length === 0) {
    baris.push(
      [1, 'Belum ada soal yang terjawab', '-', 0, 0, 0, 0, '-', entri.judulGame, tanggal]
        .map(escapeCsvCell)
        .join(',')
    );
  } else {
    analisis.forEach((item, idx) => {
      const kunciTeks = `${item.jawabanBenarHuruf}. ${item.jawabanBenarTeks}`;
      baris.push(
        [
          idx + 1,
          item.pertanyaan,
          kunciTeks,
          item.totalDijawab,
          item.jumlahBenar,
          item.jumlahSalah,
          item.persenBenar,
          item.perluDiulas ? 'Perlu diulas' : 'Baik',
          entri.judulGame,
          tanggal,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    });
  }

  return '\uFEFF' + baris.join('\r\n');
}

export function unduhCsvRekap(namaFile: string, kontenCsv: string): void {
  const isiDenganBom = kontenCsv.startsWith('\uFEFF') ? kontenCsv : `\uFEFF${kontenCsv}`;
  const blob = new Blob([isiDenganBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.download = namaFile;
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

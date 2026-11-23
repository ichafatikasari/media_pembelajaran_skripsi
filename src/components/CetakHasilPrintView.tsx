import React from 'react';
import {
  analisisSoalDariLog,
  formatDetikSingkat,
  hitungRingkasanDariLog,
  SoalReferensiAnalisis,
} from '../engine/hasilRekap';
import {
  EntriRiwayatHasil,
  formatDurasiPertandingan,
  formatSkorRingkasEntri,
  formatTanggalJamHasil,
} from '../utils/riwayatHasil';

interface CetakHasilPrintViewProps {
  entri: EntriRiwayatHasil | null;
  daftarSoal: readonly SoalReferensiAnalisis[];
}

/**
 * Tampilan cetak hemat tinta (latar putih, teks hitam) yang hanya muncul saat @media print.
 */
export const CetakHasilPrintView: React.FC<CetakHasilPrintViewProps> = ({
  entri,
  daftarSoal,
}) => {
  if (!entri) return null;

  const ringkas = hitungRingkasanDariLog(entri.riwayat, {
    rosterKiri: entri.rosterKiri,
    rosterKanan: entri.rosterKanan,
  });
  const analisisSoal = analisisSoalDariLog(entri.riwayat, daftarSoal);

  return (
    <div className="area-cetak-hasil hidden print:block bg-white p-6 text-black">
      <div className="border-b-2 border-black pb-3">
        <h1 className="text-2xl font-bold">
          LAPORAN HASIL PERTANDINGAN — {entri.judulGame}
        </h1>
        <p className="mt-1 text-sm">
          {entri.labelLaga}
          {entri.mapel ? ` · Mapel: ${entri.mapel}` : ''}
          {entri.namaSekolah ? ` · ${entri.namaSekolah}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-neutral-700">
          Tanggal: {formatTanggalJamHasil(entri.dibuatPada)} · Durasi:{' '}
          {formatDurasiPertandingan(entri.durasiDetik)} · Mode:{' '}
          {entri.mode === '4tim'
            ? '4 Tim (Turnamen)'
            : entri.mode === '1lawan1'
              ? '1 Lawan 1 (Duel)'
              : '2 Tim'}
        </p>
      </div>

      {/* Ringkasan Utama */}
      <div className="my-4 grid grid-cols-3 gap-3 border border-black p-3 text-sm">
        <div>
          <div className="font-bold">Hasil Akhir</div>
          <div className="text-base font-bold">{formatSkorRingkasEntri(entri)}</div>
          <div className="text-xs">
            Selisih Tali:{' '}
            {ringkas.posisiTaliAkhir > 0
              ? `+${ringkas.posisiTaliAkhir}`
              : ringkas.posisiTaliAkhir}{' '}
            · Total Soal Terjawab: {ringkas.totalSoalTerjawab}
          </div>
        </div>
        <div>
          <div className="font-bold">{entri.namaTimKiri}</div>
          <div>
            {ringkas.skorMerah} Benar · {ringkas.skorSalahMerah} Salah (Akurasi {ringkas.akurasiMerah}%)
          </div>
          <div className="mt-1 font-bold">{entri.namaTimKanan}</div>
          <div>
            {ringkas.skorBiru} Benar · {ringkas.skorSalahBiru} Salah (Akurasi {ringkas.akurasiBiru}%)
          </div>
        </div>
        <div>
          <div className="font-bold">Akurasi Keseluruhan</div>
          <div>{ringkas.akurasiTotal}%</div>
          <div className="mt-1 font-bold">Jawaban Tercepat</div>
          <div>
            {ringkas.jawabanTercepat
              ? `${ringkas.jawabanTercepat.pemain} (${formatDetikSingkat(
                  ringkas.jawabanTercepat.waktuMs
                )})`
              : '-'}
          </div>
        </div>
      </div>

      {/* Rekap Per Pemain */}
      <h2 className="mt-5 mb-2 text-base font-bold">Rekap Per Pemain</h2>
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1 text-left">Pemain</th>
            <th className="border border-black px-2 py-1 text-left">Tim</th>
            <th className="border border-black px-2 py-1 text-right">Giliran</th>
            <th className="border border-black px-2 py-1 text-right">Benar</th>
            <th className="border border-black px-2 py-1 text-right">Salah</th>
            <th className="border border-black px-2 py-1 text-right">Akurasi</th>
            <th className="border border-black px-2 py-1 text-right">Tercepat</th>
          </tr>
        </thead>
        <tbody>
          {ringkas.rekapPemain.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-black px-2 py-2 text-center">
                Belum ada catatan jawaban pemain.
              </td>
            </tr>
          ) : (
            ringkas.rekapPemain.map((p, idx) => (
              <tr key={`${p.tim}_${p.nama}_${idx}`}>
                <td className="border border-black px-2 py-1 font-semibold">{p.nama}</td>
                <td className="border border-black px-2 py-1">
                  {p.tim === 'merah' ? entri.namaTimKiri : entri.namaTimKanan}
                </td>
                <td className="border border-black px-2 py-1 text-right">{p.soal}</td>
                <td className="border border-black px-2 py-1 text-right">{p.benar}</td>
                <td className="border border-black px-2 py-1 text-right">{p.salah}</td>
                <td className="border border-black px-2 py-1 text-right">{p.akurasi}%</td>
                <td className="border border-black px-2 py-1 text-right">
                  {formatDetikSingkat(p.tercepatMs)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Analisis Soal */}
      <h2 className="mt-6 mb-2 text-base font-bold">
        Analisis Soal (Diurutkan dari yang Paling Sering Salah)
      </h2>
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1 text-left">No</th>
            <th className="border border-black px-2 py-1 text-left">Pertanyaan &amp; Kunci Benar</th>
            <th className="border border-black px-2 py-1 text-right">Dijawab</th>
            <th className="border border-black px-2 py-1 text-right">Benar</th>
            <th className="border border-black px-2 py-1 text-right">Salah</th>
            <th className="border border-black px-2 py-1 text-right">% Benar</th>
            <th className="border border-black px-2 py-1 text-left">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {analisisSoal.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-black px-2 py-2 text-center">
                Belum ada soal yang terjawab pada pertandingan ini.
              </td>
            </tr>
          ) : (
            analisisSoal.map((s, idx) => (
              <tr key={s.soalId}>
                <td className="border border-black px-2 py-1 align-top">{idx + 1}</td>
                <td className="border border-black px-2 py-1 align-top">
                  <div className="font-semibold">{s.pertanyaan}</div>
                  <div className="mt-0.5 text-neutral-700">
                    Kunci Benar: <strong>{s.jawabanBenarHuruf}. {s.jawabanBenarTeks}</strong>
                  </div>
                </td>
                <td className="border border-black px-2 py-1 text-right align-top">
                  {s.totalDijawab}
                </td>
                <td className="border border-black px-2 py-1 text-right align-top">
                  {s.jumlahBenar}
                </td>
                <td className="border border-black px-2 py-1 text-right align-top">
                  {s.jumlahSalah}
                </td>
                <td className="border border-black px-2 py-1 text-right align-top font-bold">
                  {s.persenBenar}%
                </td>
                <td className="border border-black px-2 py-1 align-top font-semibold">
                  {s.perluDiulas ? 'Perlu diulas' : 'Baik'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

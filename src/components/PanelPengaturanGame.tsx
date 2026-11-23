import React from 'react';
import { AlertTriangle, CheckCircle2, Dices, Download, Lock, Users } from 'lucide-react';
import { usePwa } from '../app/PwaContext';
import {
  AkhirPermainan,
  DurasiSoalDetik,
  JumlahPenarik,
  ModeJikaImbang,
  ModePermainan,
  Pengaturan,
} from '../data/types';
import {
  buatPasanganDuelDenganTanda,
  parseDaftarNama,
  PasanganDuelTerundi,
  PerkiraanKebutuhanSoal,
} from '../engine/deal';
import { aturVolumeAudio } from '../utils/audio';
import { AlamatAplikasiControl } from './AlamatAplikasiControl';
import { Button3D } from './Button3D';
import { JenisToast } from './Toast';

export const DEFAULT_NAMA_TIM = ['Tim Merah', 'Tim Biru', 'Tim Hijau', 'Tim Kuning'];

export function normalisasiPengaturanAwal(p: Pengaturan): Pengaturan {
  const namaTim = [0, 1, 2, 3].map((i) => p.namaTim[i] ?? DEFAULT_NAMA_TIM[i]);
  const anggota = [0, 1, 2, 3].map((i) => p.anggota[i] ?? []);
  return {
    ...p,
    namaTim,
    anggota,
    langkahKeGaris: Math.min(10, Math.max(3, p.langkahKeGaris || 6)),
    jikaImbang: p.jikaImbang ?? 'otomatis',
    pinGuru: p.pinGuru ?? '',
  };
}

export function bentukPengaturanFinalDariForm(
  form: Pengaturan,
  teksAnggota: readonly string[],
  teksDaftarDuel: string
): Pengaturan {
  const anggotaBersih = teksAnggota.map((teks) => parseDaftarNama(teks));
  if (form.mode === '1lawan1') {
    const semuaDuel = parseDaftarNama(teksDaftarDuel);
    if (semuaDuel.length >= 2) {
      anggotaBersih[0] = semuaDuel.filter((_, i) => i % 2 === 0);
      anggotaBersih[1] = semuaDuel.filter((_, i) => i % 2 === 1);
    }
  }
  return {
    ...form,
    namaTim: form.namaTim.map((n) => n.trim()),
    anggota: anggotaBersih,
    langkahKeGaris: Math.min(10, Math.max(3, Number(form.langkahKeGaris) || 6)),
    durasiWaktu: Math.max(0.5, Number(form.durasiWaktu) || 3),
    pinGuru: (form.pinGuru ?? '').replace(/\D/g, '').slice(0, 4),
  };
}

interface PanelPengaturanGameProps {
  tampilkanIdentitas?: boolean;
  judul?: string;
  mapel?: string;
  namaSekolah?: string;
  onChangeJudul?: (v: string) => void;
  onChangeMapel?: (v: string) => void;
  onChangeNamaSekolah?: (v: string) => void;
  form: Pengaturan;
  setForm: React.Dispatch<React.SetStateAction<Pengaturan>>;
  teksAnggota: string[];
  setTeksAnggota: React.Dispatch<React.SetStateAction<string[]>>;
  teksDaftarDuel: string;
  setTeksDaftarDuel: React.Dispatch<React.SetStateAction<string>>;
  pasanganDuel: PasanganDuelTerundi[];
  setPasanganDuel: React.Dispatch<React.SetStateAction<PasanganDuelTerundi[]>>;
  jumlahSoalUtama: number;
  perkiraanSoal: PerkiraanKebutuhanSoal;
  peringatanAwal: string[];
  volumeSuara: number;
  setVolumeSuara: React.Dispatch<React.SetStateAction<number>>;
  onToast: (pesan: string, jenis?: JenisToast) => void;
}

export const PanelPengaturanGame: React.FC<PanelPengaturanGameProps> = ({
  tampilkanIdentitas = true,
  judul = '',
  mapel = '',
  namaSekolah = '',
  onChangeJudul,
  onChangeMapel,
  onChangeNamaSekolah,
  form,
  setForm,
  teksAnggota,
  setTeksAnggota,
  teksDaftarDuel,
  setTeksDaftarDuel,
  pasanganDuel,
  setPasanganDuel,
  jumlahSoalUtama,
  perkiraanSoal,
  peringatanAwal,
  volumeSuara,
  setVolumeSuara,
  onToast,
}) => {
  const { isInstalled, pasangAplikasi } = usePwa();
  const jumlahTimTampil = form.mode === '4tim' ? 4 : 2;

  const ubahMode = (modeBaru: ModePermainan) => {
    setForm((prev) => ({
      ...prev,
      mode: modeBaru,
      durasiWaktu: modeBaru === '1lawan1' ? 1 : prev.durasiWaktu === 1 ? 3 : prev.durasiWaktu,
    }));
  };

  const ubahNamaTim = (indeks: number, nilai: string) => {
    const salinan = [...form.namaTim];
    salinan[indeks] = nilai;
    setForm({ ...form, namaTim: salinan });
  };

  const handleUndiPasanganDuel = () => {
    const daftar = parseDaftarNama(teksDaftarDuel);
    if (daftar.length < 2) {
      onToast('Masukkan minimal 2 nama siswa untuk diundi menjadi pasangan duel.', 'peringatan');
      return;
    }
    const hasil = buatPasanganDuelDenganTanda(daftar);
    setPasanganDuel(hasil);
    const adaGanjil = hasil.find((p) => p.siswaMainDuaKali);
    onToast(
      adaGanjil
        ? `Terbentuk ${hasil.length} pasangan duel (${adaGanjil.siswaMainDuaKali} mendapat lawan ke-2 acak).`
        : `Terbentuk ${hasil.length} pasangan duel acak.`,
      'sukses'
    );
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
      {/* KOLOM 1: Identitas (opsional), Mode, Nama Tim, Daftar Nama Siswa */}
      <div className="scroll-guru col-span-5 flex flex-col gap-3 rounded-3xl border-3 border-[#3C62D4] bg-[#12276B] p-5 shadow-[0_8px_0_#071236]">
        {tampilkanIdentitas && (
          <div className="grid grid-cols-12 gap-2.5">
            <label className="col-span-5">
              <span className="font-display text-xs font-bold text-[#FFD400]">Judul Game</span>
              <input
                type="text"
                value={judul}
                onChange={(e) => onChangeJudul?.(e.target.value)}
                className="mt-1 min-h-[42px] w-full rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-bold text-white focus:border-[#FFD400] focus:outline-none"
              />
            </label>
            <label className="col-span-4">
              <span className="font-display text-xs font-bold text-[#FFD400]">Mapel / Kelas</span>
              <input
                type="text"
                value={mapel}
                onChange={(e) => onChangeMapel?.(e.target.value)}
                placeholder="Bebas"
                className="mt-1 min-h-[42px] w-full rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-bold text-white focus:border-[#FFD400] focus:outline-none"
              />
            </label>
            <label className="col-span-3">
              <span className="font-display text-xs font-bold text-[#FFD400]">Sekolah (Opsional)</span>
              <input
                type="text"
                value={namaSekolah}
                onChange={(e) => onChangeNamaSekolah?.(e.target.value)}
                placeholder="Kosongkan"
                className="mt-1 min-h-[42px] w-full rounded-xl border-2 border-[#3C62D4] bg-[#071236] px-3 text-sm font-bold text-white focus:border-[#FFD400] focus:outline-none"
              />
            </label>
          </div>
        )}

        {/* Mode Susunan */}
        <div>
          <span className="font-display mb-1.5 block text-xs font-bold text-[#FFD400]">
            Mode Susunan Pertandingan
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: '2tim', label: '2 TIM' },
                { id: '4tim', label: '4 TIM (Turnamen)' },
                { id: '1lawan1', label: '1 LAWAN 1 (Duel)' },
              ] as { id: ModePermainan; label: string }[]
            ).map((m) => (
              <Button3D
                key={m.id}
                variant={form.mode === m.id ? 'kuning' : 'navy'}
                size="sm"
                className="!px-2 !text-sm"
                onClick={() => ubahMode(m.id)}
              >
                {m.label}
              </Button3D>
            ))}
          </div>
          {form.mode === '4tim' && (
            <p className="mt-1 text-xs font-semibold text-[#DCE7FF]">
              Dua semifinal (Tim 1 vs 2 dan Tim 3 vs 4), lalu final. Arena tiap laga tetap Merah vs Biru.
            </p>
          )}
        </div>

        {/* Nama Tiap Tim */}
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: jumlahTimTampil }, (_, idx) => {
            const borderTim =
              idx === 0
                ? 'border-[#FF1744]'
                : idx === 1
                  ? 'border-[#1E6BFF]'
                  : idx === 2
                    ? 'border-[#00C853]'
                    : 'border-[#FFD400]';
            return (
              <label key={idx}>
                <span className="font-display text-xs font-bold text-white">
                  Nama Tim {idx + 1}
                </span>
                <input
                  type="text"
                  value={form.namaTim[idx] ?? ''}
                  onChange={(e) => ubahNamaTim(idx, e.target.value)}
                  placeholder={DEFAULT_NAMA_TIM[idx]}
                  className={`mt-1 min-h-[42px] w-full rounded-xl border-2 bg-[#071236] px-3 text-sm font-bold text-white focus:outline-none ${borderTim}`}
                />
              </label>
            );
          })}
        </div>

        {/* Daftar Nama Siswa / Estafet */}
        {form.mode === '1lawan1' ? (
          <div className="flex flex-1 flex-col gap-2 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-[#FFD400]">
                Tempel Daftar Siswa untuk Diundi Acak (1 nama/baris)
              </span>
              <Button3D variant="ungu" size="sm" onClick={handleUndiPasanganDuel}>
                <Dices size={18} />
                <span>Undi Pasangan</span>
              </Button3D>
            </div>
            <textarea
              rows={4}
              value={teksDaftarDuel}
              onChange={(e) => setTeksDaftarDuel(e.target.value)}
              placeholder={'Contoh:\nRani\nBudi\nCitra\nDewi'}
              className="scroll-guru w-full rounded-xl border-2 border-[#2A4CB8] bg-[#0B1B4D] p-2.5 text-sm font-semibold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
            />
            {pasanganDuel.length > 0 && (
              <div className="text-xs font-bold text-[#57E893]">
                Hasil undian:{' '}
                {pasanganDuel
                  .map(
                    (p, i) =>
                      `${i + 1}. ${p.kiri} vs ${p.kanan}${
                        p.siswaMainDuaKali ? ` [${p.siswaMainDuaKali} main 2x]` : ''
                      }`
                  )
                  .join(' · ')}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display flex items-center gap-1.5 text-xs font-bold text-[#FFD400]">
                <Users size={15} />
                <span>
                  Daftar Nama Pemain (opsional, 1 nama/baris; kosong = Pemain 1, 2...)
                </span>
              </span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2.5">
              {Array.from({ length: jumlahTimTampil }, (_, idx) => {
                const namaBersih = parseDaftarNama(teksAnggota[idx] ?? '');
                return (
                  <div key={idx} className="flex flex-col rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <span className="truncate text-white">
                        {form.namaTim[idx] || DEFAULT_NAMA_TIM[idx]}
                      </span>
                      <span className="tabular-angka text-[#FFD400]">
                        {namaBersih.length > 0 ? `${namaBersih.length} siswa` : 'Otomatis'}
                      </span>
                    </div>
                    <textarea
                      rows={form.mode === '4tim' ? 2 : 5}
                      value={teksAnggota[idx] ?? ''}
                      onChange={(e) => {
                        const salinan = [...teksAnggota];
                        salinan[idx] = e.target.value;
                        setTeksAnggota(salinan);
                      }}
                      placeholder={'Rani\nBudi\nCitra'}
                      className="scroll-guru w-full flex-1 resize-none rounded-xl border border-[#2A4CB8] bg-[#0B1B4D] p-2 text-xs font-semibold text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KOLOM 2: Penarik, Durasi, Akhir Permainan, Jika Imbang, Perkiraan Soal */}
      <div className="scroll-guru col-span-4 flex flex-col justify-between gap-3 rounded-3xl border-3 border-[#3C62D4] bg-[#12276B] p-5 shadow-[0_8px_0_#071236]">
        <div className="flex flex-col gap-3">
          <div>
            <span className="font-display mb-1.5 block text-xs font-bold text-[#FFD400]">
              Estafet: Jumlah Penarik di Arena (Kedua Sisi)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {([3, 4, 5] as JumlahPenarik[]).map((n) => (
                <Button3D
                  key={n}
                  variant={form.jumlahPenarik === n ? 'kuning' : 'navy'}
                  size="sm"
                  onClick={() => setForm({ ...form, jumlahPenarik: n })}
                >
                  {n} Orang
                </Button3D>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-display text-xs font-bold text-[#FFD400]">Durasi Per Soal</span>
              <span className="text-[11px] font-semibold text-[#DCE7FF]">
                Saran 10 dtk untuk mode waktu
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([10, 15, 20] as DurasiSoalDetik[]).map((d) => (
                <Button3D
                  key={d}
                  variant={form.durasiSoal === d ? 'kuning' : 'navy'}
                  size="sm"
                  onClick={() => setForm({ ...form, durasiSoal: d })}
                >
                  {d} Detik
                </Button3D>
              ))}
            </div>
          </div>

          <div>
            <span className="font-display mb-1.5 block text-xs font-bold text-[#FFD400]">
              Syarat Akhir Permainan
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'waktu', label: 'WAKTU' },
                  { id: 'soalHabis', label: 'SOAL HABIS' },
                  { id: 'keduanya', label: 'KEDUANYA' },
                ] as { id: AkhirPermainan; label: string }[]
              ).map((a) => (
                <Button3D
                  key={a.id}
                  variant={form.akhirPermainan === a.id ? 'kuning' : 'navy'}
                  size="sm"
                  className="!px-2 !text-sm"
                  onClick={() => setForm({ ...form, akhirPermainan: a.id })}
                >
                  {a.label}
                </Button3D>
              ))}
            </div>
          </div>

          {form.akhirPermainan !== 'soalHabis' && (
            <div className="rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-3">
              <span className="font-display mb-1.5 block text-xs font-bold text-white">
                Durasi Pertandingan ({form.mode === '1lawan1' ? 'Default 60 detik / 1 mnt' : 'Menit'})
              </span>
              <div className="flex items-center gap-2">
                {[
                  ...(form.mode === '1lawan1' ? [{ nilai: 1, label: '60 dtk' }] : []),
                  { nilai: 3, label: '3 mnt' },
                  { nilai: 5, label: '5 mnt' },
                  { nilai: 10, label: '10 mnt' },
                ].map((opsi) => (
                  <Button3D
                    key={opsi.nilai}
                    variant={form.durasiWaktu === opsi.nilai ? 'hijau' : 'navy'}
                    size="sm"
                    className="!px-3 !text-sm"
                    onClick={() => setForm({ ...form, durasiWaktu: opsi.nilai })}
                  >
                    {opsi.label}
                  </Button3D>
                ))}
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  value={form.durasiWaktu}
                  onChange={(e) =>
                    setForm({ ...form, durasiWaktu: Math.max(0.5, Number(e.target.value) || 1) })
                  }
                  aria-label="Isian bebas durasi menit"
                  className="tabular-angka min-h-[46px] w-[78px] rounded-xl border-2 border-[#3C62D4] bg-[#0B1B4D] px-2 text-center text-sm font-bold text-[#FFD400] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Langkah Menuju Garis */}
          <div className="rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-3">
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="font-display text-white">Langkah Menuju Garis (Visual)</span>
              <span className="tabular-angka text-base text-[#FFD400]">
                {form.langkahKeGaris} Langkah
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              value={form.langkahKeGaris}
              onChange={(e) => setForm({ ...form, langkahKeGaris: Number(e.target.value) })}
              className="w-full accent-[#FFD400]"
            />
          </div>

          {/* Pengaturan Jika Imbang */}
          <div className="rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-3">
            <span className="font-display mb-1.5 block text-xs font-bold text-[#FFD400]">
              Jika Imbang (Selisih Tali 0 di Akhir)
            </span>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  {
                    id: 'otomatis',
                    label: 'Otomatis (Cadangan → Tukar → Kecepatan → Seri)',
                  },
                  {
                    id: 'kecepatan',
                    label: 'Langsung bandingkan kecepatan',
                  },
                  {
                    id: 'seri',
                    label: 'Terima seri',
                  },
                ] as { id: ModeJikaImbang; label: string }[]
              ).map((opsi) => {
                const aktif = (form.jikaImbang ?? 'otomatis') === opsi.id;
                return (
                  <button
                    key={opsi.id}
                    type="button"
                    onClick={() => setForm({ ...form, jikaImbang: opsi.id })}
                    className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between rounded-xl border-2 px-3 py-1.5 text-left text-xs font-bold transition ${
                      aktif
                        ? 'border-[#FFE875] bg-[#FFD400] text-[#071236]'
                        : 'border-[#2A4CB8] bg-[#0B1B4D] text-[#DCE7FF] hover:border-[#669BFF]'
                    }`}
                  >
                    <span>{opsi.label}</span>
                    {aktif && <span className="font-display text-[11px]">AKTIF</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Peringatan Awal Non-Blokir */}
        {peringatanAwal.length > 0 && (
          <div className="rounded-2xl border-2 border-[#FFD400] bg-[#7D3D00] p-3">
            <div className="mb-1 flex items-center gap-2 font-display text-xs font-bold text-[#FFD400]">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Catatan Kesiapan Bank Soal (Tetap Bisa Dimulai)</span>
            </div>
            <ul className="space-y-1 text-xs font-semibold text-[#FFF4DC]">
              {peringatanAwal.map((pesan, idx) => (
                <li key={idx}>• {pesan}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Jumlah Soal Per Tim & Perkiraan Kebutuhan */}
        <div
          className={`rounded-2xl border-2 p-3.5 ${
            perkiraanSoal.bankCukup
              ? 'border-[#57E893] bg-[#005724]'
              : 'border-[#FFD400] bg-[#7D3D00]'
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2 font-display text-sm font-bold text-[#FFD400]">
            <span className="flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>Jumlah Soal Per Tim</span>
            </span>
            <span className="tabular-angka rounded-lg bg-[#071236] px-2 py-0.5 text-xs text-white">
              ±{perkiraanSoal.soalPerTimPerLaga} soal/tim
            </span>
          </div>
          <p className="text-xs font-bold text-white">{perkiraanSoal.pesanUtama}</p>
          <p className="mt-1 text-xs font-semibold text-[#FFEEDB]">
            {perkiraanSoal.pesanPeringatan ??
              `Bank soal utama (${jumlahSoalUtama} soal) mencukupi untuk ±${perkiraanSoal.totalSoalDibutuhkan} kebutuhan sesi ini.`}
          </p>
        </div>
      </div>

      {/* KOLOM 3: Opsi Arena, Audio, PIN Guru, PWA */}
      <div className="scroll-guru col-span-3 flex flex-col justify-between gap-3 rounded-3xl border-3 border-[#3C62D4] bg-[#12276B] p-5 shadow-[0_8px_0_#071236]">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold text-[#FFD400]">Opsi Arena & Audio</h2>
          {(
            [
              { key: 'salahMenarikLawan', label: 'Salah tarik ke lawan' },
              { key: 'bonus', label: 'Soal Bonus ×2' },
              { key: 'penjelasan', label: 'Penjelasan usai jawab' },
              { key: 'ulangiSoal', label: 'Izinkan ulangi soal' },
              { key: 'suara', label: 'Efek Suara' },
              { key: 'musik', label: 'Musik Latar' },
              { key: 'modeRekam', label: 'Mode Rekam Video' },
              { key: 'efekRingan', label: 'Efek Ringan' },
            ] as { key: keyof Pengaturan; label: string }[]
          ).map((item) => {
            const aktif = Boolean(form[item.key]);
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setForm({ ...form, [item.key]: !aktif })}
                className={`flex min-h-[46px] w-full cursor-pointer items-center justify-between rounded-xl border-2 px-3.5 text-sm font-bold transition-colors ${
                  aktif
                    ? 'border-[#57E893] bg-[#008E3A] text-white'
                    : 'border-[#2A4CB8] bg-[#071236] text-[#DCE7FF]'
                }`}
              >
                <span>{item.label}</span>
                <span className="font-display rounded-lg bg-black/30 px-2.5 py-0.5 text-xs">
                  {aktif ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}

          {/* Volume Audio */}
          <div className="rounded-xl border-2 border-[#2A4CB8] bg-[#071236] px-3.5 py-2.5">
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="text-white">Volume Audio</span>
              <span className="tabular-angka text-[#FFD400]">{volumeSuara}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volumeSuara}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolumeSuara(v);
                aturVolumeAudio(v / 100);
              }}
              aria-label="Pengatur volume audio"
              className="w-full accent-[#FFD400]"
            />
          </div>
        </div>

        {/* PIN Guru */}
        <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="font-display flex items-center gap-1.5 text-xs font-bold text-[#FFD400]">
              <Lock size={14} />
              <span>PIN Guru (Opsional, 4 Angka)</span>
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={form.pinGuru ?? ''}
              onChange={(e) =>
                setForm({ ...form, pinGuru: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
              placeholder="Kosongkan jika tanpa PIN"
              className="tabular-angka min-h-[44px] w-full rounded-xl border-2 border-[#2A4CB8] bg-[#0B1B4D] px-3 text-base font-bold tracking-widest text-white placeholder-[#7FA0E8] focus:border-[#FFD400] focus:outline-none"
            />
            <span className="text-[11px] font-semibold text-[#FFE8B3]">
              Mengunci Panel Guru, kunci jawaban, ubah game, dan Bagikan.{' '}
              <strong className="text-[#FFD400]">
                Peringatan jujur: PIN hanya mengunci tampilan, bukan enkripsi data.
              </strong>
            </span>
          </label>
        </div>

        {/* Alamat Aplikasi & PWA */}
        <AlamatAplikasiControl onToast={onToast} />

        <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="font-display flex items-center gap-1.5 text-xs font-bold text-[#FFD400]">
              <Download size={15} />
              <span>Aplikasi Offline (PWA)</span>
            </span>
            {isInstalled && (
              <span className="flex items-center gap-1 rounded bg-[#005724] px-2 py-0.5 text-[11px] font-bold text-[#57E893]">
                <CheckCircle2 size={13} />
                <span>Terpasang</span>
              </span>
            )}
          </div>
          <p className="mb-2.5 text-[11px] font-semibold text-[#DCE7FF]">
            Pasang ke Smartboard, laptop, atau HP agar cepat dibuka dari layar utama dan tetap jalan tanpa internet.
          </p>
          <Button3D
            variant={isInstalled ? 'navy' : 'hijau'}
            size="sm"
            fullWidth
            onClick={() => void pasangAplikasi()}
          >
            <Download size={16} />
            <span>{isInstalled ? 'Aplikasi Sudah Terpasang' : 'Pasang Aplikasi'}</span>
          </Button3D>
        </div>
      </div>
    </div>
  );
};

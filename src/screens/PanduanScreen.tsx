import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Gamepad2,
  Layers,
  MonitorPlay,
  Share2,
  Swords,
} from 'lucide-react';
import { useAppStore } from '../app/store';
import { AutoFitText } from '../components/AutoFitText';
import { Button3D } from '../components/Button3D';
import { Modal } from '../components/Modal';
import { RuteHash } from '../data/types';

interface PanduanScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

type TabPanduan = 'buat' | 'main' | 'mode' | 'smartboard' | 'bagikan' | 'batasan' | 'pasang';

const TAB_PANDUAN: { id: TabPanduan; label: string; ikon: React.ReactNode }[] = [
  { id: 'buat', label: '1. Buat Game', ikon: <FileText size={16} /> },
  { id: 'main', label: '2. Cara Bermain', ikon: <Gamepad2 size={16} /> },
  { id: 'mode', label: '3. Mode Laga', ikon: <Swords size={16} /> },
  { id: 'smartboard', label: '4. Smartboard & Video', ikon: <MonitorPlay size={16} /> },
  { id: 'bagikan', label: '5. Bagikan & PIN', ikon: <Share2 size={16} /> },
  { id: 'batasan', label: '6. Batasan & Uji', ikon: <AlertTriangle size={16} /> },
  { id: 'pasang', label: '7. Pasang Aplikasi', ikon: <Download size={16} /> },
];

const TEKS_CONTOH_PANJANG =
  'Pada pertandingan tarik tambang kuis ini, setiap jawaban benar akan menggerakkan tali satu langkah ke arah tim Anda, sedangkan teks pertanyaan yang sangat panjang akan diperkecil secara otomatis oleh komponen AutoFitText agar selalu muat di dalam kotak tanpa meluber, terpotong, atau memunculkan bilah gulir di layar Smartboard.';

const TEKS_CONTOH_SEDANG =
  'Dua tim bermain bersamaan pada satu layar Smartboard dengan pembagian soal yang adil dan seimbang.';

export const PanduanScreen: React.FC<PanduanScreenProps> = ({ onNavigasi }) => {
  const { tampilkanToast } = useAppStore();
  const [tabAktif, setTabAktif] = useState<TabPanduan>('buat');
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [pakaiTeksPanjang, setPakaiTeksPanjang] = useState(true);

  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 bg-[#0B1B4D] px-8 py-5">
      {/* Header & Navigasi Tab Ringkas (tanpa scroll berlebihan) */}
      <div className="kartu-3d flex shrink-0 flex-col gap-3 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#071236] bg-[#FFD400] text-[#071236]">
              <BookOpen size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display teks-outline-tebal text-2xl font-bold text-[#FFD400]">
                PANDUAN LENGKAP DUEL OTAK
              </h1>
              <p className="text-sm font-bold text-[#DCE7FF]">
                Ketuk tab di bawah untuk membaca panduan ringkas tanpa scroll panjang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button3D variant="hijau" size="sm" onClick={() => onNavigasi('/buat-game')}>
              Buat Game
            </Button3D>
            <Button3D variant="navy" size="sm" onClick={() => onNavigasi('/')}>
              Ke Beranda
            </Button3D>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {TAB_PANDUAN.map((t) => {
            const aktif = tabAktif === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabAktif(t.id)}
                className={`font-display flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-3 px-2.5 text-xs font-bold transition-colors ${
                  aktif
                    ? 'border-[#FFE875] bg-[#1E6BFF] text-white shadow-[0_4px_0_#0A2FA8]'
                    : 'border-[#2A4CB8] bg-[#071236] text-[#DCE7FF] hover:border-[#FFD400] hover:text-white'
                }`}
              >
                {t.ikon}
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Konten Tab Aktif */}
      <div className="kartu-3d min-h-0 flex-1 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] p-6">
        {tabAktif === 'buat' && (
          <div className="grid h-full grid-cols-12 gap-5">
            <div className="col-span-7 flex flex-col justify-between gap-3">
              <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
                <h2 className="font-display mb-2 text-xl font-bold text-[#FFD400]">
                  3 Cara Memasukkan Soal (100% Tanpa AI, Offline di Browser)
                </h2>
                <ul className="space-y-2 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#57E893]">1. Manual Cepat:</strong> Ketik soal, isi 2–4 pilihan (A–D, cocok juga untuk Benar/Salah), klik huruf A–D untuk menetapkan kunci, lalu klik <em>Simpan &amp; tambah soal berikutnya</em>.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">2. Tempel Teks:</strong> Salin daftar soal dari catatan atau dokumen lalu tempel sekaligus; pratinjau langsung membaca soal, pilihan, dan kunci.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">3. Unggah Dokumen:</strong> Mendukung <strong>Word (.docx)</strong>, <strong>Excel/CSV (.xlsx, .xls, .csv)</strong>, <strong>PDF berisi teks (.pdf)</strong>, dan <strong>teks biasa (.txt)</strong>. Tersedia juga tombol <em>Unduh Template Excel</em>.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
                <h3 className="font-display mb-1.5 text-lg font-bold text-[#FFD400]">
                  Format Dokumen yang Dikenali Otomatis
                </h3>
                <p className="text-sm font-semibold text-[#DCE7FF]">
                  Sistem mengenali penomoran <code className="text-[#57E893]">1. / 1) / Soal 1</code>, pilihan <code className="text-[#57E893]">A. / a)</code>, baris <code className="text-[#57E893]">Kunci: B</code> / <code className="text-[#57E893]">Jawaban: B</code>, tanda bintang <code className="text-[#57E893]">*B.</code>, serta kolom Excel (<code className="text-[#FFD400]">Pertanyaan | A | B | C | D | Kunci | Penjelasan | Tingkat | Topik | Bonus</code>).
                </p>
              </div>
            </div>

            <div className="col-span-5 flex flex-col justify-between rounded-2xl border-3 border-[#FFD400] bg-[#071236] p-5">
              <div>
                <h3 className="font-display mb-2 text-xl font-bold text-[#FFD400]">
                  Contoh File Word (.docx) dengan Huruf Tebal
                </h3>
                <p className="mb-3 text-sm font-semibold text-[#DCE7FF]">
                  Di Microsoft Word atau Google Docs, Anda cukup menebalkan (<strong>Bold</strong>) pilihan jawaban yang benar tanpa perlu menulis baris &quot;Kunci:&quot; lagi!
                </p>
                <div className="rounded-xl border-2 border-[#2A4CB8] bg-[#12276B] p-4 font-body text-sm text-white">
                  <div>1. Planet terbesar di tata surya kita adalah ...</div>
                  <div className="mt-1 pl-3">A. Mars</div>
                  <div className="pl-3">B. Bumi</div>
                  <div className="pl-3 font-extrabold text-[#57E893]">C. Jupiter &larr; (ditebalkan / Bold di Word)</div>
                  <div className="pl-3">D. Venus</div>
                </div>
              </div>
              <p className="text-xs font-bold text-[#FFE8B3]">
                Tips: Gunakan satu baris kosong antar soal agar pemisahan paragraf selalu rapi saat dibaca.
              </p>
            </div>
          </div>
        )}

        {tabAktif === 'main' && (
          <div className="grid h-full grid-cols-3 gap-4">
            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#FF6B86] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2 text-xl font-bold text-[#FFD400]">
                  Aturan Tarik Tali
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#57E893]">• Jawaban BENAR:</strong> Tali ditarik <strong>1 langkah</strong> ke arah tim sendiri (atau <strong>2 langkah</strong> jika Soal Bonus aktif!).
                  </li>
                  <li>
                    <strong className="text-[#FF6B86]">• Jawaban SALAH:</strong> Jika opsi &quot;Salah tarik ke lawan&quot; <strong>ON</strong>, tali tertarik 1 langkah ke arah lawan; jika <strong>OFF</strong>, posisi tali tetap.
                  </li>
                  <li>
                    <strong className="text-[#FF9100]">• Waktu Soal Habis:</strong> Dihitung salah dan langsung lanjut ke soal &amp; pemain berikutnya.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-[#450B1C] px-3 py-2 text-xs font-bold text-[#FFD400]">
                Klik pilihan jawaban LANGSUNG FINAL (tanpa tombol kunci).
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2 text-xl font-bold text-[#FFD400]">
                  Alur Mandiri &amp; Estafet Adil
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-white">• Dua Arena Mandiri:</strong> Sisi Merah (kiri ▲) dan sisi Biru (kanan ●) memiliki alur soal sendiri yang berjalan paralel tanpa saling menunggu.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• Estafet Berputar:</strong> Urutan pemain berputar rata per tim. Tidak ada siswa yang melompat atau mendapat giliran kedua sebelum seluruh rekannya mendapat giliran pertama.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-[#173287] px-3 py-2 text-xs font-bold text-[#DCE7FF]">
                Layar selalu menampilkan &quot;Giliran: [Nama Siswa]&quot; agar kelas tertib.
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#00C853] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2 text-xl font-bold text-[#FFD400]">
                  Akhir Permainan &amp; Penentuan
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-white">• Syarat Berakhir:</strong> Sesuai pilihan guru di Pengaturan: <em>WAKTU habis</em>, <em>SOAL HABIS</em>, atau <em>KEDUANYA</em> (mana yang lebih dulu tercapai).
                  </li>
                  <li>
                    <strong className="text-[#FFD400]">• Garis Arena:</strong> Tali tertahan secara visual di garis agar tetap rapi, tetapi skor selisih asli terus dihitung hingga laga usai.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• Jika Seri:</strong> Otomatis masuk <strong>Ronde Penentuan</strong> — siapa cepat &amp; tepat menjawab, timnya menang!
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-[#005724] px-3 py-2 text-xs font-bold text-white">
                Seluruh tarikan tercatat rapi di Riwayat Tarikan &amp; Rekap CSV.
              </div>
            </div>
          </div>
        )}

        {tabAktif === 'mode' && (
          <div className="grid h-full grid-cols-3 gap-5">
            <div className="flex flex-col justify-between rounded-2xl border-3 border-[#FF6B86] bg-[#071236] p-5">
              <div>
                <span className="font-display inline-block rounded-lg bg-[#FF1744] px-3 py-1 text-xs font-bold text-white">
                  MODE 1 (DEFAULT)
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold text-[#FFD400]">2 TIM</h2>
                <p className="mt-2 text-sm font-semibold text-[#DCE7FF]">
                  Satu pertandingan penuh antara tim kiri (Merah ▲) melawan tim kanan (Biru ●). Cocok untuk satu kelas dibagi dua kubu besar dengan 3, 4, atau 5 penarik di arena.
                </p>
              </div>
              <div className="text-xs font-bold text-[#57E893]">
                Mendukung pembagian soal seimbang berdasar tingkat &amp; topik.
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-3 border-[#FFD400] bg-[#071236] p-5">
              <div>
                <span className="font-display inline-block rounded-lg bg-[#FFD400] px-3 py-1 text-xs font-bold text-[#071236]">
                  MODE 2 (TURNAMEN)
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold text-[#FFD400]">4 TIM</h2>
                <p className="mt-2 text-sm font-semibold text-[#DCE7FF]">
                  Bagan gugur otomatis: <strong>Semifinal 1</strong> (Tim 1 vs 2) &rarr; <strong>Semifinal 2</strong> (Tim 3 vs 4) &rarr; <strong>Final</strong> (pemenang SF1 vs SF2). Guru mengendalikan kapan tiap laga dimulai dari Bagan Turnamen.
                </p>
              </div>
              <div className="text-xs font-bold text-[#FFD400]">
                Menghasilkan Podium Juara 1, Juara 2, dan Juara 3 Bersama, dengan dek soal baru di tiap babak!
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-3 border-[#669BFF] bg-[#071236] p-5">
              <div>
                <span className="font-display inline-block rounded-lg bg-[#1E6BFF] px-3 py-1 text-xs font-bold text-white">
                  MODE 3 (DUEL CEPAT)
                </span>
                <h2 className="font-display mt-3 text-2xl font-bold text-[#FFD400]">1 LAWAN 1</h2>
                <p className="mt-2 text-sm font-semibold text-[#DCE7FF]">
                  Tempel daftar nama siswa lalu sistem mengundi pasangan duel acak. Masing-masing sisi diwakili <strong>1 siswa tanpa estafet</strong> (default 60 detik atau soal habis). Jika jumlah siswa ganjil, 1 peserta mendapat pasangan acak bertanda <strong>2×</strong>.
                </p>
              </div>
              <div className="text-xs font-bold text-[#57E893]">
                Menampilkan Papan Kemenangan Sesi langsung di antara partai duel!
              </div>
            </div>
          </div>
        )}

        {tabAktif === 'smartboard' && (
          <div className="grid h-full grid-cols-3 gap-4">
            <div className="flex flex-col justify-between rounded-2xl border-3 border-[#57E893] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  Cara membuka game di Smartboard
                </h2>
                <ul className="space-y-2 text-xs font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#57E893]">(a) Di HP / Laptop Guru:</strong> Buat dan terbitkan game (<strong>login Google hanya diperlukan di sini</strong>).
                  </li>
                  <li>
                    <strong className="text-[#57E893]">(b) Di Smartboard (Tanpa Login):</strong> Buka alamat aplikasi lalu klik <strong>Masuk dengan Kode</strong> &amp; ketik KODE 8 huruf/angka, <em>atau</em> buka link yang dikirim lewat WhatsApp Web/email, <em>atau</em> pilih dari kartu <strong>Terakhir Dibuka</strong> di Beranda.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">(c) Simpan Lokal:</strong> Tekan <strong>SIMPAN KE GAME SAYA</strong> agar game dapat dimainkan kembali tanpa internet.
                  </li>
                  <li>
                    <strong className="text-[#FFD400]">Catatan QR:</strong> QR dipindai dengan <strong>HP</strong> (untuk guru lain atau siswa), bukan oleh Smartboard.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-[#FF9100] bg-[#4D2400] px-3 py-2 text-[11px] font-bold text-[#FFE8B3]">
                Keamanan: Smartboard tidak perlu login Google. Jika memakai komputer bersama, jangan menyimpan login Google di perangkat itu.
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  Tips Sentuh di Smartboard / IFP
                </h2>
                <ul className="space-y-2 text-xs font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#57E893]">• Multi-Sentuh Bersamaan:</strong> Seluruh tombol pilihan jawaban memakai <em>pointer events</em> sehingga siswa tim kiri dan tim kanan bisa mengetuk layar pada detik yang sama tanpa saling membatalkan.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• Area Sentuh Besar:</strong> Tombol jawaban dan papan ketik kode berukuran minimal 48–68px serta bebas geser/drag &amp; drop agar akurat untuk jari siswa.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• Layar Penuh 16:9:</strong> Gunakan tombol <strong>Layar Penuh</strong> di kanan atas agar panggung 1600×900 memenuhi proyektor atau IFP tanpa scroll.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#FFD400] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  Rekam Video &amp; Performa Laptop Sekolah
                </h2>
                <ul className="space-y-2 text-xs font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#FFD400]">• Aktifkan Mode Rekam Video:</strong> Mempertebal garis tepi kartu, kontras warna pekat, serta menjaga angka skor dan timer tetap tajam di kamera HP maupun OBS/screen recorder.
                  </li>
                  <li>
                    <strong className="text-[#FFD400]">• Aktifkan Efek Ringan:</strong> Mengurangi partikel konfeti dan animasi latar bila dijalankan di laptop/komputer sekolah berspesifikasi hemat daya.
                  </li>
                  <li>
                    <strong className="text-[#FFD400]">• Kontrol Audio &amp; Jeda:</strong> Guru dapat mengatur volume suara/musik atau menekan Jeda kapan saja saat menjelaskan materi kepada kelas.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {tabAktif === 'bagikan' && (
          <div className="grid h-full grid-cols-4 gap-3.5">
            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#00C853] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  1. Paket Berkas (.json)
                </h2>
                <p className="text-sm font-semibold text-[#DCE7FF]">
                  Simpan soal, kunci, dan pengaturan ke file cadangan lewat <strong>Game Saya &rarr; Bagikan</strong>. Muat jumlah soal tanpa batas &amp; bisa diimpor ulang tanpa internet.
                </p>
              </div>
              <div className="rounded-xl bg-[#005724] px-3 py-2 text-xs font-bold text-white">
                100% offline &amp; aman dari file rusak.
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#669BFF] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  2. Link Data Offline
                </h2>
                <p className="text-sm font-semibold text-[#DCE7FF]">
                  Game dipadatkan ke URL <code className="text-[#57E893]">#/impor/...</code> (format ringkas v2 hingga 8.000 karakter). QR Code dibuat otomatis jika URL di bawah 2.000 karakter.
                </p>
              </div>
              <div className="rounded-xl bg-[#173287] px-3 py-2 text-xs font-bold text-[#FFD400]">
                Berjalan penuh tanpa server &amp; tanpa login!
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#7C4DFF] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  3. Bagikan Online (#/g/KODE)
                </h2>
                <p className="text-sm font-semibold text-[#DCE7FF]">
                  Opsional: Guru masuk Google untuk menerbitkan link pendek 8 karakter (<code className="text-[#57E893]">#/g/KODE</code>) &amp; QR besar (berlaku 7/30/90 hari). Penerima buka link tanpa login!
                </p>
              </div>
              <div className="rounded-xl bg-[#2B1266] px-3 py-2 text-xs font-bold text-[#FFE8B3]">
                Kelola hingga 20 game di menu Game Online Saya.
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#FF9100] bg-[#071236] p-4">
              <div>
                <h2 className="font-display mb-2 text-lg font-bold text-[#FFD400]">
                  4. PIN Guru (4 Angka)
                </h2>
                <p className="text-sm font-semibold text-[#DCE7FF]">
                  Jika diisi di Pengaturan, <strong>Panel Guru, Kunci, Ubah Soal/Pengaturan, Ubah Nama, Hapus, &amp; Bagikan</strong> meminta PIN 4 angka lewat tombol sentuh besar.
                </p>
              </div>
              <div className="rounded-xl bg-[#4D2400] px-3 py-2 text-xs font-bold text-[#FFE8B3]">
                PIN hanya mengunci tampilan antarmuka, bukan enkripsi data.
              </div>
            </div>
          </div>
        )}

        {tabAktif === 'batasan' && (
          <div className="grid h-full grid-cols-12 gap-5">
            <div className="col-span-7 flex flex-col justify-between gap-3 rounded-2xl border-2 border-[#FF9100] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2 text-xl font-bold text-[#FFD400]">
                  Batasan Penting yang Perlu Diketahui Guru
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#FF6B86]">1. PDF Hasil Scan Tidak Didukung:</strong> Karena aplikasi tidak memakai OCR cloud/AI, file PDF yang isinya berupa foto/gambar tidak bisa dibaca. Salin teks soalnya atau pindahkan ke Word (.docx) / Excel (.xlsx).
                  </li>
                  <li>
                    <strong className="text-[#FFD400]">2. Batas Kapasitas Link Data &amp; QR:</strong> Link berisi data memuat hingga 8.000 karakter (peringatan di atas 4.000 karakter), sedangkan QR hanya dibuat di bawah 2.000 karakter. Untuk bank soal besar dengan QR pendek, gunakan <strong>Bagikan Online</strong> atau <strong>Paket (.json)</strong>.
                  </li>
                  <li>
                    <strong className="text-[#FFE8B3]">3. Privasi &amp; Kunci Jawaban:</strong> Game yang dibagikan (baik paket `.json`, link data, maupun game online di server Google Firebase) membawa kunci jawaban. Jangan menyimpan data pribadi selain akun Google guru saat menerbitkan link online.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">4. Mode Offline &amp; Penyimpanan Browser:</strong> Semua font dan pustaka dibundel lokal. Pada mode privat/incognito, data browser tidak bertahan setelah jendela ditutup — simpan cadangan lewat Unduh Paket (.json).
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-span-5 flex flex-col justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Layers size={22} className="text-[#FFD400]" />
                  <h3 className="font-display text-lg font-bold text-[#FFD400]">Uji Komponen Fondasi</h3>
                </div>
                <div
                  data-testid="autofit-demo-box"
                  className="mb-3 h-[145px] w-full rounded-2xl border-2 border-[#FFD400] bg-[#12276B] p-3.5"
                >
                  <AutoFitText maxFontSize={28} minFontSize={11} className="font-body font-bold text-white">
                    {pakaiTeksPanjang ? TEKS_CONTOH_PANJANG : TEKS_CONTOH_SEDANG}
                  </AutoFitText>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button3D
                    variant="kuning"
                    size="sm"
                    onClick={() => setPakaiTeksPanjang((prev) => !prev)}
                  >
                    {pakaiTeksPanjang ? 'Ganti Teks Sedang' : 'Uji Teks Panjang'}
                  </Button3D>
                  <Button3D variant="ungu" size="sm" onClick={() => setModalTerbuka(true)}>
                    <CheckCircle2 size={16} />
                    <span>Uji Modal</span>
                  </Button3D>
                  <Button3D
                    variant="oranye"
                    size="sm"
                    onClick={() => tampilkanToast('Notifikasi Toast berhasil tampil tanpa error!', 'sukses')}
                  >
                    <Bell size={16} />
                    <span>Uji Toast</span>
                  </Button3D>
                </div>
              </div>
            </div>
          </div>
        )}

        {tabAktif === 'pasang' && (
          <div className="grid h-full grid-cols-3 gap-4">
            <div className="flex flex-col justify-between rounded-2xl border-3 border-[#57E893] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2.5 text-xl font-bold text-[#FFD400]">
                  Memasang aplikasi
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#57E893]">• Smartboard &amp; Laptop (Chrome/Edge):</strong>{' '}
                    Tekan tombol <strong>PASANG</strong> pada banner di bawah layar, tekan tombol{' '}
                    <strong>Pasang Aplikasi</strong> di Beranda/Pengaturan, atau klik ikon pasang di bilah alamat browser.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• HP Android:</strong> Buka di Chrome, lalu ketuk menu{' '}
                    <strong>⋮</strong> &rarr; pilih <strong>Pasang aplikasi</strong> (atau tekan banner <strong>PASANG</strong>).
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• iPhone / iPad (Safari):</strong> Ketuk ikon{' '}
                    <strong>Bagikan</strong> (kotak berpanah ke atas) &rarr; pilih{' '}
                    <strong>Tambah ke Layar Utama</strong>.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-[#005724] px-3.5 py-2.5 text-xs font-bold text-white">
                Aplikasi terbuka di jendela sendiri tanpa bilah alamat browser!
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2.5 text-xl font-bold text-[#FFD400]">
                  Membuka Tanpa Internet (Offline)
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-white">• Buka Sekali Saat Online:</strong> Setelah dipasang dan dibuka sekali saat terhubung internet, seluruh berkas inti (tampilan, font, ikon, suara) otomatis tersimpan di perangkat.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• Mainkan Game Tersimpan:</strong> Game yang sudah disimpan di <strong>Game Saya</strong> dapat langsung dibuka dan dimainkan di kelas tanpa koneksi internet.
                  </li>
                  <li>
                    <strong className="text-[#FFD400]">• Lencana Mode Offline:</strong> Saat perangkat tidak memiliki internet, muncul lencana kecil <strong>Mode Offline</strong> di bilah atas; fitur online (Bagikan Online, Masuk dengan Kode) menampilkan pesan yang jelas tanpa error.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-[#FF9100] bg-[#4D2400] px-3.5 py-2.5 text-xs font-bold text-[#FFE8B3]">
                Catatan: Setelah dipasang dan dibuka sekali, game yang disimpan di Game Saya bisa dimainkan tanpa internet.
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-[#FFD400] bg-[#071236] p-5">
              <div>
                <h2 className="font-display mb-2.5 text-xl font-bold text-[#FFD400]">
                  Memperbarui Aplikasi
                </h2>
                <ul className="space-y-2.5 text-sm font-semibold text-[#DCE7FF]">
                  <li>
                    <strong className="text-[#FFD400]">• Notifikasi Versi Baru:</strong> Ketika aplikasi mendapat pembaruan terbaru, muncul pemberitahuan{' '}
                    <strong>&quot;Versi baru tersedia&quot;</strong> lengkap dengan tombol{' '}
                    <strong>MUAT ULANG</strong>.
                  </li>
                  <li>
                    <strong className="text-[#57E893]">• Aman Saat Pertandingan:</strong> Aplikasi tidak pernah memuat ulang halaman secara otomatis di tengah pertandingan siswa.
                  </li>
                  <li>
                    <strong className="text-white">• Cara Menerapkan:</strong> Tekan <strong>MUAT ULANG</strong> setelah selesai bermain atau dari Beranda untuk langsung memakai versi terbaru.
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-[#173287] px-3.5 py-2.5 text-xs font-bold text-[#DCE7FF]">
                Jika Anda pernah menekan NANTI pada banner, gunakan tombol Pasang Aplikasi di Beranda atau Pengaturan kapan saja.
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        terbuka={modalTerbuka}
        judul="Contoh Modal Sistem"
        onTutup={() => setModalTerbuka(false)}
        lebarMaks="md"
        footer={
          <Button3D variant="hijau" size="md" onClick={() => setModalTerbuka(false)}>
            Mengerti
          </Button3D>
        }
      >
        <p className="text-bacaan text-lg text-[#DCE7FF]">
          Modal ini berada di dalam panggung tetap 1600×900 sehingga ukurannya tetap proporsional di semua resolusi layar dan mode layar penuh.
        </p>
      </Modal>
    </div>
  );
};

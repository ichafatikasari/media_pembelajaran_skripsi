import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buatPengaturanDefault } from './gameEngine';
import {
  analisisKoreksiDaftarSoal,
  buatPratinjauRapikanOtomatis,
  terapkanRapikanOtomatis,
  terimaSemuaKunciOtomatis,
} from '../parsers/koreksiSoal';
import {
  HalamanItemsPdf,
  ItemTeksPdf,
  parseHalamanPdfKeDraft,
} from '../parsers/pdfKolom';
import { parseTeksSoal } from '../parsers/textParser';
import {
  DraftSoal,
  konversiDraftValidKeSoal,
  LABEL_SUMBER_KUNCI,
  validasiDaftarDraftSoal,
} from '../parsers/validator';
import { parseWordBuffer } from '../parsers/wordParser';
import {
  bacaDrafWizardGame,
  bacaSampahGame,
  BATAS_SIMPAN_SAMPAH_MS,
  bersihkanSampahKedaluwarsa,
  buatEntriSampahBatch,
  CatatanSampahPerGame,
  formatWaktuLengkapHHMMSS,
  hapusDrafWizardGame,
  hapusSampahGame,
  pulihkanItemKeDaftar,
  simpanDrafWizardGame,
  simpanSampahGame,
  tandaiSampahGameDisimpanFinal,
} from '../utils/wizardDraft';

interface GayaOpsiDocx {
  bold?: boolean;
  underline?: boolean;
  highlight?: string;
  color?: string;
}

function buatParagraphXml(
  teks: string,
  gaya: GayaOpsiDocx = {},
  opsi?: { gambar?: boolean }
): string {
  const rPrBagian: string[] = [];
  if (gaya.bold) rPrBagian.push('<w:b/>');
  if (gaya.underline) rPrBagian.push('<w:u w:val="single"/>');
  if (gaya.highlight) rPrBagian.push(`<w:highlight w:val="${gaya.highlight}"/>`);
  if (gaya.color) rPrBagian.push(`<w:color w:val="${gaya.color}"/>`);
  const rPr = rPrBagian.length > 0 ? `<w:rPr>${rPrBagian.join('')}</w:rPr>` : '';
  const gambarXml = opsi?.gambar
    ? '<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"/></w:drawing></w:r>'
    : '';
  const escaped = teks
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escaped}</w:t></w:r>${gambarXml}</w:p>`;
}

async function bangunDocxDariBodyXml(bodyIsiXml: string): Promise<ArrayBuffer> {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyIsiXml}
  </w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file('word/document.xml', docXml);
  return zip.generateAsync({ type: 'arraybuffer' });
}

async function buatDocx40SoalMultiSumber(): Promise<ArrayBuffer> {
  const p: string[] = [];
  p.push(buatParagraphXml('SOAL ULANGAN UMUM 40 NOMOR', { bold: true }));

  for (let i = 1; i <= 40; i += 1) {
    const kunciIdx = (i - 1) % 4;
    const hurufKunci = String.fromCharCode(65 + kunciIdx);

    // Soal #12 memiliki gambar tertanam agar terdeteksi "Cek manual"
    p.push(
      buatParagraphXml(
        `${i}. Perhatikan uraian pada latihan konsep umum nomor ${i} berikut adalah ...`,
        {},
        { gambar: i === 12 }
      )
    );

    for (let o = 0; o < 4; o += 1) {
      const h = String.fromCharCode(65 + o);
      let teksOpsi = `${h}. Jawaban pilihan ${h} untuk nomor ${i}`;
      const gaya: GayaOpsiDocx = {};

      // Soal 1..8: penanda bold
      if (i >= 1 && i <= 8 && o === kunciIdx) gaya.bold = true;
      // Soal 9..12: penanda underline
      if (i >= 9 && i <= 12 && o === kunciIdx) gaya.underline = true;
      // Soal 13..16: penanda highlight
      if (i >= 13 && i <= 16 && o === kunciIdx) gaya.highlight = 'yellow';
      // Soal 17..20: penanda warna font berbeda (merah)
      if (i >= 17 && i <= 20 && o === kunciIdx) gaya.color = 'FF0000';
      // Soal 21..24: penanda bintang / centang / (benar) / (kunci)
      if (i === 21 && o === kunciIdx) teksOpsi += ' *';
      if (i === 22 && o === kunciIdx) teksOpsi += ' ✓';
      if (i === 23 && o === kunciIdx) teksOpsi += ' (benar)';
      if (i === 24 && o === kunciIdx) teksOpsi += ' (kunci)';
      // Soal 39: konflik! Bold di opsi 0 (A), tapi bagian kunci di akhir akan menulis D
      if (i === 39 && o === 0) gaya.bold = true;
      // Soal 40: tanpa kunci sama sekali

      p.push(buatParagraphXml(teksOpsi, gaya));
    }

    // Soal 25..30: baris jawaban per soal (termasuk Ans:)
    if (i >= 25 && i <= 27) {
      p.push(buatParagraphXml(`Kunci: ${hurufKunci}`));
    } else if (i >= 28 && i <= 30) {
      p.push(buatParagraphXml(`Ans: ${hurufKunci}`));
    }
  }

  // Bagian kunci di akhir dokumen untuk soal 31..39 (39 bertentangan dengan bold A)
  p.push(buatParagraphXml('KUNCI JAWABAN', { bold: true }));
  for (let i = 31; i <= 38; i += 1) {
    const huruf = String.fromCharCode(65 + ((i - 1) % 4));
    p.push(buatParagraphXml(`${i}. ${huruf}`));
  }
  p.push(buatParagraphXml('39. D'));

  return bangunDocxDariBodyXml(p.join('\n'));
}

function buatHalamanPdf40SoalDuaKolomPlusKunci(): HalamanItemsPdf[] {
  const halamanList: HalamanItemsPdf[] = [];
  // 4 halaman x 10 soal (5 kiri + 5 kanan)
  for (let hal = 0; hal < 4; hal += 1) {
    const items: ItemTeksPdf[] = [];
    for (let k = 0; k < 10; k += 1) {
      const nomor = hal * 10 + k + 1;
      const kolomKanan = k >= 5;
      const xBase = kolomKanan ? 315 : 42;
      const barisDalamKolom = kolomKanan ? k - 5 : k;
      const yBase = 760 - barisDalamKolom * 130;

      items.push({ teks: `${nomor}. Pertanyaan ujian PDF nomor ${nomor} tentang materi ke-${nomor}?`, x: xBase, y: yBase, width: 220 });
      items.push({ teks: `A. Opsi A soal ${nomor}`, x: xBase, y: yBase - 20, width: 160 });
      items.push({ teks: `B. Opsi B soal ${nomor}`, x: xBase, y: yBase - 40, width: 160 });
      items.push({ teks: `C. Opsi C soal ${nomor}`, x: xBase, y: yBase - 60, width: 160 });
      items.push({ teks: `D. Opsi D soal ${nomor}`, x: xBase, y: yBase - 80, width: 160 });
    }
    halamanList.push({ items, lebarHalaman: 595.4 });
  }

  // Halaman 5: Kunci Jawaban 2 kolom (1..20 di kiri, 21..40 di kanan)
  const itemsKunci: ItemTeksPdf[] = [
    { teks: 'KUNCI JAWABAN', x: 240, y: 780, width: 120 },
  ];
  for (let i = 1; i <= 40; i += 1) {
    const huruf = String.fromCharCode(65 + ((i - 1) % 4));
    const kanan = i > 20;
    const xBase = kanan ? 330 : 60;
    const idxBaris = kanan ? i - 21 : i - 1;
    itemsKunci.push({
      teks: `${i}. ${huruf}`,
      x: xBase,
      y: 740 - idxBaris * 28,
      width: 60,
    });
  }
  halamanList.push({ items: itemsKunci, lebarHalaman: 595.4 });

  return halamanList;
}

async function runTests() {
  let lulus = 0;
  const uji = async (nama: string, fn: () => void | Promise<void>) => {
    await fn();
    lulus += 1;
    process.stdout.write(`LULUS: ${nama}\n`);
  };

  // (a) Tempat Sampah: hapus satuan, hapus massal, kembalikan ke posisi semula + kunci utuh, persistensi draf, bersih > 7 hari
  await uji('(a) Tempat Sampah menyimpan soal terhapus, memulihkan ke posisi semula dengan kunci utuh, dan bersih otomatis >7 hari pasca simpan final', () => {
    const awal: DraftSoal[] = Array.from({ length: 5 }, (_, i) => ({
      id: `s-${i + 1}`,
      pertanyaan: `Pertanyaan ke-${i + 1}?`,
      pilihan: ['Satu', 'Dua', 'Tiga', 'Empat'],
      kunci: i % 4,
      bonus: i === 2,
      cadangan: i === 4,
      sumber: 'manual',
      sumberKunci: 'manual',
      detailSumberKunci: LABEL_SUMBER_KUNCI.manual,
      masalah: [],
      peringatanDetail: [],
    }));

    // Hapus soal #3 (indeks 2) dan #5 (indeks 4) dalam 2 aksi terpisah
    const entri1 = buatEntriSampahBatch([{ soal: awal[2], posisiSemula: 2 }], 1000);
    const entri2 = buatEntriSampahBatch([{ soal: awal[4], posisiSemula: 3 }], 2000); // posisi saat itu setelah s-3 dihapus adalah indeks 3
    const sisaSetelahHapus = [awal[0], awal[1], awal[3]];

    assert.equal(formatWaktuLengkapHHMMSS(new Date(2025, 0, 1, 8, 5, 9).getTime()), '08:05:09');

    // Simpan bersama draf game dan pastikan tetap ada saat dibaca kembali
    const idGame = 'game_uji_sampah';
    simpanDrafWizardGame({
      gameId: idGame,
      langkahAktif: 3,
      langkahSelesaiMaks: 2,
      draftPratinjau: sisaSetelahHapus,
      peringatanPratinjau: [],
      diagnostikImpor: null,
      teksTempel: '',
      infoImporTerakhir: null,
      tempatSampah: [...entri1, ...entri2],
      tersimpanPada: 2000,
    });

    const drafPulih = bacaDrafWizardGame(idGame);
    const sampahPulih = bacaSampahGame(idGame);
    assert.equal(drafPulih?.tempatSampah?.length, 2);
    assert.equal(sampahPulih.length, 2);

    // Kembalikan 1 soal (s-3) -> harus masuk lagi di indeks 2 dengan bonus & kunci tetap
    const { daftarBaru: pascaPulih1, idDipulihkan: id1 } = pulihkanItemKeDaftar(
      sisaSetelahHapus,
      [entri1[0]]
    );
    assert.deepEqual(id1, ['s-3']);
    assert.equal(pascaPulih1[2].id, 's-3');
    assert.equal(pascaPulih1[2].kunci, 2);
    assert.equal(pascaPulih1[2].bonus, true);

    // Kembalikan batch bersamaan (s-1 dan s-4 dihapus bersamaan lalu dikembalikan semua)
    const batch = buatEntriSampahBatch(
      [
        { soal: awal[0], posisiSemula: 0 },
        { soal: awal[3], posisiSemula: 3 },
      ],
      3000
    );
    const sisaTanpaBatch = [awal[1], awal[2], awal[4]];
    const { daftarBaru: pascaBatch } = pulihkanItemKeDaftar(sisaTanpaBatch, batch);
    assert.deepEqual(
      pascaBatch.map((x) => x.id),
      ['s-1', 's-2', 's-3', 's-4', 's-5']
    );

    // Uji kedaluwarsa > 7 hari setelah simpan final
    const tSimpanFinal = 1_000_000;
    simpanSampahGame(idGame, entri1, { disimpanFinalPada: tSimpanFinal });
    tandaiSampahGameDisimpanFinal(idGame, tSimpanFinal);

    const catatanUji: Record<string, CatatanSampahPerGame> = {
      [idGame]: {
        gameId: idGame,
        items: entri1,
        disimpanFinalPada: tSimpanFinal,
        diubahPada: tSimpanFinal,
      },
    };
    const sebelum7Hari = bersihkanSampahKedaluwarsa(
      catatanUji,
      tSimpanFinal + BATAS_SIMPAN_SAMPAH_MS - 1000
    );
    assert.ok(sebelum7Hari[idGame], 'Masih tersimpan sebelum 7 hari');

    const sesudah7Hari = bersihkanSampahKedaluwarsa(
      catatanUji,
      tSimpanFinal + BATAS_SIMPAN_SAMPAH_MS + 1000
    );
    assert.equal(sesudah7Hari[idGame], undefined, 'Otomatis bersih >7 hari setelah simpan final');

    hapusDrafWizardGame(idGame);
    hapusSampahGame(idGame);
  });

  // (b) Penanda Kunci Otomatis (Word 40 soal multi-sumber + PDF 40 soal 2 kolom + halaman kunci)
  await uji('(b) Word 40 soal mendeteksi bagian kunci, baris jawaban (incl. Ans:), bold/underline/highlight/warna/simbol, konflik, dan cek manual gambar', async () => {
    const buf = await buatDocx40SoalMultiSumber();
    const res = await parseWordBuffer(buf);

    assert.equal(res.totalSoal, 40, 'Harus terbaca tepat 40 soal');
    assert.equal(res.daftar[0].sumberKunci, 'penanda_pilihan', 'Soal 1 bold -> penanda_pilihan');
    assert.equal(res.daftar[8].sumberKunci, 'penanda_pilihan', 'Soal 9 underline -> penanda_pilihan');
    assert.equal(res.daftar[12].sumberKunci, 'penanda_pilihan', 'Soal 13 highlight -> penanda_pilihan');
    assert.equal(res.daftar[16].sumberKunci, 'penanda_pilihan', 'Soal 17 warna font -> penanda_pilihan');
    assert.equal(res.daftar[20].sumberKunci, 'penanda_pilihan', 'Soal 21 (*) -> penanda_pilihan');
    assert.equal(res.daftar[21].sumberKunci, 'penanda_pilihan', 'Soal 22 (✓) -> penanda_pilihan');
    assert.equal(res.daftar[22].sumberKunci, 'penanda_pilihan', 'Soal 23 (benar) -> penanda_pilihan');
    assert.equal(res.daftar[23].sumberKunci, 'penanda_pilihan', 'Soal 24 (kunci) -> penanda_pilihan');
    assert.equal(res.daftar[24].sumberKunci, 'baris_jawaban', 'Soal 25 Kunci: -> baris_jawaban');
    assert.equal(res.daftar[27].sumberKunci, 'baris_jawaban', 'Soal 28 Ans: -> baris_jawaban');
    assert.equal(res.daftar[30].sumberKunci, 'bagian_kunci', 'Soal 31 bagian kunci -> bagian_kunci');

    // Soal #12 bergambar harus ditandai cekManualMedia
    assert.equal(res.daftar[11].mengandungMediaDokumen, true);
    assert.ok(res.daftar[11].masalah.includes('cek_manual_media'));

    // Soal #39 konflik: bold (A=0) vs Bagian kunci (D=3)
    const soal39 = res.daftar[38];
    assert.equal(soal39.kunci, null, 'Konflik tidak boleh memilih diam-diam');
    assert.ok((soal39.kunciBertentangan?.length ?? 0) >= 2, 'Harus punya >= 2 kandidat kunci');
    assert.ok(soal39.masalah.includes('kunci_bertentangan'));

    // Soal #40 tanpa kunci
    assert.equal(res.daftar[39].kunci, null);
    assert.ok(res.daftar[39].masalah.includes('kunci_tidak_ditemukan'));

    const analisis = analisisKoreksiDaftarSoal(res.daftar, buatPengaturanDefault());
    assert.equal(analisis.ringkasanKunci.otomatis, 38);
    assert.equal(analisis.ringkasanKunci.bertentangan, 1);
    assert.equal(analisis.ringkasanKunci.belumAda, 1);
    assert.equal(analisis.perSoal[res.daftar[11].id].cekManualMedia, true);

    // Terima Semua Kunci Otomatis menandai 38 soal diterima, tanpa menyentuh konflik #39 / kosong #40
    const { daftarBaru, jumlahDiterima } = terimaSemuaKunciOtomatis(res.daftar);
    assert.equal(jumlahDiterima, 38);
    assert.equal(daftarBaru[0].kunciDiterima, true);
    assert.equal(daftarBaru[38].kunci, null);
    assert.equal(daftarBaru[39].kunci, null);
  });

  await uji('(b2) PDF 40 soal 2-kolom dengan halaman akhir Kunci Jawaban 2-kolom terbaca lengkap 40/40', () => {
    const halamanList = buatHalamanPdf40SoalDuaKolomPlusKunci();
    const res = parseHalamanPdfKeDraft(halamanList, 'otomatis');

    assert.equal(res.infoKolomPdf?.terdeteksiDuaKolom, true);
    assert.equal(res.totalSoal, 40, 'Harus terbaca 40 soal dari PDF 2 kolom');
    assert.equal(res.jumlahBermasalah, 0, 'Semua 40 kunci dari halaman akhir harus cocok');
    assert.equal(res.daftar[0].sumberKunci, 'bagian_kunci');
    assert.equal(res.daftar[39].sumberKunci, 'bagian_kunci');
    assert.equal(res.daftar[39].kunci, 3);
  });

  // (c) Koreksi Soal dan Jawaban (Merah, Kuning, Hijau, aturan Indonesia, dan peringatan umum)
  await uji('(c) Koreksi soal mengklasifikasikan Merah, Kuning, Hijau, menjaga elipsis Indonesia, dan memberi peringatan sebaran/waktu', () => {
    const sampel: DraftSoal[] = [
      // #1 Hijau sempurna (pakai "adalah ...")
      {
        id: 'k-1',
        pertanyaan: 'Ibu kota negara Indonesia adalah ...',
        pilihan: ['Bandung', 'Jakarta', 'Surabaya', 'Medan'],
        kunci: 1,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
      // #2 Kuning: pilihan rawan + pilihan jauh lebih panjang
      {
        id: 'k-2',
        pertanyaan: 'Manakah pernyataan yang paling tepat mengenai ekosistem?',
        pilihan: [
          'Satu',
          'Dua',
          'Tiga dengan penjelasan sangat panjang sekali melebihi pilihan lain secara mencolok dan rinci',
          'Semua benar',
        ],
        kunci: 2,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
      // #3 Kuning: mirip >90% dengan #4 (perbedaan kata bukan cuma angka)
      {
        id: 'k-3',
        pertanyaan: 'Apa fungsi utama akar pada tumbuhan berbiji terbuka di darat?',
        pilihan: ['Menyerap air', 'Fotosintesis', 'Respirasi daun', 'Membantu penyerbukan'],
        kunci: 0,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
      // #4 Kuning: mirip >90% dengan #3
      {
        id: 'k-4',
        pertanyaan: 'Apa fungsi utama akar pada tumbuhan berbiji tertutup di darat?',
        pilihan: ['Menyerap air', 'Fotosintesis', 'Respirasi daun', 'Membantu penyerbukan'],
        kunci: 0,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
      // #5 Merah: pilihan kembar + tanpa tanda baca + pilihan kosong tidak ada
      {
        id: 'k-5',
        pertanyaan: 'Mana yang benar',
        pilihan: ['Opsi sama', 'Opsi sama', 'Lainnya', 'Keempat'],
        kunci: 0,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
      // #6 Kuning: kurang rapi + terlalu pendek
      {
        id: 'k-6',
        pertanyaan: 'hasil 2 + 2 ?',
        pilihan: ['a. Empat', 'Lima', 'Enam', 'Tujuh'],
        kunci: 0,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
    ];

    const valid = validasiDaftarDraftSoal(sampel).daftar;
    const pengaturanWaktu = {
      ...buatPengaturanDefault(),
      akhirPermainan: 'waktu' as const,
      durasiWaktu: 10,
    };
    const analisis = analisisKoreksiDaftarSoal(valid, pengaturanWaktu);

    assert.equal(analisis.perSoal['k-1'].level, 'hijau', 'Frasa "adalah ..." tetap hijau');
    assert.equal(analisis.perSoal['k-2'].level, 'kuning');
    assert.ok(valid[1].masalah.includes('pilihan_rawan'));
    assert.ok(valid[1].masalah.includes('pilihan_terlalu_panjang_timpang'));

    assert.equal(analisis.perSoal['k-3'].level, 'kuning');
    assert.ok(valid[2].masalah.includes('soal_kembar'));
    assert.equal(valid[2].pasanganMirip?.[0].nomor, 4);

    assert.equal(analisis.perSoal['k-5'].level, 'merah');
    assert.ok(valid[4].masalah.includes('pilihan_kembar'));

    assert.equal(analisis.perSoal['k-6'].level, 'kuning');
    assert.ok(valid[5].masalah.includes('format_kurang_rapi'));
    assert.ok(valid[5].masalah.includes('soal_terlalu_pendek'));

    // Peringatan umum: sebaran kunci A (indeks 0) = 4/6 = 67%, 4x berturut-turut (#3..#6), soal < 25/tim
    assert.ok(analisis.peringatanUmumKoreksi.sebaranKunciTimpang);
    assert.ok(analisis.peringatanUmumKoreksi.urutanKunciBeruntun);
    assert.ok(analisis.peringatanUmumKoreksi.soalKurangUntukWaktu);
  });

  // (d) Rapikan Otomatis dengan pratinjau sebelum/sesudah
  await uji('(d) Rapikan Otomatis membuat pratinjau Sebelum/Sesudah dan membersihkan teks tanpa merusak elipsis maupun kunci', () => {
    const kotor: DraftSoal[] = validasiDaftarDraftSoal([
      {
        id: 'r-1',
        pertanyaan: '3.  siapakah  penemu lampu pijar ?',
        pilihan: ['A. Thomas Alfa Edison', 'b) Nikola  Tesla', 'C. James Watt', 'D. Isaac Newton'],
        kunci: 0,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
      {
        id: 'r-2',
        pertanyaan: 'Planet terbesar di tata surya adalah ...',
        pilihan: ['Jupiter', 'Mars', 'Venus', 'Bumi'],
        kunci: 0,
        sumber: 'teks',
        sumberKunci: 'baris_jawaban',
        masalah: [],
        peringatanDetail: [],
      },
    ]).daftar;

    const pratinjau = buatPratinjauRapikanOtomatis(kotor);
    assert.equal(pratinjau.length, 1, 'Hanya soal r-1 yang perlu dirapikan; r-2 dengan "adalah ..." tidak disentuh');
    assert.equal(pratinjau[0].pertanyaanSesudah, 'Siapakah penemu lampu pijar?');
    assert.deepEqual(pratinjau[0].pilihanSesudah, [
      'Thomas Alfa Edison',
      'Nikola Tesla',
      'James Watt',
      'Isaac Newton',
    ]);

    const { daftarBaru, jumlahDiubah } = terapkanRapikanOtomatis(kotor);
    assert.equal(jumlahDiubah, 1);
    assert.equal(daftarBaru[0].pertanyaan, 'Siapakah penemu lampu pijar?');
    assert.equal(daftarBaru[0].kunci, 0, 'Kunci tidak boleh berubah');
    assert.equal(daftarBaru[1].pertanyaan, 'Planet terbesar di tata surya adalah ...');
  });

  // (e) & (f) Alur Koreksi Cepat + Penanganan Konflik + Konversi siap main
  await uji('(e) Konflik kunci yang diselesaikan guru langsung valid untuk dimainkan dan soal merah saja yang dikecualikan', () => {
    const teks = `1. Berapakah hasil 5 × 6?
A. *25
B. 30
C. 35
D. 40
Kunci: B

2. Negara tetangga Indonesia di sebelah utara?
A. Australia
B. Malaysia
C. Selandia Baru
D. Papua Nugini`;

    const hasilAwal = parseTeksSoal(teks, 'teks');
    assert.equal(hasilAwal.daftar[0].kunci, null, 'Konflik (*25 vs Kunci: B) harus merah dulu');
    assert.ok(hasilAwal.daftar[0].masalah.includes('kunci_bertentangan'));
    assert.equal(hasilAwal.daftar[1].kunci, null, 'Soal 2 belum punya kunci');

    // Simulasi penyelesaian lewat Koreksi Cepat: pilih kandidat 'baris_jawaban' (B) untuk #1, dan klik B untuk #2
    const setelahKoreksi = validasiDaftarDraftSoal(
      hasilAwal.daftar.map((item, idx) =>
        idx === 0
          ? {
              ...item,
              kunci: 1,
              sumberKunci: 'baris_jawaban',
              detailSumberKunci: LABEL_SUMBER_KUNCI.baris_jawaban,
              kunciBertentangan: undefined,
              kunciDiterima: true,
            }
          : {
              ...item,
              kunci: 1,
              sumberKunci: 'manual',
              detailSumberKunci: LABEL_SUMBER_KUNCI.manual,
              kunciDiterima: true,
            }
      )
    ).daftar;

    const { soalValid, jumlahDilewati } = konversiDraftValidKeSoal(setelahKoreksi);
    assert.equal(jumlahDilewati, 0);
    assert.equal(soalValid.length, 2);
    assert.equal(soalValid[0].kunci, 1);
    assert.equal(soalValid[1].kunci, 1);
  });

  process.stdout.write(`\nTotal lulus: ${lulus}/6 skenario wajib Periksa Soal & Koreksi.\n`);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

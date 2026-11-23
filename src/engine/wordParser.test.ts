import { strict as assert } from 'node:assert';
import JSZip from 'jszip';
import {
  buatLaporanDiagnosaTeks,
  konversiPenandaBarisKeDraft,
  PetaPeranBaris,
  terapkanTandaiCepat,
} from '../parsers/penandaBaris';
import { parseTeksSoal } from '../parsers/textParser';
import {
  konversiDraftValidKeSoal,
  PESAN_PERINGATAN_GAGAL_BACA_BESAR,
} from '../parsers/validator';
import {
  ekstrakBarisDariHtmlWord,
  parseHtmlWord,
  parseWordBuffer,
} from '../parsers/wordParser';
import {
  parseTeksKunci,
  terapkanPetaKunciKeDraft,
} from '../parsers/kunciParser';
import {
  HalamanItemsPdf,
  ItemTeksPdf,
  parseHalamanPdfKeDraft,
} from '../parsers/pdfKolom';

const laporanUji: { nama: string; status: 'LULUS' | 'GAGAL' }[] = [];

async function jalankanUji(nama: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    laporanUji.push({ nama, status: 'LULUS' });
  } catch (err) {
    laporanUji.push({ nama, status: 'GAGAL' });
    console.error(`GAGAL pada [${nama}]:`, err);
    throw err;
  }
}

async function buatDocxBufferDariXml(documentXml: string, numberingXml?: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  ${numberingXml ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : ''}
</Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${numberingXml ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' : ''}
</Relationships>`
  );
  zip.file('word/document.xml', documentXml);
  if (numberingXml) {
    zip.file('word/numbering.xml', numberingXml);
  }
  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;
}

async function main() {
  // 1. Uji HTML tiruan dokumen ujian nyata (kepala, PILIHAN GANDA, 10 soal <ol> bertingkat, kunci tebal/u/mark, URAIAN 3 soal)
  await jalankanUji('HTML Ujian Nyata (10 soal ol bertingkat + kepala + kunci tebal + Uraian dilewati)', () => {
    const kunciDiharapkan = [0, 1, 2, 3, 1, 0, 2, 3, 1, 2];
    const itemsHtml = Array.from({ length: 10 }, (_, idx) => {
      const k = kunciDiharapkan[idx];
      const tagBuka = idx % 3 === 0 ? '<strong>' : idx % 3 === 1 ? '<u>' : '<mark>';
      const tagTutup = idx % 3 === 0 ? '</strong>' : idx % 3 === 1 ? '</u>' : '</mark>';
      const opsi = ['Perangkat lunak', 'Menu Beranda', 'Tombol Simpan', 'Ikon Cetak'];
      const liOpsi = opsi
        .map((teksOpsi, oIdx) =>
          oIdx === k
            ? `<li>${tagBuka}${teksOpsi} soal ${idx + 1}${tagTutup}</li>`
            : `<li>${teksOpsi} soal ${idx + 1}</li>`
        )
        .join('');
      return `<li><strong>Apa fungsi fitur nomor ${idx + 1} pada pengolah kata?</strong><ol>${liOpsi}</ol></li>`;
    }).join('');

    const html = `
      <h1>SOAL ULANGAN HARIAN MICROSOFT WORD</h1>
      <p>Materi: Latihan 1 sampai 6<br/>Nama: .....................<br/>Kelas: VII-A<br/>Hari/Tanggal: Senin, 10 November 2025</p>
      <h2>PILIHAN GANDA</h2>
      <p>Pilihlah jawaban yang paling benar!</p>
      <ol>${itemsHtml}</ol>
      <h2>URAIAN</h2>
      <p>Jawablah pertanyaan berikut dengan tepat!</p>
      <ol>
        <li>Sebutkan tiga jenis perataan paragraf!<p>Jawab: ........................</p></li>
        <li>Jelaskan fungsi ikon Bold pada toolbar!<p>Jawab: ........................</p></li>
        <li>Bagaimana cara menyimpan dokumen baru?<p>Jawab: ........................</p></li>
      </ol>
    `;

    const hasil = parseHtmlWord(html, 'docx');
    assert.equal(hasil.totalSoal, 10, `Harus terbaca 10 soal PG, terbaca ${hasil.totalSoal}`);
    assert.equal(hasil.jumlahBermasalah, 0, 'Semua 10 soal harus valid tanpa masalah');
    assert.ok(!hasil.indikasiGagalBacaBesar, 'Tidak boleh memicu peringatan gagal baca besar');

    // Pastikan kepala dokumen & uraian tidak menempel dan tidak ikut jadi soal/pilihan
    for (let i = 0; i < 10; i += 1) {
      const s = hasil.daftar[i];
      assert.equal(s.pilihan.length, 4, `Soal #${i + 1} harus punya 4 pilihan`);
      assert.equal(s.kunci, kunciDiharapkan[i], `Kunci soal #${i + 1} harus indeks ${kunciDiharapkan[i]}`);
      assert.equal(s.keyakinan, 'yakin', `Keyakinan soal #${i + 1} harus yakin`);
      assert.ok(!s.pertanyaan.includes('Materi:'), 'Kepala Materi tidak boleh masuk pertanyaan');
      assert.ok(!s.pertanyaan.includes('Hari/Tanggal'), 'Kepala Hari/Tanggal tidak boleh masuk pertanyaan');
      assert.ok(!s.pilihan.join(' ').includes('URAIAN'), 'Uraian tidak boleh masuk pilihan');
      assert.ok(!s.pilihan.join(' ').includes('Pilihlah jawaban'), 'Petunjuk tidak boleh masuk pilihan');
    }

    assert.ok(
      hasil.catatanBagian?.includes('Bagian URAIAN dilewati: 3 soal (tidak didukung)'),
      `Catatan URAIAN tidak sesuai: ${JSON.stringify(hasil.catatanBagian)}`
    );
  });

  // 2. Uji dokumen .docx biner nyata melalui JSZip + Mammoth + XML numbering
  await jalankanUji('Dokumen .docx Nyata (parseWordBuffer + word/numbering.xml + bold key + Uraian)', async () => {
    const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="10"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="20"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

    const buatP = (teks: string, bold = false, num?: { id: string; ilvl: number }) => `
      <w:p>
        ${num ? `<w:pPr><w:numPr><w:ilvl w:val="${num.ilvl}"/><w:numId w:val="${num.id}"/></w:numPr></w:pPr>` : ''}
        <w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t>${teks}</w:t></w:r>
      </w:p>`;

    const soalXml = [0, 1, 2, 3, 2]
      .map((kunciIdx, sIdx) => {
        const q = buatP(`Ikon untuk menebalkan huruf pada soal ke-${sIdx + 1} adalah ...`, false, {
          id: '10',
          ilvl: 0,
        });
        const opsi = ['Bold', 'Italic', 'Underline', 'Align Left']
          .map((label, oIdx) => buatP(`${label} opsi ${sIdx + 1}`, oIdx === kunciIdx, { id: '10', ilvl: 1 }))
          .join('');
        return q + opsi;
      })
      .join('');

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${buatP('SOAL ULANGAN HARIAN MICROSOFT WORD', true)}
    ${buatP('Materi: Latihan 1 sampai 6')}
    ${buatP('Nama: __________   Kelas: __________   Hari/Tanggal: __________')}
    ${buatP('A. PILIHAN GANDA', true)}
    ${buatP('Pilihlah jawaban yang paling benar!')}
    ${soalXml}
    ${buatP('B. URAIAN', true)}
    ${buatP('Jawablah pertanyaan berikut dengan jelas!')}
    ${buatP('Sebutkan langkah menyimpan file!', false, { id: '20', ilvl: 0 })}
    ${buatP('Jawab: ...........................................')}
    ${buatP('Jelaskan perbedaan Save dan Save As!', false, { id: '20', ilvl: 0 })}
    ${buatP('Jawab: ...........................................')}
  </w:body>
</w:document>`;

    const buf = await buatDocxBufferDariXml(docXml, numberingXml);
    const hasil = await parseWordBuffer(buf);

    assert.equal(hasil.totalSoal, 5, `Harus terbaca 5 soal dari .docx nyata, terbaca ${hasil.totalSoal}`);
    assert.deepEqual(
      hasil.daftar.map((d) => d.kunci),
      [0, 1, 2, 3, 2],
      'Kunci bold pada .docx multilevel list harus terbaca tepat'
    );
    assert.ok(
      hasil.catatanBagian?.some((c) => c.includes('Bagian URAIAN dilewati: 2 soal')),
      `Catatan URAIAN tidak sesuai: ${JSON.stringify(hasil.catatanBagian)}`
    );
  });

  // 3. Uji batas paragraf & <br> (tidak ada kata menempel)
  await jalankanUji('Batas Paragraf dan <br> tidak menempelkan kata', () => {
    const html = `<p>Materi: Latihan 1 sampai 6<br>Nama: Budi<br>Kelas: VIII</p><p>PILIHAN GANDA</p><p>1. Ibukota Indonesia adalah?</p><p>A. Jakarta</p><p>B. Bandung</p><p>Kunci: A</p><p>2. Gunung tertinggi di Jawa adalah?</p><p>A. Merapi</p><p>B. Semeru</p><p>Kunci: B</p>`;
    const { barisMentah } = ekstrakBarisDariHtmlWord(html);
    assert.ok(barisMentah.includes('Materi: Latihan 1 sampai 6'));
    assert.ok(barisMentah.includes('Nama: Budi'));
    assert.ok(barisMentah.includes('Kelas: VIII'));
    assert.ok(!barisMentah.some((b) => b.includes('6Nama:') || b.includes('BudiKelas:')));
  });

  // 4. Uji soal dalam tabel (2 kolom & grid)
  await jalankanUji('Soal dalam Tabel (2 kolom dan tabel grid)', () => {
    const htmlTabel2Kolom = `
      <table>
        <tr><td>1.</td><td><p>Hasil dari 12 x 5 adalah ...</p><ol type="a"><li>50</li><li><strong>60</strong></li><li>70</li><li>80</li></ol></td></tr>
        <tr><td>2.</td><td><p>Satuan panjang baku adalah ...</p><ol type="a"><li>Gram</li><li>Liter</li><li><u>Meter</u></li><li>Sekon</li></ol></td></tr>
      </table>
    `;
    const h1 = parseHtmlWord(htmlTabel2Kolom, 'docx');
    assert.equal(h1.totalSoal, 2);
    assert.equal(h1.daftar[0].kunci, 1);
    assert.equal(h1.daftar[1].kunci, 2);

    const htmlTabelGrid = `
      <table>
        <tr><th>No</th><th>Soal</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Kunci</th></tr>
        <tr><td>1</td><td>Planet terdekat dari matahari?</td><td>Merkurius</td><td>Venus</td><td>Bumi</td><td>Mars</td><td>A</td></tr>
        <tr><td>2</td><td>Lambang kimia air?</td><td>CO2</td><td>H2O</td><td>O2</td><td>NaCl</td><td>B</td></tr>
      </table>
    `;
    const h2 = parseHtmlWord(htmlTabelGrid, 'docx');
    assert.equal(h2.totalSoal, 2);
    assert.equal(h2.daftar[0].pilihan.length, 4);
    assert.equal(h2.daftar[0].kunci, 0);
    assert.equal(h2.daftar[1].kunci, 1);
  });

  // 5. Uji nomor ketik manual, campuran, huruf kecil (a., b), (c)), dan daftar pilihan terpisah
  await jalankanUji('Nomor ketik manual, campuran ol pilihan terpisah, huruf kecil & kurung', () => {
    const htmlCampuran = `
      <p>1. Manakah bilangan prima?</p>
      <ol type="a"><li>4</li><li><strong>5</strong></li><li>6</li><li>8</li></ol>
      <p>2. Hasil 3 + 4 = ...</p>
      <p>(a) 5</p>
      <p>(b) 6</p>
      <p>(c) <strong>7</strong></p>
      <p>(d) 8</p>
      <p>3) Ibukota Jawa Timur?</p>
      <ol><li>Bandung</li><li>Medan</li><li>Semarang</li><li><strong>Surabaya</strong></li></ol>
    `;
    const hasil = parseHtmlWord(htmlCampuran, 'docx');
    assert.equal(hasil.totalSoal, 3);
    assert.deepEqual(hasil.daftar.map((s) => s.kunci), [1, 2, 3]);
    assert.equal(hasil.jumlahBermasalah, 0);
  });

  // 6. Uji dokumen tanpa judul bagian & nomor lanjut <ol start="5">
  await jalankanUji('Dokumen tanpa judul bagian dan ol start="5"', () => {
    const html = `
      <p>ULANGAN IPA TERPADU</p>
      <p>Nama: Siswa</p>
      <ol start="5">
        <li>Bagian tumbuhan yang menyerap air adalah ...
          <ol type="A"><li><strong>Akar</strong></li><li>Daun</li><li>Bunga</li><li>Buah</li></ol>
        </li>
        <li>Proses pembuatan makanan pada tumbuhan disebut ...
          <ol type="A"><li>Respirasi</li><li><u>Fotosintesis</u></li><li>Transpirasi</li><li>Adaptasi</li></ol>
        </li>
      </ol>
    `;
    const hasil = parseHtmlWord(html, 'docx');
    assert.equal(hasil.totalSoal, 2);
    assert.equal(hasil.daftar[0].nomorAsli, 5);
    assert.equal(hasil.daftar[1].nomorAsli, 6);
    assert.deepEqual(hasil.daftar.map((d) => d.kunci), [0, 1]);
  });

  // 7. Uji pengaman anti-kekeliruan besar (1 soal / >800 kar / >300 kar opsi) & fallback paragraf
  await jalankanUji('Pengaman anti-kekeliruan besar & fallback paragraf Perlu dicek', () => {
    const htmlSatuSoalBesar = `<p>1. ${'Kata sangat panjang sekali '.repeat(45)}</p><p>A. ${'Pilihan panjang '.repeat(25)}</p><p>B. Pendek</p><p>Kunci: B</p>`;
    const hGagal = parseHtmlWord(htmlSatuSoalBesar, 'docx');
    assert.equal(hGagal.indikasiGagalBacaBesar, true);
    assert.equal(hGagal.peringatanKritis, PESAN_PERINGATAN_GAGAL_BACA_BESAR);
    assert.ok(hGagal.daftar[0].masalah.includes('teks_terlalu_panjang'));
    assert.equal(hGagal.daftar[0].keyakinan, 'bermasalah');
    const konv = konversiDraftValidKeSoal(hGagal.daftar);
    assert.equal(konv.soalValid.length, 0, 'Soal rusak tidak boleh masuk bank game');

    const htmlParagrafSaja = `
      <p>Siapakah presiden pertama Republik Indonesia?</p>
      <p>*Soekarno</p>
      <p>Soeharto</p>
      <p>Habibie</p>
      <p>Abdurrahman Wahid</p>
    `;
    const hPara = parseHtmlWord(htmlParagrafSaja, 'docx');
    assert.equal(hPara.totalSoal, 1);
    assert.equal(hPara.daftar[0].pilihan.length, 4);
    assert.equal(hPara.daftar[0].kunci, 0);
    assert.equal(hPara.daftar[0].keyakinan, 'perlu_dicek');
  });

  // 8. Uji Penanda Baris (Tandai Manual + Tandai Cepat) & Laporan Diagnosa
  await jalankanUji('Penanda Baris (Tandai Cepat, lanjutan soal, kunci A-D) & Laporan Diagnosa', () => {
    const barisMentah = [
      'SOAL ULANGAN HARIAN',
      'Nama: _________',
      '1. Perhatikan pernyataan berikut:',
      'Kalimat lanjutan soal di baris kedua.',
      'Pilihan satu',
      'Pilihan dua',
      'Pilihan tiga',
      'Pilihan empat',
      'Berapa hasil 5 + 5?',
      '8',
      '10',
      '12',
      '15',
    ];

    let peta: PetaPeranBaris = {
      0: 'abaikan',
      1: 'abaikan',
      2: 'soal',
      // baris 3 dibiarkan kosong perannya -> harus tergabung sebagai lanjutan soal!
      4: 'opsi_a',
      5: 'opsi_b',
      6: 'opsi_c',
      7: 'opsi_d',
    };
    peta[7] = 'opsi_d';
    // Tandai kunci soal 1 lewat kunci_b pada baris opsional atau ganti setelah Tandai Cepat
    const cepat = terapkanTandaiCepat(barisMentah, peta, 8);
    peta = { ...cepat.peranBaru };

    const hasilPenanda = konversiPenandaBarisKeDraft(barisMentah, peta, 'docx');
    assert.equal(hasilPenanda.totalSoal, 2);
    assert.ok(
      hasilPenanda.daftar[0].pertanyaan.includes('Kalimat lanjutan soal di baris kedua.'),
      'Baris tanpa peran di bawah Mulai Soal harus digabung sebagai lanjutan soal'
    );
    assert.equal(hasilPenanda.daftar[0].pilihan.length, 4);
    assert.equal(hasilPenanda.daftar[1].pertanyaan, 'Berapa hasil 5 + 5?');
    assert.deepEqual(hasilPenanda.daftar[1].pilihan, ['8', '10', '12', '15']);

    // Tambah penanda kunci_b untuk soal 2 pada baris 10 -> cek jika ada baris kunci terpisah
    const barisDenganKunci = [...barisMentah, 'Kunci soal 2'];
    const peta2: PetaPeranBaris = { ...peta, 13: 'kunci_b' };
    const hasil2 = konversiPenandaBarisKeDraft(barisDenganKunci, peta2, 'docx');
    assert.equal(hasil2.daftar[1].kunci, 1);

    const laporanJson = buatLaporanDiagnosaTeks({
      jenisDokumen: 'docx',
      namaFile: 'ulangan_word.docx',
      barisMentah,
      soalTerbaca: hasil2.daftar,
      peringatan: ['Catatan uji'],
    });
    const parsedLaporan = JSON.parse(laporanJson);
    assert.equal(parsedLaporan.jenisDokumen, 'docx');
    assert.equal(parsedLaporan.barisMentah40Pertama.length, barisMentah.length);
    assert.equal(parsedLaporan.soalTerbaca.length, 2);
  });

  // 9. Regresi parser Tempel Teks terstruktur + blok kode + daftar kunci akhir
  await jalankanUji('Regresi Tempel Teks terstruktur, blok kode, dan kunci akhir tetap lulus', () => {
    const contohTeks = `1. Hasil dari 18 x 4 adalah ...
A. 64
B. 72
C. 78
D. 84
Kunci: B
Penjelasan: 18 dikali 4 sama dengan 72.
Tingkat: Mudah
Topik: Matematika

2) Manakah ibu kota Jawa Barat?
(A) Surabaya
(B) *Bandung
(C) Semarang
(D) Medan

3 - Perhatikan potongan kode berikut:
\`\`\`
let total = 0;
for (let i = 1; i <= 3; i++) {
  total += i;
}
\`\`\`
Nilai akhir variabel total adalah ...
a. 3
b. 5
c. 6
d. 7

No. 4 Planet bercincin paling jelas adalah ...
A) Mars
B) Venus
C) Saturnus ✓
D) Merkurius

Kunci Jawaban:
3. C`;

    const res = parseTeksSoal(contohTeks, 'teks');
    assert.equal(res.totalSoal, 4);
    assert.equal(res.jumlahBermasalah, 0);
    assert.deepEqual(
      res.daftar.map((d) => d.kunci),
      [1, 1, 2, 2]
    );
    assert.ok(res.daftar[2].kode?.includes('let total = 0;'));
  });

  // 10. Uji PDF 2 Kolom (595.4x841.8, celah 276..314, Soal #14 melintas kolom, 15 PG + 5 Uraian)
  await jalankanUji('PDF 2 Kolom (595.4x841.8): 15 PG + 5 Uraian + Soal #14 lintas kolom', () => {
    const itemsHalaman1: ItemTeksPdf[] = [];
    const lebarHal = 595.4;

    const tambahKiri = (y: number, teks: string, x = 28) => {
      itemsHalaman1.push({ x, y, teks, width: Math.min(240, teks.length * 4.5) });
    };
    const tambahKanan = (y: number, teks: string, x = 314) => {
      itemsHalaman1.push({ x, y, teks, width: Math.min(245, teks.length * 4.5) });
    };

    // Kepala dokumen & judul bagian di kolom kiri atas
    let yKiri = 790;
    tambahKiri(yKiri, 'SOAL ULANGAN HARIAN MS WORD X');
    yKiri -= 14;
    tambahKiri(yKiri, 'Nama: ....... Kelas: ....... Hari/Tanggal: .......');
    yKiri -= 16;
    tambahKiri(yKiri, 'A. PILIHAN GANDA');
    yKiri -= 14;
    tambahKiri(yKiri, 'Pilihlah jawaban yang paling benar!');
    yKiri -= 16;

    // Soal 1..13 + bagian awal Soal 14 di kolom kiri (dengan spasi lebar setelah nomor)
    for (let no = 1; no <= 13; no += 1) {
      tambahKiri(yKiri, `${no}.        Fungsi fitur ke-${no} pada MS Word adalah ...`);
      yKiri -= 11;
      tambahKiri(yKiri, `A. Pilihan A soal ${no}`);
      yKiri -= 10;
      tambahKiri(yKiri, `B. Pilihan B soal ${no}`);
      yKiri -= 10;
      tambahKiri(yKiri, `C. Pilihan C soal ${no}`);
      yKiri -= 10;
      tambahKiri(yKiri, `D. Pilihan D soal ${no}`);
      yKiri -= 12;
    }

    // Soal 14 dimulai di bawah kolom kiri (hanya pertanyaan, A, B)
    tambahKiri(yKiri, '14.        Perintah mencetak dokumen cepat menggunakan tombol ...');
    yKiri -= 11;
    tambahKiri(yKiri, 'A. Ctrl + S');
    yKiri -= 10;
    tambahKiri(yKiri, 'B. Ctrl + O');

    // Kolom kanan mulai dari atas: lanjutan Soal 14 (C, D), Soal 15, lalu B. URAIAN (5 soal)
    let yKanan = 790;
    tambahKanan(yKanan, 'C. Ctrl + P');
    yKanan -= 11;
    tambahKanan(yKanan, 'D. Ctrl + N');
    yKanan -= 14;

    tambahKanan(yKanan, '15.        Orientasi kertas memanjang ke samping disebut ...');
    yKanan -= 11;
    tambahKanan(yKanan, 'A. Portrait');
    yKanan -= 10;
    tambahKanan(yKanan, 'B. Landscape');
    yKanan -= 10;
    tambahKanan(yKanan, 'C. Margin');
    yKanan -= 10;
    tambahKanan(yKanan, 'D. Gutter');
    yKanan -= 20;

    tambahKanan(yKanan, 'B. URAIAN');
    yKanan -= 14;
    tambahKanan(yKanan, 'Jawablah pertanyaan di bawah ini!');
    yKanan -= 14;

    for (let u = 1; u <= 5; u += 1) {
      tambahKanan(yKanan, `${u}. Sebutkan langkah uraian ke-${u}!`);
      yKanan -= 11;
      tambahKanan(yKanan, 'Jawab:…….');
      yKanan -= 14;
    }

    const halamanList: HalamanItemsPdf[] = [
      { lebarHalaman: lebarHal, items: itemsHalaman1 },
    ];

    const hasilAuto = parseHalamanPdfKeDraft(halamanList, 'otomatis');
    assert.equal(hasilAuto.infoKolomPdf?.terdeteksiDuaKolom, true, 'Harus mendeteksi 2 kolom');
    assert.equal(
      hasilAuto.infoKolomPdf?.keterangan,
      'Terdeteksi 2 kolom, dibaca kiri lalu kanan'
    );
    assert.equal(
      hasilAuto.totalSoal,
      15,
      `Harus terbaca 15 soal PG, terbaca ${hasilAuto.totalSoal}`
    );

    for (let i = 0; i < 15; i += 1) {
      const s = hasilAuto.daftar[i];
      assert.equal(s.pilihan.length, 4, `Soal #${i + 1} harus memiliki tepat 4 pilihan`);
      assert.ok(
        !s.pertanyaan.includes('Fungsi fitur ke-') || !s.pertanyaan.includes('URAIAN'),
        'Kolom kiri dan kanan tidak boleh menempel'
      );
      assert.ok(
        !s.pilihan.join(' ').includes('Jawab:'),
        'Baris Jawab:……. tidak boleh masuk pilihan'
      );
      assert.ok(
        !s.pilihan.join(' ').includes('PILIHAN GANDA'),
        'Heading PILIHAN GANDA tidak boleh jadi pilihan'
      );
    }

    // Pastikan Soal #14 berhasil menyambung A, B (kolom kiri) + C, D (kolom kanan)
    assert.deepEqual(hasilAuto.daftar[13].pilihan, [
      'Ctrl + S',
      'Ctrl + O',
      'Ctrl + P',
      'Ctrl + N',
    ]);
    assert.equal(
      hasilAuto.daftar[14].pertanyaan,
      'Orientasi kertas memanjang ke samping disebut ...'
    );
    assert.ok(
      hasilAuto.catatanBagian?.some((c) => c.includes('Bagian URAIAN dilewati: 5 soal')),
      `Catatan URAIAN harus menyebut 5 soal dilewati, didapat: ${JSON.stringify(hasilAuto.catatanBagian)}`
    );

    // Bandingkan dengan paksa 1 kolom (harus tidak menandai 2 kolom)
    const hasil1Kolom = parseHalamanPdfKeDraft(halamanList, '1kolom');
    assert.equal(hasil1Kolom.infoKolomPdf?.terdeteksiDuaKolom, false);
  });

  // 11. Regresi Word (.docx) 15 PG penomoran otomatis + pilihan manual dipisah <w:br/> + 5 Uraian tanpa kunci
  await jalankanUji('Word (.docx) regresi 15 PG soft <w:br/> + tanpa kunci + 5 Uraian', async () => {
    const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="5"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="6"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

    const soalPgXml = Array.from({ length: 15 }, (_, idx) => {
      const no = idx + 1;
      return `
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>
          <w:r><w:t>Pertanyaan Microsoft Word nomor ${no}?</w:t><w:br/></w:r>
          <w:r><w:t>A. Opsi satu ${no}</w:t><w:br/></w:r>
          <w:r><w:t>B. Opsi dua ${no}</w:t><w:br/></w:r>
          <w:r><w:t>C. Opsi tiga ${no}</w:t><w:br/></w:r>
          <w:r><w:t>D. Opsi empat ${no}</w:t></w:r>
        </w:p>`;
    }).join('');

    const soalUraianXml = Array.from({ length: 5 }, (_, idx) => {
      const no = idx + 1;
      return `
        <w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="6"/></w:numPr></w:pPr>
          <w:r><w:t>Jelaskan langkah fitur ke-${no}!</w:t></w:r>
        </w:p>
        <w:p><w:r><w:t>Jawab:…….</w:t></w:r></w:p>`;
    }).join('');

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>SOAL ULANGAN HARIAN MS WORD X</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. PILIHAN GANDA</w:t></w:r></w:p>
    ${soalPgXml}
    <w:p><w:r><w:t>B. URAIAN</w:t></w:r></w:p>
    ${soalUraianXml}
    <w:sectPr><w:cols w:num="2" w:space="720"/></w:sectPr>
  </w:body>
</w:document>`;

    const buf = await buatDocxBufferDariXml(docXml, numberingXml);
    const hasil = await parseWordBuffer(buf);

    assert.equal(hasil.totalSoal, 15, `Harus terbaca 15 PG dari .docx, terbaca ${hasil.totalSoal}`);
    for (let i = 0; i < 15; i += 1) {
      assert.equal(hasil.daftar[i].pilihan.length, 4);
      assert.equal(hasil.daftar[i].kunci, null, 'Soal tanpa kunci harus menunggu pengisian kunci');
      assert.ok(hasil.daftar[i].masalah.includes('kunci_tidak_ditemukan'));
    }
    assert.ok(
      hasil.catatanBagian?.some((c) => c.includes('Bagian URAIAN dilewati: 5 soal')),
      `Catatan URAIAN tidak sesuai: ${JSON.stringify(hasil.catatanBagian)}`
    );
  });

  // 12. Uji Isi Kunci Cepat (kunciParser semua format & terapkanPetaKunciKeDraft)
  await jalankanUji('Parser Kunci Cepat: semua format tempel, deretan huruf, mismatch warning & terapkan', () => {
    const f1 = parseTeksKunci('1. B  2. C  3. A  4. D', 4);
    assert.deepEqual(f1.petaKunci, { 1: 1, 2: 2, 3: 0, 4: 3 });
    assert.equal(f1.peringatan.length, 0);

    const f2 = parseTeksKunci('1-B, 2-C, 3-A', 3);
    assert.deepEqual(f2.petaKunci, { 1: 1, 2: 2, 3: 0 });

    const f3 = parseTeksKunci('Kunci Jawaban:\n1:B\n2:D\nNo. 3: A', 3);
    assert.deepEqual(f3.petaKunci, { 1: 1, 2: 3, 3: 0 });

    const f4 = parseTeksKunci('1 B\n2 A\n3 C', 3);
    assert.deepEqual(f4.petaKunci, { 1: 1, 2: 0, 3: 2 });

    const deretan15 = 'BCADBCADBCADBCA';
    const f5 = parseTeksKunci(deretan15, 15);
    assert.equal(f5.mode, 'deretan');
    assert.equal(f5.daftarPasangan.length, 15);
    assert.equal(f5.peringatan.length, 0);

    const fMismatch = parseTeksKunci('BCAD', 15);
    assert.equal(fMismatch.peringatan.length, 1);
    assert.ok(fMismatch.peringatan[0].includes('4'));
    assert.ok(fMismatch.peringatan[0].includes('15'));

    // Terapkan deretan15 ke 15 soal belum berkunci -> semua menjadi Yakin
    const teks15TanpaKunci = Array.from(
      { length: 15 },
      (_, idx) =>
        `${idx + 1}. Pertanyaan uji ke-${idx + 1}?\nA. Satu\nB. Dua\nC. Tiga\nD. Empat`
    ).join('\n');
    const draftTanpaKunci = parseTeksSoal(teks15TanpaKunci, 'pdf');
    assert.equal(konversiDraftValidKeSoal(draftTanpaKunci.daftar).soalValid.length, 0);

    const sesudahTerapkan = terapkanPetaKunciKeDraft(
      draftTanpaKunci.daftar,
      f5.petaKunci,
      [],
      'pdf'
    );
    assert.equal(konversiDraftValidKeSoal(sesudahTerapkan).soalValid.length, 15);
    assert.ok(sesudahTerapkan.every((s) => s.keyakinan === 'yakin'));
  });

  console.log('\n=== RINGKASAN UJI PEMBACA WORD, PDF 2 KOLOM & KUNCI CEPAT ===');
  for (const item of laporanUji) {
    console.log(`[${item.status}] ${item.nama}`);
  }
  console.log(`Total lulus: ${laporanUji.length}/${laporanUji.length}`);
}

main().catch(() => {
  process.exit(1);
});

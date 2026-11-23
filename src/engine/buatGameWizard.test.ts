import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buatSesiPembagianMurni } from '../app/store';
import { Game } from '../data/types';
import { parseWordBuffer } from '../parsers/wordParser';
import { konversiDraftValidKeSoal, validasiDaftarDraftSoal } from '../parsers/validator';
import { buatLinkBerbagiGame, dekompresPayloadKeGame } from '../utils/paketGame';
import {
  apakahPeringatanGagalBacaLuas,
  bacaDrafWizardGame,
  bacaSesiMasukWizard,
  bolehBukaLangkahWizard,
  formatWaktuSingkatHHMM,
  hapusDrafWizardGame,
  simpanDrafWizardGame,
  simpanSesiMasukWizard,
  urutkanDraftBermasalahDiAtas,
} from '../utils/wizardDraft';
import { buatPengaturanDefault } from './gameEngine';
import { buatMatchState } from './match';

async function buatDocx40SoalBuffer(): Promise<ArrayBuffer> {
  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="10"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

  const buatP = (teks: string, bold = false, num?: { id: string; ilvl: number }) => `
    <w:p>
      ${num ? `<w:pPr><w:numPr><w:ilvl w:val="${num.ilvl}"/><w:numId w:val="${num.id}"/></w:numPr></w:pPr>` : ''}
      <w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t>${teks}</w:t></w:r>
    </w:p>`;

  const blokSoal: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    // Soal #15 sengaja tidak punya kunci agar jadi 1 soal bermasalah
    const tanpaKunci = i === 14;
    const kunciIdx = i % 4;
    blokSoal.push(
      buatP(`Pertanyaan latihan ke-${i + 1} tentang konsep umum ke-${i + 1}?`, false, {
        id: '10',
        ilvl: 0,
      })
    );
    for (let o = 0; o < 4; o += 1) {
      blokSoal.push(
        buatP(`Pilihan ${o + 1} soal ${i + 1}`, !tanpaKunci && o === kunciIdx, {
          id: '10',
          ilvl: 1,
        })
      );
    }
  }

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${buatP('SOAL ULANGAN HARIAN UMUM', true)}
    ${buatP('A. PILIHAN GANDA', true)}
    ${blokSoal.join('')}
  </w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
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
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`
  );
  zip.file('word/document.xml', docXml);
  zip.file('word/numbering.xml', numberingXml);

  return zip.generateAsync({ type: 'arraybuffer' });
}

async function runTests() {
  let lulus = 0;
  const uji = async (nama: string, fn: () => void | Promise<void>) => {
    await fn();
    lulus += 1;
    process.stdout.write(`LULUS: ${nama}\n`);
  };

  // 1. Uji Stepper Gating (Langkah 1 -> 5 berurutan)
  await uji('Stepper melarang lompat ke langkah berikutnya sebelum langkah sebelumnya selesai', () => {
    assert.equal(bolehBukaLangkahWizard(1, 0, false), true);
    assert.equal(bolehBukaLangkahWizard(2, 0, false), false);
    assert.equal(bolehBukaLangkahWizard(3, 1, true), false);
    assert.equal(bolehBukaLangkahWizard(2, 1, true), true);
    assert.equal(bolehBukaLangkahWizard(3, 2, true), true);
    assert.equal(bolehBukaLangkahWizard(4, 2, true), false);
    assert.equal(bolehBukaLangkahWizard(5, 4, true), true);
  });

  // 2. Uji Alur Lengkap 40 Soal Word -> Periksa (hapus 1 bermasalah) -> 39 Soal -> Main & Bagikan
  await uji('Alur 40 soal Word: tanpa peringatan merah palsu, soal bermasalah paling atas, hapus 1 -> 39 soal siap Main & Bagikan', async () => {
    const buf = await buatDocx40SoalBuffer();
    const hasilImpor = await parseWordBuffer(buf);

    assert.equal(hasilImpor.totalSoal, 40, 'Harus terbaca 40 soal dari Word');
    assert.equal(hasilImpor.jumlahBermasalah, 1, 'Tepat 1 soal tanpa kunci');

    // Peringatan merah TIDAK boleh muncul untuk 1-2 soal bermasalah dari 40 soal
    const peringatanLuas = apakahPeringatanGagalBacaLuas(
      hasilImpor.totalSoal,
      hasilImpor.jumlahBermasalah,
      hasilImpor.indikasiGagalBacaBesar,
      hasilImpor.barisMentah?.length ?? 0
    );
    assert.equal(peringatanLuas, false, 'Tidak boleh memicu peringatan merah tidak terbaca');

    // Soal bermasalah harus ditaruh paling atas di Langkah 3
    const terurut = urutkanDraftBermasalahDiAtas(hasilImpor.daftar);
    assert.equal(terurut[0].indeksAsli, 14, 'Soal #15 (tanpa kunci) harus tampil di paling atas');
    assert.equal(terurut[0].item.keyakinan, 'bermasalah');

    // Jika langsung cek konversi sebelum dihapus, 1 soal tidak ikut
    const sebelumHapus = konversiDraftValidKeSoal(hasilImpor.daftar);
    assert.equal(sebelumHapus.soalValid.length, 39);
    assert.equal(sebelumHapus.jumlahDilewati, 1);

    // Hapus soal bermasalah teratas
    const sisaDraft = validasiDaftarDraftSoal(
      hasilImpor.daftar.filter((_, idx) => idx !== terurut[0].indeksAsli)
    ).daftar;
    const sesudahHapus = konversiDraftValidKeSoal(sisaDraft);
    assert.equal(sesudahHapus.soalValid.length, 39, 'Tersisa 39 soal valid');
    assert.equal(sesudahHapus.jumlahDilewati, 0);

    // Bentuk Game tersimpan (Langkah 4 -> 5 SIMPAN)
    const gameTersimpan: Game = {
      id: 'game_uji_40',
      judul: 'Ujian Harian 40 Soal',
      mapel: 'Umum',
      namaSekolah: 'SMP Nusantara',
      soal: sesudahHapus.soalValid,
      pengaturan: buatPengaturanDefault(),
      status: 'siap',
      dibuatPada: Date.now(),
      diubahPada: Date.now(),
    };

    // Main harus bisa langsung jalan
    const sesi = buatSesiPembagianMurni(gameTersimpan);
    assert.ok(sesi.dekKiriSiswa.length > 0 && sesi.dekKananSiswa.length > 0, 'Pembagian soal Main berjalan');
    const match = buatMatchState({
      gameId: gameTersimpan.id,
      labelLaga: sesi.labelLaga,
      pengaturan: gameTersimpan.pengaturan,
      namaTimKiri: sesi.namaTimKiri,
      namaTimKanan: sesi.namaTimKanan,
      rosterKiri: sesi.urutanPemainKiri,
      rosterKanan: sesi.urutanPemainKanan,
      dekKiriSiswa: sesi.dekKiriSiswa,
      dekKananSiswa: sesi.dekKananSiswa,
      cadanganSiswa: sesi.cadanganSiswa,
      lewatiCountdown: true,
    });
    assert.equal(match.fase, 'bermain');

    // Bagikan (link v2) harus bisa membuat payload
    const hasilLink = buatLinkBerbagiGame(gameTersimpan, 'https://contoh.local/');
    assert.equal(hasilLink.ok, true, 'Link v2 berhasil dibuat');
    if (hasilLink.ok) {
      const hasilParseLink = dekompresPayloadKeGame(hasilLink.kodeTerkompresi);
      assert.equal(hasilParseLink.ok, true, 'Link v2 terbaca kembali menjadi game utuh');
      if (hasilParseLink.ok) {
        assert.equal(hasilParseLink.game.soal.length, 39);
      }
    }
  });

  // 3. Uji Tutup Tab di Langkah 3 & Lanjutkan Mengedit (Auto-Save Recovery)
  await uji('Tutup tab di Langkah 3 tetap menyimpan Draf dan Lanjutkan Mengedit membuka Langkah 3 utuh', async () => {
    const buf = await buatDocx40SoalBuffer();
    const hasil = await parseWordBuffer(buf);
    const idDraf = 'game_draf_tab_tutup';
    const waktuSimpan = new Date(2025, 10, 10, 9, 9).getTime();

    assert.equal(formatWaktuSingkatHHMM(waktuSimpan), '09:09');

    simpanDrafWizardGame({
      gameId: idDraf,
      langkahAktif: 3,
      langkahSelesaiMaks: 2,
      draftPratinjau: hasil.daftar,
      peringatanPratinjau: [],
      diagnostikImpor: {
        jenisDokumen: 'docx',
        namaFile: 'soal40.docx',
        teksMentah: 'teks',
        barisMentah: ['1. Contoh'],
      },
      teksTempel: '',
      infoImporTerakhir: {
        sumber: 'docx',
        namaFile: 'soal40.docx',
        totalTerbaca: 40,
        siap: 39,
        perluDiperiksa: 1,
      },
      tersimpanPada: waktuSimpan,
    });
    simpanSesiMasukWizard({ mode: 'lanjut_draf', gameId: idDraf });

    // Simulasi buka ulang aplikasi: baca dari wizardDraft storage
    const drafPulih = bacaDrafWizardGame(idDraf);
    const sesiPulih = bacaSesiMasukWizard();

    assert.ok(drafPulih, 'Draf wizard harus masih tersimpan');
    assert.equal(drafPulih?.langkahAktif, 3, 'Harus kembali ke Langkah 3');
    assert.equal(drafPulih?.langkahSelesaiMaks, 2);
    assert.equal(drafPulih?.draftPratinjau.length, 40, '40 soal pratinjau harus utuh');
    assert.equal(sesiPulih?.mode, 'lanjut_draf');
    assert.equal(sesiPulih?.gameId, idDraf);

    // Setelah SIMPAN final, draf sementara dibersihkan
    hapusDrafWizardGame(idDraf);
    assert.equal(bacaDrafWizardGame(idDraf), null);
  });

  // 4. Uji Peringatan Gagal Baca Luas hanya aktif untuk kegagalan nyata
  await uji('Peringatan merah hanya muncul bila soal sangat sedikit atau mayoritas rusak', () => {
    assert.equal(apakahPeringatanGagalBacaLuas(1, 1, true, 25), true);
    assert.equal(apakahPeringatanGagalBacaLuas(0, 0, false, 15), true);
    assert.equal(apakahPeringatanGagalBacaLuas(40, 2, true, 200), false);
    assert.equal(apakahPeringatanGagalBacaLuas(10, 5, true, 50), true);
  });

  process.stdout.write(`\nTotal lulus: ${lulus}/4 skenario wizard Buat Game.\n`);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

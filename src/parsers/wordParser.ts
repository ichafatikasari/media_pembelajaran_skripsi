import JSZip from 'jszip';
import mammoth from 'mammoth';
import {
  deteksiJudulBagian,
  PENANDA_ADA_MEDIA,
  PENANDA_TEKS_BENAR,
  parseTeksSoal,
} from './textParser';
import { HasilValidasiDraft, SumberImpor } from './validator';

const REGEX_AWALAN_OPSI =
  /^\s*(?:\*?\s*\(\s*([A-Da-d])\s*\)\s*\.?\s*\*?|\*?\s*([A-Da-d])\s*[.)]\s*\*?|\*\s*([A-Da-d])\s*[.)]?)\s*(.+)$/;
const REGEX_AWALAN_NOMOR =
  /^\s*(?:(?:no\.?|soal)\s*\d{1,3}\s*[.)\-:]?|\d{1,3}\s*[.)\-:]|\(\s*\d{1,3}\s*\))\s+.+$/i;

// ============================================================================
// 1. MINI DOM PARSER MURNI (BEKERJA IDENTIK DI BROWSER & NODE.JS)
// ============================================================================

interface MiniTextNode {
  type: 'text';
  text: string;
}

interface MiniElementNode {
  type: 'el';
  tag: string;
  attrs: Record<string, string>;
  children: MiniNode[];
}

type MiniNode = MiniTextNode | MiniElementNode;

const VOID_HTML_TAGS = new Set([
  'br',
  'hr',
  'img',
  'input',
  'meta',
  'link',
  'col',
  'wbr',
  'source',
  'embed',
  'area',
  'base',
  'param',
  'track',
]);

function decodeEntitas(teks: string): string {
  return teks.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, kode: string) => {
    const k = kode.toLowerCase();
    if (k === 'nbsp') return ' ';
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos' || k === '#39') return "'";
    if (k === 'ndash') return '–';
    if (k === 'mdash') return '—';
    if (k === 'times') return '×';
    if (k === 'divide') return '÷';
    if (k === 'lsquo' || k === 'rsquo') return "'";
    if (k === 'ldquo' || k === 'rdquo') return '"';
    if (k.startsWith('#x')) {
      const cp = parseInt(k.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    }
    if (k.startsWith('#')) {
      const cp = parseInt(k.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : full;
    }
    return full;
  });
}

function parseAtributTag(attrStr: string, lowerCaseKey: boolean): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    const nama = lowerCaseKey ? m[1].toLowerCase() : m[1];
    const nilai = m[2] ?? m[3] ?? m[4] ?? '';
    attrs[nama] = decodeEntitas(nilai);
  }
  return attrs;
}

function parseMarkupKeTree(markup: string, isXml = false): MiniElementNode {
  const root: MiniElementNode = {
    type: 'el',
    tag: isXml ? 'root' : 'div',
    attrs: {},
    children: [],
  };
  const stack: MiniElementNode[] = [root];
  const tokenRe = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/?[^>]+>|[^<]+/g;

  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(markup)) !== null) {
    const token = m[0];
    const parent = stack[stack.length - 1];

    if (token.startsWith('<!--') || token.startsWith('<?')) {
      continue;
    }

    if (token.startsWith('<![CDATA[')) {
      const isi = m[1] ?? '';
      if (isi) parent.children.push({ type: 'text', text: isi });
      continue;
    }

    if (token.startsWith('</')) {
      const tagRaw = token.slice(2, -1).trim();
      const tagClose = isXml ? tagRaw : tagRaw.toLowerCase();
      for (let i = stack.length - 1; i >= 1; i -= 1) {
        if (stack[i].tag === tagClose) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const isiTag = token.slice(1, selfClosing ? -2 : -1).trim();
      if (!isiTag || isiTag.startsWith('!')) continue;

      const spasiIdx = isiTag.search(/\s/);
      const namaRaw = spasiIdx === -1 ? isiTag : isiTag.slice(0, spasiIdx);
      const attrRaw = spasiIdx === -1 ? '' : isiTag.slice(spasiIdx + 1);
      const tagName = isXml ? namaRaw : namaRaw.toLowerCase();

      if (!isXml && tagName === 'p' && parent.tag === 'p' && stack.length > 1) {
        stack.pop();
      }

      const aktifParent = stack[stack.length - 1];
      const node: MiniElementNode = {
        type: 'el',
        tag: tagName,
        attrs: attrRaw ? parseAtributTag(attrRaw, !isXml) : {},
        children: [],
      };
      aktifParent.children.push(node);

      if (!selfClosing && (isXml || !VOID_HTML_TAGS.has(tagName))) {
        stack.push(node);
      }
      continue;
    }

    const decoded = decodeEntitas(token);
    if (decoded) {
      parent.children.push({ type: 'text', text: decoded });
    }
  }

  return root;
}

function cariElemenDenganTag(node: MiniElementNode, tagTarget: string): MiniElementNode[] {
  const hasil: MiniElementNode[] = [];
  const jalan = (n: MiniElementNode) => {
    for (const child of n.children) {
      if (child.type === 'el') {
        if (child.tag === tagTarget) {
          hasil.push(child);
        }
        jalan(child);
      }
    }
  };
  jalan(node);
  return hasil;
}

function ambilTeksMurni(node: MiniNode): string {
  if (node.type === 'text') return node.text;
  if (node.tag === 'br' || node.tag === 'w:br' || node.tag === 'w:cr') return '\n';
  if (node.tag === 'w:tab') return ' ';
  return node.children.map(ambilTeksMurni).join('');
}

// ============================================================================
// 2. PEMBACAAN STRUKTUR PENOMORAN & FORMAT DARI OOXML (.DOCX)
// ============================================================================

interface InfoLevelNumbering {
  start: number;
  numFmt: string;
}

interface InfoItemListXml {
  ilvl: number;
  numFmt: string;
  urutan: number;
}

interface FormatOpsiDetail {
  bold: boolean;
  underline: boolean;
  highlight: boolean;
  warna: string | null;
}

interface InfoXmlDocx {
  setTerformat: Set<string>;
  formatPerTeks: Map<string, FormatOpsiDetail>;
  antrianListPerTeks: Map<string, InfoItemListXml[]>;
  setTeksBermedia: Set<string>;
}

function normalisasiKunciTeksXml(teks: string): string {
  return teks.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function bacaAtributW(el: MiniElementNode, nama: string): string | undefined {
  return el.attrs[`w:${nama}`] ?? el.attrs[nama];
}

function normalisasiWarnaHex(raw?: string): string | null {
  if (!raw) return null;
  const bersih = raw.trim().toLowerCase().replace(/^#/, '');
  if (
    !bersih ||
    bersih === 'auto' ||
    bersih === 'transparent' ||
    bersih === 'inherit' ||
    bersih === 'initial' ||
    bersih === '000' ||
    bersih === '000000' ||
    bersih === 'black' ||
    bersih === 'fff' ||
    bersih === 'ffffff' ||
    bersih === 'white'
  ) {
    return null;
  }
  return bersih;
}

function ekstrakInfoXmlDocx(
  documentXml: string,
  numberingXml?: string
): InfoXmlDocx {
  const setTerformat = new Set<string>();
  const formatPerTeks = new Map<string, FormatOpsiDetail>();
  const antrianListPerTeks = new Map<string, InfoItemListXml[]>();
  const setTeksBermedia = new Set<string>();

  try {
    const abstractMap = new Map<string, Map<number, InfoLevelNumbering>>();
    const numMap = new Map<
      string,
      { abstractNumId: string; overrides: Map<number, number> }
    >();

    if (numberingXml) {
      const numTree = parseMarkupKeTree(numberingXml, true);
      for (const abs of cariElemenDenganTag(numTree, 'w:abstractNum')) {
        const absId = bacaAtributW(abs, 'abstractNumId');
        if (!absId) continue;
        const lvlMap = new Map<number, InfoLevelNumbering>();
        for (const lvl of cariElemenDenganTag(abs, 'w:lvl')) {
          const ilvl = Number(bacaAtributW(lvl, 'ilvl') ?? '0');
          const startEl = cariElemenDenganTag(lvl, 'w:start')[0];
          const fmtEl = cariElemenDenganTag(lvl, 'w:numFmt')[0];
          lvlMap.set(ilvl, {
            start: startEl ? Number(bacaAtributW(startEl, 'val') ?? '1') || 1 : 1,
            numFmt: fmtEl ? bacaAtributW(fmtEl, 'val') ?? 'decimal' : 'decimal',
          });
        }
        abstractMap.set(absId, lvlMap);
      }

      for (const numEl of cariElemenDenganTag(numTree, 'w:num')) {
        const numId = bacaAtributW(numEl, 'numId');
        const absRef = cariElemenDenganTag(numEl, 'w:abstractNumId')[0];
        const absId = absRef ? bacaAtributW(absRef, 'val') : undefined;
        if (!numId || !absId) continue;
        const overrides = new Map<number, number>();
        for (const ov of cariElemenDenganTag(numEl, 'w:lvlOverride')) {
          const ilvl = Number(bacaAtributW(ov, 'ilvl') ?? '0');
          const startOv = cariElemenDenganTag(ov, 'w:startOverride')[0];
          if (startOv) {
            const v = Number(bacaAtributW(startOv, 'val') ?? '1');
            if (Number.isFinite(v)) overrides.set(ilvl, v);
          }
        }
        numMap.set(numId, { abstractNumId: absId, overrides });
      }
    }

    const docTree = parseMarkupKeTree(documentXml, true);
    const paragrafList = cariElemenDenganTag(docTree, 'w:p');
    const counters = new Map<string, number>();

    for (const p of paragrafList) {
      const teksUtuh = normalisasiKunciTeksXml(ambilTeksMurni(p));
      if (!teksUtuh) continue;

      const pPr = cariElemenDenganTag(p, 'w:pPr')[0];
      const numPr = pPr ? cariElemenDenganTag(pPr, 'w:numPr')[0] : undefined;
      let adalahListPilihanXml = false;

      if (numPr) {
        const numIdEl = cariElemenDenganTag(numPr, 'w:numId')[0];
        const ilvlEl = cariElemenDenganTag(numPr, 'w:ilvl')[0];
        const numId = numIdEl ? bacaAtributW(numIdEl, 'val') ?? '0' : '0';
        const ilvl = ilvlEl ? Number(bacaAtributW(ilvlEl, 'val') ?? '0') : 0;

        if (numId !== '0') {
          const defNum = numMap.get(numId);
          const defAbs = defNum ? abstractMap.get(defNum.abstractNumId) : undefined;
          const defLvl = defAbs?.get(ilvl);
          const start = defNum?.overrides.get(ilvl) ?? defLvl?.start ?? 1;
          const numFmt = defLvl?.numFmt ?? (ilvl >= 1 ? 'lowerLetter' : 'decimal');

          // Reset level yang lebih dalam
          for (const key of Array.from(counters.keys())) {
            const [kNum, kLvlStr] = key.split(':');
            if (kNum === numId && Number(kLvlStr) > ilvl) {
              counters.delete(key);
            }
          }

          const counterKey = `${numId}:${ilvl}`;
          const nilaiBerikut = counters.has(counterKey)
            ? (counters.get(counterKey) ?? start) + 1
            : start;
          counters.set(counterKey, nilaiBerikut);

          const antrian = antrianListPerTeks.get(teksUtuh) ?? [];
          antrian.push({ ilvl, numFmt, urutan: nilaiBerikut });
          antrianListPerTeks.set(teksUtuh, antrian);

          if (
            ilvl >= 1 ||
            numFmt === 'lowerLetter' ||
            numFmt === 'upperLetter'
          ) {
            adalahListPilihanXml = true;
          }
        }
      }

      // Deteksi gambar/objek grafis tertanam di paragraf Word
      if (
        cariElemenDenganTag(p, 'w:drawing').length > 0 ||
        cariElemenDenganTag(p, 'w:pict').length > 0 ||
        cariElemenDenganTag(p, 'v:imagedata').length > 0
      ) {
        setTeksBermedia.add(teksUtuh);
      }

      // Cek format kunci (bold, underline, highlight, shading, warna huruf) pada opsi atau item pilihan list
      if (!REGEX_AWALAN_OPSI.test(teksUtuh) && !adalahListPilihanXml) {
        continue;
      }

      const runs = cariElemenDenganTag(p, 'w:r');
      let totalKarakter = 0;
      let karBold = 0;
      let karUnderline = 0;
      let karHighlight = 0;
      const hitungWarna = new Map<string, number>();

      for (const run of runs) {
        const teksRun = ambilTeksMurni(run);
        const panjang = teksRun
          .replace(/^\s*\(?[A-Da-d]\s*[.)]\s*/, '')
          .trim().length;
        if (panjang === 0) continue;

        totalKarakter += panjang;
        const rPr = cariElemenDenganTag(run, 'w:rPr')[0];
        if (!rPr) continue;

        const adaHighlight = cariElemenDenganTag(rPr, 'w:highlight').length > 0;
        const shd = cariElemenDenganTag(rPr, 'w:shd')[0];
        const shdFill = shd ? bacaAtributW(shd, 'fill') : undefined;
        const adaShading = Boolean(
          shdFill &&
            shdFill.toLowerCase() !== 'auto' &&
            shdFill.toLowerCase() !== 'ffffff'
        );
        const uEl = cariElemenDenganTag(rPr, 'w:u')[0];
        const adaUnderline = Boolean(uEl && bacaAtributW(uEl, 'val') !== 'none');
        const bEl = cariElemenDenganTag(rPr, 'w:b')[0];
        const bVal = bEl ? bacaAtributW(bEl, 'val') : undefined;
        const adaBold = Boolean(bEl && bVal !== '0' && bVal !== 'false');

        const colorEl = cariElemenDenganTag(rPr, 'w:color')[0];
        const warnaVal = normalisasiWarnaHex(colorEl ? bacaAtributW(colorEl, 'val') : undefined);

        if (adaBold) karBold += panjang;
        if (adaUnderline) karUnderline += panjang;
        if (adaHighlight || adaShading) karHighlight += panjang;
        if (warnaVal) {
          hitungWarna.set(warnaVal, (hitungWarna.get(warnaVal) ?? 0) + panjang);
        }
      }

      if (totalKarakter > 0) {
        const bold = karBold / totalKarakter >= 0.6;
        const underline = karUnderline / totalKarakter >= 0.6;
        const highlight = karHighlight / totalKarakter >= 0.6;
        let warnaDominan: string | null = null;
        for (const [w, jml] of hitungWarna.entries()) {
          if (jml / totalKarakter >= 0.6) {
            warnaDominan = w;
            break;
          }
        }
        formatPerTeks.set(teksUtuh, { bold, underline, highlight, warna: warnaDominan });
        if (bold || underline || highlight || warnaDominan !== null) {
          setTerformat.add(teksUtuh);
        }
      }
    }
  } catch {
    // Jika parsing XML gagal, pemrosesan HTML mammoth tetap berjalan
  }

  return { setTerformat, formatPerTeks, antrianListPerTeks, setTeksBermedia };
}

// ============================================================================
// 3. TRAVERSAL DOM HTML WORD -> BARIS TERSTRUKTUR
// ============================================================================

interface BarisHasilDom {
  teks: string;
  adalahOpsi: boolean;
  terformat: boolean;
  formatDetail: FormatOpsiDetail;
}

const FORMAT_KOSONG: FormatOpsiDetail = {
  bold: false,
  underline: false,
  highlight: false,
  warna: null,
};

function ekstrakDetailFormatStyle(
  tag: string,
  attrs: Record<string, string>
): Partial<FormatOpsiDetail> {
  const res: Partial<FormatOpsiDetail> = {};
  if (tag === 'strong' || tag === 'b') res.bold = true;
  if (tag === 'u') res.underline = true;
  if (tag === 'mark') res.highlight = true;
  if (tag === 'font' && attrs.color) {
    const w = normalisasiWarnaHex(attrs.color);
    if (w) res.warna = w;
  }

  const styleStr = attrs.style;
  if (styleStr) {
    const s = styleStr.toLowerCase();
    if (/font-weight\s*:\s*(bold|[6-9]\d{2})/.test(s)) res.bold = true;
    if (/text-decoration(?:-line)?\s*:\s*[^;]*underline/.test(s)) res.underline = true;
    const bgMatch = s.match(/background(?:-color)?\s*:\s*([^;]+)/);
    if (bgMatch) {
      const val = bgMatch[1].trim();
      if (
        val &&
        val !== 'transparent' &&
        val !== 'none' &&
        val !== '#fff' &&
        val !== '#ffffff' &&
        val !== 'white'
      ) {
        res.highlight = true;
      }
    }
    const colMatch = s.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
    if (colMatch) {
      const w = normalisasiWarnaHex(colMatch[1]);
      if (w) res.warna = w;
    }
  }
  return res;
}

function kumpulkanStatistikFormat(
  node: MiniNode,
  stateAktif: FormatOpsiDetail,
  hasil: FormatOpsiDetail[]
): void {
  if (node.type === 'text') {
    for (const ch of node.text) {
      if (!/\s/.test(ch)) {
        hasil.push(stateAktif);
      }
    }
    return;
  }
  if (node.tag === 'ol' || node.tag === 'ul') {
    return;
  }
  const tamb = ekstrakDetailFormatStyle(node.tag, node.attrs);
  const stateBaru: FormatOpsiDetail = {
    bold: stateAktif.bold || Boolean(tamb.bold),
    underline: stateAktif.underline || Boolean(tamb.underline),
    highlight: stateAktif.highlight || Boolean(tamb.highlight),
    warna: tamb.warna ?? stateAktif.warna,
  };
  for (const child of node.children) {
    kumpulkanStatistikFormat(child, stateBaru, hasil);
  }
}

function cekElemenOpsiFormatDetail(
  el: MiniElementNode,
  teksOpsiTanpaPrefix: string,
  infoXml?: InfoXmlDocx
): FormatOpsiDetail {
  const norm = normalisasiKunciTeksXml(teksOpsiTanpaPrefix);
  if (!norm) return FORMAT_KOSONG;

  const teksUtuhEl = normalisasiKunciTeksXml(ambilTeksMurni(el));
  if (infoXml) {
    const dariXml =
      infoXml.formatPerTeks.get(norm) ?? infoXml.formatPerTeks.get(teksUtuhEl);
    if (dariXml) return dariXml;
  }

  const karakterList: FormatOpsiDetail[] = [];
  kumpulkanStatistikFormat(el, FORMAT_KOSONG, karakterList);
  if (karakterList.length === 0) return FORMAT_KOSONG;

  const awalanDom = teksUtuhEl.match(/^\(?[A-Da-d]\s*[.)]\s*/);
  const lewatiAwalan = awalanDom ? awalanDom[0].replace(/\s+/g, '').length : 0;
  const efektif =
    lewatiAwalan > 0 && lewatiAwalan < karakterList.length
      ? karakterList.slice(lewatiAwalan)
      : karakterList;

  const total = efektif.length;
  const bold = efektif.filter((k) => k.bold).length >= total * 0.6;
  const underline = efektif.filter((k) => k.underline).length >= total * 0.6;
  const highlight = efektif.filter((k) => k.highlight).length >= total * 0.6;

  const hitungWarna = new Map<string, number>();
  for (const k of efektif) {
    if (k.warna) {
      hitungWarna.set(k.warna, (hitungWarna.get(k.warna) ?? 0) + 1);
    }
  }
  let warna: string | null = null;
  for (const [w, jml] of hitungWarna.entries()) {
    if (jml >= total * 0.6) {
      warna = w;
      break;
    }
  }

  return { bold, underline, highlight, warna };
}

const BLOCK_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'div',
  'blockquote',
  'section',
  'article',
  'header',
  'footer',
]);

function angkaKeRomawi(n: number, hurufKecil = false): string {
  const peta: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let sisa = Math.max(1, n);
  let hasil = '';
  for (const [nilai, simbol] of peta) {
    while (sisa >= nilai) {
      hasil += simbol;
      sisa -= nilai;
    }
  }
  return hurufKecil ? hasil.toLowerCase() : hasil;
}

function normalisasiTeksInline(teks: string): string {
  return teks.replace(/\u00A0/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * Mengubah daftar node inline (di luar sub-blok/sub-list) menjadi array baris (memecah pada <br>).
 */
function kumpulkanBarisInlineDariNodes(nodes: MiniNode[]): string[] {
  const barisList: string[] = [];
  let buffer = '';

  const flush = () => {
    const bersih = normalisasiTeksInline(buffer);
    if (bersih) barisList.push(bersih);
    buffer = '';
  };

  const jalan = (n: MiniNode) => {
    if (n.type === 'text') {
      buffer += n.text.replace(/\r?\n/g, ' ');
      return;
    }
    if (n.tag === 'br' || n.tag === 'hr') {
      flush();
      return;
    }
    if (n.tag === 'ol' || n.tag === 'ul' || n.tag === 'table') {
      return;
    }
    if (BLOCK_TAGS.has(n.tag) || n.tag === 'li' || n.tag === 'pre') {
      flush();
      for (const ch of n.children) jalan(ch);
      flush();
      return;
    }
    for (const ch of n.children) {
      jalan(ch);
    }
  };

  for (const n of nodes) {
    jalan(n);
  }
  flush();
  return barisList;
}

function teksPertamaElemen(el: MiniElementNode): string {
  const baris = kumpulkanBarisInlineDariNodes(el.children);
  return baris[0] ?? '';
}

function cekApakahGridTabelSoal(rows: MiniElementNode[]): {
  isGrid: boolean;
  mulaiDariBaris: number;
  indeksKolom: {
    no?: number;
    soal: number;
    opsi: number[];
    kunci?: number;
  };
} {
  if (rows.length === 0) {
    return { isGrid: false, mulaiDariBaris: 0, indeksKolom: { soal: 1, opsi: [] } };
  }

  const ambilSel = (tr: MiniElementNode) =>
    tr.children.filter(
      (c): c is MiniElementNode => c.type === 'el' && (c.tag === 'td' || c.tag === 'th')
    );

  const selBaris0 = ambilSel(rows[0]).map((c) =>
    normalisasiTeksInline(ambilTeksMurni(c)).toLowerCase()
  );

  // Cek header tabel seperti: No | Soal | A | B | C | D | Kunci
  const idxSoal = selBaris0.findIndex((s) =>
    ['soal', 'pertanyaan', 'teks soal', 'question'].includes(s)
  );
  const idxA = selBaris0.findIndex((s) => ['a', 'pilihan a', 'opsi a'].includes(s));
  const idxB = selBaris0.findIndex((s) => ['b', 'pilihan b', 'opsi b'].includes(s));
  if (idxSoal >= 0 && idxA >= 0 && idxB >= 0) {
    const idxC = selBaris0.findIndex((s) => ['c', 'pilihan c', 'opsi c'].includes(s));
    const idxD = selBaris0.findIndex((s) => ['d', 'pilihan d', 'opsi d'].includes(s));
    const idxNo = selBaris0.findIndex((s) => ['no', 'no.', 'nomor'].includes(s));
    const idxKunci = selBaris0.findIndex((s) =>
      ['kunci', 'jawaban', 'kunci jawaban'].includes(s)
    );
    const opsi = [idxA, idxB];
    if (idxC >= 0) opsi.push(idxC);
    if (idxD >= 0) opsi.push(idxD);
    return {
      isGrid: true,
      mulaiDariBaris: 1,
      indeksKolom: {
        ...(idxNo >= 0 ? { no: idxNo } : {}),
        soal: idxSoal,
        opsi,
        ...(idxKunci >= 0 ? { kunci: idxKunci } : {}),
      },
    };
  }

  // Tanpa header: cek apakah >= 2 baris berbentuk [1, "Pertanyaan", "Opsi A", "Opsi B", ...]
  let barisGridCocok = 0;
  for (const r of rows) {
    const cells = ambilSel(r);
    if (cells.length >= 4) {
      const c0 = normalisasiTeksInline(ambilTeksMurni(cells[0]));
      const c1 = normalisasiTeksInline(ambilTeksMurni(cells[1]));
      if (/^\d{1,3}\s*[.)]?$/.test(c0) && c1.length >= 6) {
        barisGridCocok += 1;
      }
    }
  }
  if (barisGridCocok >= 1 && barisGridCocok >= Math.ceil(rows.length * 0.5)) {
    const maksSel = Math.max(...rows.map((r) => ambilSel(r).length));
    const opsi = [2, 3];
    if (maksSel >= 5) opsi.push(4);
    if (maksSel >= 6) opsi.push(5);
    const kunci = maksSel >= 7 ? 6 : undefined;
    return {
      isGrid: true,
      mulaiDariBaris: 0,
      indeksKolom: {
        no: 0,
        soal: 1,
        opsi,
        ...(kunci !== undefined ? { kunci } : {}),
      },
    };
  }

  return { isGrid: false, mulaiDariBaris: 0, indeksKolom: { soal: 1, opsi: [] } };
}

export function ekstrakBarisDariHtmlWord(
  html: string,
  setXmlTerformat: Set<string> = new Set(),
  antrianListPerTeks?: Map<string, InfoItemListXml[]>,
  formatPerTeks?: Map<string, FormatOpsiDetail>,
  setTeksBermedia?: Set<string>
): { teksTersusun: string; barisMentah: string[] } {
  const infoXml: InfoXmlDocx | undefined =
    setXmlTerformat.size > 0 ||
    (antrianListPerTeks && antrianListPerTeks.size > 0) ||
    (formatPerTeks && formatPerTeks.size > 0) ||
    (setTeksBermedia && setTeksBermedia.size > 0)
      ? {
          setTerformat: setXmlTerformat,
          formatPerTeks: formatPerTeks ?? new Map(),
          antrianListPerTeks: antrianListPerTeks ?? new Map(),
          setTeksBermedia: setTeksBermedia ?? new Set(),
        }
      : undefined;

  const root = parseMarkupKeTree(html, false);
  const barisHasil: BarisHasilDom[] = [];
  let nomorSoalOtomatis = 1;
  let sedangDiBagianLewati = false;
  let sedangDiBagianKunci = false;
  let baruSajaAdaPertanyaanTanpaOpsi = false;

  const ambilInfoXmlUntukTeks = (teks: string): InfoItemListXml | undefined => {
    if (!infoXml) return undefined;
    const norm = normalisasiKunciTeksXml(teks);
    const antrian = infoXml.antrianListPerTeks.get(norm);
    if (antrian && antrian.length > 0) {
      return antrian.shift();
    }
    return undefined;
  };

  const dorongBaris = (teks: string, elSumber?: MiniElementNode, paksaOpsi = false) => {
    const bersih = normalisasiTeksInline(teks);
    if (!bersih) return;

    const cocokHeaderBagianKunci = bersih.match(
      /^(?:daftar\s+)?(?:kunci(?:\s+jawaban)?)(?:\s+(?:pilihan\s+ganda|pg))?(?:\s*[:=\-]\s*(.*))?$/i
    );
    const sisaHeaderKunci = (cocokHeaderBagianKunci?.[1] ?? '').trim();
    if (
      cocokHeaderBagianKunci &&
      bersih.length <= 60 &&
      !/^[A-Da-d1-4](?:[.)])?$/.test(sisaHeaderKunci)
    ) {
      sedangDiBagianKunci = true;
      sedangDiBagianLewati = false;
      baruSajaAdaPertanyaanTanpaOpsi = false;
      barisHasil.push({
        teks: bersih,
        adalahOpsi: false,
        terformat: false,
        formatDetail: FORMAT_KOSONG,
      });
      return;
    }

    const infoBagian = deteksiJudulBagian(bersih);
    if (infoBagian) {
      sedangDiBagianLewati = infoBagian.tipe === 'lewati';
      baruSajaAdaPertanyaanTanpaOpsi = false;
      barisHasil.push({
        teks: bersih,
        adalahOpsi: false,
        terformat: false,
        formatDetail: FORMAT_KOSONG,
      });
      return;
    }

    const adalahOpsi = !sedangDiBagianKunci && (paksaOpsi || REGEX_AWALAN_OPSI.test(bersih));
    if (adalahOpsi) {
      baruSajaAdaPertanyaanTanpaOpsi = false;
    } else if (REGEX_AWALAN_NOMOR.test(bersih) && !sedangDiBagianLewati) {
      baruSajaAdaPertanyaanTanpaOpsi = true;
    }

    const adaMediaHtml =
      elSumber !== undefined && cariElemenDenganTag(elSumber, 'img').length > 0;
    const adaMediaXml =
      infoXml?.setTeksBermedia.has(normalisasiKunciTeksXml(bersih)) ||
      (elSumber !== undefined &&
        infoXml?.setTeksBermedia.has(normalisasiKunciTeksXml(ambilTeksMurni(elSumber))));

    const formatDetail =
      adalahOpsi && elSumber
        ? cekElemenOpsiFormatDetail(elSumber, bersih, infoXml)
        : FORMAT_KOSONG;
    const terformat =
      formatDetail.bold ||
      formatDetail.underline ||
      formatDetail.highlight ||
      formatDetail.warna !== null;

    const teksFinal =
      !adalahOpsi && (adaMediaHtml || adaMediaXml)
        ? `${bersih} ${PENANDA_ADA_MEDIA}`
        : bersih;

    barisHasil.push({
      teks: teksFinal,
      adalahOpsi,
      terformat,
      formatDetail,
    });
  };

  const prosesPre = (preEl: MiniElementNode) => {
    barisHasil.push({
      teks: '```',
      adalahOpsi: false,
      terformat: false,
      formatDetail: FORMAT_KOSONG,
    });
    const isi = ambilTeksMurni(preEl).replace(/\r\n/g, '\n').split('\n');
    for (const kl of isi) {
      barisHasil.push({
        teks: kl,
        adalahOpsi: false,
        terformat: false,
        formatDetail: FORMAT_KOSONG,
      });
    }
    barisHasil.push({
      teks: '```',
      adalahOpsi: false,
      terformat: false,
      formatDetail: FORMAT_KOSONG,
    });
  };

  const prosesTabel = (tableEl: MiniElementNode) => {
    const semuaTr = cariElemenDenganTag(tableEl, 'tr');
    if (semuaTr.length === 0) return;

    // Deteksi tabel daftar kunci jawaban (mis. | No | Kunci | atau | 1 | B | 2 | C |)
    const pasanganTabelKunci: string[] = [];
    let totalPasanganPotensial = 0;
    for (let r = 0; r < semuaTr.length; r += 1) {
      const sel = semuaTr[r].children
        .filter((c): c is MiniElementNode => c.type === 'el' && (c.tag === 'td' || c.tag === 'th'))
        .map((c) => normalisasiTeksInline(ambilTeksMurni(c)));
      if (r === 0 && sel.some((s) => /^(?:no\.?|nomor|kunci|jawaban)$/i.test(s))) {
        continue;
      }
      for (let c = 0; c + 1 < sel.length; c += 2) {
        if (!sel[c] && !sel[c + 1]) continue;
        totalPasanganPotensial += 1;
        const mNo = sel[c].match(/^(\d{1,3})\s*[.)]?$/);
        const mHuruf = sel[c + 1].match(/^([A-Da-d])(?:\s*[.)].*)?$/);
        if (mNo && mHuruf) {
          pasanganTabelKunci.push(`${mNo[1]}. ${mHuruf[1].toUpperCase()}`);
        }
      }
    }
    if (
      pasanganTabelKunci.length >= 2 &&
      pasanganTabelKunci.length >= Math.ceil(totalPasanganPotensial * 0.7)
    ) {
      if (!sedangDiBagianKunci) {
        dorongBaris('Kunci Jawaban:');
      }
      for (const p of pasanganTabelKunci) {
        dorongBaris(p);
      }
      return;
    }

    const infoGrid = cekApakahGridTabelSoal(semuaTr);
    if (infoGrid.isGrid) {
      let nomorBaris = 1;
      for (let r = infoGrid.mulaiDariBaris; r < semuaTr.length; r += 1) {
        const sel = semuaTr[r].children.filter(
          (c): c is MiniElementNode =>
            c.type === 'el' && (c.tag === 'td' || c.tag === 'th')
        );
        const teksSoal = normalisasiTeksInline(
          ambilTeksMurni(sel[infoGrid.indeksKolom.soal] ?? { type: 'text', text: '' })
        );
        if (!teksSoal) continue;

        const teksNoRaw =
          infoGrid.indeksKolom.no !== undefined && sel[infoGrid.indeksKolom.no]
            ? normalisasiTeksInline(ambilTeksMurni(sel[infoGrid.indeksKolom.no]))
            : '';
        const noMatch = teksNoRaw.match(/\d{1,3}/);
        const nomor = noMatch ? Number(noMatch[0]) : nomorBaris;
        nomorBaris = nomor + 1;

        const soalSudahBernomor = REGEX_AWALAN_NOMOR.test(teksSoal);
        dorongBaris(soalSudahBernomor ? teksSoal : `${nomor}. ${teksSoal}`);

        infoGrid.indeksKolom.opsi.forEach((colIdx, opsiIdx) => {
          const cellEl = sel[colIdx];
          if (!cellEl) return;
          const isiOpsi = normalisasiTeksInline(ambilTeksMurni(cellEl));
          if (!isiOpsi) return;
          const huruf = String.fromCharCode(65 + opsiIdx);
          const barisOpsi = REGEX_AWALAN_OPSI.test(isiOpsi) ? isiOpsi : `${huruf}. ${isiOpsi}`;
          dorongBaris(barisOpsi, cellEl, true);
        });

        if (infoGrid.indeksKolom.kunci !== undefined && sel[infoGrid.indeksKolom.kunci]) {
          const teksKunci = normalisasiTeksInline(
            ambilTeksMurni(sel[infoGrid.indeksKolom.kunci])
          );
          if (teksKunci) {
            dorongBaris(
              /^kunci/i.test(teksKunci) ? teksKunci : `Kunci: ${teksKunci}`
            );
          }
        }
      }
      return;
    }

    // Tabel umum (mis. 2 kolom [1. | Pertanyaan + Pilihan] atau kisi pilihan 2x2)
    for (const tr of semuaTr) {
      const selList = tr.children.filter(
        (c): c is MiniElementNode => c.type === 'el' && (c.tag === 'td' || c.tag === 'th')
      );
      if (selList.length === 0) continue;

      const selNonKosong = selList
        .map((cell) => ({
          cell,
          teks: normalisasiTeksInline(ambilTeksMurni(cell)),
        }))
        .filter((s) => s.teks.length > 0);

      if (selNonKosong.length === 0) continue;

      // Pola 2 kolom: [ "1." | "<p>Pertanyaan</p><ol>...</ol>" ]
      if (
        selNonKosong.length === 2 &&
        /^\d{1,3}\s*[.)]?$/.test(selNonKosong[0].teks)
      ) {
        const noBersih = selNonKosong[0].teks.replace(/[^\d]/g, '');
        const subBarisSebelum = barisHasil.length;
        prosesAnakContainer(selNonKosong[1].cell, 0);
        if (barisHasil.length > subBarisSebelum) {
          const barisPertama = barisHasil[subBarisSebelum];
          if (!REGEX_AWALAN_NOMOR.test(barisPertama.teks)) {
            barisPertama.teks = `${noBersih}. ${barisPertama.teks}`;
            baruSajaAdaPertanyaanTanpaOpsi = true;
          }
        }
        continue;
      }

      // Pola 2 kolom label opsi: [ "A." | "Teks opsi" ]
      if (
        selNonKosong.length === 2 &&
        /^\(?[A-Da-d]\s*[.)]?$/.test(selNonKosong[0].teks)
      ) {
        const huruf = selNonKosong[0].teks.replace(/[^A-Da-d]/g, '').toUpperCase();
        dorongBaris(`${huruf}. ${selNonKosong[1].teks}`, selNonKosong[1].cell, true);
        continue;
      }

      // Baris metadata seperti Nama: | Budi
      if (
        selNonKosong.length === 2 &&
        /^(?:nama|kelas|materi|mapel|mata pelajaran|hari|tanggal|waktu)\b/i.test(
          selNonKosong[0].teks
        )
      ) {
        dorongBaris(`${selNonKosong[0].teks} ${selNonKosong[1].teks}`);
        continue;
      }

      // Setiap sel diproses sebagai blok terpisah agar opsi berdampingan tetap punya baris sendiri
      for (const { cell } of selNonKosong) {
        prosesAnakContainer(cell, 0);
      }
    }
  };

  const deteksiPeranList = (
    listEl: MiniElementNode,
    olDepth: number,
    liChildren: MiniElementNode[],
    infoXmlPertama?: InfoItemListXml
  ): { peran: 'pilihan' | 'soal' | 'romawi_umum'; hurufKecil?: boolean } => {
    const typeAttr = (listEl.attrs.type ?? '').trim();
    const styleAttr = (listEl.attrs.style ?? '').toLowerCase();

    const adalahAlpha =
      typeAttr === 'a' ||
      typeAttr === 'A' ||
      styleAttr.includes('lower-alpha') ||
      styleAttr.includes('upper-alpha') ||
      infoXmlPertama?.numFmt === 'lowerLetter' ||
      infoXmlPertama?.numFmt === 'upperLetter';

    const adalahRoman =
      typeAttr === 'i' ||
      typeAttr === 'I' ||
      styleAttr.includes('lower-roman') ||
      styleAttr.includes('upper-roman') ||
      infoXmlPertama?.numFmt === 'lowerRoman' ||
      infoXmlPertama?.numFmt === 'upperRoman';

    const adaNestedList = liChildren.some(
      (li) =>
        cariElemenDenganTag(li, 'ol').length > 0 ||
        cariElemenDenganTag(li, 'ul').length > 0
    );

    if (listEl.tag === 'ul') {
      if (
        olDepth >= 2 &&
        !adaNestedList &&
        liChildren.length >= 2 &&
        liChildren.length <= 5
      ) {
        return { peran: 'pilihan' };
      }
      return { peran: 'romawi_umum' };
    }

    // <ol> di dalam <li> (tingkat >= 2)
    if (olDepth >= 2) {
      if (adalahAlpha || (!adaNestedList && liChildren.length >= 2 && liChildren.length <= 5)) {
        return { peran: 'pilihan' };
      }
      return { peran: 'pilihan' };
    }

    // <ol> tingkat 1 dengan format huruf eksplisit (mis. soal ketik manual + opsi berhuruf otomatis)
    if (adalahAlpha && !adaNestedList) {
      return { peran: 'pilihan' };
    }

    if (adalahRoman) {
      // Cek bila item pertama adalah judul bagian (mis. I. PILIHAN GANDA, II. URAIAN)
      const teks1 = teksPertamaElemen(liChildren[0] ?? { type: 'el', tag: 'li', attrs: {}, children: [] });
      if (deteksiJudulBagian(teks1)) {
        return { peran: 'romawi_umum', hurufKecil: typeAttr === 'i' || infoXmlPertama?.numFmt === 'lowerRoman' };
      }
      if (!adaNestedList && !sedangDiBagianLewati && baruSajaAdaPertanyaanTanpaOpsi && liChildren.length >= 2 && liChildren.length <= 5) {
        return { peran: 'pilihan' };
      }
      return { peran: 'romawi_umum', hurufKecil: typeAttr === 'i' || infoXmlPertama?.numFmt === 'lowerRoman' };
    }

    // <ol> tingkat 1 tanpa type="a", tepat setelah soal manual yang belum beropsi dan isinya 2..5 butir datar
    if (
      olDepth === 1 &&
      !adaNestedList &&
      !sedangDiBagianLewati &&
      baruSajaAdaPertanyaanTanpaOpsi &&
      liChildren.length >= 2 &&
      liChildren.length <= 5 &&
      !liChildren.some((li) => REGEX_AWALAN_NOMOR.test(teksPertamaElemen(li))) &&
      !liChildren.some((li) => Boolean(deteksiJudulBagian(teksPertamaElemen(li))))
    ) {
      return { peran: 'pilihan' };
    }

    return { peran: 'soal' };
  };

  const prosesList = (listEl: MiniElementNode, olDepthSaatIni: number) => {
    const liChildren = listEl.children.filter(
      (c): c is MiniElementNode => c.type === 'el' && c.tag === 'li'
    );
    if (liChildren.length === 0) return;

    const olDepthBaru = listEl.tag === 'ol' ? olDepthSaatIni + 1 : Math.max(1, olDepthSaatIni);
    const teksPertamaLi0 = teksPertamaElemen(liChildren[0]);
    const infoXmlLi0 = ambilInfoXmlUntukTeks(teksPertamaLi0);
    const { peran, hurufKecil } = deteksiPeranList(
      listEl,
      olDepthBaru,
      liChildren,
      infoXmlLi0
    );

    const startAttr = listEl.attrs.start ? parseInt(listEl.attrs.start, 10) : NaN;
    let penghitung = Number.isFinite(startAttr)
      ? startAttr
      : peran === 'soal' && infoXmlLi0?.numFmt === 'decimal'
        ? infoXmlLi0.urutan
        : peran === 'soal' && !sedangDiBagianLewati && listEl.tag === 'ol'
          ? 1
          : 1;

    if (peran === 'pilihan') {
      penghitung = Number.isFinite(startAttr) ? Math.max(0, startAttr - 1) : 0;
    }

    liChildren.forEach((li, idxLi) => {
      if (li.attrs.value) {
        const val = parseInt(li.attrs.value, 10);
        if (Number.isFinite(val)) {
          penghitung = peran === 'pilihan' ? Math.max(0, val - 1) : val;
        }
      }

      if (idxLi > 0) {
        // Konsumsi entri XML untuk item berikutnya agar antrian tetap sinkron
        ambilInfoXmlUntukTeks(teksPertamaElemen(li));
      }

      // Pisahkan elemen konten milik <li> ini dari sub-list (<ol>/<ul>) bersarang
      const anakKonten: MiniNode[] = [];
      const subList: MiniElementNode[] = [];
      for (const ch of li.children) {
        if (ch.type === 'el' && (ch.tag === 'ol' || ch.tag === 'ul')) {
          subList.push(ch);
        } else {
          anakKonten.push(ch);
        }
      }

      // Kumpulkan baris konten milik <li> ini tanpa kehilangan batas <p>/<br>
      const barisLi: string[] = [];
      let bufferInline: MiniNode[] = [];
      const flushInline = () => {
        if (bufferInline.length === 0) return;
        for (const b of kumpulkanBarisInlineDariNodes(bufferInline)) {
          barisLi.push(b);
        }
        bufferInline = [];
      };

      for (const ch of anakKonten) {
        if (ch.type === 'el' && ch.tag === 'pre') {
          flushInline();
          // Tangani <pre> secara langsung setelah teks awal
          continue;
        }
        if (ch.type === 'el' && (BLOCK_TAGS.has(ch.tag) || ch.tag === 'table')) {
          flushInline();
          if (ch.tag === 'table') {
            // Akan diproses setelah label awal
            continue;
          }
          for (const b of kumpulkanBarisInlineDariNodes([ch])) {
            barisLi.push(b);
          }
        } else {
          bufferInline.push(ch);
        }
      }
      flushInline();

      if (barisLi.length > 0) {
        const pertama = barisLi[0];
        const infoBagian = deteksiJudulBagian(pertama);

        if (infoBagian) {
          dorongBaris(pertama);
        } else if (peran === 'pilihan') {
          const huruf = String.fromCharCode(65 + (penghitung % 26));
          const sudahBerhuruf = REGEX_AWALAN_OPSI.test(pertama);
          const barisBerlabel = sudahBerlabelPilihanAtauTambah(pertama, huruf, sudahBerhuruf);
          dorongBaris(barisBerlabel, li, true);
          for (let k = 1; k < barisLi.length; k += 1) {
            dorongBaris(barisLi[k], li, false);
          }
          penghitung += 1;
        } else if (peran === 'soal') {
          const nomorSekarang = Math.max(1, penghitung);
          const sudahBernomor = REGEX_AWALAN_NOMOR.test(pertama);
          const barisBerlabel = sudahBernomor ? pertama : `${nomorSekarang}. ${pertama}`;
          dorongBaris(barisBerlabel);
          if (!sedangDiBagianLewati) {
            nomorSoalOtomatis = nomorSekarang + 1;
          }
          penghitung += 1;
          for (let k = 1; k < barisLi.length; k += 1) {
            dorongBaris(barisLi[k]);
          }
        } else if (listEl.tag === 'ol') {
          const romawi = angkaKeRomawi(penghitung, Boolean(hurufKecil));
          dorongBaris(`${romawi}. ${pertama}`);
          penghitung += 1;
          for (let k = 1; k < barisLi.length; k += 1) {
            dorongBaris(barisLi[k]);
          }
        } else {
          for (const b of barisLi) {
            dorongBaris(b);
          }
        }
      }

      // Tangani <pre> atau <table> yang terselip di dalam <li>
      for (const ch of anakKonten) {
        if (ch.type === 'el' && ch.tag === 'pre') {
          prosesPre(ch);
        } else if (ch.type === 'el' && ch.tag === 'table') {
          prosesTabel(ch);
        }
      }

      // Rekursi ke sub-list (<ol> pilihan di bawah soal)
      for (const sl of subList) {
        prosesList(sl, olDepthBaru);
      }
    });
  };

  function sudahBerlabelPilihanAtauTambah(
    teks: string,
    huruf: string,
    sudahAda: boolean
  ): string {
    return sudahAda ? teks : `${huruf}. ${teks}`;
  }

  const prosesAnakContainer = (container: MiniElementNode, olDepth: number) => {
    let bufferInline: MiniNode[] = [];

    const flushInline = () => {
      if (bufferInline.length === 0) return;
      for (const b of kumpulkanBarisInlineDariNodes(bufferInline)) {
        dorongBaris(b);
      }
      bufferInline = [];
    };

    for (const child of container.children) {
      if (child.type === 'text') {
        bufferInline.push(child);
        continue;
      }

      const tag = child.tag;
      if (tag === 'ol' || tag === 'ul') {
        flushInline();
        prosesList(child, olDepth);
        continue;
      }

      if (tag === 'table') {
        flushInline();
        prosesTabel(child);
        continue;
      }

      if (tag === 'pre') {
        flushInline();
        prosesPre(child);
        continue;
      }

      if (BLOCK_TAGS.has(tag)) {
        flushInline();
        // Periksa apakah di dalam blok ini (mis. <div> atau <p>) ada sub-blok/list/tabel
        const punyaAnakStruktural = child.children.some(
          (c) =>
            c.type === 'el' &&
            (BLOCK_TAGS.has(c.tag) ||
              c.tag === 'ol' ||
              c.tag === 'ul' ||
              c.tag === 'table' ||
              c.tag === 'pre')
        );
        if (punyaAnakStruktural) {
          prosesAnakContainer(child, olDepth);
        } else {
          const barisBlok = kumpulkanBarisInlineDariNodes([child]);
          for (const b of barisBlok) {
            dorongBaris(b, child);
          }
        }
        continue;
      }

      if (tag === 'br' || tag === 'hr') {
        flushInline();
        continue;
      }

      bufferInline.push(child);
    }

    flushInline();
  };

  prosesAnakContainer(root, 0);

  // Kelompokkan per blok soal agar opsi hanya ditandai jika SATU opsi berbeda sendiri (bold/underline/highlight/warna)
  let indeksMulaiOpsiGrup = -1;
  const prosesGrupOpsi = (mulai: number, akhir: number) => {
    if (mulai < 0 || akhir < mulai) return;
    const jumlahOpsi = akhir - mulai + 1;
    if (jumlahOpsi < 2) return;

    const grup = barisHasil.slice(mulai, akhir + 1);
    const indeksTerformatUnik = new Set<number>();

    const cekTraitUnik = (predikat: (d: FormatOpsiDetail) => boolean) => {
      const cocokIdx: number[] = [];
      grup.forEach((b, offset) => {
        if (predikat(b.formatDetail)) cocokIdx.push(offset);
      });
      if (cocokIdx.length === 1) {
        indeksTerformatUnik.add(cocokIdx[0]);
      }
    };

    cekTraitUnik((d) => d.bold);
    cekTraitUnik((d) => d.underline);
    cekTraitUnik((d) => d.highlight);

    // Cek huruf berwarna berbeda: jika tepat 1 opsi punya warna yang berbeda sendiri dari opsi lain
    const hitungWarna = new Map<string, number[]>();
    grup.forEach((b, offset) => {
      const w = b.formatDetail.warna ?? '__default__';
      const arr = hitungWarna.get(w) ?? [];
      arr.push(offset);
      hitungWarna.set(w, arr);
    });
    for (const [w, idxList] of hitungWarna.entries()) {
      if (w !== '__default__' && idxList.length === 1) {
        indeksTerformatUnik.add(idxList[0]);
      }
    }

    // Jika hanya satu opsi yang teridentifikasi berbeda sendiri di grup soal ini, tandai sebagai kunci
    if (indeksTerformatUnik.size === 1) {
      const [offsetTarget] = Array.from(indeksTerformatUnik);
      barisHasil[mulai + offsetTarget].teks = `${barisHasil[mulai + offsetTarget].teks} ${PENANDA_TEKS_BENAR}`;
    }
  };

  for (let i = 0; i < barisHasil.length; i += 1) {
    if (barisHasil[i].adalahOpsi) {
      if (indeksMulaiOpsiGrup === -1) {
        indeksMulaiOpsiGrup = i;
      }
    } else if (indeksMulaiOpsiGrup !== -1) {
      prosesGrupOpsi(indeksMulaiOpsiGrup, i - 1);
      indeksMulaiOpsiGrup = -1;
    }
  }
  if (indeksMulaiOpsiGrup !== -1) {
    prosesGrupOpsi(indeksMulaiOpsiGrup, barisHasil.length - 1);
  }

  void nomorSoalOtomatis;

  const teksTersusun = barisHasil.map((item) => item.teks).join('\n');
  const barisMentah = barisHasil
    .map((item) =>
      item.teks.replaceAll(PENANDA_TEKS_BENAR, '').replaceAll(PENANDA_ADA_MEDIA, '').trim()
    )
    .filter((b) => b.length > 0 && b !== '```');

  return { teksTersusun, barisMentah };
}

export function parseHtmlWord(
  html: string,
  sumber: SumberImpor = 'docx',
  peringatanTambahan: string[] = [],
  infoXml?: {
    setTerformat: Set<string>;
    formatPerTeks?: Map<string, FormatOpsiDetail>;
    antrianListPerTeks?: Map<string, InfoItemListXml[]>;
    setTeksBermedia?: Set<string>;
  }
): HasilValidasiDraft {
  const { teksTersusun, barisMentah } = ekstrakBarisDariHtmlWord(
    html,
    infoXml?.setTerformat,
    infoXml?.antrianListPerTeks,
    infoXml?.formatPerTeks,
    infoXml?.setTeksBermedia
  );
  const peringatan = [...peringatanTambahan];
  if (!teksTersusun.trim()) {
    peringatan.push('Dokumen Word tidak mengandung teks soal yang terbaca.');
  }
  const hasil = parseTeksSoal(teksTersusun, sumber, peringatan);
  return {
    ...hasil,
    barisMentah: barisMentah.length > 0 ? barisMentah : hasil.barisMentah,
  };
}

export async function parseWordBuffer(buffer: ArrayBuffer): Promise<HasilValidasiDraft> {
  const peringatan: string[] = [];
  let infoXml: InfoXmlDocx = {
    setTerformat: new Set<string>(),
    formatPerTeks: new Map<string, FormatOpsiDetail>(),
    antrianListPerTeks: new Map<string, InfoItemListXml[]>(),
    setTeksBermedia: new Set<string>(),
  };

  try {
    const zip = await JSZip.loadAsync(buffer);
    const fileDoc = zip.file('word/document.xml');
    const fileNum = zip.file('word/numbering.xml');
    if (fileDoc) {
      const xmlDocText = await fileDoc.async('string');
      const xmlNumText = fileNum ? await fileNum.async('string') : undefined;
      infoXml = ekstrakInfoXmlDocx(xmlDocText, xmlNumText);
    }
  } catch {
    // Abaikan jika fallback XML gagal, lanjutkan dengan mammoth
  }

  const mammothInput =
    typeof window === 'undefined' && typeof Buffer !== 'undefined'
      ? ({ buffer: Buffer.from(buffer) } as unknown as { arrayBuffer: ArrayBuffer })
      : { arrayBuffer: buffer };

  const hasilMammoth = await mammoth.convertToHtml(mammothInput, {
    styleMap: ['b => strong', 'u => u', 'highlight => mark'],
  });

  return parseHtmlWord(hasilMammoth.value, 'docx', peringatan, infoXml);
}

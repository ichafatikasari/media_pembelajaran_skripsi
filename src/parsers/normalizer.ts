/**
 * Utilitas normalisasi teks soal tanpa mengubah isi blok kode.
 */
export function samakanTandaKutip(teks: string): string {
  return teks
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");
}

export function normalisasiTeksBiasa(teks: string): string {
  return samakanTandaKutip(teks)
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function normalisasiBarisMentah(teks: string): string {
  return teks.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

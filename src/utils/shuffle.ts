/**
 * Pengacak Fisher-Yates murni (tidak mengubah array asli).
 */
export function acakFisherYates<T>(daftar: readonly T[]): T[] {
  const hasil = [...daftar];
  for (let i = hasil.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const sementara = hasil[i];
    hasil[i] = hasil[j];
    hasil[j] = sementara;
  }
  return hasil;
}

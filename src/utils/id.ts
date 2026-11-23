export function buatId(awalan = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${awalan}_${crypto.randomUUID().slice(0, 8)}`;
  }
  const acak = Math.random().toString(36).slice(2, 8);
  const waktu = Date.now().toString(36).slice(-4);
  return `${awalan}_${waktu}${acak}`;
}

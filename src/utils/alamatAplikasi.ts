import { bacaStorageRaw, tulisStorageRaw } from './storage';

const KEY_ALAMAT_APLIKASI = 'duel_otak_alamat_aplikasi_v1';

export function ambilAlamatBawaanBrowser(): string {
  if (typeof window === 'undefined') {
    return 'https://duel-otak.lokal/';
  }
  const pathBersih = window.location.pathname || '/';
  return `${window.location.origin}${pathBersih}`;
}

export function normalisasiAlamatDasar(input: string): string {
  const tanpaHash = input.split('#')[0].trim();
  if (!tanpaHash) {
    return ambilAlamatBawaanBrowser();
  }
  try {
    const parsed = new URL(tanpaHash);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ambilAlamatBawaanBrowser();
    }
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return ambilAlamatBawaanBrowser();
  }
}

export function ambilAlamatAplikasiDasar(): string {
  const tersimpan = bacaStorageRaw(KEY_ALAMAT_APLIKASI);
  if (tersimpan && tersimpan.trim()) {
    return normalisasiAlamatDasar(tersimpan);
  }
  return ambilAlamatBawaanBrowser();
}

export function apakahAlamatAplikasiKustom(): boolean {
  const tersimpan = bacaStorageRaw(KEY_ALAMAT_APLIKASI);
  return Boolean(tersimpan && tersimpan.trim());
}

export function simpanAlamatAplikasiDasar(urlInput: string): {
  ok: boolean;
  alamatFinal: string;
  pesanError?: string;
} {
  const tanpaHash = urlInput.split('#')[0].trim();
  if (!tanpaHash) {
    tulisStorageRaw(KEY_ALAMAT_APLIKASI, '');
    return { ok: true, alamatFinal: ambilAlamatBawaanBrowser() };
  }

  try {
    const parsed = new URL(tanpaHash);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        ok: false,
        alamatFinal: ambilAlamatAplikasiDasar(),
        pesanError: 'Alamat aplikasi harus diawali https:// atau http://.',
      };
    }
    const finalUrl = `${parsed.origin}${parsed.pathname}`;
    tulisStorageRaw(KEY_ALAMAT_APLIKASI, finalUrl);
    return { ok: true, alamatFinal: finalUrl };
  } catch {
    return {
      ok: false,
      alamatFinal: ambilAlamatAplikasiDasar(),
      pesanError: 'Format URL alamat aplikasi tidak valid. Contoh: https://nama-domain.web.app/',
    };
  }
}

export function resetAlamatAplikasiDasar(): string {
  tulisStorageRaw(KEY_ALAMAT_APLIKASI, '');
  return ambilAlamatBawaanBrowser();
}

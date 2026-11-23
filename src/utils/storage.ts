const cadanganMemori = new Map<string, string>();

export function apakahLocalStorageTersedia(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const kunciUji = '__uji_storage_duel_otak__';
    window.localStorage.setItem(kunciUji, '1');
    window.localStorage.removeItem(kunciUji);
    return true;
  } catch {
    return false;
  }
}

function cekLocalStorageTersedia(): boolean {
  return apakahLocalStorageTersedia();
}

export function bacaStorage<T>(kunci: string, nilaiBawaan: T): T {
  try {
    const mentah = cekLocalStorageTersedia()
      ? window.localStorage.getItem(kunci)
      : cadanganMemori.get(kunci) ?? null;

    if (mentah === null) {
      return nilaiBawaan;
    }
    return JSON.parse(mentah) as T;
  } catch {
    try {
      const dariMemori = cadanganMemori.get(kunci);
      if (dariMemori !== undefined) {
        return JSON.parse(dariMemori) as T;
      }
    } catch {
      return nilaiBawaan;
    }
    return nilaiBawaan;
  }
}

export function tulisStorage<T>(kunci: string, nilai: T): boolean {
  try {
    const serial = JSON.stringify(nilai);
    cadanganMemori.set(kunci, serial);
    if (cekLocalStorageTersedia()) {
      window.localStorage.setItem(kunci, serial);
      return true;
    }
    return false;
  } catch {
    try {
      cadanganMemori.set(kunci, JSON.stringify(nilai));
    } catch {
      // Abaikan jika serialisasi gagal total
    }
    return false;
  }
}

export function hapusStorage(kunci: string): void {
  cadanganMemori.delete(kunci);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(kunci);
    }
  } catch {
    // Tetap aman jika localStorage tidak bisa diakses
  }
}

export function bacaStorageRaw(kunci: string): string | null {
  try {
    if (cekLocalStorageTersedia()) {
      const nilai = window.localStorage.getItem(kunci);
      if (nilai !== null) return nilai;
    }
    return cadanganMemori.get(kunci) ?? null;
  } catch {
    return cadanganMemori.get(kunci) ?? null;
  }
}

export function tulisStorageRaw(kunci: string, nilai: string): boolean {
  try {
    cadanganMemori.set(kunci, nilai);
    if (cekLocalStorageTersedia()) {
      window.localStorage.setItem(kunci, nilai);
      return true;
    }
    return false;
  } catch {
    cadanganMemori.set(kunci, nilai);
    return false;
  }
}


import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  apakahPerangkatOnline,
  cekHasilRedirectGoogle,
  firebaseTersedia,
  GuruProfil,
  keluarGoogle,
  masukDenganGoogle,
  pantauStatusAuthGuru,
} from '../lib/firebase';
import { useAppStore } from './store';

interface AuthContextValue {
  profilGuru: GuruProfil | null;
  sedangMemuatAuth: boolean;
  sedangProsesLogin: boolean;
  firebaseTersedia: boolean;
  perangkatOnline: boolean;
  layananOnlineSiap: boolean;
  masukGuru: () => Promise<boolean>;
  keluarGuru: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tampilkanToast } = useAppStore();
  const [profilGuru, setProfilGuru] = useState<GuruProfil | null>(null);
  const [sedangMemuatAuth, setSedangMemuatAuth] = useState<boolean>(firebaseTersedia);
  const [sedangProsesLogin, setSedangProsesLogin] = useState<boolean>(false);
  const [perangkatOnline, setPerangkatOnline] = useState<boolean>(() => apakahPerangkatOnline());

  useEffect(() => {
    const handleOnline = () => setPerangkatOnline(true);
    const handleOffline = () => setPerangkatOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!firebaseTersedia) {
      setSedangMemuatAuth(false);
      return;
    }

    if (apakahPerangkatOnline()) {
      void cekHasilRedirectGoogle().then((res) => {
        if (res.pesanError) {
          tampilkanToast(res.pesanError, 'peringatan');
        }
      });
    }

    const berhenti = pantauStatusAuthGuru((profil) => {
      setProfilGuru(profil);
      setSedangMemuatAuth(false);
    });

    return () => {
      berhenti();
    };
  }, [tampilkanToast]);

  const masukGuru = useCallback(async (): Promise<boolean> => {
    if (!firebaseTersedia || !apakahPerangkatOnline()) {
      tampilkanToast('Fitur online belum tersedia, gunakan paket berkas.', 'peringatan');
      return false;
    }

    setSedangProsesLogin(true);
    try {
      const hasil = await masukDenganGoogle();
      if (hasil.ok) {
        setProfilGuru(hasil.profil);
        tampilkanToast(`Selamat datang, ${hasil.profil.nama}!`, 'sukses');
        return true;
      }
      tampilkanToast(hasil.pesanError, hasil.redirectDimulai ? 'info' : 'peringatan');
      return false;
    } finally {
      setSedangProsesLogin(false);
    }
  }, [tampilkanToast]);

  const keluarGuru = useCallback(async (): Promise<void> => {
    await keluarGoogle();
    setProfilGuru(null);
    tampilkanToast('Anda telah keluar dari akun Google guru.', 'info');
  }, [tampilkanToast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profilGuru,
      sedangMemuatAuth,
      sedangProsesLogin,
      firebaseTersedia,
      perangkatOnline,
      layananOnlineSiap: firebaseTersedia && perangkatOnline,
      masukGuru,
      keluarGuru,
    }),
    [profilGuru, sedangMemuatAuth, sedangProsesLogin, perangkatOnline, masukGuru, keluarGuru]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthGuru(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthGuru harus digunakan di dalam AuthProvider');
  }
  return ctx;
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store';
import {
  daftarServiceWorkerAman,
  terapkanPembaruanServiceWorker,
} from '../utils/offline';
import { bacaStorage, tulisStorage } from '../utils/storage';

export const KEY_PWA_TUNDA_HINGGA = 'duel_otak_pwa_tunda_hingga_v1';
export const DURASI_TUNDA_BANNER_MS = 7 * 24 * 60 * 60 * 1000;

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type TipePerangkatPwa = 'ios' | 'android' | 'firefox' | 'desktop';

export function deteksiTipePerangkatPwa(uaInput?: string): TipePerangkatPwa {
  const ua = (
    uaInput ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  ).toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/firefox|fxios/.test(ua)) return 'firefox';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function bacaStatusTundaPwa(sekarangMs = Date.now()): boolean {
  const tundaHingga = bacaStorage<number>(KEY_PWA_TUNDA_HINGGA, 0);
  return typeof tundaHingga === 'number' && Number.isFinite(tundaHingga) && tundaHingga > sekarangMs;
}

export function simpanTundaPwa7Hari(sekarangMs = Date.now()): number {
  const batas = sekarangMs + DURASI_TUNDA_BANNER_MS;
  tulisStorage(KEY_PWA_TUNDA_HINGGA, batas);
  return batas;
}

function cekModeStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const mediaStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    const safariStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return Boolean(mediaStandalone || safariStandalone);
  } catch {
    return false;
  }
}

interface PwaContextValue {
  isOnline: boolean;
  isInstalled: boolean;
  canPromptInstall: boolean;
  isDeferred: boolean;
  tipePerangkat: TipePerangkatPwa;
  panduanManualTerbuka: boolean;
  adaPembaruanSw: boolean;
  tampilkanToastUpdate: boolean;
  pasangAplikasi: () => Promise<void>;
  tundaBanner: () => void;
  bukaPanduanManual: () => void;
  tutupPanduanManual: () => void;
  muatUlangPembaruan: () => void;
  tutupToastUpdateSementara: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tampilkanToast } = useAppStore();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => cekModeStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDeferred, setIsDeferred] = useState<boolean>(() => bacaStatusTundaPwa());
  const [panduanManualTerbuka, setPanduanManualTerbuka] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [tampilkanToastUpdate, setTampilkanToastUpdate] = useState<boolean>(false);
  const [tipePerangkat] = useState<TipePerangkatPwa>(() => deteksiTipePerangkatPwa());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setPanduanManualTerbuka(false);
      tampilkanToast('Aplikasi berhasil dipasang', 'sukses');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    let mediaQuery: MediaQueryList | null = null;
    const handleDisplayMode = (ev: MediaQueryListEvent) => {
      if (ev.matches) {
        setIsInstalled(true);
      }
    };
    try {
      if (typeof window.matchMedia === 'function') {
        mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addEventListener?.('change', handleDisplayMode);
      }
    } catch {
      // Abaikan browser lama
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayMode);
    };
  }, [tampilkanToast]);

  useEffect(() => {
    daftarServiceWorkerAman((worker) => {
      setWaitingWorker(worker);
      setTampilkanToastUpdate(true);
    });
  }, []);

  const pasangAplikasi = useCallback(async () => {
    if (isInstalled) {
      tampilkanToast('Aplikasi Duel Otak sudah terpasang di perangkat ini.', 'info');
      return;
    }
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          tampilkanToast('Aplikasi berhasil dipasang', 'sukses');
        }
      } catch {
        setPanduanManualTerbuka(true);
      }
      return;
    }
    setPanduanManualTerbuka(true);
  }, [deferredPrompt, isInstalled, tampilkanToast]);

  const tundaBanner = useCallback(() => {
    simpanTundaPwa7Hari();
    setIsDeferred(true);
  }, []);

  const bukaPanduanManual = useCallback(() => {
    setPanduanManualTerbuka(true);
  }, []);

  const tutupPanduanManual = useCallback(() => {
    setPanduanManualTerbuka(false);
  }, []);

  const muatUlangPembaruan = useCallback(() => {
    terapkanPembaruanServiceWorker(waitingWorker);
  }, [waitingWorker]);

  const tutupToastUpdateSementara = useCallback(() => {
    setTampilkanToastUpdate(false);
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      isOnline,
      isInstalled,
      canPromptInstall: Boolean(deferredPrompt),
      isDeferred,
      tipePerangkat,
      panduanManualTerbuka,
      adaPembaruanSw: Boolean(waitingWorker),
      tampilkanToastUpdate,
      pasangAplikasi,
      tundaBanner,
      bukaPanduanManual,
      tutupPanduanManual,
      muatUlangPembaruan,
      tutupToastUpdateSementara,
    }),
    [
      isOnline,
      isInstalled,
      deferredPrompt,
      isDeferred,
      tipePerangkat,
      panduanManualTerbuka,
      waitingWorker,
      tampilkanToastUpdate,
      pasangAplikasi,
      tundaBanner,
      bukaPanduanManual,
      tutupPanduanManual,
      muatUlangPembaruan,
      tutupToastUpdateSementara,
    ]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
};

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error('usePwa harus digunakan di dalam PwaProvider');
  }
  return ctx;
}

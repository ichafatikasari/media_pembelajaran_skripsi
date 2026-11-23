export type CallbackPembaruanSw = (worker: ServiceWorker) => void;

export function apakahDiDalamIframe(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function terapkanPembaruanServiceWorker(worker: ServiceWorker | null): void {
  if (typeof window === 'undefined' || !worker) {
    return;
  }
  try {
    let sudahReload = false;
    const tanganiController = () => {
      if (sudahReload) return;
      sudahReload = true;
      window.location.reload();
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', tanganiController, {
        once: true,
      });
    }
    worker.postMessage({ type: 'SKIP_WAITING' });
  } catch {
    // Abaikan jika gagal mengirim pesan ke worker
  }
}

/**
 * Mendaftarkan Service Worker secara aman hanya pada build produksi dan di luar iframe.
 * Pada mode pengembangan (Vite dev server), menonaktifkan Service Worker lama agar pratinjau
 * selalu memuat kode terbaru tanpa terjebak cache lama atau error dev server.
 */
export function daftarServiceWorkerAman(onPembaruanTersedia?: CallbackPembaruanSw): void {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }
    const protokol = window.location.protocol;
    if (protokol !== 'http:' && protokol !== 'https:') {
      return;
    }
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (import.meta.env.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if ('caches' in window) {
        window.caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((k) => k.startsWith('duel-otak-'))
                .map((k) => window.caches.delete(k))
            )
          )
          .catch(() => {});
      }
      return;
    }

    // Lewati pendaftaran saat berjalan di dalam iframe (mis. pratinjau AI Studio)
    if (apakahDiDalamIframe()) {
      return;
    }

    const pantauRegistrasi = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        onPembaruanTersedia?.(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const workerBaru = reg.installing;
        if (!workerBaru) return;
        workerBaru.addEventListener('statechange', () => {
          if (workerBaru.state === 'installed' && navigator.serviceWorker.controller) {
            onPembaruanTersedia?.(workerBaru);
          }
        });
      });
    };

    const jalankan = () => {
      try {
        navigator.serviceWorker
          .register('./sw.js', { scope: './' })
          .then((reg) => {
            pantauRegistrasi(reg);
          })
          .catch(() => {
            // Abaikan secara tenang jika browser/host menolak pendaftaran SW
          });
      } catch {
        // Abaikan
      }
    };

    if (document.readyState === 'complete') {
      jalankan();
    } else {
      window.addEventListener('load', jalankan, { once: true });
    }
  } catch {
    // Abaikan seluruh kegagalan lingkungan
  }
}

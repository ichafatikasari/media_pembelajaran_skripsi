import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../utils/constants';

interface StageContextValue {
  scale: number;
  isFullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
}

const StageContext = createContext<StageContextValue>({
  scale: 1,
  isFullscreen: false,
  toggleFullscreen: async () => {},
});

export function useStage(): StageContextValue {
  return useContext(StageContext);
}

function hitungSkala(): number {
  if (typeof window === 'undefined') {
    return 1;
  }
  const lebar = window.innerWidth;
  const tinggi = window.innerHeight;
  return Math.max(0.1, Math.min(lebar / STAGE_WIDTH, tinggi / STAGE_HEIGHT));
}

function cekStatusFullscreen(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

interface StageProps {
  children: React.ReactNode;
  onFullscreenError?: (pesan: string) => void;
}

export const Stage: React.FC<StageProps> = ({ children, onFullscreenError }) => {
  const [scale, setScale] = useState<number>(() => hitungSkala());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => cekStatusFullscreen());

  const perbaruiUkuran = useCallback(() => {
    setScale(hitungSkala());
    setIsFullscreen(cekStatusFullscreen());
  }, []);

  useEffect(() => {
    perbaruiUkuran();
    window.addEventListener('resize', perbaruiUkuran);
    document.addEventListener('fullscreenchange', perbaruiUkuran);
    document.addEventListener('webkitfullscreenchange', perbaruiUkuran);
    const visualVp = window.visualViewport;
    if (visualVp) {
      visualVp.addEventListener('resize', perbaruiUkuran);
    }

    return () => {
      window.removeEventListener('resize', perbaruiUkuran);
      document.removeEventListener('fullscreenchange', perbaruiUkuran);
      document.removeEventListener('webkitfullscreenchange', perbaruiUkuran);
      if (visualVp) {
        visualVp.removeEventListener('resize', perbaruiUkuran);
      }
    };
  }, [perbaruiUkuran]);

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>;
        webkitFullscreenElement?: Element | null;
      };
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };

      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else {
        onFullscreenError?.('Browser tidak mendukung mode layar penuh.');
      }
    } catch {
      onFullscreenError?.('Mode layar penuh diblokir oleh jendela peramban ini.');
    } finally {
      setTimeout(perbaruiUkuran, 50);
    }
  }, [onFullscreenError, perbaruiUkuran]);

  return (
    <StageContext.Provider value={{ scale, isFullscreen, toggleFullscreen }}>
      <div
        data-testid="stage-viewport"
        className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0B1B4D]"
      >
        <div
          data-testid="stage-canvas"
          style={{
            width: `${STAGE_WIDTH}px`,
            height: `${STAGE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="relative shrink-0 overflow-hidden bg-[#0B1B4D] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        >
          {children}
        </div>
      </div>
    </StageContext.Provider>
  );
};

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface AutoFitTextProps {
  children: React.ReactNode;
  minFontSize?: number;
  maxFontSize?: number;
  lineHeight?: number;
  className?: string;
  align?: 'left' | 'center' | 'right';
  as?: 'div' | 'p' | 'span' | 'h1' | 'h2' | 'h3';
}

/**
 * Memperkecil ukuran font (binary search langkah 1px) hingga teks muat di dalam kotak
 * tanpa meluber atau menimbulkan scrollbar.
 */
export const AutoFitText: React.FC<AutoFitTextProps> = ({
  children,
  minFontSize = 12,
  maxFontSize = 42,
  lineHeight = 1.3,
  className = '',
  align = 'left',
  as = 'div',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(maxFontSize);

  const hitungUkuranOptimal = useCallback(() => {
    const wadah = containerRef.current;
    const teksEl = textRef.current;
    if (!wadah || !teksEl) {
      return;
    }

    const lebarWadah = wadah.clientWidth;
    const tinggiWadah = wadah.clientHeight;
    if (lebarWadah <= 0 || tinggiWadah <= 0) {
      return;
    }

    const batasBawah = Math.max(8, Math.floor(minFontSize));
    const batasAtas = Math.max(batasBawah, Math.floor(maxFontSize));

    let rendah = batasBawah;
    let tinggi = batasAtas;
    let terbaik = batasBawah;

    teksEl.style.lineHeight = String(lineHeight);
    teksEl.style.letterSpacing = 'normal';

    while (rendah <= tinggi) {
      const tengah = Math.floor((rendah + tinggi) / 2);
      teksEl.style.fontSize = `${tengah}px`;

      const muatTinggi = teksEl.scrollHeight <= tinggiWadah + 1;
      const muatLebar = teksEl.scrollWidth <= lebarWadah + 1;

      if (muatTinggi && muatLebar) {
        terbaik = tengah;
        rendah = tengah + 1;
      } else {
        tinggi = tengah - 1;
      }
    }

    teksEl.style.fontSize = `${terbaik}px`;
    setFontSize(terbaik);
  }, [lineHeight, maxFontSize, minFontSize]);

  useLayoutEffect(() => {
    hitungUkuranOptimal();
  }, [children, hitungUkuranOptimal]);

  useEffect(() => {
    const wadah = containerRef.current;
    if (!wadah) {
      return;
    }

    let aktif = true;
    const observer = new ResizeObserver(() => {
      if (aktif) {
        hitungUkuranOptimal();
      }
    });
    observer.observe(wadah);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (aktif) {
          hitungUkuranOptimal();
        }
      });
    }

    return () => {
      aktif = false;
      observer.disconnect();
    };
  }, [hitungUkuranOptimal]);

  const Tag = as;

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full items-center overflow-hidden ${
        align === 'center' ? 'justify-center text-center' : align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
      }`}
    >
      <Tag
        ref={textRef as React.Ref<never>}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight,
          letterSpacing: 'normal',
        }}
        className={`w-full break-words ${className}`}
      >
        {children}
      </Tag>
    </div>
  );
};

import { useCallback, useEffect, useState } from 'react';
import { RuteHash } from '../data/types';

const RUTE_VALID: readonly RuteHash[] = [
  '/',
  '/game-saya',
  '/buat-game',
  '/pengaturan',
  '/turnamen',
  '/duel',
  '/main',
  '/hasil',
  '/panduan',
  '/impor',
  '/g',
  '/online',
  '/kode',
];

export function bacaRuteDariHash(hash: string): RuteHash {
  const bersih = hash.replace(/^#/, '').split('?')[0] || '/';
  const ternormalisasi = bersih.startsWith('/') ? bersih : `/${bersih}`;
  if (ternormalisasi === '/impor' || ternormalisasi.startsWith('/impor/')) {
    return '/impor';
  }
  if (ternormalisasi === '/g' || ternormalisasi.startsWith('/g/')) {
    return '/g';
  }
  if ((RUTE_VALID as readonly string[]).includes(ternormalisasi)) {
    return ternormalisasi as RuteHash;
  }
  return '/';
}

export function pergiKeRute(rute: RuteHash): void {
  if (typeof window === 'undefined') {
    return;
  }
  const targetHash = `#${rute}`;
  if (rute === '/impor' && window.location.hash.startsWith('#/impor/')) {
    return;
  }
  if (rute === '/g' && window.location.hash.startsWith('#/g/')) {
    return;
  }
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
}

export function pergiKeKodeOnline(kode: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const kodeBersih = kode.replace(/[\s-]+/g, '').trim().toUpperCase();
  const targetHash = `#/g/${kodeBersih}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
}

export function useHashRoute(): {
  rute: RuteHash;
  hashMentah: string;
  navigasi: (rute: RuteHash) => void;
} {
  const [hashMentah, setHashMentah] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return '#/';
    }
    if (!window.location.hash) {
      window.location.hash = '#/';
    }
    return window.location.hash;
  });

  const [rute, setRute] = useState<RuteHash>(() => {
    if (typeof window === 'undefined') {
      return '/';
    }
    return bacaRuteDariHash(window.location.hash);
  });

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash || '#/';
      setHashMentah(h);
      setRute(bacaRuteDariHash(h));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigasi = useCallback((ruteTujuan: RuteHash) => {
    pergiKeRute(ruteTujuan);
    setHashMentah(typeof window !== 'undefined' ? window.location.hash : `#${ruteTujuan}`);
    setRute(ruteTujuan);
  }, []);

  return { rute, hashMentah, navigasi };
}

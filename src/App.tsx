import React, { useEffect } from 'react';
import { AuthProvider } from './app/AuthContext';
import { PwaProvider } from './app/PwaContext';
import { useHashRoute } from './app/router';
import { AppStoreProvider, useAppStore } from './app/store';
import { CetakHasilPrintView } from './components/CetakHasilPrintView';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  BannerPasangPwa,
  ModalCaraPasangPwa,
  ToastPembaruanPwa,
} from './components/PwaUi';
import { Stage } from './components/Stage';
import { ToastContainer } from './components/Toast';
import { TopBar } from './components/TopBar';
import { cariSoalUntukEntriHasil } from './utils/riwayatHasil';
import { BerandaScreen } from './screens/BerandaScreen';
import { BuatGameScreen } from './screens/BuatGameScreen';
import { BukaOnlineScreen } from './screens/BukaOnlineScreen';
import { DuelScreen } from './screens/DuelScreen';
import { GameOnlineSayaScreen } from './screens/GameOnlineSayaScreen';
import { GameSayaScreen } from './screens/GameSayaScreen';
import { HasilScreen } from './screens/HasilScreen';
import { ImporLinkScreen } from './screens/ImporLinkScreen';
import { MainScreen } from './screens/MainScreen';
import { MasukKodeScreen } from './screens/MasukKodeScreen';
import { PanduanScreen } from './screens/PanduanScreen';
import { PengaturanGameScreen } from './screens/PengaturanGameScreen';
import { TurnamenScreen } from './screens/TurnamenScreen';

const KontenAplikasi: React.FC = () => {
  const { rute, hashMentah, navigasi } = useHashRoute();
  const {
    daftarGame,
    daftarToast,
    entriCetakHasil,
    hapusToast,
    tampilkanToast,
    tutupIzinEditPin,
  } = useAppStore();

  useEffect(() => {
    if (rute !== '/buat-game' && rute !== '/pengaturan') {
      tutupIzinEditPin();
    }
  }, [rute, tutupIzinEditPin]);

  const renderLayar = () => {
    switch (rute) {
      case '/':
        return <BerandaScreen onNavigasi={navigasi} />;
      case '/game-saya':
        return <GameSayaScreen onNavigasi={navigasi} />;
      case '/buat-game':
        return <BuatGameScreen onNavigasi={navigasi} />;
      case '/pengaturan':
        return <PengaturanGameScreen onNavigasi={navigasi} />;
      case '/turnamen':
        return <TurnamenScreen onNavigasi={navigasi} />;
      case '/duel':
        return <DuelScreen onNavigasi={navigasi} />;
      case '/main':
        return <MainScreen onNavigasi={navigasi} />;
      case '/hasil':
        return <HasilScreen onNavigasi={navigasi} />;
      case '/panduan':
        return <PanduanScreen onNavigasi={navigasi} />;
      case '/impor':
        return <ImporLinkScreen hashMentah={hashMentah} onNavigasi={navigasi} />;
      case '/g':
        return <BukaOnlineScreen hashMentah={hashMentah} onNavigasi={navigasi} />;
      case '/online':
        return <GameOnlineSayaScreen onNavigasi={navigasi} />;
      case '/kode':
        return <MasukKodeScreen onNavigasi={navigasi} />;
      default:
        return <BerandaScreen onNavigasi={navigasi} />;
    }
  };

  const tampilkanBannerPasang = rute === '/' || rute === '/game-saya';

  const soalCetak = entriCetakHasil
    ? cariSoalUntukEntriHasil(entriCetakHasil, daftarGame)
    : [];

  return (
    <>
      <div className="no-print">
        <Stage onFullscreenError={(pesan) => tampilkanToast(pesan, 'peringatan')}>
          <div className="flex h-full w-full flex-col overflow-hidden bg-[#0B1B4D]">
            {rute !== '/main' && <TopBar ruteAktif={rute} onNavigasi={navigasi} />}
            <main className="relative min-h-0 flex-1 overflow-hidden">
              <ErrorBoundary onResetToHome={() => navigasi('/')}>{renderLayar()}</ErrorBoundary>
            </main>
            {tampilkanBannerPasang && <BannerPasangPwa />}
          </div>
          <ModalCaraPasangPwa />
          <ToastPembaruanPwa />
          <ToastContainer daftarToast={daftarToast} onTutup={hapusToast} />
        </Stage>
      </div>
      <CetakHasilPrintView entri={entriCetakHasil} daftarSoal={soalCetak} />
    </>
  );
};

export default function App() {
  return (
    <AppStoreProvider>
      <PwaProvider>
        <AuthProvider>
          <KontenAplikasi />
        </AuthProvider>
      </PwaProvider>
    </AppStoreProvider>
  );
}

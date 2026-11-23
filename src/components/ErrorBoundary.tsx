import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import { Button3D } from './Button3D';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onResetToHome?: () => void;
}

interface ErrorBoundaryState {
  adaError: boolean;
  pesanError: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      adaError: false,
      pesanError: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      adaError: true,
      pesanError: error?.message || 'Terjadi kendala tak terduga pada tampilan.',
    };
  }

  componentDidCatch(): void {
    // Error tertangkap oleh boundary agar layar tidak pernah kosong/putih.
  }

  handleKembali = (): void => {
    this.setState({ adaError: false, pesanError: '' });
    if (this.props.onResetToHome) {
      this.props.onResetToHome();
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/';
    }
  };

  render(): React.ReactNode {
    if (this.state.adaError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#0B1B4D] p-10 text-white">
          <div className="w-full max-w-[680px] rounded-3xl border-4 border-[#FF9100] bg-[#12276B] p-10 text-center shadow-[0_14px_0_#071236]">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FF9100] text-[#0B1B4D] shadow-[0_6px_0_#C56200]">
              <AlertTriangle size={44} strokeWidth={2.5} />
            </div>
            <h1 className="font-display mb-3 text-4xl font-bold text-[#FFD400]">
              Ups, Terjadi Gangguan Tampilan
            </h1>
            <p className="text-bacaan mb-6 text-xl text-[#DCE7FF]">
              Aplikasi aman dan data Anda tetap tersimpan. Silakan kembali ke layar beranda untuk melanjutkan.
            </p>
            <div className="mb-8 rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] px-5 py-4 text-base text-[#FFD400]">
              {this.state.pesanError}
            </div>
            <Button3D variant="kuning" size="lg" onClick={this.handleKembali}>
              <Home size={24} />
              Kembali ke Beranda
            </Button3D>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

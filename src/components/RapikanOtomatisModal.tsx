import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { ItemPratinjauRapikan } from '../parsers';
import { Button3D } from './Button3D';
import { Modal } from './Modal';

interface RapikanOtomatisModalProps {
  terbuka: boolean;
  daftarPratinjau: ItemPratinjauRapikan[];
  onTutup: () => void;
  onTerapkan: () => void;
}

export const RapikanOtomatisModal: React.FC<RapikanOtomatisModalProps> = ({
  terbuka,
  daftarPratinjau,
  onTutup,
  onTerapkan,
}) => {
  return (
    <Modal
      terbuka={terbuka}
      judul={`Pratinjau Rapikan Otomatis (${daftarPratinjau.length} soal)`}
      lebarMaks="xl"
      onTutup={onTutup}
      footer={
        <>
          <Button3D variant="navy" size="md" onClick={onTutup}>
            <span>Batal</span>
          </Button3D>
          <Button3D
            variant="hijau"
            size="md"
            disabled={daftarPratinjau.length === 0}
            onClick={onTerapkan}
          >
            <Check size={18} />
            <span>Terapkan Perapian ({daftarPratinjau.length} soal)</span>
          </Button3D>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-2xl border-2 border-[#3C62D4] bg-[#071236] p-3.5 text-sm font-semibold text-[#DCE7FF]">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-[#FFD400]" />
          <div>
            Rapikan Otomatis memperbaiki spasi ganda, spasi sebelum tanda baca (kecuali elipsis <code>...</code>), huruf awal kalimat kecil, serta sisa nomor/huruf awalan tanpa mengubah isi soal maupun kunci jawaban. Anda tetap bisa menekan <strong>URUNGKAN</strong> setelah diterapkan.
          </div>
        </div>

        {daftarPratinjau.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#00C853] bg-[#071236] p-6 text-center font-bold text-[#57E893]">
            Semua soal sudah rapi, tidak ada perubahan yang diperlukan.
          </div>
        ) : (
          <div className="space-y-3">
            {daftarPratinjau.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border-2 border-[#2A4CB8] bg-[#071236] p-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-display rounded-lg bg-[#FFD400] px-2.5 py-0.5 text-xs font-bold text-[#0B1B4D]">
                    Soal #{item.nomorUrut}
                  </span>
                  {item.perubahan.map((ket, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-[#173287] px-2.5 py-0.5 text-xs font-bold text-[#DCE7FF]"
                    >
                      {ket}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-[#B80023] bg-[#2D0814] p-3">
                    <div className="mb-1 text-xs font-bold text-[#FF99AD]">Sebelum</div>
                    <p className="font-semibold text-white">{item.pertanyaanSebelum}</p>
                    <ul className="mt-2 space-y-1 text-xs text-[#DCE7FF]">
                      {item.pilihanSebelum.map((p, oIdx) => {
                        const berubahOpsi = p !== item.pilihanSesudah[oIdx];
                        return (
                          <li
                            key={oIdx}
                            className={berubahOpsi ? 'font-bold text-[#FFD400]' : ''}
                          >
                            {String.fromCharCode(65 + oIdx)}. {p}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-[#00C853] bg-[#062E18] p-3">
                    <div className="mb-1 text-xs font-bold text-[#57E893]">Sesudah</div>
                    <p className="font-semibold text-white">{item.pertanyaanSesudah}</p>
                    <ul className="mt-2 space-y-1 text-xs text-[#DCE7FF]">
                      {item.pilihanSesudah.map((p, oIdx) => {
                        const berubahOpsi = p !== item.pilihanSebelum[oIdx];
                        return (
                          <li
                            key={oIdx}
                            className={berubahOpsi ? 'font-bold text-[#57E893]' : ''}
                          >
                            {String.fromCharCode(65 + oIdx)}. {p}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

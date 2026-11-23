import { bacaStorage, tulisStorage } from './storage';

const KEY_VOLUME_AUDIO = 'duel_otak_volume_audio_v1';

interface PelacakNodeAudio {
  hentikan: () => void;
}

export interface OpsiPeluit {
  mulai?: number;
  durasi: number;
}

let konteksAudio: AudioContext | null = null;
let masterSfxGain: GainNode | null = null;
let musicDuckGain: GainNode | null = null;
let musicVolumeGain: GainNode | null = null;
let bufferNoisePutih: AudioBuffer | null = null;

let sudahInteraksiPengguna = false;
let suaraAktifGlobal = true;
let musikAktifGlobal = false;
let musikSedangJeda = false;
let timerMusikId: number | null = null;
let langkahMusik = 0;
let volumeMaster = bacaStorage<number>(KEY_VOLUME_AUDIO, 0.7);

let kelompokUrutanMulai: PelacakNodeAudio[] = [];
let timerDuckingMulaiId: number | null = null;
let timerDuckingAkhirId: number | null = null;
let kelompokEfekAkhir: PelacakNodeAudio[] = [];
let jedaAntiGandaSorakSampaiMs = 0;

function perbaruiGainUtama(): void {
  if (!konteksAudio) return;
  const sekarang = konteksAudio.currentTime;

  if (masterSfxGain) {
    const targetSfx = suaraAktifGlobal ? volumeMaster : 0;
    masterSfxGain.gain.setTargetAtTime(targetSfx, sekarang, 0.015);
  }

  if (musicVolumeGain) {
    const targetMusik = musikAktifGlobal && !musikSedangJeda ? volumeMaster : 0;
    musicVolumeGain.gain.setTargetAtTime(targetMusik, sekarang, 0.02);
  }
}

function ambilKonteksAudio(): AudioContext | null {
  if (!sudahInteraksiPengguna || typeof window === 'undefined') {
    return null;
  }
  try {
    if (!konteksAudio) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      konteksAudio = new Ctor();

      masterSfxGain = konteksAudio.createGain();
      masterSfxGain.gain.setValueAtTime(
        suaraAktifGlobal ? volumeMaster : 0,
        konteksAudio.currentTime
      );
      masterSfxGain.connect(konteksAudio.destination);

      musicDuckGain = konteksAudio.createGain();
      musicDuckGain.gain.setValueAtTime(1, konteksAudio.currentTime);

      musicVolumeGain = konteksAudio.createGain();
      musicVolumeGain.gain.setValueAtTime(
        musikAktifGlobal && !musikSedangJeda ? volumeMaster : 0,
        konteksAudio.currentTime
      );

      musicDuckGain.connect(musicVolumeGain);
      musicVolumeGain.connect(konteksAudio.destination);
    }

    if (konteksAudio.state === 'suspended') {
      void konteksAudio.resume().catch(() => {});
    }
    return konteksAudio;
  } catch {
    return null;
  }
}

function ambilBufferNoisePutih(ctx: AudioContext): AudioBuffer {
  if (bufferNoisePutih && bufferNoisePutih.sampleRate === ctx.sampleRate) {
    return bufferNoisePutih;
  }
  const panjang = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, panjang, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < panjang; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  bufferNoisePutih = buf;
  return buf;
}

function aturDuckingMusik(aktif: boolean, durasiPulihDetik = 0): void {
  if (!konteksAudio || !musicDuckGain) return;
  const sekarang = konteksAudio.currentTime;
  try {
    musicDuckGain.gain.cancelScheduledValues(sekarang);
    if (aktif) {
      musicDuckGain.gain.setTargetAtTime(0.22, sekarang, 0.03);
      if (durasiPulihDetik > 0 && typeof window !== 'undefined') {
        if (timerDuckingAkhirId !== null) {
          window.clearTimeout(timerDuckingAkhirId);
        }
        timerDuckingAkhirId = window.setTimeout(() => {
          timerDuckingAkhirId = null;
          aturDuckingMusik(false);
        }, Math.ceil(durasiPulihDetik * 1000));
      }
    } else {
      musicDuckGain.gain.setTargetAtTime(1, sekarang, 0.08);
    }
  } catch {
    // Abaikan jika AudioContext belum siap
  }
}

function bersihkanDaftarNode(daftar: PelacakNodeAudio[]): void {
  while (daftar.length > 0) {
    const item = daftar.pop();
    if (item) {
      try {
        item.hentikan();
      } catch {
        // Abaikan error pembersihan node yang sudah selesai
      }
    }
  }
}

function daftarkanNodeUntukBersih(
  stopTargets: AudioScheduledSourceNode[],
  disconnectTargets: AudioNode[],
  kelompok?: PelacakNodeAudio[]
): void {
  let sudahBersih = false;
  const bersih = () => {
    if (sudahBersih) return;
    sudahBersih = true;
    for (const src of stopTargets) {
      try {
        src.stop();
      } catch {
        // Sudah berhenti
      }
    }
    for (const node of disconnectTargets) {
      try {
        node.disconnect();
      } catch {
        // Sudah terputus
      }
    }
  };

  if (stopTargets[0]) {
    stopTargets[0].onended = bersih;
  }
  if (kelompok) {
    kelompok.push({ hentikan: bersih });
  }
}

/**
 * Mengaktifkan Web Audio API setelah interaksi klik/sentuh pertama pengguna
 * sesuai kebijakan autoplay browser modern.
 */
export function tandaiInteraksiAudio(): void {
  sudahInteraksiPengguna = true;
  ambilKonteksAudio();
  perbaruiGainUtama();
}

export function ambilVolumeAudio(): number {
  return volumeMaster;
}

export function aturVolumeAudio(nilaiBaru: number): number {
  volumeMaster = Math.min(1, Math.max(0, Number.isFinite(nilaiBaru) ? nilaiBaru : 0.7));
  tulisStorage(KEY_VOLUME_AUDIO, volumeMaster);
  perbaruiGainUtama();
  return volumeMaster;
}

export function sinkronPengaturanAudio(suara: boolean, musik: boolean, jeda: boolean): void {
  suaraAktifGlobal = suara;
  musikAktifGlobal = musik;
  musikSedangJeda = jeda;
  perbaruiGainUtama();

  if (!musikAktifGlobal || musikSedangJeda || !sudahInteraksiPengguna) {
    hentikanMusikLatar();
    return;
  }
  mulaiMusikLatar();
}

function mainkanNada(
  frekuensiAwal: number,
  durasiDetik: number,
  tipe: OscillatorType,
  gainPuncak: number,
  tundaDetik = 0,
  frekuensiAkhir?: number,
  tujuan: 'sfx' | 'musik' = 'sfx',
  kelompok?: PelacakNodeAudio[]
): void {
  const ctx = ambilKonteksAudio();
  if (!ctx || volumeMaster <= 0.005) return;
  if (tujuan === 'sfx' && !suaraAktifGlobal) return;

  const targetNode = tujuan === 'musik' ? musicDuckGain : masterSfxGain;
  if (!targetNode) return;

  try {
    const waktuMulai = ctx.currentTime + Math.max(0, tundaDetik);
    const durasi = Math.max(0.04, durasiDetik);
    const waktuSelesai = waktuMulai + durasi;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tipe;
    osc.frequency.setValueAtTime(frekuensiAwal, waktuMulai);
    if (frekuensiAkhir !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, frekuensiAkhir), waktuSelesai);
    }

    const level = Math.min(0.45, Math.max(0.001, gainPuncak));
    gain.gain.setValueAtTime(0.0001, waktuMulai);
    gain.gain.linearRampToValueAtTime(level, waktuMulai + Math.min(0.018, durasi * 0.25));
    gain.gain.setValueAtTime(level, Math.max(waktuMulai + 0.02, waktuSelesai - Math.min(0.045, durasi * 0.35)));
    gain.gain.linearRampToValueAtTime(0.0001, waktuSelesai);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(waktuMulai);
    osc.stop(waktuSelesai + 0.02);
    daftarkanNodeUntukBersih([osc], [osc, gain], kelompok);
  } catch {
    // Abaikan jika audio context diblokir sementara
  }
}

/**
 * Menghasilkan suara peluit wasit realistis (trill LFO + desis napas bandpass)
 * dengan penjadwalan presisi terhadap ctx.currentTime.
 */
export function peluit(
  { mulai = 0, durasi }: OpsiPeluit,
  kelompok?: PelacakNodeAudio[],
  duckingMusik = true
): void {
  const ctx = ambilKonteksAudio();
  if (!ctx || !masterSfxGain || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  try {
    const durasiAman = Math.max(0.12, durasi);
    const t0 = ctx.currentTime + Math.max(0, mulai);
    const tAkhir = t0 + durasiAman;
    const tTahan = Math.max(t0 + 0.025, tAkhir - 0.07);

    if (duckingMusik) {
      aturDuckingMusik(true, Math.max(0.3, mulai + durasiAman + 0.15));
    }

    // 1. Osilator utama 2700 -> 2950 Hz dalam 0,05 detik
    const oscUtama = ctx.createOscillator();
    oscUtama.type = 'sine';
    oscUtama.frequency.setValueAtTime(2700, t0);
    oscUtama.frequency.linearRampToValueAtTime(2950, t0 + Math.min(0.05, durasiAman * 0.4));

    // 2. LFO 32 Hz (kedalaman 140 Hz) untuk getaran "pritttt"
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(32, t0);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(140, t0);
    lfo.connect(lfoGain);
    lfoGain.connect(oscUtama.frequency);

    // 3. Envelope peluit utama: naik 20 ms ke 0.35, tahan, turun 70 ms di akhir
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, t0);
    envGain.gain.linearRampToValueAtTime(0.35, t0 + 0.02);
    envGain.gain.setValueAtTime(0.35, tTahan);
    envGain.gain.linearRampToValueAtTime(0.0001, tAkhir);

    oscUtama.connect(envGain);
    envGain.connect(masterSfxGain);

    // 4. Desis udara: noise putih -> bandpass 3000 Hz Q tinggi -> gain 0.05
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = ambilBufferNoisePutih(ctx);
    noiseSrc.loop = true;

    const filterNapas = ctx.createBiquadFilter();
    filterNapas.type = 'bandpass';
    filterNapas.frequency.setValueAtTime(3000, t0);
    filterNapas.Q.setValueAtTime(6, t0);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.linearRampToValueAtTime(0.05, t0 + 0.02);
    noiseGain.gain.setValueAtTime(0.05, tTahan);
    noiseGain.gain.linearRampToValueAtTime(0.0001, tAkhir);

    noiseSrc.connect(filterNapas);
    filterNapas.connect(noiseGain);
    noiseGain.connect(masterSfxGain);

    oscUtama.start(t0);
    lfo.start(t0);
    noiseSrc.start(t0);

    const waktuStop = tAkhir + 0.02;
    oscUtama.stop(waktuStop);
    lfo.stop(waktuStop);
    noiseSrc.stop(waktuStop);

    daftarkanNodeUntukBersih(
      [oscUtama, lfo, noiseSrc],
      [oscUtama, lfo, lfoGain, envGain, noiseSrc, filterNapas, noiseGain],
      kelompok
    );
  } catch {
    // Abaikan bila Web Audio gagal sementara
  }
}

function jadwalkanDrumRollNaik(
  tundaMulai: number,
  durasiTotal: number,
  kelompok?: PelacakNodeAudio[]
): void {
  const ctx = ambilKonteksAudio();
  if (!ctx || !masterSfxGain || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  try {
    const bufferNoise = ambilBufferNoisePutih(ctx);
    const tDasar = ctx.currentTime + Math.max(0, tundaMulai);

    // Pukulan snare berulang makin cepat & makin keras
    let offset = 0;
    let langkah = 0;
    while (offset < durasiTotal - 0.06) {
      const progres = offset / durasiTotal;
      const interval = 0.095 - progres * 0.045; // dari ~10.5/dtk naik ke ~20/dtk
      const tPukul = tDasar + offset;
      const gainPukul = 0.06 + progres * 0.16;

      // Noise snare berfilter bandpass
      const src = ctx.createBufferSource();
      src.buffer = bufferNoise;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100 + progres * 900, tPukul);
      filter.Q.setValueAtTime(1.6, tPukul);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tPukul);
      g.gain.linearRampToValueAtTime(gainPukul, tPukul + 0.008);
      g.gain.linearRampToValueAtTime(0.0001, tPukul + 0.065);

      src.connect(filter);
      filter.connect(g);
      g.connect(masterSfxGain);

      src.start(tPukul);
      src.stop(tPukul + 0.075);
      daftarkanNodeUntukBersih([src], [src, filter, g], kelompok);

      // Badan drum snare lembut tiap dua ketukan agar terasa bertenaga
      if (langkah % 2 === 0) {
        mainkanNada(
          185 + progres * 35,
          0.055,
          'triangle',
          gainPukul * 0.65,
          tundaMulai + offset,
          105,
          'sfx',
          kelompok
        );
      }

      offset += interval;
      langkah += 1;
    }
  } catch {
    // Abaikan error audio
  }
}

function jadwalkanKickBesar(tundaMulai: number, kelompok?: PelacakNodeAudio[]): void {
  const ctx = ambilKonteksAudio();
  if (!ctx || !masterSfxGain || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  try {
    const t0 = ctx.currentTime + Math.max(0, tundaMulai);

    // Dentuman bass kick
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.19);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.45, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);

    osc.connect(g);
    g.connect(masterSfxGain);

    osc.start(t0);
    osc.stop(t0 + 0.36);
    daftarkanNodeUntukBersih([osc], [osc, g], kelompok);

    // Pukulan awal kick
    mainkanNada(260, 0.05, 'triangle', 0.2, tundaMulai, 95, 'sfx', kelompok);
  } catch {
    // Abaikan error audio
  }
}

function jadwalkanSorakPenonton(
  tundaMulai: number,
  durasi: number,
  gainAwal: number,
  gainPuncak: number,
  efekRingan: boolean,
  kelompok?: PelacakNodeAudio[]
): void {
  const ctx = ambilKonteksAudio();
  if (!ctx || !masterSfxGain || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  try {
    const bufferNoise = ambilBufferNoisePutih(ctx);
    const t0 = ctx.currentTime + Math.max(0, tundaMulai);
    const tAkhir = t0 + Math.max(0.2, durasi);
    const tPuncak = Math.max(t0 + 0.08, tAkhir - Math.min(0.28, durasi * 0.28));

    // Pada mode efek ringan, kurangi lapisan sorak (1 lapis ringan saja)
    const daftarBand = efekRingan
      ? [{ freq: 950, q: 1.5, rasio: 0.45 }]
      : [
          { freq: 620, q: 1.4, rasio: 0.55 },
          { freq: 1250, q: 2.0, rasio: 0.48 },
          { freq: 2150, q: 2.2, rasio: 0.32 },
        ];

    for (const pita of daftarBand) {
      const src = ctx.createBufferSource();
      src.buffer = bufferNoise;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(pita.freq, t0);
      filter.Q.setValueAtTime(pita.q, t0);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(Math.max(0.002, gainAwal * pita.rasio), t0 + 0.08);
      g.gain.linearRampToValueAtTime(Math.max(0.002, gainPuncak * pita.rasio), tPuncak);
      g.gain.linearRampToValueAtTime(0.0001, tAkhir);

      src.connect(filter);
      filter.connect(g);
      g.connect(masterSfxGain);

      src.start(t0);
      src.stop(tAkhir + 0.02);
      daftarkanNodeUntukBersih([src], [src, filter, g], kelompok);
    }
  } catch {
    // Abaikan error audio
  }
}

/**
 * Menghentikan seluruh suara dan jadwal audio urutan sebelum/saat mulai duel.
 */
export function hentikanUrutanMulai(): void {
  if (typeof window !== 'undefined' && timerDuckingMulaiId !== null) {
    window.clearTimeout(timerDuckingMulaiId);
    timerDuckingMulaiId = null;
  }
  bersihkanDaftarNode(kelompokUrutanMulai);
  aturDuckingMusik(false);
}

/**
 * Menghentikan seluruh efek akhir yang sedang berjalan (saat reset / keluar).
 */
export function hentikanSemuaEfekTerjadwal(): void {
  hentikanUrutanMulai();
  if (typeof window !== 'undefined' && timerDuckingAkhirId !== null) {
    window.clearTimeout(timerDuckingAkhirId);
    timerDuckingAkhirId = null;
  }
  bersihkanDaftarNode(kelompokEfekAkhir);
  aturDuckingMusik(false);
}

/**
 * Urutan bunyi resmi saat guru menekan MULAI DUEL (6,7 detik total):
 * 0.00s - 2.00s : "SIAP-SIAP!" -> drum roll pendek naik + sorak pelan membesar
 * 2.00s & 2.40s : Peluit wasit pembuka "pip-pip" (0,25s, jeda 0,15s, 0,25s)
 * 2.80s / 3.80s / 4.80s : Hitung mundur 3 -> 2 -> 1 (beep 660, 880, 1100 Hz, 0,2s)
 * 5.80s - 6.70s : "TARIK!" -> peluit panjang (0,9s) + kick besar + ledakan sorak singkat
 */
export function mulaiUrutanAudioMulai(efekRingan = false, tundaAwalDetik = 0): void {
  hentikanUrutanMulai();

  const ctx = ambilKonteksAudio();
  if (!ctx || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  const d = Math.max(0, tundaAwalDetik);
  aturDuckingMusik(true);
  if (typeof window !== 'undefined') {
    timerDuckingMulaiId = window.setTimeout(() => {
      timerDuckingMulaiId = null;
      aturDuckingMusik(false);
    }, Math.ceil((d + 6.75) * 1000));
  }

  // 1. "SIAP-SIAP!" (2 detik): drum roll naik + sorak penonton pelan membesar
  jadwalkanDrumRollNaik(d + 0.02, 1.85, kelompokUrutanMulai);
  jadwalkanSorakPenonton(d + 0.02, 1.92, 0.02, 0.16, efekRingan, kelompokUrutanMulai);

  // 2. Peluit wasit pembuka: pip-pip (0,25s, jeda 0,15s, 0,25s)
  peluit({ mulai: d + 2.0, durasi: 0.25 }, kelompokUrutanMulai, false);
  peluit({ mulai: d + 2.4, durasi: 0.25 }, kelompokUrutanMulai, false);

  // 3. Hitung mundur 3 -> 2 -> 1 (tiap 1 detik: 660, 880, 1100 Hz, ~0,2 detik)
  mainkanNada(660, 0.2, 'triangle', 0.26, d + 2.8, undefined, 'sfx', kelompokUrutanMulai);
  mainkanNada(880, 0.2, 'triangle', 0.28, d + 3.8, undefined, 'sfx', kelompokUrutanMulai);
  mainkanNada(1100, 0.22, 'triangle', 0.3, d + 4.8, undefined, 'sfx', kelompokUrutanMulai);

  // 4. "TARIK!" (5,80s): peluit panjang ~0,9s + kick besar + ledakan sorak singkat
  peluit({ mulai: d + 5.8, durasi: 0.9 }, kelompokUrutanMulai, false);
  jadwalkanKickBesar(d + 5.8, kelompokUrutanMulai);
  jadwalkanSorakPenonton(d + 5.82, 0.88, 0.22, 0.28, efekRingan, kelompokUrutanMulai);
}

/**
 * Peluit akhir permainan: tiga tiupan pendek-pendek-panjang,
 * lalu sorak penonton dan fanfare arpeggio naik untuk pemenang.
 */
export function mainkanPeluitAkhirSelesai(efekRingan = false): void {
  bersihkanDaftarNode(kelompokEfekAkhir);
  const ctx = ambilKonteksAudio();
  if (!ctx || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  jedaAntiGandaSorakSampaiMs = Date.now() + 2800;
  aturDuckingMusik(true, 2.5);

  // Pendek - pendek - panjang
  peluit({ mulai: 0, durasi: 0.2 }, kelompokEfekAkhir, false);
  peluit({ mulai: 0.32, durasi: 0.2 }, kelompokEfekAkhir, false);
  peluit({ mulai: 0.64, durasi: 0.75 }, kelompokEfekAkhir, false);

  // Sorak penonton + fanfare arpeggio naik
  jadwalkanSorakPenonton(1.4, 1.1, 0.16, 0.26, efekRingan, kelompokEfekAkhir);
  mainkanNada(523.25, 0.14, 'triangle', 0.25, 1.42, undefined, 'sfx', kelompokEfekAkhir); // C5
  mainkanNada(659.25, 0.14, 'triangle', 0.25, 1.53, undefined, 'sfx', kelompokEfekAkhir); // E5
  mainkanNada(783.99, 0.16, 'triangle', 0.26, 1.64, undefined, 'sfx', kelompokEfekAkhir); // G5
  mainkanNada(1046.5, 0.26, 'triangle', 0.3, 1.75, undefined, 'sfx', kelompokEfekAkhir); // C6
  mainkanNada(1318.51, 0.45, 'sine', 0.28, 1.9, undefined, 'sfx', kelompokEfekAkhir); // E6
}

/**
 * Bunyi penanda masuk Ronde Penentuan saat skor seri:
 * satu peluit panjang + bunyi "dum-dum".
 */
export function mainkanPeluitPenentuan(): void {
  bersihkanDaftarNode(kelompokEfekAkhir);
  const ctx = ambilKonteksAudio();
  if (!ctx || !suaraAktifGlobal || volumeMaster <= 0.005) return;

  aturDuckingMusik(true, 1.6);
  peluit({ mulai: 0, durasi: 0.75 }, kelompokEfekAkhir, false);

  // Bunyi "dum-dum" berturut
  mainkanNada(135, 0.24, 'sine', 0.36, 0.85, 55, 'sfx', kelompokEfekAkhir);
  mainkanNada(122, 0.28, 'sine', 0.38, 1.15, 48, 'sfx', kelompokEfekAkhir);
}

/**
 * Bunyi "klik" rendah saat guru menekan JEDA.
 */
export function mainkanKlikJeda(): void {
  if (!suaraAktifGlobal) return;
  mainkanNada(215, 0.06, 'triangle', 0.24, 0, 95);
}

/**
 * Bunyi satu "pip" pendek saat guru menekan LANJUT.
 */
export function mainkanPipLanjut(): void {
  if (!suaraAktifGlobal) return;
  peluit({ mulai: 0, durasi: 0.16 });
}

export function mainkanDing(): void {
  if (!suaraAktifGlobal) return;
  mainkanNada(523.25, 0.14, 'triangle', 0.25, 0); // C5
  mainkanNada(659.25, 0.16, 'triangle', 0.25, 0.07); // E5
  mainkanNada(783.99, 0.22, 'sine', 0.28, 0.14); // G5
}

export function mainkanBuzz(): void {
  if (!suaraAktifGlobal) return;
  mainkanNada(165, 0.22, 'sawtooth', 0.16, 0, 118);
  mainkanNada(130, 0.25, 'triangle', 0.22, 0.05, 92);
}

export function mainkanTikTimer(): void {
  if (!suaraAktifGlobal) return;
  mainkanNada(880, 0.06, 'sine', 0.12, 0);
}

export function mainkanPeluitMulai(): void {
  if (!suaraAktifGlobal) return;
  peluit({ mulai: 0, durasi: 0.24 });
}

export function mainkanSorakMenang(): void {
  if (!suaraAktifGlobal) return;
  if (Date.now() < jedaAntiGandaSorakSampaiMs) return;
  // Fanfare kemenangan C5 - E5 - G5 - C6
  mainkanNada(523.25, 0.16, 'triangle', 0.26, 0);
  mainkanNada(659.25, 0.16, 'triangle', 0.26, 0.11);
  mainkanNada(783.99, 0.16, 'triangle', 0.26, 0.22);
  mainkanNada(1046.5, 0.45, 'triangle', 0.32, 0.33);
  mainkanNada(783.99, 0.45, 'sine', 0.18, 0.33);
}

export function mainkanTawaKarakter(): void {
  if (!suaraAktifGlobal) return;
  mainkanNada(440, 0.09, 'sine', 0.18, 0, 620);
  mainkanNada(520, 0.1, 'sine', 0.18, 0.09, 760);
}

// Pola nada musik latar arcade ceria sederhana (tanpa file eksternal)
const MELODI_LATAR = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 783.99];
const BASS_LATAR = [130.81, 130.81, 164.81, 164.81, 146.83, 146.83, 196.0, 196.0];

function mulaiMusikLatar(): void {
  if (timerMusikId !== null || typeof window === 'undefined') return;
  const ctx = ambilKonteksAudio();
  if (!ctx) return;

  timerMusikId = window.setInterval(() => {
    if (!musikAktifGlobal || musikSedangJeda || !sudahInteraksiPengguna) return;
    const idx = langkahMusik % MELODI_LATAR.length;
    langkahMusik += 1;
    mainkanNada(MELODI_LATAR[idx], 0.24, 'sine', 0.065, 0, undefined, 'musik');
    mainkanNada(BASS_LATAR[idx], 0.28, 'triangle', 0.075, 0, undefined, 'musik');
  }, 360);
}

export function hentikanMusikLatar(): void {
  if (timerMusikId !== null && typeof window !== 'undefined') {
    window.clearInterval(timerMusikId);
    timerMusikId = null;
  }
}

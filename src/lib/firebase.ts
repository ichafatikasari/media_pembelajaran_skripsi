import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { doc, Firestore, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

export interface GuruProfil {
  uid: string;
  nama: string;
  fotoUrl: string | null;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
    }[];
  };
}

interface RawFirebaseConfig {
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

const configMentah = firebaseConfigJson as RawFirebaseConfig;

export const firebaseTersedia: boolean = Boolean(
  configMentah &&
    typeof configMentah.apiKey === 'string' &&
    configMentah.apiKey.trim().length > 0 &&
    typeof configMentah.projectId === 'string' &&
    configMentah.projectId.trim().length > 0 &&
    typeof configMentah.appId === 'string' &&
    configMentah.appId.trim().length > 0
);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

if (firebaseTersedia) {
  try {
    appInstance =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            apiKey: configMentah.apiKey,
            authDomain: configMentah.authDomain,
            projectId: configMentah.projectId,
            storageBucket: configMentah.storageBucket,
            messagingSenderId: configMentah.messagingSenderId,
            appId: configMentah.appId,
          });

    authInstance = getAuth(appInstance);
    const databaseId = configMentah.firestoreDatabaseId?.trim();
    dbInstance = databaseId ? getFirestore(appInstance, databaseId) : getFirestore(appInstance);

    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
  } catch {
    appInstance = null;
    authInstance = null;
    dbInstance = null;
    googleProviderInstance = null;
  }
}

export const firebaseApp = appInstance;
export const firebaseAuth = authInstance;
export const firestoreDb = dbInstance;

export function apakahPerangkatOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function apakahLayananOnlineSiap(): boolean {
  return Boolean(firebaseTersedia && firestoreDb && firebaseAuth && apakahPerangkatOnline());
}

export function konversiUserKeProfil(user: User | null): GuruProfil | null {
  if (!user) return null;
  // Hanya simpan uid, nama tampilan, dan URL foto profil — JANGAN pernah simpan email.
  return {
    uid: user.uid,
    nama: (user.displayName ?? '').trim() || 'Guru',
    fotoUrl: user.photoURL ?? null,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid ?? null,
      emailVerified: authInstance?.currentUser?.emailVerified ?? null,
      isAnonymous: authInstance?.currentUser?.isAnonymous ?? null,
      tenantId: authInstance?.currentUser?.tenantId ?? null,
      providerInfo:
        authInstance?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
        })) || [],
    },
    operationType,
    path,
  };
  throw new Error(JSON.stringify(errInfo));
}

export function ambilKodeErrorFirebase(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  if (error instanceof Error) {
    const msg = error.message;
    try {
      const parsed = JSON.parse(msg) as Partial<FirestoreErrorInfo>;
      if (typeof parsed.error === 'string') {
        if (parsed.error.includes('permission-denied') || parsed.error.includes('Missing or insufficient permissions')) {
          return 'permission-denied';
        }
        if (parsed.error.includes('resource-exhausted')) {
          return 'resource-exhausted';
        }
        if (parsed.error.includes('unavailable') || parsed.error.includes('offline')) {
          return 'unavailable';
        }
      }
    } catch {
      // bukan JSON FirestoreErrorInfo
    }
    if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
      return 'permission-denied';
    }
    if (msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
      return 'resource-exhausted';
    }
    if (msg.includes('the client is offline') || msg.includes('unavailable') || msg.includes('Failed to get document because the client is offline')) {
      return 'unavailable';
    }
  }
  return '';
}

export function terjemahkanErrorFirebase(
  error: unknown,
  konteks: 'umum' | 'login' | 'terbit' | 'buka' | 'kelola' = 'umum'
): string {
  if (!firebaseTersedia || !firestoreDb || !firebaseAuth || !apakahPerangkatOnline()) {
    return 'Fitur online belum tersedia, gunakan paket berkas.';
  }

  const code = ambilKodeErrorFirebase(error);

  if (code === 'resource-exhausted') {
    return 'Layanan sedang penuh, coba lagi nanti atau gunakan paket berkas.';
  }
  if (code === 'unavailable' || code === 'auth/network-request-failed') {
    return 'Fitur online belum tersedia, gunakan paket berkas.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Masuk Google dibatalkan sebelum selesai.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain aplikasi belum terdaftar di Authorized Domains Firebase Auth. Tambahkan domain ini di Firebase Console atau gunakan paket berkas.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Login Google belum diaktifkan di Firebase Console.';
  }
  if (code === 'permission-denied') {
    if (konteks === 'buka') {
      return 'Game online ini sudah kedaluwarsa atau aksesnya ditutup.';
    }
    if (konteks === 'terbit' || konteks === 'kelola') {
      return 'Akses ditolak. Pastikan Anda masuk dengan akun Google pemilik game dan masa berlaku maksimal 90 hari.';
    }
    return 'Akses ke data online ditolak atau sudah kedaluwarsa.';
  }
  if (code === 'not-found') {
    return 'Kode game online tidak ditemukan atau sudah dihapus.';
  }

  if (konteks === 'login') {
    return 'Gagal masuk dengan Google. Periksa koneksi internet atau gunakan fitur offline & paket berkas.';
  }
  if (konteks === 'buka') {
    return 'Gagal memuat game online. Periksa koneksi atau minta guru mengirim paket berkas (.json).';
  }
  return 'Layanan online sedang mengalami kendala. Gunakan paket berkas (.json) atau link data offline.';
}

let sudahUjiKoneksiBoot = false;

export async function ujiKoneksiFirestore(): Promise<{ ok: boolean; pesan?: string }> {
  if (!firebaseTersedia || !firestoreDb) {
    return { ok: false, pesan: 'Fitur online belum tersedia, gunakan paket berkas.' };
  }
  if (!apakahPerangkatOnline()) {
    return { ok: false, pesan: 'Fitur online belum tersedia, gunakan paket berkas.' };
  }
  if (sudahUjiKoneksiBoot) {
    return { ok: true };
  }
  sudahUjiKoneksiBoot = true;
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    return { ok: true };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (code === 'unavailable') {
      return { ok: false, pesan: 'Fitur online belum tersedia, gunakan paket berkas.' };
    }
    // permission-denied pada dokumen test/connection menandakan server Firestore aktif & terjangkau
    return { ok: true };
  }
}

export async function masukDenganGoogle(): Promise<
  | { ok: true; profil: GuruProfil }
  | { ok: false; redirectDimulai?: boolean; pesanError: string }
> {
  if (!firebaseTersedia || !firebaseAuth || !googleProviderInstance || !apakahPerangkatOnline()) {
    return {
      ok: false,
      pesanError: 'Fitur online belum tersedia, gunakan paket berkas.',
    };
  }

  try {
    const hasil = await signInWithPopup(firebaseAuth, googleProviderInstance);
    const profil = konversiUserKeProfil(hasil.user);
    if (!profil) {
      return { ok: false, pesanError: 'Gagal membaca profil guru setelah login.' };
    }
    return { ok: true, profil };
  } catch (error) {
    const code = ambilKodeErrorFirebase(error);
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        try {
          window.sessionStorage.setItem('duel_otak_menunggu_redirect_google', '1');
        } catch {
          // Abaikan jika sessionStorage diblokir
        }
        await signInWithRedirect(firebaseAuth, googleProviderInstance);
        return {
          ok: false,
          redirectDimulai: true,
          pesanError: 'Mengalihkan ke halaman masuk Google...',
        };
      } catch (errRedirect) {
        return {
          ok: false,
          pesanError: terjemahkanErrorFirebase(errRedirect, 'login'),
        };
      }
    }
    return {
      ok: false,
      pesanError: terjemahkanErrorFirebase(error, 'login'),
    };
  }
}

export async function cekHasilRedirectGoogle(): Promise<{
  profil: GuruProfil | null;
  pesanError?: string;
}> {
  if (!firebaseTersedia || !firebaseAuth || !apakahPerangkatOnline()) {
    return { profil: null };
  }
  let menungguRedirect = false;
  try {
    menungguRedirect =
      typeof window !== 'undefined' &&
      window.sessionStorage?.getItem('duel_otak_menunggu_redirect_google') === '1';
    if (menungguRedirect) {
      window.sessionStorage.removeItem('duel_otak_menunggu_redirect_google');
    }
  } catch {
    menungguRedirect = false;
  }
  if (!menungguRedirect) {
    return { profil: null };
  }
  try {
    const res = await getRedirectResult(firebaseAuth);
    return { profil: res ? konversiUserKeProfil(res.user) : null };
  } catch (error) {
    return {
      profil: null,
      pesanError: terjemahkanErrorFirebase(error, 'login'),
    };
  }
}

export async function keluarGoogle(): Promise<void> {
  if (!firebaseAuth) return;
  try {
    await signOut(firebaseAuth);
  } catch {
    // Abaikan jika sedang offline
  }
}

export function pantauStatusAuthGuru(
  callback: (profil: GuruProfil | null) => void
): () => void {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(
    firebaseAuth,
    (user) => {
      callback(konversiUserKeProfil(user));
    },
    () => {
      callback(null);
    }
  );
}

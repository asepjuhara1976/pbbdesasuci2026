import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, User, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { Taxpayer, PaymentLog } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Resolve configuration: priority to Environment Variables (VITE_*) for easy deployment (e.g. Vercel), fallback to the config file
const metaEnv = (import.meta as any).env || {};
const resolvedFirebaseConfig = {
  apiKey: (metaEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '').trim(),
  authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || '').trim(),
  projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || '').trim(),
  storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || '').trim(),
  messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || '').trim(),
  appId: (metaEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId || '').trim(),
  firestoreDatabaseId: (metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '').trim() || undefined
};

// Detect whether we have real Firebase credentials
export const isFirebaseConfigured = () => {
  return (
    resolvedFirebaseConfig &&
    resolvedFirebaseConfig.apiKey &&
    resolvedFirebaseConfig.apiKey !== 'PLACEHOOD_REPLACE_ME' &&
    resolvedFirebaseConfig.projectId !== ''
  );
};

let dbInstance: any = null;
let authInstance: any = null;
let useLocalFallback = true;

// Initialize Firebase if configured
if (isFirebaseConfigured()) {
  try {
    const app = getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApp();
    dbInstance = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId || undefined);
    authInstance = getAuth(app);
    useLocalFallback = false;
    
    // Validate connection to Firestore immediately upon load (as per Firebase Integration Skill rules)
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(dbInstance, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration or network status.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("Firebase init failed, switching to premium local storage simulation:", err);
    useLocalFallback = true;
  }
}

export const db = dbInstance;
export const auth = authInstance;

// Error Handling block as strictly requested by Firebase Integration Skill:
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
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = authInstance;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// PRE-POPULATED INITIAL DEMO DATA
// Based on standard GIS tax parcels mapping
// ==========================================
const initialTaxplayers: Taxpayer[] = [
  {
    id: "32.73.010.021.001-0015.0",
    name: "Ahmad Subarjo",
    address: "Jl. Diponegoro No. 12, Bandung",
    objectAddress: "Desa Suci RT 03/RW 04, Bandung (Persil 101)",
    landArea: 150,
    buildingArea: 90,
    njopLand: 3500000,
    njopBuilding: 2500000,
    totalTax: 750000, // calculated ketetapan
    isPaid: true,
    lat: -7.215512,
    lng: 107.923912,
    paymentDate: "2026-05-10",
    paymentMethod: "QRIS Dinamis",
    updatedAt: "2026-05-10T09:30:00Z"
  },
  {
    id: "32.73.010.021.001-0026.0",
    name: "Siti Rahmawati",
    address: "Jl. Dago Barat No. 8, Bandung",
    objectAddress: "Desa Suci RT 03/RW 04, Bandung (Persil 102)",
    landArea: 250,
    buildingArea: 180,
    njopLand: 4200000,
    njopBuilding: 3000000,
    totalTax: 1590000,
    isPaid: false,
    lat: -7.216212,
    lng: 107.924812,
    updatedAt: "2026-06-01T14:20:00Z"
  },
  {
    id: "32.73.010.021.001-0038.0",
    name: "Budi Santoso",
    address: "Jl. Ir. H. Djuanda No. 110, Bandung",
    objectAddress: "Desa Suci RT 04/RW 04, Bandung (Persil 103)",
    landArea: 320,
    buildingArea: 200,
    njopLand: 5000000,
    njopBuilding: 3200000,
    totalTax: 2240000,
    isPaid: true,
    lat: -7.214812,
    lng: 107.925512,
    paymentDate: "2026-06-03",
    paymentMethod: "BCA Virtual Account",
    updatedAt: "2026-06-03T11:15:00Z"
  },
  {
    id: "32.73.010.021.001-0042.0",
    name: "Diana Lestari",
    address: "Jl. Ganeca No. 10, Bandung",
    objectAddress: "Desa Suci RT 01/RW 04, Bandung (Persil 104)",
    landArea: 180,
    buildingArea: 110,
    njopLand: 3800000,
    njopBuilding: 2800000,
    totalTax: 992000,
    isPaid: false,
    lat: -7.216812,
    lng: 107.922812,
    updatedAt: "2026-06-10T08:00:00Z"
  },
  {
    id: "32.73.010.021.001-0051.0",
    name: "Hendra Wijaya",
    address: "Jl. Plesiran No. 4, Bandung",
    objectAddress: "Desa Suci RT 02/RW 04, Bandung (Persil 105)",
    landArea: 120,
    buildingArea: 70,
    njopLand: 3000000,
    njopBuilding: 2200000,
    totalTax: 514000,
    isPaid: false,
    lat: -7.217512,
    lng: 107.923412,
    updatedAt: "2026-06-11T10:00:00Z"
  }
];

const initialPaymentLogs: PaymentLog[] = [
  {
    id: "PAY-9871A2",
    nop: "32.73.010.021.001-0015.0",
    taxpayerName: "Ahmad Subarjo",
    amount: 750000,
    method: "QRIS Dinamis",
    timestamp: "2026-05-10T09:30:00Z"
  },
  {
    id: "PAY-9932B7",
    nop: "32.73.010.021.001-0038.0",
    taxpayerName: "Budi Santoso",
    amount: 2240000,
    method: "BCA Virtual Account",
    timestamp: "2026-06-03T11:15:00Z"
  }
];

// Seed initial localStorage items if blank
if (!localStorage.getItem('pbb_taxpayers')) {
  localStorage.setItem('pbb_taxpayers', JSON.stringify(initialTaxplayers));
}
if (!localStorage.getItem('pbb_payment_logs')) {
  localStorage.setItem('pbb_payment_logs', JSON.stringify(initialPaymentLogs));
}

// ==========================================
// REAL-TIME FIRESTORE AND LOCAL Fallback CRUD APIs
// ==========================================

export const syncTaxpayers = (callback: (data: Taxpayer[]) => void): (() => void) => {
  if (!useLocalFallback && dbInstance) {
    const colRef = collection(dbInstance, 'taxpayers');
    return onSnapshot(colRef, (snapshot) => {
      const data: Taxpayer[] = [];
      snapshot.forEach((docSnap) => {
        data.push(docSnap.data() as Taxpayer);
      });
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'taxpayers');
    });
  } else {
    // Local storage event listener for real-time simulating across component tabs
    const handleStorageChange = () => {
      const storageData = localStorage.getItem('pbb_taxpayers');
      if (storageData) {
        callback(JSON.parse(storageData));
      }
    };
    handleStorageChange(); // immediate initial callback
    window.addEventListener('storage', handleStorageChange);
    
    // Polling simulation to simulate reactive storage checks
    const intervalId = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }
};

export const syncPaymentLogs = (callback: (data: PaymentLog[]) => void): (() => void) => {
  if (!useLocalFallback && dbInstance) {
    const colRef = query(collection(dbInstance, 'payment_logs'), orderBy('timestamp', 'desc'));
    return onSnapshot(colRef, (snapshot) => {
      const data: PaymentLog[] = [];
      snapshot.forEach((docSnap) => {
        data.push(docSnap.data() as PaymentLog);
      });
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'payment_logs');
    });
  } else {
    const handleStorageChange = () => {
      const storageData = localStorage.getItem('pbb_payment_logs');
      if (storageData) {
        callback(JSON.parse(storageData));
      }
    };
    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    const intervalId = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }
};

// Sanitization helper to filter out any "undefined" keys, since modern Firestore setDoc/addDoc does not support undefined values
const cleanUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
};

export const saveTaxpayer = async (taxpayer: Taxpayer) => {
  if (!useLocalFallback && dbInstance) {
    try {
      const docRef = doc(dbInstance, 'taxpayers', taxpayer.id);
      await setDoc(docRef, cleanUndefined(taxpayer));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `taxpayers/${taxpayer.id}`);
    }
  } else {
    const storageData = localStorage.getItem('pbb_taxpayers');
    const taxpayers: Taxpayer[] = storageData ? JSON.parse(storageData) : [];
    const index = taxpayers.findIndex((t) => t.id === taxpayer.id);
    if (index >= 0) {
      taxpayers[index] = taxpayer;
    } else {
      taxpayers.push(taxpayer);
    }
    localStorage.setItem('pbb_taxpayers', JSON.stringify(taxpayers));
    // Trigger custom event for same-window updates
    window.dispatchEvent(new Event('storage'));
  }
};

export const deleteTaxpayer = async (id: string) => {
  if (!useLocalFallback && dbInstance) {
    try {
      const docRef = doc(dbInstance, 'taxpayers', id);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `taxpayers/${id}`);
    }
  } else {
    const storageData = localStorage.getItem('pbb_taxpayers');
    if (storageData) {
      const taxpayers: Taxpayer[] = JSON.parse(storageData);
      const filtered = taxpayers.filter((t) => t.id !== id);
      localStorage.setItem('pbb_taxpayers', JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage'));
    }
  }
};

export const addPaymentLog = async (log: PaymentLog) => {
  if (!useLocalFallback && dbInstance) {
    try {
      const docRef = doc(dbInstance, 'payment_logs', log.id);
      await setDoc(docRef, cleanUndefined(log));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `payment_logs/${log.id}`);
    }
  } else {
    const storageData = localStorage.getItem('pbb_payment_logs');
    const logs: PaymentLog[] = storageData ? JSON.parse(storageData) : [];
    logs.unshift(log); // prepend recent logs
    localStorage.setItem('pbb_payment_logs', JSON.stringify(logs));
    window.dispatchEvent(new Event('storage'));
  }
};

// ==========================================
// SIMULATED AUTH FOR MOBILE EMULATOR
// Provides seamless login/logout for Demo Mode
// ==========================================
export interface PetugasUser {
  uid: string;
  name: string;
  email: string;
  role: 'Petugas' | 'Admin';
}

export const signInDemoPetugas = (): PetugasUser => {
  const mockUser: PetugasUser = {
    uid: "petugas-007",
    name: "Ir. Doni Hermawan",
    email: "doni.hermawan@pemkot.go.id",
    role: "Petugas"
  };
  localStorage.setItem('pbb_logged_in_user', JSON.stringify(mockUser));
  window.dispatchEvent(new Event('auth_updated'));
  return mockUser;
};

export const logoutDemoPetugas = () => {
  localStorage.removeItem('pbb_logged_in_user');
  window.dispatchEvent(new Event('auth_updated'));
};

export const getLoggedInPetugas = (): PetugasUser | null => {
  const user = localStorage.getItem('pbb_logged_in_user');
  return user ? JSON.parse(user) : null;
};

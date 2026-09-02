import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { Expense, ExpenseStatus, BotQuestion, AppSettings, AppUser, GoogleSheetsConfig, SyncLog, TelegramCommand, TelegramBotConfig } from '../types';
import { DEFAULT_BOT_QUESTIONS, DEFAULT_SETTINGS, INITIAL_USERS } from '../data/defaultQuestions';
import { DEFAULT_TELEGRAM_COMMANDS } from '../data/defaultTelegramCommands';
import { compressBase64Image } from './imageUtils';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with database ID if provided
const db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId || undefined);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { db };

// Fallback Local Storage Keys for offline resilience
const LOCAL_STORAGE_EXPENSES_KEY = 'swiss_expenses_db_v1';
const LOCAL_STORAGE_QUESTIONS_KEY = 'swiss_questions_db_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'swiss_settings_db_v1';
const LOCAL_STORAGE_SHEETS_CONFIG_KEY = 'swiss_sheets_config_v1';
const LOCAL_STORAGE_SYNC_LOGS_KEY = 'swiss_sync_logs_v1';
const LOCAL_STORAGE_USERS_KEY = 'swiss_users_db_v1';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  projectId: '',
  projectNumber: '',
  spreadsheetId: '',
  sheetName: 'Expenses',
  range: 'A:O',
  serviceAccountEmail: '',
  serviceAccountPrivateKey: '',
  encryptedPrivateKey: '',
  hasEncryptedPrivateKey: false,
  apiKey: '',
  connectionStatus: 'untested',
  totalSynced: 0
};

// Seed initial demo data in Firestore or local state if empty
export async function seedInitialDataIfNeeded() {
  try {
    const seedMarkerRef = doc(db, 'app_settings', 'system_seed_initialized');
    const seedMarkerSnap = await getDoc(seedMarkerRef);

    if (seedMarkerSnap.exists()) {
      // Seed has already been executed. Do NOT re-seed deleted items.
      return;
    }

    console.log('Performing one-time initial seed to Firestore...');

    // 1. Seed Users if needed
    const usersSnap = await getDocs(collection(db, 'app_users'));
    if (usersSnap.empty) {
      console.log('Seeding initial app users to Firestore...');
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'app_users', u.uid), u);
      }
    }

    // 2. Seed Questions if needed
    const qSnap = await getDocs(collection(db, 'bot_questions'));
    if (qSnap.empty) {
      console.log('Seeding initial bot questions to Firestore...');
      for (const q of DEFAULT_BOT_QUESTIONS) {
        await setDoc(doc(db, 'bot_questions', q.id), q);
      }
    }

    const settingsDoc = await getDoc(doc(db, 'app_settings', 'global'));
    if (!settingsDoc.exists()) {
      console.log('Seeding initial app settings to Firestore...');
      await setDoc(doc(db, 'app_settings', 'global'), DEFAULT_SETTINGS);
    }

    const sheetsConfigDoc = await getDoc(doc(db, 'app_settings', 'google_sheets_config'));
    if (!sheetsConfigDoc.exists()) {
      console.log('Seeding initial Google Sheets config...');
      await setDoc(doc(db, 'app_settings', 'google_sheets_config'), DEFAULT_SHEETS_CONFIG);
    }

    const tgCommandsSnap = await getDocs(collection(db, 'telegram_commands'));
    if (tgCommandsSnap.empty) {
      console.log('Seeding initial Telegram commands to Firestore...');
      for (let i = 0; i < DEFAULT_TELEGRAM_COMMANDS.length; i++) {
        const cmd = { ...DEFAULT_TELEGRAM_COMMANDS[i], order: i + 1, updatedAt: new Date().toISOString() };
        await setDoc(doc(db, 'telegram_commands', cmd.id), cmd);
      }
    }

    const expSnap = await getDocs(collection(db, 'expenses'));
    if (expSnap.empty) {
      console.log('Seeding sample initial expenses to Firestore...');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const d1 = new Date(now.getTime() - 86400000 * 1).toISOString().split('T')[0];
      const d2 = new Date(now.getTime() - 86400000 * 3).toISOString().split('T')[0];
      const d3 = new Date(now.getTime() - 86400000 * 5).toISOString().split('T')[0];
      const d4 = new Date(now.getTime() - 86400000 * 12).toISOString().split('T')[0];
      const d5 = new Date(now.getTime() - 86400000 * 20).toISOString().split('T')[0];
      const d6 = new Date(now.getTime() - 86400000 * 45).toISOString().split('T')[0];

      const sampleExpenses: Expense[] = [
        {
          id: 'EXP-8021',
          userId: 'emp-101',
          userName: 'Tariq Al-Mansoor',
          userEmail: 'tariq.mansoor@alfalak.sa',
          employeeId: 'KSA-4021',
          department: 'Sales & Field Operations (Riyadh)',
          amount: 280.00,
          currency: 'SAR',
          category: 'Travel & Transport',
          description: 'Client Visit Taxi Fare & Fuel across Riyadh North Business Center',
          totalAmount: 280.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Cash',
          project: 'Riyadh Metro Expansion Client Meet',
          approvedBy: 'Faisal Al-Otaibi',
          date: todayStr,
          status: 'pending',
          submittedVia: 'web_chat',
          syncedToGoogleSheets: false,
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          id: 'EXP-8020',
          userId: 'emp-101',
          userName: 'Tariq Al-Mansoor',
          userEmail: 'tariq.mansoor@alfalak.sa',
          employeeId: 'KSA-4021',
          department: 'Sales & Field Operations (Riyadh)',
          amount: 450.00,
          currency: 'SAR',
          category: 'Food & Entertainment',
          description: 'Official Business Lunch with Aramco Procurement Delegation',
          totalAmount: 450.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Bank Transfer',
          project: 'Aramco Vendor Onboarding',
          approvedBy: 'Faisal Al-Otaibi',
          approverNotes: 'Verified with official receipt.',
          approvedAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
          date: d1,
          status: 'approved',
          submittedVia: 'telegram_bot',
          syncedToGoogleSheets: true,
          syncStatus: 'synced',
          createdAt: new Date(now.getTime() - 86400000 * 2).toISOString()
        },
        {
          id: 'EXP-8019',
          userId: 'emp-101',
          userName: 'Tariq Al-Mansoor',
          userEmail: 'tariq.mansoor@alfalak.sa',
          employeeId: 'KSA-4021',
          department: 'Sales & Field Operations (Riyadh)',
          amount: 150.00,
          currency: 'SAR',
          category: 'Office Supplies',
          description: 'Proposal presentation color prints & binding for Ministry tender',
          totalAmount: 150.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Cash',
          project: 'Ministry of Transport Tender',
          approvedBy: 'Faisal Al-Otaibi',
          approverNotes: 'Approved for urgent tender submission.',
          approvedAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
          date: d2,
          status: 'approved',
          submittedVia: 'web_chat',
          syncedToGoogleSheets: true,
          syncStatus: 'synced',
          createdAt: new Date(now.getTime() - 86400000 * 5).toISOString()
        },
        {
          id: 'EXP-8018',
          userId: 'emp-102',
          userName: 'Mohammad Al-Harbi',
          userEmail: 'mohammad.harbi@alfalak.sa',
          employeeId: 'KSA-4022',
          department: 'Logistics & Supply Chain',
          amount: 620.00,
          currency: 'SAR',
          category: 'Fuel & Vehicle',
          description: 'Warehouse delivery truck diesel fuel & Jeddah highway toll tax',
          totalAmount: 620.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Cash',
          project: 'Jeddah Port Distribution',
          approvedBy: 'Faisal Al-Otaibi',
          date: d3,
          status: 'approved',
          submittedVia: 'telegram_bot',
          syncedToGoogleSheets: true,
          syncStatus: 'synced',
          createdAt: new Date(now.getTime() - 86400000 * 5).toISOString()
        },
        {
          id: 'EXP-8017',
          userId: 'emp-103',
          userName: 'Ahmed Al-Ghamdi',
          userEmail: 'ahmed.ghamdi@alfalak.sa',
          employeeId: 'KSA-4023',
          department: 'Site Engineering & Projects',
          amount: 1250.00,
          currency: 'SAR',
          category: 'Site Equipment',
          description: 'Emergency safety helmets, reflective jackets & laser level meters',
          totalAmount: 1250.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Bank Transfer',
          project: 'Diriyah Heritage Site Construction',
          approvedBy: 'Faisal Al-Otaibi',
          date: d4,
          status: 'approved',
          submittedVia: 'web_chat',
          syncedToGoogleSheets: true,
          syncStatus: 'synced',
          createdAt: new Date(now.getTime() - 86400000 * 12).toISOString()
        },
        {
          id: 'EXP-8016',
          userId: 'emp-104',
          userName: 'Sara Al-Shehri',
          userEmail: 'sara.shehri@alfalak.sa',
          employeeId: 'KSA-4024',
          department: 'Marketing & Client Relations',
          amount: 890.00,
          currency: 'SAR',
          category: 'Advertising & Promotion',
          description: 'Digital promotional booth roll-ups and Riyadh Expo brochures',
          totalAmount: 890.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Bank Transfer',
          project: 'Riyadh Tech Expo 2026',
          approvedBy: 'Faisal Al-Otaibi',
          date: d5,
          status: 'approved',
          submittedVia: 'web_chat',
          syncedToGoogleSheets: true,
          syncStatus: 'synced',
          createdAt: new Date(now.getTime() - 86400000 * 20).toISOString()
        },
        {
          id: 'EXP-8015',
          userId: 'emp-101',
          userName: 'Tariq Al-Mansoor',
          userEmail: 'tariq.mansoor@alfalak.sa',
          employeeId: 'KSA-4021',
          department: 'Sales & Field Operations (Riyadh)',
          amount: 1100.00,
          currency: 'SAR',
          category: 'Hotel & Accommodation',
          description: '3-Day Dammam Regional Branch Sales Summit Hotel stay',
          totalAmount: 1100.00,
          vatStatus: 'With VAT',
          paymentMethod: 'Bank Transfer',
          project: 'Eastern Province Expansion',
          approvedBy: 'Faisal Al-Otaibi',
          date: d6,
          status: 'approved',
          submittedVia: 'web_chat',
          syncedToGoogleSheets: true,
          syncStatus: 'synced',
          createdAt: new Date(now.getTime() - 86400000 * 45).toISOString()
        }
      ];

      for (const e of sampleExpenses) {
        await setDoc(doc(db, 'expenses', e.id), e);
      }
    }

    // Mark seed initialized so future refreshes will never re-create deleted items
    await setDoc(seedMarkerRef, { initialized: true, seededAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Firestore seed warning (offline/permission fallback enabled):', err);
  }
}

// Subscribe to Expenses Real-time
export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  try {
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items: Expense[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Expense);
      });
      callback(items);
      localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(items));
    }, (error) => {
      console.warn('Firestore subscription error, using local storage fallback:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
      if (cached) callback(JSON.parse(cached));
    });
  } catch (err) {
    console.warn('Firestore init error, fallback to cache:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    if (cached) callback(JSON.parse(cached));
    return () => {};
  }
}

// Add Expense to Firestore (with automatic payload compression & safe size limits)
export async function saveExpenseToFirestore(expense: Expense): Promise<boolean> {
  const expenseToSave: Expense = { ...expense };

  // If receiptUrl is a large base64 image, compress it to avoid exceeding Firestore 1MB document limit
  if (expenseToSave.receiptUrl && expenseToSave.receiptUrl.startsWith('data:image')) {
    try {
      expenseToSave.receiptUrl = await compressBase64Image(expenseToSave.receiptUrl, 800, 800, 0.7);
      // Extra safety check: if still above 350KB, compress further
      if (expenseToSave.receiptUrl.length > 450000) {
        expenseToSave.receiptUrl = await compressBase64Image(expenseToSave.receiptUrl, 600, 600, 0.5);
      }
    } catch (compErr) {
      console.warn('Receipt compression warning:', compErr);
    }
  }

  // Sanitize undefined fields which can cause Firestore issues
  const cleanPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(expenseToSave)) {
    if (v !== undefined) {
      cleanPayload[k] = v;
    }
  }

  try {
    await setDoc(doc(db, 'expenses', expenseToSave.id), cleanPayload);
    // Also update local cache
    const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    const list: Expense[] = cached ? JSON.parse(cached) : [];
    const updated = [expenseToSave, ...list.filter(x => x.id !== expenseToSave.id)];
    localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `expenses/${expenseToSave.id}`);
    const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    const list: Expense[] = cached ? JSON.parse(cached) : [];
    const updated = [expenseToSave, ...list.filter(x => x.id !== expenseToSave.id)];
    localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(updated));
    return false;
  }
}

// Update Expense Step Approval (1: Abdulaziz, 2: Bulbul Mashrequi, 3: Nurul Alam)
export async function updateExpenseStepInFirestore(
  expenseId: string,
  stepToApprove: 1 | 2 | 3,
  action: 'approve' | 'reject',
  approverName: string,
  notes: string = ''
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const ref = doc(db, 'expenses', expenseId);
    if (action === 'reject') {
      await updateDoc(ref, {
        status: 'rejected',
        approvedBy: approverName,
        approvedAt: now,
        approverNotes: notes,
        updatedAt: now
      });
      return true;
    }

    const updates: Record<string, any> = {
      updatedAt: now,
      approverNotes: notes
    };

    if (stepToApprove === 1) {
      updates.step1Approved = true;
      updates.step1ApprovedAt = now;
      updates.approvalStep = 1;
    } else if (stepToApprove === 2) {
      updates.step1Approved = true;
      updates.step2Approved = true;
      updates.step2ApprovedAt = now;
      updates.approvalStep = 2;
    } else if (stepToApprove === 3) {
      updates.step1Approved = true;
      updates.step2Approved = true;
      updates.step3Approved = true;
      updates.step3ApprovedAt = now;
      updates.approvalStep = 3;
      updates.status = 'approved';
      updates.approvedBy = 'Nurul Alam';
      updates.approvedAt = now;
    }

    await updateDoc(ref, updates);
    return true;
  } catch (err) {
    console.error('Error updating expense approval step in Firestore:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    if (cached) {
      const list: Expense[] = JSON.parse(cached);
      const updated = list.map((item) => {
        if (item.id === expenseId) {
          if (action === 'reject') {
            return {
              ...item,
              status: 'rejected' as ExpenseStatus,
              approvedBy: approverName,
              approvedAt: now,
              approverNotes: notes,
              updatedAt: now
            };
          }
          const isStep1 = stepToApprove === 1 || !!item.step1Approved;
          const isStep2 = stepToApprove === 2 || !!item.step2Approved;
          const isStep3 = stepToApprove === 3;
          return {
            ...item,
            step1Approved: isStep1,
            step2Approved: isStep2,
            step3Approved: isStep3,
            approvalStep: isStep3 ? 3 : isStep2 ? 2 : 1,
            status: isStep3 ? ('approved' as ExpenseStatus) : ('pending' as ExpenseStatus),
            approvedBy: isStep3 ? 'Nurul Alam' : item.approvedBy,
            approvedAt: isStep3 ? now : item.approvedAt,
            approverNotes: notes,
            updatedAt: now
          };
        }
        return item;
      });
      localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(updated));
    }
    return false;
  }
}

// Update Expense Status (Approve / Reject)
export async function updateExpenseStatusInFirestore(
  expenseId: string,
  status: ExpenseStatus,
  approverName: string,
  notes: string = ''
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const ref = doc(db, 'expenses', expenseId);
    const payload: Record<string, any> = {
      status,
      approvedBy: status === 'approved' ? 'Nurul Alam' : approverName,
      approvedAt: now,
      approverNotes: notes,
      updatedAt: now
    };
    if (status === 'approved') {
      payload.step1Approved = true;
      payload.step2Approved = true;
      payload.step3Approved = true;
      payload.approvalStep = 3;
    }
    await updateDoc(ref, payload);
    return true;
  } catch (err) {
    console.error('Error updating expense status in Firestore:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    if (cached) {
      const list: Expense[] = JSON.parse(cached);
      const updated = list.map(item => {
        if (item.id === expenseId) {
          return {
            ...item,
            status,
            approvedBy: status === 'approved' ? 'Nurul Alam' : approverName,
            approvedAt: now,
            approverNotes: notes,
            updatedAt: now,
            step1Approved: status === 'approved' ? true : item.step1Approved,
            step2Approved: status === 'approved' ? true : item.step2Approved,
            step3Approved: status === 'approved' ? true : item.step3Approved,
            approvalStep: status === 'approved' ? 3 : item.approvalStep
          };
        }
        return item;
      });
      localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(updated));
    }
    return false;
  }
}

// Update Expense Sync Status
export async function updateExpenseSyncStatusInFirestore(
  expenseId: string,
  syncStatus: 'synced' | 'pending' | 'failed',
  syncError?: string
): Promise<boolean> {
  try {
    const ref = doc(db, 'expenses', expenseId);
    await updateDoc(ref, {
      syncedToGoogleSheets: syncStatus === 'synced',
      syncStatus,
      lastSyncAt: new Date().toISOString(),
      syncError: syncError || ''
    });
    return true;
  } catch (err) {
    console.warn('Error updating expense sync status in Firestore:', err);
    return false;
  }
}

// Subscribe to Google Sheets Direct API Config Real-time
export function subscribeGoogleSheetsConfig(callback: (config: GoogleSheetsConfig) => void) {
  try {
    const ref = doc(db, 'app_settings', 'google_sheets_config');
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GoogleSheetsConfig;
        callback(data);
        localStorage.setItem(LOCAL_STORAGE_SHEETS_CONFIG_KEY, JSON.stringify(data));
      } else {
        callback(DEFAULT_SHEETS_CONFIG);
      }
    }, (error) => {
      console.warn('Google Sheets Config subscription error:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_SHEETS_CONFIG_KEY);
      callback(cached ? JSON.parse(cached) : DEFAULT_SHEETS_CONFIG);
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_SHEETS_CONFIG_KEY);
    callback(cached ? JSON.parse(cached) : DEFAULT_SHEETS_CONFIG);
    return () => {};
  }
}

// Save Google Sheets Direct API Config with Server-side Encryption
export async function saveGoogleSheetsConfigToFirestore(rawConfig: GoogleSheetsConfig): Promise<{ success: boolean; config: GoogleSheetsConfig; error?: string }> {
  try {
    const configToSave: GoogleSheetsConfig = { ...rawConfig };

    // If a plain text private key was entered, encrypt it via backend first with a safe timeout
    if (rawConfig.serviceAccountPrivateKey && rawConfig.serviceAccountPrivateKey.trim().length > 10) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const encRes = await fetch('/api/sheets/encrypt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privateKey: rawConfig.serviceAccountPrivateKey.trim() }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (encRes.ok) {
          const encData = await encRes.json();
          if (encData.success && encData.encryptedPrivateKey) {
            configToSave.encryptedPrivateKey = encData.encryptedPrivateKey;
            configToSave.hasEncryptedPrivateKey = true;
          }
        }
      } catch (encErr) {
        console.warn('Server encryption call warning:', encErr);
      }
    }

    // Never store plaintext private key in Firestore or local database
    delete (configToSave as any).serviceAccountPrivateKey;
    configToSave.updatedAt = new Date().toISOString();

    // Remove any undefined keys to prevent Firestore 'Unsupported field value: undefined' errors
    const sanitizedDoc: Record<string, any> = {};
    for (const [key, value] of Object.entries(configToSave)) {
      if (value !== undefined) {
        sanitizedDoc[key] = value;
      }
    }

    // Write to LocalStorage first for instant persistence
    localStorage.setItem(LOCAL_STORAGE_SHEETS_CONFIG_KEY, JSON.stringify(sanitizedDoc));

    // Write to Firestore with a safe race timeout so slow network/handshake never hangs the UI
    try {
      const fsWritePromise = setDoc(doc(db, 'app_settings', 'google_sheets_config'), sanitizedDoc);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      await Promise.race([fsWritePromise, timeoutPromise]);
    } catch (fsErr: any) {
      console.warn('Firestore write warning for sheets config:', fsErr);
    }

    return { success: true, config: sanitizedDoc as GoogleSheetsConfig };
  } catch (err: any) {
    console.error('Error saving Google Sheets configuration:', err);
    return { success: false, config: rawConfig, error: err.message };
  }
}

// Subscribe to Sync Logs Real-time
export function subscribeSyncLogs(callback: (logs: SyncLog[]) => void) {
  try {
    const q = query(collection(db, 'sync_logs'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs: SyncLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push(docSnap.data() as SyncLog);
      });
      callback(logs.slice(0, 50));
      localStorage.setItem(LOCAL_STORAGE_SYNC_LOGS_KEY, JSON.stringify(logs));
    }, (error) => {
      console.warn('Sync logs subscription fallback:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_SYNC_LOGS_KEY);
      if (cached) callback(JSON.parse(cached));
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_SYNC_LOGS_KEY);
    if (cached) callback(JSON.parse(cached));
    return () => {};
  }
}

// Add Sync Log Entry to Firestore
export async function addSyncLogToFirestore(log: Omit<SyncLog, 'id'>): Promise<void> {
  try {
    const logId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullLog: SyncLog = { id: logId, ...log };
    await setDoc(doc(db, 'sync_logs', logId), fullLog);
  } catch (err) {
    console.warn('Error recording sync log:', err);
  }
}

// Subscribe to Bot Questions Real-time
export function subscribeBotQuestions(callback: (questions: BotQuestion[]) => void) {
  try {
    const q = query(collection(db, 'bot_questions'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const items: BotQuestion[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as BotQuestion);
      });
      callback(items);
      localStorage.setItem(LOCAL_STORAGE_QUESTIONS_KEY, JSON.stringify(items));
    }, (error) => {
      console.warn('Bot questions subscription error:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_QUESTIONS_KEY);
      if (cached) {
        callback(JSON.parse(cached));
      } else {
        callback(DEFAULT_BOT_QUESTIONS);
      }
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_QUESTIONS_KEY);
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback(DEFAULT_BOT_QUESTIONS);
    }
    return () => {};
  }
}

// Save Bot Questions List
export async function saveBotQuestionsToFirestore(questions: BotQuestion[]): Promise<boolean> {
  try {
    const existingSnap = await getDocs(collection(db, 'bot_questions'));
    const currentIds = new Set(questions.map((q) => q.id));

    // Delete questions that were removed
    for (const docSnap of existingSnap.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'bot_questions', docSnap.id));
      }
    }

    // Set updated questions
    for (const q of questions) {
      await setDoc(doc(db, 'bot_questions', q.id), q);
    }
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
    return true;
  } catch (err) {
    console.error('Error saving bot questions:', err);
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
    return false;
  }
}

// Subscribe to App Settings Real-time
export function subscribeAppSettings(callback: (settings: AppSettings) => void) {
  try {
    const ref = doc(db, 'app_settings', 'global');
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        callback(data);
        localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(data));
      } else {
        callback(DEFAULT_SETTINGS);
      }
    }, (error) => {
      console.warn('Settings subscription error:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      callback(cached ? JSON.parse(cached) : DEFAULT_SETTINGS);
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    callback(cached ? JSON.parse(cached) : DEFAULT_SETTINGS);
    return () => {};
  }
}

// Save App Settings
export async function saveAppSettingsToFirestore(settings: AppSettings): Promise<boolean> {
  try {
    await setDoc(doc(db, 'app_settings', 'global'), settings);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.error('Error saving settings:', err);
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    return false;
  }
}

// ---------------- TELEGRAM BOT COMMANDS & SETTINGS ----------------

export const LOCAL_STORAGE_TELEGRAM_COMMANDS_KEY = 'expensegrid_tg_commands_cache';
export const LOCAL_STORAGE_TELEGRAM_CONFIG_KEY = 'expensegrid_tg_config_cache';

export const DEFAULT_TELEGRAM_CONFIG: TelegramBotConfig = {
  botToken: '',
  botUsername: '',
  webhookUrl: typeof window !== 'undefined' ? `${window.location.origin}/api/telegram/webhook` : '',
  secretToken: '',
  autoSyncExpenses: true,
  notifyApproverOnNewExpense: false,
  connectionStatus: 'untested'
};

// Subscribe to Telegram Commands Real-time
export function subscribeTelegramCommands(callback: (commands: TelegramCommand[]) => void) {
  try {
    const q = query(collection(db, 'telegram_commands'), orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const items: TelegramCommand[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as TelegramCommand);
      });
      callback(items);
      localStorage.setItem(LOCAL_STORAGE_TELEGRAM_COMMANDS_KEY, JSON.stringify(items));
    }, (error) => {
      console.warn('Telegram commands subscription error:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_TELEGRAM_COMMANDS_KEY);
      if (cached) {
        callback(JSON.parse(cached));
      } else {
        callback(DEFAULT_TELEGRAM_COMMANDS);
      }
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_TELEGRAM_COMMANDS_KEY);
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback(DEFAULT_TELEGRAM_COMMANDS);
    }
    return () => {};
  }
}

// Save Telegram Commands List
export async function saveTelegramCommandsToFirestore(commands: TelegramCommand[]): Promise<boolean> {
  try {
    const existingSnap = await getDocs(collection(db, 'telegram_commands'));
    const currentIds = new Set(commands.map((c) => c.id));

    // Delete commands that were removed
    for (const docSnap of existingSnap.docs) {
      if (!currentIds.has(docSnap.id)) {
        await deleteDoc(doc(db, 'telegram_commands', docSnap.id));
      }
    }

    // Set updated commands
    for (let i = 0; i < commands.length; i++) {
      const cmd = { ...commands[i], order: i + 1, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'telegram_commands', cmd.id), cmd);
    }
    localStorage.setItem(LOCAL_STORAGE_TELEGRAM_COMMANDS_KEY, JSON.stringify(commands));
    return true;
  } catch (err) {
    console.error('Error saving Telegram commands:', err);
    localStorage.setItem(LOCAL_STORAGE_TELEGRAM_COMMANDS_KEY, JSON.stringify(commands));
    return false;
  }
}

// Subscribe to Telegram Bot Config
export function subscribeTelegramBotConfig(callback: (config: TelegramBotConfig) => void) {
  try {
    const ref = doc(db, 'app_settings', 'telegram_bot');
    return onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as TelegramBotConfig;
        callback(data);
        localStorage.setItem(LOCAL_STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(data));
      } else {
        callback(DEFAULT_TELEGRAM_CONFIG);
      }
    }, (error) => {
      console.warn('Telegram Bot Config subscription error:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_TELEGRAM_CONFIG_KEY);
      callback(cached ? JSON.parse(cached) : DEFAULT_TELEGRAM_CONFIG);
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_TELEGRAM_CONFIG_KEY);
    callback(cached ? JSON.parse(cached) : DEFAULT_TELEGRAM_CONFIG);
    return () => {};
  }
}

// Save Telegram Bot Config
export async function saveTelegramBotConfigToFirestore(config: TelegramBotConfig): Promise<boolean> {
  try {
    const configToSave = { ...config, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'app_settings', 'telegram_bot'), configToSave);
    localStorage.setItem(LOCAL_STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(configToSave));
    return true;
  } catch (err) {
    console.error('Error saving Telegram bot config:', err);
    localStorage.setItem(LOCAL_STORAGE_TELEGRAM_CONFIG_KEY, JSON.stringify(config));
    return false;
  }
}

// ---------------- USER / EMPLOYEE MANAGEMENT ----------------

// Subscribe to App Users Real-time
export function subscribeUsers(callback: (users: AppUser[]) => void) {
  try {
    const q = query(collection(db, 'app_users'), orderBy('displayName', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const items: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as AppUser);
      });
      callback(items);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(items));
    }, (error) => {
      console.warn('Users subscription error:', error);
      const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (cached) {
        callback(JSON.parse(cached));
      } else {
        callback(INITIAL_USERS);
      }
    });
  } catch (err) {
    const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback(INITIAL_USERS);
    }
    return () => {};
  }
}

// Save or Update App User / Employee
export async function saveUserToFirestore(user: AppUser): Promise<boolean> {
  try {
    await setDoc(doc(db, 'app_users', user.uid), user);
    const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    const list: AppUser[] = cached ? JSON.parse(cached) : INITIAL_USERS;
    const updated = [...list.filter((u) => u.uid !== user.uid), user];
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
    const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    const list: AppUser[] = cached ? JSON.parse(cached) : INITIAL_USERS;
    const updated = [...list.filter((u) => u.uid !== user.uid), user];
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
    return false;
  }
}

// Delete App User
export async function deleteUserFromFirestore(userId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'app_users', userId));
    const cached = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
    if (cached) {
      const list: AppUser[] = JSON.parse(cached);
      const updated = list.filter((u) => u.uid !== userId);
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(updated));
    }
    return true;
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
    return false;
  }
}

// Delete Expense from Firestore
export async function deleteExpenseFromFirestore(expenseId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    const cached = localStorage.getItem(LOCAL_STORAGE_EXPENSES_KEY);
    if (cached) {
      const list: Expense[] = JSON.parse(cached);
      const updated = list.filter((e) => e.id !== expenseId);
      localStorage.setItem(LOCAL_STORAGE_EXPENSES_KEY, JSON.stringify(updated));
    }
    return true;
  } catch (err) {
    console.error('Error deleting expense from Firestore:', err);
    return false;
  }
}




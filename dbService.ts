import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ProcessedStudyMaterial } from './geminiService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // Simplified for brevity in this helper
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveMaterial = async (userId: string, fileName: string, fileType: string, result: ProcessedStudyMaterial, originalUrl?: string) => {
  const path = 'materials';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      fileName,
      fileType,
      originalUrl: originalUrl || null,
      status: 'completed',
      createdAt: serverTimestamp(),
      ...result
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserMaterials = async (userId: string) => {
  const path = 'materials';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getMaterialById = async (id: string) => {
  const path = `materials/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'materials', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const deleteMaterial = async (id: string) => {
  const path = `materials/${id}`;
  console.log("Firestore: Deleting document at path:", path);
  try {
    await deleteDoc(doc(db, 'materials', id));
    console.log("Firestore: Successfully deleted document:", id);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

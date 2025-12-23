import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc
} from "firebase/firestore";

const COLLECTION = "emigrants"; // your data collection name

// Load all data from Firestore
export const fetchAllRecords = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Add new record
export const addRecord = async (data) => {
  await addDoc(collection(db, COLLECTION), data);
};

// Update record
export const updateRecord = async (id, newData) => {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, newData);
};

// Delete a record
export const deleteRecord = async (id) => {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
};

// Used for bulk CSV import
export const overwriteCollection = async (rows) => {
  for (const row of rows) {
    await addDoc(collection(db, COLLECTION), row);
  }
};
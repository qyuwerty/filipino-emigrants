import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query
} from "firebase/firestore";

const COLLECTION = "emigrants"; // your data collection name

// Function to sanitize field names for Firebase
export const sanitizeFieldName = (fieldName) => {
  // Replace characters not allowed in Firebase field paths
  return fieldName.replace(/[~*/[\]]/g, '_');
};

// Function to prepare data for Firebase (sanitize field names and convert values)
export const prepareDataForFirebase = (data) => {
  const preparedData = {};
  Object.keys(data).forEach(key => {
    const sanitizedKey = sanitizeFieldName(key);
    let value = data[key];
    
    // Convert string numbers to actual numbers for numeric fields
    if (typeof value === 'string' && value.trim() !== '') {
      // Check if it's a number (including negative and decimal)
      if (!isNaN(value) && value !== '') {
        // Keep as string if it has leading zeros and not purely numeric
        if (/^0\d+/.test(value) && value.length > 1) {
          preparedData[sanitizedKey] = value;
        } else {
          const numValue = parseFloat(value);
          preparedData[sanitizedKey] = isNaN(numValue) ? value : numValue;
        }
      } else {
        preparedData[sanitizedKey] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Handle object values from CSV
      if (value.value !== undefined) {
        const numValue = parseFloat(value.value);
        preparedData[sanitizedKey] = isNaN(numValue) ? value.value : numValue;
      } else {
        preparedData[sanitizedKey] = value;
      }
    } else {
      preparedData[sanitizedKey] = value;
    }
  });
  return preparedData;
};

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
  try {
    const preparedData = prepareDataForFirebase(data);
    
    // Validate preparedData is not empty
    if (!preparedData || Object.keys(preparedData).length === 0) {
      throw new Error("No valid data to add");
    }
    
    console.log("Adding to Firestore:", preparedData); // Debug log
    
    const docRef = await addDoc(collection(db, COLLECTION), preparedData);
    
    return { id: docRef.id, ...preparedData };
  } catch (error) {
    console.error("Error in addRecord:", error);
    throw error; // Re-throw to handle in component
  }
};

// Update record
export const updateRecord = async (id, newData) => {
  const preparedData = prepareDataForFirebase(newData);
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, preparedData);
  return preparedData; // Return updated data
};

// Delete a record
export const deleteRecord = async (id) => {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
};

// Clear all data from collection
export const clearCollection = async () => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  const deletePromises = querySnapshot.docs.map(docSnap => 
    deleteDoc(doc(db, COLLECTION, docSnap.id))
  );
  await Promise.all(deletePromises);
};

// Create simple hash for deduplication
const createRowHash = (row) => {
  return JSON.stringify(Object.keys(row).sort().map(k => `${k}:${row[k]}`));
};

// Used for bulk CSV import - ALWAYS REPLACES ALL EXISTING DATA
export const overwriteCollection = async (rows, clearExisting = true) => {
  // Clear existing data FIRST (this is the default behavior)
  if (clearExisting) {
    await clearCollection();
  }
  
  // Prepare and deduplicate rows
  const seenHashes = new Set();
  const preparedRows = [];
  
  rows.forEach(row => {
    const preparedRow = prepareDataForFirebase(row);
    const hash = createRowHash(preparedRow);
    
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash);
      preparedRows.push(preparedRow);
    } else {
      console.warn("Skipping duplicate row in CSV:", row);
    }
  });
  
  // Add unique rows only
  for (const row of preparedRows) {
    await addDoc(collection(db, COLLECTION), row);
  }
  
  return preparedRows;
};
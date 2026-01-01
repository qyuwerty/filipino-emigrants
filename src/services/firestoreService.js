import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc
} from "firebase/firestore";

const DEFAULT_COLLECTION = "emigrants"; // fallback collection name

const YEAR_RANGE = { min: 1981, max: 2020 };

const KEY_ALIASES = {
  year: "year",
  years: "year",
  "year_of_migration": "year",
  emigrants: "emigrants",
  "total_emigrants": "totalEmigrants",
  "total emigrants": "totalEmigrants",
  population: "population",
  province: "province",
  region: "region",
  male: "male",
  female: "female",
  "male_emigrants": "maleEmigrants",
  "female_emigrants": "femaleEmigrants"
};

const toCamelCase = (value = "") => {
  const parts = value.split(/\s+|_/g).filter(Boolean);
  if (parts.length === 0) return "";
  const [first, ...rest] = parts.map((part) => part.toLowerCase());
  return [first, ...rest.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))].join("");
};

const normalizeKeySegment = (segment = "") => {
  const cleaned = segment.replace(/[~*/[\]]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return "";
  const alias = KEY_ALIASES[cleaned] || cleaned;
  return toCamelCase(alias);
};

// Function to sanitize field names for Firebase
export const sanitizeFieldName = (fieldName = "") => {
  const asString = String(fieldName ?? "");
  if (!asString.trim()) return "";
  const segments = asString.split(".");
  return segments
    .map((segment) => normalizeKeySegment(segment))
    .filter(Boolean)
    .join(".");
};

const coerceNumericValue = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value !== "string") {
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/,/g, "");
  if (normalized === "") return undefined;
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) return numeric;
  return trimmed;
};

const coerceYear = (value) => {
  const numeric = coerceNumericValue(value);
  if (typeof numeric !== "number" || !Number.isInteger(numeric)) return null;
  if (numeric < YEAR_RANGE.min || numeric > YEAR_RANGE.max) return null;
  return numeric;
};

const normalizeRecordSchema = (record = {}) => {
  return Object.entries(record).reduce((acc, [rawKey, rawValue]) => {
    if (rawKey === "id") {
      acc.id = rawValue;
      return acc;
    }

    const sanitizedKey = sanitizeFieldName(rawKey);
    if (!sanitizedKey) return acc;

    if (sanitizedKey === "year") {
      const yearValue = coerceYear(rawValue);
      if (yearValue !== null) acc.year = yearValue;
      return acc;
    }

    if (Array.isArray(rawValue)) {
      acc[sanitizedKey] = rawValue.map((item) =>
        typeof item === "object" && item !== null ? normalizeRecordSchema(item) : coerceNumericValue(item)
      );
      return acc;
    }

    if (rawValue && typeof rawValue === "object") {
      acc[sanitizedKey] = normalizeRecordSchema(rawValue);
      return acc;
    }

    const numeric = coerceNumericValue(rawValue);
    if (numeric !== undefined) acc[sanitizedKey] = numeric;
    return acc;
  }, {});
};

const sortRecordsByYear = (records = []) => {
  const inRange = [];
  const others = [];

  records.forEach((record) => {
    const year = record?.year;
    if (typeof year === "number" && year >= YEAR_RANGE.min && year <= YEAR_RANGE.max) {
      inRange.push(record);
    } else if (record) {
      others.push(record);
    }
  });

  inRange.sort((a, b) => a.year - b.year);
  return [...inRange, ...others];
};

// Function to prepare data for Firebase (sanitize field names and convert values)
// Extracts year for document ID and removes it from stored fields
export const prepareDataForFirebase = (data) => {
  const preparedData = normalizeRecordSchema(data);

  if (preparedData.year === undefined || preparedData.year === null) {
    throw new Error(`Record is missing a valid year within ${YEAR_RANGE.min}-${YEAR_RANGE.max}.`);
  }

  // Extract year for document ID, then remove from fields
  const year = preparedData.year;
  const { year: _, ...fieldsWithoutYear } = preparedData;

  return { year, fields: fieldsWithoutYear };
};

const resolveCollectionName = (name) => {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed || DEFAULT_COLLECTION;
};

const getCollectionRef = (collectionName = DEFAULT_COLLECTION) => {
  return collection(db, resolveCollectionName(collectionName));
};

const getDocumentRef = (collectionName = DEFAULT_COLLECTION, documentId) => {
  return doc(db, resolveCollectionName(collectionName), documentId);
};

// Load all data from Firestore
export const fetchAllRecords = async (collectionName = DEFAULT_COLLECTION) => {
  const targetCollection = resolveCollectionName(collectionName);
  const querySnapshot = await getDocs(getCollectionRef(targetCollection));

  // Reconstruct records: document ID is the year, fields are the document data
  const records = querySnapshot.docs.map((document) => {
    const docId = document.id;
    const yearNum = Number(docId);
    const data = normalizeRecordSchema(document.data());

    return {
      id: docId,
      year: Number.isNaN(yearNum) ? docId : yearNum,
      ...data
    };
  });

  // Sort by year ascending
  return records.sort((a, b) => {
    const yearA = typeof a.year === 'number' ? a.year : 0;
    const yearB = typeof b.year === 'number' ? b.year : 0;
    return yearA - yearB;
  });
};

// Add new record
export const addRecord = async (data, collectionName = DEFAULT_COLLECTION) => {
  try {
    const { year, fields } = prepareDataForFirebase(data);

    // Validate fields is not empty
    if (!fields || Object.keys(fields).length === 0) {
      throw new Error("No valid data to add");
    }

    const targetCollection = resolveCollectionName(collectionName);
    const yearId = String(year);
    const docRef = getDocumentRef(targetCollection, yearId);

    // Store only fields (year is the document ID)
    await setDoc(docRef, fields, { merge: false });

    // Return with year for local state
    return { id: yearId, year, ...fields };
  } catch (error) {
    console.error("Error in addRecord:", error);
    throw error; // Re-throw to handle in component
  }
};

// Update record
export const updateRecord = async (id, newData, collectionName = DEFAULT_COLLECTION) => {
  const targetCollection = resolveCollectionName(collectionName);
  const { year, fields } = prepareDataForFirebase(newData);
  const currentId = String(id);
  const nextId = String(year);

  // If year changed, delete old document
  if (nextId !== currentId) {
    await deleteDoc(getDocumentRef(targetCollection, currentId));
  }

  // Store only fields (year is the document ID)
  await setDoc(getDocumentRef(targetCollection, nextId), fields, { merge: false });
  return { id: nextId, year, ...fields }; // Return updated data
};

// Delete a record
export const deleteRecord = async (id, collectionName = DEFAULT_COLLECTION) => {
  const ref = getDocumentRef(collectionName, String(id));
  await deleteDoc(ref);
};

// Clear all data from collection
export const clearCollection = async (collectionName = DEFAULT_COLLECTION) => {
  const targetCollection = resolveCollectionName(collectionName);
  const querySnapshot = await getDocs(getCollectionRef(targetCollection));
  const deletePromises = querySnapshot.docs.map(docSnap =>
    deleteDoc(getDocumentRef(targetCollection, docSnap.id))
  );
  await Promise.all(deletePromises);
};

// Create simple hash for deduplication
const createRowHash = (row) => {
  return JSON.stringify(Object.keys(row).sort().map(k => `${k}:${row[k]}`));
};

// Used for bulk CSV import - ALWAYS REPLACES ALL EXISTING DATA
export const overwriteCollection = async (rows, clearExisting = true, collectionName = DEFAULT_COLLECTION) => {
  const targetCollection = resolveCollectionName(collectionName);
  console.log("[Firestore] Uploading to collection:", targetCollection);

  // Clear existing data FIRST (this is the default behavior)
  if (clearExisting) {
    await clearCollection(targetCollection);
  }

  // Prepare rows: extract year for doc ID, store rest as fields
  const seenYears = new Set();
  const preparedRows = [];

  rows.forEach(row => {
    const { year, fields } = prepareDataForFirebase(row);
    const yearId = String(year);

    // Deduplicate by year (year is the unique key)
    if (!seenYears.has(yearId)) {
      seenYears.add(yearId);
      preparedRows.push({ year, yearId, fields });
    } else {
      console.warn("Skipping duplicate year in CSV:", year, row);
    }
  });

  // Sort by year ascending before storing
  preparedRows.sort((a, b) => a.year - b.year);

  // Store each row: document ID = year, document fields = everything else
  for (const { year, yearId, fields } of preparedRows) {
    console.log(`[Firestore] Writing doc ID: ${yearId}, fields:`, fields);
    await setDoc(getDocumentRef(targetCollection, yearId), fields, { merge: false });
  }

  // Return full records for local state
  return preparedRows.map(({ year, yearId, fields }) => ({ id: yearId, year, ...fields }));
};
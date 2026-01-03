import { db } from "../firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  query,
  getDoc,
  updateDoc
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

// ========== AGE COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch age data from emigrant_age collection
export const fetchAgeData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_age"));
    const ageData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const ageGroup = doc.id;
      
      // Skip No_Response field
      if (ageGroup === 'No_Response') return;
      
      const yearlyDataField = data.yearly_data || data["yearly-data"];
      if (yearlyDataField) {
        console.log(`Fetching ${ageGroup}:`, yearlyDataField);
        console.log("Field names in document:", Object.keys(data));
        
        if (Array.isArray(yearlyDataField)) {
          // Array format: [{"1981": 0}, {"1982": 1}]
          yearlyDataField.forEach((yearEntry) => {
            const year = Object.keys(yearEntry)[0];
            const count = yearEntry[year];
            
            ageData.push({
              id: `${ageGroup}_${year}`,
              ageGroup: ageGroup,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        } else if (typeof yearlyDataField === 'object') {
          // Object format: {"1981": 0, "1982": 1, "1983": 0}
          Object.entries(yearlyDataField).forEach(([year, count]) => {
            ageData.push({
              id: `${ageGroup}_${year}`,
              ageGroup: ageGroup,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        }
      }
    });
    
    return ageData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching age data:", error);
    throw error;
  }
};

// Add age data record
export const addAgeData = async (ageGroup, year, count) => {
  try {
    const docRef = doc(db, "emigrant_age", ageGroup);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const yearlyDataField = existingData.yearly_data || existingData["yearly-data"] || {};
      
      console.log("Adding to existing age group:", ageGroup);
      console.log("Existing yearlyData:", yearlyDataField);
      
      // Create proper copy and update
      let updatedYearlyData;
      
      if (Array.isArray(yearlyDataField)) {
        // Convert array to object format
        updatedYearlyData = {};
        yearlyDataField.forEach(item => {
          const year = Object.keys(item)[0];
          updatedYearlyData[year] = item[year];
        });
        updatedYearlyData[year.toString()] = count;
        console.log("Converted array to object and added new year");
      } else if (typeof yearlyDataField === 'object') {
        // Object format: {"1981": 0, "1982": 1}
        updatedYearlyData = { ...yearlyDataField };
        updatedYearlyData[year.toString()] = count;
        console.log("Updated object format");
      } else {
        // Create new object
        updatedYearlyData = { [year.toString()]: count };
        console.log("Created new object");
      }
      
      console.log("Updated yearlyData:", updatedYearlyData);
      
      // Determine which field name to use for update
      const updateField = existingData["yearly-data"] ? "yearly-data" : "yearly_data";
      console.log("Updating field:", updateField);
      
      await updateDoc(docRef, { [updateField]: updatedYearlyData });
      console.log("Successfully updated existing age group");
      
    } else {
      // Create new document with object format
      console.log("Creating new age group:", ageGroup);
      const newYearlyData = { [year.toString()]: count };
      console.log("New yearlyData:", newYearlyData);
      
      await setDoc(docRef, { "yearly-data": newYearlyData });
      console.log("Successfully created new age group with object format");
    }
    
    return { ageGroup, year, count };
  } catch (error) {
    console.error("Error adding age data:", error);
    throw error;
  }
};

// Update age data record
export const updateAgeData = async (ageGroup, year, count) => {
  try {
    const docRef = doc(db, "emigrant_age", ageGroup);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Age group ${ageGroup} not found`);
    }
    
    const existingData = docSnap.data();
    let yearlyData = existingData.yearly_data || existingData["yearly-data"] || {};
    
    // Debug logging
    console.log("Before update - yearlyData:", yearlyData);
    console.log("Updating year:", year, "with count:", count);
    console.log("Field names in document:", Object.keys(existingData));
    
    // Handle both object and array formats
    if (Array.isArray(yearlyData)) {
      // Array format: [{"1981": 0}, {"1982": 1}]
      const existingYearIndex = yearlyData.findIndex(item => 
        Object.keys(item)[0] === year.toString()
      );
      
      if (existingYearIndex >= 0) {
        yearlyData[existingYearIndex] = { [year]: count };
        console.log("Updated existing entry in array");
      } else {
        yearlyData.push({ [year]: count });
        console.log("Added new entry to array");
      }
    } else if (typeof yearlyData === 'object') {
      // Object format: {"1981": 0, "1982": 1}
      yearlyData[year.toString()] = count;
      console.log("Updated object format");
    } else {
      // Create new object if invalid format
      yearlyData = { [year]: count };
      console.log("Created new object");
    }
    
    console.log("After update - yearlyData:", yearlyData);
    
    // Determine which field name to use for update
    const updateField = existingData["yearly-data"] ? "yearly-data" : "yearly_data";
    console.log("Updating field:", updateField);
    
    await updateDoc(docRef, { [updateField]: yearlyData });
    console.log("Successfully updated Firestore");
    
    return { ageGroup, year, count };
  } catch (error) {
    console.error("Error updating age data:", error);
    throw error;
  }
};

// Delete age data record (specific year or entire age group)
export const deleteAgeData = async (ageGroup, year, deleteAll = false) => {
  try {
    const docRef = doc(db, "emigrant_age", ageGroup);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Age group ${ageGroup} not found`);
    }
    
    const existingData = docSnap.data();
    console.log("Before delete - existingData:", existingData);
    
    if (deleteAll) {
      // Delete entire document
      console.log(`Deleting entire age group: ${ageGroup}`);
      await deleteDoc(docRef);
      console.log("Successfully deleted entire age group document");
      return { ageGroup, deleted: true };
    } else {
      // Delete specific year data
      const yearlyDataField = existingData.yearly_data || existingData["yearly-data"] || {};
      
      console.log(`Deleting year ${year} from age group ${ageGroup}`);
      console.log("Before delete - yearlyData:", yearlyDataField);
      
      // Create a proper copy to avoid reference issues
      let updatedYearlyData;
      
      // Handle both object and array formats
      if (Array.isArray(yearlyDataField)) {
        // Array format: [{"1981": 0}, {"1982": 1}]
        updatedYearlyData = yearlyDataField.filter(item => 
          Object.keys(item)[0] !== year.toString()
        );
        console.log("Filtered array format, remaining items:", updatedYearlyData.length);
      } else if (typeof yearlyDataField === 'object') {
        // Object format: {"1981": 0, "1982": 1}
        updatedYearlyData = { ...yearlyDataField };
        delete updatedYearlyData[year.toString()];
        console.log("Deleted from object format, remaining keys:", Object.keys(updatedYearlyData));
      } else {
        console.log("Invalid yearlyData format, cannot delete");
        return { ageGroup, year, deleted: false };
      }
      
      console.log("After delete - updatedYearlyData:", updatedYearlyData);
      
      // Determine which field name to use for update
      const updateField = existingData["yearly-data"] ? "yearly-data" : "yearly_data";
      console.log("Updating field:", updateField);
      
      await updateDoc(docRef, { [updateField]: updatedYearlyData });
      console.log("Successfully deleted year from Firestore");
      
      return { ageGroup, year, deleted: true };
    }
  } catch (error) {
    console.error("Error deleting age data:", error);
    throw error;
  }
};

// Delete entire age group document
export const deleteAgeGroup = async (ageGroup) => {
  try {
    const docRef = doc(db, "emigrant_age", ageGroup);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Age group ${ageGroup} not found`);
    }
    
    console.log(`Deleting entire age group: ${ageGroup}`);
    await deleteDoc(docRef);
    console.log("Successfully deleted entire age group document");
    
    return { ageGroup, deleted: true };
  } catch (error) {
    console.error("Error deleting age group:", error);
    throw error;
  }
};

// ========== COUNTRIES COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch countries data from emigrant_allCountries collection
export const fetchCountriesData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_allCountries"));
    const countriesData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const country = doc.id;
      
      const dataField = data.data || data["data"];
      if (dataField) {
        console.log(`Fetching ${country}:`, dataField);
        console.log("Field names in document:", Object.keys(data));
        
        if (Array.isArray(dataField)) {
          // Array format: [{"year": 1981, "count": 123}, {"year": 1982, "count": 456}]
          dataField.forEach((yearEntry) => {
            const year = yearEntry.year;
            const count = yearEntry.count;
            
            countriesData.push({
              id: `${country}_${year}`,
              country: country,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        } else if (typeof dataField === 'object') {
          // Object format: {"1981": 123, "1982": 456}
          Object.entries(dataField).forEach(([year, count]) => {
            countriesData.push({
              id: `${country}_${year}`,
              country: country,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        }
      }
    });
    
    return countriesData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching countries data:", error);
    throw error;
  }
};

// Add countries data record
export const addCountriesData = async (country, year, count) => {
  try {
    const docRef = doc(db, "emigrant_allCountries", country);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const dataField = existingData.data || existingData["data"] || {};
      
      console.log("Adding to existing country:", country);
      console.log("Existing data:", dataField);
      
      // Create proper copy and update
      let updatedData;
      
      if (Array.isArray(dataField)) {
        // Convert array to object format
        updatedData = {};
        dataField.forEach(item => {
          updatedData[item.year.toString()] = item.count;
        });
        updatedData[year.toString()] = count;
        console.log("Converted array to object and added new year");
      } else if (typeof dataField === 'object') {
        // Object format: {"1981": 123, "1982": 456}
        updatedData = { ...dataField };
        updatedData[year.toString()] = count;
        console.log("Updated object format");
      } else {
        // Create new object
        updatedData = { [year.toString()]: count };
        console.log("Created new object");
      }
      
      console.log("Updated data:", updatedData);
      
      // Determine which field name to use for update
      const updateField = existingData["data"] ? "data" : "data";
      console.log("Updating field:", updateField);
      
      await updateDoc(docRef, { [updateField]: updatedData });
      console.log("Successfully updated existing country");
      
    } else {
      // Create new document with object format
      console.log("Creating new country:", country);
      const newData = { [year.toString()]: count };
      console.log("New data:", newData);
      
      await setDoc(docRef, { "data": newData });
      console.log("Successfully created new country with object format");
    }
    
    return { country, year, count };
  } catch (error) {
    console.error("Error adding countries data:", error);
    throw error;
  }
};

// Update countries data record
export const updateCountriesData = async (country, year, count) => {
  try {
    const docRef = doc(db, "emigrant_allCountries", country);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Country ${country} not found`);
    }
    
    const existingData = docSnap.data();
    let dataField = existingData.data || existingData["data"] || {};
    
    // Debug logging
    console.log("Before update - dataField:", dataField);
    console.log("Updating year:", year, "with count:", count);
    console.log("Field names in document:", Object.keys(existingData));
    
    // Handle both object and array formats
    if (Array.isArray(dataField)) {
      // Array format: [{"year": 1981, "count": 123}, {"year": 1982, "count": 456}]
      const existingYearIndex = dataField.findIndex(item => 
        item.year.toString() === year.toString()
      );
      
      if (existingYearIndex >= 0) {
        dataField[existingYearIndex] = { year: parseInt(year), count: count };
        console.log("Updated existing entry in array");
      } else {
        dataField.push({ year: parseInt(year), count: count });
        console.log("Added new entry to array");
      }
    } else if (typeof dataField === 'object') {
      // Object format: {"1981": 123, "1982": 456}
      dataField[year.toString()] = count;
      console.log("Updated object format");
    } else {
      // Create new object if invalid format
      dataField = { [year]: count };
      console.log("Created new object");
    }
    
    console.log("After update - dataField:", dataField);
    
    // Determine which field name to use for update
    const updateField = existingData["data"] ? "data" : "data";
    console.log("Updating field:", updateField);
    
    await updateDoc(docRef, { [updateField]: dataField });
    console.log("Successfully updated Firestore");
    
    return { country, year, count };
  } catch (error) {
    console.error("Error updating countries data:", error);
    throw error;
  }
};

// Delete countries data record (specific year or entire country)
export const deleteCountriesData = async (country, year, deleteAll = false) => {
  try {
    const docRef = doc(db, "emigrant_allCountries", country);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Country ${country} not found`);
    }
    
    const existingData = docSnap.data();
    console.log("Before delete - existingData:", existingData);
    
    if (deleteAll) {
      // Delete entire document
      console.log(`Deleting entire country: ${country}`);
      await deleteDoc(docRef);
      console.log("Successfully deleted entire country document");
      return { country, deleted: true };
    } else {
      // Delete specific year data
      const dataField = existingData.data || existingData["data"] || {};
      
      console.log(`Deleting year ${year} from country ${country}`);
      console.log("Before delete - dataField:", dataField);
      
      // Create a proper copy to avoid reference issues
      let updatedData;
      
      // Handle both object and array formats
      if (Array.isArray(dataField)) {
        // Array format: [{"year": 1981, "count": 123}, {"year": 1982, "count": 456}]
        updatedData = dataField.filter(item => 
          item.year.toString() !== year.toString()
        );
        console.log("Filtered array format, remaining items:", updatedData.length);
      } else if (typeof dataField === 'object') {
        // Object format: {"1981": 123, "1982": 456}
        updatedData = { ...dataField };
        delete updatedData[year.toString()];
        console.log("Deleted from object format, remaining keys:", Object.keys(updatedData));
      } else {
        console.log("Invalid data format, cannot delete");
        return { country, year, deleted: false };
      }
      
      console.log("After delete - updatedData:", updatedData);
      
      // Determine which field name to use for update
      const updateField = existingData["data"] ? "data" : "data";
      console.log("Updating field:", updateField);
      
      await updateDoc(docRef, { [updateField]: updatedData });
      console.log("Successfully deleted year from Firestore");
      
      return { country, year, deleted: true };
    }
  } catch (error) {
    console.error("Error deleting countries data:", error);
    throw error;
  }
};

// Delete entire country document
export const deleteCountriesGroup = async (country) => {
  try {
    const docRef = doc(db, "emigrant_allCountries", country);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Country ${country} not found`);
    }
    
    console.log(`Deleting entire country: ${country}`);
    await deleteDoc(docRef);
    console.log("Successfully deleted entire country document");
    
    return { country, deleted: true };
  } catch (error) {
    console.error("Error deleting country:", error);
    throw error;
  }
};

// ========== MAJOR COUNTRIES COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch major countries data from emigrant_majorCountry collection
export const fetchMajorCountriesData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_majorCountry"));
    const majorCountriesData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const year = doc.id;
      
      const countriesField = data.countries || data["countries"];
      if (countriesField) {
        console.log(`Fetching year ${year}:`, countriesField);
        console.log("Field names in document:", Object.keys(data));
        
        if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
          // Object format: {"AUSTRALIA": 2752, "CANADA": 5226, "UNITED_STATES": 12345}
          Object.entries(countriesField).forEach(([country, count]) => {
            majorCountriesData.push({
              id: `${country}_${year}`,
              country: country,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        } else if (Array.isArray(countriesField)) {
          // Array format: [{"country": "United States", "count": 123}, {"country": "Canada", "count": 456}]
          countriesField.forEach((countryEntry) => {
            const country = countryEntry.country;
            const count = countryEntry.count;
            
            majorCountriesData.push({
              id: `${country}_${year}`,
              country: country,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        }
      }
    });
    
    return majorCountriesData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching major countries data:", error);
    throw error;
  }
};

// Add major countries data record
export const addMajorCountriesData = async (country, year, count) => {
  try {
    const docRef = doc(db, "emigrant_majorCountry", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const countriesField = existingData.countries || existingData["countries"] || {};
      
      console.log("Adding to existing year:", year);
      console.log("Existing countries:", countriesField);
      
      // Create proper copy and update
      let updatedCountries;
      
      if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
        // Object format: {"AUSTRALIA": 2752, "CANADA": 5226, "UNITED_STATES": 12345}
        updatedCountries = { ...countriesField };
        updatedCountries[country] = count;
        console.log("Updated existing country in object");
      } else if (Array.isArray(countriesField)) {
        // Convert array to object format
        updatedCountries = {};
        countriesField.forEach(item => {
          updatedCountries[item.country] = item.count;
        });
        updatedCountries[country] = count;
        console.log("Converted array to object and added new country");
      } else {
        // Create new object
        updatedCountries = { [country]: count };
        console.log("Created new object");
      }
      
      console.log("Updated countries:", updatedCountries);
      
      await updateDoc(docRef, { countries: updatedCountries });
      console.log("Successfully updated existing year");
      
    } else {
      // Create new document with object format
      console.log("Creating new year:", year);
      const newCountries = { [country]: count };
      console.log("New countries:", newCountries);
      
      await setDoc(docRef, { countries: newCountries });
      console.log("Successfully created new year with object format");
    }
    
    return { country, year, count };
  } catch (error) {
    console.error("Error adding major countries data:", error);
    throw error;
  }
};

// Update major countries data record
export const updateMajorCountriesData = async (country, year, count) => {
  try {
    const docRef = doc(db, "emigrant_majorCountry", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Year ${year} not found`);
    }
    
    const existingData = docSnap.data();
    let countriesField = existingData.countries || existingData["countries"] || {};
    
    // Debug logging
    console.log("Before update - countriesField:", countriesField);
    console.log("Updating country:", country, "with count:", count);
    console.log("Field names in document:", Object.keys(existingData));
    
    // Handle object format
    if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
      // Object format: {"AUSTRALIA": 2752, "CANADA": 5226, "UNITED_STATES": 12345}
      countriesField[country] = count;
      console.log("Updated object format");
    } else if (Array.isArray(countriesField)) {
      // Convert array to object format
      const newCountriesField = {};
      countriesField.forEach(item => {
        newCountriesField[item.country] = item.count;
      });
      newCountriesField[country] = count;
      countriesField = newCountriesField;
      console.log("Converted array to object and updated");
    } else {
      // Create new object if invalid format
      countriesField = { [country]: count };
      console.log("Created new object");
    }
    
    console.log("After update - countriesField:", countriesField);
    
    await updateDoc(docRef, { countries: countriesField });
    console.log("Successfully updated Firestore");
    
    return { country, year, count };
  } catch (error) {
    console.error("Error updating major countries data:", error);
    throw error;
  }
};

// Delete major countries data record (specific country/year or entire country)
export const deleteMajorCountriesData = async (country, year, deleteAll = false) => {
  try {
    if (deleteAll) {
      // Delete country from all years
      console.log(`Deleting country ${country} from all years`);
      
      // Get all year documents
      const querySnapshot = await getDocs(collection(db, "emigrant_majorCountry"));
      const updatePromises = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        const countriesField = docData.countries || docData["countries"] || {};
        
        if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
          const updatedCountries = { ...countriesField };
          delete updatedCountries[country];
          
          if (Object.keys(updatedCountries).length !== Object.keys(countriesField).length) {
            console.log(`Removing ${country} from year ${doc.id}`);
            updatePromises.push(updateDoc(doc.ref, { countries: updatedCountries }));
          }
        }
      });
      
      await Promise.all(updatePromises);
      console.log("Successfully deleted country from all years");
      return { country, deleted: true };
    } else {
      // Delete specific country from specific year
      const docRef = doc(db, "emigrant_majorCountry", year.toString());
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Year ${year} not found`);
      }
      
      const existingData = docSnap.data();
      console.log("Before delete - existingData:", existingData);
      
      const countriesField = existingData.countries || existingData["countries"] || {};
      console.log(`Deleting country ${country} from year ${year}`);
      console.log("Before delete - countriesField:", countriesField);
      
      // Create a proper copy to avoid reference issues
      let updatedCountries;
      
      if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
        // Object format: {"AUSTRALIA": 2752, "CANADA": 5226, "UNITED_STATES": 12345}
        updatedCountries = { ...countriesField };
        delete updatedCountries[country];
        console.log("Deleted from object format, remaining keys:", Object.keys(updatedCountries));
      } else {
        console.log("Invalid countries format, cannot delete");
        return { country, year, deleted: false };
      }
      
      console.log("After delete - updatedCountries:", updatedCountries);
      
      await updateDoc(docRef, { countries: updatedCountries });
      console.log("Successfully deleted country from year");
      
      return { country, year, deleted: true };
    }
  } catch (error) {
    console.error("Error deleting major countries data:", error);
    throw error;
  }
};

// Delete entire country from all years
export const deleteMajorCountriesGroup = async (country) => {
  try {
    console.log(`Deleting entire country: ${country}`);
    
    // Get all year documents
    const querySnapshot = await getDocs(collection(db, "emigrant_majorCountry"));
    const updatePromises = [];
    
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      const countriesField = docData.countries || docData["countries"] || {};
      
      if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
        const updatedCountries = { ...countriesField };
        delete updatedCountries[country];
        
        if (Object.keys(updatedCountries).length !== Object.keys(countriesField).length) {
          console.log(`Removing ${country} from year ${doc.id}`);
          updatePromises.push(updateDoc(doc.ref, { countries: updatedCountries }));
        }
      }
    });
    
    await Promise.all(updatePromises);
    console.log("Successfully deleted entire country from all years");
    
    return { country, deleted: true };
  } catch (error) {
    console.error("Error deleting major country:", error);
    throw error;
  }
};

// ========== OCCUPATION COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch occupation data from emigrant_occupation collection
export const fetchOccupationData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_occupation"));
    const occupationData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const occupation = doc.id;
      
      const yearlyDataField = data.yearlyData || data["yearlyData"];
      if (yearlyDataField) {
        console.log(`Fetching occupation ${occupation}:`, yearlyDataField);
        console.log("Field names in document:", Object.keys(data));
        
        if (typeof yearlyDataField === 'object' && !Array.isArray(yearlyDataField)) {
          // Object format: {"1981": 2338, "1982": 1894, ...}
          Object.entries(yearlyDataField).forEach(([year, count]) => {
            occupationData.push({
              id: `${occupation}_${year}`,
              occupation: occupation,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        } else if (Array.isArray(yearlyDataField)) {
          // Array format: [{"year": 1981, "count": 2338}, {"year": 1982, "count": 1894}]
          yearlyDataField.forEach((yearEntry) => {
            const year = yearEntry.year;
            const count = yearEntry.count;
            
            occupationData.push({
              id: `${occupation}_${year}`,
              occupation: occupation,
              year: parseInt(year),
              count: count,
              documentId: doc.id
            });
          });
        }
      }
    });
    
    return occupationData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching occupation data:", error);
    throw error;
  }
};

// Add occupation data record
export const addOccupationData = async (occupation, year, count) => {
  try {
    const docRef = doc(db, "emigrant_occupation", occupation);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const yearlyDataField = existingData.yearlyData || existingData["yearlyData"] || {};
      
      console.log("Adding to existing occupation:", occupation);
      console.log("Existing yearlyData:", yearlyDataField);
      
      // Create proper copy and update
      let updatedYearlyData;
      
      if (typeof yearlyDataField === 'object' && !Array.isArray(yearlyDataField)) {
        // Object format: {"1981": 2338, "1982": 1894, ...}
        updatedYearlyData = { ...yearlyDataField };
        updatedYearlyData[year.toString()] = count;
        console.log("Updated existing year in object");
      } else if (Array.isArray(yearlyDataField)) {
        // Convert array to object format
        updatedYearlyData = {};
        yearlyDataField.forEach(item => {
          updatedYearlyData[item.year.toString()] = item.count;
        });
        updatedYearlyData[year.toString()] = count;
        console.log("Converted array to object and added new year");
      } else {
        // Create new object
        updatedYearlyData = { [year.toString()]: count };
        console.log("Created new object");
      }
      
      console.log("Updated yearlyData:", updatedYearlyData);
      
      await updateDoc(docRef, { yearlyData: updatedYearlyData });
      console.log("Successfully updated existing occupation");
      
    } else {
      // Create new document with object format
      console.log("Creating new occupation:", occupation);
      const newYearlyData = { [year.toString()]: count };
      console.log("New yearlyData:", newYearlyData);
      
      await setDoc(docRef, { yearlyData: newYearlyData });
      console.log("Successfully created new occupation with object format");
    }
    
    return { occupation, year, count };
  } catch (error) {
    console.error("Error adding occupation data:", error);
    throw error;
  }
};

// Update occupation data record
export const updateOccupationData = async (occupation, year, count) => {
  try {
    const docRef = doc(db, "emigrant_occupation", occupation);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Occupation ${occupation} not found`);
    }
    
    const existingData = docSnap.data();
    let yearlyDataField = existingData.yearlyData || existingData["yearlyData"] || {};
    
    // Debug logging
    console.log("Before update - yearlyDataField:", yearlyDataField);
    console.log("Updating year:", year, "with count:", count);
    console.log("Field names in document:", Object.keys(existingData));
    
    // Handle object format
    if (typeof yearlyDataField === 'object' && !Array.isArray(yearlyDataField)) {
      // Object format: {"1981": 2338, "1982": 1894, ...}
      yearlyDataField[year.toString()] = count;
      console.log("Updated object format");
    } else if (Array.isArray(yearlyDataField)) {
      // Convert array to object format
      const newYearlyDataField = {};
      yearlyDataField.forEach(item => {
        newYearlyDataField[item.year.toString()] = item.count;
      });
      newYearlyDataField[year.toString()] = count;
      yearlyDataField = newYearlyDataField;
      console.log("Converted array to object and updated");
    } else {
      // Create new object if invalid format
      yearlyDataField = { [year.toString()]: count };
      console.log("Created new object");
    }
    
    console.log("After update - yearlyDataField:", yearlyDataField);
    
    await updateDoc(docRef, { yearlyData: yearlyDataField });
    console.log("Successfully updated Firestore");
    
    return { occupation, year, count };
  } catch (error) {
    console.error("Error updating occupation data:", error);
    throw error;
  }
};

// Delete occupation data record (specific year or entire occupation)
export const deleteOccupationData = async (occupation, year, deleteAll = false) => {
  try {
    if (deleteAll) {
      // Delete entire occupation document
      console.log(`Deleting entire occupation: ${occupation}`);
      const docRef = doc(db, "emigrant_occupation", occupation);
      await deleteDoc(docRef);
      console.log("Successfully deleted entire occupation document");
      return { occupation, deleted: true };
    } else {
      // Delete specific year data
      const docRef = doc(db, "emigrant_occupation", occupation);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Occupation ${occupation} not found`);
      }
      
      const existingData = docSnap.data();
      console.log("Before delete - existingData:", existingData);
      
      const yearlyDataField = existingData.yearlyData || existingData["yearlyData"] || {};
      console.log(`Deleting year ${year} from occupation ${occupation}`);
      console.log("Before delete - yearlyDataField:", yearlyDataField);
      
      // Create a proper copy to avoid reference issues
      let updatedYearlyData;
      
      if (typeof yearlyDataField === 'object' && !Array.isArray(yearlyDataField)) {
        // Object format: {"1981": 2338, "1982": 1894, ...}
        updatedYearlyData = { ...yearlyDataField };
        delete updatedYearlyData[year.toString()];
        console.log("Deleted from object format, remaining keys:", Object.keys(updatedYearlyData));
      } else {
        console.log("Invalid yearlyData format, cannot delete");
        return { occupation, year, deleted: false };
      }
      
      console.log("After delete - updatedYearlyData:", updatedYearlyData);
      
      await updateDoc(docRef, { yearlyData: updatedYearlyData });
      console.log("Successfully deleted year from Firestore");
      
      return { occupation, year, deleted: true };
    }
  } catch (error) {
    console.error("Error deleting occupation data:", error);
    throw error;
  }
};

// Delete entire occupation document
export const deleteOccupationGroup = async (occupation) => {
  try {
    const docRef = doc(db, "emigrant_occupation", occupation);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Occupation ${occupation} not found`);
    }
    
    console.log(`Deleting entire occupation: ${occupation}`);
    await deleteDoc(docRef);
    console.log("Successfully deleted entire occupation document");
    
    return { occupation, deleted: true };
  } catch (error) {
    console.error("Error deleting occupation:", error);
    throw error;
  }
};

// ========== ORIGINAL COLLECTION FUNCTIONS ==========

export const fetchRecordsByDataset = async (datasetType) => {
  const querySnapshot = await getDocs(collection(db, COLLECTION));
  const allRecords = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Filter by dataset type based on source field or content
  return allRecords.filter(record => {
    const source = record.source?.toLowerCase() || '';
    const dataset = record.dataset?.toLowerCase() || '';
    
    switch(datasetType) {
      case 'age':
        return source.includes('age') || dataset.includes('age');
      case 'all-countries':
        return source.includes('allcountries') || dataset.includes('all-countries');
      case 'major-countries':
        return source.includes('majorcountry') || dataset.includes('major-countries');
      case 'occupation':
        return source.includes('occu') || dataset.includes('occupation');
      case 'sex':
        return source.includes('sex') || dataset.includes('sex');
      case 'civil-status':
        return source.includes('civilstatus') || dataset.includes('civil-status');
      case 'education':
        return source.includes('educ') || dataset.includes('education');
      case 'place-of-origin':
        return source.includes('placeoforigin') || dataset.includes('place-of-origin');
      default:
        return false;
    }
  });
};

// Add record with dataset type
export const addRecordWithDataset = async (data, datasetType) => {
  try {
    const preparedData = {
      ...prepareDataForFirebase(data),
      dataset: datasetType,
      createdAt: new Date().toISOString()
    };
    
    if (!preparedData || Object.keys(preparedData).length === 0) {
      throw new Error("No valid data to add");
    }
    
    console.log(`Adding ${datasetType} record to Firestore:`, preparedData);
    
    const docRef = await addDoc(collection(db, COLLECTION), preparedData);
    
    return { id: docRef.id, ...preparedData };
  } catch (error) {
    console.error("Error in addRecordWithDataset:", error);
    throw error;
  }
};

// Update record with dataset type
export const updateRecordWithDataset = async (id, newData, datasetType) => {
  const preparedData = {
    ...prepareDataForFirebase(newData),
    dataset: datasetType,
    updatedAt: new Date().toISOString()
  };
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, preparedData);
  return preparedData;
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
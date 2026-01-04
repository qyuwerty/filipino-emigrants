import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  getDoc
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

// ========== SEX COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch sex data from emigrant_sex collection
export const fetchSexData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_sex"));
    const sexData = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sexData.push({
        id: doc.id,
        year: data.year,
        female: data.female || 0,
        male: data.male || 0,
        sex_ratio: data.sex_ratio || 0,
        total: data.total || 0
      });
    });
    
    return sexData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching sex data:", error);
    throw error;
  }
};

// Add sex data for a specific year
export const addSexData = async (year, female, male) => {
  try {
    const total = female + male;
    const sex_ratio = male > 0 ? ((male / female) * 100).toFixed(2) : 0;
    
    const sexData = {
      year: parseInt(year),
      female: parseInt(female),
      male: parseInt(male),
      total: total,
      sex_ratio: parseFloat(sex_ratio)
    };
    
    const docRef = doc(db, "emigrant_sex", year.toString());
    await setDoc(docRef, sexData);
    
    console.log(`Successfully added sex data for year ${year}`);
    return { year, ...sexData };
  } catch (error) {
    console.error("Error adding sex data:", error);
    throw error;
  }
};

// Update sex data for a specific year
export const updateSexData = async (year, female, male) => {
  try {
    const total = female + male;
    const sex_ratio = male > 0 ? ((male / female) * 100).toFixed(2) : 0;
    
    const updatedData = {
      year: parseInt(year),
      female: parseInt(female),
      male: parseInt(male),
      total: total,
      sex_ratio: parseFloat(sex_ratio)
    };
    
    const docRef = doc(db, "emigrant_sex", year.toString());
    await setDoc(docRef, updatedData);
    
    console.log(`Successfully updated sex data for year ${year}`);
    return { year, ...updatedData };
  } catch (error) {
    console.error("Error updating sex data:", error);
    throw error;
  }
};

// Delete sex data for a specific year
export const deleteSexData = async (year) => {
  try {
    const docRef = doc(db, "emigrant_sex", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Sex data for year ${year} not found`);
    }
    
    await deleteDoc(docRef);
    console.log(`Successfully deleted sex data for year ${year}`);
    
    return { year, deleted: true };
  } catch (error) {
    console.error("Error deleting sex data:", error);
    throw error;
  }
};

// ========== CIVIL STATUS COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch civil status data from emigrant_civilStatus collection
export const fetchCivilStatusData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_civilStatus"));
    const civilStatusData = [];
    
    console.log('fetchCivilStatusData - Query snapshot size:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('fetchCivilStatusData - Document data:', doc.id, data);
      civilStatusData.push({
        id: doc.id,
        year: data.year,
        divorced: data.divorced || 0,
        married: data.married || 0,
        separated: data.separated || 0,
        single: data.single || 0,
        widower: data.widower || 0,
        notReported: data.notReported || 0,
        total: data.total || 0
      });
    });
    
    console.log('fetchCivilStatusData - Final data array:', civilStatusData);
    return civilStatusData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching civil status data:", error);
    throw error;
  }
};

// Add civil status data for a specific year
export const addCivilStatusData = async (year, divorced, married, separated, single, widower, notReported) => {
  try {
    const total = divorced + married + separated + single + widower + notReported;
    
    const civilStatusData = {
      year: parseInt(year),
      divorced: parseInt(divorced),
      married: parseInt(married),
      separated: parseInt(separated),
      single: parseInt(single),
      widower: parseInt(widower),
      notReported: parseInt(notReported),
      total: total
    };
    
    const docRef = doc(db, "emigrant_civilStatus", year.toString());
    await setDoc(docRef, civilStatusData);
    
    console.log(`Successfully added civil status data for year ${year}`);
    return { year, ...civilStatusData };
  } catch (error) {
    console.error("Error adding civil status data:", error);
    throw error;
  }
};

// Update civil status data for a specific year
export const updateCivilStatusData = async (year, divorced, married, separated, single, widower, notReported) => {
  try {
    const total = divorced + married + separated + single + widower + notReported;
    
    const updatedData = {
      year: parseInt(year),
      divorced: parseInt(divorced),
      married: parseInt(married),
      separated: parseInt(separated),
      single: parseInt(single),
      widower: parseInt(widower),
      notReported: parseInt(notReported),
      total: total
    };
    
    const docRef = doc(db, "emigrant_civilStatus", year.toString());
    await setDoc(docRef, updatedData);
    
    console.log(`Successfully updated civil status data for year ${year}`);
    return { year, ...updatedData };
  } catch (error) {
    console.error("Error updating civil status data:", error);
    throw error;
  }
};

// Delete civil status data for a specific year
export const deleteCivilStatusData = async (year) => {
  try {
    const docRef = doc(db, "emigrant_civilStatus", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Civil status data for year ${year} not found`);
    }
    
    await deleteDoc(docRef);
    console.log(`Successfully deleted civil status data for year ${year}`);
    return { year, deleted: true };
  } catch (error) {
    console.error("Error deleting civil status data:", error);
    throw error;
  }
};

// ========== EDUCATION COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch education data from emigrant_education collection
export const fetchEducationData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_education"));
    const educationData = [];
    
    console.log('fetchEducationData - Query snapshot size:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('fetchEducationData - Document data:', doc.id, data);
      
      // Handle the data field which contains year-to-count mappings
      const yearlyData = data.data || {};
      
      // Convert the yearly data object to individual records
      Object.keys(yearlyData).forEach(year => {
        educationData.push({
          id: `${doc.id}_${year}`,
          educationGroup: doc.id,
          year: parseInt(year),
          count: yearlyData[year] || 0
        });
      });
    });
    
    console.log('fetchEducationData - Final data array:', educationData);
    return educationData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching education data:", error);
    throw error;
  }
};

// Add education data for a specific education group and year
export const addEducationData = async (educationGroup, year, count) => {
  try {
    const docRef = doc(db, "emigrant_education", educationGroup);
    const docSnap = await getDoc(docRef);
    
    let educationData = {};
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      educationData = existingData.data || {};
    }
    
    // Update the year-to-count mapping
    educationData[year.toString()] = parseInt(count);
    
    await setDoc(docRef, { data: educationData });
    
    console.log(`Successfully added education data for group ${educationGroup}, year ${year}`);
    return { educationGroup, year, count };
  } catch (error) {
    console.error("Error adding education data:", error);
    throw error;
  }
};

// Update education data for a specific education group and year
export const updateEducationData = async (educationGroup, year, count) => {
  try {
    const docRef = doc(db, "emigrant_education", educationGroup);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Education group ${educationGroup} not found`);
    }
    
    const existingData = docSnap.data();
    let educationData = existingData.data || {};
    
    // Update the year-to-count mapping
    educationData[year.toString()] = parseInt(count);
    
    await updateDoc(docRef, { data: educationData });
    
    console.log(`Successfully updated education data for group ${educationGroup}, year ${year}`);
    return { educationGroup, year, count };
  } catch (error) {
    console.error("Error updating education data:", error);
    throw error;
  }
};

// Delete education data for a specific education group and year
export const deleteEducationData = async (educationGroup, year) => {
  try {
    const docRef = doc(db, "emigrant_education", educationGroup);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Education group ${educationGroup} not found`);
    }
    
    const existingData = docSnap.data();
    let educationData = existingData.data || {};
    
    // Remove the specific year
    delete educationData[year.toString()];
    
    await updateDoc(docRef, { data: educationData });
    
    console.log(`Successfully deleted education data for group ${educationGroup}, year ${year}`);
    return { educationGroup, year, deleted: true };
  } catch (error) {
    console.error("Error deleting education data:", error);
    throw error;
  }
};

// Delete entire education group document
export const deleteEducationGroup = async (educationGroup) => {
  try {
    const docRef = doc(db, "emigrant_education", educationGroup);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Education group ${educationGroup} not found`);
    }
    
    console.log(`Deleting entire education group: ${educationGroup}`);
    await deleteDoc(docRef);
    console.log("Successfully deleted entire education group document");
    
    return { educationGroup, deleted: true };
  } catch (error) {
    console.error("Error deleting education group:", error);
    throw error;
  }
};

// ========== PLACE OF ORIGIN COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch place of origin data from emigrant_placeOfOrigin collection
export const fetchPlaceOfOriginData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_placeOfOrigin"));
    const placeOfOriginData = [];
    
    console.log('fetchPlaceOfOriginData - Query snapshot size:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('fetchPlaceOfOriginData - Document data:', doc.id, data);
      
      // Handle the years field which contains an array of objects with value and year properties
      const yearsArray = data.years || [];
      console.log('fetchPlaceOfOriginData - Years array for', doc.id, ':', yearsArray);
      console.log('fetchPlaceOfOriginData - Years array type:', typeof yearsArray, 'Length:', yearsArray.length);
      
      // Parse the array of objects with value and year properties
      if (Array.isArray(yearsArray)) {
        console.log('fetchPlaceOfOriginData - Using value/year object parsing approach');
        yearsArray.forEach((yearData, index) => {
          console.log('fetchPlaceOfOriginData - Processing yearData', index, ':', yearData, 'Type:', typeof yearData);
          if (yearData && typeof yearData === 'object' && yearData.hasOwnProperty('year') && yearData.hasOwnProperty('value')) {
            const yearNum = parseInt(yearData.year);
            const count = parseInt(yearData.value);
            console.log('fetchPlaceOfOriginData - Adding record:', {
              id: `${doc.id}_${yearNum}`,
              region: doc.id,
              year: yearNum,
              count: count
            });
            placeOfOriginData.push({
              id: `${doc.id}_${yearNum}`,
              region: doc.id,
              year: yearNum,
              count: count || 0
            });
          } else {
            console.log('fetchPlaceOfOriginData - Skipping invalid yearData (missing value/year):', yearData);
          }
        });
      } else {
        console.log('fetchPlaceOfOriginData - Years field is not an array, data structure unexpected');
      }
    });
    
    console.log('fetchPlaceOfOriginData - Final data array:', placeOfOriginData);
    return placeOfOriginData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching place of origin data:", error);
    throw error;
  }
};

// Add place of origin data for a specific region and year
export const addPlaceOfOriginData = async (region, year, count) => {
  try {
    const docRef = doc(db, "emigrant_placeOfOrigin", region);
    const docSnap = await getDoc(docRef);
    
    let yearsArray = [];
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      yearsArray = existingData.years || [];
    }
    
    // Find if year exists in the array
    let yearIndex = yearsArray.findIndex(yearData => 
      yearData && typeof yearData === 'object' && yearData.hasOwnProperty('year') && yearData.year === parseInt(year)
    );
    
    if (yearIndex === -1) {
      // Add new year object to array
      yearsArray.push({ year: parseInt(year), value: parseInt(count) });
    } else {
      // Update existing year object
      yearsArray[yearIndex].value = parseInt(count);
    }
    
    await setDoc(docRef, { years: yearsArray });
    
    console.log(`Successfully added place of origin data for region ${region}, year ${year}`);
    return { region, year, count };
  } catch (error) {
    console.error("Error adding place of origin data:", error);
    throw error;
  }
};

// Update place of origin data for a specific region and year
export const updatePlaceOfOriginData = async (region, year, count) => {
  try {
    const docRef = doc(db, "emigrant_placeOfOrigin", region);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Region ${region} not found`);
    }
    
    const existingData = docSnap.data();
    let yearsArray = existingData.years || [];
    
    // Find if year exists in the array
    let yearIndex = yearsArray.findIndex(yearData => 
      yearData && typeof yearData === 'object' && yearData.hasOwnProperty('year') && yearData.year === parseInt(year)
    );
    
    if (yearIndex === -1) {
      // Add new year object to array
      yearsArray.push({ year: parseInt(year), value: parseInt(count) });
    } else {
      // Update existing year object
      yearsArray[yearIndex].value = parseInt(count);
    }
    
    await updateDoc(docRef, { years: yearsArray });
    
    console.log(`Successfully updated place of origin data for region ${region}, year ${year}`);
    return { region, year, count };
  } catch (error) {
    console.error("Error updating place of origin data:", error);
    throw error;
  }
};

// Delete place of origin data for a specific region and year
export const deletePlaceOfOriginData = async (region, year) => {
  try {
    const docRef = doc(db, "emigrant_placeOfOrigin", region);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Region ${region} not found`);
    }
    
    const existingData = docSnap.data();
    let yearsArray = existingData.years || [];
    
    // Find and remove the year from the array
    yearsArray = yearsArray.filter(yearData => 
      !(yearData && typeof yearData === 'object' && yearData.hasOwnProperty('year') && yearData.year === parseInt(year.toString()))
    );
    
    await updateDoc(docRef, { years: yearsArray });
    
    console.log(`Successfully deleted place of origin data for region ${region}, year ${year}`);
    return { region, year, deleted: true };
  } catch (error) {
    console.error("Error deleting place of origin data:", error);
    throw error;
  }
};

// Delete entire region document
export const deletePlaceOfOriginRegion = async (region) => {
  try {
    const docRef = doc(db, "emigrant_placeOfOrigin", region);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Region ${region} not found`);
    }
    
    console.log(`Deleting entire place of origin region: ${region}`);
    await deleteDoc(docRef);
    console.log("Successfully deleted entire place of origin region document");
    
    return { region, deleted: true };
  } catch (error) {
    console.error("Error deleting place of origin region:", error);
    throw error;
  }
};

// Fetch records by dataset type
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

// ========== YEARLY DATA COLLECTION SPECIFIC FUNCTIONS ==========

// Fetch yearly data from emigrant_yearlyData collection
export const fetchYearlyData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "emigrant_yearlyData"));
    const yearlyData = [];
    
    console.log('fetchYearlyData - Query snapshot size:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('fetchYearlyData - Document data:', doc.id, data);
      
      // Parse the document - document ID is the year, data contains count
      const year = parseInt(doc.id);
      const count = data.count || 0;
      
      console.log('fetchYearlyData - Adding record:', {
        id: doc.id,
        year: year,
        count: count
      });
      
      yearlyData.push({
        id: doc.id,
        year: year,
        count: count
      });
    });
    
    console.log('fetchYearlyData - Final data array:', yearlyData);
    return yearlyData.sort((a, b) => a.year - b.year);
  } catch (error) {
    console.error("Error fetching yearly data:", error);
    throw error;
  }
};

// Add yearly data for a specific year
export const addYearlyData = async (year, count) => {
  try {
    const docRef = doc(db, "emigrant_yearlyData", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      throw new Error(`Yearly data for year ${year} already exists`);
    }
    
    await setDoc(docRef, { count: parseInt(count) });
    
    console.log(`Successfully added yearly data for year ${year}`);
    return { year: parseInt(year), count: parseInt(count) };
  } catch (error) {
    console.error("Error adding yearly data:", error);
    throw error;
  }
};

// Update yearly data for a specific year
export const updateYearlyData = async (year, count) => {
  try {
    const docRef = doc(db, "emigrant_yearlyData", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Yearly data for year ${year} not found`);
    }
    
    await updateDoc(docRef, { count: parseInt(count) });
    
    console.log(`Successfully updated yearly data for year ${year}`);
    return { year: parseInt(year), count: parseInt(count) };
  } catch (error) {
    console.error("Error updating yearly data:", error);
    throw error;
  }
};

// Delete yearly data for a specific year
export const deleteYearlyData = async (year) => {
  try {
    const docRef = doc(db, "emigrant_yearlyData", year.toString());
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Yearly data for year ${year} not found`);
    }
    
    await deleteDoc(docRef);
    
    console.log(`Successfully deleted yearly data for year ${year}`);
    return { year: parseInt(year), deleted: true };
  } catch (error) {
    console.error("Error deleting yearly data:", error);
    throw error;
  }
};

// ========== ORIGINAL COLLECTION FUNCTIONS ==========

// Fetch data from collection
export const fetchData = async (datasetType) => {
  try {
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
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
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
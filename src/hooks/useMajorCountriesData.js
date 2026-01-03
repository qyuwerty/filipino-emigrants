import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { addMajorCountriesData, updateMajorCountriesData, deleteMajorCountriesData, deleteMajorCountriesGroup } from '../services/firestoreService';

export const useMajorCountriesData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up real-time listener for major countries data
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const unsubscribe = onSnapshot(collection(db, "emigrant_majorCountry"), (snapshot) => {
      try {
        const majorCountriesData = [];
        const processedDocs = new Set();
        
        // Process document changes first (for real-time updates)
        snapshot.docChanges().forEach((change) => {
          const doc = change.doc;
          const data = doc.data();
          const year = doc.id;
          
          processedDocs.add(year);
          
          if (change.type === 'removed') {
            console.log(`Document removed: ${year}`);
            // Document was deleted, don't add it to majorCountriesData
            return;
          }
          
          // Process countries field - handle object format
          const countriesField = data.countries || data["countries"];
          if (countriesField) {
            console.log(`Processing change for year ${year}:`, countriesField);
            console.log(`Document ${year} raw data:`, data);
            console.log(`Countries field extracted:`, countriesField);
            console.log(`Countries field type:`, typeof countriesField);
            console.log(`Is array:`, Array.isArray(countriesField));
            
            if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
              console.log(`Processing as object with ${Object.keys(countriesField).length} items`);
              // Object format: {"AUSTRALIA": 2752, "CANADA": 5226, "UNITED_STATES": 12345}
              Object.entries(countriesField).forEach(([country, count]) => {
                console.log(`Object entry - country: ${country}, count: ${count}`);
                majorCountriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            } else if (Array.isArray(countriesField)) {
              console.log(`Countries field is array, converting to object format`);
              // Handle array format as fallback
              countriesField.forEach((countryEntry, index) => {
                console.log(`Array item ${index}:`, countryEntry);
                const country = countryEntry.country;
                const count = countryEntry.count;
                console.log(`Extracted country: ${country}, count: ${count}`);
                
                majorCountriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            } else {
              console.log(`Countries field is neither object nor array, type: ${typeof countriesField}`);
            }
          } else {
            console.log(`No countries field found for year ${year}`);
          }
        });
        
        // Process all documents for initial load and to catch any missed ones
        snapshot.forEach((doc) => {
          const data = doc.data();
          const year = doc.id;
          
          // Skip already processed docs
          if (processedDocs.has(year)) return;
          
          // Process countries field - handle object format
          const countriesField = data.countries || data["countries"];
          if (countriesField) {
            console.log(`Processing existing year ${year}:`, countriesField);
            console.log(`Document ${year} raw data (existing):`, data);
            console.log(`Countries field extracted (existing):`, countriesField);
            console.log(`Countries field type (existing):`, typeof countriesField);
            console.log(`Is array (existing):`, Array.isArray(countriesField));
            
            if (typeof countriesField === 'object' && !Array.isArray(countriesField)) {
              console.log(`Processing as object with ${Object.keys(countriesField).length} items (existing)`);
              // Object format: {"AUSTRALIA": 2752, "CANADA": 5226, "UNITED_STATES": 12345}
              Object.entries(countriesField).forEach(([country, count]) => {
                console.log(`Object entry - country: ${country}, count: ${count} (existing)`);
                majorCountriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            } else if (Array.isArray(countriesField)) {
              console.log(`Countries field is array, converting to object format (existing)`);
              // Handle array format as fallback
              countriesField.forEach((countryEntry, index) => {
                console.log(`Array item ${index} (existing):`, countryEntry);
                const country = countryEntry.country;
                const count = countryEntry.count;
                console.log(`Extracted country: ${country}, count: ${count} (existing)`);
                
                majorCountriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            } else {
              console.log(`Countries field is neither object nor array (existing), type: ${typeof countriesField}`);
            }
          } else {
            console.log(`No countries field found for year ${year} (existing)`);
          }
        });
        
        // Sort by year
        const sortedData = majorCountriesData.sort((a, b) => a.year - b.year);
        setData(sortedData);
        setLoading(false);
        
        console.log("Real-time major countries data updated:", sortedData.length, "records");
        console.log("Countries found:", [...new Set(sortedData.map(item => item.country))]);
        console.log("Years found:", [...new Set(sortedData.map(item => item.year))].sort());
        console.log("Sample data records:", sortedData.slice(0, 3));
      } catch (err) {
        console.error('Error processing real-time major countries data:', err);
        setError(err.message || 'Failed to process major countries data');
        setLoading(false);
      }
    }, (err) => {
      console.error('Error listening to major countries data:', err);
      setError(err.message || 'Failed to listen to major countries data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add new major country data
  const addRecord = async (country, year, count) => {
    try {
      console.log(`Adding data for ${country}, year ${year}, count ${count}`);
      await addMajorCountriesData(country, year, count);
      console.log('Successfully added major countries data');
    } catch (error) {
      console.error('Error adding major countries data:', error);
      throw error;
    }
  };

  // Update existing major country data
  const updateRecord = async (country, year, count) => {
    try {
      console.log(`Updating data for ${country}, year ${year}, count ${count}`);
      await updateMajorCountriesData(country, year, count);
      console.log('Successfully updated major countries data');
    } catch (error) {
      console.error('Error updating major countries data:', error);
      throw error;
    }
  };

  // Delete major country data (specific year or entire country)
  const deleteRecord = async (country, year, deleteAll = false) => {
    try {
      if (deleteAll) {
        console.log(`Deleting entire country: ${country}`);
        await deleteMajorCountriesGroup(country);
        console.log('Successfully deleted entire country from all years');
      } else {
        console.log(`Deleting year ${year} from country ${country}`);
        await deleteMajorCountriesData(country, year, false);
        console.log('Successfully deleted country from year');
      }
    } catch (error) {
      console.error('Error deleting major countries data:', error);
      throw error;
    }
  };

  // Remove specific country group
  const removeCountryGroup = async (country) => {
    try {
      console.log(`Removing country group: ${country}`);
      await deleteMajorCountriesGroup(country);
      console.log('Successfully removed country group');
    } catch (error) {
      console.error('Error removing country group:', error);
      throw error;
    }
  };

  return {
    data,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    removeCountryGroup
  };
};

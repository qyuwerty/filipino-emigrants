import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { addCountriesData, updateCountriesData, deleteCountriesData, deleteCountriesGroup } from '../services/firestoreService';

export const useCountriesData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up real-time listener for countries data
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const unsubscribe = onSnapshot(collection(db, "emigrant_allCountries"), (snapshot) => {
      try {
        const countriesData = [];
        const processedDocs = new Set();
        
        // Process document changes first (for real-time updates)
        snapshot.docChanges().forEach((change) => {
          const doc = change.doc;
          const data = doc.data();
          const country = doc.id;
          
          processedDocs.add(country);
          
          if (change.type === 'removed') {
            console.log(`Document removed: ${country}`);
            // Document was deleted, don't add it to countriesData
            return;
          }
          
          // Process data field - handle both object and array formats
          const dataField = data.data || data["data"];
          console.log(`Document ${country} raw data:`, data);
          console.log(`Data field extracted:`, dataField);
          console.log(`Data field type:`, typeof dataField);
          console.log(`Is array:`, Array.isArray(dataField));
          
          if (dataField) {
            console.log(`Processing change for ${country}:`, dataField);
            
            if (Array.isArray(dataField)) {
              console.log(`Processing as array with ${dataField.length} items`);
              // Array format: [{"year": 1981, "count": 123}, {"year": 1982, "count": 456}]
              dataField.forEach((yearEntry, index) => {
                console.log(`Array item ${index}:`, yearEntry);
                const year = yearEntry.year;
                const count = yearEntry.count;
                console.log(`Extracted year: ${year}, count: ${count}`);
                
                countriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            } else if (typeof dataField === 'object') {
              console.log(`Processing as object with keys:`, Object.keys(dataField));
              // Object format: {"1981": 123, "1982": 456}
              Object.entries(dataField).forEach(([year, count]) => {
                console.log(`Object entry - year: ${year}, count: ${count}`);
                countriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            }
          } else {
            console.log(`No data field found for ${country}`);
          }
        });
        
        // Process all documents for initial load and to catch any missed ones
        snapshot.forEach((doc) => {
          const data = doc.data();
          const country = doc.id;
          
          // Skip already processed docs
          if (processedDocs.has(country)) return;
          
          // Process data field - handle both object and array formats
          const dataField = data.data || data["data"];
          console.log(`Document ${country} raw data (existing):`, data);
          console.log(`Data field extracted (existing):`, dataField);
          console.log(`Data field type (existing):`, typeof dataField);
          console.log(`Is array (existing):`, Array.isArray(dataField));
          
          if (dataField) {
            console.log(`Processing existing ${country}:`, dataField);
            
            if (Array.isArray(dataField)) {
              console.log(`Processing as array with ${dataField.length} items (existing)`);
              dataField.forEach((yearEntry, index) => {
                console.log(`Array item ${index} (existing):`, yearEntry);
                const year = yearEntry.year;
                const count = yearEntry.count;
                console.log(`Extracted year: ${year}, count: ${count} (existing)`);
                
                countriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            } else if (typeof dataField === 'object') {
              console.log(`Processing as object with keys (existing):`, Object.keys(dataField));
              Object.entries(dataField).forEach(([year, count]) => {
                console.log(`Object entry - year: ${year}, count: ${count} (existing)`);
                countriesData.push({
                  id: `${country}_${year}`,
                  country: country,
                  year: parseInt(year),
                  count: count,
                  documentId: doc.id
                });
              });
            }
          } else {
            console.log(`No data field found for ${country} (existing)`);
          }
        });
        
        // Sort by year
        const sortedData = countriesData.sort((a, b) => a.year - b.year);
        setData(sortedData);
        setLoading(false);
        
        console.log("Real-time countries data updated:", sortedData.length, "records");
        console.log("Countries found:", [...new Set(sortedData.map(item => item.country))]);
        console.log("Years found:", [...new Set(sortedData.map(item => item.year))].sort());
        console.log("Sample data records:", sortedData.slice(0, 3));
      } catch (err) {
        console.error('Error processing real-time countries data:', err);
        setError(err.message || 'Failed to process countries data');
        setLoading(false);
      }
    }, (err) => {
      console.error('Error listening to countries data:', err);
      setError(err.message || 'Failed to listen to countries data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add new country data
  const addRecord = async (country, year, count) => {
    try {
      console.log(`Adding data for ${country}, year ${year}, count ${count}`);
      await addCountriesData(country, year, count);
      console.log('Successfully added countries data');
    } catch (error) {
      console.error('Error adding countries data:', error);
      throw error;
    }
  };

  // Update existing country data
  const updateRecord = async (country, year, count) => {
    try {
      console.log(`Updating data for ${country}, year ${year}, count ${count}`);
      await updateCountriesData(country, year, count);
      console.log('Successfully updated countries data');
    } catch (error) {
      console.error('Error updating countries data:', error);
      throw error;
    }
  };

  // Delete country data (specific year or entire country)
  const deleteRecord = async (country, year, deleteAll = false) => {
    try {
      if (deleteAll) {
        console.log(`Deleting entire country: ${country}`);
        await deleteCountriesGroup(country);
        console.log('Successfully deleted entire country document');
      } else {
        console.log(`Deleting year ${year} from country ${country}`);
        await deleteCountriesData(country, year, false);
        console.log('Successfully deleted year from country');
      }
    } catch (error) {
      console.error('Error deleting countries data:', error);
      throw error;
    }
  };

  // Remove specific country group
  const removeCountryGroup = async (country) => {
    try {
      console.log(`Removing country group: ${country}`);
      await deleteCountriesGroup(country);
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

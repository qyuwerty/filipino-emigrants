import { useState, useEffect, useCallback } from 'react';
import { fetchAgeData, addAgeData, updateAgeData, deleteAgeData, deleteAgeGroup } from '../services/firestoreService';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export const useAgeData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up real-time listener for age data
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const unsubscribe = onSnapshot(collection(db, "emigrant_age"), (snapshot) => {
      try {
        const ageData = [];
        const processedDocs = new Set();
        
        // Process document changes first (for real-time updates)
        snapshot.docChanges().forEach((change) => {
          const doc = change.doc;
          const data = doc.data();
          const ageGroup = doc.id;
          
          // Skip No_Response field
          if (ageGroup === 'No_Response') return;
          
          processedDocs.add(ageGroup);
          
          if (change.type === 'removed') {
            console.log(`Document removed: ${ageGroup}`);
            // Document was deleted, don't add it to ageData
            return;
          }
          
          // Process yearly_data - handle both object and array formats
          const yearlyDataField = data.yearly_data || data["yearly-data"];
          if (yearlyDataField) {
            console.log(`Processing change for ${ageGroup}:`, yearlyDataField);
            
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
        
        // Process all documents for initial load and to catch any missed ones
        snapshot.forEach((doc) => {
          const data = doc.data();
          const ageGroup = doc.id;
          
          // Skip No_Response field and already processed docs
          if (ageGroup === 'No_Response' || processedDocs.has(ageGroup)) return;
          
          // Process yearly_data - handle both object and array formats
          const yearlyDataField = data.yearly_data || data["yearly-data"];
          if (yearlyDataField) {
            console.log(`Processing existing ${ageGroup}:`, yearlyDataField);
            
            if (Array.isArray(yearlyDataField)) {
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
        
        // Sort by year
        const sortedData = ageData.sort((a, b) => a.year - b.year);
        setData(sortedData);
        setLoading(false);
        
        console.log("Real-time age data updated:", sortedData.length, "records");
        console.log("Age groups found:", [...new Set(sortedData.map(item => item.ageGroup))]);
      } catch (err) {
        console.error('Error processing real-time age data:', err);
        setError(err.message || 'Failed to process age data');
        setLoading(false);
      }
    }, (err) => {
      console.error('Error listening to age data:', err);
      setError(err.message || 'Failed to listen to age data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add new age record
  const addRecord = useCallback(async (ageGroup, year, count) => {
    try {
      console.log("Adding age record:", { ageGroup, year, count });
      const newRecord = await addAgeData(ageGroup, year, count);
      console.log("Age record added successfully:", newRecord);
      return newRecord;
    } catch (err) {
      console.error('Error adding age record:', err);
      throw err;
    }
  }, []);

  // Update existing age record
  const updateRecord = useCallback(async (ageGroup, year, count) => {
    try {
      console.log("Updating age record:", { ageGroup, year, count });
      const updatedRecord = await updateAgeData(ageGroup, year, count);
      console.log("Age record updated successfully:", updatedRecord);
      return updatedRecord;
    } catch (err) {
      console.error('Error updating age record:', err);
      throw err;
    }
  }, []);

  // Delete age record
  const removeRecord = useCallback(async (ageGroup, year, deleteAll = false) => {
    try {
      if (deleteAll) {
        console.log("Deleting entire age group:", { ageGroup });
        await deleteAgeGroup(ageGroup);
        console.log("Age group deleted successfully");
      } else {
        console.log("Deleting age record:", { ageGroup, year });
        await deleteAgeData(ageGroup, year, false);
        console.log("Age record deleted successfully");
      }
    } catch (err) {
      console.error('Error deleting age record:', err);
      throw err;
    }
  }, []);

  // Delete entire age group
  const removeAgeGroup = useCallback(async (ageGroup) => {
    try {
      console.log("Deleting entire age group:", { ageGroup });
      await deleteAgeGroup(ageGroup);
      console.log("Age group deleted successfully");
    } catch (err) {
      console.error('Error deleting age group:', err);
      throw err;
    }
  }, []);

  // Manual refetch function (fallback)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchAgeData();
      setData(records);
      console.log("Manual fetch completed:", records.length, "records");
    } catch (err) {
      console.error('Error fetching age data:', err);
      setError(err.message || 'Failed to fetch age data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    addRecord,
    updateRecord,
    removeRecord,
    removeAgeGroup
  };
};

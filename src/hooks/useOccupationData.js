import { useState, useEffect } from 'react';
import { 
  fetchOccupationData, 
  addOccupationData, 
  updateOccupationData, 
  deleteOccupationData, 
  deleteOccupationGroup 
} from '../services/firestoreService';

export const useOccupationData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time listener for occupation data
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Initial fetch
    const loadData = async () => {
      try {
        console.log("Loading occupation data...");
        const occupationData = await fetchOccupationData();
        console.log("Occupation data loaded:", occupationData);
        setData(occupationData);
        setLoading(false);
      } catch (err) {
        console.error("Error loading occupation data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Add new occupation data
  const addRecord = async (occupation, year, count) => {
    try {
      console.log("Adding occupation record:", { occupation, year, count });
      await addOccupationData(occupation, year, count);
      
      // Refresh data
      const updatedData = await fetchOccupationData();
      setData(updatedData);
      
      return { occupation, year, count };
    } catch (err) {
      console.error("Error adding occupation record:", err);
      throw err;
    }
  };

  // Update existing occupation data
  const updateRecord = async (occupation, year, count) => {
    try {
      console.log("Updating occupation record:", { occupation, year, count });
      await updateOccupationData(occupation, year, count);
      
      // Refresh data
      const updatedData = await fetchOccupationData();
      setData(updatedData);
      
      return { occupation, year, count };
    } catch (err) {
      console.error("Error updating occupation record:", err);
      throw err;
    }
  };

  // Delete occupation data
  const deleteRecord = async (occupation, year, deleteAll = false) => {
    try {
      console.log("Deleting occupation record:", { occupation, year, deleteAll });
      await deleteOccupationData(occupation, year, deleteAll);
      
      // Refresh data
      const updatedData = await fetchOccupationData();
      setData(updatedData);
      
      return { occupation, year, deleted: true };
    } catch (err) {
      console.error("Error deleting occupation record:", err);
      throw err;
    }
  };

  // Delete entire occupation group
  const removeOccupationGroup = async (occupation) => {
    try {
      console.log("Removing occupation group:", occupation);
      await deleteOccupationGroup(occupation);
      
      // Refresh data
      const updatedData = await fetchOccupationData();
      setData(updatedData);
      
      return { occupation, deleted: true };
    } catch (err) {
      console.error("Error removing occupation group:", err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    removeOccupationGroup
  };
};

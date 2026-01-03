import { useState, useEffect } from 'react';
import { 
  fetchCivilStatusData, 
  addCivilStatusData, 
  updateCivilStatusData, 
  deleteCivilStatusData 
} from '../services/firestoreService';

export const useCivilStatusData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const civilStatusData = await fetchCivilStatusData();
        console.log('useCivilStatusData - Fetched data:', civilStatusData);
        setData(civilStatusData);
        setError(null);
      } catch (err) {
        console.error('Error loading civil status data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh data function
  const refreshData = async () => {
    try {
      setLoading(true);
      const civilStatusData = await fetchCivilStatusData();
      setData(civilStatusData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing civil status data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new civil status data record
  const addRecord = async (year, divorced, married, separated, single, widower) => {
    try {
      const newRecord = await addCivilStatusData(year, divorced, married, separated, single, widower);
      await refreshData(); // Refresh all data after adding
      return newRecord;
    } catch (err) {
      console.error('Error adding civil status record:', err);
      throw err;
    }
  };

  // Update existing civil status data record
  const updateRecord = async (year, divorced, married, separated, single, widower) => {
    try {
      const updatedRecord = await updateCivilStatusData(year, divorced, married, separated, single, widower);
      await refreshData(); // Refresh all data after updating
      return updatedRecord;
    } catch (err) {
      console.error('Error updating civil status record:', err);
      throw err;
    }
  };

  // Delete civil status data record
  const deleteRecord = async (year) => {
    try {
      await deleteCivilStatusData(year);
      await refreshData(); // Refresh all data after deleting
    } catch (err) {
      console.error('Error deleting civil status record:', err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refreshData,
    addRecord,
    updateRecord,
    deleteRecord
  };
};

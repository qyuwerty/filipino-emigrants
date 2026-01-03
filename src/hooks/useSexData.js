import { useState, useEffect } from 'react';
import { 
  fetchSexData, 
  addSexData, 
  updateSexData, 
  deleteSexData 
} from '../services/firestoreService';

export const useSexData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const sexData = await fetchSexData();
        setData(sexData);
        setError(null);
      } catch (err) {
        console.error('Error loading sex data:', err);
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
      const sexData = await fetchSexData();
      setData(sexData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing sex data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new sex data record
  const addRecord = async (year, female, male) => {
    try {
      const newRecord = await addSexData(year, female, male);
      await refreshData(); // Refresh all data after adding
      return newRecord;
    } catch (err) {
      console.error('Error adding sex record:', err);
      throw err;
    }
  };

  // Update existing sex data record
  const updateRecord = async (year, female, male) => {
    try {
      const updatedRecord = await updateSexData(year, female, male);
      await refreshData(); // Refresh all data after updating
      return updatedRecord;
    } catch (err) {
      console.error('Error updating sex record:', err);
      throw err;
    }
  };

  // Delete sex data record
  const deleteRecord = async (year) => {
    try {
      await deleteSexData(year);
      await refreshData(); // Refresh all data after deleting
    } catch (err) {
      console.error('Error deleting sex record:', err);
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

import { useState, useEffect } from 'react';
import { 
  fetchEducationData, 
  addEducationData, 
  updateEducationData, 
  deleteEducationData 
} from '../services/firestoreService';

export const useEducationData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const educationData = await fetchEducationData();
        console.log('useEducationData - Fetched data:', educationData);
        setData(educationData);
        setError(null);
      } catch (err) {
        console.error('Error loading education data:', err);
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
      const educationData = await fetchEducationData();
      setData(educationData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing education data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new education data record
  const addRecord = async (educationGroup, year, count) => {
    try {
      const newRecord = await addEducationData(educationGroup, year, count);
      await refreshData(); // Refresh all data after adding
      return newRecord;
    } catch (err) {
      console.error('Error adding education record:', err);
      throw err;
    }
  };

  // Update existing education data record
  const updateRecord = async (educationGroup, year, count) => {
    try {
      const updatedRecord = await updateEducationData(educationGroup, year, count);
      await refreshData(); // Refresh all data after updating
      return updatedRecord;
    } catch (err) {
      console.error('Error updating education record:', err);
      throw err;
    }
  };

  // Delete education data record
  const deleteRecord = async (educationGroup, year) => {
    try {
      await deleteEducationData(educationGroup, year);
      await refreshData(); // Refresh all data after deleting
    } catch (err) {
      console.error('Error deleting education record:', err);
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

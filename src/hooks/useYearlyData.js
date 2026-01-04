import { useState, useEffect } from 'react';
import {
  fetchYearlyData,
  addYearlyData,
  updateYearlyData,
  deleteYearlyData
} from '../services/firestoreService';

export const useYearlyData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const yearlyData = await fetchYearlyData();
      setData(yearlyData);
      console.log('useYearlyData - Data fetched successfully:', yearlyData);
    } catch (err) {
      console.error('useYearlyData - Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new yearly data
  const addRecord = async (year, count) => {
    try {
      const newData = await addYearlyData(year, count);
      setData(prev => [...prev, newData]);
      console.log('useYearlyData - Data added successfully:', newData);
      return newData;
    } catch (err) {
      console.error('useYearlyData - Error adding data:', err);
      setError(err.message);
      throw err;
    }
  };

  // Update yearly data
  const updateRecord = async (year, count) => {
    try {
      const updatedData = await updateYearlyData(year, count);
      setData(prev => prev.map(item => 
        item.year === parseInt(year) ? updatedData : item
      ));
      console.log('useYearlyData - Data updated successfully:', updatedData);
      return updatedData;
    } catch (err) {
      console.error('useYearlyData - Error updating data:', err);
      setError(err.message);
      throw err;
    }
  };

  // Delete yearly data
  const deleteRecord = async (year) => {
    try {
      await deleteYearlyData(year);
      setData(prev => prev.filter(item => item.year !== parseInt(year)));
      console.log('useYearlyData - Data deleted successfully for year:', year);
    } catch (err) {
      console.error('useYearlyData - Error deleting data:', err);
      setError(err.message);
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    addRecord,
    updateRecord,
    deleteRecord
  };
};

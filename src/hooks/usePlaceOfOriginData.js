import { useState, useEffect } from 'react';
import { 
  fetchPlaceOfOriginData, 
  addPlaceOfOriginData, 
  updatePlaceOfOriginData, 
  deletePlaceOfOriginData 
} from '../services/firestoreService';

export const usePlaceOfOriginData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const placeOfOriginData = await fetchPlaceOfOriginData();
        console.log('usePlaceOfOriginData - Fetched data:', placeOfOriginData);
        setData(placeOfOriginData);
        setError(null);
      } catch (err) {
        console.error('Error loading place of origin data:', err);
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
      const placeOfOriginData = await fetchPlaceOfOriginData();
      setData(placeOfOriginData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing place of origin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add new place of origin data record
  const addRecord = async (region, year, count) => {
    try {
      const newRecord = await addPlaceOfOriginData(region, year, count);
      await refreshData(); // Refresh all data after adding
      return newRecord;
    } catch (err) {
      console.error('Error adding place of origin record:', err);
      throw err;
    }
  };

  // Update existing place of origin data record
  const updateRecord = async (region, year, count) => {
    try {
      const updatedRecord = await updatePlaceOfOriginData(region, year, count);
      await refreshData(); // Refresh all data after updating
      return updatedRecord;
    } catch (err) {
      console.error('Error updating place of origin record:', err);
      throw err;
    }
  };

  // Delete place of origin data record
  const deleteRecord = async (region, year) => {
    try {
      await deletePlaceOfOriginData(region, year);
      await refreshData(); // Refresh all data after deleting
    } catch (err) {
      console.error('Error deleting place of origin record:', err);
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

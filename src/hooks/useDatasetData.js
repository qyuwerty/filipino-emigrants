import { useState, useEffect, useCallback } from 'react';
import { fetchRecordsByDataset, addRecordWithDataset, updateRecordWithDataset, deleteRecord } from '../services/firestoreService';

export const useDatasetData = (datasetType) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data for specific dataset
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await fetchRecordsByDataset(datasetType);
      setData(records);
    } catch (err) {
      console.error(`Error fetching ${datasetType} data:`, err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [datasetType]);

  // Add new record
  const addRecord = useCallback(async (recordData) => {
    try {
      const newRecord = await addRecordWithDataset(recordData, datasetType);
      setData(prev => [...prev, newRecord]);
      return newRecord;
    } catch (err) {
      console.error(`Error adding ${datasetType} record:`, err);
      throw err;
    }
  }, [datasetType]);

  // Update existing record
  const updateRecord = useCallback(async (id, recordData) => {
    try {
      const updatedRecord = await updateRecordWithDataset(id, recordData, datasetType);
      setData(prev => prev.map(record => 
        record.id === id ? { ...record, ...updatedRecord } : record
      ));
      return updatedRecord;
    } catch (err) {
      console.error(`Error updating ${datasetType} record:`, err);
      throw err;
    }
  }, [datasetType]);

  // Delete record
  const removeRecord = useCallback(async (id) => {
    try {
      await deleteRecord(id);
      setData(prev => prev.filter(record => record.id !== id));
    } catch (err) {
      console.error(`Error deleting ${datasetType} record:`, err);
      throw err;
    }
  }, [datasetType]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    addRecord,
    updateRecord,
    removeRecord
  };
};

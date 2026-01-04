import { useState, useEffect } from 'react';
import {
  fetchCountriesData
} from '../services/firestoreService';

export const useAllCountriesData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const allCountriesData = await fetchCountriesData();
      setData(allCountriesData);
      console.log('useAllCountriesData - Data fetched successfully:', allCountriesData);
    } catch (err) {
      console.error('useAllCountriesData - Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
    fetchData
  };
};

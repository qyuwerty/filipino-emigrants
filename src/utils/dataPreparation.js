// src/utils/dataPreparation.js
import * as tf from '@tensorflow/tfjs';

/**
 * Min-Max Scaler for normalizing data
 */
class MinMaxScaler {
  constructor() {
    this.min = null;
    this.max = null;
  }

  fit(data) {
    this.min = Math.min(...data);
    this.max = Math.max(...data);
  }

  transform(data) {
    if (this.min === null || this.max === null) {
      throw new Error('Scaler not fitted. Call fit() first.');
    }
    
    const range = this.max - this.min;
    if (range === 0) return data.map(() => 0);
    
    return data.map(value => (value - this.min) / range);
  }

  fitTransform(data) {
    this.fit(data);
    return this.transform(data);
  }

  inverse(normalizedValue) {
    if (this.min === null || this.max === null) {
      throw new Error('Scaler not fitted. Call fit() first.');
    }
    
    const range = this.max - this.min;
    return normalizedValue * range + this.min;
  }
}

/**
 * Create sequences for time series prediction
 * @param {Array} data - Time series data
 * @param {number} lookback - Number of time steps to look back
 * @returns {Object} - { X, Y } sequences
 */
function createSequences(data, lookback) {
  const X = [];
  const Y = [];

  for (let i = lookback; i < data.length; i++) {
    X.push(data.slice(i - lookback, i));
    Y.push(data[i]);
  }

  return { X, Y };
}

/**
 * Prepare time series data for ML training
 * @param {Array} rawData - Array of emigrant records with year and value columns
 * @param {number} lookback - Number of past years to consider
 * @param {string} targetColumn - Column to predict (default: total emigrants)
 * @returns {Object} - Prepared tensors and metadata
 */
export function prepareTimeSeriesData(rawData, lookback, targetColumn = null) {
  if (!rawData || rawData.length === 0) {
    throw new Error('No data provided for time series preparation');
  }

  // Find year column (case insensitive)
  const yearColumn = Object.keys(rawData[0]).find(
    key => key.toLowerCase() === 'year'
  );

  if (!yearColumn) {
    throw new Error('No "year" column found in data');
  }

  // Sort data by year
  const sortedData = [...rawData].sort((a, b) => a[yearColumn] - b[yearColumn]);

  // Determine target column
  let valueColumn = targetColumn;
  if (!valueColumn) {
    // If not specified, try to find a numeric column (excluding year)
    const numericColumns = Object.keys(sortedData[0]).filter(key => {
      const val = sortedData[0][key];
      return key !== yearColumn && 
             key !== 'id' && 
             !isNaN(val) && 
             typeof val === 'number';
    });

    if (numericColumns.length === 0) {
      throw new Error('No numeric columns found for prediction');
    }

    valueColumn = numericColumns[0];
  }

  console.log(`Preparing time series for column: ${valueColumn}`);

  // Extract values and years
  const values = sortedData.map(row => row[valueColumn]);
  const years = sortedData.map(row => row[yearColumn]);

  if (values.some(v => v === null || v === undefined || isNaN(v))) {
    throw new Error(`Column "${valueColumn}" contains invalid values`);
  }

  // Normalize data
  const scaler = new MinMaxScaler();
  const normalizedValues = scaler.fitTransform(values);

  // Create sequences
  const { X, Y } = createSequences(normalizedValues, lookback);

  if (X.length === 0) {
    throw new Error(`Not enough data for lookback=${lookback}. Need at least ${lookback + 1} records.`);
  }

  // Split into train/test (80/20)
  const trainSize = Math.floor(X.length * 0.8);
  
  const trainX = X.slice(0, trainSize);
  const trainY = Y.slice(0, trainSize);
  const testX = X.slice(trainSize);
  const testY = Y.slice(trainSize);

  // Convert to TensorFlow tensors
  const trainXTensor = tf.tensor3d(
    trainX.map(seq => seq.map(val => [val])),
    [trainX.length, lookback, 1]
  );
  
  const trainYTensor = tf.tensor2d(
    trainY.map(val => [val]),
    [trainY.length, 1]
  );
  
  const testXTensor = tf.tensor3d(
    testX.map(seq => seq.map(val => [val])),
    [testX.length, lookback, 1]
  );
  
  const testYTensor = tf.tensor2d(
    testY.map(val => [val]),
    [testY.length, 1]
  );

  console.log('Data preparation complete:', {
    totalSamples: X.length,
    trainSamples: trainX.length,
    testSamples: testX.length,
    lookback: lookback,
    targetColumn: valueColumn
  });

  return {
    trainX: trainXTensor,
    trainY: trainYTensor,
    testX: testXTensor,
    testY: testYTensor,
    scaler: scaler,
    years: years.slice(lookback), // Years corresponding to predictions
    originalValues: values,
    targetColumn: valueColumn
  };
}

/**
 * Aggregate emigrant data by year (sum all numeric columns)
 * @param {Array} rawData - Raw emigrant records
 * @returns {Array} - Aggregated data by year
 */
export function aggregateByYear(rawData) {
  if (!rawData || rawData.length === 0) return [];

  const yearColumn = Object.keys(rawData[0]).find(
    key => key.toLowerCase() === 'year'
  );

  if (!yearColumn) {
    throw new Error('No "year" column found in data');
  }

  // Group by year
  const yearGroups = {};
  
  rawData.forEach(row => {
    const year = row[yearColumn];
    if (!yearGroups[year]) {
      yearGroups[year] = { [yearColumn]: year };
    }

    // Sum all numeric columns
    Object.keys(row).forEach(key => {
      if (key !== yearColumn && key !== 'id' && !isNaN(row[key])) {
        yearGroups[year][key] = (yearGroups[year][key] || 0) + Number(row[key]);
      }
    });
  });

  return Object.values(yearGroups).sort((a, b) => a[yearColumn] - b[yearColumn]);
}

/**
 * Calculate total emigrants per year (sum of all status columns)
 * @param {Array} rawData - Raw emigrant records
 * @returns {Array} - Data with total column
 */
export function calculateTotals(rawData) {
  const yearColumn = Object.keys(rawData[0] || {}).find(
    key => key.toLowerCase() === 'year'
  );

  return rawData.map(row => {
    let total = 0;
    Object.keys(row).forEach(key => {
      if (key !== yearColumn && key !== 'id' && !isNaN(row[key])) {
        total += Number(row[key]);
      }
    });
    
    return {
      ...row,
      total: total
    };
  });
}

export { MinMaxScaler };
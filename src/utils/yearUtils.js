/**
 * Year Column Utility Functions
 * Shared logic for detecting and working with Year columns
 */

/**
 * Historical Filipino Emigrants Data (2015-2020)
 * Source: LSTM Model Testing Results - Actual vs Predicted Values
 * This data represents the actual number of Filipino emigrants by year
 */
export const HISTORICAL_EMIGRANTS_DATA = [
  { year: 2015, emigrants: 4248, predicted: 3130.613, error: -1117.387 },
  { year: 2016, emigrants: 4204, predicted: 3164.623, error: -1039.377 },
  { year: 2017, emigrants: 3597, predicted: 3312.864, error: -284.136 },
  { year: 2018, emigrants: 3346, predicted: 3371.521, error: 25.521 },
  { year: 2019, emigrants: 2949, predicted: 3236.394, error: 287.394 },
  { year: 2020, emigrants: 602, predicted: 3038.953, error: 2436.953 }
];

/**
 * Gets historical emigrants data for chart visualization
 * @param {boolean} includePredicted - Whether to include predicted values
 * @param {boolean} includeError - Whether to include error values
 * @returns {Array} - Formatted historical data for charts
 */
export const getHistoricalEmigrantsData = (includePredicted = true, includeError = false) => {
  return HISTORICAL_EMIGRANTS_DATA.map(item => {
    const chartData = {
      year: item.year,
      emigrants: item.emigrants
    };
    
    if (includePredicted) {
      chartData.predicted = Math.round(item.predicted);
    }
    
    if (includeError) {
      chartData.error = item.error;
      chartData.absError = Math.abs(item.error);
    }
    
    return chartData;
  });
};

/**
 * Gets historical data for a specific year range
 * @param {number} startYear - Starting year
 * @param {number} endYear - Ending year
 * @returns {Array} - Filtered historical data
 */
export const getHistoricalDataByRange = (startYear, endYear) => {
  return HISTORICAL_EMIGRANTS_DATA.filter(
    item => item.year >= startYear && item.year <= endYear
  );
};

/**
 * Calculates summary statistics for historical data
 * @returns {Object} - Summary statistics
 */
export const getHistoricalDataStats = () => {
  const data = HISTORICAL_EMIGRANTS_DATA;
  const totalEmigrants = data.reduce((sum, item) => sum + item.emigrants, 0);
  const avgEmigrants = totalEmigrants / data.length;
  const maxEmigrants = Math.max(...data.map(item => item.emigrants));
  const minEmigrants = Math.min(...data.map(item => item.emigrants));
  
  // Error statistics
  const errors = data.map(item => item.error);
  const avgError = errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length;
  const maxError = Math.max(...errors.map(error => Math.abs(error)));
  
  return {
    totalEmigrants,
    avgEmigrants: Math.round(avgEmigrants),
    maxEmigrants,
    minEmigrants,
    avgError: Math.round(avgError),
    maxError: Math.round(maxError),
    years: data.length,
    yearRange: `${Math.min(...data.map(item => item.year))}-${Math.max(...data.map(item => item.year))}`
  };
};

/**
 * Finds the Year column name from dataset
 * @param {Array} data - Dataset array
 * @returns {string|null} - Year column name or null
 */
export const findYearColumn = (data) => {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0] || {});
  return columns.find(col => col.toLowerCase() === 'year') || null;
};

/**
 * Extracts comprehensive Year column data from dataset
 * @param {Array} data - Dataset array
 * @returns {Object|null} - Year column data object
 */
export const getYearColumnData = (data) => {
  if (!data || data.length === 0) return null;
  
  // Find Year column name
  const yearColumnName = Object.keys(data[0] || {}).find(
    key => key.toLowerCase() === 'year'
  );
  
  if (!yearColumnName) return null;
  
  // Extract unique years from the Year column
  const uniqueYears = [...new Set(data.map(row => row[yearColumnName]))]
    .filter(year => year !== null && year !== undefined && year !== '')
    .sort((a, b) => a - b);
  
  const yearValues = data.map(row => row[yearColumnName])
    .filter(year => year !== null && year !== undefined && year !== '');
  
  return {
    yearColumn: yearColumnName,
    years: uniqueYears,
    yearValues: yearValues,
    hasYearData: uniqueYears.length > 0
  };
};

/**
 * Reorders columns to put Year first
 * @param {Array} columns - Array of column names
 * @returns {Array} - Reordered columns with Year first
 */
export const reorderColumnsWithYearFirst = (columns) => {
  if (!columns || !Array.isArray(columns)) return columns;
  const yearColumns = columns.filter(col => col.toLowerCase() === 'year');
  const otherColumns = columns.filter(col => col.toLowerCase() !== 'year');
  return [...yearColumns, ...otherColumns];
};

/**
 * Gets all columns with Year first
 * @param {Array} data - Dataset
 * @returns {Object} - { allColumns: [], yearColumn: string|null }
 */

// Update the column extraction to handle sanitized field names
export const getColumnsWithYearFirst = (data) => {
  if (!data || data.length === 0) return { allColumns: [], yearColumn: null };
  
  const columns = new Set();
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      // Skip internal fields
      if (['id', '_id', 'timestamp', 'createdAt'].includes(key)) return;
      columns.add(key);
    });
  });
  
  // Convert to array and sort alphabetically for consistent ordering
  let allColumns = Array.from(columns).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  
  let yearColumn = null;
  
  // Identify year column
  const yearPatterns = ['year', 'Year', 'YEAR', 'tahun', 'Tahun'];
  for (const col of allColumns) {
    const colLower = col.toLowerCase();
    if (yearPatterns.some(pattern => colLower.includes(pattern.toLowerCase()))) {
      yearColumn = col;
      break;
    }
  }
  
  // Move year column to first position if found
  if (yearColumn) {
    allColumns = [yearColumn, ...allColumns.filter(col => col !== yearColumn)];
  }
  
  return { allColumns, yearColumn };
};
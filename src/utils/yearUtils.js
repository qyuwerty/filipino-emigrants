/**
 * Year Column Utility Functions
 * Shared logic for detecting and working with Year columns
 */

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
  
  let allColumns = Array.from(columns);
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
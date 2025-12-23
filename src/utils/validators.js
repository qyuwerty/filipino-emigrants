// src/utils/validators.js

/**
 * Validates CSV data before upload
 */
export const validateCsvData = (data) => {
  const errors = [];
  const warnings = [];

  

  // Check if data exists
  if (!data || data.length === 0) {
    errors.push("CSV file is empty");
    return { isValid: false, errors, warnings };
  }

  // Check minimum required columns
  const requiredColumns = ["Year"]; // Add your required columns
  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  requiredColumns.forEach(col => {
    if (!columns.includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  });

  // Validate year range
  const years = data.map(row => Number(row.Year)).filter(y => !isNaN(y));
  if (years.length > 0) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    if (minYear < 1980) {
      warnings.push(`Data contains years before 1980 (earliest: ${minYear})`);
    }
    if (maxYear > 2022) {
      warnings.push(`Data contains years after 2022 (latest: ${maxYear})`);
    }
  }

  // Check for empty rows
  const emptyRows = data.filter(row => 
    Object.values(row).every(v => v === null || v === undefined || v === "")
  );
  if (emptyRows.length > 0) {
    warnings.push(`Found ${emptyRows.length} empty row(s)`);
  }

  // Check for duplicate rows
  const stringifiedRows = data.map(row => JSON.stringify(row));
  const uniqueRows = new Set(stringifiedRows);
  if (uniqueRows.size < data.length) {
    warnings.push(`Found ${data.length - uniqueRows.size} duplicate row(s)`);
  }

  // Check for inconsistent data types in Year column
  const invalidYears = data.filter(row => {
    const year = row.Year;
    return year && (isNaN(Number(year)) || Number(year) < 1900 || Number(year) > 2100);
  });
  if (invalidYears.length > 0) {
    errors.push(`Found ${invalidYears.length} row(s) with invalid year values`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: data.length,
      columns: columns.length,
      yearRange: years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : "N/A"
    }
  };
};

/**
 * Sanitizes CSV data by removing problematic rows
 */
export const sanitizeCsvData = (data) => {
  return data
    // Remove empty rows
    .filter(row => 
      Object.values(row).some(v => v !== null && v !== undefined && v !== "")
    )
    // Trim string values
    .map(row => {
      const sanitized = {};
      Object.entries(row).forEach(([key, value]) => {
        sanitized[key] = typeof value === "string" ? value.trim() : value;
      });
      return sanitized;
    });
};

/**
 * Validates filter values
 */
export const validateFilter = (value, type) => {
  switch (type) {
    case "number":
      return !isNaN(Number(value));
    case "date":
      return !isNaN(new Date(value).getTime());
    case "boolean":
      return ["true", "false", "1", "0", "yes", "no"].includes(
        String(value).toLowerCase()
      );
    default:
      return true; // Strings always valid
  }
};
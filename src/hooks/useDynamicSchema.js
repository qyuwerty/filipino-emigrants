// src/hooks/useDynamicSchema.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Helpers
 */
const isNumericString = (v) => {
  if (v === null || v === undefined) return false;
  // allow numeric strings with whitespace
  const s = String(v).trim();
  return s !== "" && !isNaN(s);
};

const isYear = (value) => {
  const num = Number(value);
  return !isNaN(num) && num >= 1900 && num <= 2100 && num === Math.floor(num);
};

/**
 * Normalize a flat row:
 *  - trim strings
 *  - convert numeric-like values to Number
 *  - convert dotted keys like "status.single" into nested objects
 */
const normalizeRow = (row) => {
  const cleaned = {};

  // First pass: convert dotted keys into nested objects
  Object.entries(row).forEach(([rawKey, rawVal]) => {
    if (rawKey == null) return;

    const key = String(rawKey).trim();
    const val = rawVal;

    // Dotted path: e.g., "status.single"
    if (key.includes(".")) {
      const parts = key.split(".").map(p => p.trim());
      // create nested structure in cleaned
      let cursor = cleaned;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (i === parts.length - 1) {
          // last => assign value after normalization
          if (isNumericString(val)) cursor[p] = Number(String(val).trim());
          else if (typeof val === "string") cursor[p] = val.trim();
          else cursor[p] = val;
        } else {
          if (!cursor[p] || typeof cursor[p] !== "object") cursor[p] = {};
          cursor = cursor[p];
        }
      }
    } else {
      // Normal flat key
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (isNumericString(trimmed)) cleaned[key] = Number(trimmed);
        else cleaned[key] = trimmed;
      } else if (typeof val === "number") {
        cleaned[key] = val;
      } else if (isNumericString(val)) {
        cleaned[key] = Number(String(val).trim());
      } else {
        cleaned[key] = val;
      }
    }
  });

  return cleaned;
};

/**
 * Group flat child fields (single, married, ...) into a nested `status` object.
 * Also ensures child values are numeric.
 * If data already has status object, leave as-is (but normalize child values).
 */
const groupStatusFields = (data) => {
  if (!data || data.length === 0) return data;

  const sample = data[0];
  const keys = new Set(Object.keys(sample));

  // common names you use — extend if needed
  const statusCandidates = ["single", "married", "widowed", "widower", "divorced", "separated", "live_in"];

  // detect presence of any of the candidate fields
  const hasFlatStatusFields = statusCandidates.some((f) => keys.has(f));

  return data.map((row) => {
    const newRow = { ...row };

    // If row already has nested status object, ensure numeric children
    if (newRow.status && typeof newRow.status === "object" && !Array.isArray(newRow.status)) {
      Object.entries(newRow.status).forEach(([k, v]) => {
        if (isNumericString(v)) newRow.status[k] = Number(v);
        else if (typeof v === "string") newRow.status[k] = v.trim();
      });
      return newRow;
    }

    // If flat child fields exist, group them into status
    if (hasFlatStatusFields) {
      newRow.status = newRow.status || {};
      statusCandidates.forEach((f) => {
        if (newRow[f] !== undefined) {
          const v = newRow[f];
          newRow.status[f] = isNumericString(v) ? Number(v) : (v === "" ? 0 : v);
          delete newRow[f];
        }
      });
    }

    return newRow;
  });
};

/**
 * Normalize an array of rows (CSV or Firestore rows)
 * - converts each row via normalizeRow
 * - groups status fields
 */
const normalizeData = (rows) => {
  if (!rows || rows.length === 0) return [];
  const normalized = rows.map(normalizeRow);
  return groupStatusFields(normalized);
};

const sortRowsByYear = (rows = []) => {
  if (!Array.isArray(rows)) return [];

  return [...rows].sort((a, b) => {
    const aYear = Number(a?.year ?? Number.NEGATIVE_INFINITY);
    const bYear = Number(b?.year ?? Number.NEGATIVE_INFINITY);
    if (Number.isNaN(aYear) && Number.isNaN(bYear)) return 0;
    if (Number.isNaN(aYear)) return 1;
    if (Number.isNaN(bYear)) return -1;
    return aYear - bYear;
  });
};

/**
 * Helper to determine which dataset should power the UI.
 * Exported for testing.
 */
export const selectBaseData = (csvData = [], localData = [], firestoreData = []) => {
  if (Array.isArray(csvData) && csvData.length > 0) return csvData;
  if (Array.isArray(localData) && localData.length > 0) return localData;
  if (Array.isArray(firestoreData) && firestoreData.length > 0) return firestoreData;
  return [];
};

/**
 * Column type detection
 */
const detectColumnType = (values) => {
  const nonNull = values.filter((v) => v !== undefined && v !== null && v !== "");
  if (nonNull.length === 0) return "string";

  // all numbers?
  if (nonNull.every((v) => typeof v === "number" || (typeof v === "string" && isNumericString(v)))) {
    const nums = nonNull.map((v) => Number(v));
    // all years?
    if (nums.every((n) => isYear(n))) return "year";
    return "number";
  }

  const lowered = Array.from(new Set(nonNull.map((v) => String(v).toLowerCase().trim())));

  // boolean-like
  const booleanLike = new Set(["true", "false", "yes", "no", "1", "0"]);
  if (lowered.length <= 2 && lowered.every((x) => booleanLike.has(x))) return "boolean";

  // date detection (not simple 4-digit years)
  const dateLike = nonNull.every((v) => {
    const s = String(v).trim();
    if (/^\d{4}$/.test(s)) return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
  });
  if (dateLike) return "date";

  // category if limited unique values relative to sample size
  const uniqueCount = new Set(nonNull.map((v) => String(v).trim())).size;
  const ratio = uniqueCount / nonNull.length;
  if ((ratio < 0.2 && nonNull.length >= 10) || (uniqueCount < 50 && nonNull.length >= 10)) return "category";

  return "string";
};

/**
 * Generate schema and types, and add nested 'status' type when present
 * Prioritizes first column as Year if it matches year pattern
 */
const generateSchema = (data) => {
  if (!data || data.length === 0) return { columns: [], types: {} };

  const allColumns = new Set();

  data.forEach((row) => {
    Object.keys(row).forEach((k) => {
      // exclude metadata
      if (["id", "_id", "createdAt", "updatedAt", "uploadedAt", "__v"].includes(k)) return;
      // skip nested objects from being treated as flat columns
      if (typeof row[k] === "object" && !Array.isArray(row[k])) return;
      allColumns.add(k);
    });
  });

  // Sort columns alphabetically for consistent ordering
  let columns = Array.from(allColumns).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const types = {};

  // Detect and prioritize Year column
  const yearColumnName = columns.find(c => c.toLowerCase() === 'year') || columns[0];
  
  // Check if first column or "year" column contains year values
  const yearColumnValues = data.map((r) => r[yearColumnName]).filter((v) => v !== undefined);
  const isYearColumn = detectColumnType(yearColumnValues) === "year";
  
  // If first column is detected as year, ensure it's treated as year type
  if (isYearColumn && yearColumnName) {
    // Reorder columns to put year first
    columns = [yearColumnName, ...columns.filter(c => c !== yearColumnName)];
  }

  columns.forEach((col) => {
    const vals = data.map((r) => r[col]).filter((v) => v !== undefined);
    types[col] = detectColumnType(vals);
  });

  // Ensure Year column is explicitly marked as "year" type if it contains 4-digit years
  if (yearColumnName && isYearColumn) {
    types[yearColumnName] = "year";
  }

  // add nested groups
  if (data[0].status && typeof data[0].status === "object") {
    if (!columns.includes("status")) columns.push("status");
    types["status"] = "nested";
  }

  return { columns, types };
};

/**
 * Custom hook
 * Exposes:
 *  - data: merged normalized data (CSV overrides Firestore when present)
 *  - schema: array of column names
 *  - types: { column: type }
 *  - setCsvData: function to push CSV rows from CsvUploader
 *  - loading, error
 */
const useDynamicSchema = (initialCsv = [], datasetName = "emigrants") => {
  const [csvData, setCsvData] = useState(initialCsv || []);
  const [firestoreData, setFirestoreData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localData, setLocalData] = useState([]);

  // Firestore real-time subscription - document ID is the year
  useEffect(() => {
    setLoading(true);
    const targetCollection = datasetName || "emigrants";
    console.log("[useDynamicSchema] Subscribing to collection:", targetCollection);
    
    const collectionRef = collection(db, targetCollection);
    const unsub = onSnapshot(
      collectionRef,
      (snapshot) => {
        // Reconstruct year from document ID (year is not stored as a field)
        const docs = snapshot.docs.map((d) => {
          const docId = d.id;
          const yearNum = Number(docId);
          return {
            id: docId,
            year: Number.isNaN(yearNum) ? docId : yearNum,
            ...d.data()
          };
        });
        console.log("[useDynamicSchema] Fetched docs:", docs.length, "from", targetCollection);
        setFirestoreData(sortRowsByYear(docs));
        setLocalData([]);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError(err.message || String(err));
        setLoading(false);
      }
    );

    return () => unsub();
  }, [datasetName]);

  // mergedData: CSV (if present) takes precedence, otherwise Firestore
  const mergedData = useMemo(() => {
    const base = selectBaseData(csvData, localData, firestoreData);
    const normalized = normalizeData(base);
    return sortRowsByYear(normalized);
  }, [csvData, firestoreData, localData]);

  // generate schema & types from merged
  const { columns, types } = useMemo(() => generateSchema(mergedData), [mergedData]);

  // Helper methods (lightweight)
  const getColumnType = (col) => types[col] || "string";

  const getCategoricalValues = (col) => {
    if (!columns.includes(col)) return [];
    if (!["category", "boolean"].includes(types[col])) return [];
    const vals = new Set(
      mergedData
        .map((r) => r[col])
        .filter((v) => v !== undefined && v !== null && v !== "")
        .map((v) => String(v).trim())
    );
    return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getNumericRange = (col) => {
    if (!columns.includes(col) || !["number", "year"].includes(types[col])) return { min: 0, max: 0 };
    const vals = mergedData.map((r) => Number(r[col])).filter((v) => !isNaN(v));
    if (vals.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };

  const suggestChartType = (xColumn, yColumn = null) => {
    const xType = types[xColumn];
    const yType = yColumn ? types[yColumn] : null;
    if (!yColumn) {
      if (xType === "year") return "line";
      if (xType === "category" || xType === "boolean") return "pie";
      if (xType === "number") return "histogram";
      return "bar";
    }
    if (xType === "year" && (yType === "number" || yType === "year")) return "line";
    if ((xType === "category" || xType === "boolean") && yType === "number") return "bar";
    if (xType === "number" && yType === "number") return "scatter";
    return "bar";
  };

  // year-aggregated helper (for convenience)
  const getYearAggregatedData = (valueColumn) => {
    // find year column
    const yearCol = columns.find((c) => types[c] === "year" || c.toLowerCase() === "year");
    if (!yearCol) return [];

    const groups = {};
    mergedData.forEach((r) => {
      const year = r[yearCol];
      const val = valueColumn && r[valueColumn] !== undefined ? Number(r[valueColumn]) : undefined;

      if (!year) return;

      if (!groups[year]) groups[year] = { year, total: 0, count: 0, values: [] };

      if (val !== undefined && !isNaN(val)) {
        groups[year].total += val;
        groups[year].count += 1;
        groups[year].values.push(val);
      }
    });

    return Object.values(groups).map((g) => ({
      year: g.year,
      value: g.total,
      average: g.count ? g.total / g.count : 0,
      count: g.count,
      min: g.values.length ? Math.min(...g.values) : 0,
      max: g.values.length ? Math.max(...g.values) : 0,
    })).sort((a, b) => a.year - b.year);
  };

  const setDataSorted = useCallback((rows = []) => {
    setLocalData(sortRowsByYear(rows));
  }, []);

  return {
    data: mergedData,
    schema: columns,
    types,
    loading,
    error,
    setData: setDataSorted, //added
    setCsvData,
    getColumnType,
    getCategoricalValues,
    getNumericRange,
    suggestChartType,
    getYearAggregatedData,
    datasetName,
  };
};

export default useDynamicSchema;

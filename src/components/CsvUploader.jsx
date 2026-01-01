/**
 * ============================================
 * CSV UPLOADER COMPONENT
 * ============================================
 * 
 * Handles CSV file upload, parsing, and validation.
 * 
 * Features:
 * - Validates file type (.csv only)
 * - Validates Year column (4-digit, 1900-2100)
 * - Auto-converts numeric values
 * - Provides helpful error messages
 * - Supports re-uploading files with reset functionality
 * 
 * To modify:
 * - Change validation rules in handleFileUpload
 * - Adjust data processing logic
 * - Update error messages
 * 
 * @param {Function} onCsvData - Callback when CSV is successfully parsed
 * @param {Function} onClearData - Callback when Clear button is clicked to clear all data
 * @param {String} userRole - User role ('admin', 'super-admin')
 * @param {Boolean} isAuthenticated - Authentication status
 * 
 * @component
 */
import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Lock } from "lucide-react";

const deriveCollectionNameFromFile = (fileName = "") => {
  if (!fileName) return "";
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return withoutExtension.trim().replace(/\s+/g, "_");
};

const CsvUploader = ({ onCsvData, onClearData, userRole, isAuthenticated }) => {
  // ========== STATE MANAGEMENT ==========
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // ========== SIMPLIFIED: All authenticated users can upload ==========
  const canUpload = isAuthenticated;

  /**
   * ========== CLEAR FILE HANDLER ==========
   * Resets all state and clears data from Firestore
   * Calls parent handler to clear Firestore collection
   */
  const clearFile = async () => {
    if (!canUpload) {
      setError("❌ Please login to clear data");
      return;
    }

    setFileName("");
    setError(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    // Call parent handler to clear Firestore data
    if (onClearData) {
      try {
        await onClearData();
      } catch (err) {
        console.error("Error clearing data:", err);
        setError("Failed to clear data. Please try again.");
      }
    }
  };

  /**
   * ========== REPLACE FILE HANDLER ==========
   * Allows user to select a different file to replace the current one
   * Opens file dialog without clearing existing state initially
   */
  const replaceFile = () => {
    if (!canUpload) {
      setError("❌ Please login to replace files");
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * ========== FILE UPLOAD HANDLER ==========
   * Processes CSV file upload with validation
   * 
   * Validation Steps:
   * 1. Check file type (.csv)
   * 2. Check user authentication
   * 3. Parse CSV with headers
   * 4. Validate Year column (4-digit)
   * 5. Convert numeric values
   * 6. Filter invalid rows
   */
  const handleFileUpload = (e) => {
    if (!canUpload) {
      setError("❌ Please login to upload CSV files");
      e.target.value = null;
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Step 1: Validate file type
    if (!file.name.endsWith('.csv')) {
      setError("❌ Please upload a CSV file (.csv extension required)");
      e.target.value = null;
      return;
    }

    setFileName(file.name);
    const derivedCollectionName = deriveCollectionNameFromFile(file.name);

    setError(null);
    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (header) => header, // Preserve original header formatting exactly
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.error("CSV parsing errors:", results.errors);
          setError(`CSV parsing error: ${results.errors[0].message}`);
          setIsUploading(false);
          e.target.value = null;
          return;
        }

        const csvData = results.data;

        // Process CSV data
        const invalidRows = [];
        const processedData = csvData.map((row, index) => {
          const processedRow = {};
          const keys = Object.keys(row);
          
          // Find Year column
          const getYearColumnName = (columns) => {
            return columns.find(col => col.toLowerCase().trim() === 'year') || null;
          };

          const yearColumnKey = getYearColumnName(keys) || keys[0];
          
          // Process Year column
          const yearValue = row[yearColumnKey];
          if (yearValue) {
            const yearStr = String(yearValue).trim();
            if (/^\d{4}$/.test(yearStr)) {
              const yearNum = Number(yearStr);
              if (yearNum >= 1900 && yearNum <= 2100) {
                processedRow.year = yearNum;
              } else {
                invalidRows.push({ index: index + 2, reason: `Year ${yearNum} out of range (1900-2100)` });
                processedRow.year = null;
              }
            } else {
              invalidRows.push({ index: index + 2, reason: `Invalid year format: "${yearValue}" (must be 4 digits)` });
              processedRow.year = null;
            }
          } else {
            invalidRows.push({ index: index + 2, reason: "Year column is empty" });
            processedRow.year = null;
          }
          
          // Process other columns
          keys.forEach(key => {
            if (key !== yearColumnKey) {
              const value = row[key];
              if (value !== null && value !== undefined && value !== "") {
                const valueStr = String(value).trim();
                if (!isNaN(valueStr) && valueStr !== "") {
                  processedRow[key] = Number(valueStr);
                } else {
                  processedRow[key] = valueStr;
                }
              }
            }
          });
          
          return processedRow;
        }).filter(row => row.year !== null);

        if (processedData.length === 0) {
          const invalidSummary = invalidRows.map(r => `Row ${r.index}: ${r.reason}`).join("\n");
          setError(`❌ No valid data rows found.\n\nInvalid rows:\n${invalidSummary}`);
          setIsUploading(false);
          e.target.value = null;
          return;
        }

        if (invalidRows.length > 0) {
          console.warn(`Skipped ${invalidRows.length} invalid rows:`, invalidRows);
        }

        if (onCsvData) {
          onCsvData(processedData, {
            collectionName: derivedCollectionName || null,
            originalFileName: file.name
          });
        }

        e.target.value = null;
        setIsUploading(false);
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        setError(`Failed to parse CSV: ${error.message}`);
        setIsUploading(false);
        e.target.value = null;
      }
    });
  };

  // Render upload area
  const renderUploadArea = () => {
    if (!isAuthenticated) {
      return (
        <div className="p-6 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Lock className="mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-gray-600 font-medium">Please login to access CSV upload</p>
        </div>
      );
    }

    return (
      <div className="file-upload-label">
        <label 
          htmlFor="csv-upload" 
          className="cursor-pointer flex items-center gap-4 p-6 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border-2 border-dashed border-primary-300 hover:border-primary-500 hover:bg-primary-100 transition-all"
        >
          <div className="p-3 bg-primary-100 rounded-lg">
            <Upload className="text-primary-600" size={28} />
          </div>
          <div className="flex-1">
            <span className="font-bold text-lg text-gray-800 block mb-1">
              {fileName || "📁 Click to Choose CSV File"}
            </span>
          </div>
        </label>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
          disabled={!canUpload || isUploading}
        />
        {fileName && (
          <div className="mt-4 flex items-center justify-between gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-green-600" size={20} />
              <div>
                <span className="font-semibold text-green-800 text-base block">File Ready</span>
                <span className="text-sm text-green-600">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={replaceFile}
                disabled={!canUpload || isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 border border-blue-300 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Replace with a different file"
              >
                <Upload size={16} />
                <span>Replace File</span>
              </button>
              <button
                onClick={clearFile}
                disabled={!canUpload || isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg font-semibold hover:bg-green-100 hover:border-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear the selected file"
              >
                <X size={16} />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderUploadArea()}

      {error && (
        <div className="alert alert-error p-5 flex items-start gap-3">
          <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-base block mb-1">Upload Error</strong>
            <span className="text-base whitespace-pre-line">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvUploader;
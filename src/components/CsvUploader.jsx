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
 * 
 * @component
 */
import React, { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";

const CsvUploader = ({ onCsvData }) => {
  // ========== STATE MANAGEMENT ==========
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * ========== CLEAR FILE HANDLER ==========
   * Resets all state and allows uploading new files
   */
  const clearFile = () => {
    setFileName("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
    if (onCsvData) {
      onCsvData(null); // Clear parent data
    }
  };

  /**
   * ========== FILE UPLOAD HANDLER ==========
   * Processes CSV file upload with validation
   * 
   * Validation Steps:
   * 1. Check file type (.csv)
   * 2. Parse CSV with headers
   * 3. Validate Year column (4-digit)
   * 4. Convert numeric values
   * 5. Filter invalid rows
   */
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Step 1: Validate file type
    if (!file.name.endsWith('.csv')) {
      setError("❌ Please upload a CSV file (.csv extension required)");
      e.target.value = null; // Reset input on error
      return;
    }

    setFileName(file.name);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for manual processing
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          console.error("CSV parsing errors:", results.errors);
          setError(`CSV parsing error: ${results.errors[0].message}`);
          e.target.value = null; // Reset input on error
          return;
        }

        const csvData = results.data.filter(row => {
          // Filter out completely empty rows
          return Object.values(row).some(val => val !== null && val !== undefined && val !== "");
        });

        if (csvData.length === 0) {
          setError("CSV file is empty or contains no valid data");
          e.target.value = null; // Reset input on error
          return;
        }

        // Process CSV data: First column should be Year, rest are field values
        const processedData = csvData.map((row, index) => {
          const processedRow = {};
          
          // Get all keys (column names from first row)
          const keys = Object.keys(row);
          
          // First column should be Year (case-insensitive)
          const yearKey = keys.find(k => k.toLowerCase() === 'year' || k.toLowerCase().trim() === 'year');
          const firstKey = keys[0]; // Fallback to first column
          const yearColumnKey = yearKey || firstKey;
          
          // Process Year column - must be 4 digits
          const yearValue = row[yearColumnKey];
          if (yearValue) {
            const yearStr = String(yearValue).trim();
            // Validate 4-digit year
            if (/^\d{4}$/.test(yearStr)) {
              const yearNum = Number(yearStr);
              if (yearNum >= 1900 && yearNum <= 2100) {
                processedRow.year = yearNum;
              } else {
                console.warn(`Row ${index + 1}: Year ${yearNum} is out of valid range (1900-2100)`);
                processedRow.year = null;
              }
            } else {
              console.warn(`Row ${index + 1}: Year "${yearValue}" is not a valid 4-digit year`);
              processedRow.year = null;
            }
          } else {
            processedRow.year = null;
          }
          
          // Process other columns as field values
          keys.forEach(key => {
            if (key !== yearColumnKey) {
              const value = row[key];
              if (value !== null && value !== undefined && value !== "") {
                const valueStr = String(value).trim();
                // Try to convert to number if it's numeric
                if (!isNaN(valueStr) && valueStr !== "") {
                  processedRow[key] = Number(valueStr);
                } else {
                  processedRow[key] = valueStr;
                }
              } else {
                processedRow[key] = 0; // Default to 0 for empty numeric fields
              }
            }
          });
          
          return processedRow;
        }).filter(row => row.year !== null); // Filter out rows with invalid years

        if (processedData.length === 0) {
          setError("No valid data rows found. Please ensure Year column contains 4-digit years (1900-2100).");
          e.target.value = null; // Reset input on error
          return;
        }

        // Pass processed data to parent
        if (onCsvData) {
          onCsvData(processedData);
        }

        // Reset input to allow re-uploading same file
        e.target.value = null;
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        setError(`Failed to parse CSV: ${error.message}`);
        e.target.value = null; // Reset input on error
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ========== FILE UPLOAD BUTTON ========== */}
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
            <span className="text-sm text-gray-600">
              {fileName ? "File selected: " + fileName : "Select your data file (.csv format)"}
            </span>
          </div>
          {!fileName && (
            <div className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors">
              Browse Files
            </div>
          )}
        </label>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
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
            <button
              onClick={clearFile}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg font-semibold hover:bg-green-100 hover:border-green-400 transition-colors"
              title="Upload a different file"
            >
              <X size={16} />
              <span>Upload Different File</span>
            </button>
          </div>
        )}
      </div>

      {/* ========== ERROR MESSAGES ========== */}
      {error && (
        <div className="alert alert-error p-5 flex items-start gap-3">
          <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-base block mb-1">Upload Error</strong>
            <span className="text-base">{error}</span>
          </div>
        </div>
      )}

      {/* ========== FORMAT REQUIREMENTS GUIDE ========== */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">📋</div>
          <div>
            <p className="font-bold text-base text-gray-800 mb-3">CSV File Format Guide</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary-600">✓</span>
                <span><strong>First Column:</strong> Must be "Year" with 4-digit years (1900-2100)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary-600">✓</span>
                <span><strong>First Row:</strong> Contains field names (column headers)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary-600">✓</span>
                <span><strong>Data Rows:</strong> Subsequent rows contain your data values</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary-600">✓</span>
                <span><strong>Numbers:</strong> Numeric values are automatically detected and converted</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Example CSV Format:</p>
          <code className="text-xs text-gray-600 block">
            Year,single,married,widower,separated,notReported<br/>
            2000,16,0,25,3,4<br/>
            2001,20,5,30,2,1
          </code>
        </div>
      </div>
    </div>
  );
};

export default CsvUploader;
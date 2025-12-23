/**
 * ============================================
 * MAIN APPLICATION COMPONENT
 * Filipino Emigrants Dashboard
 * ============================================
 * 
 * This is the main component that orchestrates the entire application.
 * 
 * Key Features:
 * - CSV file upload and processing
 * - Real-time data filtering
 * - Dynamic chart generation
 * - Data table with CRUD operations
 * 
 * To modify the layout or add new sections:
 * 1. Add new state variables at the top
 * 2. Add new sections in the JSX return statement
 * 3. Update the filtering logic if needed
 * 
 * @component
 */
import React, { useState } from "react";
import { overwriteCollection } from "./services/firestoreService";
import CsvUploader from "./components/CsvUploader";
import DynamicChart from "./components/DynamicChart";
import DynamicMap from "./components/DynamicMap";
import StatusCombinedChart from "./components/StatusCombinedChart";
import Filters from "./components/Filters";
import DataTable from "./components/DataTable";
import useDynamicSchema from "./hooks/useDynamicSchema";
import { BarChart3, Database, AlertCircle, CheckCircle2, Loader2, FileSpreadsheet, TrendingUp } from "lucide-react";

const App = () => {
  // ========== STATE MANAGEMENT ==========
  // CSV data from file upload (temporary, before Firestore sync)
  const [csvData, setCsvData] = useState([]);
  
  // Active filters applied to the data
  const [filters, setFilters] = useState({});
  
  // Upload status: null | "uploading" | "success" | "error"
  const [uploadStatus, setUploadStatus] = useState(null);
  
  // Get data, schema, and types from custom hook
  // This hook handles Firestore real-time sync and data normalization
  const { data, schema, types, loading, error } = useDynamicSchema(csvData);

  /**
   * ========== CSV UPLOAD HANDLER ==========
   * Processes CSV data and uploads to Firestore
   * 
   * To modify upload behavior:
   * - Change data processing logic in the map function
   * - Adjust timeout durations
   * - Add additional validation
   */
  const handleCsvUpload = async (rows) => {
    try {
      setUploadStatus("uploading");
      
      const processedRows = rows.map(row => {
        const processedRow = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          // Auto-convert numeric strings to numbers for Firestore
          if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
            processedRow[key] = Number(value);
          } else {
            processedRow[key] = value;
          }
        });
        return processedRow;
      });
      
      setCsvData(processedRows);
      await overwriteCollection(processedRows);
      setUploadStatus("success");
      
      setTimeout(() => {
        setCsvData([]);
        setUploadStatus(null);
      }, 2000);
      
    } catch (err) {
      console.error("Failed to upload CSV to Firestore:", err);
      setUploadStatus("error");
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  /**
   * ========== DATA FILTERING ==========
   * Applies active filters to the dataset
   * 
   * Filter Types Supported:
   * - Range filters: { min: number, max: number } for numeric columns
   * - Text filters: string (case-insensitive partial match)
   * 
   * To modify filtering logic:
   * - Change the comparison operators
   * - Add new filter types
   * - Adjust case sensitivity
   */
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.filter((row) => {
      // All filters must pass (AND logic)
      return Object.keys(filters).every((col) => {
        const filterVal = filters[col];
        
        // Empty filter = show all (pass through)
        if (filterVal === undefined || filterVal === null || filterVal === "") {
          return true;
        }
        
        // Range filter for numbers (min/max)
        if (typeof filterVal === "object" && filterVal !== null) {
          const rowValue = Number(row[col]);
          if (isNaN(rowValue)) return false;
          if (filterVal.min !== undefined && rowValue < Number(filterVal.min)) {
            return false;
          }
          if (filterVal.max !== undefined && rowValue > Number(filterVal.max)) {
            return false;
          }
          return true;
        }
        
        // Text filter (case-insensitive partial match)
        const rowVal = row[col];
        if (rowVal === undefined || rowVal === null) return false;
        return String(rowVal)
          .toLowerCase()
          .includes(String(filterVal).toLowerCase());
      });
    });
  }, [data, filters]);

  /**
   * ========== DASHBOARD STATISTICS ==========
   * Calculates key metrics for the header display
   * 
   * To add new stats:
   * - Add new properties to the returned object
   * - Update the header JSX to display them
   */
  const stats = React.useMemo(() => {
    return {
      total: data.length,
      filtered: filteredData.length,
      columns: schema.length,
      activeFilters: Object.keys(filters).filter(k => {
        const v = filters[k];
        if (!v) return false;
        if (typeof v === "string") return v !== "";
        if (typeof v === "object") return v.min !== undefined || v.max !== undefined;
        return true;
      }).length
    };
  }, [data, filteredData, schema, filters]);

  /**
   * ========== STATUS COLUMN DETECTION ==========
   * Identifies status-related columns to combine in one chart
   * 
   * To add more status keywords:
   * - Add to the statusKeywords array below
   * - The matching is case-insensitive and handles hyphens/underscores
   */
  const statusColumns = React.useMemo(() => {
    // Keywords that identify status columns
    const statusKeywords = ["single", "married", "widower", "widowed", "separated", "divorced", "notreported", "not-reported", "live_in", "live-in"];
    return schema.filter(col => {
      const colLower = col.toLowerCase().replace(/[-_]/g, ""); // Normalize for matching
      return statusKeywords.some(keyword => {
        const keywordClean = keyword.replace(/[-_]/g, "");
        return colLower === keywordClean || colLower.includes(keywordClean) || keywordClean.includes(colLower);
      });
    });
  }, [schema]);

  /**
   * ========== COLUMN EXCLUSION ==========
   * Defines which columns should NOT appear as individual charts
   * 
   * To exclude more columns:
   * - Add column names to the Set below
   * - These columns will be hidden from the visualizations grid
   */
  const excludedColumns = React.useMemo(() => {
    return new Set([
      "id",           // Document ID, not a data field
      "createdAt",    // Metadata
      "updatedAt",    // Metadata
      "status",        // Status object (we show individual columns instead)
      ...statusColumns // Individual status columns (shown in combined chart)
    ]);
  }, [statusColumns]);

  /**
   * ========== REGULAR COLUMNS ==========
   * Columns that will be shown as individual charts
   * Excludes metadata and status columns
   */
  const regularColumns = React.useMemo(() => {
    return schema.filter(col => !excludedColumns.has(col));
  }, [schema, excludedColumns]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 sm:p-8 lg:p-10">
        {/* ========== HEADER SECTION ========== */}
        {/* Main title and statistics - modify titles and descriptions here */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 sm:p-10 mb-8 text-white">
          <div className="flex items-center gap-5 mb-6">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <TrendingUp size={36} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
                📊 Filipino Emigrants Dashboard
              </h1>
            </div>
          </div>
          
          {/* Stats Bar - Key Metrics Display */}
          {data.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-8 pt-8 border-t border-white/20">
              <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-4xl sm:text-5xl font-bold mb-2">{stats.total.toLocaleString()}</div>
                <div className="text-blue-100 text-base font-medium">Total Records</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-4xl sm:text-5xl font-bold mb-2">{stats.filtered.toLocaleString()}</div>
                <div className="text-blue-100 text-base font-medium">Filtered Results</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-4xl sm:text-5xl font-bold mb-2">{stats.columns}</div>
                <div className="text-blue-100 text-base font-medium">Data Columns</div>
              </div>
              <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-4xl sm:text-5xl font-bold mb-2">{stats.activeFilters}</div>
                <div className="text-blue-100 text-base font-medium">Active Filters</div>
              </div>
            </div>
          )}

        {/* ========== CSV UPLOAD SECTION ========== */}
        {/* Upload your data files here - modify title and description as needed */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Database className="text-blue-600" size={28} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-1">
                📁 Upload Your Data
              </h2>
              <p className="text-gray-600 text-base">
                Upload CSV files to start analyzing your emigration data
              </p>
            </div>
          </div>
          
          <CsvUploader onCsvData={handleCsvUpload} />
          
          {/* Upload Status Messages - Student-Friendly Alerts */}
          {uploadStatus === "uploading" && (
            <div className="mt-6 p-5 bg-blue-50 border-l-4 border-blue-500 rounded-xl flex items-center gap-4 shadow-sm">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <div>
                <span className="text-blue-800 font-semibold text-base block">Uploading your data...</span>
                <span className="text-blue-600 text-sm">Please wait while we process your file</span>
              </div>
            </div>
          )}
          {uploadStatus === "success" && (
            <div className="mt-6 p-5 bg-green-50 border-l-4 border-green-500 rounded-xl flex items-center gap-4 shadow-sm animate-fade-in">
              <CheckCircle2 className="text-green-600" size={24} />
              <div>
                <span className="text-green-800 font-semibold text-base block">✅ Upload Successful!</span>
                <span className="text-green-600 text-sm">Your data is now available in the dashboard</span>
              </div>
            </div>
          )}
          {uploadStatus === "error" && (
            <div className="mt-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-center gap-4 shadow-sm">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <span className="text-red-800 font-semibold text-base block">❌ Upload Failed</span>
                <span className="text-red-600 text-sm">Please check your file and try again</span>
              </div>
            </div>
          )}
        </div>

        {/* ========== LOADING STATE ========== */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-20 text-center">
            <Loader2 className="inline-block animate-spin text-blue-600 mb-6" size={56} />
            <p className="text-gray-700 text-xl font-semibold mb-2">Loading your data...</p>
            <p className="text-gray-500 text-base">Fetching information from the database</p>
          </div>
        )}

        {/* ========== ERROR STATE ========== */}
        {/* Shown if there's an error loading data */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-8 rounded-xl mb-8 flex items-start gap-4 shadow-sm">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={28} />
            <div>
              <strong className="font-bold text-lg block mb-2">⚠️ Error Loading Data</strong>
              <p className="text-base">{error}</p>
              <p className="text-sm text-red-600 mt-2">Please refresh the page or check your connection</p>
            </div>
          </div>
        )}

        {/* ========== MAIN CONTENT ========== */}
        {/* All data visualization and management features */}
        {!loading && data && data.length > 0 && (
          <>
            {/* ========== DATA TABLE SECTION ========== */}
            {/* View, edit, add, and delete records */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <FileSpreadsheet className="text-green-600" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-1">
                    📋 Data Table
                  </h2>
                </div>
              </div>
              <DataTable 
                data={filteredData} 
                schema={schema}
                types={types}
              />
            </div>

            {/* ========== VISUALIZATIONS SECTION ========== */}
            {/* Charts and graphs for data analysis */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <BarChart3 className="text-purple-600" size={28} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-1">
                    📊 Charts & Visualizations
                  </h2>
                  <p className="text-gray-600 text-base">
                    Interactive graphs to explore your data patterns
                  </p>
                </div>
              </div>
              
              {/* ========== COMBINED STATUS CHART ========== */}
              {/* Shows all status columns (single, married, etc.) in one chart */}
              {statusColumns.length > 0 && (
                <div className="mb-8">
                  <div 
                    className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8 group"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors mb-2">
                          👥 Status Breakdown Chart
                        </h3>
                        <p className="text-gray-600 text-base">
                          Combined view of all marital status categories by year
                        </p>
                      </div>
                      <span className="text-sm bg-blue-100 text-blue-600 px-4 py-2 rounded-full font-semibold">
                        Combined View
                      </span>
                    </div>
                    <StatusCombinedChart 
                      data={filteredData} 
                      statusColumns={statusColumns}
                      types={types}
                    />
                  </div>
                </div>
              )}
              
              {/* ========== INDIVIDUAL COLUMN CHARTS ========== */}
              {/* One chart per data column (excluding status columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {regularColumns.map((variable) => {
                  return (
                    <div 
                      key={variable} 
                      className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8 group"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors mb-1">
                            {variable}
                          </h3>
                          <p className="text-gray-500 text-sm">
                            Data type: {types[variable] || 'unknown'}
                          </p>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium">
                          {types[variable] || 'unknown'}
                        </span>
                      </div>
                      
                      {/* Show map for location-related columns, chart for others */}
                      {(variable.toLowerCase().includes("origin") || 
                        variable.toLowerCase().includes("destination") ||
                        variable.toLowerCase().includes("place")) ? (
                        <DynamicMap 
                          data={filteredData} 
                          variable={variable} 
                        />
                      ) : (
                        <DynamicChart 
                          data={filteredData} 
                          variable={variable} 
                          types={types} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ========== EMPTY STATE ========== */}
        {/* Shown when no data is available */}
        {!loading && data.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-20 text-center">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-8">
              <FileSpreadsheet className="text-blue-600" size={72} />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              📂 No Data Available Yet
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-lg mx-auto">
              Get started by uploading a CSV file with your emigration data. 
              The system will automatically create charts and visualizations for you!
            </p>
            <button className="btn btn-primary btn-large">
              📤 Upload Your First File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
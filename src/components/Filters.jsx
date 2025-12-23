import React, { useMemo, useState } from "react";
import { Search, X, ChevronDown, ChevronUp, Filter, XCircle, SlidersHorizontal } from "lucide-react";

const Filters = ({
  filters,
  setFilters,
  schema = [],
  types = {},
  data = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default for cleaner UI
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    numbers: false,
    categories: false,
    text: false
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value || undefined
    }));
  };

  const handleRangeChange = (column, rangeType, rangeValue) => {
    setFilters((prev) => ({
      ...prev,
      [column]: {
        ...(prev[column] || {}),
        [rangeType]: rangeValue || undefined
      }
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  const clearSingleFilter = (columnName) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[columnName];
      return newFilters;
    });
  };

  // Exclude columns that shouldn't be filtered (same logic as App.jsx)
  const excludedColumns = useMemo(() => {
    const statusKeywords = ["single", "married", "widower", "widowed", "separated", "divorced", "notreported", "not-reported", "live_in", "live-in"];
    const statusCols = (schema || []).filter(col => {
      const colLower = col.toLowerCase().replace(/[-_]/g, "");
      return statusKeywords.some(keyword => {
        const keywordClean = keyword.replace(/[-_]/g, "");
        return colLower === keywordClean || colLower.includes(keywordClean) || keywordClean.includes(colLower);
      });
    });
    
    return new Set([
      "id",
      "createdAt",
      "updatedAt",
      "status", // exclude the status object column
      ...statusCols // exclude individual status columns
    ]);
  }, [schema]);

  // Only show filterable columns (exclude nested objects and excluded columns)
  const visibleColumns = useMemo(() => {
    return (schema || []).filter((c) => {
      // Exclude nested objects
      if (types[c] === "nested") return false;
      // Exclude metadata and status columns
      if (excludedColumns.has(c)) return false;
      return true;
    });
  }, [schema, types, excludedColumns]);

  const filteredColumns = useMemo(() => {
    if (!searchTerm) return visibleColumns;
    return visibleColumns.filter(col => 
      col.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [visibleColumns, searchTerm]);

  const getUniqueValues = (columnName) => {
    if (!data || data.length === 0) return [];
    const setVals = new Set();
    data.forEach((row) => {
      const v = row[columnName];
      if (v === undefined || v === null || v === "") return;
      setVals.add(String(v).trim());
    });
    return Array.from(setVals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const filterOptions = useMemo(() => {
    const opts = {};
    visibleColumns.forEach((col) => {
      const t = types[col];
      if (t === "category" || t === "boolean") {
        opts[col] = getUniqueValues(col);
      }
    });
    return opts;
  }, [visibleColumns, data, types]);

  // Group columns by type for better organization
  const columnsByType = useMemo(() => {
    const groups = {
      numbers: [],
      categories: [],
      text: []
    };
    
    visibleColumns.forEach((col) => {
      const type = types[col];
      if (type === "number" || type === "year") {
        groups.numbers.push(col);
      } else if (type === "category" || type === "boolean") {
        groups.categories.push(col);
      } else if (type === "string") {
        groups.text.push(col);
      }
    });
    
    return groups;
  }, [visibleColumns, types]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const activeFilterCount = Object.keys(filters).filter((k) => {
    const v = filters[k];
    if (!v) return false;
    if (typeof v === "string") return v !== "";
    if (typeof v === "object") return v.min !== undefined || v.max !== undefined;
    return true;
  }).length;

  if (!schema || schema.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
        <Filter className="mx-auto mb-3 text-gray-400" size={40} />
        <p className="text-gray-600 font-medium mb-1">No Filters Available</p>
        <p className="text-gray-500 text-sm">Upload data to enable filtering options</p>
      </div>
    );
  }

  const getTypeIcon = (type) => {
    switch(type) {
      case "number":
      case "year":
        return "123";
      case "category":
      case "boolean":
        return "▼";
      case "string":
        return "Aa";
      default:
        return "•";
    }
  };

  const getTypeBadgeColor = (type) => {
    switch(type) {
      case "number":
      case "year":
        return "bg-purple-100 text-purple-700";
      case "category":
      case "boolean":
        return "bg-green-100 text-green-700";
      case "string":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (!schema || schema.length === 0 || visibleColumns.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
        <Filter className="mx-auto mb-3 text-gray-400" size={40} />
        <p className="text-gray-600 font-medium mb-1">No Filters Available</p>
        <p className="text-gray-500 text-sm">Upload data to enable filtering options</p>
      </div>
    );
  }

  return (
    <div className="filter-panel">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <SlidersHorizontal className="text-primary-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
              Filters
              {activeFilterCount > 0 && (
                <span className="badge badge-primary">{activeFilterCount} active</span>
              )}
            </h3>
            <p className="text-sm text-gray-500">
              {visibleColumns.length} filterable {visibleColumns.length === 1 ? 'column' : 'columns'} available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="btn btn-secondary text-sm"
            >
              <XCircle size={16} />
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-secondary"
            aria-label={isExpanded ? "Collapse filters" : "Expand filters"}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Active Filters - Always Visible */}
      {activeFilterCount > 0 && (
        <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-primary-600" />
            <span className="text-sm font-semibold text-primary-700">Active Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([col, val]) => {
              if (!val || (typeof val === "string" && val === "")) return null;
              if (!visibleColumns.includes(col)) return null; // Only show active filters for visible columns
              
              let display = "";
              if (typeof val === "object") {
                const parts = [];
                if (val.min !== undefined && val.min !== "") parts.push(`≥ ${val.min}`);
                if (val.max !== undefined && val.max !== "") parts.push(`≤ ${val.max}`);
                display = parts.join(" & ");
              } else {
                display = String(val);
              }
              if (!display) return null;
              
              return (
                <span
                  key={col}
                  className="badge badge-primary inline-flex items-center gap-1"
                >
                  <span className="font-semibold">{col}:</span>
                  <span>{display}</span>
                  <button
                    onClick={() => clearSingleFilter(col)}
                    className="ml-1 hover:opacity-70 transition-opacity"
                    aria-label={`Remove filter for ${col}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Search Filters */}
          {visibleColumns.length > 8 && (
            <div className="filter-group">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search filter columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Organized Filter Sections */}
          {/* Numbers & Years Section */}
          {columnsByType.numbers.length > 0 && (
            <div className="filter-group">
              <button
                onClick={() => toggleSection('numbers')}
                className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">123</span>
                  <span className="font-semibold text-gray-800">
                    Numbers & Years ({columnsByType.numbers.length})
                  </span>
                </div>
                {expandedSections.numbers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expandedSections.numbers && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredColumns.filter(col => columnsByType.numbers.includes(col)).map((col) => {
                    const type = types[col];
                    const val = filters[col];
                    return (
                      <div key={col} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="font-semibold text-sm text-gray-700">{col}</label>
                          {val && (val.min || val.max) && (
                            <button
                              onClick={() => clearSingleFilter(col)}
                              className="text-red-500 hover:text-red-700 text-xs"
                              aria-label={`Clear ${col} filter`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={val?.min || ""}
                            onChange={(e) => handleRangeChange(col, "min", e.target.value)}
                            className="w-full"
                            min={type === "year" ? 1900 : undefined}
                            max={type === "year" ? 2100 : undefined}
                          />
                          <span className="self-center text-gray-400">—</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={val?.max || ""}
                            onChange={(e) => handleRangeChange(col, "max", e.target.value)}
                            className="w-full"
                            min={type === "year" ? 1900 : undefined}
                            max={type === "year" ? 2100 : undefined}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Categories & Booleans Section */}
          {columnsByType.categories.length > 0 && (
            <div className="filter-group">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">▼</span>
                  <span className="font-semibold text-gray-800">
                    Categories ({columnsByType.categories.length})
                  </span>
                </div>
                {expandedSections.categories ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expandedSections.categories && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredColumns.filter(col => columnsByType.categories.includes(col)).map((col) => {
                    const type = types[col];
                    const val = filters[col];
                    const options = filterOptions[col] || [];
                    return (
                      <div key={col} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="font-semibold text-sm text-gray-700">{col}</label>
                          {val && (
                            <button
                              onClick={() => clearSingleFilter(col)}
                              className="text-red-500 hover:text-red-700 text-xs"
                              aria-label={`Clear ${col} filter`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <select
                          name={col}
                          value={val || ""}
                          onChange={handleFilterChange}
                          className="w-full"
                        >
                          <option value="">All ({options.length})</option>
                          {options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Text Search Section */}
          {columnsByType.text.length > 0 && (
            <div className="filter-group">
              <button
                onClick={() => toggleSection('text')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">Aa</span>
                  <span className="font-semibold text-gray-800">
                    Text Search ({columnsByType.text.length})
                  </span>
                </div>
                {expandedSections.text ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expandedSections.text && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredColumns.filter(col => columnsByType.text.includes(col)).map((col) => {
                    const val = filters[col];
                    return (
                      <div key={col} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <label className="font-semibold text-sm text-gray-700">{col}</label>
                          {val && (
                            <button
                              onClick={() => clearSingleFilter(col)}
                              className="text-red-500 hover:text-red-700 text-xs"
                              aria-label={`Clear ${col} filter`}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            name={col}
                            value={val || ""}
                            onChange={handleFilterChange}
                            placeholder={`Search ${col}...`}
                            className="w-full pl-8"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Legacy Grid Layout - Fallback for any ungrouped columns */}
          {filteredColumns.filter(col => {
            return !columnsByType.numbers.includes(col) && 
                   !columnsByType.categories.includes(col) && 
                   !columnsByType.text.includes(col);
          }).length > 0 && (
            <div className="filter-group">
              <h4 className="font-semibold text-gray-700 mb-3">Other Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredColumns.filter(col => {
                  return !columnsByType.numbers.includes(col) && 
                         !columnsByType.categories.includes(col) && 
                         !columnsByType.text.includes(col);
                }).map((col) => {
                  const type = types[col];
                  const val = filters[col];
                  
                  // Handle different types in fallback
                  if (type === "number" || type === "year") {
                    return (
                      <div key={col} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <label className="font-semibold text-sm text-gray-700 block mb-2">{col}</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={val?.min || ""}
                            onChange={(e) => handleRangeChange(col, "min", e.target.value)}
                            className="w-full"
                          />
                          <span className="self-center text-gray-400">—</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={val?.max || ""}
                            onChange={(e) => handleRangeChange(col, "max", e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={col} className="p-3 bg-white border border-gray-200 rounded-lg">
                      <label className="font-semibold text-sm text-gray-700 block mb-2">{col}</label>
                      <input
                        type="text"
                        name={col}
                        value={val || ""}
                        onChange={handleFilterChange}
                        placeholder={`Filter ${col}...`}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredColumns.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              <Search className="mx-auto mb-2 text-gray-400" size={32} />
              <p>No filters match "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Filters;
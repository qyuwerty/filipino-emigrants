import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { addRecord, updateRecord, deleteRecord, clearCollection } from "../services/firestoreService";
import { getColumnsWithYearFirst, getYearColumnData } from "../utils/yearUtils";
import { AlertCircle, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";

// TableInput Component - Fixed cursor issues
const TableInput = ({ 
  type = "text", 
  value = "", 
  onChange, 
  hasError = false, 
  isYear = false, 
  isNewRow = false, 
  placeholder = "", 
  disabled = false,
  readOnly = false,
  onClick, 
  onBlur,
  autoFocus = false 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef(null);
  
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      const cursorPosition = inputRef.current.selectionStart;
      
      if (String(value) !== String(internalValue)) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      } else {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }
  }, [autoFocus, value, internalValue]);

  const stringValue = internalValue !== null && internalValue !== undefined ? String(internalValue) : "";
  
  const inputStyle = {
    caretColor: readOnly ? 'transparent' : '#3b82f6',
    cursor: readOnly ? 'not-allowed' : 'text',
    pointerEvents: readOnly ? 'none' : 'auto',
    userSelect: readOnly ? 'none' : 'text',
    backgroundColor: readOnly ? '#f3f4f6' : (isFocused ? 'white' : (isNewRow ? '#fefce8' : 'white')),
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    WebkitTapHighlightColor: 'transparent',
    minHeight: '42px',
    boxSizing: 'border-box',
    borderTop: hasError ? '2px solid #ef4444' : isFocused ? `2px solid ${isNewRow ? '#10b981' : '#3b82f6'}` : '2px solid #d1d5db',
    borderRight: hasError ? '2px solid #ef4444' : isFocused ? `2px solid ${isNewRow ? '#10b981' : '#3b82f6'}` : '2px solid #d1d5db',
    borderBottom: hasError ? '2px solid #ef4444' : isFocused ? `2px solid ${isNewRow ? '#10b981' : '#3b82f6'}` : '2px solid #d1d5db',
    borderLeft: isYear ? '4px solid #60a5fa' : (hasError ? '2px solid #ef4444' : isFocused ? `2px solid ${isNewRow ? '#10b981' : '#3b82f6'}` : '2px solid #d1d5db')
  };
  
  if (isYear) {
    inputStyle.paddingLeft = '16px';
  }
  
  const handleInputChange = (e) => {
    if (readOnly) return;
    
    const inputValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setInternalValue(inputValue);
    
    if (isYear) {
      if (inputValue === '' || /^\d{0,4}$/.test(inputValue)) {
        onChange(e);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      }
      return;
    }
    
    if (type === 'number') {
      if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
        onChange(e);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
          }
        }, 0);
      }
      return;
    }
    
    onChange(e);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };
  
  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };
  
  return (
    <input
      ref={inputRef}
      type="text"
      value={stringValue}
      onChange={handleInputChange}
      onClick={(e) => {
        if (readOnly) return;
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      onBlur={handleBlur}
      style={inputStyle}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      onFocus={() => !readOnly && setIsFocused(true)}
      autoComplete="off"
      autoFocus={autoFocus}
      inputMode={type === 'number' || isYear ? 'numeric' : 'text'}
      className={readOnly ? "cursor-not-allowed" : "cursor-text select-all"}
    />
  );
};


// Utility Functions

// Format header names for display - preserves original CSV formatting exactly
const formatHeaderName = (name) => {
  if (!name || typeof name !== 'string') return name;
  
  // Return the name exactly as it appears in the CSV
  // No modifications - preserve original spacing, capitalization, and symbols
  return name;
};

const formatCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (value.value !== undefined) return String(value.value);
    if (typeof value === 'object' && !Array.isArray(value)) {
      const firstValue = Object.values(value)[0];
      return String(firstValue || "");
    }
    return JSON.stringify(value);
  }
  return String(value);
};

const validateYear = (value) => {
  if (!value || value === "") return { valid: false, message: "Year is required" };
  const yearStr = String(value).trim();
  if (!/^\d{4}$/.test(yearStr)) {
    return { valid: false, message: "Year must be exactly 4 digits (e.g., 2000)" };
  }
  const yearNum = Number(yearStr);
  if (yearNum < 1900 || yearNum > 2100) {
    return { valid: false, message: "Year must be between 1900 and 2100" };
  }
  return { valid: true, value: yearNum };
};

const validateNumber = (value, fieldName) => {
  if (value === "" || value === null || value === undefined) {
    return { valid: true, value: 0 };
  }
  
  let numValue;
  if (typeof value === 'object' && value !== null) {
    if (value.value !== undefined) {
      numValue = Number(value.value);
    } else {
      return { valid: false, message: `${fieldName} has invalid format` };
    }
  } else {
    numValue = Number(value);
  }
  
  if (isNaN(numValue)) {
    return { valid: false, message: `${fieldName} must be a number` };
  }
  return { valid: true, value: numValue };
};

const getFieldType = (columnName) => {
  const colLower = columnName.toLowerCase();
  if (colLower === "year") return "year";
  
  const numericFields = ["single", "married", "widower", "widowed", "separated", "divorced", "live_in", "live-in"];
  
  if (colLower.includes("not reported") || colLower.includes("no response")) {
    return "number";
  }
  
  if (numericFields.some(field => colLower.includes(field))) return "number";
  return "text";
};

const getYearColor = (year) => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
    '#06B6D4', '#D946EF', '#F43F5E', '#22C55E', '#A855F7'
  ];
  if (!year) return '#9CA3AF';
  const hash = String(year).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Main DataTable Component
const DataTable = ({ data = [], setData = () => {}, userRole = 'user', datasetName = "emigrants" }) => {
  // Safety check for userRole
  const safeUserRole = userRole || 'user';
  
  //Memoized columns with Year first
  const { allColumns, yearColumn } = useMemo(() => {
    return getColumnsWithYearFirst(data);
  }, [data]);
  
 //Memoized function to create a blank row so it doesn't recreate on every render
  const createBlankRow = useCallback(() => {
  const blankRow = {};
  allColumns.forEach((col) => {
    //const fieldType = getFieldType(col);
    blankRow[col] = ""; 
  });  
  return blankRow;
}, [allColumns, yearColumn]);
  
  const [newRow, setNewRow] = useState(() => createBlankRow());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(8);
  const [errors, setErrors] = useState({});
  const [operationMessage, setOperationMessage] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [currentPageYearColors, setCurrentPageYearColors] = useState({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);
  const [editRowIndex, setEditRowIndex] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, globalIndex: null, rowId: null });
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState(null);

  // Sort data by year ascending for chronological display
  const sortedData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return [...data].sort((a, b) => {
      const yearA = typeof a.year === 'number' ? a.year : Number(a.year) || 0;
      const yearB = typeof b.year === 'number' ? b.year : Number(b.year) || 0;
      return yearA - yearB;
    });
  }, [data]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = useMemo(() => sortedData.slice(startIndex, endIndex), [sortedData, startIndex, endIndex]);
  
  const currentPageYearData = useMemo(() => {
    return getYearColumnData(paginatedData);
  }, [paginatedData]);
  
  useEffect(() => {
    setNewRow(createBlankRow());
    setErrors({});
  }, [createBlankRow]);
  
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, totalPages, currentPage]);
  
  useEffect(() => {
    const pageYears = {};
    if (currentPageYearData?.yearColumn) {
      paginatedData.forEach(row => {
        const yearValue = row[currentPageYearData.yearColumn];
        if (yearValue) {
          pageYears[yearValue] = getYearColor(yearValue);
        }
      });
    }
    setCurrentPageYearColors(pageYears);
  }, [paginatedData, currentPageYearData]);
  
  const validateAndPrepareData = (rowData, isNew = false) => {
    const errors = {};
    const preparedData = {};
    
    allColumns.forEach((col) => {
      const value = rowData[col];
      const fieldType = getFieldType(col);
      
      if (col === yearColumn) {
        const validation = validateYear(value);
        if (!validation.valid) {
          errors[col] = validation.message;
          return;
        }
        preparedData[col] = validation.value;
      } else if (fieldType === "number") {
        const validation = validateNumber(value, col);
        if (!validation.valid) {
          errors[col] = validation.message;
          return;
        }
        preparedData[col] = validation.value;
      } else {
        preparedData[col] = value !== null && value !== undefined ? String(value).trim() : "";
      }
    });
    
    return { errors, preparedData };
  };
  
const handleFieldClick = (rowIndex, field) => {
  setEditingField({ rowIndex, field });
};

const handleReset = async () => {
  if (isResetting) return;

  const confirmed = window.confirm("This will delete all records from the database. Continue?");
  if (!confirmed) return;

  try {
    setIsResetting(true);
    setOperationMessage("");

    await clearCollection(datasetName);
    setData([]);
    setNewRow(createBlankRow());
    setCurrentPage(1);
    setEditRowIndex(null);
    setErrors({});

    setOperationMessage(" All records have been cleared");
  } catch (error) {
    console.error("Error resetting data:", error);
    setOperationMessage(` Failed to reset data: ${error.message}`);
  } finally {
    setIsResetting(false);
    setTimeout(() => setOperationMessage(""), 3000);
  }
};

const handleEdit = (index) => {
  // Don't allow editing multiple rows at once
  if (editRowIndex !== null) {
    setOperationMessage(" Please save or cancel the current edit first");
    setTimeout(() => setOperationMessage(""), 2000);
    return;
  }
  
  const globalIndex = startIndex + index;
  setEditRowIndex(globalIndex);
  setEditingField(null);
  setErrors({});
  setOperationMessage(""); // Clear messages
};
  
const handleSaveEdit = async (index) => {
  // Get the row from sorted/paginated data
  const row = paginatedData[index];
  if (!row) return;
  
  // Validate the row data
  const { errors: validationErrors, preparedData } = validateAndPrepareData(row, false);
  
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    setOperationMessage(" Please fix validation errors");
    setTimeout(() => setOperationMessage(""), 3000);
    return;
  }
  
  try {
    setSavingRowId(row.id);
    
    // Send the preparedData to Firestore (without the id field)
    const { id, ...dataToSave } = preparedData;
    
    console.log("Saving to Firestore:", dataToSave);
    
    await updateRecord(row.id, dataToSave, datasetName);
    
    // Update local state - find by ID in original data
    const originalIndex = data.findIndex(d => d.id === row.id);
    if (originalIndex !== -1) {
      const updatedDataArray = [...data];
      updatedDataArray[originalIndex] = { id: row.id, ...preparedData };
      setData(updatedDataArray);
    }
    
    setEditRowIndex(null);
    setEditingField(null);
    setErrors({});
    setOperationMessage(" Record updated successfully!");
    
    setTimeout(() => setOperationMessage(""), 2000);
    
  } catch (error) {
    console.error("Error updating record:", error);
    setOperationMessage(` Failed to update: ${error.message}`);
    setTimeout(() => setOperationMessage(""), 3000);
  } finally {
    setSavingRowId(null);
  }
};
  
const handleDelete = async (index) => {
  // Get the row from sorted/paginated data
  const row = paginatedData[index];
  if (!row) return;
  
  if (!window.confirm("Are you sure you want to delete this record?")) {
    return;
  }
  
  try {
    setDeletingRowId(row.id);
    
    await deleteRecord(row.id, datasetName);
    
    // Remove from original data by ID
    const updated = data.filter(d => d.id !== row.id);
    setData(updated);
    
    setOperationMessage(" Record deleted successfully!");
    setTimeout(() => setOperationMessage(""), 2000);
    
  } catch (error) {
    console.error("Error deleting record:", error);
    setOperationMessage(` Failed to delete: ${error.message}`);
    setTimeout(() => setOperationMessage(""), 3000);
  } finally {
    setDeletingRowId(null);
  }
};
  
const handleAdd = async () => {
  console.log("=== ADD BUTTON CLICKED ===");
  setErrors({});
  setOperationMessage(""); // Clear previous messages
  
  try {
    // Validate year column
    if (yearColumn) {
      const yearValue = newRow[yearColumn];
      console.log("Year validation - yearValue:", yearValue);
      
      if (!yearValue && yearValue !== 0) {
        console.log("Year validation FAILED: Year is required");
        setErrors({ [yearColumn]: "Year is required" });
        setOperationMessage(" Year is required");
        setTimeout(() => setOperationMessage(""), 3000);
        return;
      }
      
      const yearNum = Number(yearValue);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        console.log("Year validation FAILED: Invalid year range");
        setErrors({ [yearColumn]: "Year must be between 1900-2100" });
        setOperationMessage(" Invalid year");
        setTimeout(() => setOperationMessage(""), 3000);
        return;
      }
    }
    
    // Validate numeric fields
    const fieldErrors = {};
    allColumns.forEach((col) => {
      const fieldType = getFieldType(col);
      const value = newRow[col];
      
      if (fieldType === "number" && value !== "" && value !== null) {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) {
          fieldErrors[col] = "Must be a non-negative number";
        }
      }
    });
    
    if (Object.keys(fieldErrors).length > 0) {
      console.log("Field validation FAILED:", fieldErrors);
      setErrors(fieldErrors);
      setOperationMessage(" Please fix validation errors");
      setTimeout(() => setOperationMessage(""), 3000);
      return;
    }
    
    console.log(" All validations passed");
    
    // Start adding
    setIsAddingNew(true);
    console.log(" isAddingNew set to TRUE");
    
    // Prepare data
    const dataToSave = { ...newRow };
    
    allColumns.forEach((col) => {
      const fieldType = getFieldType(col);
      const value = dataToSave[col];
      
      if ((fieldType === "number" || col === yearColumn) && value !== "") {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          dataToSave[col] = numValue;
        }
      }
    });
    
    // Remove empty fields
    Object.keys(dataToSave).forEach((key) => {
      if (dataToSave[key] === "") delete dataToSave[key];
    });
    
    console.log(" Data prepared for Firestore:", dataToSave);
    
    // Add to Firestore
    console.log(" Calling addRecord...");
    const addedRecord = await addRecord(dataToSave, datasetName);
    console.log(" addRecord returned:", addedRecord);
    
    if (!addedRecord?.id) {
      throw new Error("Failed to get record ID from Firestore");
    }
    
    console.log("📝 Record ID received:", addedRecord.id);
    
    // Update local state
    console.log("🔄 Updating local state...");
    setData((prev) => {
      const updated = [...prev, { ...dataToSave, id: addedRecord.id }];
      console.log("✅ Local state updated, new length:", updated.length);
      return updated;
    });
    
    console.log("🧹 Resetting newRow...");
    setNewRow(createBlankRow());
    
    console.log("🧹 Clearing errors...");
    setErrors({});
    
    console.log("✅ Setting success message...");
    setOperationMessage("✅ Record added successfully!");
    
    // Update pagination
    const totalRecords = data.length + 1;
    if (totalRecords > currentPage * rowsPerPage) {
      const newPage = Math.ceil(totalRecords / rowsPerPage);
      console.log("📄 Moving to page:", newPage);
      setCurrentPage(newPage);
    }
    
    setTimeout(() => setOperationMessage(""), 2000);
    console.log("🎉 ADD OPERATION COMPLETED SUCCESSFULLY");
    
  } catch (error) {
    console.error("❌ ERROR in handleAdd:", error);
    console.error("Error stack:", error.stack);
    setOperationMessage(`❌ ${error?.message || "Failed to add record"}`);
    setTimeout(() => setOperationMessage(""), 3000);
  } finally {
    console.log("🔓 Setting isAddingNew to FALSE");
    setIsAddingNew(false); // Always unlock the button
  }
};
  
const handleCellChange = (rowIndex, field, value, isNewRow = false) => {
  console.log("Cell change:", { rowIndex, field, value, isNewRow });
  
  if (isNewRow) {
    setNewRow(prev => {
      const updated = { ...prev, [field]: value };
      console.log("New row updated:", updated);
      return updated;
    });
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  } else {
    // Get row from paginated data and find by ID in original data
    const row = paginatedData[rowIndex];
    if (row) {
      const originalIndex = data.findIndex(d => d.id === row.id);
      if (originalIndex !== -1) {
        const updatedData = [...data];
        updatedData[originalIndex] = {
          ...updatedData[originalIndex],
          [field]: value
        };
        setData(updatedData);
      }
    }
  }
  
  setEditingField({ rowIndex, field });
};
  
  const generatePageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const PaginationControls = () => (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100 data-table__summary data-table__summary--records">
          <span className="data-table__summary-heading">Showing records</span>
          <span className="data-table__summary-value">{startIndex + 1} - {Math.min(endIndex, data.length)}</span>
          <span className="data-table__summary-label">of</span>
          <span className="data-table__summary-value">{data.length}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <ChevronLeft size={18} />
            <span>Previous</span>
          </button>
          
          <div className="flex items-center gap-1 pagination">
            {generatePageNumbers().map((pageNum, idx) => (
              pageNum === '...' ? (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`pagination-btn ${currentPage === pageNum ? 'pagination-active' : 'pagination-inactive'}`}
                  aria-current={currentPage === pageNum ? "page" : undefined}
                >
                  {pageNum}
                </button>
              )
            ))}
          </div>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <span>Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
        
        <div className="text-sm bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 rounded-lg border border-emerald-100 data-table__summary data-table__summary--page">
          <span className="data-table__summary-heading">Page</span>
          <span className="data-table__summary-value">{currentPage}</span>
          <span className="data-table__summary-label">of</span>
          <span className="data-table__summary-value">{totalPages}</span>
        </div>
      </div>
      
      <div className="mt-3 flex justify-center">
        <div className="flex items-center gap-2 text-sm">
          <span className="data-table__meta-label">Go to page:</span>
          <select 
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="px-3 py-1 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm data-table__select"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <option key={page} value={page}>{page}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
  
  if (!allColumns.length) {
    return (
      <div className="data-table animate-fade-in">
        <div className="data-table__body">
          <div className="empty-state">
            <div className="empty-state__icon">📄</div>
            <h3 className="empty-state__title">Upload data to get started</h3>
            <p className="empty-state__subtitle">Your CSV records will appear here for easy editing.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="data-table animate-fade-in">
      <div className="data-table__header">
        <div className="data-table__header-content">
          <div className="data-table__stat">
            <div className="stat-card-compact">
              <div className="stat-value">{data.length}</div>
              <div className="stat-label">TOTAL RECORDS</div>
            </div>

            {yearColumn && (
              <div className="ml-4 px-3 py-1 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-sm text-blue-700 font-medium">Year Column:</span>
                <span className="ml-1 text-sm font-bold text-blue-800">{yearColumn}</span>
              </div>
            )}
          </div>

          <div className="data-table__actions">
            {data.length > 0 && safeUserRole === 'admin' && (
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="btn-reset"
                title="Delete all records from the database"
              >
                <RotateCcw size={18} className={isResetting ? "animate-spin" : ""} />
                <span>{isResetting ? "Resetting..." : "Reset All Data"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="data-table__body">
        {operationMessage && (
          <div
            className={`alert mb-4 ${
              operationMessage.includes('✅')
                ? 'alert-success'
                : operationMessage.includes('❌')
                ? 'alert-error'
                : 'alert-info'
            }`}
          >
            {operationMessage.includes('❌') && <AlertCircle size={18} />}
            {operationMessage.includes('✅') && <CheckCircle2 size={18} />}
            <span>{operationMessage}</span>
          </div>
        )}

        {data.length > rowsPerPage && <PaginationControls />}

        <div className="data-table__scroll">
          <table>
            <thead>
              <tr>
                {allColumns.map((col) => (
                  <th key={col} className="text-base font-bold">
                    {col}
                    {col === yearColumn && (
                      <span className="ml-2 text-xs font-normal text-blue-400">(Year Column - Read Only)</span>
                    )}
                  </th>
                ))}
                <th className="text-base font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIndex) => (
                <tr key={row.id || startIndex + rowIndex} className={editRowIndex === startIndex + rowIndex ? "data-table__row--editing" : ""}>
                  {allColumns.map((col) => {
                    const fieldType = getFieldType(col);
                    const isYear = col === yearColumn;
                    const isNumeric = fieldType === "number";
                    const hasError = errors[col] && editRowIndex === startIndex + rowIndex;
                    const cellValue = row[col];
                    
                    return (
                      <td key={col} className={`${isYear ? 'year-column' : ''} relative group`}>
                        {isYear && cellValue && (
                          <>
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b"
                              style={{ 
                                background: `linear-gradient(to bottom, ${getYearColor(cellValue)}80, ${getYearColor(cellValue)})`,
                                borderTopRightRadius: '4px',
                                borderBottomRightRadius: '4px'
                              }}
                              title={`Year ${cellValue}`}
                            />
                            <div 
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ backgroundColor: getYearColor(cellValue) }}
                              title={`Color code for Year ${cellValue}`}
                            />
                          </>
                        )}
                        
                        {editRowIndex === startIndex + rowIndex ? (
                          <div>
                            <TableInput
                              type={isYear || isNumeric ? "number" : "text"}
                              value={cellValue || ""}
                              onChange={(e) => handleCellChange(rowIndex, col, e.target.value, false)}
                              onClick={() => handleFieldClick(rowIndex, col)}
                              hasError={hasError}
                              isYear={isYear}
                              isNewRow={false}
                              readOnly={isYear}
                              placeholder={isYear ? "Year (read-only)" : isNumeric ? "0" : ""}
                              disabled={savingRowId === row.id}
                              autoFocus={editingField?.rowIndex === rowIndex && editingField?.field === col}
                            />
                            {hasError && (
                              <div className="data-table__validation-error mt-2">
                                <AlertCircle size={14} />
                                <span className="font-medium">{errors[col]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`data-table__value${isYear ? ' data-table__value--year' : ''}`}>
                              {formatCell(cellValue)}
                            </span>
                            {isYear && cellValue && (
                              <div 
                                className="w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                                style={{ backgroundColor: getYearColor(cellValue) }}
                                title={`Year ${cellValue} color`}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  
                  <td>
                    <div className="table-actions">
                      {editRowIndex === startIndex + rowIndex ? (
                        <button 
                          className="btn btn-success" 
                          onClick={() => handleSaveEdit(rowIndex)}
                          disabled={savingRowId === row.id}
                        >
                          {savingRowId === row.id ? "Saving..." : "💾 Save"}
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleEdit(rowIndex)}
                          disabled={editRowIndex !== null}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleDelete(rowIndex)}
                        disabled={deletingRowId === row.id || editRowIndex === startIndex + rowIndex}
                      >
                        {deletingRowId === row.id ? "Deleting..." : "🗑️ Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Add New Row */}
              {safeUserRole === 'admin' && (
                <tr className="data-table__new-row">
                  {allColumns.map((col) => {
                    const fieldType = getFieldType(col);
                    const isYear = col === yearColumn;
                    const isNumeric = fieldType === "number";
                    const hasError = errors[col];
                    
                    return (
                      <td key={col} className={isYear ? 'year-column' : ''}>
                        <div>
                          <TableInput
                            type={isYear || isNumeric ? "number" : "text"}
                            value={newRow[col] || ""}
                            onChange={(e) => handleCellChange(null, col, e.target.value, true)}
                            onClick={() => handleFieldClick(-1, col)}
                            hasError={hasError}
                            isYear={isYear}
                            isNewRow={true}
                            placeholder={
                              isYear ? "📅 Year (e.g., 2000)" : 
                              isNumeric ? `${col} (number)` : 
                              `Enter ${col}`
                            }
                            disabled={isAddingNew}
                            autoFocus={editingField?.rowIndex === -1 && editingField?.field === col}
                          />
                          {hasError && (
                            <div className="data-table__validation-error mt-2">
                              <AlertCircle size={14} />
                              <span className="font-medium">{errors[col]}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  
                  <td>
                    <button 
                      className="btn btn-success w-full btn-large" 
                      onClick={handleAdd}
                      disabled={isAddingNew}
                      style={{
                        cursor: isAddingNew ? 'not-allowed' : 'pointer',
                        pointerEvents: 'auto',
                        zIndex: 10,
                        position: 'relative'
                      }}
                    >
                      {isAddingNew ? "⏳ Adding..." : "➕ Add New Record"}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>  
          </table>
        </div>
        
        {data.length > rowsPerPage && <PaginationControls />}
      </div>
    </div>
  );
};

export default DataTable;
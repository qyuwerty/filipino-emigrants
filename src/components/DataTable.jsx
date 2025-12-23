import React, { useEffect, useMemo, useState } from "react";
import { addRecord, updateRecord, deleteRecord } from "../services/firestoreService";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// ✅ FIX: format object fields safely so UI doesn't crash
const formatCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value); 
  return String(value);
};

// Validate Year as 4-digit number (1900-2100)
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

// Validate numeric field
const validateNumber = (value, fieldName) => {
  if (value === "" || value === null || value === undefined) {
    return { valid: true, value: 0 }; // Allow empty, default to 0
  }
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return { valid: false, message: `${fieldName} must be a number` };
  }
  if (numValue < 0) {
    return { valid: false, message: `${fieldName} cannot be negative` };
  }
  return { valid: true, value: numValue };
};

// Get field type based on column name
const getFieldType = (columnName) => {
  const colLower = columnName.toLowerCase();
  if (colLower === "year") return "year";
  const numericFields = ["single", "married", "widower", "widowed", "separated", "divorced", "notreported", "not-reported", "live_in", "live-in", "quantity"];
  if (numericFields.some(field => colLower.includes(field))) return "number";
  return "text";
};

const DataTable = ({ data = [], setData = () => {}, schema = [], types = {} }) => {
  const columns = data.length ? Object.keys(data[0]).filter(col => col !== "id") : [];
  const blankRow = useMemo(
    () => Object.fromEntries(columns.map((col) => [col, ""])),
    [columns]
  );

  const [editRowIndex, setEditRowIndex] = useState(null);
  const [newRow, setNewRow] = useState(blankRow);
  const [errors, setErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState({ type: null, message: "" });

  useEffect(() => {
    setNewRow(blankRow);
    setErrors({});
  }, [blankRow]);

  const handleEdit = (index) => {
    setEditRowIndex(index);
    setErrors({});
    setSaveStatus({ type: null, message: "" });
  };

  // Validate and prepare data for Firestore
  const validateAndPrepareData = (rowData, isNew = false) => {
    const errors = {};
    const preparedData = {};

    columns.forEach((col) => {
      const value = rowData[col];
      const fieldType = getFieldType(col);

      if (col.toLowerCase() === "year") {
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
        // For other fields, keep as string or convert appropriately
        preparedData[col] = value !== null && value !== undefined ? String(value).trim() : "";
      }
    });

    return { errors, preparedData };
  };

  const handleSaveEdit = async (index) => {
    const row = data[index];
    const { errors: validationErrors, preparedData } = validateAndPrepareData(row, false);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveStatus({ type: "error", message: "Please fix validation errors before saving" });
      return;
    }

    try {
      setSaveStatus({ type: "loading", message: "Saving..." });
      // Remove id from data before sending to Firestore (id is document ID, not a field)
      const { id, ...dataToSave } = preparedData;
      await updateRecord(row.id, dataToSave);
      setSaveStatus({ type: "success", message: "Record updated successfully!" });
      setEditRowIndex(null);
      setErrors({});
      setTimeout(() => setSaveStatus({ type: null, message: "" }), 2000);
    } catch (error) {
      console.error("Error updating record:", error);
      setSaveStatus({ type: "error", message: `Failed to update: ${error.message}` });
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      const row = data[index];
      await deleteRecord(row.id);
      const updated = [...data];
      updated.splice(index, 1);
      setData(updated);
      setSaveStatus({ type: "success", message: "Record deleted successfully!" });
      setTimeout(() => setSaveStatus({ type: null, message: "" }), 2000);
    } catch (error) {
      console.error("Error deleting record:", error);
      setSaveStatus({ type: "error", message: `Failed to delete: ${error.message}` });
    }
  };

  const handleAdd = async () => {
    const { errors: validationErrors, preparedData } = validateAndPrepareData(newRow, true);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveStatus({ type: "error", message: "Please fix validation errors before adding" });
      return;
    }

    try {
      setSaveStatus({ type: "loading", message: "Adding record..." });
      await addRecord(preparedData);
      setData([...data, { ...preparedData, id: `temp-${Date.now()}` }]); // Temporary ID until Firestore syncs
      setNewRow(blankRow);
      setErrors({});
      setSaveStatus({ type: "success", message: "Record added successfully!" });
      setTimeout(() => setSaveStatus({ type: null, message: "" }), 2000);
    } catch (error) {
      console.error("Error adding record:", error);
      setSaveStatus({ type: "error", message: `Failed to add: ${error.message}` });
    }
  };

  const handleCellChange = (rowIndex, column, value, isNewRow = false) => {
    if (isNewRow) {
      setNewRow({ ...newRow, [column]: value });
      // Clear error for this field when user starts typing
      if (errors[column]) {
        setErrors({ ...errors, [column]: undefined });
      }
    } else {
      const updated = [...data];
      updated[rowIndex][column] = value;
      setData(updated);
      if (errors[column]) {
        setErrors({ ...errors, [column]: undefined });
      }
    }
  };

  if (!columns.length) {
    return (
      <div className="card data-table animate-fade-in">
        <div className="card-body empty-state">
          <div className="empty-state-icon">📄</div>
          <h3>Upload data to get started</h3>
          <p>Your CSV records will appear here for easy editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card data-table animate-fade-in">
      <div className="card-header data-table__header">
        <div>
          <p className="data-table__eyebrow">Realtime dataset</p>
          <h2>CSV Data Table</h2>
          <p className="data-table__subtitle">
            Review, edit, and add records synced with Firebase. Friendly controls help keep your data tidy.
          </p>
        </div>

        <div className="data-table__stat">
          <span className="stat-label">Total records</span>
          <span className="stat-value">{data.length}</span>
        </div>
      </div>

      <div className="card-body data-table__body">
        {/* Status Messages */}
        {saveStatus.type && (
          <div className={`alert ${saveStatus.type === "error" ? "alert-error" : saveStatus.type === "success" ? "alert-success" : "alert-info"} mb-4`}>
            {saveStatus.type === "error" && <AlertCircle size={18} />}
            {saveStatus.type === "success" && <CheckCircle2 size={18} />}
            <span>{saveStatus.message}</span>
          </div>
        )}

        {/* ========== VALIDATION TIP ========== */}
        {/* Helpful guidance for students */}
        <div className="data-table__tip mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <strong className="text-base block mb-2">Data Entry Rules:</strong>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• <strong>Year:</strong> Must be exactly 4 digits (e.g., 2000, 2022)</li>
                <li>• <strong>Year Range:</strong> Between 1900 and 2100</li>
                <li>• <strong>Status Fields:</strong> Must be numbers (0 or positive) - no decimals</li>
                <li>• <strong>Empty Fields:</strong> Will default to 0 for numeric fields</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ========== DATA TABLE ========== */}
        <div className="data-table__scroll">
          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} className="text-base font-bold">
                    {col}
                  </th>
                ))}
                <th className="text-base font-bold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className={editRowIndex === rowIndex ? "data-table__row--editing" : ""}>
                  {columns.map((col) => {
                    const fieldType = getFieldType(col);
                    const isYear = col.toLowerCase() === "year";
                    const isNumeric = fieldType === "number";
                    const hasError = errors[col] && editRowIndex === rowIndex;
                    
                    return (
                      <td key={col}>
                        {editRowIndex === rowIndex ? (
                          <div>
                            <input
                              type={isYear || isNumeric ? "number" : "text"}
                              value={row[col] || ""}
                              onChange={(e) => handleCellChange(rowIndex, col, e.target.value, false)}
                              className={hasError ? "border-red-500" : ""}
                              placeholder={isYear ? "e.g., 2000" : isNumeric ? "0" : ""}
                              min={isYear ? 1900 : isNumeric ? 0 : undefined}
                              max={isYear ? 2100 : undefined}
                              step={isNumeric ? 1 : undefined}
                            />
                            {hasError && (
                              <div className="data-table__validation-error mt-2">
                                <AlertCircle size={14} />
                                <span className="font-medium">{errors[col]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          formatCell(row[col])
                        )}
                      </td>
                    );
                  })}

                  <td>
                    <div className="table-actions">
                      {editRowIndex === rowIndex ? (
                        <button 
                          className="btn btn-success" 
                          onClick={() => handleSaveEdit(rowIndex)}
                          disabled={saveStatus.type === "loading"}
                        >
                          {saveStatus.type === "loading" ? "Saving..." : "💾 Save"}
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleEdit(rowIndex)}
                        >
                          ✏️ Edit
                        </button>
                      )}

                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleDelete(rowIndex)}
                        disabled={saveStatus.type === "loading"}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="data-table__new-row">
                {columns.map((col) => {
                  const fieldType = getFieldType(col);
                  const isYear = col.toLowerCase() === "year";
                  const isNumeric = fieldType === "number";
                  const hasError = errors[col];
                  
                  return (
                    <td key={col}>
                      <div>
                        <input
                          type={isYear || isNumeric ? "number" : "text"}
                          value={newRow[col] || ""}
                          onChange={(e) => handleCellChange(null, col, e.target.value, true)}
                          className={hasError ? "border-red-500" : ""}
                          placeholder={
                            isYear ? "Year (e.g., 2000)" : 
                            isNumeric ? `${col} (number)` : 
                            `Enter ${col}`
                          }
                          min={isYear ? 1900 : isNumeric ? 0 : undefined}
                          max={isYear ? 2100 : undefined}
                          step={isNumeric ? 1 : undefined}
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
                    disabled={saveStatus.type === "loading"}
                  >
                    {saveStatus.type === "loading" ? "⏳ Adding..." : "➕ Add New Record"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
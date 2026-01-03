import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit2, Save, X, Search, Filter, Download, 
  ChevronLeft, ChevronRight, MoreVertical 
} from 'lucide-react';

const AgeDataTable = ({ data, loading, error, userRole, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    mode: 'existing',
    ageGroup: '',
    newAgeGroup: '',
    year: '',
    count: '',
    yearCountPairs: [{ year: '', count: '' }]
  });

  const itemsPerPage = 10;
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Get unique age groups from data (dynamic from database)
  const ageGroups = [...new Set(data.map(item => item.ageGroup))].sort();

  // Get unique years from data for filter
  const availableYears = [...new Set(data.map(item => item.year))].sort((a, b) => a - b);
  
  // Generate all years from 1981 to 2020
  const allYears = [];
  for (let year = 1981; year <= 2020; year++) {
    allYears.push(year);
  }

  // Filter data based on search and year
  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      item.ageGroup?.toLowerCase().includes(searchLower) ||
      item.count?.toString().includes(searchLower)
    );
    const matchesYear = selectedYear === 'all' || item.year === parseInt(selectedYear);
    return matchesSearch && matchesYear;
  });

  // Group data by age groups for the selected year
  const groupedData = ageGroups.map(ageGroup => {
    // Get all data for this age group
    const ageGroupData = data.filter(item => item.ageGroup === ageGroup);
    
    // Debug logging for each age group
    console.log(`Age Group: ${ageGroup}, Total records: ${ageGroupData.length}`);
    
    if (selectedYear === 'all') {
      // Show all years data - sum counts across all years for this age group
      const totalCount = ageGroupData.reduce((sum, item) => {
        const count = parseInt(item.count) || 0;
        return sum + count;
      }, 0);
      
      console.log(`  ${ageGroup} - All Years Total: ${totalCount} from ${ageGroupData.length} records`);
      
      return {
        id: ageGroup,
        ageGroup: ageGroup,
        count: totalCount,
        years: ageGroupData,
        isAllYears: true
      };
    } else {
      // Show specific year data
      const yearItem = ageGroupData.find(item => item.year === parseInt(selectedYear));
      const count = yearItem ? parseInt(yearItem.count) || 0 : 0;
      
      console.log(`  ${ageGroup} - Year ${selectedYear}: ${count} (found: ${!!yearItem})`);
      
      return {
        id: `${ageGroup}_${selectedYear}`,
        ageGroup: ageGroup,
        count: count,
        year: parseInt(selectedYear),
        isAllYears: false
      };
    }
  });

  // Pagination
  const totalPages = Math.ceil(groupedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = groupedData.slice(startIndex, startIndex + itemsPerPage);

  // Handle edit
  const handleEdit = (row) => {
    setEditingRow(row.id);
    setEditForm({
      ageGroup: row.ageGroup,
      year: row.year || selectedYear,
      count: row.count
    });
  };

  // Handle save
  const handleSave = async (row) => {
    try {
      const year = row.year || selectedYear;
      if (selectedYear === 'all') {
        // For "all years" view, we need to handle multiple years
        alert('Please select a specific year to edit data');
        return;
      }
      await onUpdate(row.ageGroup, parseInt(year), editForm.count);
      setEditingRow(null);
      setEditForm({});
    } catch (error) {
      alert('Error updating record: ' + error.message);
    }
  };

  // Handle delete
  const handleDelete = async (row, deleteAll = false) => {
    let confirmMessage = '';
    let deleteFunction = null;
    
    if (deleteAll) {
      // Delete entire age group
      confirmMessage = `Are you sure you want to delete ALL data for age group "${row.ageGroup.replace(/__/g, ' ')}"? This will remove the entire document and all years of data.`;
      deleteFunction = () => onDelete(row.ageGroup, null, true);
    } else {
      // Delete specific year
      const year = row.year || selectedYear;
      if (selectedYear === 'all') {
        alert('Please select a specific year to delete data, or use "Delete All" to remove the entire age group.');
        return;
      }
      confirmMessage = `Are you sure you want to delete the data for age group "${row.ageGroup.replace(/__/g, ' ')}" in year ${year}?`;
      deleteFunction = () => onDelete(row.ageGroup, parseInt(year), false);
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteFunction();
      } catch (error) {
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  // Handle add
  const handleAdd = async () => {
    try {
      if (addForm.mode === 'new') {
        // Add new age group with multiple years
        const yearCountPairs = addForm.yearCountPairs.filter(pair => pair.year && pair.count);
        if (!addForm.newAgeGroup || yearCountPairs.length === 0) {
          alert('Please enter age group name and at least one year/count pair');
          return;
        }
        
        // Add each year/count pair for the new age group
        for (const pair of yearCountPairs) {
          await onAdd(addForm.newAgeGroup, parseInt(pair.year), parseInt(pair.count));
        }
      } else {
        // Add to existing age group
        const year = selectedYear === 'all' ? new Date().getFullYear() : parseInt(selectedYear);
        if (!addForm.ageGroup || !addForm.year || !addForm.count) {
          alert('Please fill all fields');
          return;
        }
        await onAdd(addForm.ageGroup, year, parseInt(addForm.count));
      }
      
      setShowAddForm(false);
      setAddForm({ 
        mode: 'existing', 
        ageGroup: '', 
        newAgeGroup: '', 
        year: '', 
        count: '',
        yearCountPairs: [{ year: '', count: '' }]
      });
    } catch (error) {
      alert('Error adding record: ' + error.message);
    }
  };

  // Add year/count pair for new age group
  const addYearCountPair = () => {
    setAddForm({
      ...addForm,
      yearCountPairs: [...addForm.yearCountPairs, { year: '', count: '' }]
    });
  };

  // Remove year/count pair
  const removeYearCountPair = (index) => {
    setAddForm({
      ...addForm,
      yearCountPairs: addForm.yearCountPairs.filter((_, i) => i !== index)
    });
  };

  // Update year/count pair
  const updateYearCountPair = (index, field, value) => {
    const updatedPairs = [...addForm.yearCountPairs];
    updatedPairs[index][field] = value;
    setAddForm({
      ...addForm,
      yearCountPairs: updatedPairs
    });
  };

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading age data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading age data: {error}</p>
        <button onClick={() => window.location.reload()} className="button button--primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="data-table">
      {/* Table Controls */}
      <div className="data-table__controls">
        <div className="data-table__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by age group or count..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="data-table__year-filter">
          <Filter size={20} />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="year-filter-select"
          >
            <option value="all">All Years</option>
            {allYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        {isPrivileged && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="button button--primary"
          >
            <Plus size={16} />
            Add Record
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="add-form">
          <h4>Add New Age Record</h4>
          
          {/* Mode Selection */}
          <div className="form-group">
            <label>Add Mode:</label>
            <div className="mode-buttons">
              <button
                type="button"
                onClick={() => setAddForm({...addForm, mode: 'existing'})}
                className={`button ${addForm.mode === 'existing' ? 'button--primary' : 'button--ghost'}`}
              >
                Add to Existing Age Group
              </button>
              <button
                type="button"
                onClick={() => setAddForm({...addForm, mode: 'new'})}
                className={`button ${addForm.mode === 'new' ? 'button--primary' : 'button--ghost'}`}
              >
                Create New Age Group
              </button>
            </div>
          </div>

          <div className="form-grid">
            {addForm.mode === 'existing' ? (
              <>
                <select
                  value={addForm.ageGroup}
                  onChange={(e) => setAddForm({...addForm, ageGroup: e.target.value})}
                  className="form-input"
                >
                  <option value="">Select Age Group</option>
                  {ageGroups.map(group => (
                    <option key={group} value={group}>
                      {group.replace(/__/g, ' ')}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Year"
                  value={addForm.year}
                  onChange={(e) => setAddForm({...addForm, year: e.target.value})}
                  className="form-input"
                  min="1981"
                  max="2020"
                />
                <input
                  type="number"
                  placeholder="Count"
                  value={addForm.count}
                  onChange={(e) => setAddForm({...addForm, count: e.target.value})}
                  className="form-input"
                  min="0"
                />
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="New Age Group (e.g., 75__Above)"
                  value={addForm.newAgeGroup}
                  onChange={(e) => setAddForm({...addForm, newAgeGroup: e.target.value})}
                  className="form-input"
                />
                <div className="year-count-pairs">
                  <label>Year/Count Pairs:</label>
                  {addForm.yearCountPairs.map((pair, index) => (
                    <div key={index} className="pair-inputs">
                      <input
                        type="number"
                        placeholder="Year"
                        value={pair.year}
                        onChange={(e) => {
                          const updatedPairs = [...addForm.yearCountPairs];
                          updatedPairs[index].year = e.target.value;
                          setAddForm({...addForm, yearCountPairs: updatedPairs});
                        }}
                        className="form-input form-input--small"
                        min="1981"
                        max="2020"
                      />
                      <input
                        type="number"
                        placeholder="Count"
                        value={pair.count}
                        onChange={(e) => {
                          const updatedPairs = [...addForm.yearCountPairs];
                          updatedPairs[index].count = e.target.value;
                          setAddForm({...addForm, yearCountPairs: updatedPairs});
                        }}
                        className="form-input form-input--small"
                      />
                      {addForm.yearCountPairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddForm({
                              ...addForm,
                              yearCountPairs: addForm.yearCountPairs.filter((_, i) => i !== index)
                            });
                          }}
                          className="button button--sm button--danger"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddForm({
                      ...addForm,
                      yearCountPairs: [...addForm.yearCountPairs, { year: '', count: '' }]
                    })}
                    className="button button--sm button--ghost"
                  >
                    <Plus size={14} />
                    Add Year
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="form-actions">
            <button onClick={handleAdd} className="button button--primary">
              <Save size={16} /> Save
            </button>
            <button 
              onClick={() => {
                setShowAddForm(false);
                setAddForm({ 
                  mode: 'existing', 
                  ageGroup: '', 
                  newAgeGroup: '', 
                  year: '', 
                  count: '',
                  yearCountPairs: [{ year: '', count: '' }]
                });
              }} 
              className="button button--ghost"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {/* Summary Header */}
        <div className="table-summary-header">
          <h3>
            {selectedYear === 'all' 
              ? `All Years Summary (${availableYears.length} years)` 
              : `Year ${selectedYear} Data`
            }
          </h3>
          <div className="summary-stats">
            <span className="stat-item">
              <strong>{ageGroups.length}</strong> Age Groups
            </span>
            <span className="stat-item">
              <strong>{groupedData.length}</strong> Records
            </span>
            {selectedYear !== 'all' && (
              <span className="stat-item">
                <strong>{groupedData.reduce((sum, item) => sum + (item.count || 0), 0)}</strong> Total Count
              </span>
            )}
          </div>
          <p>
            {selectedYear === 'all' 
              ? `Showing total counts across all years for each age group` 
              : `Showing emigrant counts for ${selectedYear} by age group`
            }
          </p>
        </div>
        
        <table className="data-table__table">
          <thead>
            <tr>
              <th>Age Group</th>
              <th>
                {selectedYear === 'all' ? 'Total Count (All Years)' : `Count (${selectedYear})`}
              </th>
              {isPrivileged && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={isPrivileged ? 3 : 2} className="no-data">
                  {searchTerm ? 'No matching records found' : 'No data available'}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={row.id}>
                  <td>
                    {editingRow === row.id ? (
                      <select
                        value={editForm.ageGroup}
                        onChange={(e) => setEditForm({...editForm, ageGroup: e.target.value})}
                        className="form-input"
                      >
                        {ageGroups.map(group => (
                          <option key={group} value={group}>
                            {group.replace(/__/g, ' ')}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.ageGroup?.replace(/__/g, ' ') || 'N/A'
                    )}
                  </td>
                  <td>
                    {editingRow === row.id ? (
                      <input
                        type="number"
                        value={editForm.count}
                        onChange={(e) => setEditForm({...editForm, count: e.target.value})}
                        className="form-input"
                        min="0"
                      />
                    ) : (
                      row.count?.toLocaleString() || 'N/A'
                    )}
                  </td>
                  {isPrivileged && (
                    <td>
                      <div className="action-buttons">
                        {editingRow === row.id ? (
                          <>
                            <button
                              onClick={() => handleSave(row)}
                              className="button button--sm button--primary"
                              title="Save"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingRow(null);
                                setEditForm({});
                              }}
                              className="button button--sm button--ghost"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(row)}
                              className="button button--sm button--ghost"
                              title="Edit"
                              disabled={selectedYear === 'all'}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row, false)}
                              className="button button--sm button--danger"
                              title="Delete Year"
                              disabled={selectedYear === 'all'}
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(row, true)}
                              className="button button--sm button--danger"
                              title="Delete All Years"
                            >
                              <Trash2 size={14} />
                              <span className="delete-all-indicator">×</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="button button--ghost"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({groupedData.length} records)
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="button button--ghost"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AgeDataTable;

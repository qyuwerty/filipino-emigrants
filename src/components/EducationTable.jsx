import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEducationData } from '../hooks/useEducationData';

const EducationTable = ({ userRole }) => {
  const { data, loading, error, addRecord, updateRecord, deleteRecord } = useEducationData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    educationGroup: '',
    year: '',
    count: ''
  });

  const itemsPerPage = 10;
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Generate all years from 1988 to 2020 (based on the data structure)
  const allYears = [];
  for (let year = 1988; year <= 2020; year++) {
    allYears.push(year);
  }
  
  console.log('Education - Available years in data:', [...new Set(data.map(item => item.year))].sort());
  console.log('Education - AllYears array:', allYears);

  // Get unique education groups
  const educationGroups = useMemo(() => {
    const groups = [...new Set(data.map(item => item.educationGroup))];
    return groups.sort();
  }, [data]);

  // Process data based on year selection and search
  const processedData = useMemo(() => {
    let filteredData = data;

    // Debug logging
    console.log('Education - Raw data:', data);
    console.log('Education - Selected year:', selectedYear);

    // Aggregate data based on year selection
    if (selectedYear === 'all') {
      // Aggregate all years - sum counts for each education group
      const educationGroupMap = new Map();
      
      data.forEach(item => {
        const matchesSearch = item.educationGroup.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (matchesSearch) {
          if (!educationGroupMap.has(item.educationGroup)) {
            educationGroupMap.set(item.educationGroup, {
              educationGroup: item.educationGroup,
              count: 0,
              years: new Set()
            });
          }
          
          const groupData = educationGroupMap.get(item.educationGroup);
          groupData.count += item.count;
          groupData.years.add(item.year);
        }
      });
      
      const aggregatedData = Array.from(educationGroupMap.values()).map(group => ({
        id: group.educationGroup,
        educationGroup: group.educationGroup,
        count: group.count,
        isAllYears: true,
        yearCount: group.years.size
      }));
      
      console.log('Education - Aggregated data for all years:', aggregatedData);
      return aggregatedData.sort((a, b) => a.educationGroup.localeCompare(b.educationGroup));
    } else {
      // Filter by specific year
      console.log('Education - Filtering for specific year:', selectedYear);
      console.log('Education - Data before filtering:', data);
      
      filteredData = filteredData.filter(item => 
        item.year === parseInt(selectedYear) &&
        item.educationGroup.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      console.log('Education - Filtered data for year:', selectedYear, filteredData);
      console.log('Education - Filter condition check:', {
        selectedYear: selectedYear,
        parsedSelectedYear: parseInt(selectedYear),
        searchTerm: searchTerm,
        itemsFound: filteredData.length
      });
      
      return filteredData.sort((a, b) => a.educationGroup.localeCompare(b.educationGroup));
    }
  }, [data, selectedYear, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRecords = processedData.length;
    const totalCount = processedData.reduce((sum, item) => sum + item.count, 0);
    const yearRange = selectedYear === 'all' ? 'All Years' : selectedYear;
    
    return { totalRecords, totalCount, yearRange };
  }, [processedData, selectedYear]);

  const handleEdit = (record) => {
    if (record.isAllYears) {
      // For aggregated data, we need to find the first year for this education group
      const firstYearRecord = data.find(item => item.educationGroup === record.educationGroup);
      if (firstYearRecord) {
        setEditingRow(record.id);
        setEditForm({
          id: record.id,
          educationGroup: record.educationGroup,
          year: firstYearRecord.year,
          count: record.count,
          originalYear: firstYearRecord.year
        });
      }
    } else {
      // For specific year data
      setEditingRow(record.id);
      setEditForm({
        id: record.id,
        educationGroup: record.educationGroup,
        year: record.year,
        count: record.count,
        originalYear: record.year
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    
    try {
      await updateRecord(editForm.educationGroup, editForm.year, editForm.count);
      setEditingRow(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  const handleDelete = async (educationGroup, year) => {
    if (window.confirm(`Are you sure you want to delete education data for group "${educationGroup}" in year ${year}?`)) {
      try {
        await deleteRecord(educationGroup, year);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  const handleAdd = async () => {
    if (!addForm.educationGroup || !addForm.year || !addForm.count) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addRecord(addForm.educationGroup, parseInt(addForm.year), parseInt(addForm.count));
      setAddForm({ educationGroup: '', year: '', count: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading education data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading education data: {error}</p>
        <button onClick={() => window.location.reload()} className="button button--primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="data-table">
      {/* Table Summary Header */}
      <div className="table-summary-header">
        <h3>Education Data</h3>
        <p>Emigrant data by educational attainment from 1981-2020</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Records:</strong> {stats.totalRecords}
          </div>
          <div className="stat-item">
            <strong>Total Count:</strong> {stats.totalCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="data-table__controls">
        <div className="data-table__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by education group or count..."
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
              <option key={year} value={year}>{year}</option>
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
          <h4>Add New Education Record</h4>

          <div className="form-grid">
            <select
              value={addForm.educationGroup}
              onChange={(e) => setAddForm({...addForm, educationGroup: e.target.value})}
              className="form-input"
            >
              <option value="">Select Education Group</option>
              {educationGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            
            <input
              type="number"
              placeholder="Year"
              value={addForm.year}
              onChange={(e) => setAddForm({...addForm, year: e.target.value})}
              className="form-input"
              min="1988"
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
          </div>

          <div className="form-actions">
            <button onClick={handleAdd} className="button button--success">
              <Save size={16} />
              Add Record
            </button>
            <button onClick={() => setShowAddForm(false)} className="button button--ghost">
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingRow && (
        <div className="add-form">
          <h4>Edit Education Record</h4>
          
          <div className="form-grid">
            <select
              value={editForm.educationGroup}
              onChange={(e) => setEditForm({...editForm, educationGroup: e.target.value})}
              className="form-input"
            >
              {educationGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            
            <input
              type="number"
              value={editForm.year}
              onChange={(e) => setEditForm({...editForm, year: parseInt(e.target.value)})}
              className="form-input"
              min="1988"
              max="2020"
              placeholder="Year"
            />
            
            <input
              type="number"
              value={editForm.count}
              onChange={(e) => setEditForm({...editForm, count: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Count"
            />
          </div>
          
          <div className="form-actions">
            <button onClick={handleUpdate} className="button button--success">
              <Save size={16} />
              Update
            </button>
            <button onClick={() => {setEditingRow(null); setEditForm({});}} className="button button--ghost">
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <table className="data-table__table">
          <thead>
            <tr>
              <th>Education Group</th>
              <th>Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record) => (
              <tr key={record.id}>
                <td>{record.educationGroup}</td>
                <td>{record.count.toLocaleString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(record)}
                      className="button button--sm button--primary"
                      disabled={!isPrivileged || record.isAllYears}
                      title={!isPrivileged ? 'Insufficient permissions' : record.isAllYears ? 'Select a specific year to edit' : 'Edit record'}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(record.educationGroup, record.year)}
                      className="button button--sm button--danger"
                      disabled={!isPrivileged || record.isAllYears}
                      title={!isPrivileged ? 'Insufficient permissions' : record.isAllYears ? 'Select a specific year to delete' : `Delete year ${record.year}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {paginatedData.length === 0 && (
          <div className="no-data">
            No education data found for the selected criteria.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="button button--secondary"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="button button--secondary"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default EducationTable;

import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCivilStatusData } from '../hooks/useCivilStatusData';

const CivilStatusTable = ({ userRole }) => {
  const { data, loading, error, addRecord, updateRecord, deleteRecord } = useCivilStatusData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    year: '',
    divorced: '',
    married: '',
    separated: '',
    single: '',
    widower: ''
  });

  const itemsPerPage = 10;
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Generate all years from 1988 to 2020
  const allYears = [];
  for (let year = 1988; year <= 2020; year++) {
    allYears.push(year);
  }

  // Process data based on year selection and search
  const processedData = useMemo(() => {
    let filteredData = data;

    // Debug logging
    console.log('Civil Status - Raw data:', data);
    console.log('Civil Status - Selected year:', selectedYear);

    // Filter by year
    if (selectedYear !== 'all') {
      filteredData = filteredData.filter(item => item.year === parseInt(selectedYear));
      console.log('Civil Status - Filtered data for year:', selectedYear, filteredData);
    }

    // Filter by search term
    if (searchTerm) {
      filteredData = filteredData.filter(item => 
        item.year.toString().includes(searchTerm) ||
        item.divorced.toString().includes(searchTerm) ||
        item.married.toString().includes(searchTerm) ||
        item.separated.toString().includes(searchTerm) ||
        item.single.toString().includes(searchTerm) ||
        item.widower.toString().includes(searchTerm)
      );
    }

    return filteredData.sort((a, b) => a.year - b.year);
  }, [data, selectedYear, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalYears = processedData.length;
    const totalDivorced = processedData.reduce((sum, item) => sum + item.divorced, 0);
    const totalMarried = processedData.reduce((sum, item) => sum + item.married, 0);
    const totalSeparated = processedData.reduce((sum, item) => sum + item.separated, 0);
    const totalSingle = processedData.reduce((sum, item) => sum + item.single, 0);
    const totalWidower = processedData.reduce((sum, item) => sum + item.widower, 0);
    const totalSum = totalDivorced + totalMarried + totalSeparated + totalSingle + totalWidower;
    const yearRange = selectedYear === 'all' ? 'All Years' : selectedYear;
    
    return { totalYears, totalDivorced, totalMarried, totalSeparated, totalSingle, totalWidower, totalSum, yearRange };
  }, [processedData, selectedYear]);

  const handleEdit = (record) => {
    setEditingRow(record.year);
    setEditForm({
      year: record.year,
      divorced: record.divorced,
      married: record.married,
      separated: record.separated,
      single: record.single,
      widower: record.widower
    });
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    
    try {
      await updateRecord(editForm.year, editForm.divorced, editForm.married, editForm.separated, editForm.single, editForm.widower);
      setEditingRow(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  const handleDelete = async (year) => {
    if (window.confirm(`Are you sure you want to delete civil status data for year ${year}?`)) {
      try {
        await deleteRecord(year);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  const handleAdd = async () => {
    if (!addForm.year || !addForm.divorced || !addForm.married || !addForm.separated || !addForm.single || !addForm.widower) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addRecord(
        parseInt(addForm.year), 
        parseInt(addForm.divorced), 
        parseInt(addForm.married), 
        parseInt(addForm.separated), 
        parseInt(addForm.single), 
        parseInt(addForm.widower)
      );
      setAddForm({ year: '', divorced: '', married: '', separated: '', single: '', widower: '' });
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
        <p>Loading civil status data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading civil status data: {error}</p>
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
        <h3>Civil Status Data</h3>
        <p>Emigrant data by marital status from 1988-2020</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Years:</strong> {stats.totalYears}
          </div>
          <div className="stat-item">
            <strong>Total Divorced:</strong> {stats.totalDivorced.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Total Married:</strong> {stats.totalMarried.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Total Separated:</strong> {stats.totalSeparated.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Total Single:</strong> {stats.totalSingle.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Total Widower:</strong> {stats.totalWidower.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Total Count:</strong> {stats.totalSum.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="data-table__controls">
        <div className="data-table__search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by year or civil status counts..."
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
          <h4>Add New Civil Status Record</h4>

          <div className="form-grid">
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
              placeholder="Divorced Count"
              value={addForm.divorced}
              onChange={(e) => setAddForm({...addForm, divorced: e.target.value})}
              className="form-input"
              min="0"
            />
            
            <input
              type="number"
              placeholder="Married Count"
              value={addForm.married}
              onChange={(e) => setAddForm({...addForm, married: e.target.value})}
              className="form-input"
              min="0"
            />
            
            <input
              type="number"
              placeholder="Separated Count"
              value={addForm.separated}
              onChange={(e) => setAddForm({...addForm, separated: e.target.value})}
              className="form-input"
              min="0"
            />
            
            <input
              type="number"
              placeholder="Single Count"
              value={addForm.single}
              onChange={(e) => setAddForm({...addForm, single: e.target.value})}
              className="form-input"
              min="0"
            />
            
            <input
              type="number"
              placeholder="Widower Count"
              value={addForm.widower}
              onChange={(e) => setAddForm({...addForm, widower: e.target.value})}
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
          <h4>Edit Civil Status Record</h4>
          
          <div className="form-grid">
            <input
              type="number"
              value={editForm.year}
              disabled
              className="form-input"
              style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
            />
            
            <input
              type="number"
              value={editForm.divorced}
              onChange={(e) => setEditForm({...editForm, divorced: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Divorced Count"
            />
            
            <input
              type="number"
              value={editForm.married}
              onChange={(e) => setEditForm({...editForm, married: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Married Count"
            />
            
            <input
              type="number"
              value={editForm.separated}
              onChange={(e) => setEditForm({...editForm, separated: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Separated Count"
            />
            
            <input
              type="number"
              value={editForm.single}
              onChange={(e) => setEditForm({...editForm, single: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Single Count"
            />
            
            <input
              type="number"
              value={editForm.widower}
              onChange={(e) => setEditForm({...editForm, widower: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Widower Count"
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
              <th>Year</th>
              <th>Divorced</th>
              <th>Married</th>
              <th>Separated</th>
              <th>Single</th>
              <th>Widower</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record) => (
              <tr key={record.year}>
                <td>{record.year}</td>
                <td>{record.divorced.toLocaleString()}</td>
                <td>{record.married.toLocaleString()}</td>
                <td>{record.separated.toLocaleString()}</td>
                <td>{record.single.toLocaleString()}</td>
                <td>{record.widower.toLocaleString()}</td>
                <td>{record.total.toLocaleString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleEdit(record)}
                      className="button button--sm button--primary"
                      disabled={!isPrivileged}
                      title={!isPrivileged ? 'Insufficient permissions' : 'Edit record'}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(record.year)}
                      className="button button--sm button--danger"
                      disabled={!isPrivileged}
                      title={!isPrivileged ? 'Insufficient permissions' : 'Delete record'}
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
            No civil status data found for the selected criteria.
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

export default CivilStatusTable;

import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSexData } from '../hooks/useSexData';

const SexTable = ({ userRole }) => {
  const { data, loading, error, addRecord, updateRecord, deleteRecord } = useSexData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    year: '',
    female: '',
    male: ''
  });

  const itemsPerPage = 10;
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Generate all years from 1981 to 2020
  const allYears = [];
  for (let year = 1981; year <= 2020; year++) {
    allYears.push(year);
  }

  // Process data based on year selection and search
  const processedData = useMemo(() => {
    let filteredData = data;

    // Debug logging
    console.log('Sex - Raw data:', data);
    console.log('Sex - Selected year:', selectedYear);

    // Filter by year
    if (selectedYear !== 'all') {
      filteredData = filteredData.filter(item => item.year === parseInt(selectedYear));
      console.log('Sex - Filtered data for year:', selectedYear, filteredData);
    }

    // Filter by search term
    if (searchTerm) {
      filteredData = filteredData.filter(item => 
        item.year.toString().includes(searchTerm) ||
        item.female.toString().includes(searchTerm) ||
        item.male.toString().includes(searchTerm)
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
    const totalFemale = processedData.reduce((sum, item) => sum + item.female, 0);
    const totalMale = processedData.reduce((sum, item) => sum + item.male, 0);
    const totalSum = totalFemale + totalMale;
    const yearRange = selectedYear === 'all' ? 'All Years' : selectedYear;
    
    return { totalYears, totalFemale, totalMale, totalSum, yearRange };
  }, [processedData, selectedYear]);

  const handleEdit = (record) => {
    setEditingRow(record.year);
    setEditForm({
      year: record.year,
      female: record.female,
      male: record.male
    });
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    
    try {
      await updateRecord(editForm.year, editForm.female, editForm.male);
      setEditingRow(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  const handleDelete = async (year) => {
    if (window.confirm(`Are you sure you want to delete sex data for year ${year}?`)) {
      try {
        await deleteRecord(year);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  const handleAdd = async () => {
    if (!addForm.year || !addForm.female || !addForm.male) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addRecord(parseInt(addForm.year), parseInt(addForm.female), parseInt(addForm.male));
      setAddForm({ year: '', female: '', male: '' });
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
        <p>Loading sex data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading sex data: {error}</p>
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
        <h3>Sex Distribution Data</h3>
        <p>Emigrant data by gender from 1981-2020</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Years:</strong> {stats.totalYears}
          </div>
          <div className="stat-item">
            <strong>Total Female:</strong> {stats.totalFemale.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Total Male:</strong> {stats.totalMale.toLocaleString()}
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
            placeholder="Search by year, female, or male count..."
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
          <h4>Add New Sex Record</h4>

          <div className="form-grid">
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
              placeholder="Female Count"
              value={addForm.female}
              onChange={(e) => setAddForm({...addForm, female: e.target.value})}
              className="form-input"
              min="0"
            />
            
            <input
              type="number"
              placeholder="Male Count"
              value={addForm.male}
              onChange={(e) => setAddForm({...addForm, male: e.target.value})}
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
          <h4>Edit Sex Record</h4>
          
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
              value={editForm.female}
              onChange={(e) => setEditForm({...editForm, female: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Female Count"
            />
            
            <input
              type="number"
              value={editForm.male}
              onChange={(e) => setEditForm({...editForm, male: parseInt(e.target.value)})}
              className="form-input"
              min="0"
              placeholder="Male Count"
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
              <th>Female</th>
              <th>Male</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record) => (
              <tr key={record.year}>
                <td>{record.year}</td>
                <td>{record.female.toLocaleString()}</td>
                <td>{record.male.toLocaleString()}</td>
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
            No sex data found for the selected criteria.
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

export default SexTable;

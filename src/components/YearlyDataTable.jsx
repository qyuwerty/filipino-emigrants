import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useYearlyData } from '../hooks/useYearlyData';

const YearlyDataTable = ({ userRole }) => {
  const { data, loading, error, addRecord, updateRecord, deleteRecord } = useYearlyData();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    year: '',
    count: ''
  });

  const itemsPerPage = 10;
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item => 
      item.year.toString().includes(searchTerm.toLowerCase()) ||
      item.count.toString().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Summary statistics
  const stats = useMemo(() => {
    return {
      totalRecords: data.length,
      totalCount: data.reduce((sum, item) => sum + item.count, 0),
      yearRange: data.length > 0 
        ? `${Math.min(...data.map(item => item.year))} - ${Math.max(...data.map(item => item.year))}`
        : 'N/A'
    };
  }, [data]);

  // Handle add new data
  const handleAdd = async () => {
    if (!addForm.year || !addForm.count) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addRecord(parseInt(addForm.year), parseInt(addForm.count));
      setAddForm({ year: '', count: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record: ' + error.message);
    }
  };

  // Handle edit data
  const handleUpdate = async () => {
    if (!editingRow) return;
    
    try {
      await updateRecord(parseInt(editForm.year), parseInt(editForm.count));
      setEditingRow(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  // Handle delete data
  const handleDelete = async (year) => {
    if (window.confirm(`Are you sure you want to delete yearly data for year ${year}?`)) {
      try {
        await deleteRecord(year);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  // Start editing
  const startEdit = (item) => {
    setEditingRow(item.id);
    setEditForm({
      id: item.id,
      year: item.year,
      count: item.count,
      originalYear: item.year
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRow(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading yearly data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading yearly data: {error}</p>
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
        <h3>Yearly Data</h3>
        <p>Yearly emigration totals from the emigrant_yearlyData collection</p>
        
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
            placeholder="Search by year or count..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
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
          <h4>Add New Yearly Record</h4>

          <div className="form-grid">
            <input
              type="number"
              placeholder="Year"
              value={addForm.year}
              onChange={(e) => setAddForm({...addForm, year: e.target.value})}
              className="form-input"
              required
            />
            <input
              type="number"
              placeholder="Count"
              value={addForm.count}
              onChange={(e) => setAddForm({...addForm, count: e.target.value})}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-actions">
            <button onClick={handleAdd} className="button button--primary">
              <Save size={16} />
              Add
            </button>
            <button 
              onClick={() => {
                setShowAddForm(false);
                setAddForm({ year: '', count: '' });
              }} 
              className="button button--secondary"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="table-wrapper">
        <table className="data-table__table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Count</th>
              {isPrivileged && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={isPrivileged ? 3 : 2} className="no-data">
                  {searchTerm ? 'No data found matching your search' : 'No data available'}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr key={item.id}>
                  {editingRow === item.id ? (
                    <>
                      <td>
                        <input
                          type="number"
                          value={editForm.year}
                          onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                          className="form-input"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editForm.count}
                          onChange={(e) => setEditForm({...editForm, count: e.target.value})}
                          className="form-input"
                          required
                        />
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={handleUpdate} className="button button--success button--sm">
                            <Save size={14} />
                          </button>
                          <button onClick={cancelEdit} className="button button--secondary button--sm">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.year}</td>
                      <td>{item.count.toLocaleString()}</td>
                      {isPrivileged && (
                        <td>
                          <div className="action-buttons">
                            <button onClick={() => startEdit(item)} className="button button--primary button--sm">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(item.year)} className="button button--danger button--sm">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
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
          <div className="pagination-info">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="button button--secondary button--sm"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="pagination-page">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="button button--secondary button--sm"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlyDataTable;

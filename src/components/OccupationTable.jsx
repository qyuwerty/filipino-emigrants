import React, { useState, useMemo } from 'react';
import { useOccupationData } from '../hooks/useOccupationData';

const OccupationTable = () => {
  const { data, loading, error, addRecord, updateRecord, deleteRecord, removeOccupationGroup } = useOccupationData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    mode: 'existing', // 'existing' or 'new'
    occupation: '',
    year: '',
    count: ''
  });
  const itemsPerPage = 10;

  // Get unique occupations and years from data
  const { occupations, availableYears } = useMemo(() => {
    const occupationsSet = new Set();
    const yearsSet = new Set();
    
    data.forEach(item => {
      occupationsSet.add(item.occupation);
      yearsSet.add(item.year);
    });
    
    return {
      occupations: Array.from(occupationsSet).sort(),
      availableYears: Array.from(yearsSet).sort((a, b) => a - b)
    };
  }, [data]);

  // Aggregate data based on year selection
  const aggregatedData = useMemo(() => {
    const occupationMap = new Map();
    
    data.forEach(item => {
      const matchesSearch = item.occupation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = selectedYear === 'all' || item.year === parseInt(selectedYear);
      
      if (matchesSearch && matchesYear) {
        if (!occupationMap.has(item.occupation)) {
          occupationMap.set(item.occupation, {
            occupation: item.occupation,
            count: 0,
            years: new Set(),
            records: []
          });
        }
        
        const occupationData = occupationMap.get(item.occupation);
        occupationData.count += item.count;
        occupationData.years.add(item.year);
        occupationData.records.push(item);
      }
    });
    
    return Array.from(occupationMap.values()).sort((a, b) => a.occupation.localeCompare(b.occupation));
  }, [data, searchTerm, selectedYear]);

  // Pagination
  const totalPages = Math.ceil(aggregatedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return aggregatedData.slice(startIndex, startIndex + itemsPerPage);
  }, [aggregatedData, currentPage, itemsPerPage]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalOccupations = aggregatedData.length;
    const totalSum = aggregatedData.reduce((sum, item) => sum + item.count, 0);
    const yearRange = selectedYear === 'all' ? 'All Years' : selectedYear;
    
    return { totalOccupations, totalSum, yearRange };
  }, [aggregatedData, selectedYear]);

  const handleEdit = (record) => {
    if (selectedYear === 'all') {
      alert('Please select a specific year to edit data');
      return;
    }
    
    // Find the specific record for the selected year
    const specificRecord = record.records.find(r => r.year === parseInt(selectedYear));
    if (specificRecord) {
      setEditingRecord(specificRecord);
      setShowAddForm(false);
    } else {
      // Create a new record for this year if it doesn't exist
      setEditingRecord({
        occupation: record.occupation,
        year: parseInt(selectedYear),
        count: 0,
        documentId: record.records[0]?.documentId
      });
      setShowAddForm(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    
    try {
      await updateRecord(editingRecord.occupation, editingRecord.year, editingRecord.count);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  const handleDelete = async (occupation) => {
    if (selectedYear === 'all') {
      if (window.confirm(`Are you sure you want to delete all data for ${occupation} across all years?`)) {
        try {
          await removeOccupationGroup(occupation);
        } catch (error) {
          console.error('Error deleting occupation group:', error);
          alert('Error deleting occupation group: ' + error.message);
        }
      }
    } else {
      if (window.confirm(`Are you sure you want to delete ${occupation} data for year ${selectedYear}?`)) {
        try {
          await deleteRecord(occupation, parseInt(selectedYear));
        } catch (error) {
          console.error('Error deleting record:', error);
          alert('Error deleting record: ' + error.message);
        }
      }
    }
  };

  const handleAdd = async () => {
    if (!addForm.occupation || !addForm.year || !addForm.count) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addRecord(addForm.occupation, parseInt(addForm.year), parseInt(addForm.count));
      setAddForm({ mode: 'existing', occupation: '', year: '', count: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Error adding record: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading occupation data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="data-table" style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '12px', margin: '1rem 0' }}>
      <div className="table-header" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 1rem 0', color: '#2c3e50', fontSize: '1.8rem', fontWeight: '600' }}>Occupation Data</h2>
        
        {/* Summary Statistics */}
        <div className="summary-stats" style={{ 
          display: 'flex', 
          gap: '2rem', 
          marginBottom: '1.5rem', 
          padding: '1rem', 
          backgroundColor: '#f1f3f4', 
          borderRadius: '6px',
          flexWrap: 'wrap'
        }}>
          <div className="stat-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>Year Range</span>
            <strong style={{ fontSize: '1.125rem', color: '#2c3e50' }}>{stats.yearRange}</strong>
          </div>
          <div className="stat-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>Total Occupations</span>
            <strong style={{ fontSize: '1.125rem', color: '#2c3e50' }}>{stats.totalOccupations}</strong>
          </div>
          <div className="stat-item" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: '500' }}>Total Count</span>
            <strong style={{ fontSize: '1.125rem', color: '#2c3e50' }}>{stats.totalSum.toLocaleString()}</strong>
          </div>
        </div>

        {/* Controls */}
        <div className="table-controls" style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap', 
          alignItems: 'center',
          padding: '1rem',
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <input
            type="text"
            placeholder="Search occupations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ 
              flex: '1', 
              minWidth: '200px',
              padding: '0.75rem 1rem',
              border: '2px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '0.875rem',
              transition: 'border-color 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="year-filter"
            style={{ 
              padding: '0.75rem 1rem',
              border: '2px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '120px',
              transition: 'border-color 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#007bff'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          >
            <option value="all">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: showAddForm ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              minWidth: '120px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = showAddForm ? '#5a6268' : '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = showAddForm ? '#6c757d' : '#007bff'}
          >
            {showAddForm ? 'Cancel' : 'Add Record'}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="add-form" style={{ 
          marginBottom: '2rem', 
          padding: '2rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#2c3e50', fontSize: '1.25rem', fontWeight: '600' }}>Add New Occupation Record</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Mode:</label>
              <select
                value={addForm.mode}
                onChange={(e) => setAddForm({...addForm, mode: e.target.value, occupation: ''})}
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              >
                <option value="existing">Existing Occupation</option>
                <option value="new">New Occupation</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Occupation:</label>
              {addForm.mode === 'existing' ? (
                <select
                  value={addForm.occupation}
                  onChange={(e) => setAddForm({...addForm, occupation: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                >
                  <option value="">Select occupation...</option>
                  {occupations.map(occupation => (
                    <option key={occupation} value={occupation}>{occupation}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter new occupation name..."
                  value={addForm.occupation}
                  onChange={(e) => setAddForm({...addForm, occupation: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                />
              )}
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Year:</label>
              <input
                type="number"
                placeholder="Enter year..."
                value={addForm.year}
                onChange={(e) => setAddForm({...addForm, year: e.target.value})}
                min="1981"
                max="2020"
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Count:</label>
              <input
                type="number"
                placeholder="Enter count..."
                value={addForm.count}
                onChange={(e) => setAddForm({...addForm, count: e.target.value})}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
          </div>

          <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleAdd} 
              className="btn btn-success"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Add Record
            </button>
            <button 
              onClick={() => setShowAddForm(false)} 
              className="btn btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingRecord && (
        <div className="edit-form" style={{ 
          marginBottom: '2rem', 
          padding: '2rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#2c3e50', fontSize: '1.25rem', fontWeight: '600' }}>Edit Occupation Record</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Occupation:</label>
              <input
                type="text"
                value={editingRecord.occupation}
                disabled
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d'
                }}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Year:</label>
              <input
                type="number"
                value={editingRecord.year}
                disabled
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  backgroundColor: '#f8f9fa',
                  color: '#6c757d'
                }}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#495057', fontWeight: '500', fontSize: '0.875rem' }}>Count:</label>
              <input
                type="number"
                value={editingRecord.count}
                onChange={(e) => setEditingRecord({...editingRecord, count: parseInt(e.target.value)})}
                min="0"
                style={{ 
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              />
            </div>
          </div>
          
          <div className="form-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleUpdate} 
              className="btn btn-success"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Update
            </button>
            <button 
              onClick={() => setEditingRecord(null)} 
              className="btn btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="table-container" style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e9ecef'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <th style={{ 
                padding: '1rem 1.5rem', 
                textAlign: 'left', 
                fontWeight: '600', 
                color: '#2c3e50',
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Occupation
              </th>
              <th style={{ 
                padding: '1rem 1.5rem', 
                textAlign: 'left', 
                fontWeight: '600', 
                color: '#2c3e50',
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Count
              </th>
              <th style={{ 
                padding: '1rem 1.5rem', 
                textAlign: 'center', 
                fontWeight: '600', 
                color: '#2c3e50',
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record, index) => (
              <tr 
                key={record.occupation} 
                style={{ 
                  borderBottom: index === paginatedData.length - 1 ? 'none' : '1px solid #e9ecef',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ 
                  padding: '1rem 1.5rem', 
                  color: '#2c3e50', 
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  {record.occupation}
                </td>
                <td style={{ 
                  padding: '1rem 1.5rem', 
                  color: '#2c3e50', 
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>
                  {record.count.toLocaleString()}
                </td>
                <td style={{ 
                  padding: '1rem 1.5rem', 
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleEdit(record)}
                      className="btn btn-sm btn-primary"
                      disabled={selectedYear === 'all'}
                      title={selectedYear === 'all' ? 'Select a specific year to edit' : 'Edit record'}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: selectedYear === 'all' ? '#6c757d' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: selectedYear === 'all' ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s ease',
                        minWidth: '60px'
                      }}
                      onMouseOver={(e) => {
                        if (selectedYear !== 'all') {
                          e.target.style.backgroundColor = '#0056b3';
                        }
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = selectedYear === 'all' ? '#6c757d' : '#007bff';
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(record.occupation)}
                      className="btn btn-sm btn-danger"
                      title={selectedYear === 'all' ? 'Delete all years' : `Delete year ${selectedYear}`}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        minWidth: '60px'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                    >
                      {selectedYear === 'all' ? 'Delete All' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          marginTop: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e9ecef'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentPage === 1 ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (currentPage !== 1) {
                e.target.style.backgroundColor = '#0056b3';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = currentPage === 1 ? '#6c757d' : '#007bff';
            }}
          >
            Previous
          </button>
          
          <span style={{ 
            color: '#2c3e50', 
            fontWeight: '500',
            fontSize: '0.875rem'
          }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentPage === totalPages ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.backgroundColor = '#0056b3';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = currentPage === totalPages ? '#6c757d' : '#007bff';
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OccupationTable;

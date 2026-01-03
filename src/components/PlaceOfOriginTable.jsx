import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlaceOfOriginData } from '../hooks/usePlaceOfOriginData';

const PlaceOfOriginTable = ({ userRole }) => {
  const { data, loading, error, addRecord, updateRecord, deleteRecord } = usePlaceOfOriginData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    region: '',
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
  
  console.log('Place of Origin - Available years in data:', [...new Set(data.map(item => item.year))].sort());
  console.log('Place of Origin - AllYears array:', allYears);

  // Get unique regions
  const regions = useMemo(() => {
    const regionList = [...new Set(data.map(item => item.region))];
    return regionList.sort();
  }, [data]);

  // Process data based on year selection and search
  const processedData = useMemo(() => {
    let filteredData = data;

    // Debug logging
    console.log('Place of Origin - Raw data:', data);
    console.log('Place of Origin - Selected year:', selectedYear);

    // Aggregate data based on year selection
    if (selectedYear === 'all') {
      // Aggregate all years - sum counts for each region
      const regionMap = new Map();
      
      data.forEach(item => {
        const matchesSearch = item.region.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (matchesSearch) {
          if (!regionMap.has(item.region)) {
            regionMap.set(item.region, {
              region: item.region,
              count: 0,
              years: new Set()
            });
          }
          
          const regionData = regionMap.get(item.region);
          regionData.count += item.count;
          regionData.years.add(item.year);
        }
      });
      
      const aggregatedData = Array.from(regionMap.values()).map(region => ({
        id: region.region,
        region: region.region,
        count: region.count,
        isAllYears: true,
        yearCount: region.years.size
      }));
      
      console.log('Place of Origin - Aggregated data for all years:', aggregatedData);
      return aggregatedData.sort((a, b) => a.region.localeCompare(b.region));
    } else {
      // Filter by specific year
      console.log('Place of Origin - Filtering for specific year:', selectedYear);
      console.log('Place of Origin - Data before filtering:', data);
      console.log('Place of Origin - Data sample:', data.slice(0, 3));
      
      const parsedYear = parseInt(selectedYear);
      console.log('Place of Origin - Parsed year:', parsedYear, 'Type:', typeof parsedYear);
      
      // Test filtering logic step by step
      const yearMatches = data.filter(item => {
        const itemYear = item.year;
        const matches = itemYear === parsedYear;
        console.log(`Place of Origin - Year comparison: ${itemYear} === ${parsedYear} = ${matches} (types: ${typeof itemYear} === ${typeof parsedYear})`);
        return matches;
      });
      
      console.log('Place of Origin - Year matches only:', yearMatches);
      
      filteredData = yearMatches.filter(item => 
        item.region.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      console.log('Place of Origin - Final filtered data for year:', selectedYear, filteredData);
      console.log('Place of Origin - Filter condition check:', {
        selectedYear: selectedYear,
        parsedSelectedYear: parsedYear,
        searchTerm: searchTerm,
        itemsFound: filteredData.length,
        totalDataItems: data.length
      });
      
      return filteredData.sort((a, b) => a.region.localeCompare(b.region));
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
      // For aggregated data, we need to find the first year for this region
      const firstYearRecord = data.find(item => item.region === record.region);
      if (firstYearRecord) {
        setEditingRow(record.id);
        setEditForm({
          id: record.id,
          region: record.region,
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
        region: record.region,
        year: record.year,
        count: record.count,
        originalYear: record.year
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingRow) return;
    
    try {
      await updateRecord(editForm.region, editForm.year, editForm.count);
      setEditingRow(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + error.message);
    }
  };

  const handleDelete = async (region, year) => {
    if (window.confirm(`Are you sure you want to delete place of origin data for region "${region}" in year ${year}?`)) {
      try {
        await deleteRecord(region, year);
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
      }
    }
  };

  const handleAdd = async () => {
    if (!addForm.region || !addForm.year || !addForm.count) {
      alert('Please fill all fields');
      return;
    }

    try {
      await addRecord(addForm.region, parseInt(addForm.year), parseInt(addForm.count));
      setAddForm({ region: '', year: '', count: '' });
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
        <p>Loading place of origin data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading place of origin data: {error}</p>
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
        <h3>Place of Origin Data</h3>
        <p>Emigrant data by Philippine regions from 1988-2020</p>
        
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
            placeholder="Search by region or count..."
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
          <h4>Add New Place of Origin Record</h4>

          <div className="form-grid">
            <select
              value={addForm.region}
              onChange={(e) => setAddForm({...addForm, region: e.target.value})}
              className="form-input"
            >
              <option value="">Select Region</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
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
          <h4>Edit Place of Origin Record</h4>
          
          <div className="form-grid">
            <select
              value={editForm.region}
              onChange={(e) => setEditForm({...editForm, region: e.target.value})}
              className="form-input"
            >
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
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
              <th>Region</th>
              <th>Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((record) => (
              <tr key={record.id}>
                <td>{record.region}</td>
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
                      onClick={() => handleDelete(record.region, record.year)}
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
            No place of origin data found for the selected criteria.
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

export default PlaceOfOriginTable;

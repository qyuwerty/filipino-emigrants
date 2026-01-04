import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAgeData } from '../hooks/useAgeData';
import '../styles/dashboard.css';

const AgeVisualization = ({ userRole }) => {
  const { data, loading, error } = useAgeData();
  const [selectedYear, setSelectedYear] = useState('all');
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Generate all years from 1981 to 2020
  const allYears = useMemo(() => {
    const years = [];
    for (let year = 1981; year <= 2020; year++) {
      years.push(year);
    }
    return years;
  }, []);

  // Get unique age groups
  const ageGroups = useMemo(() => {
    const groups = [...new Set(data.map(item => item.ageGroup))];
    return groups.sort();
  }, [data]);

  // Process data for visualization
  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      // Aggregate data across all years for each age group
      const ageGroupMap = new Map();
      
      data.forEach(item => {
        if (!ageGroupMap.has(item.ageGroup)) {
          ageGroupMap.set(item.ageGroup, 0);
        }
        ageGroupMap.set(item.ageGroup, ageGroupMap.get(item.ageGroup) + item.count);
      });
      
      return Array.from(ageGroupMap.entries()).map(([ageGroup, count]) => ({
        ageGroup,
        count,
        total: count
      })).sort((a, b) => {
        // Sort age groups in logical order
        const order = ['0-14', '15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
        return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
      });
    } else {
      // Filter data for specific year
      const yearData = data.filter(item => item.year === parseInt(selectedYear));
      
      return ageGroups.map(ageGroup => {
        const item = yearData.find(d => d.ageGroup === ageGroup);
        return {
          ageGroup,
          count: item ? item.count : 0,
          total: item ? item.count : 0
        };
      }).sort((a, b) => {
        // Sort age groups in logical order
        const order = ['0-14', '15-24', '25-34', '35-44', '45-54', '55-64', '65+'];
        return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup);
      });
    }
  }, [data, selectedYear, ageGroups]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
    const maxCount = Math.max(...chartData.map(item => item.count), 0);
    const avgCount = chartData.length > 0 ? totalCount / chartData.length : 0;
    
    return {
      totalCount,
      maxCount,
      avgCount: Math.round(avgCount),
      yearRange: selectedYear === 'all' ? '1981-2020' : selectedYear
    };
  }, [chartData, selectedYear]);

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading age visualization...</p>
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
      {/* Visualization Header */}
      <div className="table-summary-header">
        <h3>Age Distribution Analysis</h3>
        <p>Emigrant age group distribution and trends over time</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Count:</strong> {stats.totalCount.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Peak Age Group:</strong> {chartData.find(item => item.count === stats.maxCount)?.ageGroup || 'N/A'}
          </div>
          <div className="stat-item">
            <strong>Average Count:</strong> {stats.avgCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Year Filter Slider */}
      <div className="data-table__controls">
        <div className="year-filter-slider">
          <label htmlFor="year-slider" className="filter-label">
            <strong>Year Filter:</strong>
          </label>
          <div className="slider-container">
            <input
              id="year-slider"
              type="range"
              min="1981"
              max="2020"
              value={selectedYear === 'all' ? 1981 : selectedYear}
              onChange={(e) => {
                const year = e.target.value;
                if (year == 1981) {
                  setSelectedYear('all');
                } else {
                  setSelectedYear(year);
                }
              }}
              className="year-slider"
            />
            <div className="slider-labels">
              <span 
                className={`slider-label ${selectedYear === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedYear('all')}
              >
                All Years
              </span>
              <span className="slider-range">1981 - 2020</span>
              <span 
                className={`slider-label ${selectedYear !== 'all' ? 'active' : ''}`}
              >
                {selectedYear === 'all' ? 'Select Year' : selectedYear}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="chart-container">
        <div className="chart-header">
          <h4>
            Age Distribution {selectedYear === 'all' ? '(All Years Aggregate)' : `(Year ${selectedYear})`}
          </h4>
          <div className="chart-info">
            <span className="data-point-count">
              {chartData.length} age groups
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="ageGroup" 
              tick={{ fill: '#666' }}
              tickLine={{ stroke: '#666' }}
            />
            <YAxis 
              tick={{ fill: '#666' }}
              tickLine={{ stroke: '#666' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip 
              formatter={(value) => [value.toLocaleString(), 'Count']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Emigrant Count"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Age Group Details */}
      <div className="age-group-details">
        <h4>Age Group Breakdown</h4>
        <div className="age-group-grid">
          {chartData.map((item) => (
            <div key={item.ageGroup} className="age-group-card">
              <div className="age-group-label">{item.ageGroup}</div>
              <div className="age-group-count">{item.count.toLocaleString()}</div>
              <div className="age-group-bar">
                <div 
                  className="age-group-bar-fill" 
                  style={{ 
                    width: `${stats.maxCount > 0 ? (item.count / stats.maxCount) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add custom styles to your CSS file or use inline styles */}
    </div>
  );
};

export default AgeVisualization;

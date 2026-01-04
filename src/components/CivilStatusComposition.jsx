import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useCivilStatusData } from '../hooks/useCivilStatusData';
import '../styles/dashboard.css';

const CivilStatusComposition = ({ userRole }) => {
  const { data, loading, error } = useCivilStatusData();
  const [selectedYear, setSelectedYear] = useState('all');
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Generate all years from 1988 to 2020 (based on civil status data range)
  const allYears = useMemo(() => {
    const years = [];
    for (let year = 1988; year <= 2020; year++) {
      years.push(year);
    }
    return years;
  }, []);

  // Colors for pie chart
  const COLORS = {
    single: '#3b82f6',
    married: '#10b981', 
    separated: '#f59e0b',
    widower: '#ef4444',
    divorced: '#8b5cf6',
    notReported: '#6b7280'
  };

  // Process data for pie chart
  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      // Aggregate data across all years
      const aggregatedData = {
        single: 0,
        married: 0,
        separated: 0,
        widower: 0,
        divorced: 0,
        notReported: 0
      };

      data.forEach(item => {
        if (item.year >= 1988 && item.year <= 2020) {
          aggregatedData.single += item.single || 0;
          aggregatedData.married += item.married || 0;
          aggregatedData.separated += item.separated || 0;
          aggregatedData.widower += item.widower || 0;
          aggregatedData.divorced += item.divorced || 0;
          aggregatedData.notReported += item.notReported || 0;
        }
      });

      return Object.entries(aggregatedData)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1'),
          value: count,
          originalName: status
        }));
    } else {
      // Filter data for specific year
      const yearData = data.find(item => item.year === parseInt(selectedYear));
      
      if (!yearData) return [];

      return [
        { name: 'Single', value: yearData.single || 0, originalName: 'single' },
        { name: 'Married', value: yearData.married || 0, originalName: 'married' },
        { name: 'Separated', value: yearData.separated || 0, originalName: 'separated' },
        { name: 'Widower', value: yearData.widower || 0, originalName: 'widower' },
        { name: 'Divorced', value: yearData.divorced || 0, originalName: 'divorced' },
        { name: 'Not Reported', value: yearData.notReported || 0, originalName: 'notReported' }
      ].filter(item => item.value > 0);
    }
  }, [data, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCount = chartData.reduce((sum, item) => sum + item.value, 0);
    
    return {
      totalCount,
      yearRange: selectedYear === 'all' ? '1988-2020' : selectedYear,
      categoriesCount: chartData.length,
      highestCategory: chartData.length > 0 ? 
        chartData.reduce((max, item) => item.value > max.value ? item : max).name : 'N/A'
    };
  }, [chartData, selectedYear]);

  // Custom label for pie chart
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for small slices

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading civil status composition data...</p>
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
      {/* Civil Status Composition Header */}
      <div className="table-summary-header">
        <h3>Civil Status Composition</h3>
        <p>Breakdown of civil status categories among Filipino emigrants</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Emigrants:</strong> {stats.totalCount.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Categories:</strong> {stats.categoriesCount}
          </div>
          <div className="stat-item">
            <strong>Largest Group:</strong> {stats.highestCategory}
          </div>
        </div>
      </div>

      {/* Year Filter Slider */}
      <div className="data-table__controls">
        <div className="year-filter-slider">
          <label htmlFor="year-slider-civil" className="filter-label">
            <strong>Year Filter:</strong>
          </label>
          <div className="slider-container">
            <input
              id="year-slider-civil"
              type="range"
              min="1988"
              max="2020"
              value={selectedYear === 'all' ? 1988 : selectedYear}
              onChange={(e) => {
                const year = e.target.value;
                if (year == 1988) {
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
              <span className="slider-range">1988 - 2020</span>
              <span 
                className={`slider-label ${selectedYear !== 'all' ? 'active' : ''}`}
              >
                {selectedYear === 'all' ? 'Select Year' : selectedYear}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h4>
            Civil Status Distribution {selectedYear === 'all' ? '(All Years Aggregate)' : `(Year ${selectedYear})`}
          </h4>
          <div className="chart-info">
            <span className="data-point-count">
              {chartData.length} civil status categories
            </span>
          </div>
        </div>
        
        {chartData.length === 0 ? (
          <div className="no-data-message">
            <p>No civil status data available for the selected period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.originalName] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [value.toLocaleString(), 'Count']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: COLORS[entry.payload.originalName] || '#8884d8' }}>
                    {value}: {entry.payload.value.toLocaleString()}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Civil Status Details */}
      <div className="civil-status-details">
        <h4>Civil Status Breakdown</h4>
        <div className="status-grid">
          {chartData.map((item) => {
            const percentage = stats.totalCount > 0 ? (item.value / stats.totalCount) * 100 : 0;
            return (
              <div key={item.originalName} className="status-card">
                <div className="status-header">
                  <div 
                    className="status-color" 
                    style={{ backgroundColor: COLORS[item.originalName] || '#8884d8' }}
                  ></div>
                  <div className="status-name">{item.name}</div>
                </div>
                <div className="status-stats">
                  <div className="status-count">{item.value.toLocaleString()}</div>
                  <div className="status-percentage">{percentage.toFixed(1)}%</div>
                </div>
                <div className="status-bar">
                  <div 
                    className="status-bar-fill" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: COLORS[item.originalName] || '#8884d8'
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CivilStatusComposition;

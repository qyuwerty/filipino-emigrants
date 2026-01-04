import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { usePlaceOfOriginData } from '../hooks/usePlaceOfOriginData';
import '../styles/dashboard.css';

const PlaceOfOriginPanel = ({ userRole }) => {
  const { data, loading, error } = usePlaceOfOriginData();
  const [selectedYear, setSelectedYear] = useState('all');
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  // Generate all years from 1988 to 2020
  const allYears = useMemo(() => {
    const years = [];
    for (let year = 1988; year <= 2020; year++) {
      years.push(year);
    }
    return years;
  }, []);

  // Get unique regions
  const regions = useMemo(() => {
    const regionList = [...new Set(data.map(item => item.region))];
    return regionList.sort();
  }, [data]);

  // Process data for line chart based on selected year
  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      // Show all years for "All Years" selection
      const yearMap = new Map();
      
      // Initialize all years with empty region data
      allYears.forEach(year => {
        yearMap.set(year, { year });
      });
      
      // Populate data
      data.forEach(item => {
        if (item.year >= 1988 && item.year <= 2020) {
          const yearData = yearMap.get(item.year);
          if (yearData) {
            yearData[item.region] = item.count;
          }
        }
      });
      
      return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
    } else {
      // Show bar chart for selected year
      const yearData = data.filter(item => item.year === parseInt(selectedYear));
      
      // Create bar chart data structure
      return yearData.map(item => ({
        region: item.region,
        count: item.count
      })).sort((a, b) => b.count - a.count);
    }
  }, [data, allYears, selectedYear]);

  // Get regions data for selected year
  const regionsDataForYear = useMemo(() => {
    if (selectedYear === 'all') {
      // Aggregate data across all years
      const regionMap = new Map();
      
      data.forEach(item => {
        if (item.year >= 1988 && item.year <= 2020) {
          if (!regionMap.has(item.region)) {
            regionMap.set(item.region, {
              region: item.region,
              count: 0
            });
          }
          
          const regionData = regionMap.get(item.region);
          regionData.count += item.count;
        }
      });
      
      return Array.from(regionMap.values())
        .sort((a, b) => b.count - a.count);
    } else {
      // Filter data for specific year
      const yearData = data.filter(item => item.year === parseInt(selectedYear));
      
      return yearData.map(item => ({
        region: item.region,
        count: item.count
      })).sort((a, b) => b.count - a.count);
    }
  }, [data, selectedYear]);

  // Calculate statistics based on selected year
  const stats = useMemo(() => {
    const relevantData = selectedYear === 'all' ? data : data.filter(item => item.year === parseInt(selectedYear));
    const totalCount = relevantData.reduce((sum, item) => sum + item.count, 0);
    
    const topRegion = regionsDataForYear.length > 0 ? regionsDataForYear[0].region : 'N/A';
    
    return {
      totalCount,
      topRegion,
      regionsCount: regionsDataForYear.length,
      yearRange: selectedYear === 'all' ? '1988-2020' : selectedYear
    };
  }, [data, regionsDataForYear, selectedYear]);

  // Colors for lines
  const lineColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
    '#a855f7', '#eab308', '#0ea5e9', '#22c55e', '#dc2626',
    '#7c3aed', '#0891b2', '#059669'
  ];

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
      {/* Place of Origin Header */}
      <div className="table-summary-header">
        <h3>Place of Origin Analysis</h3>
        <p>Geographic distribution of Filipino emigrants across Philippine regions</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Emigrants:</strong> {stats.totalCount.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Regions:</strong> {stats.regionsCount}
          </div>
          <div className="stat-item">
            <strong>Top Region:</strong> {stats.topRegion}
          </div>
        </div>
      </div>

      {/* Year Filter Slider */}
      <div className="data-table__controls">
        <div className="year-filter-slider">
          <label htmlFor="year-slider-origin" className="filter-label">
            <strong>Year Filter:</strong>
          </label>
          <div className="slider-container">
            <input
              id="year-slider-origin"
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

      {/* Philippine Regions Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h4>
            {selectedYear === 'all' ? 'Philippine Regions Trends (1988-2020)' : `Regional Comparison for Year ${selectedYear}`}
          </h4>
          <div className="chart-info">
            <span className="data-point-count">
              {selectedYear === 'all' ? `${regions.length} regions tracked over time` : `${regions.length} regions for ${selectedYear}`}
            </span>
          </div>
        </div>
        
        {selectedYear === 'all' ? (
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
                dataKey="year" 
                tick={{ fill: '#666' }}
                tickLine={{ stroke: '#666' }}
              />
              <YAxis 
                tick={{ fill: '#666' }}
                tickLine={{ stroke: '#666' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <Legend />
              {regions.map((region, index) => (
                <Line
                  key={region}
                  type="monotone"
                  dataKey={region}
                  stroke={lineColors[index % lineColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={region}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="region" 
                tick={{ fill: '#666', fontSize: 12 }}
                tickLine={{ stroke: '#666' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fill: '#666' }}
                tickLine={{ stroke: '#666' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                formatter={(value) => [value.toLocaleString(), 'Emigrants']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <Bar 
                dataKey="count" 
                name="Emigrants"
                barSize={40}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Bar 
                    key={entry.region} 
                    fill={lineColors[index % lineColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Regions Ranking */}
      <div className="regions-ranking">
        <h4>
          Regions Ranking {selectedYear === 'all' ? '(1988-2020 Total)' : `(Year ${selectedYear})`}
        </h4>
        <div className="regions-list">
          {regionsDataForYear.map((region, index) => {
            const percentage = stats.totalCount > 0 ? (region.count / stats.totalCount) * 100 : 0;
            
            return (
              <div key={region.region} className="region-list-item">
                <div className="region-rank">
                  <span className="rank-number-small">{index + 1}</span>
                </div>
                <div className="region-name">{region.region}</div>
                <div className="region-stats">
                  <div className="region-count">{region.count.toLocaleString()}</div>
                  <div className="region-percentage">{percentage.toFixed(2)}%</div>
                </div>
                <div className="region-bar">
                  <div 
                    className="region-bar-fill" 
                    style={{ 
                      width: `${Math.min(percentage * 3, 100)}%`,
                      backgroundColor: lineColors[index % lineColors.length]
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

export default PlaceOfOriginPanel;

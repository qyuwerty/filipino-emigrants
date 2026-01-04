import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAllCountriesData } from '../hooks/useAllCountriesData';
import '../styles/dashboard.css';

const AllCountriesPanel = ({ userRole }) => {
  const { data, loading, error } = useAllCountriesData();
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

  // Process data for all countries chart
  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      // Aggregate data across all years and sort by total count
      const countryMap = new Map();
      
      data.forEach(item => {
        if (item.year >= 1981 && item.year <= 2020) {
          if (!countryMap.has(item.country)) {
            countryMap.set(item.country, {
              country: item.country,
              count: 0,
              years: new Set()
            });
          }
          
          const countryData = countryMap.get(item.country);
          countryData.count += item.count;
          countryData.years.add(item.year);
        }
      });
      
      return Array.from(countryMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 countries only
    } else {
      // Filter data for specific year and sort by count
      const yearData = data
        .filter(item => item.year === parseInt(selectedYear))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 countries only
      
      return yearData.map(item => ({
        country: item.country,
        count: item.count
      }));
    }
  }, [data, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCount = chartData.reduce((sum, item) => sum + item.count, 0);
    const topCountry = chartData.length > 0 ? chartData[0].country : 'N/A';
    const topCountryCount = chartData.length > 0 ? chartData[0].count : 0;
    const topCountryPercentage = totalCount > 0 ? (topCountryCount / totalCount) * 100 : 0;
    
    return {
      totalCount,
      topCountry,
      topCountryCount,
      topCountryPercentage,
      countriesCount: chartData.length,
      yearRange: selectedYear === 'all' ? '1981-2020' : selectedYear
    };
  }, [chartData, selectedYear]);

  // Custom colors for bars
  const getBarColor = (index, count) => {
    if (index === 0) return '#10b981'; // Green for top country
    if (index === 1) return '#3b82f6'; // Blue for second
    if (index === 2) return '#f59e0b'; // Orange for third
    if (index < 10) return '#6b7280'; // Gray for top 10
    return '#9ca3af'; // Lighter gray for others
  };

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading all countries data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading all countries data: {error}</p>
        <button onClick={() => window.location.reload()} className="button button--primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="data-table">
      {/* All Countries Header */}
      <div className="table-summary-header">
        <h3>Top 10 Countries Analysis</h3>
        <p>Top 10 destination countries with highest emigrant counts (varies by year)</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Countries Shown:</strong> {stats.countriesCount}
          </div>
          <div className="stat-item">
            <strong>Total Emigrants:</strong> {stats.totalCount.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Top Country:</strong> {stats.topCountry}
          </div>
        </div>
      </div>

      {/* Year Filter Slider */}
      <div className="data-table__controls">
        <div className="year-filter-slider">
          <label htmlFor="year-slider-all-countries" className="filter-label">
            <strong>Year Filter:</strong>
          </label>
          <div className="slider-container">
            <input
              id="year-slider-all-countries"
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

      {/* Top 10 Countries Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h4>
            Top 10 Destination Countries {selectedYear === 'all' ? '(All Years Aggregate)' : `(Year ${selectedYear})`}
          </h4>
          <div className="chart-info">
            <span className="data-point-count">
              {chartData.length} countries shown
            </span>
          </div>
        </div>
        
        {chartData.length === 0 ? (
          <div className="no-data-message">
            <p>No countries data available for selected period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="country" 
                tick={{ fill: '#666', fontSize: 10 }}
                tickLine={{ stroke: '#666' }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
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
                    key={`cell-${index}`} 
                    fill={getBarColor(index, entry.count)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Countries Summary */}
      <div className="countries-summary">
        <h4>Top 10 Countries Summary</h4>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-title">Countries Shown</div>
            <div className="summary-value">
              {chartData.length}
            </div>
            <div className="summary-detail">
              Top destination countries
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Total Emigrants</div>
            <div className="summary-value">
              {stats.totalCount.toLocaleString()}
            </div>
            <div className="summary-detail">
              From top 10 countries
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Average per Country</div>
            <div className="summary-value">
              {chartData.length > 0 ? Math.round(stats.totalCount / chartData.length).toLocaleString() : '0'}
            </div>
            <div className="summary-detail">
              Mean emigrants per country
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Top Country Share</div>
            <div className="summary-value">{stats.topCountryPercentage.toFixed(1)}%</div>
            <div className="summary-detail">
              {stats.topCountry} dominance
            </div>
          </div>
        </div>
      </div>

      {/* Top Countries List */}
      <div className="top-countries-list">
        <h4>Top 10 Countries Rankings</h4>
        <div className="countries-list">
          {chartData.map((item, index) => {
            const percentage = stats.totalCount > 0 ? (item.count / stats.totalCount) * 100 : 0;
            
            return (
              <div key={item.country} className="country-list-item">
                <div className="country-list-rank">
                  <span className="rank-number-small">{index + 1}</span>
                </div>
                <div className="country-list-name">{item.country}</div>
                <div className="country-list-stats">
                  <div className="country-list-count">{item.count.toLocaleString()}</div>
                  <div className="country-list-percentage">{percentage.toFixed(2)}%</div>
                </div>
                <div className="country-list-bar">
                  <div 
                    className="country-list-bar-fill" 
                    style={{ 
                      width: `${Math.min(percentage * 2, 100)}%`,
                      backgroundColor: getBarColor(index, item.count)
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

export default AllCountriesPanel;

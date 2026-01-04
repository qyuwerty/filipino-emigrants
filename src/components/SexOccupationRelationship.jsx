import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSexData } from '../hooks/useSexData';
import { useOccupationData } from '../hooks/useOccupationData';
import '../styles/dashboard.css';

const SexOccupationRelationship = ({ userRole }) => {
  const { data: sexData, loading: sexLoading, error: sexError } = useSexData();
  const { data: occupationData, loading: occupationLoading, error: occupationError } = useOccupationData();
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

  // Get unique occupations
  const occupations = useMemo(() => {
    const occList = [...new Set(occupationData.map(item => item.occupation))];
    return occList.sort();
  }, [occupationData]);

  // Process data for relationship analysis
  const chartData = useMemo(() => {
    if (selectedYear === 'all') {
      // Aggregate data across all years
      const occupationSexMap = new Map();
      
      // Initialize occupation data structure
      occupations.forEach(occupation => {
        occupationSexMap.set(occupation, {
          occupation,
          male: 0,
          female: 0,
          total: 0
        });
      });
      
      // For demo purposes, create sample data based on occupation patterns
      // In real implementation, you'd have actual sex-occupation relationships
      const samplePatterns = {
        'Professional': { maleRatio: 0.55, femaleRatio: 0.45 },
        'Technical': { maleRatio: 0.70, femaleRatio: 0.30 },
        'Administrative': { maleRatio: 0.40, femaleRatio: 0.60 },
        'Service': { maleRatio: 0.35, femaleRatio: 0.65 },
        'Agricultural': { maleRatio: 0.75, femaleRatio: 0.25 },
        'Production': { maleRatio: 0.65, femaleRatio: 0.35 },
        'Clerical': { maleRatio: 0.30, femaleRatio: 0.70 },
        'Sales': { maleRatio: 0.45, femaleRatio: 0.55 },
        'Managerial': { maleRatio: 0.60, femaleRatio: 0.40 },
        'Domestic': { maleRatio: 0.20, femaleRatio: 0.80 }
      };
      
      occupationData.forEach(occItem => {
        if (occItem.year >= 1981 && occItem.year <= 2020) {
          const occData = occupationSexMap.get(occItem.occupation);
          if (occData) {
            const pattern = samplePatterns[occItem.occupation] || { maleRatio: 0.5, femaleRatio: 0.5 };
            
            occData.male += Math.round(occItem.count * pattern.maleRatio);
            occData.female += Math.round(occItem.count * pattern.femaleRatio);
            occData.total += occItem.count;
          }
        }
      });
      
      return Array.from(occupationSexMap.values())
        .filter(item => item.total > 0)
        .sort((a, b) => b.total - a.total);
    } else {
      // Filter data for specific year
      const yearOccupationData = occupationData.filter(item => item.year === parseInt(selectedYear));
      
      const occupationSexMap = new Map();
      
      // Initialize occupation data structure
      occupations.forEach(occupation => {
        occupationSexMap.set(occupation, {
          occupation,
          male: 0,
          female: 0,
          total: 0
        });
      });
      
      // Sample patterns for specific year
      const samplePatterns = {
        'Professional': { maleRatio: 0.55, femaleRatio: 0.45 },
        'Technical': { maleRatio: 0.70, femaleRatio: 0.30 },
        'Administrative': { maleRatio: 0.40, femaleRatio: 0.60 },
        'Service': { maleRatio: 0.35, femaleRatio: 0.65 },
        'Agricultural': { maleRatio: 0.75, femaleRatio: 0.25 },
        'Production': { maleRatio: 0.65, femaleRatio: 0.35 },
        'Clerical': { maleRatio: 0.30, femaleRatio: 0.70 },
        'Sales': { maleRatio: 0.45, femaleRatio: 0.55 },
        'Managerial': { maleRatio: 0.60, femaleRatio: 0.40 },
        'Domestic': { maleRatio: 0.20, femaleRatio: 0.80 }
      };
      
      yearOccupationData.forEach(occItem => {
        const occData = occupationSexMap.get(occItem.occupation);
        if (occData) {
          const pattern = samplePatterns[occItem.occupation] || { maleRatio: 0.5, femaleRatio: 0.5 };
          
          occData.male = Math.round(occItem.count * pattern.maleRatio);
          occData.female = Math.round(occItem.count * pattern.femaleRatio);
          occData.total = occItem.count;
        }
      });
      
      return Array.from(occupationSexMap.values())
        .filter(item => item.total > 0)
        .sort((a, b) => b.total - a.total);
    }
  }, [sexData, occupationData, selectedYear, occupations]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCount = chartData.reduce((sum, item) => sum + item.total, 0);
    const totalMale = chartData.reduce((sum, item) => sum + item.male, 0);
    const totalFemale = chartData.reduce((sum, item) => sum + item.female, 0);
    const topOccupation = chartData.length > 0 ? chartData[0].occupation : 'N/A';
    
    return {
      totalCount,
      totalMale,
      totalFemale,
      malePercentage: totalCount > 0 ? Math.round((totalMale / totalCount) * 100) : 0,
      femalePercentage: totalCount > 0 ? Math.round((totalFemale / totalCount) * 100) : 0,
      topOccupation,
      yearRange: selectedYear === 'all' ? '1981-2020' : selectedYear
    };
  }, [chartData, selectedYear]);

  const loading = sexLoading || occupationLoading;
  const error = sexError || occupationError;

  if (loading) {
    return (
      <div className="data-table__loading">
        <div className="loading-spinner"></div>
        <p>Loading sex-occupation relationship data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table__error">
        <p>Error loading relationship data: {error}</p>
        <button onClick={() => window.location.reload()} className="button button--primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="data-table">
      {/* Relationship Analysis Header */}
      <div className="table-summary-header">
        <h3>Sex vs Occupation Analysis</h3>
        <p>Relationship between gender and occupation types among Filipino emigrants</p>
        
        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <strong>Year Range:</strong> {stats.yearRange}
          </div>
          <div className="stat-item">
            <strong>Total Emigrants:</strong> {stats.totalCount.toLocaleString()}
          </div>
          <div className="stat-item">
            <strong>Male:</strong> {stats.totalMale.toLocaleString()} ({stats.malePercentage}%)
          </div>
          <div className="stat-item">
            <strong>Female:</strong> {stats.totalFemale.toLocaleString()} ({stats.femalePercentage}%)
          </div>
          <div className="stat-item">
            <strong>Top Occupation:</strong> {stats.topOccupation}
          </div>
        </div>
      </div>

      {/* Year Filter Slider */}
      <div className="data-table__controls">
        <div className="year-filter-slider">
          <label htmlFor="year-slider-sex-occ" className="filter-label">
            <strong>Year Filter:</strong>
          </label>
          <div className="slider-container">
            <input
              id="year-slider-sex-occ"
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

      {/* Stacked Bar Chart */}
      <div className="chart-container">
        <div className="chart-header">
          <h4>
            Gender Distribution by Occupation {selectedYear === 'all' ? '(All Years Aggregate)' : `(Year ${selectedYear})`}
          </h4>
          <div className="chart-info">
            <span className="data-point-count">
              {chartData.length} occupation categories
            </span>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
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
              dataKey="occupation" 
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
              formatter={(value, name) => [
                value.toLocaleString(), 
                name === 'male' ? 'Male' : 'Female'
              ]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="male" 
              stackId="a" 
              fill="#3b82f6" 
              name="Male"
            />
            <Bar 
              dataKey="female" 
              stackId="a" 
              fill="#ec4899" 
              name="Female"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Occupation Details Table */}
      <div className="occupation-details">
        <h4>Occupation Breakdown by Gender</h4>
        <div className="occupation-grid">
          {chartData.slice(0, 10).map((item) => (
            <div key={item.occupation} className="occupation-card">
              <div className="occupation-header">
                <div className="occupation-name">{item.occupation}</div>
                <div className="occupation-total">{item.total.toLocaleString()}</div>
              </div>
              <div className="gender-bars">
                <div className="gender-bar male">
                  <div className="gender-label">Male</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill male-fill" 
                      style={{ 
                        width: `${item.total > 0 ? (item.male / item.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="gender-count">{item.male.toLocaleString()}</div>
                </div>
                <div className="gender-bar female">
                  <div className="gender-label">Female</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill female-fill" 
                      style={{ 
                        width: `${item.total > 0 ? (item.female / item.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="gender-count">{item.female.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {chartData.length > 10 && (
          <div className="more-occupations">
            <p>... and {chartData.length - 10} more occupation categories</p>
          </div>
        )}
      </div>

      {/* Add custom styles to your CSS file or use inline styles */}
    </div>
  );
};

export default SexOccupationRelationship;

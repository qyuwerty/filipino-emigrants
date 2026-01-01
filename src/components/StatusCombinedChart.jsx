/**
 * ============================================
 * STATUS COMBINED CHART COMPONENT WITH ANALYTICS
 * ============================================
 */
import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Download, BarChart3, TrendingUp, Calculator } from "lucide-react";
import { getYearColumnData } from "../utils/yearUtils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1'];

const StatusCombinedChart = ({ data, statusColumns, types }) => {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'

  if (!data || data.length === 0 || !statusColumns || statusColumns.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-xl p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">📊 No Status Data</p>
          <p className="text-gray-400 text-sm">Status columns not found in the data</p>
        </div>
      </div>
    );
  }

  const yearData = useMemo(() => {
    return getYearColumnData(data);
  }, [data]);

  const yearColumn = yearData?.yearColumn;
  const uniqueYears = yearData?.years || [];
  const hasYearData = yearData?.hasYearData || false;

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!yearColumn || !hasYearData) {
      const totals = {};
      statusColumns.forEach(col => {
        totals[col] = 0;
      });

      data.forEach(row => {
        statusColumns.forEach(col => {
          const value = row[col];
          if (value !== null && value !== undefined) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              totals[col] = (totals[col] || 0) + numValue;
            }
          }
        });
      });

      return [{
        year: 'Total',
        ...totals
      }];
    }

    const yearGroups = {};
    
    data.forEach(row => {
      const year = row[yearColumn];
      if (year === null || year === undefined || year === '') return;

      if (!yearGroups[year]) {
        yearGroups[year] = { year: year };
        statusColumns.forEach(col => {
          yearGroups[year][col] = 0;
        });
      }

      statusColumns.forEach(col => {
        const value = row[col];
        if (value !== null && value !== undefined) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            yearGroups[year][col] = (yearGroups[year][col] || 0) + numValue;
          }
        }
      });
    });

    return Object.values(yearGroups).sort((a, b) => a.year - b.year);
  }, [data, statusColumns, yearColumn, hasYearData]);

  // NEW: Analytics calculations
  const analytics = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    // Total population across all years
    const totalPopulation = chartData.reduce((sum, yearData) => {
      const yearTotal = statusColumns.reduce((colSum, col) => {
        return colSum + (yearData[col] || 0);
      }, 0);
      return sum + yearTotal;
    }, 0);

    // Per-year totals
    const yearlyTotals = chartData.map(yearData => {
      const total = statusColumns.reduce((sum, col) => {
        return sum + (yearData[col] || 0);
      }, 0);
      return {
        year: yearData.year,
        total: total
      };
    });

    // Per-status totals
    const statusTotals = statusColumns.map(col => {
      const total = chartData.reduce((sum, yearData) => {
        return sum + (yearData[col] || 0);
      }, 0);
      return {
        status: col,
        total: total,
        percentage: totalPopulation > 0 ? ((total / totalPopulation) * 100).toFixed(2) : 0
      };
    }).sort((a, b) => b.total - a.total);

    // Average per year
    const avgPerYear = yearlyTotals.length > 0 
      ? (totalPopulation / yearlyTotals.length).toFixed(0) 
      : 0;

    // Growth rate (if multiple years)
    let growthRate = 0;
    if (yearlyTotals.length >= 2) {
      const firstYear = yearlyTotals[0].total;
      const lastYear = yearlyTotals[yearlyTotals.length - 1].total;
      if (firstYear > 0) {
        growthRate = (((lastYear - firstYear) / firstYear) * 100).toFixed(2);
      }
    }

    return {
      totalPopulation,
      yearlyTotals,
      statusTotals,
      avgPerYear,
      growthRate,
      yearCount: yearlyTotals.length
    };
  }, [chartData, statusColumns]);

  // Detect available occupation columns from data
  const availableOccupationColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const sample = data[0] || {};
    const sampleKeys = Object.keys(sample).map(k => k.toLowerCase());
    return OCCUPATION_COLUMNS.filter(col => {
      const colLower = col.toLowerCase();
      return sampleKeys.some(k => k === colLower || k.replace(/[\s_-]/g, '') === colLower.replace(/[\s_-]/g, ''));
    });
  }, [data]);

  // Find actual column names (case-insensitive match)
  const occupationColumnMap = useMemo(() => {
    if (!data || data.length === 0) return {};
    const sample = data[0] || {};
    const actualKeys = Object.keys(sample);
    const map = {};
    OCCUPATION_COLUMNS.forEach(col => {
      const colLower = col.toLowerCase().replace(/[\s_-]/g, '');
      const match = actualKeys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === colLower);
      if (match) map[col] = match;
    });
    return map;
  }, [data]);

  const actualOccupationColumns = useMemo(() => {
    return Object.values(occupationColumnMap);
  }, [occupationColumnMap]);

  // Occupation chart data preparation
  const occupationChartData = useMemo(() => {
    if (actualOccupationColumns.length === 0) return [];
    
    if (!yearColumn || !hasYearData) {
      const totals = {};
      actualOccupationColumns.forEach(col => {
        totals[col] = 0;
      });

      data.forEach(row => {
        actualOccupationColumns.forEach(col => {
          const value = row[col];
          if (value !== null && value !== undefined) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              totals[col] = (totals[col] || 0) + numValue;
            }
          }
        });
      });

      return [{ year: 'Total', ...totals }];
    }

    const yearGroups = {};
    
    data.forEach(row => {
      const year = row[yearColumn];
      if (year === null || year === undefined || year === '') return;

      if (!yearGroups[year]) {
        yearGroups[year] = { year: year };
        actualOccupationColumns.forEach(col => {
          yearGroups[year][col] = 0;
        });
      }

      actualOccupationColumns.forEach(col => {
        const value = row[col];
        if (value !== null && value !== undefined) {
          const numValue = Number(value);
          if (!isNaN(numValue)) {
            yearGroups[year][col] = (yearGroups[year][col] || 0) + numValue;
          }
        }
      });
    });

    return Object.values(yearGroups).sort((a, b) => a.year - b.year);
  }, [data, actualOccupationColumns, yearColumn, hasYearData]);

  // Occupation analytics
  const occupationAnalytics = useMemo(() => {
    if (!occupationChartData || occupationChartData.length === 0 || actualOccupationColumns.length === 0) return null;

    const totalPopulation = occupationChartData.reduce((sum, yearData) => {
      const yearTotal = actualOccupationColumns.reduce((colSum, col) => {
        return colSum + (yearData[col] || 0);
      }, 0);
      return sum + yearTotal;
    }, 0);

    const yearlyTotals = occupationChartData.map(yearData => {
      const total = actualOccupationColumns.reduce((sum, col) => {
        return sum + (yearData[col] || 0);
      }, 0);
      return { year: yearData.year, total };
    });

    const occupationTotals = actualOccupationColumns.map(col => {
      const total = occupationChartData.reduce((sum, yearData) => {
        return sum + (yearData[col] || 0);
      }, 0);
      return {
        occupation: col,
        total,
        percentage: totalPopulation > 0 ? ((total / totalPopulation) * 100).toFixed(2) : 0
      };
    }).sort((a, b) => b.total - a.total);

    const avgPerYear = yearlyTotals.length > 0 ? (totalPopulation / yearlyTotals.length).toFixed(0) : 0;

    let growthRate = 0;
    if (yearlyTotals.length >= 2) {
      const firstYear = yearlyTotals[0].total;
      const lastYear = yearlyTotals[yearlyTotals.length - 1].total;
      if (firstYear > 0) {
        growthRate = (((lastYear - firstYear) / firstYear) * 100).toFixed(2);
      }
    }

    return {
      totalPopulation,
      yearlyTotals,
      occupationTotals,
      avgPerYear,
      growthRate,
      yearCount: yearlyTotals.length
    };
  }, [occupationChartData, actualOccupationColumns]);

  // Export functions
  const exportCSV = () => {
    if (!chartData || chartData.length === 0) return;

    const headers = ['Year', ...statusColumns, 'Total'];
    const csvRows = [headers.join(',')];

    chartData.forEach(row => {
      const yearTotal = statusColumns.reduce((sum, col) => sum + (row[col] || 0), 0);
      const values = [
        row.year,
        ...statusColumns.map(col => row[col] || 0),
        yearTotal
      ];
      csvRows.push(values.join(','));
    });

    // Add analytics summary
    csvRows.push('');
    csvRows.push('Analytics Summary');
    csvRows.push(`Total Population,${analytics.totalPopulation}`);
    csvRows.push(`Average Per Year,${analytics.avgPerYear}`);
    csvRows.push(`Growth Rate,${analytics.growthRate}%`);

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `status-breakdown-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatColumnName = (col) => {
    return col.charAt(0).toUpperCase() + col.slice(1);
  };

  return (
    <div className="chart-container">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-1">
            👥 Status Breakdown by {yearColumn ? 'Year' : 'Total'}
          </h4>
          <p className="text-sm text-gray-600">
            All marital status categories in one view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Calculator size={18} />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
          <button
            onClick={() => setChartType(chartType === 'bar' ? 'line' : 'bar')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            {chartType === 'bar' ? <TrendingUp size={18} /> : <BarChart3 size={18} />}
            Switch to {chartType === 'bar' ? 'Line' : 'Bar'}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
          <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="text-blue-600" size={20} />
            Analytics Summary
          </h5>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Total Population</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.totalPopulation.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Total Years</p>
              <p className="text-2xl font-bold text-green-600">{analytics.yearCount}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Avg Per Year</p>
              <p className="text-2xl font-bold text-purple-600">{Number(analytics.avgPerYear).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Growth Rate</p>
              <p className={`text-2xl font-bold ${parseFloat(analytics.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.growthRate}%
              </p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h6 className="font-semibold text-gray-800 mb-3">Status Breakdown</h6>
            <div className="space-y-2">
              {analytics.statusTotals.map((status, idx) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{formatColumnName(status.status)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-800">{status.total.toLocaleString()}</span>
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{status.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yearly Totals Chart */}
          {analytics.yearlyTotals.length > 1 && (
            <div className="bg-white rounded-lg p-4 shadow-sm mt-4">
              <h6 className="font-semibold text-gray-800 mb-3">Total Population by Year</h6>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.yearlyTotals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Year Range Info */}
      {yearColumn && hasYearData && chartData.length > 0 && (
        <div className="mb-6">
          <div className="text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-l-4 border-blue-500">
            <div className="flex flex-wrap gap-6">
              <div>
                <span className="font-semibold text-blue-700">📅 Year Column: </span>
                <span className="font-bold text-blue-800">{yearColumn}</span>
              </div>
              <div>
                <span className="font-semibold text-blue-700">Data Range: </span>
                <span className="text-blue-800 font-medium">
                  {chartData[0]?.year} to {chartData[chartData.length - 1]?.year}
                </span>
              </div>
              <div>
                <span className="font-semibold text-blue-700">Unique Years: </span>
                <span className="text-blue-800 font-medium">{uniqueYears.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={500}>
        {chartType === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 30, right: 40, left: 30, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="year" 
              label={{ 
                value: yearColumn ? `Year (from ${yearColumn} Column)` : 'Total', 
                position: 'insideBottom', 
                offset: -10,
                style: { fontSize: '14px', fontWeight: '600' }
              }}
              tick={{ fontSize: 14 }}
            />
            <YAxis 
              label={{ 
                value: 'Number of People', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '14px', fontWeight: '600' }
              }}
              tick={{ fontSize: 14 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '14px',
                padding: '12px'
              }}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toLocaleString() : value,
                formatColumnName(name)
              ]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '30px', fontSize: '14px' }}
              iconType="rect"
              iconSize={16}
            />
            {statusColumns.map((col, index) => (
              <Bar 
                key={col}
                dataKey={col} 
                fill={COLORS[index % COLORS.length]} 
                name={formatColumnName(col)}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 30, right: 40, left: 30, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="year" 
              label={{ 
                value: yearColumn ? `Year (from ${yearColumn} Column)` : 'Total', 
                position: 'insideBottom', 
                offset: -10,
                style: { fontSize: '14px', fontWeight: '600' }
              }}
              tick={{ fontSize: 14 }}
            />
            <YAxis 
              label={{ 
                value: 'Number of People', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '14px', fontWeight: '600' }
              }}
              tick={{ fontSize: 14 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '14px',
                padding: '12px'
              }}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toLocaleString() : value,
                formatColumnName(name)
              ]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '30px', fontSize: '14px' }}
              iconType="line"
              iconSize={16}
            />
            {statusColumns.map((col, index) => (
              <Line 
                key={col}
                type="monotone"
                dataKey={col} 
                stroke={COLORS[index % COLORS.length]} 
                name={formatColumnName(col)}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* ==================== OCCUPATION CHARTS ==================== */}
      {actualOccupationColumns.length > 0 && occupationChartData.length > 0 && (
        <>
          <hr className="my-10 border-gray-300" />
    
          {/* Occupation Header */}
          <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-1">
                💼 Occupation Breakdown by {yearColumn ? 'Year' : 'Total'}
              </h4>
              <p className="text-sm text-gray-600">
                All occupation categories across years
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOccupationAnalytics(!showOccupationAnalytics)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Briefcase size={18} />
                {showOccupationAnalytics ? 'Hide' : 'Show'} Analytics
              </button>
              <button
                onClick={() => setOccupationChartType(occupationChartType === 'bar' ? 'line' : 'bar')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {occupationChartType === 'bar' ? <TrendingUp size={18} /> : <BarChart3 size={18} />}
                Switch to {occupationChartType === 'bar' ? 'Line' : 'Bar'}
              </button>
            </div>
          </div>

          {/* Occupation Analytics Panel */}
          {showOccupationAnalytics && occupationAnalytics && (
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Briefcase className="text-purple-600" size={20} />
                Occupation Analytics Summary
              </h5>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Total Workers</p>
                  <p className="text-2xl font-bold text-purple-600">{occupationAnalytics.totalPopulation.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Total Years</p>
                  <p className="text-2xl font-bold text-green-600">{occupationAnalytics.yearCount}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Avg Per Year</p>
                  <p className="text-2xl font-bold text-pink-600">{Number(occupationAnalytics.avgPerYear).toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Growth Rate</p>
                  <p className={`text-2xl font-bold ${parseFloat(occupationAnalytics.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {occupationAnalytics.growthRate}%
                  </p>
                </div>
              </div>

              {/* Occupation Breakdown */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h6 className="font-semibold text-gray-800 mb-3">Occupation Breakdown</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {occupationAnalytics.occupationTotals.map((occ, idx) => (
                    <div key={occ.occupation} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: OCCUPATION_COLORS[idx % OCCUPATION_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-700">{formatColumnName(occ.occupation)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-800">{occ.total.toLocaleString()}</span>
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{occ.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yearly Totals Chart */}
              {occupationAnalytics.yearlyTotals.length > 1 && (
                <div className="bg-white rounded-lg p-4 shadow-sm mt-4">
                  <h6 className="font-semibold text-gray-800 mb-3">Total by Occupation Over Years</h6>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={occupationAnalytics.yearlyTotals}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Line type="monotone" dataKey="total" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Occupation Bar/Line Chart */}
          <ResponsiveContainer width="100%" height={500}>
            {occupationChartType === 'bar' ? (
              <BarChart data={occupationChartData} margin={{ top: 30, right: 40, left: 30, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="year" 
                  label={{ 
                    value: yearColumn ? `Year` : 'Total', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { fontSize: '14px', fontWeight: '600' }
                  }}
                  tick={{ fontSize: 14 }}
                />
                <YAxis 
                  label={{ 
                    value: 'Number of People', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: '14px', fontWeight: '600' }
                  }}
                  tick={{ fontSize: 14 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    padding: '12px'
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    formatColumnName(name)
                  ]}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '30px', fontSize: '12px' }}
                  iconType="rect"
                  iconSize={14}
                />
                {actualOccupationColumns.map((col, index) => (
                  <Bar 
                    key={col}
                    dataKey={col} 
                    fill={OCCUPATION_COLORS[index % OCCUPATION_COLORS.length]} 
                    name={formatColumnName(col)}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={occupationChartData} margin={{ top: 30, right: 40, left: 30, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="year" 
                  label={{ 
                    value: yearColumn ? `Year` : 'Total', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { fontSize: '14px', fontWeight: '600' }
                  }}
                  tick={{ fontSize: 14 }}
                />
                <YAxis 
                  label={{ 
                    value: 'Number of People', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: '14px', fontWeight: '600' }
                  }}
                  tick={{ fontSize: 14 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    fontSize: '14px',
                    padding: '12px'
                  }}
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    formatColumnName(name)
                  ]}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '30px', fontSize: '12px' }}
                  iconType="line"
                  iconSize={14}
                />
                {actualOccupationColumns.map((col, index) => (
                  <Line 
                    key={col}
                    type="monotone"
                    dataKey={col} 
                    stroke={OCCUPATION_COLORS[index % OCCUPATION_COLORS.length]} 
                    name={formatColumnName(col)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </>
      )}

    </div>
  );
};

export default StatusCombinedChart;
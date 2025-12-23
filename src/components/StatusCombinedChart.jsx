/**
 * ============================================
 * STATUS COMBINED CHART COMPONENT
 * ============================================
 * 
 * Displays all status-related columns (single, married, widower, etc.)
 * in a single grouped bar chart, organized by year.
 * 
 * Features:
 * - Groups data by year (if year column exists)
 * - Shows all status types side-by-side for easy comparison
 * - Color-coded bars for each status type
 * - Falls back to total aggregation if no year column
 * 
 * To modify:
 * - Change colors in COLORS array
 * - Adjust chart height in ResponsiveContainer
 * - Modify data aggregation logic in chartData useMemo
 * 
 * @param {Array} data - Dataset to visualize
 * @param {Array} statusColumns - Array of status column names
 * @param {Object} types - Column type mapping
 * 
 * @component
 */
import React, { useMemo } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// Color palette - modify these to change bar colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1'];

const StatusCombinedChart = ({ data, statusColumns, types }) => {
  // ========== VALIDATION ==========
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

  /**
   * ========== YEAR COLUMN DETECTION ==========
   * Finds the year column for grouping data
   */
  const yearColumn = useMemo(() => {
    const yearCol = Object.keys(data[0] || {}).find(
      key => key.toLowerCase() === 'year'
    );
    return yearCol;
  }, [data]);

  /**
   * ========== CHART DATA PREPARATION ==========
   * Groups status data by year and calculates totals
   * 
   * Data Structure:
   * [
   *   { year: 2000, single: 16, married: 0, widower: 25, separated: 3 },
   *   { year: 2001, single: 20, married: 5, widower: 30, separated: 2 },
   *   ...
   * ]
   * 
   * To modify aggregation:
   * - Change how values are summed
   * - Add average or other statistics
   */
  const chartData = useMemo(() => {
    if (!yearColumn) {
      // No year column, aggregate totals across all data
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

    // Group by year and aggregate status columns
    const yearGroups = {};
    
    data.forEach(row => {
      const year = row[yearColumn];
      if (year === null || year === undefined) return;

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

    // Convert to array and sort by year
    return Object.values(yearGroups)
      .sort((a, b) => a.year - b.year);
  }, [data, statusColumns, yearColumn]);

  /**
   * ========== COLUMN NAME FORMATTING ==========
   * Formats column names for display (capitalizes first letter)
   * Example: "single" → "Single"
   */
  const formatColumnName = (col) => {
    return col.charAt(0).toUpperCase() + col.slice(1);
  };

  return (
    <div className="chart-container">
      {/* ========== CHART HEADER ========== */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-1">
            👥 Status Breakdown by {yearColumn ? 'Year' : 'Total'}
          </h4>
          <p className="text-sm text-gray-600">
            All marital status categories in one view
          </p>
        </div>
        <div className="px-4 py-2 bg-primary-50 rounded-lg">
          <span className="text-primary-700 font-semibold text-base">
            {data.length} records
          </span>
        </div>
      </div>
      
      {/* ========== YEAR RANGE INFO ========== */}
      {yearColumn && chartData.length > 0 && (
        <div className="mb-6 text-sm text-gray-700 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
          <span className="font-semibold">📅 Data Range: </span>
          <span className="text-blue-700">
            {chartData[0]?.year} to {chartData[chartData.length - 1]?.year}
          </span>
          <span className="text-gray-600 ml-2">
            ({chartData.length} {chartData.length === 1 ? 'year' : 'years'})
          </span>
        </div>
      )}
      
      {/* ========== GROUPED BAR CHART ========== */}
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={chartData} margin={{ top: 30, right: 40, left: 30, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            label={{ 
              value: yearColumn ? 'Year (from Column A)' : 'Total', 
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
      </ResponsiveContainer>
    </div>
  );
};

export default StatusCombinedChart;

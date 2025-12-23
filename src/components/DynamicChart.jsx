/**
 * ============================================
 * DYNAMIC CHART COMPONENT
 * ============================================
 * 
 * Automatically generates appropriate chart types based on data column types.
 * 
 * Chart Type Selection:
 * - Year columns → Bar chart (distribution)
 * - Number + Year → Bar chart (trends over time)
 * - Category/Boolean → Bar + Pie charts
 * - Date → Area chart
 * - String → Bar chart
 * 
 * To modify chart types:
 * - Update the switch statement in renderChart()
 * - Add new chart types in the imports
 * - Adjust colors in COLORS array
 * 
 * @param {Array} data - The dataset to visualize
 * @param {string} variable - Column name to chart
 * @param {Object} types - Column type mapping { column: type }
 * 
 * @component
 */
import React, { useMemo } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// Color palette for charts - modify these to change chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1'];

const DynamicChart = ({ data, variable, types }) => {
  // ========== VALIDATION ==========
  // Check if data is available
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-xl p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">📊 No Data Available</p>
          <p className="text-gray-400 text-sm">This chart needs data to display</p>
        </div>
      </div>
    );
  }

  // Check if types are defined
  if (!types || !variable) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-xl p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">⏳ Loading Chart Type...</p>
          <p className="text-gray-400 text-sm">Analyzing data structure</p>
        </div>
      </div>
    );
  }

  const colType = types[variable];

  /**
   * ========== YEAR COLUMN DETECTION ==========
   * Finds the year column (case-insensitive)
   * Year column is used for time-series charts
   */
  const yearColumn = useMemo(() => {
    const yearCol = Object.keys(data[0] || {}).find(
      key => key.toLowerCase() === 'year'
    );
    return yearCol;
  }, [data]);

  /**
   * ========== TIME SERIES DATA PREPARATION ==========
   * Groups data by year and calculates totals
   * 
   * Data Structure:
   * - Year column (Column A) → X-axis
   * - Variable values → Y-axis (summed per year)
   * 
   * To modify aggregation:
   * - Change total calculation (currently sum)
   * - Add average, median, or other statistics
   */
  const timeSeriesData = useMemo(() => {
    if (!yearColumn) return [];

    // Group by year and aggregate values for the current variable
    const yearGroups = {};
    
    data.forEach(row => {
      const year = row[yearColumn];
      const value = row[variable];
      
      if (year !== null && year !== undefined && value !== null && value !== undefined) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          if (!yearGroups[year]) {
            yearGroups[year] = {
              year: year,
              total: 0,
              count: 0,
              values: []
            };
          }
          yearGroups[year].total += numValue;
          yearGroups[year].count += 1;
          yearGroups[year].values.push(numValue);
        }
      }
    });

    // Convert to array and sort by year
    return Object.values(yearGroups)
      .map(group => ({
        year: group.year,
        value: group.total, // Total sum of values for this variable across all rows for this year
        average: group.count > 0 ? group.total / group.count : 0,
        count: group.count,
        min: group.values.length > 0 ? Math.min(...group.values) : 0,
        max: group.values.length > 0 ? Math.max(...group.values) : 0
      }))
      .sort((a, b) => a.year - b.year);
  }, [data, variable, yearColumn]);

  /**
   * ========== CATEGORICAL DATA PREPARATION ==========
   * Counts occurrences of each unique value
   * Used for category, boolean, and string columns
   * 
   * To modify:
   * - Change sorting (currently descending by count)
   * - Adjust limit (currently top 15)
   */
  const categoricalData = useMemo(() => {
    const counts = {};
    
    data.forEach(row => {
      const value = row[variable];
      if (value === null || value === undefined || value === "") {
        counts["N/A"] = (counts["N/A"] || 0) + 1;
      } else {
        const key = String(value).trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value) // Sort by count descending
      .slice(0, 15); // Limit to top 15 for readability
  }, [data, variable]);

  /**
   * ========== CHART RENDERING ==========
   * Selects appropriate chart type based on column type
   * 
   * To add new chart types:
   * 1. Import the chart component from recharts
   * 2. Add a new case in the switch statement
   * 3. Configure the chart with appropriate props
   */
  const renderChart = () => {
    switch (colType) {
      case "year":
        // Year columns → Bar chart showing year distribution
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoricalData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                label={{ value: 'Year', position: 'insideBottom', offset: -10, style: { fontSize: '14px', fontWeight: '600' } }} 
                tick={{ fontSize: 14 }}
              />
              <YAxis 
                label={{ value: 'Number of Records', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '600' } }} 
                tick={{ fontSize: 14 }}
              />
              <Tooltip 
                contentStyle={{ 
                  fontSize: '14px', 
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }} 
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
              <Bar dataKey="value" fill="#8884d8" name="Records" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "number":
        // Numeric columns → Bar chart showing trends over time (if year exists)
        if (yearColumn && timeSeriesData.length > 0) {
          return (
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 30, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="year" 
                  label={{ 
                    value: 'Year (from Column A)', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { fontSize: '14px', fontWeight: '600' }
                  }}
                  type="number"
                  scale="linear"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => String(value)}
                  tick={{ fontSize: 14 }}
                />
                <YAxis 
                  label={{ 
                    value: `Total ${variable}`, 
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
                    name
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8" 
                  name={`Total ${variable}`}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          );
        } else {
          // No year column → Show value distribution
          return (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoricalData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 14 }}
                  label={{ value: 'Values', position: 'insideBottom', offset: -10, style: { fontSize: '14px', fontWeight: '600' } }}
                />
                <YAxis 
                  tick={{ fontSize: 14 }}
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '600' } }}
                />
                <Tooltip 
                  contentStyle={{ fontSize: '14px', padding: '12px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                <Bar dataKey="value" fill="#8884d8" name="Count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        }

      case "category":
      case "boolean":
        // Category/Boolean columns → Bar chart + Pie chart (dual visualization)
        return (
          <div className="space-y-8">
            {/* Bar Chart - Shows counts for each category */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                📊 Count by Category
              </h4>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={categoricalData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={120}
                    interval={0}
                    tick={{ fontSize: 13 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 14 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '600' } }}
                  />
                  <Tooltip 
                    contentStyle={{ fontSize: '14px', padding: '12px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                  <Bar dataKey="value" fill="#82ca9d" name="Count" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Shows percentage distribution */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
                🥧 Percentage Distribution
              </h4>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={categoricalData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => 
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    labelLine={false}
                  >
                    {categoricalData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ fontSize: '14px', padding: '12px', borderRadius: '8px' }}
                    formatter={(value, name, props) => [
                      `${value} (${((value / categoricalData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%)`,
                      name
                    ]}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "date":
        // Date columns → Area chart (shows trends over time)
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={categoricalData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 14 }}
                label={{ value: 'Date', position: 'insideBottom', offset: -10, style: { fontSize: '14px', fontWeight: '600' } }}
              />
              <YAxis 
                tick={{ fontSize: 14 }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '600' } }}
              />
              <Tooltip 
                contentStyle={{ fontSize: '14px', padding: '12px', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                fill="#8884d8"
                fillOpacity={0.6}
                name="Count"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "string":
      default:
        // String columns → Bar chart (shows distribution)
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoricalData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
                tick={{ fontSize: 13 }}
              />
              <YAxis 
                tick={{ fontSize: 14 }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: '600' } }}
              />
              <Tooltip 
                contentStyle={{ fontSize: '14px', padding: '12px', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
              <Bar dataKey="value" fill="#ffc658" name="Count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl p-6">
      {/* ========== CHART HEADER INFO ========== */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-primary-50 rounded-lg">
            <span className="text-primary-700 font-semibold text-base capitalize">
              {colType} Data
            </span>
          </div>
          <div className="text-gray-600 text-base">
            <span className="font-medium">{data.length}</span> records
          </div>
        </div>
      </div>
      
      {/* ========== DATA STRUCTURE INFO ========== */}
      {/* Helpful explanation for students about how the chart works */}
      {yearColumn && colType === "number" && timeSeriesData.length > 0 && (
        <div className="mb-6 text-sm text-gray-700 bg-blue-50 p-5 rounded-xl border-l-4 border-blue-500">
          <div className="font-bold text-base mb-3 text-blue-900">📊 How This Chart Works:</div>
          <div className="space-y-2 text-gray-800">
            <div className="flex items-start gap-2">
              <span className="font-semibold">• X-Axis (Years):</span>
              <span>Shows years from Column A (must be 4 digits: 1900-2100)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">• Y-Axis (Values):</span>
              <span>Shows total <strong>{variable}</strong> values for each year</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">• Calculation:</span>
              <span>Automatically adds up all {variable} values for each year</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">• Data Range:</span>
              <span><strong>{timeSeriesData[0]?.year}</strong> to <strong>{timeSeriesData[timeSeriesData.length - 1]?.year}</strong></span>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== RENDER THE CHART ========== */}
      {renderChart()}
    </div>
  );
};

export default DynamicChart;
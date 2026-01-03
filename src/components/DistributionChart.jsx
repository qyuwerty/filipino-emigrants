/**
 * ============================================
 * DISTRIBUTION CHART COMPONENT
 * ============================================
 * 
 * Provides distribution visualization including:
 * - Histograms for frequency distribution
 * - Box plots for statistical distribution
 * 
 * @param {Array} data - The dataset to visualize
 * @param {string} variable - Column name to chart
 * @param {Object} types - Column type mapping { column: type }
 */
import React, { useMemo } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, Cell
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const DistributionChart = ({ data, variable, types }) => {
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

  const colType = types[variable];

  // Calculate histogram data
  const histogramData = useMemo(() => {
    const values = data
      .map(row => row[variable])
      .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
      .map(val => Number(val))
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    // Calculate optimal bin count using Sturges' formula
    const binCount = Math.ceil(Math.log2(values.length)) + 1;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / binCount;

    // Create bins
    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const binStart = min + (i * binWidth);
      const binEnd = binStart + binWidth;
      const count = values.filter(val => val >= binStart && (i === binCount - 1 ? val <= binEnd : val < binEnd)).length;
      
      bins.push({
        range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        start: binStart,
        end: binEnd,
        count: count,
        frequency: count / values.length
      });
    }

    return bins;
  }, [data, variable]);

  // Calculate box plot statistics
  const boxPlotData = useMemo(() => {
    const values = data
      .map(row => row[variable])
      .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
      .map(val => Number(val))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const medianIndex = Math.floor(values.length * 0.5);

    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const median = values[medianIndex];
    const iqr = q3 - q1;
    const min = Math.max(values[0], q1 - 1.5 * iqr);
    const max = Math.min(values[values.length - 1], q3 + 1.5 * iqr);

    // Find outliers
    const outliers = values.filter(val => val < min || val > max);

    return {
      min,
      q1,
      median,
      q3,
      max,
      outliers,
      count: values.length,
      mean: values.reduce((sum, val) => sum + val, 0) / values.length
    };
  }, [data, variable]);

  // Render box plot using scatter chart
  const renderBoxPlot = () => {
    if (!boxPlotData) return null;

    const boxPlotPoints = [
      { name: 'Min', value: boxPlotData.min, type: 'whisker' },
      { name: 'Q1', value: boxPlotData.q1, type: 'box' },
      { name: 'Median', value: boxPlotData.median, type: 'median' },
      { name: 'Q3', value: boxPlotData.q3, type: 'box' },
      { name: 'Max', value: boxPlotData.max, type: 'whisker' },
      ...boxPlotData.outliers.map((val, idx) => ({
        name: `Outlier ${idx + 1}`,
        value: val,
        type: 'outlier'
      }))
    ];

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            label={{ 
              value: variable, 
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
            formatter={(value, name, props) => [
              typeof value === 'number' ? value.toFixed(2) : value,
              props.payload.type === 'outlier' ? 'Outlier' : props.payload.name
            ]}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          <Scatter 
            data={boxPlotPoints} 
            fill="#8884d8"
            name="Distribution"
          >
            {boxPlotPoints.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={
                  entry.type === 'outlier' ? '#FF8042' :
                  entry.type === 'median' ? '#00C49F' :
                  entry.type === 'whisker' ? '#0088FE' :
                  '#8884D8'
                } 
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  if (colType !== "number") {
    return (
      <div className="bg-white rounded-xl p-6">
        <div className="mb-6">
          <div className="px-4 py-2 bg-yellow-50 rounded-lg">
            <span className="text-yellow-700 font-semibold text-base">
              Distribution Analysis
            </span>
          </div>
          <div className="text-gray-600 text-base mt-2">
            <span className="font-medium">{data.length}</span> records
          </div>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg font-medium mb-2">📊 Distribution Not Available</p>
          <p className="text-gray-400 text-sm">
            Distribution charts require numeric data. Current data type: <strong>{colType}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-purple-50 rounded-lg">
            <span className="text-purple-700 font-semibold text-base">
              Distribution Analysis
            </span>
          </div>
          <div className="text-gray-600 text-base">
            <span className="font-medium">{data.length}</span> records
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {boxPlotData && (
        <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
          <h5 className="text-lg font-bold text-gray-800 mb-4">📈 Statistical Summary</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Mean</p>
              <p className="text-xl font-bold text-blue-600">{boxPlotData.mean.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Median</p>
              <p className="text-xl font-bold text-green-600">{boxPlotData.median.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Range</p>
              <p className="text-xl font-bold text-purple-600">
                {(boxPlotData.max - boxPlotData.min).toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Outliers</p>
              <p className="text-xl font-bold text-red-600">{boxPlotData.outliers.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Histogram */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          📊 Frequency Distribution (Histogram)
        </h4>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="range" 
              angle={-45} 
              textAnchor="end" 
              height={120}
              interval={0}
              tick={{ fontSize: 12 }}
              label={{ 
                value: `${variable} Range`, 
                position: 'insideBottom', 
                offset: -10, 
                style: { fontSize: '14px', fontWeight: '600' } 
              }}
            />
            <YAxis 
              tick={{ fontSize: 14 }}
              label={{ 
                value: 'Frequency', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: '14px', fontWeight: '600' } 
              }}
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
                value,
                name === 'count' ? 'Count' : 'Frequency'
              ]}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
            <Bar 
              dataKey="count" 
              fill="#8b5cf6" 
              name="Count"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Box Plot */}
      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
          📦 Statistical Distribution (Box Plot)
        </h4>
        {renderBoxPlot()}
      </div>

      {/* Box Plot Explanation */}
      <div className="mt-6 text-sm text-gray-700 bg-blue-50 p-5 rounded-xl border-l-4 border-blue-500">
        <div className="font-bold text-base mb-3 text-blue-900">📊 How to Read This Box Plot:</div>
        <div className="space-y-2 text-gray-800">
          <div className="flex items-start gap-2">
            <span className="font-semibold">• Blue dots:</span>
            <span>Minimum and Maximum values (whiskers)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold">• Purple dots:</span>
            <span>First Quartile (Q1) and Third Quartile (Q3) - box boundaries</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold">• Green dot:</span>
            <span>Median - middle value of the dataset</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold">• Red dots:</span>
            <span>Outliers - values significantly different from the rest</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionChart;

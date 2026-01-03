/**
 * ============================================
 * RELATIONSHIP CHART COMPONENT
 * ============================================
 * 
 * Provides relationship visualization through scatter plots:
 * - Correlation analysis between two numeric variables
 * - Trend line visualization
 * - Statistical correlation coefficient
 * 
 * @param {Array} data - The dataset to visualize
 * @param {Object} types - Column type mapping { column: type }
 */
import React, { useMemo, useState } from "react";
import {
  ScatterChart, Scatter, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { TrendingUp, Calculator, RefreshCw } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const RelationshipChart = ({ data, types }) => {
  const [selectedX, setSelectedX] = useState('');
  const [selectedY, setSelectedY] = useState('');
  const [showRegression, setShowRegression] = useState(true);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-xl p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">🔗 No Data Available</p>
          <p className="text-gray-400 text-sm">This chart needs data to display</p>
        </div>
      </div>
    );
  }

  // Get numeric columns for correlation analysis
  const numericColumns = useMemo(() => {
    return Object.keys(types).filter(col => types[col] === 'number');
  }, [types]);

  // Prepare scatter plot data
  const scatterData = useMemo(() => {
    if (!selectedX || !selectedY) return [];

    return data
      .map(row => ({
        x: row[selectedX],
        y: row[selectedY],
        originalRow: row
      }))
      .filter(point => 
        point.x !== null && 
        point.x !== undefined && 
        !isNaN(Number(point.x)) &&
        point.y !== null && 
        point.y !== undefined && 
        !isNaN(Number(point.y))
      )
      .map(point => ({
        ...point,
        x: Number(point.x),
        y: Number(point.y)
      }));
  }, [data, selectedX, selectedY]);

  // Calculate correlation coefficient and regression line
  const correlation = useMemo(() => {
    if (scatterData.length < 2) return null;

    const n = scatterData.length;
    const sumX = scatterData.reduce((sum, point) => sum + point.x, 0);
    const sumY = scatterData.reduce((sum, point) => sum + point.y, 0);
    const sumXY = scatterData.reduce((sum, point) => sum + (point.x * point.y), 0);
    const sumX2 = scatterData.reduce((sum, point) => sum + (point.x * point.x), 0);
    const sumY2 = scatterData.reduce((sum, point) => sum + (point.y * point.y), 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    // Calculate regression line (y = mx + b)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      coefficient: correlation,
      strength: Math.abs(correlation),
      direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none',
      slope,
      intercept,
      rSquared: correlation * correlation,
      sampleSize: n
    };
  }, [scatterData]);

  // Generate regression line data
  const regressionLineData = useMemo(() => {
    if (!correlation || !showRegression || scatterData.length === 0) return [];

    const xValues = scatterData.map(point => point.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);

    return [
      { x: minX, y: correlation.slope * minX + correlation.intercept },
      { x: maxX, y: correlation.slope * maxX + correlation.intercept }
    ];
  }, [correlation, showRegression, scatterData]);

  const getCorrelationInterpretation = (coefficient) => {
    const strength = Math.abs(coefficient);
    if (strength >= 0.9) return { text: 'Very Strong', color: 'text-green-600' };
    if (strength >= 0.7) return { text: 'Strong', color: 'text-blue-600' };
    if (strength >= 0.5) return { text: 'Moderate', color: 'text-yellow-600' };
    if (strength >= 0.3) return { text: 'Weak', color: 'text-orange-600' };
    return { text: 'Very Weak', color: 'text-red-600' };
  };

  return (
    <div className="bg-white rounded-xl p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-orange-50 rounded-lg">
            <span className="text-orange-700 font-semibold text-base">
              Relationship Analysis
            </span>
          </div>
          <div className="text-gray-600 text-base">
            <span className="font-medium">{data.length}</span> records
          </div>
        </div>
      </div>

      {/* Variable Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              X-Axis Variable (Independent)
            </label>
            <select
              value={selectedX}
              onChange={(e) => setSelectedX(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select X variable...</option>
              {numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Y-Axis Variable (Dependent)
            </label>
            <select
              value={selectedY}
              onChange={(e) => setSelectedY(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select Y variable...</option>
              {numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedX && selectedY && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRegression(!showRegression)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <TrendingUp size={18} />
              {showRegression ? 'Hide' : 'Show'} Trend Line
            </button>
            <button
              onClick={() => {
                setSelectedX('');
                setSelectedY('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <RefreshCw size={18} />
              Reset Variables
            </button>
          </div>
        )}
      </div>

      {/* No variables selected */}
      {!selectedX || !selectedY ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <TrendingUp size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Select Variables to Analyze Relationships
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Choose two numeric variables from the dropdowns above to explore correlations and patterns in your data.
          </p>
          {numericColumns.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700 text-sm">
                ⚠️ No numeric columns found. Relationship analysis requires numeric data types.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Correlation Statistics */}
          {correlation && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
              <h5 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calculator className="text-orange-600" size={20} />
                Correlation Analysis
              </h5>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Correlation (r)</p>
                  <p className="text-xl font-bold text-orange-600">
                    {correlation.coefficient.toFixed(4)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">R-squared</p>
                  <p className="text-xl font-bold text-blue-600">
                    {correlation.rSquared.toFixed(4)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Strength</p>
                  <p className={`text-xl font-bold ${getCorrelationInterpretation(correlation.coefficient).color}`}>
                    {getCorrelationInterpretation(correlation.coefficient).text}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600 mb-1">Direction</p>
                  <p className="text-xl font-bold capitalize">
                    {correlation.direction}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-700">
                  <strong>Interpretation:</strong> There is a{' '}
                  <strong>{getCorrelationInterpretation(correlation.coefficient).text.toLowerCase()}</strong>{' '}
                  <strong>{correlation.direction}</strong> correlation between{' '}
                  <strong>{selectedX}</strong> and <strong>{selectedY}</strong>.
                  {correlation.rSquared > 0.5 && (
                    <span> About <strong>{(correlation.rSquared * 100).toFixed(1)}%</strong> of the variation in {selectedY} can be explained by {selectedX}.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Scatter Plot */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-4 text-center">
              🔗 Scatter Plot: {selectedY} vs {selectedX}
            </h4>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="x" 
                  type="number"
                  name={selectedX}
                  label={{ 
                    value: selectedX, 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { fontSize: '14px', fontWeight: '600' }
                  }}
                  tick={{ fontSize: 14 }}
                />
                <YAxis 
                  type="number"
                  name={selectedY}
                  label={{ 
                    value: selectedY, 
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
                    typeof value === 'number' ? value.toFixed(2) : value,
                    name === 'x' ? selectedX : selectedY
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                <Scatter 
                  data={scatterData} 
                  fill="#ff7300"
                  name="Data Points"
                />
                
                {/* Regression Line */}
                {showRegression && regressionLineData.length > 0 && (
                  <Line 
                    type="monotone"
                    dataKey="y"
                    data={regressionLineData}
                    stroke="#00C49F"
                    strokeWidth={2}
                    dot={false}
                    name="Trend Line"
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Data Points Summary */}
          <div className="text-sm text-gray-700 bg-blue-50 p-5 rounded-xl border-l-4 border-blue-500">
            <div className="font-bold text-base mb-3 text-blue-900">📊 Analysis Summary:</div>
            <div className="space-y-2 text-gray-800">
              <div className="flex items-start gap-2">
                <span className="font-semibold">• Data Points:</span>
                <span>{scatterData.length} valid pairs analyzed</span>
              </div>
              {correlation && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">• Trend Equation:</span>
                    <span>y = {correlation.slope.toFixed(4)}x + {correlation.intercept.toFixed(4)}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">• Relationship:</span>
                    <span>
                      As {selectedX} {correlation.direction === 'positive' ? 'increases' : correlation.direction === 'negative' ? 'decreases' : 'shows no change'}, 
                      {selectedY} tends to {correlation.direction === 'positive' ? 'increase' : correlation.direction === 'negative' ? 'decrease' : 'remain constant'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RelationshipChart;

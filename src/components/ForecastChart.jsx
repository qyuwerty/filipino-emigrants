import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ForecastChart = ({ 
  historicalData, 
  forecastData, 
  modelType, 
  targetColumn = 'emigrants',
  yearsToForecast = 5 
}) => {
  // Combine historical and forecast data for the chart
  const chartData = React.useMemo(() => {
    const data = [];
    
    // Add historical data - handle different data structures
    if (historicalData && historicalData.length > 0) {
      historicalData.forEach(item => {
        // Handle both {year, actual} and {year, [targetColumn]} structures
        const value = item.actual !== undefined ? item.actual : item[targetColumn];
        const year = item.year;
        
        if (year !== undefined && value !== undefined && value !== null) {
          data.push({
            year: typeof year === 'string' ? year : year.toString(),
            [targetColumn]: value,
            historical: value,
            forecast: null
          });
        }
      });
    }
    
    // Add forecast data
    if (forecastData && forecastData.length > 0) {
      forecastData.forEach(item => {
        const value = item[targetColumn];
        const year = item.year;
        
        if (year !== undefined && value !== undefined && value !== null) {
          data.push({
            year: typeof year === 'string' ? year : year.toString(),
            [targetColumn]: value,
            historical: null,
            forecast: value
          });
        }
      });
    }
    
    // Sort by year
    return data.sort((a, b) => {
      const yearA = parseInt(a.year);
      const yearB = parseInt(b.year);
      return yearA - yearB;
    });
  }, [historicalData, forecastData, targetColumn]);

  // Model-specific colors
  const modelColors = React.useMemo(() => {
    if (modelType === 'MLP') {
      return {
        historical: '#2563eb',
        forecast: '#1d4ed8',
        grid: 'rgba(37, 99, 235, 0.1)'
      };
    }
    // Default LSTM colors
    return {
      historical: '#059669',
      forecast: '#dc2626',
      grid: 'rgba(5, 150, 105, 0.1)'
    };
  }, [modelType]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="forecast-chart-empty">
        <p>No data available for chart visualization</p>
        <p>Please train a model and generate forecasts first.</p>
      </div>
    );
  }

  return (
    <div className="forecast-chart">
      <div className="forecast-chart__header">
        <h3 className="forecast-chart__title">
          {modelType}: Historical + Forecast
        </h3>
        <p className="forecast-chart__subtitle">
          Showing {yearsToForecast}-year forecast based on trained {modelType} model
        </p>
      </div>
      
      <div className="forecast-chart__container">
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
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={modelColors.grid}
            />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(15, 23, 42, 0.18)' }}
            />
            <YAxis 
              tickFormatter={(value) => Number(value).toLocaleString()}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(15, 23, 42, 0.18)' }}
            />
            <Tooltip 
              formatter={(value, name) => [
                Number(value).toLocaleString(), 
                name.includes('Historical') ? `${targetColumn} (Historical)` : `${targetColumn} (${modelType} Forecast)`
              ]}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Legend />
            
            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="historical"
              stroke={modelColors.historical}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1, stroke: modelColors.historical, fill: '#fff' }}
              name={`${targetColumn} (Historical)`}
              connectNulls={false}
              isAnimationActive={false}
            />
            
            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={modelColors.forecast}
              strokeWidth={2}
              strokeDasharray="4 6"
              dot={{ r: 4, strokeWidth: 1, stroke: modelColors.forecast, fill: '#fff' }}
              name={`${targetColumn} (${modelType} Forecast)`}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ForecastChart;

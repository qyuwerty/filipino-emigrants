/**
 * ============================================
 * UNIFIED CHART RENDERER COMPONENT
 * ============================================
 * 
 * Combined visualization component that intelligently selects
 * appropriate chart or map based on data category and type
 * 
 * Features:
 * - Automatic chart type detection
 * - Primary/secondary chart switching
 * - Geographic map integration
 * - Responsive layout
 * - Loading and error states
 * - All chart and map rendering logic in one component
 */

import React, { useMemo, useState } from "react";
import { getYearColumnData } from "../utils/yearUtils";
import { 
  CHART_CATEGORIES, 
  determineChartCategory, 
  getCategoryColors 
} from "../utils/chartCategories";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap,
  ComposedChart
} from "recharts";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import 'leaflet/dist/leaflet.css';

// Philippine map data imports
import regionsData from "../assets/philippines-json-maps/2019/topojson/regions/medres/regions.topo.0.01.json";
import provincesData from "../assets/philippines-json-maps/2019/geojson/provinces/medres/provinces.combined.json";
import { feature } from "topojson-client";

// Convert TopoJSON to GeoJSON for regions
const regionsGeoJson = feature(regionsData, regionsData.objects["regions.0.01"]);

// Use the combined provinces GeoJSON
const provincesGeoJson = provincesData;

// Color palette for charts - modify these to change chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1'];

const ChartRenderer = ({ 
  data, 
  variable, 
  types, 
  fileName, 
  chartType = 'primary',
  showChartTypeToggle = true,
  className = ''
}) => {
  const [activeView, setActiveView] = useState(chartType);
  
  // ========== VALIDATION ==========
  // Check if data is available
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 bg-gray-50 rounded-xl p-8 ${className}`}>
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
      <div className={`flex items-center justify-center h-80 bg-gray-50 rounded-xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">⏳ Loading Chart Type...</p>
          <p className="text-gray-400 text-sm">Analyzing data structure</p>
        </div>
      </div>
    );
  }

  // Determine chart category for specialized visualization
  const chartCategory = useMemo(() => {
    return determineChartCategory(fileName || '', variable);
  }, [fileName, variable]);

  const categoryConfig = CHART_CATEGORIES[chartCategory];
  const selectedChart = activeView === 'primary' ? categoryConfig?.primaryChart : categoryConfig?.secondaryChart;
  const categoryColors = getCategoryColors(chartCategory);

  // Check if this is geographic data that should use maps
  const isGeographicData = chartCategory === 'originRegional' || chartCategory === 'originProvincial';
  const mapLevel = chartCategory === 'originProvincial' ? 'provincial' : 'regional';

  // Handle chart type toggle
  const handleChartTypeToggle = (type) => {
    setActiveView(type);
  };

  /**
   * ========== MAP RENDERER COMPONENT ==========
   */
  const DynamicMapRenderer = ({ data, variable, fileName, mapLevel, categoryConfig, chartCategory }) => {
    // Select appropriate GeoJSON data based on map level
    const geoJsonData = mapLevel === 'provincial' ? provincesGeoJson : regionsGeoJson;
    
    // Aggregate counts per region/province
    const counts = useMemo(() => {
      const counts = {};
      data.forEach(d => {
        const region = d[variable];
        if (region && region !== "" && region !== null) {
          const key = String(region).trim();
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      return counts;
    }, [data, variable]);

    // Calculate statistics for styling
    const maxValue = useMemo(() => {
      return Math.max(...Object.values(counts), 1);
    }, [counts]);

    // Style function for choropleth mapping
    const getFeatureStyle = (feature) => {
      const featureName = feature.properties.name || feature.properties.NAME || feature.properties.Region;
      const value = counts[featureName] || 0;
      
      // Calculate opacity based on value
      const opacity = value > 0 ? Math.min(0.3 + (value / maxValue) * 0.7, 1) : 0.1;
      
      // Color based on category
      let fillColor = '#e0e0e0'; // Default gray for no data
      if (value > 0) {
        if (chartCategory === 'originRegional' || chartCategory === 'originProvincial') {
          // Blue gradient for geographic data
          const intensity = value / maxValue;
          fillColor = `rgba(33, 150, 243, ${opacity})`;
        } else if (chartCategory === 'destination') {
          // Orange gradient for destination data
          const intensity = value / maxValue;
          fillColor = `rgba(255, 152, 0, ${opacity})`;
        } else {
          // Default blue gradient
          const intensity = value / maxValue;
          fillColor = `rgba(66, 135, 245, ${opacity})`;
        }
      }
      
      return {
        fillColor: fillColor,
        color: '#333',
        weight: 1,
        fillOpacity: opacity,
        dashArray: value === 0 ? '5, 5' : 'none'
      };
    };

    // Enhanced tooltip for each feature
    const onEachFeature = (feature, layer) => {
      const featureName = feature.properties.name || feature.properties.NAME || feature.properties.Region || 'Unknown';
      const value = counts[featureName] || 0;
      const percentage = ((value / data.length) * 100).toFixed(2);
      
      layer.bindTooltip(`
        <div style="font-family: Arial, sans-serif;">
          <strong>${featureName}</strong><br/>
          Count: ${value.toLocaleString()}<br/>
          Percentage: ${percentage}%<br/>
          ${value > 0 ? `Rank: #${Object.entries(counts).sort((a,b) => b[1] - a[1]).findIndex(([name]) => name === featureName) + 1}` : 'No data'}
        </div>
      `, {
        permanent: false,
        sticky: true,
        className: 'custom-tooltip'
      });
      
      // Add click event for detailed information
      layer.on({
        click: function(e) {
          const popupContent = `
            <div style="font-family: Arial, sans-serif; min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #333;">${featureName}</h3>
              <div style="margin: 5px 0;"><strong>Emigrants:</strong> ${value.toLocaleString()}</div>
              <div style="margin: 5px 0;"><strong>Percentage:</strong> ${percentage}%</div>
              <div style="margin: 5px 0;"><strong>Category:</strong> ${categoryConfig?.name || 'Geographic Data'}</div>
              ${value > 0 ? `<div style="margin: 5px 0;"><strong>National Rank:</strong> #${Object.entries(counts).sort((a,b) => b[1] - a[1]).findIndex(([name]) => name === featureName) + 1}</div>` : ''}
            </div>
          `;
          layer.bindPopup(popupContent).openPopup();
        },
        mouseover: function(e) {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: '#666',
            fillOpacity: 0.9
          });
        },
        mouseout: function(e) {
          const layer = e.target;
          layer.setStyle(getFeatureStyle(feature));
        }
      });
    };

    // Map center and zoom
    const getMapCenter = () => [12.8797, 121.7740]; // Philippines center
    const getMapZoom = () => mapLevel === 'provincial' ? 6 : 5;

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl p-8">
          <div className="text-center">
            <p className="text-gray-500 text-lg font-medium mb-2">🗺️ No Geographic Data Available</p>
            <p className="text-gray-400 text-sm">This map needs location data to display</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-6">
        {/* Map Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-blue-50 rounded-lg">
                <span className="text-blue-700 font-semibold text-base">
                  {mapLevel === 'provincial' ? 'Provincial' : 'Regional'} Map
                </span>
              </div>
              <div className="text-gray-600 text-base">
                <span className="font-medium">{Object.keys(counts).length}</span> locations
              </div>
            </div>
            {categoryConfig && (
              <div className="text-right">
                <h3 className="text-lg font-semibold text-gray-800">
                  {categoryConfig.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {categoryConfig.description}
                </p>
              </div>
            )}
          </div>
          
          {/* Map Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total Locations</div>
              <div className="text-lg font-semibold text-gray-800">{Object.keys(counts).length}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Highest Count</div>
              <div className="text-lg font-semibold text-gray-800">{maxValue.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total Records</div>
              <div className="text-lg font-semibold text-gray-800">{data.length.toLocaleString()}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Coverage</div>
              <div className="text-lg font-semibold text-gray-800">
                {((Object.keys(counts).filter(k => counts[k] > 0).length / Object.keys(counts).length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Map Container */}
        <div className="rounded-lg overflow-hidden border-2 border-gray-200">
          <MapContainer 
            center={getMapCenter()} 
            zoom={getMapZoom()} 
            style={{ height: "500px", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <GeoJSON 
              data={geoJsonData} 
              style={getFeatureStyle}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>
        
        {/* Map Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border border-gray-400"></div>
            <span>No Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 border border-gray-400"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 border border-gray-400"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-700 border border-gray-400"></div>
            <span>High</span>
          </div>
        </div>
      </div>
    );
  };

  // Render geographic data as map
  if (isGeographicData) {
    return (
      <div className={className}>
        <DynamicMapRenderer 
          data={data}
          variable={variable}
          fileName={fileName}
          mapLevel={mapLevel}
          categoryConfig={categoryConfig}
          chartCategory={chartCategory}
        />
      </div>
    );
  }

  const colType = types[variable];

  /**
   * ========== YEAR COLUMN DETECTION ==========
   * Finds the year column (case-insensitive)
   * Year column is used for time-series charts
   */
  const yearData = useMemo(() => {
    return getYearColumnData(data);
  }, [data]);

  const yearColumn = yearData?.yearColumn;
  const hasYearData = yearData?.hasYearData || false;

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
   * ========== SPECIALIZED DATA PREPARATION ==========
   * Prepares data for specific chart types based on category
   */
  const specializedData = useMemo(() => {
    if (!categoryConfig) return null;

    switch (selectedChart?.type) {
      case 'stackedArea':
      case 'stackedBar':
      case 'stackedBar100':
        // For stacked charts, prepare data with all category columns
        if (categoryConfig.dataColumns && yearColumn) {
          const yearGroups = {};
          
          data.forEach(row => {
            const year = row[yearColumn];
            if (year && !yearGroups[year]) {
              yearGroups[year] = { year };
              // Initialize all category columns
              categoryConfig.dataColumns.forEach(col => {
                yearGroups[year][col] = 0;
              });
            }
            
            if (yearGroups[year]) {
              // Add values to appropriate category
              categoryConfig.dataColumns.forEach(col => {
                if (row[col] !== null && row[col] !== undefined) {
                  const value = Number(row[col]) || 0;
                  yearGroups[year][col] += value;
                }
              });
            }
          });
          
          return Object.values(yearGroups).sort((a, b) => a.year - b.year);
        }
        break;
        
      case 'horizontalBarRanked':
        // For ranked horizontal bars, prepare top N data
        const counts = {};
        data.forEach(row => {
          const value = row[variable];
          if (value !== null && value !== undefined && value !== "") {
            const key = String(value).trim();
            counts[key] = (counts[key] || 0) + Number(row[yearColumn] || 1);
          }
        });
        
        return Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 15); // Top 15
        
      case 'groupedBar':
        // For grouped bars, prepare year-over-year comparison
        if (categoryConfig.dataColumns && yearColumn) {
          const result = [];
          categoryConfig.dataColumns.forEach(col => {
            const yearGroups = {};
            data.forEach(row => {
              const year = row[yearColumn];
              const value = row[col];
              if (year && value !== null && value !== undefined) {
                yearGroups[year] = (yearGroups[year] || 0) + Number(value);
              }
            });
            
            Object.entries(yearGroups).forEach(([year, total]) => {
              let existing = result.find(r => r.year === Number(year));
              if (!existing) {
                existing = { year: Number(year) };
                result.push(existing);
              }
              existing[col] = total;
            });
          });
          
          return result.sort((a, b) => a.year - b.year);
        }
        break;
        
      default:
        return null;
    }
    
    return null;
  }, [categoryConfig, selectedChart, data, yearColumn, variable]);

  /**
   * ========== CHART RENDERING ==========
   * Selects appropriate chart type based on category and type
   */
  const renderChart = () => {
    // Use specialized chart if category is recognized
    if (categoryConfig && selectedChart) {
      switch (selectedChart.type) {
        case 'stackedArea':
          return renderStackedAreaChart();
        case 'stackedBar':
          return renderStackedBarChart(false);
        case 'stackedBar100':
          return renderStackedBarChart(true);
        case 'horizontalBarRanked':
          return renderHorizontalBarChart();
        case 'groupedBar':
          return renderGroupedBarChart();
        case 'dualLine':
          return renderDualLineChart();
        case 'treemap':
          return renderTreemap();
      }
    }
    
    // Fallback to original logic
    switch (colType) {
        // Year columns → Bar chart showing year distribution

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

  /**
   * ========== SPECIALIZED CHART RENDERERS ==========
   */
  const renderStackedAreaChart = () => {
    if (!specializedData || !categoryConfig.dataColumns) return null;
    
    return (
      <ResponsiveContainer width="100%" height={450}>
        <AreaChart data={specializedData} margin={{ top: 20, right: 30, left: 30, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            label={{ 
              value: 'Year', 
              position: 'insideBottom', 
              offset: -10,
              style: { fontSize: '14px', fontWeight: '600' }
            }}
            tick={{ fontSize: 14 }}
          />
          <YAxis 
            label={{ 
              value: 'Count', 
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
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          {categoryConfig.dataColumns.map((col, index) => (
            <Area
              key={col}
              type="monotone"
              dataKey={col}
              stackId="1"
              stroke={categoryColors[index % categoryColors.length]}
              fill={categoryColors[index % categoryColors.length]}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderStackedBarChart = (is100Percent) => {
    if (!specializedData || !categoryConfig.dataColumns) return null;
    
    return (
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={specializedData} margin={{ top: 20, right: 30, left: 30, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            label={{ 
              value: 'Year', 
              position: 'insideBottom', 
              offset: -10,
              style: { fontSize: '14px', fontWeight: '600' }
            }}
            tick={{ fontSize: 14 }}
          />
          <YAxis 
            label={{ 
              value: is100Percent ? 'Percentage' : 'Count', 
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
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          {categoryConfig.dataColumns.map((col, index) => (
            <Bar
              key={col}
              dataKey={col}
              stackId="1"
              fill={categoryColors[index % categoryColors.length]}
              radius={is100Percent ? 0 : [8, 8, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderHorizontalBarChart = () => {
    if (!specializedData) return null;
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={specializedData} 
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            type="number"
            tick={{ fontSize: 14 }}
            label={{ value: 'Count', position: 'insideBottom', offset: -10, style: { fontSize: '14px', fontWeight: '600' } }}
          />
          <YAxis 
            type="category"
            dataKey="name" 
            tick={{ fontSize: 13 }}
            width={90}
          />
          <Tooltip 
            contentStyle={{ fontSize: '14px', padding: '12px', borderRadius: '8px' }}
          />
          <Bar 
            dataKey="value" 
            fill={categoryColors[0]} 
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderGroupedBarChart = () => {
    if (!specializedData || !categoryConfig.dataColumns) return null;
    
    return (
      <ResponsiveContainer width="100%" height={450}>
        <BarChart data={specializedData} margin={{ top: 20, right: 30, left: 30, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            label={{ 
              value: 'Year', 
              position: 'insideBottom', 
              offset: -10,
              style: { fontSize: '14px', fontWeight: '600' }
            }}
            tick={{ fontSize: 14 }}
          />
          <YAxis 
            label={{ 
              value: 'Count', 
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
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          {categoryConfig.dataColumns.map((col, index) => (
            <Bar
              key={col}
              dataKey={col}
              fill={categoryColors[index % categoryColors.length]}
              radius={[8, 8, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderDualLineChart = () => {
    if (!categoryConfig.dataColumns || !yearColumn) return null;
    
    // Prepare dual line data for male/female comparison
    const lineData = useMemo(() => {
      const yearGroups = {};
      
      data.forEach(row => {
        const year = row[yearColumn];
        if (year && !yearGroups[year]) {
          yearGroups[year] = { year };
        }
        
        if (yearGroups[year]) {
          categoryConfig.dataColumns.forEach(col => {
            const value = Number(row[col]) || 0;
            yearGroups[year][col] = (yearGroups[year][col] || 0) + value;
          });
        }
      });
      
      return Object.values(yearGroups).sort((a, b) => a.year - b.year);
    }, [data, yearColumn]);
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={lineData} margin={{ top: 20, right: 30, left: 30, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="year" 
            label={{ 
              value: 'Year', 
              position: 'insideBottom', 
              offset: -10,
              style: { fontSize: '14px', fontWeight: '600' }
            }}
            tick={{ fontSize: 14 }}
          />
          <YAxis 
            label={{ 
              value: 'Count', 
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
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          {categoryConfig.dataColumns.map((col, index) => (
            <Line
              key={col}
              type="monotone"
              dataKey={col}
              stroke={categoryColors[index % categoryColors.length]}
              strokeWidth={3}
              dot={{ fill: categoryColors[index % categoryColors.length], r: 6 }}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderTreemap = () => {
    if (!specializedData) return null;
    
    const treemapData = specializedData.slice(0, 10).map((item, index) => ({
      name: item.name,
      size: item.value,
      fill: categoryColors[index % categoryColors.length]
    }));
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4/3}
          stroke="#fff"
          fill="#8884d8"
          content={({ x, y, width, height, name, value, fill }) => (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                  fill,
                  stroke: '#fff',
                  strokeWidth: 2
                }}
              />
              {width > 50 && height > 30 && (
                <text
                  x={x + width / 2}
                  y={y + height / 2}
                  fill="#fff"
                  fontSize={14}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {name}
                </text>
              )}
              {width > 30 && height > 20 && (
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 15}
                  fill="#fff"
                  fontSize={12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {value.toLocaleString()}
                </text>
              )}
            </g>
          )}
        />
      </ResponsiveContainer>
    );
  };
  
  // Render chart data with optional toggle
  return (
    <div className="bg-white rounded-xl p-6">
      {/* ========== CHART HEADER INFO ========== */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-primary-50 rounded-lg">
            <span className="text-primary-700 font-semibold text-base capitalize">
              {categoryConfig?.name || `${colType} Data`}
            </span>
          </div>
          <div className="text-gray-600 text-base">
            <span className="font-medium">{data.length}</span> records
          </div>
        </div>
        {categoryConfig && (
          <div className="text-right">
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedChart?.title}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedChart?.description}
            </p>
          </div>
        )}
      </div>
      
      {/* ========== DATA STRUCTURE INFO ========== */}
      {categoryConfig && (
        <div className="mb-6 text-sm text-gray-700 bg-blue-50 p-5 rounded-xl border-l-4 border-blue-500">
          <div className="font-bold text-base mb-3 text-blue-900">📊 Chart Analysis:</div>
          <div className="space-y-2 text-gray-800">
            <div className="flex items-start gap-2">
              <span className="font-semibold">• Category:</span>
              <span>{categoryConfig.name} - {categoryConfig.description}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">• Visualization:</span>
              <span>{selectedChart?.title}</span>
            </div>
            {yearColumn && (
              <div className="flex items-start gap-2">
                <span className="font-semibold">• Time Range:</span>
                <span>{Math.min(...timeSeriesData.map(d => d.year))} - {Math.max(...timeSeriesData.map(d => d.year))}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="font-semibold">• Data Type:</span>
              <span>{colType}</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Type Toggle */}
      {showChartTypeToggle && categoryConfig && (
        <div className="mb-4 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => handleChartTypeToggle('primary')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'primary'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              📊 {categoryConfig.primaryChart?.title || 'Primary View'}
            </button>
            <button
              onClick={() => handleChartTypeToggle('secondary')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'secondary'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              📈 {categoryConfig.secondaryChart?.title || 'Secondary View'}
            </button>
          </div>
        </div>
      )}
      
      {/* Chart Component */}
      {renderChart()}
    </div>
  );
};

export default ChartRenderer;

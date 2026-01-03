import React, { useState, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import philippinesData from '../assets/philippines.json';
import { useEmigrants } from '../hooks/useEmigrants';

// Destination coordinates (simplified)
const DESTINATIONS = {
  USA: { coordinates: [-95, 37], name: "USA", color: "#ff7300" },
  Canada: { coordinates: [-106, 56], name: "Canada", color: "#387908" },
  Japan: { coordinates: [138, 36], name: "Japan", color: "#0088aa" },
  Australia: { coordinates: [133, -25], name: "Australia", color: "#aa0088" },
  UAE: { coordinates: [54, 24], name: "UAE", color: "#009688" },
  UK: { coordinates: [-3, 55], name: "UK", color: "#3f51b5" },
};

const GeographicFlow = () => {
  const { emigrantsData, loading } = useEmigrants();
  const [selectedYear, setSelectedYear] = useState(2020);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [flowData, setFlowData] = useState([]);

  // Process region data from Place_of_origin.csv
  const regionData = useMemo(() => {
    if (!emigrantsData.length) return [];
    
    // Extract region data - adjust based on your actual CSV structure
    return emigrantsData
      .filter(record => record.Year === selectedYear.toString())
      .map(record => ({
        region: record.Region || record['Region I - Ilocos Region'], // Adjust field name
        count: parseInt(record.emigrants || 0),
        coordinates: getRegionCoordinates(record.Region) // You'd need a mapping
      }))
      .filter(d => d.count > 0);
  }, [emigrantsData, selectedYear]);

  // Generate flow lines
  useEffect(() => {
    if (!regionData.length) return;
    
    const flows = regionData.slice(0, 5).map(region => {
      const destination = DESTINATIONS.USA; // For now, map all to USA
      return {
        from: region.coordinates || [122, 13], // Default PH coordinates
        to: destination.coordinates,
        value: region.count,
        color: destination.color
      };
    });
    
    setFlowData(flows);
  }, [regionData]);

  const colorScale = scaleLinear()
    .domain([0, Math.max(...regionData.map(d => d.count))])
    .range(["#e6f7ff", "#1890ff"]);

  if (loading) return <div>Loading geographic data...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Geographic Migration Flow</h2>
        <div className="flex gap-4">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border rounded px-3 py-1"
          >
            {Array.from({length: 40}, (_, i) => 1981 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <select 
            value={selectedRegion || ""}
            onChange={(e) => setSelectedRegion(e.target.value || null)}
            className="border rounded px-3 py-1"
          >
            <option value="">All Regions</option>
            {[...new Set(regionData.map(d => d.region))].map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="h-[500px] relative">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: [122, 13],
              scale: 1000
            }}
          >
            {/* World background */}
            <Geographies geography={philippinesData}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#EAEAEC"
                    stroke="#D6D6DA"
                  />
                ))
              }
            </Geographies>

            {/* Flow lines */}
            {flowData.map((flow, i) => (
              <Line
                key={i}
                from={flow.from}
                to={flow.to}
                stroke={flow.color}
                strokeWidth={Math.sqrt(flow.value) / 100}
                strokeOpacity={0.6}
              />
            ))}

            {/* Philippine regions as circles */}
            {regionData.map((region, i) => (
              <Marker key={i} coordinates={region.coordinates || [122, 13]}>
                <circle
                  r={Math.sqrt(region.count) / 50}
                  fill={colorScale(region.count)}
                  stroke="#fff"
                  strokeWidth={1}
                  onClick={() => setSelectedRegion(region.region)}
                  className="cursor-pointer"
                />
                <text
                  textAnchor="middle"
                  y={-Math.sqrt(region.count) / 40 - 10}
                  style={{ fontSize: '10px', fill: '#333' }}
                >
                  {region.region?.split(' - ')[1] || region.region}
                </text>
              </Marker>
            ))}

            {/* Destination markers */}
            {Object.values(DESTINATIONS).map((dest, i) => (
              <Marker key={i} coordinates={dest.coordinates}>
                <circle r={6} fill={dest.color} stroke="#fff" strokeWidth={2} />
                <text
                  textAnchor="middle"
                  y={-15}
                  style={{ fontSize: '12px', fill: dest.color, fontWeight: 'bold' }}
                >
                  {dest.name}
                </text>
              </Marker>
            ))}
          </ComposableMap>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Top Emigrant Regions ({selectedYear})</h4>
            <ul className="space-y-1">
              {regionData
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((region, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{region.region}</span>
                    <span className="font-medium">{region.count.toLocaleString()}</span>
                  </li>
                ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Destination Countries</h4>
            <ul className="space-y-1">
              {Object.values(DESTINATIONS).map((dest, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: dest.color }}
                  />
                  <span>{dest.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function - you'd need to map regions to coordinates
function getRegionCoordinates(regionName) {
  // This is a simplified mapping - you'd expand this based on your actual region data
  const regionCoords = {
    'Region I - Ilocos Region': [120.5, 17.5],
    'NCR': [121, 14.5],
    'Region III - Central Luzon': [120.5, 15.5],
    'Region VII - Central Visayas': [123.5, 10.5],
    // Add all regions...
  };
  return regionCoords[regionName] || [122, 13]; // Default PH center
}

export default GeographicFlow;
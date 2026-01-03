import React from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import 'leaflet/dist/leaflet.css';

// Import Philippines GeoJSON data
import philGeoJson from "../assets/philippines.json";

const DynamicMap = ({ data, variable }) => {
  // Aggregate counts per region
  const counts = {};
  data.forEach(d => {
    const region = d[variable];
    if (!counts[region]) counts[region] = 0;
    counts[region]++;
  });

  const style = (feature) => {
    const regionName = feature.properties.name || feature.properties.NAME_1 || feature.properties.region;
    const value = counts[regionName] || 0;
    const fill = value > 0 ? `rgba(66, 135, 245, ${Math.min(value/1000,1)})` : "#f0f0f0";
    return { fillColor: fill, color: "#333", weight: 1, fillOpacity: 0.7 };
  };

  const onEachFeature = (feature, layer) => {
    const regionName = feature.properties.name || feature.properties.NAME_1 || feature.properties.region || 'Unknown';
    const count = counts[regionName] || 0;
    layer.bindPopup(`<strong>${regionName}</strong><br/>Count: ${count}`);
  };

  // Check if GeoJSON data is available
  if (!philGeoJson || !philGeoJson.features || philGeoJson.features.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl p-8">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">🗺️ Map Data Not Available</p>
          <p className="text-gray-400 text-sm">Philippines GeoJSON data is missing or empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-gray-700 mb-2">
          🗺️ Geographic Distribution: {variable}
        </h4>
        <p className="text-sm text-gray-600">
          Showing regional distribution of {data.length} records
        </p>
      </div>
      <MapContainer 
        center={[12.8797, 121.7740]} 
        zoom={5} 
        style={{ height: "400px", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeoJSON 
          data={philGeoJson} 
          style={style} 
          onEachFeature={onEachFeature}
        />
      </MapContainer>
      
      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-400"></div>
          <span>No data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 border border-gray-400"></div>
          <span>Low activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 border border-gray-400"></div>
          <span>High activity</span>
        </div>
      </div>
    </div>
  );
};

export default DynamicMap;

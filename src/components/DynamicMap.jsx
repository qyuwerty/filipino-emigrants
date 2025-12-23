import React from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import 'leaflet/dist/leaflet.css';

const DynamicMap = ({ data, variable }) => {
  // Aggregate counts per region
  const counts = {};
  data.forEach(d => {
    const region = d[variable];
    if (!counts[region]) counts[region] = 0;
    counts[region]++;
  });

  const style = (feature) => {
    const regionName = feature.properties.name;
    const value = counts[regionName] || 0;
    const fill = value > 0 ? `rgba(66, 135, 245, ${Math.min(value/1000,1)})` : "#f0f0f0";
    return { fillColor: fill, color: "#333", weight: 1, fillOpacity: 0.7 };
  };

  return (
    <MapContainer center={[12.8797, 121.7740]} zoom={5} style={{ height: "400px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <GeoJSON data={philGeoJson} style={style} />
    </MapContainer>
  );
};

export default DynamicMap;

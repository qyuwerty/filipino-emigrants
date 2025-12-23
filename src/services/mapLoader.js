// src/services/mapLoader.js

/**
 * Dynamically import GeoJSON files from the philippines-json-maps repo
 * @param {string} type - 'regions', 'provinces', 'municipalities', 'country'
 * @param {string} resolution - 'lowres' (default), 'medres', 'hires'
 * @returns {Promise<object>} - Returns GeoJSON data
 */
export const loadGeoJson = async (type = "regions", resolution = "lowres") => {
  try {
    // Build the relative path
    const path = `../assets/philippines-json-maps/2023/geojson/${type}/${resolution}/`;
    
    // Vite requires static import, so we use import.meta.glob
    // This will find all JSON files in the folder
    const geoFiles = import.meta.glob(`${path}/*.json`);

    // Get the first file in the folder (usually the full dataset)
    const firstFileKey = Object.keys(geoFiles)[0];
    if (!firstFileKey) throw new Error("No GeoJSON file found in folder.");

    const geoModule = await geoFiles[firstFileKey]();
    return geoModule.default; // This is the GeoJSON content
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
    return null;
  }
};

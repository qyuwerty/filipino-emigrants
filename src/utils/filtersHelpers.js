//Extract filter logic
export const applyFilters = (data, filters) => {
  return data.filter((row) =>
    Object.entries(filters).every(([col, filterVal]) => {
      // ... filter logic extracted from App.jsx
    })
  );
};

export const isSpatialVariable = (variable) => {
  return SPATIAL_VARIABLES.some(spatial => 
    variable.toLowerCase().includes(spatial.toLowerCase())
  );
};
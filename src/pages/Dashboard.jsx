import useDynamicSchema from "../hooks/useDynamicSchema";
import Filters from "../components/Filters";

import { useState } from "react";

export default function Dashboard() {
  const { schema, data } = useDynamicSchema();
  const [filters, setFilters] = useState({});

  const filtered = data.filter(row => {
    return Object.keys(filters).every(key => {
      if (!filters[key]) return true; // no filter applied
      return String(row[key]).toLowerCase() === String(filters[key]).toLowerCase();
    });
  });

  return (
    <div>
      <Filters
        schema={schema}
        data={data}
        filters={filters}
        setFilters={setFilters}
      />

      {/* Render your table */}
      <YourDataTable data={filtered} />
    </div>
  );
}

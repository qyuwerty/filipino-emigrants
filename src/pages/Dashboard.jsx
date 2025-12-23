import useDynamicSchema from "../hooks/useDynamicSchema";

import { useState } from "react";

export default function Dashboard() {
  const { schema, data } = useDynamicSchema();

  return (
    <div>
      {/* Render your table */}
      <YourDataTable data={data} />
    </div>
  );
}

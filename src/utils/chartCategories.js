/**
 * ============================================
 * CHART CATEGORIZATION CONFIGURATION
 * ============================================
 * 
 * Defines visualization strategies for each data category
 * Maps data categories to their intended chart types
 * 
 * Structure:
 * - category: Data category identifier
 * - primaryChart: Main visualization type
 * - secondaryChart: Alternative visualization
 * - chartConfig: Specific configuration for each chart type
 */

export const CHART_CATEGORIES = {
  // 1. Age (Distribution and Comparison)
  age: {
    name: "Age Distribution",
    description: "Generational shifts and demographic patterns",
    primaryChart: {
      type: "stackedArea",
      title: "Age Distribution Over Time",
      description: "Shows generational shifts across years"
    },
    secondaryChart: {
      type: "populationPyramid", 
      title: "Population Pyramid Comparison",
      description: "Compares age distribution across years"
    },
    keywords: ["age", "14-below", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-above"],
    dataColumns: ["14 - Below", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-Above", "Not Reported"]
  },

  // 2. Sex (Comparison and Composition)
  sex: {
    name: "Gender Composition",
    description: "Gender distribution and trends",
    primaryChart: {
      type: "stackedBar100",
      title: "Gender Composition Evolution",
      description: "Shows percentage distribution of male vs female"
    },
    secondaryChart: {
      type: "dualLine",
      title: "Gender Trends Over Time", 
      description: "Compares male vs female trends"
    },
    keywords: ["sex", "male", "female"],
    dataColumns: ["MALE", "FEMALE"]
  },

  // 3. Civil Status (Composition and Distribution)
  civilStatus: {
    name: "Civil Status Distribution",
    description: "Family and labor migration patterns",
    primaryChart: {
      type: "stackedBar",
      title: "Civil Status Distribution",
      description: "Shows family vs labor migration patterns"
    },
    secondaryChart: {
      type: "pieWithTrend",
      title: "Civil Status Composition",
      description: "Breakdown by year with trends"
    },
    keywords: ["civil_status", "civil", "status", "single", "married", "widower", "separated", "divorced"],
    dataColumns: ["Single", "Married", "Widower", "Separated", "Divorced", "Not Reported"]
  },

  // 4. Educational Attainment (Composition and Comparison)
  education: {
    name: "Educational Attainment",
    description: "Education levels and comparison",
    primaryChart: {
      type: "groupedBar",
      title: "Education Levels Comparison",
      description: "Compares education levels across years"
    },
    secondaryChart: {
      type: "sankey",
      title: "Education to Occupation Flow",
      description: "Shows educational pathways"
    },
    keywords: ["education", "educational", "school", "elementary", "high school", "college", "vocational"],
    dataColumns: ["Not of Schooling Age", "No Formal Education", "Elementary Level", "Elementary Graduate", "High School Level", "High School Graduate", "Vocational Level", "Vocational Graduate", "College Level", "College Graduate", "Post Graduate Level", "Post Graduate", "Non-Formal Education", "Not Reported / No Response"]
  },

  // 5. Occupation (Ranking and Composition)
  occupation: {
    name: "Occupation Distribution",
    description: "Job categories and rankings",
    primaryChart: {
      type: "horizontalBarRanked",
      title: "Top Occupations",
      description: "Shows most common occupations"
    },
    secondaryChart: {
      type: "treemap",
      title: "Occupation Sector Composition",
      description: "Visualizes sector hierarchy"
    },
    keywords: ["occupation", "job", "work", "professional", "managerial", "clerical", "sales", "service"],
    dataColumns: ["Professional", "Managerial", "Clerical", "Sales", "Service", "Agriculture", "Production", "Armed Forces", "Housewives", "Retirees", "Students", "Minors", "Out of School Youth", "No Occupation Reported"]
  },

  // 6. Place of Origin - Regional (Geographic Representation)
  originRegional: {
    name: "Regional Origin",
    description: "Geographic distribution by region",
    primaryChart: {
      type: "choroplethMap",
      title: "Regional Hotspots",
      description: "Geographic visualization by region"
    },
    secondaryChart: {
      type: "horizontalBarRanked",
      title: "Top Regions",
      description: "Ranked comparison of regions"
    },
    keywords: ["place_of_origin", "origin", "region", "regional"],
    geoType: "regions",
    mapLevel: "regional"
  },

  // 7. Place of Origin - Provincial (Geographic Representation)
  originProvincial: {
    name: "Provincial Origin", 
    description: "Detailed geographic distribution",
    primaryChart: {
      type: "choroplethMap",
      title: "Provincial Disparities",
      description: "Interactive provincial map"
    },
    secondaryChart: {
      type: "heatmap",
      title: "Provincial Trends",
      description: "Provincial trends over time"
    },
    keywords: ["place_of_origin-province", "origin", "province", "provincial"],
    geoType: "provinces",
    mapLevel: "provincial"
  },

  // 8. Destination Country (Ranking and Composition)
  destination: {
    name: "International Destinations",
    description: "Country-specific migration patterns",
    primaryChart: {
      type: "horizontalBarRanked",
      title: "Top 10 Destination Countries",
      description: "International demand ranking"
    },
    secondaryChart: {
      type: "chordDiagram",
      title: "Bilateral Migration Flows",
      description: "Country-to-country migration patterns"
    },
    keywords: ["country", "destination", "major_countries", "all_countries"],
    dataColumns: ["USA", "CANADA", "JAPAN", "AUSTRALIA", "UNITED KINGDOM", "ITALY", "SPAIN", "NEWZEALAND", "SOUTHKOREA", "OTHERS"]
  }
};

/**
 * Chart type configurations
 */
export const CHART_TYPES = {
  stackedArea: {
    component: "AreaChart",
    props: {
      stackOffset: "expand",
      type: "monotone"
    }
  },
  populationPyramid: {
    component: "CustomPopulationPyramid",
    props: {}
  },
  stackedBar100: {
    component: "BarChart", 
    props: {
      stackOffset: "expand",
      layout: "horizontal"
    }
  },
  dualLine: {
    component: "LineChart",
    props: {
      syncId: "gender"
    }
  },
  stackedBar: {
    component: "BarChart",
    props: {
      stackOffset: "none"
    }
  },
  pieWithTrend: {
    component: "CustomPieWithTrend",
    props: {}
  },
  groupedBar: {
    component: "BarChart",
    props: {
      layout: "grouped"
    }
  },
  sankey: {
    component: "CustomSankey",
    props: {}
  },
  horizontalBarRanked: {
    component: "BarChart",
    props: {
      layout: "horizontal",
      dataKey: "value"
    }
  },
  treemap: {
    component: "Treemap",
    props: {}
  },
  choroplethMap: {
    component: "DynamicMap",
    props: {}
  },
  heatmap: {
    component: "CustomHeatmap",
    props: {}
  },
  chordDiagram: {
    component: "CustomChord",
    props: {}
  }
};

/**
 * Color palettes for different categories
 */
export const COLOR_PALETTES = {
  age: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'],
  sex: ['#3498db', '#e74c3c'],
  civilStatus: ['#9b59b6', '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#95a5a6'],
  education: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#34495e', '#f1c40f'],
  occupation: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'],
  geographic: ['#0066cc', '#0080ff', '#3399ff', '#66b3ff', '#99ccff', '#cce5ff'],
  destination: ['#c0392b', '#e74c3c', '#ec7063', '#f1948a', '#f5b7b1', '#fadbd8']
};

/**
 * Determines chart category based on filename or variable name
 */
export const determineChartCategory = (fileName, variableName) => {
  const searchTerms = (fileName + " " + variableName).toLowerCase();
  
  for (const [key, category] of Object.entries(CHART_CATEGORIES)) {
    if (category.keywords.some(keyword => 
      searchTerms.includes(keyword.toLowerCase())
    )) {
      return key;
    }
  }
  
  return "default";
};

/**
 * Gets appropriate color palette for a category
 */
export const getCategoryColors = (category, index = 0) => {
  return COLOR_PALETTES[category] || COLOR_PALETTES.age;
};

/**
 * Data Preparation Utilities for LSTM/MLP Time Series Forecasting
 */

const DEFAULT_PREP_OPTIONS = {
  yearKey: 'year',
  target: 'emigrants',
  features: ['population', 'emigrants'],
  dropInvalid: true,
  allowNegative: [],
  requiredFields: undefined,
  featureDefaults: undefined
};

const extractNumericCandidate = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return Number.NaN;
    }

    const normalized = trimmed.replace(/,/g, '').replace(/\s+/g, '');
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return Number.NaN;
    }
    const coerced = Number(match[0]);
    return Number.isFinite(coerced) ? coerced : Number.NaN;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : Number.NaN;
};

const parseInteger = (value) => {
  const numeric = extractNumericCandidate(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : Number.NaN;
};

const parseFloatNumber = (value) => {
  const numeric = extractNumericCandidate(value);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
};

const isNil = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim().length === 0) return true;
  return false;
};

/**
 * Clean and validate data based on the provided schema.
 * Returns rows ready for downstream processing together with validation issues.
 */
export function cleanData(data, options = {}) {
  const config = { ...DEFAULT_PREP_OPTIONS, ...options };
  const { yearKey, target, features, dropInvalid, allowNegative, requiredFields, featureDefaults } = config;

  const uniqueFields = Array.from(new Set([yearKey, target, ...features]))
    .filter((field) => typeof field === 'string' && field.length > 0);
  const allowNegativeSet = new Set(
    (allowNegative || []).filter((field) => typeof field === 'string' && field.length > 0)
  );
  const requiredFieldSet = new Set(
    (Array.isArray(requiredFields) && requiredFields.length > 0
      ? requiredFields
      : [yearKey, target]
    ).filter((field) => typeof field === 'string' && field.length > 0)
  );
  const defaultValueMap = featureDefaults && typeof featureDefaults === 'object'
    ? featureDefaults
    : {};

  const issues = [];
  const rows = [];

  data.forEach((row, rowIndex) => {
    const cleanedRow = { ...row };
    let rowValid = true;

    uniqueFields.forEach((field) => {
      const parser = field === yearKey ? parseInteger : parseFloatNumber;
      const rawValue = row?.[field];
      const isRequired = requiredFieldSet.has(field);

      if (isNil(rawValue)) {
        issues.push({ rowIndex, field, type: 'missing', severity: isRequired ? 'error' : 'warning' });
        if (isRequired) {
          rowValid = false;
          return;
        }
        const fallback = defaultValueMap[field] ?? 0;
        cleanedRow[field] = fallback;
        return;
      }

      const parsed = parser(rawValue);
      if (Number.isNaN(parsed)) {
        issues.push({ rowIndex, field, type: 'invalid', value: rawValue, severity: isRequired ? 'error' : 'warning' });
        if (isRequired) {
          rowValid = false;
          return;
        }
        const fallback = defaultValueMap[field] ?? 0;
        cleanedRow[field] = fallback;
        return;
      }

      if (!allowNegativeSet.has(field) && parsed < 0) {
        issues.push({ rowIndex, field, type: 'negative', value: parsed, severity: isRequired ? 'error' : 'warning' });
        if (isRequired) {
          rowValid = false;
          return;
        }
        const fallback = defaultValueMap[field] ?? 0;
        cleanedRow[field] = fallback;
        return;
      }

      cleanedRow[field] = parsed;
    });

    if (rowValid || !dropInvalid) {
      uniqueFields.forEach((field) => {
        if (typeof cleanedRow[field] !== 'number' || Number.isNaN(cleanedRow[field])) {
          cleanedRow[field] = 0;
        }
      });
      rows.push(cleanedRow);
    }
  });

  return {
    rows,
    issues,
    discardedCount: dropInvalid ? data.length - rows.length : 0,
    config
  };
}

/**
 * Sort data chronologically by year (or provided key).
 */
export function sortData(data, yearKey = 'year') {
  return [...data].sort((a, b) => (a[yearKey] ?? 0) - (b[yearKey] ?? 0));
}

/**
 * Min-Max Normalization: scales values to [0, 1] range.
 */
export function normalizeData(data, features = DEFAULT_PREP_OPTIONS.features) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No data provided for normalization.');
  }

  const mins = {};
  const maxs = {};

  features.forEach((feature) => {
    const values = data
      .map((row) => row?.[feature])
      .filter((value) => typeof value === 'number' && !Number.isNaN(value));

    if (values.length === 0) {
      throw new Error(`Feature "${feature}" does not contain numeric values.`);
    }

    mins[feature] = Math.min(...values);
    maxs[feature] = Math.max(...values);
  });

  const normalized = data.map((row) => {
    const normalizedRow = { ...row };
    features.forEach((feature) => {
      const range = maxs[feature] - mins[feature];
      normalizedRow[feature] = range === 0 ? 0 : (row[feature] - mins[feature]) / range;
    });
    return normalizedRow;
  });

  return { normalized, mins, maxs };
}

/**
 * Denormalize values back to original scale.
 */
export function denormalize(normalizedValue, min, max) {
  return normalizedValue * (max - min) + min;
}

/**
 * Create sequences using a sliding window approach.
 */
export function createSequences(data, lookback = 3, features = DEFAULT_PREP_OPTIONS.features, target = DEFAULT_PREP_OPTIONS.target) {
  if (!Array.isArray(data) || data.length <= lookback) {
    throw new Error(`Not enough data to create sequences. Require at least ${lookback + 1} rows, received ${data?.length ?? 0}.`);
  }

  const missingFeature = features.find((feature) => data.some((row) => typeof row[feature] !== 'number' || Number.isNaN(row[feature])));
  if (missingFeature) {
    throw new Error(`Feature "${missingFeature}" contains non-numeric values after preparation.`);
  }

  if (data.some((row) => typeof row[target] !== 'number' || Number.isNaN(row[target]))) {
    throw new Error(`Target "${target}" contains non-numeric values after preparation.`);
  }

  const X = [];
  const y = [];

  for (let i = lookback; i < data.length; i += 1) {
    const sequence = [];
    for (let j = i - lookback; j < i; j += 1) {
      const featureValues = features.map((f) => data[j][f]);
      sequence.push(featureValues);
    }
    X.push(sequence);
    y.push(data[i][target]);
  }

  return { X, y };
}

/**
 * Calculate performance metrics for regression forecasts.
 */
export function calculateMetrics(actual, predicted) {
  const n = actual.length;

  if (n === 0 || predicted.length !== n) {
    throw new Error('Unable to calculate metrics: mismatched or empty series.');
  }

  const mae = actual.reduce((sum, val, i) => sum + Math.abs(val - predicted[i]), 0) / n;
  const mse = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / n;
  const rmse = Math.sqrt(mse);

  const mape = actual.reduce((sum, val, i) => {
    return sum + (val !== 0 ? Math.abs((val - predicted[i]) / val) : 0);
  }, 0) / n * 100;

  const mean = actual.reduce((sum, val) => sum + val, 0) / n;
  const ssRes = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
  const ssTot = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  const r2 = 1 - (ssRes / ssTot);

  const accuracy = 100 - mape;

  return {
    mae: mae.toFixed(2),
    rmse: rmse.toFixed(2),
    mape: mape.toFixed(2),
    r2: r2.toFixed(4),
    accuracy: accuracy.toFixed(2)
  };
}

export const DEFAULT_PREPARATION_OPTIONS = DEFAULT_PREP_OPTIONS;
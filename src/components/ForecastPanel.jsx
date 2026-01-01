import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title } from 'chart.js';
import { Line as ChartLine } from 'react-chartjs-2';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import { cleanData, sortData, normalizeData, denormalize, createSequences, calculateMetrics, DEFAULT_PREPARATION_OPTIONS } from '../utils/dataPreparation';
import { buildLSTMModel, trainLSTMModel, predictLSTM, saveLSTMModel, loadLSTMModel, deleteLSTMModel, downloadLSTMModel } from '../models/lstmModel';
import { buildMLPModel, trainMLPModel, predictMLP, saveMLPModel, loadMLPModel, deleteMLPModel, downloadMLPModel } from '../models/mlpModel';
import './ForecastPanel.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

const CHART_COLORS = {
  actual: '#0ea5e9',
  fitted: '#f97316',
  forecast: '#10b981',
  loss: '#6366f1',
  mae: '#14b8a6',
  valLoss: '#f43f5e',
  valMae: '#facc15'
};

const TRAINING_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: {
      position: 'top'
    },
    title: {
      display: false
    }
  },
  scales: {
    y: {
      type: 'linear',
      position: 'left',
      title: {
        display: true,
        text: 'Loss'
      }
    },
    y1: {
      type: 'linear',
      position: 'right',
      grid: {
        drawOnChartArea: false
      },
      title: {
        display: true,
        text: 'MAE'
      }
    }
  }
};

const CIVIL_STATUS_CANONICAL = ['single', 'separated', 'married', 'widower', 'notreported', 'divorced'];

const canonicalizeCategory = (value) => {
  if (value === null || value === undefined) return undefined;
  return value.toString().trim().toLowerCase().replace(/[^a-z]+/g, '');
};

const CIVIL_STATUS_DISPLAY_ORDER = CIVIL_STATUS_CANONICAL.reduce((acc, key, index) => {
  acc[key] = index;
  return acc;
}, {});

const sortStatusColumns = (columns = []) => {
  return [...columns].sort((a, b) => {
    const aKey = canonicalizeCategory(a);
    const bKey = canonicalizeCategory(b);
    const aRank = CIVIL_STATUS_DISPLAY_ORDER[aKey] ?? Number.POSITIVE_INFINITY;
    const bRank = CIVIL_STATUS_DISPLAY_ORDER[bKey] ?? Number.POSITIVE_INFINITY;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    return a.localeCompare(b);
  });
};

const MODEL_VARIANTS = [
  {
    value: 'LSTM',
    title: 'LSTM',
    subtitle: 'Sequence memory network',
    blurb: 'Retains seasonal drift through gated recurrence.'
  },
  {
    value: 'MLP',
    title: 'MLP',
    subtitle: 'Dense perception stack',
    blurb: 'Fast feed-forward layers for tabular signals.'
  }
];

const MODEL_DETAILS = {
  LSTM: {
    description: 'A gated recurrent network tuned to balance long-term patterns with short-term fluctuations in emigration data.',
    highlights: [
      'Captures trend momentum and reversal across rolling windows',
      'Balances noise via forget / input gating mechanisms',
      'Ideal for datasets with strong temporal autocorrelation'
    ]
  },
  MLP: {
    description: 'A deep dense network that excels at learning nonlinear relationships between population drivers and emigrant counts.',
    highlights: [
      'Lightweight architecture for rapid experiments',
      'Shines on well-normalised, feature-rich tabular datasets',
      'Ideal when historical order is less critical than feature interplay'
    ]
  }
};

const clampLookback = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 3;
  }
  return Math.min(10, Math.max(2, Math.round(Number(value))));
};

const formatUnitsLabel = (units) => {
  if (!units) return '—';
  if (Array.isArray(units)) {
    return units.join(' → ');
  }
  return String(units);
};

const getDefaultHyperparameters = (modelType, lookback) => {
  const baseLookback = clampLookback(lookback ?? 3);
  if (modelType === 'MLP') {
    return {
      id: 'mlp-default',
      label: 'Default MLP',
      modelType: 'MLP',
      lookback: baseLookback,
      hiddenUnits: [64, 32],
      dropout: 0.2,
      activation: 'relu',
      learningRate: 0.001,
      epochs: 80,
      validationSplit: 0.2
    };
  }

  return {
    id: 'lstm-default',
    label: 'Default LSTM',
    modelType: 'LSTM',
    lookback: baseLookback,
    layerUnits: [60, 60],
    dropout: 0.1,
    learningRate: 0.001,
    epochs: 80,
    validationSplit: 0.2
  };
};

const buildHyperparameterGrid = (modelType, lookback) => {
  const base = clampLookback(lookback ?? 3);

  if (modelType === 'MLP') {
    return [
      {
        id: 'mlp-grid-1',
        label: 'Fast learner',
        modelType: 'MLP',
        lookback: base,
        hiddenUnits: [48, 24],
        dropout: 0.15,
        activation: 'relu',
        learningRate: 0.0015,
        epochs: 60,
        validationSplit: 0.2
      },
      {
        id: 'mlp-grid-2',
        label: 'Balanced depth',
        modelType: 'MLP',
        lookback: clampLookback(base + 1),
        hiddenUnits: [72, 36],
        dropout: 0.2,
        activation: 'relu',
        learningRate: 0.001,
        epochs: 80,
        validationSplit: 0.2
      },
      {
        id: 'mlp-grid-3',
        label: 'Regularised',
        modelType: 'MLP',
        lookback: base,
        hiddenUnits: [96, 48, 24],
        dropout: 0.25,
        activation: 'tanh',
        learningRate: 0.0008,
        epochs: 90,
        validationSplit: 0.25
      }
    ];
  }

  return [
    {
      id: 'lstm-grid-1',
      label: 'Short memory',
      modelType: 'LSTM',
      lookback: base,
      layerUnits: [64, 32],
      dropout: 0.1,
      learningRate: 0.0012,
      epochs: 70,
      validationSplit: 0.2
    },
    {
      id: 'lstm-grid-2',
      label: 'Deep sequence',
      modelType: 'LSTM',
      lookback: clampLookback(base + 1),
      layerUnits: [96, 64],
      dropout: 0.15,
      learningRate: 0.0008,
      epochs: 90,
      validationSplit: 0.25
    },
    {
      id: 'lstm-grid-3',
      label: 'Regularised memory',
      modelType: 'LSTM',
      lookback: base,
      layerUnits: [80, 40],
      dropout: 0.2,
      learningRate: 0.0006,
      epochs: 100,
      validationSplit: 0.2
    }
  ];
};

const summariseHyperparameters = (config) => {
  if (!config) return null;
  const pieces = [];
  if (config.lookback) {
    pieces.push(`${config.lookback} yr window`);
  }
  if (config.layerUnits) {
    pieces.push(`Units ${formatUnitsLabel(config.layerUnits)}`);
  }
  if (config.hiddenUnits) {
    pieces.push(`Units ${formatUnitsLabel(config.hiddenUnits)}`);
  }
  if (config.dropout !== undefined) {
    pieces.push(`Dropout ${Math.round(config.dropout * 100)}%`);
  }
  if (config.learningRate !== undefined) {
    pieces.push(`LR ${config.learningRate}`);
  }
  if (config.epochs) {
    pieces.push(`${config.epochs} epochs`);
  }
  return pieces.join(' • ');
};

export default function ForecastPanel({ data, onForecastUpdate }) {
  const [modelType, setModelType] = useState('LSTM');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [model, setModel] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [prepSummary, setPrepSummary] = useState(null);
  const [forecastYears, setForecastYears] = useState(5);
  const [forecasts, setForecasts] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [historicalSeries, setHistoricalSeries] = useState([]);
  const [fittedSeries, setFittedSeries] = useState([]);

  const [lookback, setLookback] = useState(3);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedHyperparams, setSelectedHyperparams] = useState(() => getDefaultHyperparameters('LSTM', 3));
  const [tuningGrid, setTuningGrid] = useState(() => buildHyperparameterGrid('LSTM', 3));
  const [tuningRuns, setTuningRuns] = useState({});
  const [isTuning, setIsTuning] = useState(false);
  const [bestRunId, setBestRunId] = useState(null);

  const updateTuningRuns = useCallback((run) => {
    if (!run?.id) {
      return;
    }

    setTuningRuns((prev) => {
      const next = { ...prev, [run.id]: run };
      const best = Object.values(next).reduce((currentBest, candidate) => {
        if (!candidate?.metrics) {
          return currentBest;
        }

        if (!currentBest) {
          return candidate;
        }

        const candidateAccuracy = Number(candidate.metrics.accuracy ?? 0);
        const bestAccuracy = Number(currentBest.metrics.accuracy ?? 0);

        if (candidateAccuracy > bestAccuracy) {
          return candidate;
        }

        if (candidateAccuracy === bestAccuracy) {
          const candidateMae = Number(candidate.metrics.mae ?? Number.POSITIVE_INFINITY);
          const bestMae = Number(currentBest.metrics.mae ?? Number.POSITIVE_INFINITY);
          if (candidateMae < bestMae) {
            return candidate;
          }
        }

        return currentBest;
      }, null);

      setBestRunId(best?.id ?? null);
      return next;
    });
  }, []);

  const modelDetail = useMemo(() => {
    return MODEL_DETAILS[modelType] ?? MODEL_DETAILS.LSTM;
  }, [modelType]);

  const adoptHyperparameters = useCallback((config, { syncLookback = true, refreshGrid = false } = {}) => {
    if (!config) {
      return;
    }

    const normalizedLookback = clampLookback(config.lookback ?? lookback);
    const normalized = {
      ...config,
      modelType: config.modelType ?? modelType,
      lookback: normalizedLookback
    };

    setSelectedHyperparams(normalized);

    if (syncLookback) {
      setLookback(normalizedLookback);
    }

    if (refreshGrid) {
      setTuningGrid(buildHyperparameterGrid(normalized.modelType, normalizedLookback));
    }
  }, [lookback, modelType]);

  const handleModelTypeChange = useCallback((nextType) => {
    if (!nextType || nextType === modelType) {
      return;
    }

    setModelType(nextType);
    adoptHyperparameters(getDefaultHyperparameters(nextType, lookback), { refreshGrid: true });
    setTuningRuns({});
    setIsTuning(false);
    setBestRunId(null);
    setModel(null);
    setMetadata(null);
    setMetrics(null);
    setForecasts(null);
    setTrainingHistory([]);
    setHistoricalSeries([]);
    setFittedSeries([]);
    setPrepSummary(null);
    setPrepIssues([]);
  }, [adoptHyperparameters, lookback, modelType]);
  const resolvedColumns = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        yearKey: DEFAULT_PREPARATION_OPTIONS.yearKey,
        statusColumns: CIVIL_STATUS_CANONICAL,
        numericCandidates: [],
        featureKeys: [],
        defaultTarget: DEFAULT_PREPARATION_OPTIONS.target
      };
    }

    const sample = data[0] ?? {};
    const columns = Object.keys(sample);
    const normalizedColumns = columns.map((key) => ({
      key,
      lower: key.toLowerCase(),
      normalized: key.toLowerCase().replace(/[\s_-]+/g, '')
    }));

    const findColumn = (aliases) => {
      if (!aliases?.length) return undefined;
      const normalizedAliases = aliases.map((alias) => ({
        lower: alias.toLowerCase(),
        normalized: alias.toLowerCase().replace(/[\s_-]+/g, '')
      }));

      for (const alias of normalizedAliases) {
        const exact = normalizedColumns.find((col) => col.lower === alias.lower);
        if (exact) return exact.key;
      }

      for (const alias of normalizedAliases) {
        const sanitizedMatch = normalizedColumns.find((col) => col.normalized === alias.normalized);
        if (sanitizedMatch) return sanitizedMatch.key;
      }

      for (const alias of normalizedAliases) {
        const partial = normalizedColumns.find((col) => col.lower.includes(alias.lower));
        if (partial) return partial.key;
      }

      return undefined;
    };

    const yearKey = findColumn(['year', 'year_recorded']);

    // Detect all numeric columns by sampling the data
    const numericCandidates = columns.filter((key) => {
      if (key === yearKey) return false;
      // Check if most values in this column are numeric
      const sampleSize = Math.min(10, data.length);
      const numericCount = data.slice(0, sampleSize).filter((row) => {
        const val = row[key];
        return val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
      }).length;
      // Require at least half the samples to be numeric
      return numericCount >= Math.ceil(sampleSize / 2);
    });

    const statusCandidates = columns.filter((key) => {
      if (key === yearKey) return false;
      const canonical = canonicalizeCategory(key);
      if (!canonical || canonical.length === 0) return false;
      return CIVIL_STATUS_CANONICAL.includes(canonical);
    });

    const orderedStatusColumns = sortStatusColumns(statusCandidates);

    // Use numeric candidates for target/features, prioritize status columns if available
    const allCandidates = orderedStatusColumns.length > 0 ? orderedStatusColumns : numericCandidates;
    const defaultTarget = allCandidates[0] ?? DEFAULT_PREPARATION_OPTIONS.target;
    const featureKeys = allCandidates.length > 0 ? allCandidates : [defaultTarget];

    return {
      yearKey: yearKey ?? DEFAULT_PREPARATION_OPTIONS.yearKey,
      statusColumns: orderedStatusColumns,
      numericCandidates,
      featureKeys,
      defaultTarget
    };
  }, [data]);

  useEffect(() => {
    if (!metadata) {
      return;
    }

    if (Array.isArray(metadata.trainingHistory)) {
      setTrainingHistory(metadata.trainingHistory);
    }

    if (Array.isArray(metadata.historicalSeries)) {
      setHistoricalSeries(metadata.historicalSeries);
    }

    if (Array.isArray(metadata.fittedSeries)) {
      setFittedSeries(metadata.fittedSeries);
    }
  }, [metadata]);

  const preparationOptions = useMemo(() => {
    const yearKey = resolvedColumns.yearKey ?? DEFAULT_PREPARATION_OPTIONS.yearKey;
    const targetKey = selectedTarget ?? resolvedColumns.defaultTarget ?? DEFAULT_PREPARATION_OPTIONS.target;
    
    // Use selected features, or fall back to detected feature keys, or just the target
    const featureList = selectedFeatures?.length > 0 
      ? selectedFeatures 
      : (resolvedColumns.featureKeys?.length > 0 ? resolvedColumns.featureKeys : [targetKey]);
    
    // Build feature defaults for all features
    const featureDefaults = {};
    featureList.forEach((f) => { featureDefaults[f] = 0; });

    return {
      ...DEFAULT_PREPARATION_OPTIONS,
      yearKey,
      target: targetKey,
      features: featureList,
      requiredFields: [yearKey, ...featureList],
      featureDefaults,
      dropInvalid: true,
      allowNegative: []
    };
  }, [resolvedColumns, selectedTarget, selectedFeatures]);

  const FEATURES = preparationOptions.features ?? [];
  const TARGET = preparationOptions.target;
  const YEAR_KEY = preparationOptions.yearKey;
  const categoryColumn = null;

  const createTrainingDataset = useCallback((lookbackValue) => {
    const normalizedLookback = clampLookback(lookbackValue ?? lookback);
    const workingData = data;

    const { rows: cleanedRows, issues, discardedCount } = cleanData(workingData, preparationOptions);
    setPrepIssues(issues);
    if (issues.length) {
      console.warn('Forecast preparation issues detected:', issues);
    }

    if (cleanedRows.length <= normalizedLookback) {
      throw new Error('Not enough valid rows after cleaning to train the model.');
    }

    const sortedData = sortData(cleanedRows, YEAR_KEY);
    const aggregatedSeries = sortedData.map((row) => ({
      year: row[YEAR_KEY],
      value: row[TARGET]
    }));

    const { normalized, mins, maxs } = normalizeData(sortedData, FEATURES);
    const { X, y } = createSequences(normalized, normalizedLookback, FEATURES, TARGET);

    return {
      normalizedLookback,
      workingData,
      issues,
      discardedCount,
      sortedData,
      aggregatedSeries,
      mins,
      maxs,
      X,
      y
    };
  }, [FEATURES, TARGET, YEAR_KEY, data, lookback, preparationOptions]);

  const conductTraining = useCallback(async (config, { onEpoch } = {}) => {
    const baseConfig = config ?? getDefaultHyperparameters(modelType, lookback);
    const normalizedConfig = {
      ...baseConfig,
      modelType: baseConfig.modelType ?? modelType,
      lookback: clampLookback(baseConfig.lookback ?? lookback),
      epochs: baseConfig.epochs ?? 100,
      validationSplit: baseConfig.validationSplit ?? 0.2
    };

    const dataset = createTrainingDataset(normalizedConfig.lookback);
    const {
      normalizedLookback,
      workingData,
      issues,
      discardedCount,
      aggregatedSeries,
      sortedData,
      mins,
      maxs,
      X,
      y
    } = dataset;

    const featureCount = FEATURES.length;
    const buildOptions = normalizedConfig.modelType === 'LSTM'
      ? {
          layerUnits: normalizedConfig.layerUnits,
          dropout: normalizedConfig.dropout,
          learningRate: normalizedConfig.learningRate
        }
      : {
          hiddenUnits: normalizedConfig.hiddenUnits,
          dropout: normalizedConfig.dropout,
          activation: normalizedConfig.activation,
          learningRate: normalizedConfig.learningRate
        };

    const newModel = normalizedConfig.modelType === 'LSTM'
      ? buildLSTMModel(normalizedLookback, featureCount, buildOptions)
      : buildMLPModel(normalizedLookback, featureCount, buildOptions);

    const trainFn = normalizedConfig.modelType === 'LSTM' ? trainLSTMModel : trainMLPModel;
    const predictFn = normalizedConfig.modelType === 'LSTM' ? predictLSTM : predictMLP;

    const epochLogs = [];
    const epochHandler = (epoch, logs) => {
      const entry = {
        epoch: epoch + 1,
        loss: typeof logs.loss === 'number' ? logs.loss : Number.parseFloat(logs.loss ?? 'NaN'),
        mae: typeof logs.mae === 'number' ? logs.mae : Number.parseFloat(logs.mae ?? 'NaN'),
        val_loss: typeof logs.val_loss === 'number' ? logs.val_loss : logs.val_loss != null ? Number.parseFloat(logs.val_loss) : undefined,
        val_mae: typeof logs.val_mae === 'number' ? logs.val_mae : logs.val_mae != null ? Number.parseFloat(logs.val_mae) : undefined
      };
      epochLogs.push(entry);
      if (onEpoch) {
        onEpoch({
          epoch: entry.epoch,
          totalEpochs: normalizedConfig.epochs,
          logs: entry,
          config: normalizedConfig
        });
      }
    };

    await trainFn(newModel, X, y, epochHandler, normalizedConfig.epochs, normalizedConfig.validationSplit);

    const normalizedPredictions = await predictFn(newModel, X);
    const predictions = normalizedPredictions.map((pred) => denormalize(pred, mins[TARGET], maxs[TARGET]));
    const actualValues = y.map((val) => denormalize(val, mins[TARGET], maxs[TARGET]));

    const trainingYears = sortedData.slice(normalizedLookback).map((row) => row[YEAR_KEY]);
    const trainingSeries = trainingYears.map((year, index) => ({
      year,
      actual: actualValues[index],
      fitted: predictions[index]
    }));

    const metricsResult = calculateMetrics(actualValues, predictions);

    return {
      config: normalizedConfig,
      model: newModel,
      epochLogs,
      metrics: metricsResult,
      aggregatedSeries,
      trainingSeries,
      mins,
      maxs,
      sortedData,
      issues,
      discardedCount,
      workingData
    };
  }, [FEATURES.length, TARGET, YEAR_KEY, createTrainingDataset, lookback, modelType]);

  const humanize = (text) => {
    if (!text) return '';
    return text
      .toString()
      .replace(/[\s_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };
  const [prepIssues, setPrepIssues] = useState([]);
  const formattedTarget = humanize(TARGET);
  const formattedFeatures = FEATURES.map(humanize).join(', ') || formattedTarget;
  const activeCategoryLabel = selectedCategory ? humanize(selectedCategory) : null;
  const defaultPrepInfo = metadata?.preparation
    ? {
        issueCount: metadata.preparation.issueCount ?? 0,
        discardedCount: metadata.preparation.discardedCount ?? 0,
        totalRows: metadata.preparation.totalRows
      }
    : null;
  const activePrepSummary = prepSummary ?? defaultPrepInfo;
  const metricsSnapshot = useMemo(() => {
    if (metrics) {
      return metrics;
    }
    if (metadata?.metrics) {
      return metadata.metrics;
    }
    return null;
  }, [metrics, metadata]);

  const lastTrainedAt = useMemo(() => {
    const timestamp = metadata?.trainedAt;
    if (!timestamp) {
      return null;
    }

    try {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Unable to format trainedAt timestamp:', error);
      return null;
    }
  }, [metadata]);

  const summaryItems = metadata
    ? [
        { label: 'Last trained', value: lastTrainedAt ?? '—' },
        { label: 'Lookback window', value: `${metadata.lookback} years` },
        { label: 'Latest baseline year', value: metadata.lastYear ?? '—' },
        {
          label: 'Status column',
          value: humanize(metadata.target || TARGET)
        },
        activePrepSummary && {
          label: 'Validation',
          value: `${activePrepSummary.discardedCount ?? 0} dropped / ${activePrepSummary.issueCount ?? 0} issues`
        }
      ].filter(Boolean)
    : [];

  const parseYearValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const trainingHistoryChart = useMemo(() => {
    if (!trainingHistory?.length) {
      return null;
    }

    const labels = trainingHistory.map((entry) => entry.epoch);
    const datasets = [
      {
        label: 'Loss',
        data: trainingHistory.map((entry) => entry.loss ?? null),
        borderColor: CHART_COLORS.loss,
        backgroundColor: 'rgba(99, 102, 241, 0.28)',
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y'
      },
      {
        label: 'MAE',
        data: trainingHistory.map((entry) => entry.mae ?? null),
        borderColor: CHART_COLORS.mae,
        backgroundColor: 'rgba(20, 184, 166, 0.22)',
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y1'
      }
    ];

    const hasValLoss = trainingHistory.some((entry) => typeof entry.val_loss === 'number');
    if (hasValLoss) {
      datasets.push({
        label: 'Validation loss',
        data: trainingHistory.map((entry) => entry.val_loss ?? null),
        borderColor: CHART_COLORS.valLoss,
        backgroundColor: 'rgba(244, 63, 94, 0.24)',
        borderDash: [6, 6],
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y'
      });
    }

    const hasValMae = trainingHistory.some((entry) => typeof entry.val_mae === 'number');
    if (hasValMae) {
      datasets.push({
        label: 'Validation MAE',
        data: trainingHistory.map((entry) => entry.val_mae ?? null),
        borderColor: CHART_COLORS.valMae,
        backgroundColor: 'rgba(250, 204, 21, 0.24)',
        borderDash: [4, 6],
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y1'
      });
    }

    return { labels, datasets };
  }, [trainingHistory]);

  const statusTimelineData = useMemo(() => {
    if (!historicalSeries?.length) {
      return null;
    }

    const targetKey = metadata?.target || TARGET;
    const yearMap = new Map();
    const ensureYearEntry = (sourceYear) => {
      const yearNum = parseYearValue(sourceYear);
      if (yearNum === null) {
        return null;
      }
      if (!yearMap.has(yearNum)) {
        yearMap.set(yearNum, { year: yearNum.toString() });
      }
      return yearMap.get(yearNum);
    };

    historicalSeries.forEach((entry) => {
      const bucket = ensureYearEntry(entry.year);
      if (!bucket) return;
      const numeric = typeof entry.value === 'number' ? entry.value : Number(entry.value);
      if (Number.isFinite(numeric)) {
        bucket.historical = numeric;
      }
    });

    fittedSeries.forEach((entry) => {
      const bucket = ensureYearEntry(entry.year);
      if (!bucket) return;
      const actualValue = typeof entry.actual === 'number' ? entry.actual : Number(entry.actual);
      const fittedValue = typeof entry.fitted === 'number' ? entry.fitted : Number(entry.fitted);
      if (Number.isFinite(actualValue)) {
        bucket.actual = actualValue;
      }
      if (Number.isFinite(fittedValue)) {
        bucket.fitted = fittedValue;
      }
    });

    if (Array.isArray(forecasts)) {
      forecasts.forEach((entry) => {
        const bucket = ensureYearEntry(entry.year);
        if (!bucket) return;
        const rawValue = entry[targetKey];
        const numeric = typeof rawValue === 'number' ? rawValue : Number(rawValue);
        if (Number.isFinite(numeric)) {
          bucket.forecast = numeric;
        }
      });
    }

    return Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);
  }, [historicalSeries, fittedSeries, forecasts, metadata, TARGET]);

  const handleForecastYearsChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      setForecastYears(1);
      return;
    }

    const clamped = Math.min(10, Math.max(1, nextValue));
    setForecastYears(clamped);
  };

  const handleLookbackChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isNaN(nextValue)) {
      return;
    }

    const clamped = Math.min(10, Math.max(2, nextValue));
    setLookback(clamped);
  };

  const handleTrain = async () => {
    setIsTraining(true);
    setTrainingProgress({ epoch: 0, loss: 0, mae: 0 });
    setMetrics(null);
    setTrainingHistory([]);
    setHistoricalSeries([]);
    setFittedSeries([]);

    try {
      if (!YEAR_KEY || !TARGET) {
        throw new Error('Unable to identify required columns (year or emigrants) in the dataset. Please verify the uploaded data.');
      }

      if (FEATURES.length === 0) {
        throw new Error('No feature columns detected for training. Please ensure the dataset contains relevant numeric fields.');
      }

      const result = await conductTraining(selectedHyperparams, {
        onEpoch: ({ epoch, totalEpochs, logs }) => {
          setTrainingHistory((prev) => [...prev, logs]);
          setTrainingProgress({
            epoch,
            loss: logs.loss?.toFixed(6) ?? '—',
            mae: logs.mae?.toFixed(6) ?? '—',
            val_loss: logs.val_loss?.toFixed(6) ?? undefined,
            val_mae: logs.val_mae?.toFixed(6) ?? undefined,
            totalEpochs
          });
        }
      });

      const calculatedMetrics = result.metrics;
      const newMetadata = {
        modelType: result.config.modelType,
        lookback: result.config.lookback,
        features: FEATURES,
        target: TARGET,
        mins: result.mins,
        maxs: result.maxs,
        lastYear: result.sortedData[result.sortedData.length - 1][YEAR_KEY],
        lastData: result.sortedData.slice(-result.config.lookback),
        metrics: calculatedMetrics,
        trainedAt: new Date().toISOString(),
        preparation: {
          ...preparationOptions,
          issueCount: result.issues.length,
          discardedCount: result.discardedCount,
          totalRows: result.workingData.length
        },
        historicalSeries: result.aggregatedSeries,
        fittedSeries: result.trainingSeries,
        trainingHistory: result.epochLogs,
        hyperparameters: result.config
      };

      const saveFn = result.config.modelType === 'LSTM' ? saveLSTMModel : saveMLPModel;
      await saveFn(result.model, newMetadata);

      setModel(result.model);
      setMetadata(newMetadata);
      setPrepSummary({ issueCount: result.issues.length, discardedCount: result.discardedCount, totalRows: result.workingData.length });
      setHistoricalSeries(result.aggregatedSeries);
      setFittedSeries(result.trainingSeries);
      setMetrics(calculatedMetrics);
      setTrainingHistory(result.epochLogs);
      setLookback(result.config.lookback);
      setSelectedHyperparams(result.config);
      const runId = result.config.id ?? `adhoc-${Date.now()}`;
      updateTuningRuns({ id: runId, config: result.config, metrics: calculatedMetrics, trainedAt: new Date().toISOString(), metadata: newMetadata });

      alert(`${result.config.modelType} model trained successfully!\nMAE: ${calculatedMetrics.mae}\nAccuracy: ${calculatedMetrics.accuracy}%`);
    } catch (error) {
      console.error('Training error:', error);
      alert('Error training model: ' + error.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handleLoadModel = async () => {
    try {
      const loadFn = modelType === 'LSTM' ? loadLSTMModel : loadMLPModel;
      const result = await loadFn();

      if (result) {
        setModel(result.model);
        setMetadata(result.metadata);
        setMetrics(result.metadata.metrics);
        setTrainingHistory(result.metadata.trainingHistory ?? []);
        setHistoricalSeries(result.metadata.historicalSeries ?? []);
        setFittedSeries(result.metadata.fittedSeries ?? []);
        if (result.metadata.preparation) {
          const { issueCount = 0, discardedCount = 0, totalRows } = result.metadata.preparation;
          setPrepSummary({ issueCount, discardedCount, totalRows });
        } else {
          setPrepSummary(null);
        }
        alert(`${modelType} model loaded successfully!`);
      } else {
        alert('No saved model found. Please train a model first.');
      }
    } catch (error) {
      console.error('Error loading model:', error);
      alert('Error loading model: ' + error.message);
    }
  };

  const handleDeleteModel = async () => {
    if (!confirm('Are you sure you want to delete the saved model?')) return;

    try {
      const deleteFn = modelType === 'LSTM' ? deleteLSTMModel : deleteMLPModel;
      await deleteFn();
      setModel(null);
      setMetadata(null);
      setMetrics(null);
      setForecasts(null);
      setPrepSummary(null);
      setTrainingHistory([]);
      setHistoricalSeries([]);
      setFittedSeries([]);
      alert('Model deleted successfully!');
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Error deleting model: ' + error.message);
    }
  };

  const handleDownloadModel = async () => {
    if (!model || !metadata) {
      alert('No model to download. Please train a model first.');
      return;
    }

    try {
      const downloadFn = modelType === 'LSTM' ? downloadLSTMModel : downloadMLPModel;
      await downloadFn(model, metadata);
      alert('Model files downloaded!');
    } catch (error) {
      console.error('Error downloading model:', error);
      alert('Error downloading model: ' + error.message);
    }
  };

  const handleForecast = async () => {
    if (!model || !metadata) {
      alert('Please train or load a model first.');
      return;
    }

    try {
      const { mins, maxs, lastData } = metadata;
      const activeFeatures = metadata.features || FEATURES;
      const activeTarget = metadata.target || TARGET;
      let currentSequence = lastData.map((row) => ({ ...row }));

      const predictions = [];
      let currentYear = metadata.lastYear;

      for (let i = 0; i < forecastYears; i++) {
        // Normalize current sequence
        const normalizedSequence = currentSequence.map((row) => {
          const normalizedRow = {};
          activeFeatures.forEach((feature) => {
            const range = maxs[feature] - mins[feature];
            normalizedRow[feature] = range === 0 ? 0 : (row[feature] - mins[feature]) / range;
          });
          return normalizedRow;
        });

        // Prepare input
        const input = [normalizedSequence.map((row) => activeFeatures.map((f) => row[f]))];

        // Predict
        const predictFn = modelType === 'LSTM' ? predictLSTM : predictMLP;
        const normalizedPred = await predictFn(model, input);

        // Denormalize
        const predictedEmigrants = denormalize(normalizedPred[0], mins[activeTarget], maxs[activeTarget]);

        // Estimate population growth (simple linear trend)
        const hasPopulation = activeFeatures.includes('population');
        const windowLength = currentSequence.length;
        let nextPopulation = currentSequence[windowLength - 1]?.population;
        if (hasPopulation) {
          const firstPopulation = currentSequence[0]?.population ?? 0;
          const lastPopulation = currentSequence[windowLength - 1]?.population ?? 0;
          const popGrowth = lastPopulation - firstPopulation;
          const avgGrowthRate = windowLength > 1 ? popGrowth / (windowLength - 1) : 0;
          nextPopulation = lastPopulation + avgGrowthRate;
        }

        currentYear++;
        const predictionRow = {
          year: currentYear.toString(),
          [activeTarget]: Math.round(predictedEmigrants),
          isForecast: true
        };

        if (metadata?.categorySelection?.column && metadata.categorySelection.value) {
          predictionRow[metadata.categorySelection.column] = metadata.categorySelection.value;
        }

        if (hasPopulation && Number.isFinite(nextPopulation)) {
          predictionRow.population = parseFloat(nextPopulation.toFixed(2));
        }

        predictions.push(predictionRow);

        // Update sequence (sliding window)
        const nextSequenceRow = {
          year: currentYear,
          [activeTarget]: predictedEmigrants
        };

        activeFeatures.forEach((feature) => {
          if (feature === activeTarget) {
            nextSequenceRow[feature] = predictedEmigrants;
            return;
          }

          if (feature === 'population' && hasPopulation) {
            nextSequenceRow.population = Number.isFinite(nextPopulation) ? nextPopulation : currentSequence[currentSequence.length - 1]?.population ?? 0;
            return;
          }

          nextSequenceRow[feature] = currentSequence[currentSequence.length - 1]?.[feature] ?? 0;
        });

        currentSequence = [...currentSequence.slice(1), nextSequenceRow];
      }

      setForecasts(predictions);
      onForecastUpdate(predictions);
      alert(`Generated ${forecastYears} year forecast!`);
    } catch (error) {
      console.error('Forecasting error:', error);
      alert('Error generating forecast: ' + error.message);
    }
  };

  return (
    <div className="forecast-panel">
      <header className="forecast-panel__header">
        <div className="forecast-panel__meta">
          <div>
            <span className="forecast-panel__meta-label">Lookback</span>
            <span className="forecast-panel__meta-value">{lookback} years</span>
          </div>
          <p className="forecast-panel__subtitle">
            Select a neural architecture, tune against historic records, then generate multi-year projections with confidence metrics.
          </p>
        </div>

        {prepIssues.length > 0 && (
          <div className="forecast-panel__alert forecast-panel__alert--warning">
            <h4>Validation warnings</h4>
            <ul>
              {prepIssues.slice(0, 5).map((issue, index) => (
                <li key={`${issue.field}-${index}`}>
                  <strong>{humanize(issue.field)}:</strong> {issue.type} (row {issue.rowIndex + 1})
                </li>
              ))}
            </ul>
            {prepIssues.length > 5 && (
              <p className="forecast-panel__alert-footnote">+ {prepIssues.length - 5} more issues. Consider correcting source data.</p>
            )}
          </div>
        )}

        <span className={`model-chip model-chip--${modelType.toLowerCase()}`}>{modelType}</span>
      </header>

      <section className="model-variant-grid">
        {MODEL_VARIANTS.map((variant) => {
          const isActive = variant.value === modelType;
          return (
            <button
              key={variant.value}
              type="button"
              className={`model-variant ${isActive ? 'model-variant--active' : ''}`}
              onClick={() => setModelType(variant.value)}
              disabled={isTraining}
            >
              <span className="model-variant__label">{variant.subtitle}</span>
              <span className="model-variant__title">{variant.title}</span>
              <span className="model-variant__blurb">{variant.blurb}</span>
            </button>
          );
        })}
      </section>

      <section className="model-data-config">
        <header className="section-block__header">
          <h3>Data configuration</h3>
          <p>Select which column to predict and which numeric fields to feed into the model.</p>
        </header>

        <div className="model-data-config__grid">
          {categoryColumn && (resolvedColumns.categoryOptions ?? []).length > 0 && (
            <label>
              <span>{humanize(categoryColumn)}</span>
              <select
                value={selectedCategory ?? ''}
                onChange={(event) => setSelectedCategory(event.target.value || null)}
                disabled={isTraining}
              >
                {(resolvedColumns.categoryOptions ?? []).map((option) => (
                  <option key={option} value={option}>
                    {humanize(option)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>Target column</span>
            <select
              value={selectedTarget || ''}
              onChange={(event) => setSelectedTarget(event.target.value || resolvedColumns.defaultTarget)}
              disabled={isTraining}
            >
              {(resolvedColumns.numericCandidates ?? []).map((candidate) => (
                <option key={candidate} value={candidate}>
                  {humanize(candidate)}
                </option>
              ))}
            </select>
          </label>

          <fieldset disabled={isTraining}>
            <legend>Feature columns</legend>
            <div className="model-data-config__features">
              {(resolvedColumns.numericCandidates ?? []).map((candidate) => {
                const isTarget = candidate === (selectedTarget ?? resolvedColumns.defaultTarget);
                const checked = !isTarget && (selectedFeatures ?? []).includes(candidate);
                return (
                  <label key={candidate} className={isTarget ? 'disabled' : ''}>
                    <input
                      type="checkbox"
                      value={candidate}
                      checked={checked}
                      disabled={isTarget}
                      onChange={(event) => {
                        const { checked: isChecked, value } = event.target;
                        setSelectedFeatures((prev) => {
                          const base = prev ?? resolvedColumns.featureKeys ?? [];
                          const next = new Set(base);
                          if (isChecked) {
                            next.add(value);
                          } else {
                            next.delete(value);
                          }
                          const cleaned = Array.from(next).filter((item) => item !== selectedTarget);
                          if (cleaned.length === 0) {
                            const fallback = (resolvedColumns.featureKeys ?? []).filter((item) => item !== selectedTarget);
                            return fallback.length > 0 ? fallback : cleaned;
                          }
                          return cleaned;
                        });
                      }}
                    />
                    {humanize(candidate)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="model-detail">
        <header className="model-detail__header">
          <h3 className="model-detail__title">Why {modelType}?</h3>
          <p className="model-detail__description">{modelDetail.description}</p>
        </header>
        <ul className="model-detail__highlights">
          {modelDetail.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      </section>

      <section className="model-summary">
        <header className="section-block__header">
          <h3>Model context</h3>
          <span className="model-summary__badge">Status → {formattedTarget}</span>
        </header>
        {summaryItems.length > 0 ? (
          <dl className="model-summary__grid">
            {summaryItems.map((item) => (
              <div key={item.label} className="model-summary__item">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="model-summary__empty">
            Train or load a model to see timestamps, baselines, and configuration notes.
          </p>
        )}
      </section>

      <section className="model-actions">
        <div className="model-actions__primary">
          <button onClick={handleTrain} disabled={isTraining} className="model-actions__train">
            {isTraining ? 'Training…' : 'Train model'}
          </button>
          <button onClick={handleForecast} disabled={!model || isTraining} className="model-actions__forecast">
            Generate forecast
          </button>
        </div>
        <div className="model-actions__secondary">
          <button onClick={handleLoadModel} disabled={isTraining}>
            Load saved model
          </button>
          <button onClick={handleDownloadModel} disabled={isTraining || !model}>
            Download artifacts
          </button>
          <button onClick={handleDeleteModel} disabled={isTraining || !model} className="danger">
            Delete model
          </button>
        </div>
      </section>

      {isTraining && trainingProgress && (
        <div className="training-progress">
          <header className="training-progress__header">
            <h3>Training in progress</h3>
            <span className="training-progress__epoch">Epoch {trainingProgress.epoch} / 100</span>
          </header>
          <dl className="training-progress__grid">
            <div>
              <dt>Loss</dt>
              <dd>{trainingProgress.loss}</dd>
            </div>
            <div>
              <dt>MAE</dt>
              <dd>{trainingProgress.mae}</dd>
            </div>
            {trainingProgress.val_loss && (
              <>
                <div>
                  <dt>Val loss</dt>
                  <dd>{trainingProgress.val_loss}</dd>
                </div>
                <div>
                  <dt>Val MAE</dt>
                  <dd>{trainingProgress.val_mae}</dd>
                </div>
              </>
            )}
          </dl>
          <p className="training-progress__note">
            Hang tight—training may take a minute depending on dataset size.
          </p>
        </div>
      )}

      {metricsSnapshot && !isTraining && (
        <section className="metrics">
          <header className="metrics__header">
            <div>
              <span className="metrics__eyebrow">Evaluation</span>
              <h3 className="metrics__title">Performance snapshot</h3>
            </div>
            {lastTrainedAt && <span className="metrics__timestamp">Trained {lastTrainedAt}</span>}
          </header>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">MAE</span>
              <span className="metric-value">{metricsSnapshot.mae}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">RMSE</span>
              <span className="metric-value">{metricsSnapshot.rmse}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">MAPE</span>
              <span className="metric-value">{metricsSnapshot.mape}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">R²</span>
              <span className="metric-value">{metricsSnapshot.r2}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Accuracy</span>
              <span className="metric-value">{metricsSnapshot.accuracy}%</span>
            </div>
          </div>
        </section>
      )}

      {trainingHistoryChart && trainingHistoryChart.labels.length > 1 && (
        <section className="chart-card">
          <header className="chart-card__header">
            <span className="chart-card__eyebrow">Diagnostics</span>
            <h3 className="chart-card__title">Training history</h3>
            <p className="chart-card__description">
              Loss and MAE trends per epoch. A very low loss across all epochs can hint that the model is effectively memorising the training window rather than generalising.
            </p>
          </header>
          <div className="chart-card__body">
            <ChartLine data={trainingHistoryChart} options={TRAINING_CHART_OPTIONS} />
          </div>
        </section>
      )}

      {statusTimelineData && statusTimelineData.length > 0 && (
        <section className="chart-card">
          <header className="chart-card__header">
            <span className="chart-card__eyebrow">Time series evidence</span>
            <h3 className="chart-card__title">{activeCategoryLabel || formattedTarget} totals by year</h3>
            <p className="chart-card__description">
              Historical totals are aggregated by calendar year. Training fit overlays the in-window reconstruction, and the dashed green line extends into the forecast horizon.
            </p>
          </header>
          <div className="chart-card__body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statusTimelineData} margin={{ top: 12, right: 18, left: 8, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.1)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(15, 23, 42, 0.18)' }}
                />
                <YAxis
                  tickFormatter={(value) => Number(value).toLocaleString()}
                  width={96}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(15, 23, 42, 0.18)' }}
                />
                <RechartsTooltip
                  formatter={(value, name) => [Number(value).toLocaleString(), name]}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <RechartsLegend />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke={CHART_COLORS.actual}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1, stroke: '#0ea5e9', fill: '#fff' }}
                  name={`Historical ${activeCategoryLabel || formattedTarget}`}
                  connectNulls
                  isAnimationActive={false}
                />
                {fittedSeries.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="fitted"
                    stroke={CHART_COLORS.fitted}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    name="Model fit"
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {Array.isArray(forecasts) && forecasts.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke={CHART_COLORS.forecast}
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    dot={{ r: 4, strokeWidth: 1, stroke: '#10b981', fill: '#fff' }}
                    name="Forecast"
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="forecast-config" aria-disabled={!model || isTraining}>
        <header className="forecast-config__header">
          <h3>Forecast horizon</h3>
          <p className="forecast-config__hint">Predict up to ten years ahead using the active model.</p>
        </header>
        <div className="forecast-config__controls">
          <label htmlFor="forecast-years">Years to forecast</label>
          <input
            id="forecast-years"
            type="number"
            min="1"
            max="10"
            value={forecastYears}
            onChange={handleForecastYearsChange}
            disabled={!model || isTraining}
          />
        </div>
        <div className="forecast-config__controls">
          <label htmlFor="lookback-window">Lookback window</label>
          <input
            id="lookback-window"
            type="number"
            min="2"
            max="10"
            value={lookback}
            onChange={handleLookbackChange}
            disabled={isTraining}
          />
        </div>
      </section>

      {forecasts && (
        <section className="forecast-results">
          <header className="forecast-results__header">
            <div>
              <span className="forecast-results__eyebrow">Projection</span>
              <h3 className="forecast-results__title">{forecastYears}-year outlook</h3>
            </div>
            <button type="button" className="forecast-results__download" onClick={handleDownloadModel} disabled={!model}>
              Download model files
            </button>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Predicted {humanize(metadata?.target || TARGET)}</th>
                  {(metadata?.features || FEATURES).includes('population') && (
                    <th>Estimated population (M)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {forecasts.map((forecast) => (
                  <tr key={forecast.year}>
                    <td>{forecast.year}</td>
                    <td>{Number(forecast[metadata?.target || TARGET] ?? 0).toLocaleString()}</td>
                    {(metadata?.features || FEATURES).includes('population') && (
                      <td>{Number.isFinite(forecast.population) ? forecast.population.toFixed(2) : '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="forecast-notes">
        <h4>Training profile</h4>
        <ul>
          <li>Lookback window: {lookback} years</li>
          <li>Input features: {formattedFeatures}</li>
          <li>Target: {formattedTarget} (next year)</li>
          <li>Normalization: Min–Max scaling to [0, 1]</li>
          <li>Epoch budget: 100</li>
          <li>Validation split: 20%</li>
        </ul>
      </footer>
    </div>
  );
}

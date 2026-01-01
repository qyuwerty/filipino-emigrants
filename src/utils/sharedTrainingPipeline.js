/**
 * Shared Training Pipeline for LSTM and MLP Models
 * Provides common data preparation, training wrapper, and error handling
 * Used by both LSTM and MLP forecasting components
 */

import { cleanData, sortData, normalizeData, denormalize, createSequences, calculateMetrics, DEFAULT_PREPARATION_OPTIONS } from './dataPreparation';

/**
 * Common training configuration for both models
 */
export const SHARED_TRAINING_CONFIG = {
  epochs: 100,
  validationSplit: 0.2,
  batchSize: 32,
  onEpochEnd: null // Will be set by individual components
};

/**
 * Prepare data for training - shared by both LSTM and MLP
 * @param {Array} data - Raw input data
 * @param {Object} preparationConfig - Data preparation options
 * @param {number} lookback - Lookback window size
 * @param {Array} features - Feature columns
 * @param {string} target - Target column
 * @returns {Object} Prepared data and metadata
 */
export function prepareTrainingData(data, preparationConfig, lookback, features, target) {
  try {
    // Clean and validate data
    const { rows: cleanedRows, issues, discardedCount } = cleanData(data, preparationConfig);

    if (issues.length) {
      console.warn('Data preparation issues detected:', issues);
    }

    if (cleanedRows.length <= lookback) {
      throw new Error(`Not enough valid rows after cleaning. Need at least ${lookback + 1}, got ${cleanedRows.length}.`);
    }

    // Sort chronologically
    const sortedData = sortData(cleanedRows, preparationConfig.yearKey);

    // Normalize data
    const { normalized, mins, maxs } = normalizeData(sortedData, features);

    // Create sequences
    const { X, y } = createSequences(normalized, lookback, features, target);

    return {
      X,
      y,
      normalizedData: normalized,
      sortedData,
      mins,
      maxs,
      preparationSummary: {
        totalRows: data.length,
        cleanedRows: cleanedRows.length,
        discardedCount,
        issueCount: issues.length,
        issues
      }
    };
  } catch (error) {
    console.error('Data preparation failed:', error);
    throw new Error(`Data preparation failed: ${error.message}`);
  }
}

/**
 * Common training wrapper for both LSTM and MLP models
 * @param {Object} model - The model to train (LSTM or MLP)
 * @param {Object} trainingData - Prepared training data
 * @param {Function} trainFunction - Model-specific training function
 * @param {Function} predictFunction - Model-specific prediction function
 * @param {Function} onProgress - Progress callback
 * @param {Object} config - Training configuration
 * @returns {Object} Training results
 */
export async function trainModel(model, trainingData, trainFunction, predictFunction, onProgress, config = {}) {
  const { X, y, sortedData, mins, maxs, preparationSummary } = trainingData;
  const trainingConfig = { ...SHARED_TRAINING_CONFIG, ...config };

  try {
    // Set up progress tracking
    const onEpochEnd = (epoch, logs) => {
      const progress = {
        epoch: epoch + 1,
        totalEpochs: trainingConfig.epochs,
        loss: logs.loss?.toFixed(6) || '0',
        mae: logs.mae?.toFixed(6) || '0',
        val_loss: logs.val_loss?.toFixed(6),
        val_mae: logs.val_mae?.toFixed(6)
      };
      
      if (onProgress) {
        onProgress(progress);
      }
    };

    // Train the model
    const history = await trainFunction(
      model,
      X,
      y,
      onEpochEnd,
      trainingConfig.epochs,
      trainingConfig.validationSplit
    );

    // Generate predictions for validation
    const normalizedPredictions = await predictFunction(model, X);
    const predictions = normalizedPredictions.map(pred =>
      denormalize(pred, mins[trainingData.target || 'emigrants'], maxs[trainingData.target || 'emigrants'])
    );

    const actualValues = y.map(val =>
      denormalize(val, mins[trainingData.target || 'emigrants'], maxs[trainingData.target || 'emigrants'])
    );

    // Calculate metrics
    const metrics = calculateMetrics(actualValues, predictions);

    // Create validation results (20% split for testing)
    const trainSize = Math.floor(actualValues.length * 0.8);
    const validationResults = actualValues.slice(trainSize).map((actual, index) => ({
      year: sortedData[trainSize + index + trainingData.lookback].year,
      actual: Math.round(actual),
      predicted: Math.round(predictions[trainSize + index]),
      error: Math.round(predictions[trainSize + index] - actual)
    }));

    return {
      model,
      metrics,
      validationResults,
      trainingHistory: history,
      preparationSummary,
      normalizedPredictions,
      actualValues
    };
  } catch (error) {
    console.error('Model training failed:', error);
    throw new Error(`Model training failed: ${error.message}`);
  }
}

/**
 * Generate forecasts using trained model
 * @param {Object} model - Trained model
 * @param {Object} metadata - Model metadata
 * @param {number} forecastYears - Number of years to forecast
 * @param {Function} predictFunction - Model-specific prediction function
 * @param {number} lookback - Lookback window size
 * @param {Array} features - Feature columns
 * @param {string} target - Target column
 * @returns {Array} Forecast results
 */
export function generateForecast(model, metadata, forecastYears, predictFunction, lookback, features, target) {
  try {
    const { mins, maxs, lastData } = metadata;
    let currentSequence = lastData.map(row => {
      const sequenceRow = { year: row.year };
      features.forEach(feature => {
        sequenceRow[feature] = row[feature] || 0;
      });
      return sequenceRow;
    });

    const predictions = [];
    let currentYear = metadata.lastYear;

    for (let i = 0; i < forecastYears; i++) {
      // Normalize current sequence
      const normalized = currentSequence.map(row => {
        const normalizedRow = {};
        features.forEach(feature => {
          const range = maxs[feature] - mins[feature];
          normalizedRow[feature] = range === 0 ? 0 : (row[feature] - mins[feature]) / range;
        });
        return normalizedRow;
      });

      // Create input for prediction
      const input = [normalized.map(row => features.map(f => row[f]))];
      
      // Make prediction
      const normalizedPred = predictFunction(model, input);
      const predictedValue = denormalize(normalizedPred[0], mins[target], maxs[target]);

      currentYear++;
      predictions.push({
        year: currentYear.toString(),
        [target]: Math.round(predictedValue),
        isForecast: true
      });

      // Update sequence for next iteration
      const newRow = { year: currentYear };
      features.forEach(feature => {
        newRow[feature] = feature === target ? predictedValue : currentSequence[currentSequence.length - 1][feature];
      });

      currentSequence = [...currentSequence.slice(1), newRow];
    }

    return predictions;
  } catch (error) {
    console.error('Forecast generation failed:', error);
    throw new Error(`Forecast generation failed: ${error.message}`);
  }
}

/**
 * Create model metadata
 * @param {string} modelType - Model type ('LSTM' or 'MLP')
 * @param {Object} config - Model configuration
 * @param {Object} trainingData - Training data information
 * @param {Object} metrics - Performance metrics
 * @param {Object} preparationSummary - Data preparation summary
 * @returns {Object} Model metadata
 */
export function createModelMetadata(modelType, config, trainingData, metrics, preparationSummary) {
  return {
    modelType,
    lookback: config.lookback,
    features: config.features,
    target: config.target,
    mins: trainingData.mins,
    maxs: trainingData.maxs,
    lastYear: trainingData.sortedData[trainingData.sortedData.length - 1].year,
    lastData: trainingData.sortedData.slice(-config.lookback),
    metrics,
    trainedAt: new Date().toISOString(),
    preparation: {
      ...config.preparation,
      issueCount: preparationSummary.issueCount,
      discardedCount: preparationSummary.discardedCount,
      totalRows: preparationSummary.totalRows
    },
    hyperparameters: {
      epochs: config.epochs || SHARED_TRAINING_CONFIG.epochs,
      validationSplit: config.validationSplit || SHARED_TRAINING_CONFIG.validationSplit,
      ...config.hyperparameters
    }
  };
}

/**
 * Standardized error handling for model operations
 * @param {Error} error - The error to handle
 * @param {string} operation - Operation context (e.g., 'training', 'prediction')
 * @returns {string} User-friendly error message
 */
export function handleModelError(error, operation) {
  console.error(`${operation} error:`, error);
  
  if (error.message.includes('not enough valid rows')) {
    return `Insufficient data for ${operation}. Please check your data quality and ensure you have enough historical records.`;
  }
  
  if (error.message.includes('Feature') && error.message.includes('non-numeric')) {
    return `Data quality issue: ${error.message}. Please clean your data before training.`;
  }
  
  if (error.message.includes('memory') || error.message.includes('allocation')) {
    return `Memory issue during ${operation}. Try reducing the lookback window or dataset size.`;
  }
  
  return `Error during ${operation}: ${error.message}`;
}

/**
 * Validate model configuration
 * @param {Object} config - Model configuration
 * @returns {boolean} True if valid, throws error if invalid
 */
export function validateModelConfig(config) {
  if (!config.lookback || config.lookback < 1 || config.lookback > 20) {
    throw new Error('Lookback window must be between 1 and 20 years.');
  }
  
  if (!config.features || !Array.isArray(config.features) || config.features.length === 0) {
    throw new Error('At least one feature must be specified.');
  }
  
  if (!config.target || typeof config.target !== 'string') {
    throw new Error('Target column must be specified.');
  }
  
  return true;
}

export default {
  prepareTrainingData,
  trainModel,
  generateForecast,
  createModelMetadata,
  handleModelError,
  validateModelConfig,
  SHARED_TRAINING_CONFIG
};

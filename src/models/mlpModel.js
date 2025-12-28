import * as tf from '@tensorflow/tfjs';

/**
 * Build MLP (Multi-Layer Perceptron) Model for Time Series Forecasting
 * Architecture:
 * - Input: Flattened sequence [lookback * features]
 * - Dense Layer 1: 64 units, ReLU activation, dropout 0.2
 * - Dense Layer 2: 32 units, ReLU activation, dropout 0.2
 * - Dense Output: 1 unit (emigrants prediction)
 * - Loss: MSE (Mean Squared Error)
 * - Optimizer: Adam (lr=0.001)
 * - Metrics: MAE (Mean Absolute Error)
 */
export function buildMLPModel(lookback = 10, features = 2) {
  const model = tf.sequential();

  const inputSize = lookback * features;

  // First Dense layer
  model.add(tf.layers.dense({
    units: 59,
    activation: 'tanh',
    inputShape: [inputSize]
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Second Dense layer
  model.add(tf.layers.dense({
    units: 59,
    activation: 'tanh'
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Output layer
  model.add(tf.layers.dense({
    units: 1
  }));

  // Compile model
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  return model;
}

/**
 * Flatten sequences for MLP input
 * MLP expects 2D input: [samples, features]
 * We flatten the 3D sequences to 2D
 */
function flattenSequences(X) {
  return X.map(seq => seq.flat());
}

/**
 * Train MLP Model
 * @param {tf.Sequential} model - The MLP model
 * @param {Array} X - Input sequences (will be flattened)
 * @param {Array} y - Target values
 * @param {Function} onEpochEnd - Callback for epoch progress
 * @param {number} epochs - Number of training epochs (default: 100)
 * @param {number} validationSplit - Validation split ratio (default: 0.2)
 */
export async function trainMLPModel(model, X, y, onEpochEnd, epochs = 100, validationSplit = 0.2) {
  // Flatten sequences for MLP
  const flatX = flattenSequences(X);

  // Convert to tensors
  const xs = tf.tensor2d(flatX);
  const ys = tf.tensor2d(y, [y.length, 1]);

  // Determine batch size
  const batchSize = Math.min(32, X.length);

  // Train model
  const history = await model.fit(xs, ys, {
    epochs,
    batchSize,
    validationSplit,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (onEpochEnd && epoch % 20 === 0) {
          onEpochEnd(epoch, logs);
        }
      }
    }
  });

  // Cleanup tensors
  xs.dispose();
  ys.dispose();

  return history;
}

/**
 * Make predictions using MLP model
 */
export async function predictMLP(model, X) {
  const flatX = flattenSequences(X);
  const xs = tf.tensor2d(flatX);
  const predictions = model.predict(xs);
  const result = await predictions.array();

  xs.dispose();
  predictions.dispose();

  return result.map(r => r[0]);
}

/**
 * Save MLP model to IndexedDB
 */
export async function saveMLPModel(model, metadata) {
  await model.save('indexeddb://emigrants-mlp-model');
  localStorage.setItem('mlp-metadata', JSON.stringify(metadata));
}

/**
 * Load MLP model from IndexedDB
 */
export async function loadMLPModel() {
  try {
    const model = await tf.loadLayersModel('indexeddb://emigrants-mlp-model');
    const metadata = JSON.parse(localStorage.getItem('mlp-metadata'));
    return { model, metadata };
  } catch (error) {
    console.error('Error loading MLP model:', error);
    return null;
  }
}

/**
 * Delete MLP model from IndexedDB
 */
export async function deleteMLPModel() {
  try {
    await tf.io.removeModel('indexeddb://emigrants-mlp-model');
    localStorage.removeItem('mlp-metadata');
    return true;
  } catch (error) {
    console.error('Error deleting MLP model:', error);
    return false;
  }
}

/**
 * Download MLP model files
 */
export async function downloadMLPModel(model, metadata) {
  // Save model to downloads
  await model.save('downloads://emigrants-mlp-model');

  // Download metadata
  const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(metadataBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mlp-metadata.json';
  a.click();
  URL.revokeObjectURL(url);
}
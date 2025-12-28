import { useState } from 'react';
import { cleanData, sortData, normalizeData, denormalize, createSequences, calculateMetrics } from '../utils/dataPreparation';
import { buildLSTMModel, trainLSTMModel, predictLSTM, saveLSTMModel, loadLSTMModel, deleteLSTMModel, downloadLSTMModel } from '../models/lstmModel';
import { buildMLPModel, trainMLPModel, predictMLP, saveMLPModel, loadMLPModel, deleteMLPModel, downloadMLPModel } from '../models/mlpModel';
import './ForecastPanel.css';

export default function ForecastPanel({ data, onForecastUpdate }) {
  const [modelType, setModelType] = useState('LSTM');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [model, setModel] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [forecastYears, setForecastYears] = useState(5);
  const [forecasts, setForecasts] = useState(null);

  const LOOKBACK = 3;
  const FEATURES = ['population', 'emigrants'];
  const TARGET = 'emigrants';

  const handleTrain = async () => {
    setIsTraining(true);
    setTrainingProgress({ epoch: 0, loss: 0, mae: 0 });
    setMetrics(null);

    try {
      // 1. Data Preparation
      let cleanedData = cleanData(data);
      cleanedData = sortData(cleanedData);

      // 2. Normalization
      const { normalized, mins, maxs } = normalizeData(cleanedData, FEATURES);

      // 3. Create sequences
      const { X, y } = createSequences(normalized, LOOKBACK, FEATURES, TARGET);

      // 4. Build model
      const newModel = modelType === 'LSTM'
        ? buildLSTMModel(LOOKBACK, FEATURES.length)
        : buildMLPModel(LOOKBACK, FEATURES.length);

      // 5. Train model
      const onEpochEnd = (epoch, logs) => {
        setTrainingProgress({
          epoch: epoch + 1,
          loss: logs.loss.toFixed(6),
          mae: logs.mae.toFixed(6),
          val_loss: logs.val_loss?.toFixed(6),
          val_mae: logs.val_mae?.toFixed(6)
        });
      };

      const trainFn = modelType === 'LSTM' ? trainLSTMModel : trainMLPModel;
      await trainFn(newModel, X, y, onEpochEnd, 100, 0.2);

      // 6. Make predictions on training data
      const predictFn = modelType === 'LSTM' ? predictLSTM : predictMLP;
      const normalizedPredictions = await predictFn(newModel, X);

      // 7. Denormalize predictions
      const predictions = normalizedPredictions.map(pred =>
        denormalize(pred, mins[TARGET], maxs[TARGET])
      );

      const actualValues = y.map(val =>
        denormalize(val, mins[TARGET], maxs[TARGET])
      );

      // 8. Calculate metrics
      const calculatedMetrics = calculateMetrics(actualValues, predictions);
      setMetrics(calculatedMetrics);

      // 9. Save metadata
      const newMetadata = {
        modelType,
        lookback: LOOKBACK,
        features: FEATURES,
        target: TARGET,
        mins,
        maxs,
        lastYear: cleanedData[cleanedData.length - 1].year,
        lastData: cleanedData.slice(-LOOKBACK),
        metrics: calculatedMetrics,
        trainedAt: new Date().toISOString()
      };

      // 10. Save model
      const saveFn = modelType === 'LSTM' ? saveLSTMModel : saveMLPModel;
      await saveFn(newModel, newMetadata);

      setModel(newModel);
      setMetadata(newMetadata);

      alert(`${modelType} model trained successfully!\nMAE: ${calculatedMetrics.mae}\nAccuracy: ${calculatedMetrics.accuracy}%`);
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
      let currentSequence = lastData.map(row => ({
        year: row.year,
        population: row.population,
        emigrants: row.emigrants
      }));

      const predictions = [];
      let currentYear = metadata.lastYear;

      for (let i = 0; i < forecastYears; i++) {
        // Normalize current sequence
        const normalized = currentSequence.map(row => ({
          population: (row.population - mins.population) / (maxs.population - mins.population),
          emigrants: (row.emigrants - mins.emigrants) / (maxs.emigrants - mins.emigrants)
        }));

        // Prepare input
        const input = [normalized.map(row => FEATURES.map(f => row[f]))];

        // Predict
        const predictFn = modelType === 'LSTM' ? predictLSTM : predictMLP;
        const normalizedPred = await predictFn(model, input);

        // Denormalize
        const predictedEmigrants = denormalize(normalizedPred[0], mins[TARGET], maxs[TARGET]);

        // Estimate population growth (simple linear trend)
        const popGrowth = currentSequence[LOOKBACK - 1].population - currentSequence[0].population;
        const avgGrowthRate = popGrowth / (LOOKBACK - 1);
        const nextPopulation = currentSequence[LOOKBACK - 1].population + avgGrowthRate;

        currentYear++;
        predictions.push({
          year: currentYear.toString(),
          emigrants: Math.round(predictedEmigrants),
          population: parseFloat(nextPopulation.toFixed(2)),
          isForecast: true
        });

        // Update sequence (sliding window)
        currentSequence = [
          ...currentSequence.slice(1),
          {
            year: currentYear,
            population: nextPopulation,
            emigrants: predictedEmigrants
          }
        ];
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
      <h2>Emigrant Forecasting ({modelType})</h2>

      <div className="model-selector">
        <label>
          <input
            type="radio"
            value="LSTM"
            checked={modelType === 'LSTM'}
            onChange={(e) => setModelType(e.target.value)}
            disabled={isTraining}
          />
          LSTM (Long Short-Term Memory)
        </label>
        <label>
          <input
            type="radio"
            value="MLP"
            checked={modelType === 'MLP'}
            onChange={(e) => setModelType(e.target.value)}
            disabled={isTraining}
          />
          MLP (Multi-Layer Perceptron)
        </label>
      </div>

      <div className="control-buttons">
        <button onClick={handleTrain} disabled={isTraining}>
          {isTraining ? 'Training...' : 'Train Model'}
        </button>
        <button onClick={handleLoadModel} disabled={isTraining}>
          Load Model
        </button>
        <button onClick={handleDeleteModel} disabled={isTraining || !model}>
          Delete Model
        </button>
        <button onClick={handleDownloadModel} disabled={isTraining || !model}>
          Download Model
        </button>
      </div>

      {isTraining && trainingProgress && (
        <div className="training-progress">
          <h3>Training Progress</h3>
          <p>Epoch: {trainingProgress.epoch} / 100</p>
          <p>Loss: {trainingProgress.loss}</p>
          <p>MAE: {trainingProgress.mae}</p>
          {trainingProgress.val_loss && (
            <>
              <p>Val Loss: {trainingProgress.val_loss}</p>
              <p>Val MAE: {trainingProgress.val_mae}</p>
            </>
          )}
        </div>
      )}

      {metrics && !isTraining && (
        <div className="metrics">
          <h3>Model Performance Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">MAE:</span>
              <span className="metric-value">{metrics.mae}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">RMSE:</span>
              <span className="metric-value">{metrics.rmse}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">MAPE:</span>
              <span className="metric-value">{metrics.mape}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">R²:</span>
              <span className="metric-value">{metrics.r2}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Accuracy:</span>
              <span className="metric-value">{metrics.accuracy}%</span>
            </div>
          </div>
        </div>
      )}

      {model && !isTraining && (
        <div className="forecast-controls">
          <h3>Generate Forecast</h3>
          <div className="forecast-input">
            <label>
              Years to forecast:
              <input
                type="number"
                min="1"
                max="10"
                value={forecastYears}
                onChange={(e) => setForecastYears(parseInt(e.target.value))}
              />
            </label>
            <button onClick={handleForecast}>Generate Forecast</button>
          </div>
        </div>
      )}

      {forecasts && (
        <div className="forecast-results">
          <h3>Forecast Results</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Predicted Emigrants</th>
                <th>Estimated Population (M)</th>
              </tr>
            </thead>
            <tbody>
              {forecasts.map((f, i) => (
                <tr key={i}>
                  <td>{f.year}</td>
                  <td>{f.emigrants.toLocaleString()}</td>
                  <td>{f.population.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="info-box">
        <h4>Model Configuration</h4>
        <ul>
          <li>Lookback window: {LOOKBACK} years</li>
          <li>Input features: Population, Emigrants</li>
          <li>Target: Emigrants (next year)</li>
          <li>Normalization: Min-Max [0, 1]</li>
          <li>Epochs: 100</li>
          <li>Validation split: 20%</li>
        </ul>
      </div>
    </div>
  );
}

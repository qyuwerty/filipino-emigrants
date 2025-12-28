import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cleanData, sortData, normalizeData, denormalize, createSequences, calculateMetrics } from '../utils/dataPreparation';
import { buildMLPModel, trainMLPModel, predictMLP, saveMLPModel, loadMLPModel, deleteMLPModel, downloadMLPModel } from '../models/mlpModel';
import './ForecastPanel.css';

export default function MLPForecast({ data }) {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [model, setModel] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [forecastYears, setForecastYears] = useState(5);
  const [forecasts, setForecasts] = useState([]);
  const [validationResults, setValidationResults] = useState([]);

  const LOOKBACK = 3;
  const FEATURES = ['emigrants'];
  const TARGET = 'emigrants';

  const handleTrain = async () => {
    setIsTraining(true);
    setTrainingProgress({ epoch: 0, loss: 0, mae: 0 });
    setMetrics(null);

    try {
      let cleanedData = cleanData(data);
      cleanedData = sortData(cleanedData);

      const { normalized, mins, maxs } = normalizeData(cleanedData, FEATURES);
      const { X, y } = createSequences(normalized, LOOKBACK, FEATURES, TARGET);

      const newModel = buildMLPModel(LOOKBACK, FEATURES.length);

      const onEpochEnd = (epoch, logs) => {
        setTrainingProgress({
          epoch: epoch + 1,
          loss: logs.loss.toFixed(6),
          mae: logs.mae.toFixed(6),
          val_loss: logs.val_loss?.toFixed(6),
          val_mae: logs.val_mae?.toFixed(6)
        });
      };

      await trainMLPModel(newModel, X, y, onEpochEnd, 100, 0.2);

      const normalizedPredictions = await predictMLP(newModel, X);

      const predictions = normalizedPredictions.map(pred =>
        denormalize(pred, mins[TARGET], maxs[TARGET])
      );

      const actualValues = y.map(val =>
        denormalize(val, mins[TARGET], maxs[TARGET])
      );

      // Create validation results table data (20% validation split for testing)
      const trainSize = Math.floor(actualValues.length * 0.8);
      const resultsData = actualValues.slice(trainSize).map((actual, index) => ({
        year: cleanedData[trainSize + index + LOOKBACK].year,
        actual: Math.round(actual),
        predicted: Math.round(predictions[trainSize + index]),
        error: Math.round(predictions[trainSize + index] - actual)
      }));
      setValidationResults(resultsData);

      const calculatedMetrics = calculateMetrics(actualValues, predictions);
      setMetrics(calculatedMetrics);

      const newMetadata = {
        modelType: 'MLP',
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

      await saveMLPModel(newModel, newMetadata);

      setModel(newModel);
      setMetadata(newMetadata);

      alert(`MLP model trained successfully!\nMAE: ${calculatedMetrics.mae}\nAccuracy: ${calculatedMetrics.accuracy}%`);
    } catch (error) {
      console.error('Training error:', error);
      alert('Error training model: ' + error.message);
    } finally {
      setIsTraining(false);
    }
  };

  const handleLoadModel = async () => {
    try {
      const result = await loadMLPModel();
      if (result) {
        setModel(result.model);
        setMetadata(result.metadata);
        setMetrics(result.metadata.metrics);
        alert('MLP model loaded successfully!');
      } else {
        alert('No saved model found. Please train a model first.');
      }
    } catch (error) {
      console.error('Error loading model:', error);
      alert('Error loading model: ' + error.message);
    }
  };

  const handleDeleteModel = async () => {
    if (!confirm('Are you sure you want to delete the saved MLP model?')) return;

    try {
      await deleteMLPModel();
      setModel(null);
      setMetadata(null);
      setMetrics(null);
      setForecasts([]);
      alert('MLP model deleted successfully!');
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
      await downloadMLPModel(model, metadata);
      alert('MLP model files downloaded!');
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
        emigrants: row.emigrants
      }));

      const predictions = [];
      let currentYear = metadata.lastYear;

      for (let i = 0; i < forecastYears; i++) {
        const normalized = currentSequence.map(row => ({
          emigrants: (row.emigrants - mins.emigrants) / (maxs.emigrants - mins.emigrants)
        }));

        const input = [normalized.map(row => FEATURES.map(f => row[f]))];
        const normalizedPred = await predictMLP(model, input);
        const predictedEmigrants = denormalize(normalizedPred[0], mins[TARGET], maxs[TARGET]);

        currentYear++;
        predictions.push({
          year: currentYear.toString(),
          emigrants: Math.round(predictedEmigrants),
          isForecast: true
        });

        currentSequence = [
          ...currentSequence.slice(1),
          {
            year: currentYear,
            emigrants: predictedEmigrants
          }
        ];
      }

      setForecasts(predictions);
      alert(`Generated ${forecastYears} year MLP forecast!`);
    } catch (error) {
      console.error('Forecasting error:', error);
      alert('Error generating forecast: ' + error.message);
    }
  };

  const chartData = [...data, ...forecasts];

  return (
    <div className="forecast-panel mlp-panel">
      <h2>MLP Forecasting (Multi-Layer Perceptron)</h2>

      <div className="control-buttons">
        <button onClick={handleTrain} disabled={isTraining}>
          {isTraining ? 'Training...' : 'Train MLP Model'}
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
        <>
          <div className="metrics">
            <h3>MLP Model Performance Metrics</h3>
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

          {validationResults.length > 0 && (
            <div className="training-results">
              <h3>Testing Results - 20% Split (Actual vs Predicted)</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Actual Emigrants</th>
                      <th>Predicted Emigrants</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map((row, i) => (
                      <tr key={i}>
                        <td>{row.year}</td>
                        <td>{row.actual.toLocaleString()}</td>
                        <td>{row.predicted.toLocaleString()}</td>
                        <td className={row.error >= 0 ? 'error-positive' : 'error-negative'}>
                          {row.error >= 0 ? '+' : ''}{row.error.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {model && !isTraining && (
        <div className="forecast-controls">
          <h3>Generate MLP Forecast</h3>
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

      {forecasts.length > 0 && (
        <>
          <div className="chart-container">
            <h3>MLP: Historical + Forecast</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  label={{ value: 'Emigrants', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? null : entry.emigrants}
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Emigrants (Historical)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isForecast || !payload.emigrants) return null;
                    return <circle cx={cx} cy={cy} r={3} fill="#82ca9d" />;
                  }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? entry.emigrants : null}
                  stroke="#9b59b6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Emigrants (MLP Forecast)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.isForecast || !payload.emigrants) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#9b59b6" />;
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-results">
            <h3>MLP Forecast Results</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Predicted Emigrants</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f, i) => (
                  <tr key={i}>
                    <td>{f.year}</td>
                    <td>{f.emigrants.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="info-box">
        <h4>MLP Model Configuration</h4>
        <ul>
          <li>Architecture: 2 Dense layers (64, 32 units)</li>
          <li>Lookback window: {LOOKBACK} years</li>
          <li>Input features: Emigrants (historical values, flattened)</li>
          <li>Target: Emigrants (next year)</li>
          <li>Dropout: 0.2</li>
          <li>Epochs: 100 | Validation split: 20%</li>
        </ul>
      </div>
    </div>
  );
}

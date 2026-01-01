import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  prepareTrainingData, 
  trainModel, 
  generateForecast, 
  createModelMetadata, 
  handleModelError, 
  validateModelConfig,
  SHARED_TRAINING_CONFIG 
} from '../utils/sharedTrainingPipeline';
import { buildLSTMModel, trainLSTMModel, predictLSTM, saveLSTMModel, loadLSTMModel, deleteLSTMModel, downloadLSTMModel } from '../models/lstmModel';
import { DEFAULT_PREPARATION_OPTIONS } from '../utils/dataPreparation';
import './ForecastPanel.css';

export default function LSTMForecastIndependent({ data }) {
  // LSTM-specific state
  const [lstmModel, setLstmModel] = useState(null);
  const [lstmMetadata, setLstmMetadata] = useState(null);
  const [lstmTrainingProgress, setLstmTrainingProgress] = useState(null);
  const [lstmMetrics, setLstmMetrics] = useState(null);
  const [lstmValidationResults, setLstmValidationResults] = useState([]);
  const [lstmForecasts, setLstmForecasts] = useState([]);
  const [lstmPrepSummary, setLstmPrepSummary] = useState(null);
  
  // LSTM-specific UI state
  const [isLstmTraining, setIsLstmTraining] = useState(false);
  const [lstmForecastYears, setLstmForecastYears] = useState(5);
  const [lstmLookback, setLstmLookback] = useState(7); // LSTM prefers longer memory
  const [lstmDropout, setLstmDropout] = useState(0.2);
  const [lstmUnits, setLstmUnits] = useState([60, 60]);
  const [lstmLearningRate, setLstmLearningRate] = useState(0.001);

  // LSTM-specific configuration
  const LSTM_FEATURES = ['emigrants'];
  const LSTM_TARGET = 'emigrants';
  const LSTM_PREPARATION = {
    ...DEFAULT_PREPARATION_OPTIONS,
    features: LSTM_FEATURES,
    target: LSTM_TARGET,
    yearKey: 'year',
    dropInvalid: true,
    allowNegative: []
  };

  const handleLstmTrain = async () => {
    setIsLstmTraining(true);
    setLstmTrainingProgress({ epoch: 0, loss: 0, mae: 0 });
    setLstmMetrics(null);

    try {
      // Validate configuration
      const config = {
        lookback: lstmLookback,
        features: LSTM_FEATURES,
        target: LSTM_TARGET,
        preparation: LSTM_PREPARATION,
        epochs: SHARED_TRAINING_CONFIG.epochs,
        validationSplit: SHARED_TRAINING_CONFIG.validationSplit,
        hyperparameters: {
          units: lstmUnits,
          dropout: lstmDropout,
          learningRate: lstmLearningRate
        }
      };
      
      validateModelConfig(config);

      // Prepare data using shared pipeline
      const trainingData = prepareTrainingData(
        data, 
        LSTM_PREPARATION, 
        lstmLookback, 
        LSTM_FEATURES, 
        LSTM_TARGET
      );
      
      trainingData.lookback = lstmLookback;
      trainingData.target = LSTM_TARGET;

      // Build LSTM model with specific configuration
      const newLstmModel = buildLSTMModel(lstmLookback, LSTM_FEATURES.length, {
        layerUnits: lstmUnits,
        dropout: lstmDropout,
        learningRate: lstmLearningRate
      });

      // Train using shared pipeline
      const results = await trainModel(
        newLstmModel,
        trainingData,
        trainLSTMModel,
        predictLSTM,
        setLstmTrainingProgress,
        SHARED_TRAINING_CONFIG
      );

      // Create metadata
      const newMetadata = createModelMetadata(
        'LSTM',
        config,
        trainingData,
        results.metrics,
        results.preparationSummary
      );

      // Save model
      await saveLSTMModel(results.model, newMetadata);

      // Update state
      setLstmModel(results.model);
      setLstmMetadata(newMetadata);
      setLstmMetrics(results.metrics);
      setLstmValidationResults(results.validationResults);
      setLstmPrepSummary(results.preparationSummary);

      alert(`LSTM model trained successfully!\nMAE: ${results.metrics.mae}\nAccuracy: ${results.metrics.accuracy}%`);
    } catch (error) {
      const errorMessage = handleModelError(error, 'LSTM training');
      alert(errorMessage);
    } finally {
      setIsLstmTraining(false);
    }
  };

  const handleLstmLoadModel = async () => {
    try {
      const result = await loadLSTMModel();
      if (result) {
        setLstmModel(result.model);
        setLstmMetadata(result.metadata);
        setLstmMetrics(result.metadata.metrics);
        if (result.metadata.preparation) {
          const { issueCount = 0, discardedCount = 0, totalRows } = result.metadata.preparation;
          setLstmPrepSummary({ issueCount, discardedCount, totalRows });
        } else {
          setLstmPrepSummary(null);
        }
        
        // Load LSTM-specific hyperparameters
        if (result.metadata.hyperparameters) {
          const hyperparams = result.metadata.hyperparameters;
          setLstmLookback(result.metadata.lookback || 7);
          setLstmUnits(hyperparams.units || [60, 60]);
          setLstmDropout(hyperparams.dropout || 0.2);
          setLstmLearningRate(hyperparams.learningRate || 0.001);
        }
        
        alert('LSTM model loaded successfully!');
      } else {
        alert('No saved LSTM model found. Please train a model first.');
      }
    } catch (error) {
      const errorMessage = handleModelError(error, 'LSTM model loading');
      alert(errorMessage);
    }
  };

  const handleLstmDeleteModel = async () => {
    if (!confirm('Are you sure you want to delete the saved LSTM model?')) return;

    try {
      await deleteLSTMModel();
      setLstmModel(null);
      setLstmMetadata(null);
      setLstmMetrics(null);
      setLstmForecasts([]);
      setLstmValidationResults([]);
      setLstmPrepSummary(null);
      alert('LSTM model deleted successfully!');
    } catch (error) {
      const errorMessage = handleModelError(error, 'LSTM model deletion');
      alert(errorMessage);
    }
  };

  const handleLstmDownloadModel = async () => {
    if (!lstmModel || !lstmMetadata) {
      alert('No LSTM model to download. Please train a model first.');
      return;
    }

    try {
      await downloadLSTMModel(lstmModel, lstmMetadata);
      alert('LSTM model files downloaded!');
    } catch (error) {
      const errorMessage = handleModelError(error, 'LSTM model download');
      alert(errorMessage);
    }
  };

  const handleLstmForecast = async () => {
    if (!lstmModel || !lstmMetadata) {
      alert('Please train or load an LSTM model first.');
      return;
    }

    try {
      const predictions = generateForecast(
        lstmModel,
        lstmMetadata,
        lstmForecastYears,
        predictLSTM,
        lstmMetadata.lookback,
        LSTM_FEATURES,
        LSTM_TARGET
      );

      setLstmForecasts(predictions);
      alert(`Generated ${lstmForecastYears} year LSTM forecast!`);
    } catch (error) {
      const errorMessage = handleModelError(error, 'LSTM forecasting');
      alert(errorMessage);
    }
  };

  const chartData = [...data, ...lstmForecasts];

  return (
    <div className="forecast-panel lstm-panel">
      <h2 className="lstm-title">LSTM Forecasting (Long Short-Term Memory)</h2>
      
      <div className="lstm-mindset">
        <p><strong>LSTM Mindset:</strong> "I excel at sequential dependencies and temporal patterns"</p>
      </div>

      <div className="lstm-controls">
        <h3>LSTM Configuration</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Lookback Window (years):</label>
            <input
              type="number"
              min="3"
              max="15"
              value={lstmLookback}
              onChange={(e) => setLstmLookback(parseInt(e.target.value))}
              disabled={isLstmTraining}
            />
            <small>Longer memory for temporal patterns</small>
          </div>
          
          <div className="control-item">
            <label>LSTM Units:</label>
            <input
              type="text"
              value={lstmUnits.join(',')}
              onChange={(e) => setLstmUnits(e.target.value.split(',').map(n => parseInt(n.trim())))}
              disabled={isLstmTraining}
            />
            <small>Comma-separated, e.g., 60,60</small>
          </div>
          
          <div className="control-item">
            <label>Dropout Rate:</label>
            <input
              type="number"
              min="0"
              max="0.5"
              step="0.1"
              value={lstmDropout}
              onChange={(e) => setLstmDropout(parseFloat(e.target.value))}
              disabled={isLstmTraining}
            />
            <small>Prevents overfitting</small>
          </div>
          
          <div className="control-item">
            <label>Learning Rate:</label>
            <input
              type="number"
              min="0.0001"
              max="0.01"
              step="0.0001"
              value={lstmLearningRate}
              onChange={(e) => setLstmLearningRate(parseFloat(e.target.value))}
              disabled={isLstmTraining}
            />
            <small>Training speed</small>
          </div>
        </div>
      </div>

      <div className="control-buttons">
        <button onClick={handleLstmTrain} disabled={isLstmTraining}>
          {isLstmTraining ? 'Training LSTM...' : 'Train LSTM Model'}
        </button>
        <button onClick={handleLstmLoadModel} disabled={isLstmTraining}>
          Load LSTM Model
        </button>
        <button onClick={handleLstmDeleteModel} disabled={isLstmTraining || !lstmModel}>
          Delete LSTM Model
        </button>
        <button onClick={handleLstmDownloadModel} disabled={isLstmTraining || !lstmModel}>
          Download LSTM Model
        </button>
      </div>

      {isLstmTraining && lstmTrainingProgress && (
        <div className="training-progress lstm-progress">
          <h3>LSTM Training Progress</h3>
          <p>Epoch: {lstmTrainingProgress.epoch} / {lstmTrainingProgress.totalEpochs || 100}</p>
          <p>Loss: {lstmTrainingProgress.loss}</p>
          <p>MAE: {lstmTrainingProgress.mae}</p>
          {lstmTrainingProgress.val_loss && (
            <>
              <p>Val Loss: {lstmTrainingProgress.val_loss}</p>
              <p>Val MAE: {lstmTrainingProgress.val_mae}</p>
            </>
          )}
        </div>
      )}

      {lstmMetrics && !isLstmTraining && (
        <>
          <div className="metrics lstm-metrics">
            <h3>LSTM Model Performance Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">MAE:</span>
                <span className="metric-value">{lstmMetrics.mae}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">RMSE:</span>
                <span className="metric-value">{lstmMetrics.rmse}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">MAPE:</span>
                <span className="metric-value">{lstmMetrics.mape}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">R²:</span>
                <span className="metric-value">{lstmMetrics.r2}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Accuracy:</span>
                <span className="metric-value">{lstmMetrics.accuracy}%</span>
              </div>
            </div>
          </div>

          {lstmValidationResults.length > 0 && (
            <div className="training-results lstm-results">
              <h3>LSTM Testing Results - Time Series Validation</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Actual Emigrants</th>
                      <th>LSTM Predicted</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lstmValidationResults.map((row, i) => (
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

      {lstmModel && !isLstmTraining && (
        <div className="forecast-controls lstm-forecast-controls">
          <h3>Generate LSTM Forecast</h3>
          <div className="forecast-input">
            <label>
              Years to forecast:
              <input
                type="number"
                min="1"
                max="10"
                value={lstmForecastYears}
                onChange={(e) => setLstmForecastYears(parseInt(e.target.value))}
              />
            </label>
            <button onClick={handleLstmForecast}>Generate LSTM Forecast</button>
          </div>
        </div>
      )}

      {lstmForecasts.length > 0 && (
        <>
          <div className="chart-container lstm-chart">
            <h3>LSTM: Historical + Forecast</h3>
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
                  stroke="#ff6b6b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Emigrants (LSTM Forecast)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.isForecast || !payload.emigrants) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#ff6b6b" />;
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-results lstm-forecast-results">
            <h3>LSTM Forecast Results</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>LSTM Predicted Emigrants</th>
                </tr>
              </thead>
              <tbody>
                {lstmForecasts.map((f, i) => (
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

      <div className="info-box lstm-info">
        <h4>LSTM Model Configuration</h4>
        <ul>
          <li>Architecture: {lstmUnits.length} LSTM layers ({lstmUnits.join(', ')} units each)</li>
          <li>Lookback window: {lstmLookback} years (temporal memory)</li>
          <li>Input features: {LSTM_FEATURES.join(', ')}</li>
          <li>Target: {LSTM_TARGET}</li>
          <li>Dropout: {lstmDropout}</li>
          <li>Learning Rate: {lstmLearningRate}</li>
          <li>Epochs: {SHARED_TRAINING_CONFIG.epochs} | Validation split: {SHARED_TRAINING_CONFIG.validationSplit * 100}%</li>
          <li>Validation: Time-series split (preserves temporal order)</li>
        </ul>
      </div>
    </div>
  );
}

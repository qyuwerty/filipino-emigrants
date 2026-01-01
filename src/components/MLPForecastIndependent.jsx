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
import { buildMLPModel, trainMLPModel, predictMLP, saveMLPModel, loadMLPModel, deleteMLPModel, downloadMLPModel } from '../models/mlpModel';
import { DEFAULT_PREPARATION_OPTIONS } from '../utils/dataPreparation';
import './ForecastPanel.css';

export default function MLPForecastIndependent({ data }) {
  // MLP-specific state
  const [mlpModel, setMlpModel] = useState(null);
  const [mlpMetadata, setMlpMetadata] = useState(null);
  const [mlpTrainingProgress, setMlpTrainingProgress] = useState(null);
  const [mlpMetrics, setMlpMetrics] = useState(null);
  const [mlpValidationResults, setMlpValidationResults] = useState([]);
  const [mlpForecasts, setMlpForecasts] = useState([]);
  const [mlpPrepSummary, setMlpPrepSummary] = useState(null);
  
  // MLP-specific UI state
  const [isMlpTraining, setIsMlpTraining] = useState(false);
  const [mlpForecastYears, setMlpForecastYears] = useState(5);
  const [mlpLookback, setMlpLookback] = useState(3); // MLP prefers shorter patterns
  const [mlpHiddenUnits, setMlpHiddenUnits] = useState([64, 32]);
  const [mlpDropout, setMlpDropout] = useState(0.2);
  const [mlpActivation, setMlpActivation] = useState('relu');
  const [mlpLearningRate, setMlpLearningRate] = useState(0.001);

  // MLP-specific configuration
  const MLP_FEATURES = ['emigrants'];
  const MLP_TARGET = 'emigrants';
  const MLP_PREPARATION = {
    ...DEFAULT_PREPARATION_OPTIONS,
    features: MLP_FEATURES,
    target: MLP_TARGET,
    yearKey: 'year',
    dropInvalid: true,
    allowNegative: []
  };

  const handleMlpTrain = async () => {
    setIsMlpTraining(true);
    setMlpTrainingProgress({ epoch: 0, loss: 0, mae: 0 });
    setMlpMetrics(null);

    try {
      // Validate configuration
      const config = {
        lookback: mlpLookback,
        features: MLP_FEATURES,
        target: MLP_TARGET,
        preparation: MLP_PREPARATION,
        epochs: SHARED_TRAINING_CONFIG.epochs,
        validationSplit: SHARED_TRAINING_CONFIG.validationSplit,
        hyperparameters: {
          hiddenUnits: mlpHiddenUnits,
          dropout: mlpDropout,
          activation: mlpActivation,
          learningRate: mlpLearningRate
        }
      };
      
      validateModelConfig(config);

      // Prepare data using shared pipeline
      const trainingData = prepareTrainingData(
        data, 
        MLP_PREPARATION, 
        mlpLookback, 
        MLP_FEATURES, 
        MLP_TARGET
      );
      
      trainingData.lookback = mlpLookback;
      trainingData.target = MLP_TARGET;

      // Build MLP model with specific configuration
      const newMlpModel = buildMLPModel(mlpLookback, MLP_FEATURES.length, {
        hiddenUnits: mlpHiddenUnits,
        dropout: mlpDropout,
        activation: mlpActivation,
        learningRate: mlpLearningRate
      });

      // Train using shared pipeline
      const results = await trainModel(
        newMlpModel,
        trainingData,
        trainMLPModel,
        predictMLP,
        setMlpTrainingProgress,
        SHARED_TRAINING_CONFIG
      );

      // Create metadata
      const newMetadata = createModelMetadata(
        'MLP',
        config,
        trainingData,
        results.metrics,
        results.preparationSummary
      );

      // Save model
      await saveMLPModel(results.model, newMetadata);

      // Update state
      setMlpModel(results.model);
      setMlpMetadata(newMetadata);
      setMlpMetrics(results.metrics);
      setMlpValidationResults(results.validationResults);
      setMlpPrepSummary(results.preparationSummary);

      alert(`MLP model trained successfully!\nMAE: ${results.metrics.mae}\nAccuracy: ${results.metrics.accuracy}%`);
    } catch (error) {
      const errorMessage = handleModelError(error, 'MLP training');
      alert(errorMessage);
    } finally {
      setIsMlpTraining(false);
    }
  };

  const handleMlpLoadModel = async () => {
    try {
      const result = await loadMLPModel();
      if (result) {
        setMlpModel(result.model);
        setMlpMetadata(result.metadata);
        setMlpMetrics(result.metadata.metrics);
        if (result.metadata.preparation) {
          const { issueCount = 0, discardedCount = 0, totalRows } = result.metadata.preparation;
          setMlpPrepSummary({ issueCount, discardedCount, totalRows });
        } else {
          setMlpPrepSummary(null);
        }
        
        // Load MLP-specific hyperparameters
        if (result.metadata.hyperparameters) {
          const hyperparams = result.metadata.hyperparameters;
          setMlpLookback(result.metadata.lookback || 3);
          setMlpHiddenUnits(hyperparams.hiddenUnits || [64, 32]);
          setMlpDropout(hyperparams.dropout || 0.2);
          setMlpActivation(hyperparams.activation || 'relu');
          setMlpLearningRate(hyperparams.learningRate || 0.001);
        }
        
        alert('MLP model loaded successfully!');
      } else {
        alert('No saved MLP model found. Please train a model first.');
      }
    } catch (error) {
      const errorMessage = handleModelError(error, 'MLP model loading');
      alert(errorMessage);
    }
  };

  const handleMlpDeleteModel = async () => {
    if (!confirm('Are you sure you want to delete the saved MLP model?')) return;

    try {
      await deleteMLPModel();
      setMlpModel(null);
      setMlpMetadata(null);
      setMlpMetrics(null);
      setMlpForecasts([]);
      setMlpValidationResults([]);
      setMlpPrepSummary(null);
      alert('MLP model deleted successfully!');
    } catch (error) {
      const errorMessage = handleModelError(error, 'MLP model deletion');
      alert(errorMessage);
    }
  };

  const handleMlpDownloadModel = async () => {
    if (!mlpModel || !mlpMetadata) {
      alert('No MLP model to download. Please train a model first.');
      return;
    }

    try {
      await downloadMLPModel(mlpModel, mlpMetadata);
      alert('MLP model files downloaded!');
    } catch (error) {
      const errorMessage = handleModelError(error, 'MLP model download');
      alert(errorMessage);
    }
  };

  const handleMlpForecast = async () => {
    if (!mlpModel || !mlpMetadata) {
      alert('Please train or load an MLP model first.');
      return;
    }

    try {
      const predictions = generateForecast(
        mlpModel,
        mlpMetadata,
        mlpForecastYears,
        predictMLP,
        mlpMetadata.lookback,
        MLP_FEATURES,
        MLP_TARGET
      );

      setMlpForecasts(predictions);
      alert(`Generated ${mlpForecastYears} year MLP forecast!`);
    } catch (error) {
      const errorMessage = handleModelError(error, 'MLP forecasting');
      alert(errorMessage);
    }
  };

  const chartData = [...data, ...mlpForecasts];

  return (
    <div className="forecast-panel mlp-panel">
      <h2 className="mlp-title">MLP Forecasting (Multi-Layer Perceptron)</h2>
      
      <div className="mlp-mindset">
        <p><strong>MLP Mindset:</strong> "I excel at pattern recognition and feature relationships"</p>
      </div>

      <div className="mlp-controls">
        <h3>MLP Configuration</h3>
        <div className="control-grid">
          <div className="control-item">
            <label>Lookback Window (years):</label>
            <input
              type="number"
              min="1"
              max="10"
              value={mlpLookback}
              onChange={(e) => setMlpLookback(parseInt(e.target.value))}
              disabled={isMlpTraining}
            />
            <small>Shorter window for pattern matching</small>
          </div>
          
          <div className="control-item">
            <label>Hidden Layers:</label>
            <input
              type="text"
              value={mlpHiddenUnits.join(',')}
              onChange={(e) => setMlpHiddenUnits(e.target.value.split(',').map(n => parseInt(n.trim())))}
              disabled={isMlpTraining}
            />
            <small>Comma-separated, e.g., 64,32</small>
          </div>
          
          <div className="control-item">
            <label>Activation Function:</label>
            <select
              value={mlpActivation}
              onChange={(e) => setMlpActivation(e.target.value)}
              disabled={isMlpTraining}
            >
              <option value="relu">ReLU</option>
              <option value="tanh">Tanh</option>
              <option value="sigmoid">Sigmoid</option>
              <option value="linear">Linear</option>
            </select>
            <small>Non-linear transformation</small>
          </div>
          
          <div className="control-item">
            <label>Dropout Rate:</label>
            <input
              type="number"
              min="0"
              max="0.5"
              step="0.1"
              value={mlpDropout}
              onChange={(e) => setMlpDropout(parseFloat(e.target.value))}
              disabled={isMlpTraining}
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
              value={mlpLearningRate}
              onChange={(e) => setMlpLearningRate(parseFloat(e.target.value))}
              disabled={isMlpTraining}
            />
            <small>Training speed</small>
          </div>
        </div>
      </div>

      <div className="control-buttons">
        <button onClick={handleMlpTrain} disabled={isMlpTraining}>
          {isMlpTraining ? 'Training MLP...' : 'Train MLP Model'}
        </button>
        <button onClick={handleMlpLoadModel} disabled={isMlpTraining}>
          Load MLP Model
        </button>
        <button onClick={handleMlpDeleteModel} disabled={isMlpTraining || !mlpModel}>
          Delete MLP Model
        </button>
        <button onClick={handleMlpDownloadModel} disabled={isMlpTraining || !mlpModel}>
          Download MLP Model
        </button>
      </div>

      {isMlpTraining && mlpTrainingProgress && (
        <div className="training-progress mlp-progress">
          <h3>MLP Training Progress</h3>
          <p>Epoch: {mlpTrainingProgress.epoch} / {mlpTrainingProgress.totalEpochs || 100}</p>
          <p>Loss: {mlpTrainingProgress.loss}</p>
          <p>MAE: {mlpTrainingProgress.mae}</p>
          {mlpTrainingProgress.val_loss && (
            <>
              <p>Val Loss: {mlpTrainingProgress.val_loss}</p>
              <p>Val MAE: {mlpTrainingProgress.val_mae}</p>
            </>
          )}
        </div>
      )}

      {mlpMetrics && !isMlpTraining && (
        <>
          <div className="metrics mlp-metrics">
            <h3>MLP Model Performance Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">MAE:</span>
                <span className="metric-value">{mlpMetrics.mae}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">RMSE:</span>
                <span className="metric-value">{mlpMetrics.rmse}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">MAPE:</span>
                <span className="metric-value">{mlpMetrics.mape}%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">R²:</span>
                <span className="metric-value">{mlpMetrics.r2}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Accuracy:</span>
                <span className="metric-value">{mlpMetrics.accuracy}%</span>
              </div>
            </div>
          </div>

          {mlpValidationResults.length > 0 && (
            <div className="training-results mlp-results">
              <h3>MLP Testing Results - Random Validation</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Actual Emigrants</th>
                      <th>MLP Predicted</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mlpValidationResults.map((row, i) => (
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

      {mlpModel && !isMlpTraining && (
        <div className="forecast-controls mlp-forecast-controls">
          <h3>Generate MLP Forecast</h3>
          <div className="forecast-input">
            <label>
              Years to forecast:
              <input
                type="number"
                min="1"
                max="10"
                value={mlpForecastYears}
                onChange={(e) => setMlpForecastYears(parseInt(e.target.value))}
              />
            </label>
            <button onClick={handleMlpForecast}>Generate MLP Forecast</button>
          </div>
        </div>
      )}

      {mlpForecasts.length > 0 && (
        <>
          <div className="chart-container mlp-chart">
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
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Emigrants (Historical)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.isForecast || !payload.emigrants) return null;
                    return <circle cx={cx} cy={cy} r={3} fill="#8884d8" />;
                  }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey={(entry) => entry.isForecast ? entry.emigrants : null}
                  stroke="#ff7300"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Emigrants (MLP Forecast)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload.isForecast || !payload.emigrants) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#ff7300" />;
                  }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="forecast-results mlp-forecast-results">
            <h3>MLP Forecast Results</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>MLP Predicted Emigrants</th>
                </tr>
              </thead>
              <tbody>
                {mlpForecasts.map((f, i) => (
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

      <div className="info-box mlp-info">
        <h4>MLP Model Configuration</h4>
        <ul>
          <li>Architecture: {mlpHiddenUnits.length} Dense layers ({mlpHiddenUnits.join(', ')} units each)</li>
          <li>Lookback window: {mlpLookback} years (pattern matching)</li>
          <li>Input features: {MLP_FEATURES.join(', ')}</li>
          <li>Target: {MLP_TARGET}</li>
          <li>Activation: {mlpActivation}</li>
          <li>Dropout: {mlpDropout}</li>
          <li>Learning Rate: {mlpLearningRate}</li>
          <li>Epochs: {SHARED_TRAINING_CONFIG.epochs} | Validation split: {SHARED_TRAINING_CONFIG.validationSplit * 100}%</li>
          <li>Validation: Random split with feature importance analysis</li>
        </ul>
      </div>
    </div>
  );
}

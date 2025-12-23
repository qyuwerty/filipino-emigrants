// src/components/ForecastPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Brain, Play } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trainMLPModel } from '../models/mlpModels';
import { prepareTimeSeriesData } from '../utils/dataPreparation';
import './ForecastPanel.css';

const ForecastPanel = ({ data, isOpen, onClose }) => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  
  const [mlpConfig, setMlpConfig] = useState({
    lookback: 12,
    hiddenUnits: 64,
    activation: 'relu', 
    epochs: 50,
    forecastYears: 5
  });
  const [mlpResults, setMlpResults] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleMLPTrain = async () => {
    setIsTraining(true);
    setTrainingProgress(0);
    
    try {
      const preparedData = prepareTimeSeriesData(data, mlpConfig.lookback);
      
      const results = await trainMLPModel(
        preparedData,
        mlpConfig,
        (progress) => setTrainingProgress(progress)
      );
      
      setMlpResults(results);
      setIsTraining(false);
    } catch (error) {
      console.error('MLP training error:', error);
      alert('Failed to train MLP model: ' + error.message);
      setIsTraining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="forecast-modal-overlay" onClick={onClose}>
      <div className="forecast-modal" onClick={(e) => e.stopPropagation()}>
        <div className="forecast-header">
          <div className="flex items-center gap-3">
            <Brain size={28} className="text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                MLP Time Series Forecasting
              </h2>
              <p className="text-sm text-gray-600">
                Train MLP model to predict future emigration trends
              </p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="forecast-content">
          <MLPPanel
            config={mlpConfig}
            setConfig={setMlpConfig}
            results={mlpResults}
            isTraining={isTraining}
            trainingProgress={trainingProgress}
            onTrain={handleMLPTrain}
          />
        </div>
      </div>
    </div>
  );
};

const MLPPanel = ({ config, setConfig, results, isTraining, trainingProgress, onTrain }) => {
  // Store input values as strings to allow proper editing
  const [inputValues, setInputValues] = useState({
    lookback: String(config.lookback),
    hiddenUnits: String(config.hiddenUnits),
    epochs: String(config.epochs),
    forecastYears: String(config.forecastYears)
  });

  // Refs to track cursor position
  const inputRefs = useRef({});

  // Update input values when config changes externally
  useEffect(() => {
    setInputValues({
      lookback: String(config.lookback),
      hiddenUnits: String(config.hiddenUnits),
      epochs: String(config.epochs),
      forecastYears: String(config.forecastYears)
    });
  }, [config]);

  // Handle input changes - allow all characters including empty string
  const handleInputChange = (field, value, cursorPos) => {
    // Store cursor position before state update
    const savedCursor = cursorPos;
    
    // Allow empty string and any input for editing
    setInputValues(prev => ({ ...prev, [field]: value }));
    
    // Only update config if it's a valid positive number
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setConfig(prev => ({ ...prev, [field]: numValue }));
    }

    // Restore cursor position after React renders
    requestAnimationFrame(() => {
      if (inputRefs.current[field]) {
        inputRefs.current[field].setSelectionRange(savedCursor, savedCursor);
      }
    });
  };

  // Handle blur to ensure valid values
  const handleInputBlur = (field, min, max) => {
    const currentValue = inputValues[field];
    const numValue = parseInt(currentValue, 10);
    
    // If empty or invalid, revert to minimum
    if (currentValue === '' || isNaN(numValue) || numValue < min) {
      setInputValues(prev => ({ ...prev, [field]: String(min) }));
      setConfig(prev => ({ ...prev, [field]: min }));
    } 
    // If exceeds maximum, cap at maximum
    else if (numValue > max) {
      setInputValues(prev => ({ ...prev, [field]: String(max) }));
      setConfig(prev => ({ ...prev, [field]: max }));
    } 
    // Valid value - ensure it's properly formatted
    else {
      setInputValues(prev => ({ ...prev, [field]: String(numValue) }));
      setConfig(prev => ({ ...prev, [field]: numValue }));
    }
  };

  return (
    <div className="model-panel">
      <div className="config-section">
        <h3 className="section-title">Model Configuration</h3>
        
        <div className="config-grid">
          <div className="config-item">
            <label>Lookback Period</label>
            <input
              ref={el => inputRefs.current.lookback = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValues.lookback}
              onChange={(e) => handleInputChange('lookback', e.target.value, e.target.selectionStart)}
              onBlur={() => handleInputBlur('lookback', 3, 24)}
              disabled={isTraining}
              placeholder="3-24"
              autoComplete="off"
              spellCheck="false"
            />
            <span className="config-help">Number of past years to consider</span>
          </div>

          <div className="config-item">
            <label>Hidden Units (Neurons)</label>
            <input
              ref={el => inputRefs.current.hiddenUnits = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValues.hiddenUnits}
              onChange={(e) => handleInputChange('hiddenUnits', e.target.value, e.target.selectionStart)}
              onBlur={() => handleInputBlur('hiddenUnits', 16, 256)}
              disabled={isTraining}
              placeholder="16-256"
              autoComplete="off"
              spellCheck="false"
            />
            <span className="config-help">Number of MLP neurons</span>
          </div>

                    <div className="config-item">
            <label>Activation Function</label>
            <select
                value={config.activation}
                onChange={(e) => setConfig({ ...config, activation: e.target.value })}
                disabled={isTraining}
            >
                <option value="relu">ReLU</option>
                <option value="tanh">Tanh</option>
                <option value="sigmoid">Sigmoid</option>
                <option value="elu">ELU</option>
            </select>
            <span className="config-help">
                Non-linear activation - 
                <span 
                className="markdown-link"
                onClick={() => setConfig({ ...config, activation: 'relu' })}
                style={{ cursor: 'pointer', marginLeft: '5px', color: '#007bff' }}
                >
                ReLU
                </span>
                , 
                <span 
                className="markdown-link"
                onClick={() => setConfig({ ...config, activation: 'tanh' })}
                style={{ cursor: 'pointer', marginLeft: '5px', color: '#007bff' }}
                >
                Tanh
                </span>
                , 
                <span 
                className="markdown-link"
                onClick={() => setConfig({ ...config, activation: 'sigmoid' })}
                style={{ cursor: 'pointer', marginLeft: '5px', color: '#007bff' }}
                >
                Sigmoid
                </span>
                , 
                <span 
                className="markdown-link"
                onClick={() => setConfig({ ...config, activation: 'elu' })}
                style={{ cursor: 'pointer', marginLeft: '5px', color: '#007bff' }}
                >
                ELU
                </span>
                </span>
            </div>

          <div className="config-item">
            <label>Training Epochs</label>
            <input
              ref={el => inputRefs.current.epochs = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValues.epochs}
              onChange={(e) => handleInputChange('epochs', e.target.value, e.target.selectionStart)}
              onBlur={() => handleInputBlur('epochs', 10, 200)}
              disabled={isTraining}
              placeholder="10-200"
              autoComplete="off"
              spellCheck="false"
            />
            <span className="config-help">Number of training iterations</span>
          </div>

          <div className="config-item">
            <label>Forecast Years</label>
            <input
              ref={el => inputRefs.current.forecastYears = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValues.forecastYears}
              onChange={(e) => handleInputChange('forecastYears', e.target.value, e.target.selectionStart)}
              onBlur={() => handleInputBlur('forecastYears', 1, 10)}
              disabled={isTraining}
              placeholder="1-10"
              autoComplete="off"
              spellCheck="false"
            />
            <span className="config-help">Years to predict ahead</span>
          </div>
        </div>

        <button
          className={`train-btn ${isTraining ? 'training' : ''}`}
          onClick={onTrain}
          disabled={isTraining}
        >
          {isTraining ? (
            <>
              <div className="spinner" />
              Training... {trainingProgress}%
            </>
          ) : (
            <>
              <Play size={20} />
              Train MLP Model
            </>
          )}
        </button>

        {isTraining && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${trainingProgress}%` }} />
          </div>
        )}
      </div>

      {results && <ResultsPanel results={results} modelType="MLP" />}
    </div>
  );
};

const ResultsPanel = ({ results, modelType }) => {
  return (
    <div className="results-section">
      <h3 className="section-title">Training Results</h3>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Model Type</span>
          <span className="metric-value">{modelType}</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Lookback</span>
          <span className="metric-value">{results.config.lookback} years</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Hidden Units</span>
          <span className="metric-value">{results.config.hiddenUnits}</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Activation</span>
          <span className="metric-value">{results.config.activation.toUpperCase()}</span>
        </div>
        
        <div className="metric-card highlight">
          <span className="metric-label">MAE</span>
          <span className="metric-value">{results.mae.toFixed(4)}</span>
        </div>
        
        <div className="metric-card highlight">
          <span className="metric-label">Accuracy</span>
          <span className="metric-value">{results.accuracy.toFixed(2)}%</span>
        </div>
      </div>

      <div className="chart-section">
        <h4 className="chart-title">Forecast Visualization</h4>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={results.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Emigrants', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#8884d8" strokeWidth={2} name="Historical Data" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="predicted" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" name="Forecast" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {results.history && (
        <div className="chart-section">
          <h4 className="chart-title">Training Loss History</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={results.history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="epoch" label={{ value: 'Epoch', position: 'insideBottom', offset: -5 }} />
              <YAxis label={{ value: 'Loss', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="loss" stroke="#ff7300" strokeWidth={2} name="Training Loss" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ForecastPanel;
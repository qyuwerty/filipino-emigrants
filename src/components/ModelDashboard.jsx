import { useState } from 'react';
import LSTMForecastIndependent from './LSTMForecastIndependent';
import MLPForecastIndependent from './MLPForecastIndependent';
import './ModelDashboard.css';

export default function ModelDashboard({ data }) {
  const [activeTab, setActiveTab] = useState('lstm');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="model-dashboard">
      <div className="dashboard-header">
        <h1>Neural Network Forecasting Dashboard</h1>
        <p>Compare LSTM and MLP models for Filipino emigrants forecasting</p>
      </div>

      <div className="tab-navigation">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'lstm' ? 'active' : ''}`}
            onClick={() => handleTabChange('lstm')}
          >
            <div className="tab-icon">🧠</div>
            <div className="tab-content">
              <div className="tab-title">LSTM</div>
              <div className="tab-subtitle">Long Short-Term Memory</div>
            </div>
          </button>
          
          <button
            className={`tab-button ${activeTab === 'mlp' ? 'active' : ''}`}
            onClick={() => handleTabChange('mlp')}
          >
            <div className="tab-icon">🔮</div>
            <div className="tab-content">
              <div className="tab-title">MLP</div>
              <div className="tab-subtitle">Multi-Layer Perceptron</div>
            </div>
          </button>
        </div>

        <div className="tab-indicators">
          <div className={`indicator lstm-indicator ${activeTab === 'lstm' ? 'active' : ''}`}>
            <div className="indicator-dot"></div>
            <span>Temporal Patterns</span>
          </div>
          <div className={`indicator mlp-indicator ${activeTab === 'mlp' ? 'active' : ''}`}>
            <div className="indicator-dot"></div>
            <span>Feature Relationships</span>
          </div>
        </div>
      </div>

      <div className="tab-content-wrapper">
        {activeTab === 'lstm' && (
          <div className="tab-panel lstm-tab-panel">
            <LSTMForecastIndependent data={data} />
          </div>
        )}
        
        {activeTab === 'mlp' && (
          <div className="tab-panel mlp-tab-panel">
            <MLPForecastIndependent data={data} />
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <div className="model-comparison">
          <div className="comparison-card lstm-comparison">
            <h3>LSTM Strengths</h3>
            <ul>
              <li>Excels at sequential dependencies</li>
              <li>Captures temporal autocorrelation</li>
              <li>Remembers long-term patterns</li>
              <li>Ideal for time-series with seasonality</li>
            </ul>
          </div>
          
          <div className="vs-divider">
            <span>VS</span>
          </div>
          
          <div className="comparison-card mlp-comparison">
            <h3>MLP Strengths</h3>
            <ul>
              <li>Excels at pattern recognition</li>
              <li>Finds complex feature relationships</li>
              <li>Handles non-linear interactions</li>
              <li>Ideal for feature-rich datasets</li>
            </ul>
          </div>
        </div>
        
        <div className="shared-infrastructure-note">
          <p><strong>Shared Infrastructure:</strong> Both models use common data preparation and training pipelines for consistency</p>
        </div>
      </div>
    </div>
  );
}

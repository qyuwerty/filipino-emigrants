/**
 * ============================================
 * TAB NAVIGATION COMPONENT
 * ============================================
 * 
 * Provides navigation between main application sections:
 * - Dashboard: Charts and visualizations
 * - Data Management: CSV upload, data table, export
 * - AI Train Model: ML model training and forecasting
 */
import React from 'react';
import { 
  BarChart3, Database, Brain, Users, Globe, MapPin, Briefcase, 
  UserCheck, Heart, GraduationCap, Home 
} from 'lucide-react';

const TabNavigation = ({ activeTab, setActiveTab, userRole, hasData }) => {
  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'View charts and analytics',
      alwaysVisible: true
    },
    {
      id: 'data-management',
      label: 'Data Management',
      icon: Database,
      description: 'Upload, manage, and export data',
      alwaysVisible: true
    },
    {
      id: 'ai-model',
      label: 'AI Train Model',
      icon: Brain,
      description: 'Train ML models and forecast',
      alwaysVisible: isPrivileged
    }
  ];

  const visibleTabs = tabs.filter(tab => tab.alwaysVisible);

  return (
    <div className="tab-navigation">
      <div className="tab-nav">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              className={`tab-button ${isActive ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
              {tab.id === 'dashboard' && hasData && (
                <span className="tab-indicator">●</span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Tab Description */}
      <div className="tab-description">
        {visibleTabs.find(tab => tab.id === activeTab)?.description}
      </div>
    </div>
  );
};

export default TabNavigation;

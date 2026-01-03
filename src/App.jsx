import React, { useState, useRef, useMemo, useEffect } from "react";
import LoginForm from './components/LoginForm';  
import { AuthService } from './services/authService'; 
import CsvUploader from "./components/CsvUploader";
import DynamicChart from "./components/DynamicChart";
import DynamicMap from "./components/DynamicMap";
import StatusCombinedChart from "./components/StatusCombinedChart";
import { useAgeData } from './hooks/useAgeData';
import { useCountriesData } from './hooks/useCountriesData';
import { useMajorCountriesData } from './hooks/useMajorCountriesData';
import { useDatasetData } from './hooks/useDatasetData';
import AgeDataTable from "./components/AgeDataTable";
import AllCountriesTable from "./components/AllCountriesTable";
import MajorCountriesTable from "./components/MajorCountriesTable";
import DataTable from "./components/DataTable";
import ForecastPanel from "./components/ForecastPanel"; 
import TabNavigation from "./components/TabNavigation";
import DatasetNavigation from "./components/DatasetNavigation";
import useDynamicSchema from "./hooks/useDynamicSchema";
import ExportPanel from "./components/ExportPanel";
import { 
  BarChart3, Database, AlertCircle, CheckCircle2, Loader2, 
  FileSpreadsheet, TrendingUp, Upload, Download, 
  Brain, LogOut, Shield, FileText, Lock 
} from "lucide-react";

// ========== PERMISSION CONFIGURATION ==========
const PERMISSIONS = {
  ADMIN: [
    'upload_data',
    'manage_data',
    'delete_data',
    'clear_all_data',
    'view_dashboard',
    'export_data',
    'train_ml_models',
    'manage_users'
  ]
};

// ========== HELPER FUNCTIONS ==========
const hasPermission = (role, permission) => {
  return PERMISSIONS[role?.toUpperCase()]?.includes(permission) || false;
};

const getCollectionNameFromCsv = (rows = [], fallback = "emigrants") => {
  if (!Array.isArray(rows) || rows.length === 0) return fallback;
  const firstRow = rows[0];
  const columns = Object.keys(firstRow || {});
  if (!columns || columns.length === 0) return fallback;
  const firstColumnName = columns[0];
  if (!firstColumnName) return fallback;
  return firstColumnName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").trim() || fallback;
};

const App = () => {
  // ========== AUTHENTICATION STATE ==========
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // ========== DASHBOARD STATE ==========
  const [csvData, setCsvData] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(false);
  const [minYear, setMinYear] = useState(null);
  const [maxYear, setMaxYear] = useState(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeDataset, setActiveDataset] = useState('age');
  const fileInputRef = useRef(null);
  
  // ========== DATA HOOK ==========
  const collectionName = useMemo(() => getCollectionNameFromCsv(csvData), [csvData]);
  const { data, schema, types, loading, error, setData, datasetName } = useDynamicSchema(csvData, collectionName);
  
  // ========== DATASET HOOKS ==========
  const ageData = useAgeData();
  const countriesData = useCountriesData();
  const majorCountriesData = useMajorCountriesData();
  const allCountriesData = useDatasetData('all-countries');
  const majorCountriesDataOld = useDatasetData('major-countries');
  const occupationData = useDatasetData('occupation');
  const sexData = useDatasetData('sex');
  const civilStatusData = useDatasetData('civil-status');
  const educationData = useDatasetData('education');
  const placeOfOriginData = useDatasetData('place-of-origin');
  
  // ========== USER STATE ==========
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  
  // Check authentication on mount
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserRole(user.role);
        setUserEmail(user.email);
        localStorage.setItem('role', user.role);
        localStorage.setItem('email', user.email);
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  // ========== LOGIN HANDLER ==========
  const handleLogin = async (email, password) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const user = await AuthService.login(email, password);
      
      setIsAuthenticated(true);
      setUserRole(user.role);
      setUserEmail(user.email);
      
      localStorage.setItem('role', user.role);
      localStorage.setItem('email', user.email);
      
    } catch (err) {
      console.error('Login error:', err.message);
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ========== REGISTRATION HANDLER ==========
  const handleRegister = async (email, password, name, role) => {
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const user = await AuthService.register(email, password, name, role);
      
      setIsAuthenticated(true);
      setUserRole(user.role);
      setUserEmail(user.email);
      
      localStorage.setItem('role', user.role);
      localStorage.setItem('email', user.email);
      
      alert(`Account created successfully! Welcome, ${name}!`);
      
    } catch (err) {
      console.error('Registration error:', err.message);
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ========== LOGOUT HANDLER ==========
  const handleLogout = async () => {
    try {
      await AuthService.logout();
      
      setIsAuthenticated(false);
      setUserRole(null);
      setUserEmail('');
      setCsvData([]);
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setAuthError("Logout failed. Please try again.");
    }
  };

  // ========== CLEAR DATA HANDLER ==========
  const handleClearData = async () => {
    if (!hasPermission(userRole, 'clear_all_data')) {
      alert('Permission denied: Only administrators can clear data.');
      return;
    }
    
    try {
      const { clearCollection } = await import('./services/firestoreService');
      await clearCollection();
      setCsvData([]);
      setData([]);
      setUploadStatus(null);
      alert('All data cleared successfully.');
    } catch (err) {
      console.error("Failed to clear data:", err);
      alert('Failed to clear data. Please try again.');
    }
  };

  // ========== CSV UPLOAD HANDLER ==========
  const handleCsvUpload = async (rows) => {
    if (!hasPermission(userRole, 'upload_data')) {
      alert('Permission denied: Only administrators can upload data.');
      return;
    }
    
    try {
      setUploadStatus("uploading");
      
      const processedRows = rows.map(row => {
        const processedRow = {};
        Object.keys(row).forEach(key => {
          const value = row[key];
          if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
            processedRow[key] = Number(value);
          } else {
            processedRow[key] = value;
          }
        });
        return processedRow;
      });
      
      setCsvData(processedRows);
      
      const { overwriteCollection } = await import('./services/firestoreService');
      await overwriteCollection(processedRows);
      setUploadStatus("success");
      
      setTimeout(() => {
        setCsvData([]);
        setUploadStatus(null);
      }, 3000);
      
    } catch (err) {
      console.error("Failed to upload CSV:", err);
      setUploadStatus("error");
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  // ========== DASHBOARD STATISTICS ==========
  const stats = useMemo(() => {
    return {
      total: data.length,
      columns: schema.length
    };
  }, [data, schema]);

  const roleLabel = useMemo(() => {
    switch (userRole) {
      case 'super-admin':
        return '👑 Super Admin';
      case 'admin':
        return '👑 Administrator';
      case 'user':
        return '👤 Regular User';
      default:
        return '👤 Guest';
    }
  }, [userRole]);

  const roleChipClass = useMemo(() => {
    if (userRole === 'super-admin') return 'role-chip role-chip--super';
    if (userRole === 'admin') return 'role-chip role-chip--admin';
    return 'role-chip';
  }, [userRole]);

  const isPrivileged = userRole === 'super-admin' || userRole === 'admin';
  const hasData = data && data.length > 0;
  const greetingName = userEmail || 'Explorer';

  // ========== STATUS COLUMN DETECTION ==========
  const statusColumns = useMemo(() => {
    const statusKeywords = ["single", "married", "widower", "widowed", "separated", "divorced", "live_in", "live-in"];
    
    return schema.filter(col => {
      const colLower = col.toLowerCase().replace(/[-_/]/g, "");
      
      if (col.includes("_")) return false;
      
      return statusKeywords.some(keyword => {
        const keywordClean = keyword.replace(/[-_]/g, "");
        return colLower === keywordClean || colLower.includes(keywordClean) || keywordClean.includes(colLower);
      });
    });
  }, [schema]);

  // ========== COLUMN EXCLUSION ==========
  const excludedColumns = useMemo(() => {
    return new Set([
      "id",
      "createdAt",
      "updatedAt",
      "status",
      ...statusColumns
    ]);
  }, [statusColumns]);

  // ========== REGULAR COLUMNS ==========
  const regularColumns = useMemo(() => {
    return schema.filter(col => !excludedColumns.has(col));
  }, [schema, excludedColumns]);

  // ========== FILTERED DATA ==========
  const filteredData = useMemo(() => {
    if (minYear === null && maxYear === null) {
      return data;
    }
    
    return data.filter(record => {
      const recordYear = record.year;
      
      if (recordYear === null || recordYear === undefined) {
        return false;
      }
      
      const year = Number(recordYear);
      
      if (minYear !== null && year < minYear) {
        return false;
      }
      
      if (maxYear !== null && year > maxYear) {
        return false;
      }
      
      return true;
    });
  }, [data, minYear, maxYear]);

  // ========== YEAR RANGE DETECTION ==========
  const yearRange = useMemo(() => {
    if (data.length === 0) return { min: null, max: null };
    
    const years = data
      .map(record => record.year)
      .filter(year => year && year !== 0)
      .sort((a, b) => a - b);
    
    return {
      min: years.length > 0 ? years[0] : null,
      max: years.length > 0 ? years[years.length - 1] : null
    };
  }, [data]);

  // ========== RENDER LOGIN FORM ==========
  if (!isAuthenticated) {
    return (
      <LoginForm
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={authLoading}
        error={authError}
      />
    );
  }

  // ========== RENDER DASHBOARD ==========
  return (
    <div className="dashboard-shell">
      <div className="dashboard-grid">
        {!loading && !hasData ? (
          <section className="section-block section-block--hero">
            <div className="section-header">
              <div>
                <span className="section-kicker">Dashboard Overview</span>
                <h1 className="section-title">Welcome back, {greetingName}.</h1>
                <p className="section-description">
                  {userRole === 'super-admin'
                    ? 'You have full access to manage datasets, train models, and configure the platform.'
                    : userRole === 'admin'
                    ? 'Upload CSV data, manage records, and keep insights fresh for your team.'
                    : 'Browse the latest emigration insights and export what you need.'}
                </p>
              </div>
              <div className="section-toolbar">
                <span className={roleChipClass}>{roleLabel}</span>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to logout?')) {
                      handleLogout();
                    }
                  }}
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </div>

            <div className="section-stack">
              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-card__label">First step</span>
                  <span className="stat-card__value">
                    {isPrivileged ? 'Upload data' : 'Stay informed'}
                  </span>
                  <p className="stat-card__meta">
                    {isPrivileged
                      ? 'Bring a CSV file with a 4-digit year column to populate the dashboard.'
                      : 'An administrator will upload data soon—check back for insights.'}
                  </p>
                </div>
                <div className="stat-card">
                  <span className="stat-card__label">Your access</span>
                  <span className="stat-card__value">
                    {roleLabel.replace('👑 ', '').replace('👤 ', '')}
                  </span>
                  <p className="stat-card__meta">
                    {userRole === 'super-admin'
                      ? 'Full system controls, including ML training and data resets.'
                      : userRole === 'admin'
                      ? 'Upload, edit, and manage datasets for your organization.'
                      : 'Read-only access with export permissions.'}
                  </p>
                </div>
              </div>

              <div className="section-toolbar">
                {isPrivileged ? (
                  <button
                    className="button button--primary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    Import CSV Data
                  </button>
                ) : (
                  <button
                    className="button button--ghost"
                    onClick={() =>
                      alert('Please contact an administrator for CSV upload permissions.')
                    }
                  >
                    <Lock size={16} />
                    Request Upload Access
                  </button>
                )}
              </div>

              {isPrivileged && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      import('papaparse').then((Papa) => {
                        Papa.default.parse(file, {
                          header: true,
                          skipEmptyLines: true,
                          dynamicTyping: false,
                          complete: (results) => {
                            if (results.data && results.data.length > 0) {
                              handleCsvUpload(results.data);
                            }
                          },
                          error: (uploadError) => {
                            console.error('CSV parsing error:', uploadError);
                            setUploadStatus('error');
                            setTimeout(() => setUploadStatus(null), 5000);
                          }
                        });
                      });
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  style={{ display: 'none' }}
                />
              )}
            </div>
          </section>
        ) : (
          <>
            {/* Tab Navigation */}
            <TabNavigation 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              userRole={userRole}
              hasData={hasData}
            />

            {/* Dashboard Tab Content */}
            {activeTab === 'dashboard' && (
              <section className="section-block section-block--hero tab-content">
                <div className="section-header">
                  <div>
                    <span className="section-kicker">Live Dashboard</span>
                    <h1 className="section-title">Filipino Emigrants Dashboard</h1>
                    <p className="section-description">
                      Tracking {stats.total.toLocaleString()} records across {stats.columns} columns for {greetingName}.
                    </p>
                  </div>
                  <div className="section-toolbar">
                    <span className={roleChipClass}>{roleLabel}</span>
                    {hasData && isPrivileged && (
                      <>
                        <button
                          className="button button--subtle"
                          onClick={() => setIsForecastOpen(true)}
                        >
                          <Brain size={18} />
                          Train ML Model
                        </button>
                        <button
                          className="button button--ghost"
                          onClick={() => setShowExportPanel(true)}
                        >
                          <Download size={18} />
                          Export Data
                        </button>
                      </>
                    )}
                    <button
                      className="button button--ghost"
                      onClick={handleLogout}
                      title={`Logout ${userEmail} (${userRole})`}
                    >
                      <LogOut size={18} />
                      Logout
                    </button>
                  </div>
                </div>

                <div className="stat-grid">
                  <div className="stat-card">
                    <span className="stat-card__label">Total records</span>
                    <span className="stat-card__value">{stats.total.toLocaleString()}</span>
                    <p className="stat-card__meta">All ingested emigrant entries currently available.</p>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card__label">Schema columns</span>
                    <span className="stat-card__value">{stats.columns}</span>
                    <p className="stat-card__meta">Dynamic fields detected from the latest CSV uploads.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Data Management Tab Content */}
            {activeTab === 'data-management' && (
              <div className="tab-content">
                <section className="section-block tab-section">
                  <div className="section-header">
                    <div>
                      <span className="section-kicker">Data Management</span>
                      <h2 className="section-title">Filipino Emigrants Data</h2>
                      <p className="section-description">
                        Browse and manage emigrant data from 1981-2020 across various demographic categories.
                      </p>
                    </div>
                  </div>

                  {/* Dataset Sub-Navigation */}
                  <DatasetNavigation 
                    activeDataset={activeDataset} 
                    setActiveDataset={setActiveDataset} 
                  />

                  {/* Dataset Content Based on Active Selection */}
                  {activeDataset === 'age' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Age Distribution</h3>
                          <p className="section-description">
                            Emigrant data by age groups from 1981-2020
                          </p>
                        </div>
                      </div>
                      <AgeDataTable
                        data={ageData.data}
                        loading={ageData.loading}
                        error={ageData.error}
                        userRole={userRole}
                        onAdd={ageData.addRecord}
                        onUpdate={ageData.updateRecord}
                        onDelete={ageData.removeRecord}
                      />
                    </div>
                  )}

                  {activeDataset === 'all-countries' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">All Countries</h3>
                          <p className="section-description">
                            Complete emigrant data across all destination countries
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1981-2020-AllCountries.csv</span>
                      </div>
                      <AllCountriesTable
                        data={countriesData.data}
                        loading={countriesData.loading}
                        error={countriesData.error}
                        userRole={userRole}
                        onAdd={countriesData.addRecord}
                        onUpdate={countriesData.updateRecord}
                        onDelete={countriesData.deleteRecord}
                      />
                    </div>
                  )}

                  {activeDataset === 'major-countries' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Major Countries</h3>
                          <p className="section-description">
                            Emigrant data for major destination countries
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1981-2020-MajorCountry.csv</span>
                      </div>
                      <MajorCountriesTable
                        data={majorCountriesData.data}
                        loading={majorCountriesData.loading}
                        error={majorCountriesData.error}
                        userRole={userRole}
                        onAdd={majorCountriesData.addRecord}
                        onUpdate={majorCountriesData.updateRecord}
                        onDelete={majorCountriesData.deleteRecord}
                      />
                    </div>
                  )}

                  {activeDataset === 'occupation' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Occupation</h3>
                          <p className="section-description">
                            Emigrant data by occupation categories
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1981-2020-Occu.csv</span>
                      </div>
                      <DataTable
                        data={occupationData.data}
                        setData={occupationData.setData}
                        schema={schema}
                        types={types}
                        userRole={userRole}
                        loading={occupationData.loading}
                        error={occupationData.error}
                      />
                    </div>
                  )}

                  {activeDataset === 'sex' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Sex Distribution</h3>
                          <p className="section-description">
                            Emigrant data by gender from 1981-2020
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1981-2020-Sex.csv</span>
                      </div>
                      <DataTable
                        data={sexData.data}
                        setData={sexData.setData}
                        schema={schema}
                        types={types}
                        userRole={userRole}
                        loading={sexData.loading}
                        error={sexData.error}
                      />
                    </div>
                  )}

                  {activeDataset === 'civil-status' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Civil Status</h3>
                          <p className="section-description">
                            Emigrant data by marital status from 1988-2020
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1988-2020-CivilStatus.csv</span>
                      </div>
                      <DataTable
                        data={civilStatusData.data}
                        setData={civilStatusData.setData}
                        schema={schema}
                        types={types}
                        userRole={userRole}
                        loading={civilStatusData.loading}
                        error={civilStatusData.error}
                      />
                    </div>
                  )}

                  {activeDataset === 'education' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Education</h3>
                          <p className="section-description">
                            Emigrant data by educational attainment from 1988-2020
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1988-2020-Educ.csv</span>
                      </div>
                      <DataTable
                        data={educationData.data}
                        setData={educationData.setData}
                        schema={schema}
                        types={types}
                        userRole={userRole}
                        loading={educationData.loading}
                        error={educationData.error}
                      />
                    </div>
                  )}

                  {activeDataset === 'place-of-origin' && (
                    <div className="dataset-content">
                      <div className="section-header" style={{ padding: 0, marginBottom: '1rem' }}>
                        <div>
                          <h3 className="section-title--sm">Place of Origin</h3>
                          <p className="section-description">
                            Emigrant data by geographic origin from 1988-2020
                          </p>
                        </div>
                        <span className="role-chip">Emigrant-1988-2020-PlaceOfOrigin.csv</span>
                      </div>
                      <DataTable
                        data={placeOfOriginData.data}
                        setData={placeOfOriginData.setData}
                        schema={schema}
                        types={types}
                        userRole={userRole}
                        loading={placeOfOriginData.loading}
                        error={placeOfOriginData.error}
                      />
                    </div>
                  )}

                </section>
              </div>
            )}

            {/* AI Model Tab Content */}
            {activeTab === 'ai-model' && isPrivileged && (
              <div className="tab-content">
                <section className="section-block tab-section">
                  <div className="section-header">
                    <div>
                      <span className="section-kicker">AI & Analytics</span>
                      <h2 className="section-title">Machine Learning Models</h2>
                      <p className="section-description">
                        Train predictive models and generate forecasts for emigration trends.
                      </p>
                    </div>
                    <div className="section-toolbar">
                      <button
                        className="button button--primary"
                        onClick={() => setIsForecastOpen(true)}
                      >
                        <Brain size={18} />
                        Train ML Model
                      </button>
                    </div>
                </div>

                <div className="info-banner info-banner--progress">
                  <Brain size={20} />
                  <div>
                    <strong>AI Model Training</strong>
                    <div>Click "Train ML Model" to start building predictive models from your data.</div>
                  </div>
                </div>
              </section>
            </div>
            )}

          </>
        )}

        {loading && (
          <section className="section-block section-block--muted">
            <Loader2 className="animate-spin" size={48} />
            <p className="section-description" style={{ marginTop: '0.5rem' }}>
              Loading your data… fetching information from the database.
            </p>
          </section>
        )}

        {!loading && error && (
          <section className="section-block section-block--muted">
            <div className="info-banner info-banner--error">
              <AlertCircle size={24} />
              <div>
                <strong>Error loading data</strong>
                <div>{error}</div>
              </div>
            </div>
          </section>
        )}

        {!loading && !hasData && (
          <section className="section-block section-block--muted">
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileSpreadsheet size={40} />
              </div>
              <h3 className="empty-state__title">No data available yet</h3>
              <p className="empty-state__subtitle">
                {isPrivileged
                  ? 'Upload a CSV file to populate the dashboard with records and visualizations.'
                  : 'No data has been uploaded yet. Please check back later or contact the administrator.'}
              </p>
            </div>
          </section>
        )}
      </div>

      {isForecastOpen && (
        <ForecastPanel
          data={filteredData}
          isOpen={isForecastOpen}
          onClose={() => setIsForecastOpen(false)}
        />
      )}

      {showExportPanel && (
        <ExportPanel
          isOpen={showExportPanel}
          onClose={() => setShowExportPanel(false)}
          data={filteredData}
          chartsData={{
            statusColumns,
            regularColumns: regularColumns.filter((variable) => {
              const lowerVar = variable.toLowerCase();
              const isYearColumn =
                lowerVar.includes('year') || lowerVar.includes('date');
              const isStatusColumn = statusColumns
                ? statusColumns.includes(variable)
                : false;
              return !isYearColumn && !isStatusColumn;
            }),
            types
          }}
          schema={schema}
        />
      )}
    </div>
  );
};

export default App;

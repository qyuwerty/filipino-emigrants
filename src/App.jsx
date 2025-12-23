import React, { useState, useRef, useMemo, useEffect } from "react";
import LoginForm from './components/LoginForm';  
import { AuthService } from './services/authService'; 
import CsvUploader from "./components/CsvUploader";
import DynamicChart from "./components/DynamicChart";
import DynamicMap from "./components/DynamicMap";
import StatusCombinedChart from "./components/StatusCombinedChart";
import DataTable from "./components/DataTable";
import ForecastPanel from "./components/ForecastPanel"; 
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
  const fileInputRef = useRef(null);
  
  // ========== DATA HOOK ==========
  const { data, schema, types, loading, error, setData } = useDynamicSchema(csvData);
  
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
            <section className="section-block section-block--hero">
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

            <section className="section-block">
              <div className="section-header">
                <div>
                  <span className="section-kicker">Data Intake</span>
                  <h2 className="section-title">CSV Data Upload</h2>
                  <p className="section-description">
                    Refresh the dataset by importing a CSV file that contains a four-digit year column and related metrics.
                  </p>
                </div>
              </div>

              <CsvUploader
                onCsvData={handleCsvUpload}
                onClearData={handleClearData}
                userRole={userRole}
                isAuthenticated={isAuthenticated}
              />

              {uploadStatus === 'uploading' && (
                <div className="info-banner info-banner--progress">
                  <Loader2 className="animate-spin" size={20} />
                  <div>
                    <strong>Uploading your data…</strong>
                    <div>Please wait while we process your file.</div>
                  </div>
                </div>
              )}
              {uploadStatus === 'success' && (
                <div className="info-banner info-banner--success">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>Upload successful</strong>
                    <div>Your data is now available in the dashboard.</div>
                  </div>
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="info-banner info-banner--error">
                  <AlertCircle size={20} />
                  <div>
                    <strong>Upload failed</strong>
                    <div>Please check your file and try again.</div>
                  </div>
                </div>
              )}
            </section>

            <section className="section-block">
              <div className="section-header">
                <div>
                  <span className="section-kicker">Records</span>
                  <h2 className="section-title">Data Table</h2>
                  <p className="section-description">
                    Review, edit, add, or delete records directly from the structured table below.
                  </p>
                </div>
              </div>

              <DataTable
                data={data}
                setData={setData}
                schema={schema}
                types={types}
                userRole={userRole}
              />
            </section>
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

        {!loading && hasData && (
          <section className="section-block">
            <div className="section-header">
              <div>
                <span className="section-kicker">Insights</span>
                <h2 className="section-title">Charts &amp; Visualizations</h2>
                <p className="section-description">
                  Use filters and charts to explore how emigration trends change across years and categories.
                </p>
              </div>
            </div>

            <div className="section-stack">
              {yearRange.min !== null && yearRange.max !== null && (
                <div className="muted-slab muted-slab--soft">
                  <h3 className="section-title--sm">Filter by Year Range</h3>
                  <p className="section-description">
                    Narrow down records between {yearRange.min} and {yearRange.max}.
                  </p>
                  <div className="year-range-grid">
                    <div className="muted-slab">
                      <label className="stat-card__label" style={{ letterSpacing: '0.08em' }}>From Year</label>

                      <input
                        type="number"
                        min={yearRange.min}
                        max={yearRange.max}
                        value={minYear !== null ? minYear : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? null : Number(value);

                          if (numValue !== null) {
                            if (numValue < yearRange.min) {
                              setMinYear(yearRange.min);
                            } else if (numValue > yearRange.max) {
                              setMinYear(yearRange.max);
                            } else if (maxYear !== null && numValue > maxYear) {
                              setMinYear(numValue);
                              setMaxYear(numValue);
                            } else {
                              setMinYear(numValue);
                            }
                          } else {
                            setMinYear(null);
                          }
                        }}
                        placeholder={`Start from ${yearRange.min}`}
                        className="input-field"
                        style={{ color: 'black', caretColor: 'black' }}
                      />
                    </div>
                    <div className="muted-slab">
                      <label className="stat-card__label" style={{ letterSpacing: '0.08em' }}>To Year</label>

                      <input
                        type="number"
                        min={yearRange.min}
                        max={yearRange.max}
                        value={maxYear !== null ? maxYear : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? null : Number(value);

                          if (numValue !== null) {
                            if (numValue < yearRange.min) {
                              setMaxYear(yearRange.min);
                            } else if (numValue > yearRange.max) {
                              setMaxYear(yearRange.max);
                            } else if (minYear !== null && numValue < minYear) {
                              setMaxYear(numValue);
                              setMinYear(numValue);
                            } else {
                              setMaxYear(numValue);
                            }
                          } else {
                            setMaxYear(null);
                          }
                        }}
                        placeholder={`End at ${yearRange.max}`}
                        className="input-field"
                        style={{ color: 'black', caretColor: 'black' }}
                      />
                    </div>
                  </div>
                  <div className="section-toolbar" style={{ marginTop: '0.75rem' }}>
                    <span className="stat-card__meta">
                      Showing {filteredData.length} of {data.length} records.
                    </span>
                    {(minYear !== null || maxYear !== null) && (
                      <button
                        className="button button--ghost"
                        onClick={() => {
                          setMinYear(null);
                          setMaxYear(null);
                        }}
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
              )}

              {statusColumns.length > 0 && (
                <div className="muted-slab muted-slab--soft">
                  <div className="section-header" style={{ padding: 0 }}>
                    <div>
                      <h3 className="section-title--sm">Status Breakdown</h3>
                      <p className="section-description">
                        Combined view of all marital status categories by year.
                      </p>
                    </div>
                    <span className="role-chip">Combined View</span>
                  </div>
                  <StatusCombinedChart
                    data={filteredData}
                    statusColumns={statusColumns}
                    types={types}
                  />
                </div>
              )}

              <div className="chart-grid">
                {regularColumns
                  .filter((variable) => {
                    const lowerVar = variable.toLowerCase();
                    const isYearColumn =
                      lowerVar.includes('year') || lowerVar.includes('date');
                    const isStatusColumn = statusColumns
                      ? statusColumns.includes(variable)
                      : false;
                    return !isYearColumn && !isStatusColumn;
                  })
                  .map((variable) => (
                    <div key={variable} className="muted-slab muted-slab--soft">
                      <div className="section-header" style={{ padding: 0 }}>
                        <div>
                          <h3 className="section-title--sm">{variable}</h3>
                          <p className="section-description" style={{ marginTop: '0.25rem' }}>
                            Data type: {types[variable] || 'unknown'}
                          </p>
                        </div>
                        <span className="role-chip" style={{ fontSize: '0.7rem' }}>
                          {types[variable] || 'unknown'}
                        </span>
                      </div>

                      {(variable.toLowerCase().includes('origin') ||
                        variable.toLowerCase().includes('destination') ||
                        variable.toLowerCase().includes('place')) ? (
                        <DynamicMap data={filteredData} variable={variable} />
                      ) : (
                        <DynamicChart data={filteredData} variable={variable} types={types} />
                      )}
                    </div>
                  ))}
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
}

export default App;
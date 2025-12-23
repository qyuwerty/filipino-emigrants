import React, { useEffect, useMemo, useState } from 'react';

import { X, Download, FileText, PieChart, BarChart3, Table } from 'lucide-react';
import ExportService from '../services/ExportService';

const ExportPanel = ({ isOpen, onClose, data, chartsData, schema }) => {
  const [exportFormat, setExportFormat] = useState('docx');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const availableRecords = data?.length ?? 0;
  const chartCount = chartsData?.regularColumns?.length ?? 0;
  const columnCount = schema?.length ?? 0;

  const formatDescription = useMemo(() => (
    exportFormat === 'docx'
      ? 'Generates a polished briefing document with charts, filters, and sample records.'
      : 'Downloads the raw dataset as a CSV for spreadsheets and further analysis.'
  ), [exportFormat]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (includeTable) {
        await ExportService.exportTableToCsv({ data, schema });
      }

      if (includeCharts && exportFormat === 'docx') {
        await ExportService.exportChartsToDocx({ chartsData, schema, records: data });
      }

      alert('Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-panel" role="presentation" onClick={onClose}>
      <div className="export-panel__backdrop" aria-hidden />
      <div
        className="export-panel__dialog animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="export-panel__header">
          <div className="export-panel__icon">
            <Download size={22} />
          </div>
          <div className="export-panel__titles">
            <h2 id="export-panel-title" className="export-panel__title">Export data & insights</h2>
            <p className="export-panel__subtitle">Package your dataset with charts in a polished briefing.</p>
          </div>
          <button
            type="button"
            className="export-panel__close button button--ghost"
            onClick={onClose}
            aria-label="Close export panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="export-panel__body">
          <section className="export-panel__section">
            <header className="export-panel__section-header">
              <span className="section-kicker">Format</span>
              <h3 className="section-title--sm">Choose your download type</h3>
              <p className="section-description">{formatDescription}</p>
            </header>

            <div className="export-panel__format-grid">
              <button
                type="button"
                className={`export-option ${exportFormat === 'docx' ? 'export-option--active' : ''}`}
                onClick={() => setExportFormat('docx')}
              >
                <FileText size={26} />
                <div>
                  <span className="export-option__title">DOCX report</span>
                  <span className="export-option__meta">Charts + narrative summary</span>
                </div>
              </button>
              <button
                type="button"
                className={`export-option ${exportFormat === 'csv' ? 'export-option--active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <Table size={26} />
                <div>
                  <span className="export-option__title">CSV data</span>
                  <span className="export-option__meta">Raw table with all fields</span>
                </div>
              </button>
            </div>
          </section>

          <section className="export-panel__section">
            <header className="export-panel__section-header">
              <span className="section-kicker">Content</span>
              <h3 className="section-title--sm">What would you like to include?</h3>
            </header>

            <div className="export-panel__toggle-list">
              <label className={`export-toggle ${includeCharts ? 'export-toggle--active' : ''}`}>
                <div className="export-toggle__leading">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(event) => setIncludeCharts(event.target.checked)}
                  />
                  <div className="export-toggle__icon export-toggle__icon--purple">
                    <BarChart3 size={18} />
                  </div>
                </div>
                <div className="export-toggle__details">
                  <span className="export-toggle__title">Charts & visualizations</span>
                  <span className="export-toggle__meta">Attach the dashboard visuals and filters.</span>
                </div>
              </label>

              <label className={`export-toggle ${includeTable ? 'export-toggle--active' : ''}`}>
                <div className="export-toggle__leading">
                  <input
                    type="checkbox"
                    checked={includeTable}
                    onChange={(event) => setIncludeTable(event.target.checked)}
                  />
                  <div className="export-toggle__icon export-toggle__icon--green">
                    <Table size={18} />
                  </div>
                </div>
                <div className="export-toggle__details">
                  <span className="export-toggle__title">Structured data table</span>
                  <span className="export-toggle__meta">Download every record with its columns.</span>
                </div>
              </label>
            </div>
          </section>

          <section className="export-panel__section export-panel__section--summary">
            <div className="export-summary">
              <div className="export-summary__header">
                <PieChart size={18} />
                <div>
                  <span className="export-summary__title">Export summary</span>
                  <span className="export-summary__meta">A snapshot of what will be packaged.</span>
                </div>
              </div>
              <div className="export-summary__grid">
                <div className="export-summary__item">
                  <span className="export-summary__value">{availableRecords}</span>
                  <span className="export-summary__label">Records</span>
                </div>
                <div className="export-summary__item">
                  <span className="export-summary__value">{columnCount}</span>
                  <span className="export-summary__label">Columns</span>
                </div>
                <div className="export-summary__item">
                  <span className="export-summary__value">{chartCount}</span>
                  <span className="export-summary__label">Charts</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="export-panel__footer">
          <div className="export-panel__note">
            Exports are generated on-demand. Large datasets may take a moment.
          </div>
          <div className="export-panel__actions">
            <button
              type="button"
              className="button button--ghost"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button--accent export-panel__submit"
              onClick={handleExport}
              disabled={isExporting || (!includeCharts && !includeTable)}
            >
              {isExporting ? 'Preparing export…' : (
                <span className="export-panel__submit-content">
                  <Download size={16} />
                  Start export
                </span>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ExportPanel;
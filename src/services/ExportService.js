const DEFAULT_CSV_FILENAME = 'emigrants-data.csv';
const DEFAULT_DOCX_FILENAME = 'emigrants-report.doc';

function downloadBlob({ blob, fileName }) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function downloadFile({ content, fileName, mimeType }) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob({ blob, fileName });
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPreviewTable({ records = [], schema = [], sampleSize = 5 }) {
  if (!records.length || !schema.length) {
    return '<p>No sample data available.</p>';
  }

  const sampleRows = records.slice(0, sampleSize);
  const headerRow = schema.map((column) => `<th>${column}</th>`).join('');
  const bodyRows = sampleRows
    .map((row) => {
      const cells = schema.map((column) => `<td>${escapeHtml(row?.[column])}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

const ExportService = {
  exportTableToCsv({ data = [], schema = [], fileName = DEFAULT_CSV_FILENAME } = {}) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array to export.');
    }

    const headers = Array.isArray(schema) && schema.length ? schema : Object.keys(data[0] ?? {});

    const escapeCell = (raw) => {
      if (raw === null || raw === undefined) return '';
      const value = String(raw);
      if (/[,"\n\r]/.test(value)) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    };

    const headerRow = headers.map(escapeCell).join(',');
    const rows = data.map((row) => (
      headers.map((header) => {
        const cell = row?.[header];
        if (typeof cell === 'object' && cell !== null) {
          if (cell.value !== undefined) return escapeCell(cell.value);
          return escapeCell(JSON.stringify(cell));
        }
        return escapeCell(cell);
      }).join(',')
    ));

    const csvContent = [headerRow, ...rows].join('\r\n');

    downloadFile({
      content: csvContent,
      fileName,
      mimeType: 'text/csv;charset=utf-8;'
    });
  },

  async exportChartsToDocx({ chartsData = {}, schema = [], records = [], fileName = DEFAULT_DOCX_FILENAME } = {}) {
    const { regularColumns = [], statusColumns = [], filters = {}, yearRange = {} } = chartsData;

    const summaryHtml = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Emigrants Report</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; color: #0b1623; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-top: 24px; }
            ul { margin-top: 8px; padding-left: 20px; }
            table { border-collapse: collapse; width: 100%; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 13px; }
            th { background: #f1f5f9; text-transform: uppercase; letter-spacing: 0.04em; }
          </style>
        </head>
        <body>
          <h1>Filipino Emigrants Dashboard Summary</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>

          <h2>Dataset Overview</h2>
          <ul>
            <li>Total records: <strong>${records.length}</strong></li>
            <li>Available fields: <strong>${schema.join(', ') || 'n/a'}</strong></li>
            <li>Charts rendered: <strong>${regularColumns.length}</strong></li>
            <li>Status series: <strong>${statusColumns.join(', ') || 'n/a'}</strong></li>
            <li>Active filters: ${Object.keys(filters).length ? JSON.stringify(filters, null, 2) : 'none'}</li>
            <li>Year range: ${yearRange.min ?? '—'} to ${yearRange.max ?? '—'}</li>
          </ul>

          <h2>Sample Records</h2>
          ${buildPreviewTable({ records, schema })}
        </body>
      </html>`;

    const blob = new Blob([summaryHtml], { type: 'application/msword' });
    downloadBlob({ blob, fileName });
  }
};

export default ExportService;
export const hasAmount = (value) => typeof value === 'number' && Number.isFinite(value);

export function money(value, currency = 'USD') {
  if (!hasAmount(value)) return 'Not verified';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
}

export function dateLabel(value, compact = false) {
  if (!value) return 'Date not recorded';
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return new Date(`${value}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', ...(compact ? {} : {day: 'numeric'}), year: 'numeric' });
}

export function settledTotal(rows, currency = 'USD') {
  return rows.reduce((sum, row) => {
    if (row.currency !== currency || !hasAmount(row.amount)) return sum;
    if (row.status === 'paid') return sum + Math.round(row.amount * 100);
    if (row.status === 'refunded') return sum - Math.round(row.amount * 100);
    return sum;
  }, 0) / 100;
}

export function safeUrl(value) {
  if (!value) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export function exportCsv(rows) {
  const quote = (value) => {
    let text = String(value ?? '');
    if (/^[=+@\t\r]/.test(text) || (/^-/.test(text) && !/^-\d+(\.\d+)?$/.test(text))) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const entries = [['Date', 'Expense', 'Provider', 'Category', 'Amount', 'Currency', 'Status', 'Source', 'Note'], ...rows.map(row => [row.date, row.label, row.provider, row.category, row.amount, row.currency, row.status, row.source, row.note])];
  const blob = new Blob(['\uFEFF' + entries.map(row => row.map(quote).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'apoorv-uopeople-expenses.csv';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

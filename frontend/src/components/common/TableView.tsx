import React from 'react';

interface TableViewProps {
  tableMarkdown: string;
}

const isIdHeader = (h: string) => {
  const n = h.trim().toLowerCase();
  return n === 'id' || n === '_id' || n === 'identifier' || n === 'uid';
};

export const TableView: React.FC<TableViewProps> = ({ tableMarkdown }) => {
  // Parse a simple GFM pipe table block into headers and rows
  const lines = tableMarkdown.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const headers = headerLine.split('|').map((c) => c.trim()).filter((c) => c !== '');

  // find columns to hide (id-like)
  const hideIdxs = headers.map((h, i) => (isIdHeader(h) ? i : -1)).filter((i) => i >= 0);

  // remaining data rows
  const dataLines = lines.slice(2); // skip separator
  const rows = dataLines.map((ln) => ln.split('|').map((c) => c.trim()).filter((c) => c !== ''));

  // helper to render cell while skipping hidden columns
  const renderRow = (cells: string[]) => (
    <tr>
      {cells.map((cell, i) => (hideIdxs.includes(i) ? null : (
        <td key={i} className="agent-table-td">{cell}</td>
      )))}
    </tr>
  );

  return (
    <div className="agent-table-container">
      <table className="agent-table">
        <thead>
          <tr>
            {headers.map((h, i) => (hideIdxs.includes(i) ? null : (
              <th key={i} className="agent-table-th">{h}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <React.Fragment key={idx}>{renderRow(r)}</React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;

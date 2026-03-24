interface TableProps {
  columns: string[];
  rows: string[][];
}

export default function Table({ columns, rows }: TableProps) {
  if (!columns || !rows) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary">
            {columns.map((col, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-semibold text-secondary-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-b-0 even:bg-muted/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-card-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

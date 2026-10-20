import type { ReactNode } from 'react';
import classNames from 'classnames';

import './table.css';

export type TableCellValue = ReactNode;

export interface TableProps {
  headers: ReactNode[];
  rows: TableCellValue[][];
  caption?: ReactNode;
  /**
   * When true, the first header cell spans the first two body columns.
   * Body rows should then include one more cell than `headers.length`.
   */
  spanFirstHeaderAcrossTwoColumns?: boolean;
  /**
   * When true, numeric cells are shaded (negative: accent secondary,
   * positive: accent tertiary) and positive values are shown with a leading +.
   */
  highlightSignedNumbers?: boolean;
  className?: string;
  selectedRowIndex?: number | null;
  onRowClick?: (rowIndex: number) => void;
}

function isNumericCell(value: TableCellValue): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function renderCellContent(
  value: TableCellValue,
  highlightSignedNumbers: boolean
): ReactNode {
  if (!highlightSignedNumbers || !isNumericCell(value)) {
    return value;
  }
  return value > 0 ? `+${value}` : value;
}

function cellHighlightClass(
  value: TableCellValue,
  highlightSignedNumbers: boolean
): string | undefined {
  if (!highlightSignedNumbers || !isNumericCell(value)) {
    return undefined;
  }
  if (value < 0) {
    return 'data-table__cell--negative';
  }
  if (value > 0) {
    return 'data-table__cell--positive';
  }
  return undefined;
}

export default function Table({
  headers,
  rows,
  caption,
  spanFirstHeaderAcrossTwoColumns = false,
  highlightSignedNumbers = false,
  className,
  selectedRowIndex = null,
  onRowClick
}: TableProps) {
  return (
    <div className={classNames('data-table-scroll', className)}>
      <table className="data-table">
        {caption != null && <caption>{caption}</caption>}
        <thead>
          <tr>
            {headers.map((header, index) => {
              if (index === 0 && spanFirstHeaderAcrossTwoColumns) {
                return (
                  <th key={index} scope="col" colSpan={2}>
                    {header}
                  </th>
                );
              }
              return (
                <th key={index} scope="col">
                  {header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={classNames({
                'data-table__row--selectable': Boolean(onRowClick),
                'data-table__row--selected': selectedRowIndex === rowIndex
              })}
              aria-selected={onRowClick ? selectedRowIndex === rowIndex : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onRowClick(rowIndex);
                      }
                    }
                  : undefined
              }
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cellHighlightClass(cell, highlightSignedNumbers)}
                >
                  {renderCellContent(cell, highlightSignedNumbers)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

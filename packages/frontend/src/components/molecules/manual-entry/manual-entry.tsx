import { useState } from 'react';
import { Button, Flex, Input, Select } from 'antd';

import '../table/table.css';
import './manual-entry.css';

export interface ManualEntryProps {
  columns: number;
  headers?: string[];
  /**
   * Acceptable values for each column. A column with values renders a
   * dropdown; a column without values stays a text field.
   */
  columnOptions?: readonly (readonly string[] | undefined)[];
  value?: string[][];
  onChange?: (rows: string[][]) => void;
}

function emptyRow(columns: number): string[] {
  return Array.from({ length: columns }, () => '');
}

export default function ManualEntry({
  columns,
  headers,
  columnOptions,
  value,
  onChange
}: ManualEntryProps) {
  const [internalRows, setInternalRows] = useState<string[][]>(() => [
    emptyRow(columns)
  ]);
  const rows = value ?? internalRows;

  function updateRows(nextRows: string[][]) {
    if (value === undefined) {
      setInternalRows(nextRows);
    }
    onChange?.(nextRows);
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    updateRows(
      rows.map((row, index) =>
        index === rowIndex
          ? row.map((cell, cellIndex) =>
              cellIndex === columnIndex ? value : cell
            )
          : row
      )
    );
  }

  function addRow() {
    updateRows([...rows, emptyRow(columns)]);
  }

  return (
    <Flex className="manual-entry" vertical gap={8}>
      <div className="data-table-scroll">
        <table className="data-table">
          {headers && headers.length > 0 ? (
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, columnIndex) => {
                  const choices = columnOptions?.[columnIndex];
                  return (
                    <td key={columnIndex}>
                      {choices ? (
                        <Select
                          value={cell || undefined}
                          options={choices.map((choice) => ({
                            value: choice,
                            label: choice
                          }))}
                          onChange={(next) =>
                            updateCell(rowIndex, columnIndex, next ?? '')
                          }
                        />
                      ) : (
                        <Input
                          value={cell}
                          onChange={(event) =>
                            updateCell(
                              rowIndex,
                              columnIndex,
                              event.target.value
                            )
                          }
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button aria-label="Add row" htmlType="button" onClick={addRow}>
        +
      </Button>
    </Flex>
  );
}

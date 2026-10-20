import { Flex, Typography } from 'antd';
import Table, {
  type TableCellValue
} from '../table/table';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import type { CharacterRecord } from '../../../api/characters';

import './character-creation-step.css';

export interface TableSelectorColumn<T> {
  header: string;
  value: (item: T) => TableCellValue;
}

export interface TableSelectorTable<T extends object> {
  data: T[];
  /** Character record field that stores the selected row object. */
  target: string;
  caption?: string;
}

interface TableSelectorProps<T extends object> {
  columns: TableSelectorColumn<T>[];
  tables: TableSelectorTable<T>[];
  getRowKey: (item: T) => string;
  instructions?: string;
  className?: string;
}

function storedRowKey<T extends object>(
  stored: unknown,
  getRowKey: (item: T) => string
): string | null {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return null;
  }
  return getRowKey(stored as T);
}

export default function TableSelector<T extends object>({
  columns,
  tables,
  getRowKey,
  instructions,
  className
}: TableSelectorProps<T>) {
  const { character, setDraft } = useCharacterCreation();
  const record = character?.characterRecord;

  function selectRow(target: string, item: T) {
    if (!record) {
      return;
    }
    const nextRecord: CharacterRecord = {
      ...record,
      [target]: item
    };
    setDraft(nextRecord);
  }

  return (
    <Flex className="table-selector" vertical gap={24}>
      {instructions ? (
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {instructions}
        </Typography.Paragraph>
      ) : null}
      {tables.map((table) => {
        const selectedKey = storedRowKey(record?.[table.target], getRowKey);
        const selectedRowIndex = table.data.findIndex(
          (item) => getRowKey(item) === selectedKey
        );

        return (
          <Table
            key={table.target}
            className={className}
            caption={table.caption}
            headers={columns.map((column) => column.header)}
            rows={table.data.map((item) =>
              columns.map((column) => column.value(item))
            )}
            selectedRowIndex={selectedRowIndex >= 0 ? selectedRowIndex : null}
            onRowClick={(rowIndex) => {
              const item = table.data[rowIndex];
              if (item) {
                selectRow(table.target, item);
              }
            }}
          />
        );
      })}
    </Flex>
  );
}

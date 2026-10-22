import { Flex } from 'antd';
import Monitor from '../../atom/monitor/monitor';
import Table from '../table/table';

import './armor.css';

export interface ArmorGearItem {
  name: string;
  cp: number;
  category: string;
  equipped: boolean;
}

export interface ArmorProps {
  gear: ArmorGearItem[];
  current?: number | null;
  onChange?: (current: number | null) => void;
  showMonitor?: boolean;
  showPieces?: boolean;
}

function armorPoints(cp: number) {
  return cp / 3;
}

export default function Armor({
  gear,
  current,
  onChange,
  showMonitor = true,
  showPieces = true
}: ArmorProps) {
  const pieces = gear.filter((item) => item.category === 'armor' && item.equipped);
  const max = pieces.reduce((total, piece) => total + armorPoints(piece.cp), 0);
  const monitor = <Monitor max={max} current={current} onChange={onChange} />;
  const table = (
    <Table
      className="armor__pieces"
      headers={['Piece', 'AP', 'CP']}
      rows={pieces.map((piece) => [
        piece.name,
        armorPoints(piece.cp),
        piece.cp
      ])}
    />
  );

  if (!showPieces) {
    return monitor;
  }
  if (!showMonitor) {
    return table;
  }

  return (
    <Flex className="armor" align="start" gap={12}>
      {monitor}
      {table}
    </Flex>
  );
}

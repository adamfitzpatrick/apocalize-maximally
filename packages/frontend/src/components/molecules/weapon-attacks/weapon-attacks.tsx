import Table from '../table/table';

import './weapon-attacks.css';

const HEADERS = ['Weapon', 'DC', 'THLD', '1/2', '1/4', 'CP'];

export interface WeaponAttackItem {
  name: string;
  cp: number | null;
  dc: string | null;
  threshold: number | null;
}

function derivedCells(threshold: number | null) {
  if (threshold === null) {
    return ['', '', ''];
  }
  return [threshold, Math.floor(threshold / 2), Math.floor(threshold / 4)];
}

export default function WeaponAttacks({ weapons }: { weapons: WeaponAttackItem[] }) {
  return (
    <Table
      className="weapon-attacks"
      headers={HEADERS}
      rows={weapons.map((weapon) => [
        weapon.name,
        weapon.dc ?? '',
        ...derivedCells(weapon.threshold),
        weapon.cp ?? '—'
      ])}
    />
  );
}

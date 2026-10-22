import Table from '../table/table';

import './defensive-actions.css';

export interface DefensiveActionsProps {
  dodge: number;
  strength: number;
  parry: number | null;
}

function derivedCells(threshold: number | null) {
  if (threshold === null) {
    return ['', '', ''];
  }
  return [threshold, Math.floor(threshold / 2), Math.floor(threshold / 4)];
}

export default function DefensiveActions({ dodge, strength, parry }: DefensiveActionsProps) {
  const fullDodge = dodge + Math.floor(strength / 2);

  return (
    <Table
      className="defensive-actions"
      headers={['Defensive Action', 'THLD', '1/2', '1/4']}
      rows={[
        ['Dodge', ...derivedCells(dodge)],
        ['Full Dodge (init -5)', ...derivedCells(fullDodge)],
        ['Parry', ...derivedCells(parry)],
        ['Riposte (init -3)', ...derivedCells(parry)]
      ]}
    />
  );
}

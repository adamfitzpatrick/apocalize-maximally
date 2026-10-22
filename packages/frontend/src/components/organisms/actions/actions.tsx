import { useState } from 'react';
import { Segmented, Typography } from 'antd';
import DefensiveActions from '../../molecules/defensive-actions/defensive-actions';
import WeaponAttacks, { type WeaponAttackItem } from '../../molecules/weapon-attacks/weapon-attacks';
import type Character from '../../../entities/character';

import './actions.css';

function weaponAttacks(character: Character): WeaponAttackItem[] {
  return [
    ...character.carriedGear
      .filter((item) => item.category === 'weapon' && item.equipped)
      .map((item) => ({
        name: item.name,
        cp: item.cp,
        dc: item.dc ?? null,
        threshold: item.skill ? character.getSkillThreshold(item.skill) : null
      })),
    {
      name: 'Unarmed (Brawl)',
      cp: null,
      dc: character.unarmedDamageCode,
      threshold: character.getSkillThreshold('Brawl')
    }
  ];
}

function Defense({ character }: { character: Character }) {
  return (
    <DefensiveActions
      dodge={character.dodge}
      strength={character.strength}
      parry={character.parry}
    />
  );
}

const ACTION_VIEWS = ['Defense', 'Attack'] as const;
type ActionView = (typeof ACTION_VIEWS)[number];

export function Actions({ character }: { character: Character }) {
  return (
    <section className="actions">
      <Typography.Title level={4}>ACTIONS</Typography.Title>
      <div className="actions__columns">
        <Defense character={character} />
        <WeaponAttacks weapons={weaponAttacks(character)} />
      </div>
    </section>
  );
}

export function ActionsMobile({ character }: { character: Character }) {
  const [view, setView] = useState<ActionView>('Defense');

  return (
    <section className="actions">
      <Typography.Title level={4}>ACTIONS</Typography.Title>
      <Segmented
        block
        className="actions__switch"
        options={[...ACTION_VIEWS]}
        value={view}
        onChange={(value) => setView(value as ActionView)}
      />
      {view === 'Defense' ? (
        <Defense character={character} />
      ) : (
        <WeaponAttacks weapons={weaponAttacks(character)} />
      )}
    </section>
  );
}

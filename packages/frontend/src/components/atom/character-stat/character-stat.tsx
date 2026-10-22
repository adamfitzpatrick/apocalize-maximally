import { Flex, Typography } from 'antd';
import './character-stat.css';

export interface CharacterStatProps {
  label: string;
  value: number;
  showDerived?: boolean;
}

export default function CharacterStat({ label, value, showDerived }: CharacterStatProps) {
  const halfValue = Math.floor(value / 2);
  const quarterValue = Math.floor(value / 4);

  return (
    <Flex
      className="character-stat"
      role='group'
      aria-label={label}
      title={label}
      justify="center"
    >
      <Flex
        vertical
        align='center'
        justify='center'
        className="character-stat__value"
      >
        <Typography.Text strong>{label}</Typography.Text>
        <Typography.Text className="character-stat__value-text">{value}</Typography.Text>
      </Flex>
      {showDerived && <Flex
        className="character-stat__derived"
        align="center"
        justify="space-between"
        vertical
      >
        <Flex
          className="character-stat__derived-block"
          vertical
          align="center"
        >
          <Typography.Text className="character-stat__derived-value">
            {halfValue}
          </Typography.Text>
          <Typography.Text className="character-stat__label">1/2</Typography.Text>
        </Flex>
        <Typography.Text className="character-stat__derived-value">
          {quarterValue}
        </Typography.Text>
        <Typography.Text className="character-stat__label">1/4</Typography.Text>
      </Flex>
      }
    </Flex>
  );
  /*       
    <Flex
      className="character-stat"
      vertical
      align="center"
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <Typography.Text strong>{label}</Typography.Text>
      <Typography.Text className="character-stat__value" strong>
        {value}
      </Typography.Text>
      <Flex className="character-stat__derived" vertical>
        <Flex className="character-stat__values">
          <Typography.Text className="character-stat__derived-value">
            {halfValue}
          </Typography.Text>
          <Typography.Text className="character-stat__derived-value">
            {quarterValue}
          </Typography.Text>
        </Flex>
        <Flex className="character-stat__labels">
          <Typography.Text className="character-stat__label">1/2</Typography.Text>
          <Typography.Text className="character-stat__label">1/4</Typography.Text>
        </Flex>
      </Flex>
    </Flex>
  */
}

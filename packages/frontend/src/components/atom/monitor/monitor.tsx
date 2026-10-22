import { Flex, InputNumber, Typography } from 'antd';

import './monitor.css';

export interface MonitorProps {
  max: number;
  current?: number | null;
  onChange?: (current: number | null) => void;
}

export default function Monitor({ max, current, onChange }: MonitorProps) {
  return (
    <Flex className="monitor" vertical>
      <Flex className="monitor__max" vertical align="center">
        <Typography.Text className="monitor__label">Max</Typography.Text>
        <Typography.Text className="monitor__value">{max}</Typography.Text>
      </Flex>
      <Flex className="monitor__current" vertical align="center">
        <Typography.Text className="monitor__label">Current</Typography.Text>
        <InputNumber
          className="monitor__input"
          size="small"
          value={current}
          onChange={onChange}
        />
      </Flex>
    </Flex>
  );
}

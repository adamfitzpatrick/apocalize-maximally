import { Flex, Input, Typography } from 'antd';
import { useCharacterCreation } from '../../../contexts/character-creation-context';
import type { CharacterRecord } from '../../../api/characters';

import './character-creation-step.css';

const { TextArea } = Input;

type PersonalDescriptionField = 'name' | 'physicalDescription' | 'background';

export default function PersonalDescription() {
  const { character, setDraft } = useCharacterCreation();
  const record = character?.characterRecord;

  function updateField(field: PersonalDescriptionField, value: string) {
    if (!record) {
      return;
    }
    const nextRecord: CharacterRecord = {
      ...record,
      [field]: value
    };
    setDraft(nextRecord);
  }

  return (
    <Flex className="personal-description" vertical gap={16}>
      <label className="personal-description__field">
        <Typography.Text className="personal-description__label">
          Character name
        </Typography.Text>
        <Input
          value={record?.name ?? ''}
          onChange={(event) => updateField('name', event.target.value)}
        />
      </label>
      <label className="personal-description__field">
        <Typography.Text className="personal-description__label">
          Physical description (optional)
        </Typography.Text>
        <TextArea
          autoSize={{ minRows: 3, maxRows: 8 }}
          value={record?.physicalDescription ?? ''}
          onChange={(event) =>
            updateField('physicalDescription', event.target.value)
          }
        />
      </label>
      <label className="personal-description__field">
        <Typography.Text className="personal-description__label">
          Background (optional)
        </Typography.Text>
        <TextArea
          autoSize={{ minRows: 4, maxRows: 12 }}
          value={record?.background ?? ''}
          onChange={(event) => updateField('background', event.target.value)}
        />
      </label>
    </Flex>
  );
}

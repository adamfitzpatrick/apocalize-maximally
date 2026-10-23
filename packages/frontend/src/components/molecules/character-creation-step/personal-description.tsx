import { Button, Flex, Input, Typography } from 'antd';
import { useRef, useState, type ChangeEvent } from 'react';
import {
  deleteCharacterImage,
  uploadCharacterImage,
  type CharacterRecord
} from '../../../api/characters';
import { useCharacterCreation } from '../../../contexts/character-creation-context';

import './character-creation-step.css';

const { TextArea } = Input;

type PersonalDescriptionField = 'name' | 'physicalDescription' | 'background';

export default function PersonalDescription() {
  const { character, setDraft } = useCharacterCreation();
  const record = character?.characterRecord;
  const recordRef = useRef(record);
  recordRef.current = record;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState('');

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

  async function uploadImage(file: File) {
    const current = recordRef.current;
    if (!current) {
      return;
    }
    setUploading(true);
    setImageError('');
    try {
      const avatar = await uploadCharacterImage(
        current.userId,
        current.id,
        file
      );
      const latest = recordRef.current;
      if (!latest) {
        return;
      }
      setDraft({ ...latest, avatar });
    } catch (reason) {
      setImageError(
        reason instanceof Error ? reason.message : 'Unable to upload the image.'
      );
    } finally {
      setUploading(false);
    }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void uploadImage(file);
    }
  }

  async function removeImage() {
    const current = recordRef.current;
    if (!current?.avatar) {
      return;
    }
    setUploading(true);
    setImageError('');
    try {
      await deleteCharacterImage(current.userId, current.id);
      const latest = recordRef.current;
      if (!latest) {
        return;
      }
      const nextRecord: CharacterRecord = { ...latest };
      delete nextRecord.avatar;
      setDraft(nextRecord);
    } catch (reason) {
      setImageError(
        reason instanceof Error ? reason.message : 'Unable to remove the image.'
      );
    } finally {
      setUploading(false);
    }
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
      <div className="personal-description__field">
        <Typography.Text className="personal-description__label">
          Character image (optional)
        </Typography.Text>
        {record?.avatar ? (
          <img
            className="personal-description__image"
            src={record.avatar}
            alt=""
          />
        ) : null}
        <Flex className="personal-description__image-actions" gap={8} wrap>
          <Button
            disabled={!record || uploading}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {record?.avatar ? 'Replace image' : 'Upload image'}
          </Button>
          {record?.avatar ? (
            <Button
              danger
              disabled={uploading}
              onClick={() => void removeImage()}
            >
              Remove image
            </Button>
          ) : null}
        </Flex>
        <input
          ref={fileInputRef}
          className="personal-description__file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label="Character image"
          onChange={chooseImage}
        />
        <Typography.Text type="secondary">
          JPEG, PNG, WebP, or GIF. 4 MB or smaller.
        </Typography.Text>
        {imageError ? (
          <Typography.Text type="danger">{imageError}</Typography.Text>
        ) : null}
      </div>
    </Flex>
  );
}

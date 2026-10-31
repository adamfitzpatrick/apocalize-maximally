import { getIdToken } from '../auth';
import { requireApiUrl } from './api-url';

export interface Update {
  date: string;
  version: string;
  description: string[];
}

function isUpdate(value: unknown): value is Update {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const update = value as Record<string, unknown>;
  return (
    typeof update.date === 'string' &&
    typeof update.version === 'string' &&
    Array.isArray(update.description) &&
    update.description.every((entry) => typeof entry === 'string')
  );
}

export async function getUpdates(): Promise<Update[]> {
  const token = await getIdToken();
  const response = await fetch(
    `${requireApiUrl(
      'Set VITE_API_URL in packages/frontend/.env to load updates.'
    )}/data/updates`,
    { headers: { Authorization: token } }
  );
  if (!response.ok) {
    throw new Error(`Updates request failed (${response.status}).`);
  }
  const result: unknown = await response.json();
  if (!Array.isArray(result) || !result.every(isUpdate)) {
    throw new Error('The updates response is invalid.');
  }
  return result;
}

import { getIdToken } from '../auth';
import { requireApiUrl } from './api-url';

export async function submitBugReport(report: {
  description: string;
  path?: string;
}): Promise<void> {
  const token = await getIdToken();
  const response = await fetch(
    `${requireApiUrl(
      'Set VITE_API_URL in packages/frontend/.env to send bug reports.'
    )}/bug-reports`,
    {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report)
    }
  );
  if (response.ok) {
    return;
  }

  const text = await response.text();
  let message = `Bug report failed (${response.status}).`;
  if (text) {
    try {
      const body: unknown = JSON.parse(text);
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string' &&
        body.message.trim()
      ) {
        message = body.message;
      }
    } catch {
      // Keep the status message when the body is not JSON.
    }
  }
  throw new Error(message);
}

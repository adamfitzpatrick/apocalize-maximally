import { useEffect, useState } from 'react';
import { Modal, Typography } from 'antd';
import { getUpdates, type Update } from '../../../api/updates';
import { useAuth } from '../../../contexts/auth-context';

import './updates-popup.css';

function dateValue(date: string): number {
  const value = Date.parse(date);
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function storageKey(userId: string): string {
  return `apocalize:updates-seen:${userId}`;
}

export default function UpdatesPopup() {
  const { userId } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void getUpdates()
      .then((result) => {
        if (cancelled || result.length === 0) return;
        const sorted = [...result].sort(
          (a, b) => dateValue(b.date) - dateValue(a.date)
        );
        const latest = sorted[0].date;
        const seen = localStorage.getItem(storageKey(userId));
        if (seen !== null && dateValue(seen) >= dateValue(latest)) return;

        setUpdates(sorted);
        setOpen(true);
      })
      .catch((reason: unknown) => {
        console.error('Unable to load updates.', reason);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function close() {
    if (updates.length > 0) {
      localStorage.setItem(storageKey(userId), updates[0].date);
    }
    setOpen(false);
  }

  return (
    <Modal
      className="updates-popup"
      title="What's new"
      open={open}
      onCancel={close}
      onOk={close}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="Got it"
    >
      <div className="updates-popup__content">
        {updates.map((update) => (
          <section
            key={`${update.date}-${update.version}`}
            className="updates-popup__entry"
          >
            <Typography.Title level={2}>
              {update.date} - v{update.version.replace(/^v/i, '')}
            </Typography.Title>
            <ul>
              {update.description.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}

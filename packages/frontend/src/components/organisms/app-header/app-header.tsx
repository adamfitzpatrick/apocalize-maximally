import { useState } from 'react';
import { Button, Flex, Input, Popover, Space, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { submitBugReport } from '../../../api/bug-reports';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';

function LightBulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 18h6M10 22h4M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
      />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2l1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3 3 0 1 1 6 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6zM12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"
      />
    </svg>
  );
}

function BugReportButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    const text = description.trim();
    if (!text || submitting) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitBugReport({
        description: text,
        path: `${location.pathname}${location.search}`
      });
      setDescription('');
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send the report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover
      title="Report a bug"
      trigger="click"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSubmitted(false);
          setError('');
        }
      }}
      content={
        <Flex vertical gap={8} style={{ width: 260 }}>
          <Input.TextArea
            aria-label="Bug description"
            rows={4}
            maxLength={2000}
            value={description}
            placeholder="What went wrong?"
            onChange={(event) => setDescription(event.target.value)}
          />
          {error && <Typography.Text type="danger">{error}</Typography.Text>}
          {submitted && <Typography.Text>Thanks, your report was sent.</Typography.Text>}
          <Button
            type="primary"
            loading={submitting}
            disabled={!description.trim()}
            onClick={() => void submit()}
          >
            Submit
          </Button>
        </Flex>
      }
    >
      <Button aria-label="Report a bug" icon={<BugIcon />} />
    </Popover>
  );
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
      />
    </svg>
  );
}

export default function AppHeader() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const { isAuthenticated, busy, signOut } = useAuth();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      // AuthContext retains the error for the authenticated layout to display.
    }
  }

  return (
    <header className="app-header">
      <div className="app-header-content">
        <Typography.Title level={3} className="app-title">
          Apocalize Maximally
        </Typography.Title>
        <Space size="middle">
          <Button
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
            icon={<LightBulbIcon />}
            onClick={toggleTheme}
          />
          {isAuthenticated && <BugReportButton />}
          {isAuthenticated && (
            <Button
              aria-label="Log out"
              icon={<LogOutIcon />}
              onClick={() => void handleSignOut()}
              disabled={busy}
            />
          )}
        </Space>
      </div>
    </header>
  );
}

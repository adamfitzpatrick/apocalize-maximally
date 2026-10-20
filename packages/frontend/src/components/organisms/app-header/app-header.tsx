import { Button, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth-context';
import { useTheme } from '../../../contexts/theme-context';

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
            onClick={toggleTheme}
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </Button>
          {isAuthenticated && (
            <Button onClick={() => void handleSignOut()} disabled={busy}>
              Log out
            </Button>
          )}
        </Space>
      </div>
    </header>
  );
}

// ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context'; // Replace with your actual auth state hook
import { Spin, Typography } from 'antd';
import { CoreGameDataProvider } from '../contexts/core-game-data-context';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="shell auth-state">
        <Spin size="large" />
        <Typography.Text>Restoring your session...</Typography.Text>
      </main>
    );
  }

  return isAuthenticated ?
    <CoreGameDataProvider><Outlet /></CoreGameDataProvider> :
    <Navigate to="/login" replace />;
};
